import type { Field } from 'payload'

import { canonical, type Doc, idOf, isoOrNull, isPlainObject } from './shared'

const SKIP = new Set(['id', '_status', 'createdAt', 'updatedAt', 'deletedAt'])

const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

function same(field: Field, a: unknown, b: unknown): boolean {
  if (empty(a) && empty(b)) return true
  switch (field.type) {
    case 'relationship':
    case 'upload': {
      const norm = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(idOf(x) ?? '')) : String(idOf(v) ?? ''))
      return canonical(norm(a)) === canonical(norm(b))
    }
    case 'date':
      return isoOrNull(a) === isoOrNull(b)
    case 'checkbox':
      return Boolean(a) === Boolean(b)
    default:
      return canonical(a ?? null) === canonical(b ?? null)
  }
}

/**
 * Paths of non-localized fields whose value differs between two versions of
 * a document, walking the collection's field config. Localized fields (and
 * localized children of arrays and groups) are skipped, as are ui and join
 * fields and Payload's own timestamps. Used to keep a translator to their
 * locale's fields (CMS-SPEC §4.2 translator row).
 */
export function nonLocalizedChanges(fields: Field[], before: Doc | undefined, after: Doc | undefined, prefix = ''): string[] {
  const out: string[] = []
  const b = before ?? {}
  const a = after ?? {}
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        if ('name' in tab && tab.name) {
          if (!tab.localized) out.push(...nonLocalizedChanges(tab.fields, b[tab.name] as Doc, a[tab.name] as Doc, `${prefix}${tab.name}.`))
        } else out.push(...nonLocalizedChanges(tab.fields, b, a, prefix))
      }
      continue
    }
    if (field.type === 'row' || field.type === 'collapsible') {
      out.push(...nonLocalizedChanges(field.fields, b, a, prefix))
      continue
    }
    if (field.type === 'ui' || field.type === 'join' || !('name' in field)) continue
    if (SKIP.has(field.name) || ('localized' in field && field.localized)) continue
    const path = `${prefix}${field.name}`
    const bv = b[field.name]
    const av = a[field.name]
    if (av === undefined) continue // not sent: unchanged
    if (field.type === 'group') {
      out.push(...nonLocalizedChanges(field.fields, isPlainObject(bv) ? bv : {}, isPlainObject(av) ? av : {}, `${path}.`))
      continue
    }
    if (field.type === 'array') {
      const br = (Array.isArray(bv) ? bv : []) as Doc[]
      const ar = (Array.isArray(av) ? av : []) as Doc[]
      if (br.length !== ar.length || br.some((r, i) => String(r.id ?? '') !== String(ar[i]?.id ?? ''))) {
        out.push(path)
        continue
      }
      ar.forEach((row, i) => out.push(...nonLocalizedChanges(field.fields, br[i], row, `${path}.${i}.`)))
      continue
    }
    if (!same(field, bv, av)) out.push(path)
  }
  return out
}
