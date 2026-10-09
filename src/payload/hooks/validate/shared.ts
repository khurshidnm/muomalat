import { createHash } from 'node:crypto'

import type { Field, PayloadRequest } from 'payload'
import { isolateObjectProperty, ValidationError } from 'payload'

import type { EditorialRulesLike, Finding, Level } from '../../../content/rules'

/**
 * Plumbing shared by the validation hooks (CMS-SPEC §7.3): what a save does
 * (its gate), the editorial settings the rules read, field paths and labels,
 * per-locale views of a document, and the error Payload shows next to the
 * fields.
 */

export type Id = string | number
export type Doc = Record<string, unknown>
export type Locale = 'uz' | 'ru' | 'en'
export const LOCALES: Locale[] = ['uz', 'ru', 'en']

/**
 * What a save does, which decides what blocks it:
 * - `draft`: nothing blocks (findings are stored), except node types the editor cannot load;
 * - `submit` (draft → in_edit): title, lead, rubric, an author and a source must be present;
 * - `approve` (→ ready or scheduled) and `publish`: every error blocks.
 */
export type Gate = 'draft' | 'submit' | 'approve' | 'publish'

export const idOf = (v: unknown): Id | undefined =>
  v && typeof v === 'object' ? ((v as { id?: Id }).id ?? undefined) : v === null || v === undefined || v === '' ? undefined : (v as Id)
export const idsOf = (v: unknown): Id[] => (Array.isArray(v) ? v.map(idOf).filter((x): x is Id => x !== undefined) : [])

/** Nested Local API calls share the transaction but never the locale (payloadcms#18246). */
export const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])

/** The locale a save writes; `all` and unknown values count as the default locale. */
export const saveLocale = (req: PayloadRequest): Locale => (req.locale === 'ru' || req.locale === 'en' ? req.locale : 'uz')

const isPlainObject = (v: unknown): v is Doc => !!v && typeof v === 'object' && !Array.isArray(v) && !('root' in (v as object))

/** `data` over `doc`: groups merge key by key, everything else (arrays, rich text) is replaced. */
export function deepMerge(doc: Doc | undefined, data: Doc | undefined): Doc {
  const out: Doc = { ...(doc ?? {}) }
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v === undefined) continue
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k] as Doc, v) : v
  }
  return out
}

// ── config traversal ────────────────────────────────────────────────────────
type AnyField = Field & { name?: string; localized?: boolean; fields?: Field[]; tabs?: { name?: string; fields: Field[] }[]; label?: unknown; blocks?: { slug: string; fields: Field[] }[] }

/** Fields at one data level: rows, collapsibles and unnamed tabs are flattened in. */
export function dataFields(fields: Field[]): AnyField[] {
  const out: AnyField[] = []
  for (const f of fields as AnyField[]) {
    if (f.type === 'row' || f.type === 'collapsible') out.push(...dataFields(f.fields ?? []))
    else if (f.type === 'tabs') for (const t of f.tabs ?? []) t.name ? out.push({ ...(t as object), type: 'group' } as AnyField) : out.push(...dataFields(t.fields))
    else if (f.name && f.type !== 'ui') out.push(f)
  }
  return out
}

/** The value of each field in one locale, from a document read with `locale: 'all'`. */
export function pickLocale(doc: unknown, locale: Locale, fields: Field[], parentLocalized = false): unknown {
  if (!doc || typeof doc !== 'object') return doc
  const out: Doc = { ...(doc as Doc) }
  for (const f of dataFields(fields)) {
    const name = f.name as string
    let v = (doc as Doc)[name]
    const localized = Boolean(f.localized) && !parentLocalized
    if (localized && v && typeof v === 'object' && !Array.isArray(v) && LOCALES.some((l) => l in (v as Doc))) v = (v as Doc)[locale]
    else if (localized) v = undefined
    if (f.type === 'group' && v) v = pickLocale(v, locale, f.fields ?? [], parentLocalized || localized)
    if (f.type === 'array' && Array.isArray(v)) v = v.map((row) => pickLocale(row, locale, f.fields ?? [], parentLocalized || localized))
    out[name] = v
  }
  return out
}

/**
 * `target` (one locale's stored values) with the non-localized values of
 * `source` (the document being saved in another locale). Array rows are
 * matched by id, as Payload stores them.
 */
export function overlayNonLocalized(target: unknown, source: unknown, fields: Field[]): Doc {
  const t = (target && typeof target === 'object' ? target : {}) as Doc
  const s = (source && typeof source === 'object' ? source : {}) as Doc
  const out: Doc = { ...t }
  for (const f of dataFields(fields)) {
    const name = f.name as string
    if (f.localized) continue
    if (f.type === 'group') out[name] = overlayNonLocalized(t[name], s[name], f.fields ?? [])
    else if (f.type === 'array' && Array.isArray(s[name])) {
      const rows = Array.isArray(t[name]) ? (t[name] as Doc[]) : []
      out[name] = (s[name] as Doc[]).map((row) => overlayNonLocalized(rows.find((r) => r?.id !== undefined && r.id === row?.id), row, f.fields ?? []))
    } else if (name in s) out[name] = s[name]
  }
  return out
}

