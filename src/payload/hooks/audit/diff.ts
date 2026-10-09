import type { FlattenedField } from 'payload'
import { fieldIsVirtual } from 'payload/shared'

import { canonicalJSON } from '../../audit/hash'
import { isIgnoredPath, MAX_VALUE_CHARS, valuesAllowed } from './policy'

/**
 * Field-path diff of two documents, driven by the collection's schema
 * (CMS-SPEC §9.1 `changedPaths`). Paths are dotted, with row indexes for
 * arrays and blocks: `sources.1.url`, `corrections.2`, `sponsored.partner`.
 * Rich text, JSON and point fields are leaves (one path for the whole value).
 *
 * Values are compared after normalising: relationships to ids (the document a
 * hook receives may be populated), dates to ISO, '' and [] to null. A field
 * missing from the new document is skipped: it was not returned to the
 * caller (field read access, hidden fields), so its change is unknown here.
 */

type Doc = Record<string, unknown>
type Field = FlattenedField

export type Diff = {
  paths: string[]
  /** Values of the changed paths that policy allows (§9.1), keyed by path. */
  before: Record<string, unknown>
  after: Record<string, unknown>
}

export type DiffOptions = {
  slug: string
  /** The save used `locale: 'all'`: localized values are maps keyed by locale. */
  localeAll?: boolean
  /** Record values for allowed paths (default true). */
  values?: boolean
}

const isObj = (v: unknown): v is Doc => Boolean(v) && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
const skip = (field: Field) => !('name' in field) || !field.name || field.type === 'join' || fieldIsVirtual(field as never)

const idOf = (v: unknown): unknown => (isObj(v) && 'id' in v ? v.id : v)

function relValue(field: Field, value: unknown): unknown {
  const polymorphic = Array.isArray((field as { relationTo?: unknown }).relationTo)
  const one = (v: unknown): unknown => {
    if (v === null || v === undefined || v === '') return null
    if (polymorphic && isObj(v)) return { relationTo: v.relationTo, value: String(idOf(v.value)) }
    return String(idOf(v))
  }
  if (Array.isArray(value)) return value.length ? value.map(one) : null
  return one(value)
}

/** Schema-aware normal form of a value, used both for comparing and for storing. */
export function normalize(field: Field, value: unknown, localeAll = false): unknown {
  if (value === undefined || value === null || value === '') return null
  if (localeAll && (field as { localized?: boolean }).localized && isObj(value)) {
    const plain = { ...field, localized: false } as Field
    return Object.fromEntries(Object.entries(value).map(([locale, v]) => [locale, normalize(plain, v, false)]))
  }
  switch (field.type) {
    case 'group':
    case 'tab':
      return isObj(value) ? normalizeFields(field.flattenedFields, value, localeAll) : null
    case 'array': {
      if (!Array.isArray(value) || !value.length) return null
      return value.map((row) => (isObj(row) ? { id: row.id ?? null, ...normalizeFields(field.flattenedFields, row, localeAll) } : row))
    }
    case 'blocks': {
      if (!Array.isArray(value) || !value.length) return null
      return value.map((row) => {
        if (!isObj(row)) return row
        const block = blockFields(field, row)
        return block ? { id: row.id ?? null, blockType: row.blockType, ...normalizeFields(block, row, localeAll) } : row
      })
    }
    case 'relationship':
    case 'upload':
      return relValue(field, value)
    case 'date': {
      const t = new Date(value as string).getTime()
      return Number.isNaN(t) ? value : new Date(t).toISOString()
    }
    case 'select':
    case 'text':
    case 'number':
      return Array.isArray(value) && !value.length ? null : value
    default:
      return value
  }
}

function normalizeFields(fields: Field[], doc: Doc, localeAll: boolean): Doc {
  const out: Doc = {}
  for (const field of fields) {
    if (skip(field)) continue
    const name = (field as { name: string }).name
    if (doc[name] === undefined) continue
    out[name] = normalize(field, doc[name], localeAll)
  }
  return out
}

function blockFields(field: Field, row: Doc): Field[] | undefined {
  const f = field as { blocks?: { slug: string; flattenedFields: Field[] }[]; blockReferences?: unknown[] }
  const all = [...(f.blocks ?? []), ...((f.blockReferences ?? []).filter(isObj) as unknown as { slug: string; flattenedFields: Field[] }[])]
  return all.find((b) => b.slug === row.blockType)?.flattenedFields
}

const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b)

