import { createHash } from 'node:crypto'

/**
 * The hash chain of the audit log (CMS-SPEC §9.1):
 *
 *   hash = sha256(prevHash + canonicalJSON(row without id, hash and timestamps))
 *
 * The writer, the nightly check and anyone holding an exported JSONL file
 * compute it with these functions, so they must stay deterministic: keys are
 * sorted, empty strings count as null, dates are ISO strings in UTC with
 * milliseconds, and the IP address enters the hash as its /24 (IPv4) or /48
 * (IPv6) network. The retention job truncates stored addresses to exactly that
 * network after 90 days (§9.5), so truncation never breaks the chain, and the
 * nightly export carries only the network.
 */

/** The hashed columns, in the order the export writes them. */
export const HASHED_FIELDS = [
  'at',
  'actorId',
  'actorEmail',
  'actorRole',
  'action',
  'collection',
  'docId',
  'docTitle',
  'locale',
  'versionId',
  'summary',
  'changedPaths',
  'before',
  'after',
  'ip',
  'country',
  'userAgent',
  'requestId',
  'prevHash',
] as const

export type HashedField = (typeof HASHED_FIELDS)[number]
export type HashableRow = Record<HashedField, unknown>

/** JSON with object keys sorted at every level and no whitespace. */
export function canonicalJSON(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonicalJSON(v))).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJSON(v)}`).join(',')}}`
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return 'null'
  return JSON.stringify(value)
}

const text = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v))
const json = (v: unknown): unknown => (v === undefined || v === '' ? null : v)

/** Parse an IPv4 or IPv6 address (optionally with a /prefix) into its 16-bit groups or 8-bit octets. */
function parseIp(raw: string): { v: 4; parts: number[] } | { v: 6; parts: number[] } | null {
  const address = raw.trim().split('/')[0].replace(/^\[|\]$/g, '').split('%')[0]
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address)
  if (v4) {
    const parts = v4.slice(1).map(Number)
    return parts.every((n) => n <= 255) ? { v: 4, parts } : null
  }
  if (!address.includes(':')) return null
  let head = address
  let tailV4: number[] = []
  const embedded = /^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(address)
  if (embedded) {
    const inner = parseIp(embedded[2])
    if (!inner) return null
    head = embedded[1].endsWith('::') ? embedded[1] : embedded[1].slice(0, -1)
    tailV4 = [(inner.parts[0] << 8) | inner.parts[1], (inner.parts[2] << 8) | inner.parts[3]]
  }
  const halves = head.split('::')
  if (halves.length > 2) return null
  const toGroups = (s: string) => (s === '' ? [] : s.split(':').map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN)))
  const left = toGroups(halves[0])
  const right = halves.length === 2 ? toGroups(halves[1]) : []
  const total = left.length + right.length + tailV4.length
  const fill = halves.length === 2 ? 8 - total : 0
  const groups = [...left, ...Array(Math.max(0, fill)).fill(0), ...right, ...tailV4]
  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g))) return null
  return { v: 6, parts: groups }
}

/** RFC 5952 text form: lower case, the longest run of two or more zero groups compressed. */
function formatV6(groups: number[]): string {
  let best = -1
  let bestLen = 0
  for (let i = 0; i < 8; ) {
    if (groups[i] !== 0) {
      i++
      continue
    }
    let j = i
    while (j < 8 && groups[j] === 0) j++
    if (j - i > bestLen && j - i >= 2) {
      best = i
      bestLen = j - i
    }
    i = j
  }
  const hex = groups.map((g) => g.toString(16))
  if (best < 0) return hex.join(':')
  return `${hex.slice(0, best).join(':')}::${hex.slice(best + bestLen).join(':')}`
}

/**
 * The network an address belongs to: `203.0.113.0/24`, `2001:db8:1::/48`.
 * Idempotent (a network maps to itself). Anything that is not an IP address
 * is returned unchanged, so it still hashes deterministically.
 */
export function ipNetwork(ip: unknown): string | null {
  const raw = text(ip)
  if (!raw) return null
  const parsed = parseIp(raw)
  if (!parsed) return raw
  if (parsed.v === 4) return `${parsed.parts.slice(0, 3).join('.')}.0/24`
  return `${formatV6([...parsed.parts.slice(0, 3), 0, 0, 0, 0, 0])}/48`
}

/** The hashed form of a row as Payload returns it (or as the writer builds it). */
export function hashable(input: object): HashableRow {
  const row = input as Record<string, unknown>
  const at = row.at instanceof Date ? row.at : row.at ? new Date(String(row.at)) : null
  const actorId = row.actorId === null || row.actorId === undefined || row.actorId === '' ? null : Number(row.actorId)
  return {
    at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
    actorId: Number.isFinite(actorId) ? actorId : null,
    actorEmail: text(row.actorEmail),
    actorRole: text(row.actorRole),
    action: text(row.action),
    collection: text(row.collection),
    docId: text(row.docId),
    docTitle: text(row.docTitle),
    locale: text(row.locale),
    versionId: text(row.versionId),
    summary: text(row.summary),
    changedPaths: json(row.changedPaths),
    before: json(row.before),
    after: json(row.after),
    ip: ipNetwork(row.ip),
    country: text(row.country),
    userAgent: text(row.userAgent),
    requestId: text(row.requestId),
    prevHash: text(row.prevHash),
  }
}

/** sha256(prevHash + canonicalJSON(row)), hex. */
export function hashRow(row: object): string {
  const h = hashable(row)
  return createHash('sha256')
    .update(String(h.prevHash ?? ''))
    .update(canonicalJSON(h))
    .digest('hex')
}