/** Uzbek labels along a field path, for messages: «Manbalar › Havola». */
export function fieldLabel(fields: Field[], path: string): string {
  const parts = path.replace(/\[\d+\]/g, '').split('.').filter((p) => p && !/^\d+$/.test(p))
  const labels: string[] = []
  let level: Field[] = fields
  for (const part of parts) {
    const f = dataFields(level).find((x) => x.name === part)
    if (!f) break
    const l = typeof f.label === 'string' ? f.label : typeof f.label === 'object' && f.label ? ((f.label as Record<string, string>).uz ?? Object.values(f.label as object)[0]) : part
    labels.push(String(l))
    level = f.fields ?? []
  }
  return labels.join(' › ')
}

// ── settings the rules read ─────────────────────────────────────────────────
export interface RuleSettings {
  /** site-settings.demo.noticeEnabled (default on). */
  demoMode: boolean
  rules: EditorialRulesLike
}

const SETTINGS_KEY = 'validate:settings'

/** The editorial-rules lists and the demo switch, read once per request (same transaction). */
export async function ruleSettings(req: PayloadRequest): Promise<RuleSettings> {
  const cached = req.context?.[SETTINGS_KEY] as RuleSettings | undefined
  if (cached) return cached
  const r = isolated(req)
  // One after another: both reads share the transaction's connection.
  const rules = await req.payload.findGlobal({ slug: 'editorial-rules' as never, depth: 0, overrideAccess: true, req: r }).catch(() => ({}))
  const site = await req.payload.findGlobal({ slug: 'site-settings' as never, depth: 0, overrideAccess: true, req: r }).catch(() => ({}))
  const settings: RuleSettings = {
    demoMode: (site as { demo?: { noticeEnabled?: boolean | null } }).demo?.noticeEnabled !== false,
    rules: rules as EditorialRulesLike,
  }
  if (req.context) req.context[SETTINGS_KEY] = settings
  return settings
}

// ── findings for the editor ─────────────────────────────────────────────────
/** A finding as stored in `validationWarnings` and shown in ChecksPanel. */
export interface StoredFinding {
  key: string
  rule: string
  level: Level
  /** Where it is: `body[3]`, `sources.0.url`, `title`. */
  path: string
  /** The form field the admin shows the error on (`body`, `sources.0.url`). */
  field: string
  /** Uzbek: «Matn, 4-xatboshi», «Manbalar › Havola». */
  location?: string
  message: string
  excerpt?: string
  /** A one-click fix exists (TXT-1, TXT-2, TXT-7). */
  fixable?: boolean
  acknowledged?: { by?: Id; byName?: string; at: string }
}

export interface StoredChecks {
  version: 1
  checkedAt: string
  gate: Gate
  errors: number
  warnings: number
  findings: StoredFinding[]
  /** One-click fixes applied through ChecksPanel (§7.3: "apply the change to the draft and record it"). */
  fixes?: { at: string; by?: Id; rule: string; field: string }[]
}

/** The form field of a finding path: `body[3].items[0]` → `body`, `meta.title` → `meta.title`. */
export const formField = (path: string) => path.replace(/\[\d+\].*$/, '').replace(/\[(\d+)\]/g, '.$1')

/** «Matn, 4-xatboshi» for a body path; the field labels otherwise. */
export function locate(path: string, fields: Field[]): string {
  const m = /^(body|definition|practice|origin|report|example\.text)\[(\d+)\]/.exec(path)
  const label = fieldLabel(fields, formField(path)) || formField(path)
  if (m) return `${label}, ${Number(m[2]) + 1}-xatboshi`
  const row = /\.(\d+)(\.|$)/.exec(path.replace(/\[(\d+)\]/g, '.$1'))
  return row ? `${label} (${Number(row[1]) + 1}-qator)` : label
}

export const findingKey = (f: Pick<Finding, 'rule' | 'path' | 'message'>) =>
  createHash('sha1').update(`${f.rule}|${f.path}|${f.message}`).digest('hex').slice(0, 12)

/** Same rule, place and message once. */
export function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    const k = `${f.rule}|${f.path}|${f.message}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function toStored(findings: Finding[], fields: Field[]): StoredFinding[] {
  return dedupe(findings).map((f) => ({
    key: findingKey(f),
    rule: f.rule,
    level: f.level,
    path: f.path,
    field: formField(f.path),
    location: locate(f.path, fields),
    message: f.message,
    ...(f.excerpt ? { excerpt: f.excerpt } : {}),
    ...(f.fix ? { fixable: true } : {}),
  }))
}

/**
 * The error Payload shows next to each field (§7.3). One entry per field: the
 * admin keeps one message per path, so several findings on a field are
 * joined.
 */
export function validationError(findings: Finding[], fields: Field[], req: PayloadRequest, target: { collection?: string; global?: string; id?: Id }): ValidationError {
  const byField = new Map<string, string[]>()
  for (const f of dedupe(findings)) {
    const field = formField(f.path)
    const where = /^[a-z]+\[\d+\]/i.test(f.path) ? `${locate(f.path, fields)}: ` : ''
    const list = byField.get(field) ?? []
    list.push(`${where}${f.message}`)
    byField.set(field, list)
  }
  return new ValidationError(
    {
      ...target,
      errors: [...byField].map(([path, messages]) => ({ path, message: messages.join(' · '), label: fieldLabel(fields, path) || undefined })),
      req,
    },
    req.t,
  )
}
