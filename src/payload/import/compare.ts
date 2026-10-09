/**
 * Deep comparison for the parity check (CMS-SPEC §11.4). Values are compared
 * as JSON, the form the site gets them in from the data cache (a key whose
 * value is undefined does not exist). What the spec lets differ:
 * - image `width` and `height` are compared as a ratio (the import rasterizes
 *   1200 × 800 to 1602 × 1068), and image `src` through a caller's mapping;
 * - keys that only the CMS has (CMS-SPEC §3.17, the "CMS only" fields of
 *   src/content/types.ts) may appear on the CMS side when the mock lacks them;
 * - ids are mapped to `legacyId` by the caller before comparing.
 */

export interface Difference {
  path: string
  mock: unknown
  cms: unknown
}

/** Fields the CMS adds to the content contract (§3.17); absent in the mock data. */
export const CMS_ONLY_KEYS = new Set([
  // Article
  'firstPublishedAt', 'withdrawn', 'noindex', 'ageMark', 'about', 'mentions', 'inappropriateForSponsorship', 'shortCode', 'originalUpdatedAt',
  // Author
  'isTeam',
  // ImageRef
  'creator', 'copyrightNotice', 'licenseUrl', 'decorative',
  // Correction
  'kind', 'id',
  // Sponsorship
  'category', 'licenceNumber', 'riskWarning', 'keyTerms',
  // Institution
  'statusSource', 'statusHistory',
  // ClubEvent
  'registrationOpen', 'registrationClosesAt',
])

export interface CompareOptions {
  /** Compares two image `src` values (default: equal strings). */
  sameSrc?: (mock: string, cms: string) => boolean
  /** Keys the CMS side may add (default CMS_ONLY_KEYS). */
  cmsOnly?: Set<string>
  /** Keys left out of the comparison everywhere (e.g. `views` in production). */
  ignore?: Set<string>
  /** Relative tolerance of an image's width/height ratio (default 0.5 %). */
  ratioTolerance?: number
  /** Stop after this many differences (default 50). */
  limit?: number
}

export const asJson = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T))

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const join = (path: string, key: string) => (path ? `${path}.${key}` : key)
const isImage = (v: Record<string, unknown>) => typeof v.src === 'string' && typeof v.width === 'number' && typeof v.height === 'number'

export function compare(mock: unknown, cms: unknown, opts: CompareOptions = {}): Difference[] {
  const out: Difference[] = []
  const limit = opts.limit ?? 50
  const cmsOnly = opts.cmsOnly ?? CMS_ONLY_KEYS
  const tolerance = opts.ratioTolerance ?? 0.005
  const sameSrc = opts.sameSrc ?? ((a, b) => a === b)
  const add = (path: string, m: unknown, c: unknown) => out.length < limit && out.push({ path: path || '(root)', mock: m, cms: c })

  const walk = (m: unknown, c: unknown, path: string) => {
    if (out.length >= limit) return
    if (Array.isArray(m) || Array.isArray(c)) {
      if (!Array.isArray(m) || !Array.isArray(c)) return add(path, m, c)
      if (m.length !== c.length) add(join(path, 'length'), m.length, c.length)
      for (let i = 0; i < Math.min(m.length, c.length); i++) walk(m[i], c[i], `${path}[${i}]`)
      return
    }
    if (isObject(m) && isObject(c)) {
      const image = isImage(m) && isImage(c)
      if (image) {
        const rm = (m.width as number) / (m.height as number)
        const rc = (c.width as number) / (c.height as number)
        if (!(Math.abs(rm - rc) <= tolerance * rm)) add(join(path, 'width/height'), `${m.width}×${m.height}`, `${c.width}×${c.height}`)
        if (!sameSrc(m.src as string, c.src as string)) add(join(path, 'src'), m.src, c.src)
      }
      for (const k of new Set([...Object.keys(m), ...Object.keys(c)])) {
        if (opts.ignore?.has(k)) continue
        if (image && (k === 'width' || k === 'height' || k === 'src')) continue
        if (!(k in m) && cmsOnly.has(k)) continue
        walk(m[k], c[k], join(path, k))
      }
      return
    }
    if (m !== c) add(path, m, c)
  }
  walk(asJson(mock), asJson(cms), '')
  return out
}

/** One line per difference, values shortened. */
export function formatDifference(d: Difference, width = 110): string {
  const show = (v: unknown) => {
    const s = v === undefined ? '(none)' : JSON.stringify(v)
    return s.length > width ? `${s.slice(0, width - 1)}…` : s
  }
  return `${d.path}\n      mock: ${show(d.mock)}\n      cms:  ${show(d.cms)}`
}
