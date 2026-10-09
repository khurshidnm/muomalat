import type { Field } from 'payload'

import { checkKr, checkText, fixOkina, type Finding, type TextCheckOptions } from '../../../content/rules'
import { toCyrillic } from '../../../i18n/translit'
import { dataFields, type Doc } from './shared'

/**
 * The public text of a document, field by field (TXT-1 to TXT-11, KR-1 to
 * KR-3). Walks the collection's field config over one locale's values, so
 * paths are the admin's field paths (`sources.0.title`, `meta.description`)
 * and the findings land next to the right field.
 */

export interface TextItem {
  /** Field path with row indexes: `sources.0.title`, `definition[2]`. */
  path: string
  /** Path without indexes, for per-field options: `sources.title`. */
  schema: string
  value: string
}

/** Values that are identifiers, links or internal notes rather than published prose. */
const NEVER = new Set([
  'slug', 'url', 'licenceUrl', 'statusSource', 'link', 'linkUrl', 'channelUrl', 'evidence', 'legacyId', 'shortCode', 'email', 'telegram',
  'contractRef', 'licenceNumber', 'advertiserLegalName', 'internalReason', 'editorNotes', 'sourceNotes', 'restrictions', 'time',
])

const TEXT_TYPES = new Set(['text', 'textarea'])

type AnyField = ReturnType<typeof dataFields>[number] & { hasMany?: boolean; admin?: { hidden?: boolean; readOnly?: boolean } }

/**
 * Text items of one locale view. `skip` names schema paths to leave out (a
 * whole group by its path); `rich` turns a rich-text value into paragraph
 * strings (the caller serializes, so links and glossary links keep their
 * markup, as in the validator script).
 */
export function textItems(
  fields: Field[],
  doc: Doc | undefined,
  opts: { skip?: ReadonlySet<string>; rich?: (value: unknown, path: string, schema: string) => TextItem[] },
): TextItem[] {
  const out: TextItem[] = []
  const walk = (level: Field[], value: Doc | undefined, path: string, schema: string) => {
    if (!value || typeof value !== 'object') return
    for (const f of dataFields(level) as AnyField[]) {
      const name = f.name as string
      const p = path ? `${path}.${name}` : name
      const s = schema ? `${schema}.${name}` : name
      if (NEVER.has(name) || opts.skip?.has(s) || f.admin?.hidden || f.admin?.readOnly) continue
      const v = value[name]
      if (TEXT_TYPES.has(f.type)) {
        if (typeof v === 'string' && v.trim()) out.push({ path: p, schema: s, value: v })
        else if (f.hasMany && Array.isArray(v)) v.forEach((x, i) => typeof x === 'string' && x.trim() && out.push({ path: `${p}.${i}`, schema: s, value: x }))
      } else if (f.type === 'richText') {
        if (v && opts.rich) out.push(...opts.rich(v, p, s))
      } else if (f.type === 'group') {
        walk(f.fields ?? [], v as Doc, p, s)
      } else if (f.type === 'array' && Array.isArray(v)) {
        v.forEach((row, i) => walk(f.fields ?? [], row as Doc, `${p}.${i}`, s))
      } else if (f.type === 'blocks' && Array.isArray(v)) {
        v.forEach((row, i) => {
          const block = (f.blocks ?? []).find((b) => b.slug === (row as Doc)?.blockType)
          if (block) walk(block.fields, row as Doc, `${p}.${i}`, s)
        })
      }
    }
  }
  walk(fields, doc, '', '')
  return out
}

/**
 * checkText over items. A TXT-2 warning that only repeats a TXT-1 error on
 * the same text (o'z: the apostrophe is both) is dropped: fixing TXT-1 fixes
 * both. The validator script keeps both, as it always did.
 */
export function textFindings(items: TextItem[], optsFor: (item: TextItem) => TextCheckOptions | false): Finding[] {
  const out: Finding[] = []
  for (const item of items) {
    const opts = optsFor(item)
    if (!opts) continue
    const found = checkText(item.value, item.path, opts)
    const okina = found.some((f) => f.rule === 'TXT-1')
    out.push(...found.filter((f) => !(okina && f.rule === 'TXT-2' && checkText(fixOkina(item.value), item.path, opts).every((g) => g.rule !== 'TXT-2'))))
  }
  return out
}

/**
 * KR-1 to KR-3 on the Cyrillic text the /kr edition would show for these
 * items (§6.4): transliterated from uz at read time. Warnings only.
 */
export function krFindings(items: TextItem[]): Finding[] {
  return items.flatMap((item) => checkKr(toCyrillic(item.value), item.path))
}