/** Cap a stored value; a large rich-text or JSON value is replaced by its size. */
function cap(value: unknown): unknown {
  const json = canonicalJSON(value)
  return json.length > MAX_VALUE_CHARS ? { omitted: true, chars: json.length } : value
}

class Collector {
  paths: string[] = []
  before: Record<string, unknown> = {}
  after: Record<string, unknown> = {}
  constructor(private opts: DiffOptions) {}
  add(path: string, before: unknown, after: unknown) {
    if (isIgnoredPath(this.opts.slug, path)) return
    this.paths.push(path)
    if (this.opts.values !== false && valuesAllowed(this.opts.slug, path)) {
      this.before[path] = cap(before)
      this.after[path] = cap(after)
    }
  }
}

function walk(fields: Field[], before: Doc, after: Doc, prefix: string, out: Collector, opts: DiffOptions) {
  for (const field of fields) {
    if (skip(field)) continue
    const name = (field as { name: string }).name
    if (!(name in after) || after[name] === undefined) continue
    const path = prefix ? `${prefix}.${name}` : name
    if (isIgnoredPath(opts.slug, path)) continue
    const a = before[name]
    const b = after[name]
    if (opts.localeAll && (field as { localized?: boolean }).localized) {
      leaf(field, a, b, path, out, opts)
      continue
    }
    switch (field.type) {
      case 'group':
      case 'tab':
        walk(field.flattenedFields, isObj(a) ? a : {}, isObj(b) ? b : {}, path, out, opts)
        break
      case 'array':
      case 'blocks':
        rows(field, a, b, path, out, opts)
        break
      default:
        leaf(field, a, b, path, out, opts)
    }
  }
}

function leaf(field: Field, a: unknown, b: unknown, path: string, out: Collector, opts: DiffOptions) {
  const na = normalize(field, a, opts.localeAll)
  const nb = normalize(field, b, opts.localeAll)
  if (!same(na, nb)) out.add(path, na, nb)
}

/**
 * Rows are matched by id. A new row is one path (`corrections.3`); a changed
 * row reports its changed fields; a removed or reordered row reports the
 * array itself.
 */
function rows(field: Field, a: unknown, b: unknown, path: string, out: Collector, opts: DiffOptions) {
  const before = Array.isArray(a) ? (a as unknown[]) : []
  const after = Array.isArray(b) ? (b as unknown[]) : []
  const index = new Map<string, number>()
  before.forEach((row, i) => {
    if (isObj(row) && row.id !== undefined && row.id !== null) index.set(String(row.id), i)
  })
  const one = (row: unknown) => (normalize(field, [row], opts.localeAll) as unknown[] | null)?.[0] ?? null
  let structural = false
  const seen = new Set<number>()
  after.forEach((row, i) => {
    const rowPath = `${path}.${i}`
    const at = isObj(row) && row.id !== undefined && row.id !== null ? index.get(String(row.id)) : i < before.length ? i : undefined
    if (at === undefined || !isObj(row) || !isObj(before[at])) {
      out.add(rowPath, null, one(row))
      return
    }
    seen.add(at)
    if (at !== i) structural = true
    const prev = before[at] as Doc
    const fields = field.type === 'blocks' ? blockFields(field, row) : (field as { flattenedFields?: Field[] }).flattenedFields
    if (!fields || (field.type === 'blocks' && prev.blockType !== row.blockType)) {
      const nPrev = one(prev)
      const nRow = one(row)
      if (!same(nPrev, nRow)) out.add(rowPath, nPrev, nRow)
      return
    }
    walk(fields, prev, row, rowPath, out, opts)
  })
  if (before.some((_, i) => !seen.has(i))) structural = true
  if (structural) out.add(path, normalize(field, before, opts.localeAll), normalize(field, after, opts.localeAll))
}

/** Changed paths (and allowed values) between two versions of a document. */
export function diffDocs(fields: Field[], before: unknown, after: unknown, opts: DiffOptions): Diff {
  const out = new Collector(opts)
  walk(fields, isObj(before) ? before : {}, isObj(after) ? after : {}, '', out, opts)
  return { paths: out.paths, before: out.before, after: out.after }
}

/** The normalised value at a top-level field (for snapshots such as the workflow state). */
export function topValue(fields: Field[], doc: unknown, name: string): unknown {
  if (!isObj(doc)) return null
  const field = fields.find((f) => 'name' in f && f.name === name)
  return field ? normalize(field, doc[name]) : (doc[name] ?? null)
}
