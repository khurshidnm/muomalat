import { fixOkina, fixQuotes, fixTutuq } from '../../../content/rules'
import { fixTextNodes, isLexical } from './lexical'
import { formField, type Doc, type StoredFinding } from './shared'

/**
 * The one-click fixes of CMS-SPEC §7.3 (TXT-1, TXT-2, TXT-7): applied to the
 * stored uz values, then saved as a draft by the check endpoint. A fix is
 * re-derived from the rule rather than replayed from a stored string, so two
 * fixes on the same text compose and a text that changed meanwhile is still
 * fixed correctly.
 */
export const FIXERS: Record<string, (s: string) => string> = { 'TXT-1': fixOkina, 'TXT-2': fixTutuq, 'TXT-7': fixQuotes }

const setAt = (doc: Doc, parts: string[], fn: (v: unknown) => unknown): void => {
  let cur: unknown = doc
  for (const p of parts.slice(0, -1)) {
    if (!cur || typeof cur !== 'object') return
    cur = (cur as Doc)[p]
  }
  const last = parts[parts.length - 1]
  if (cur && typeof cur === 'object' && last in (cur as Doc)) (cur as Doc)[last] = fn((cur as Doc)[last])
}

/**
 * Applies the fixable findings to a copy of the uz document. Returns the
 * changed top-level fields (the data for the draft save) and what was fixed.
 */
export function applyFixes(uz: Doc, findings: StoredFinding[]): { data: Doc; applied: { rule: string; field: string }[] } {
  const doc = structuredClone(uz)
  const changed = new Set<string>()
  const applied: { rule: string; field: string }[] = []
  for (const f of findings) {
    const fix = FIXERS[f.rule]
    if (!fix || !f.fixable) continue
    const field = formField(f.path)
    const node = /^\w+\[(\d+)\]/.exec(f.path)
    const parts = field.split('.')
    if (node && isLexical(doc[parts[0]])) {
      doc[parts[0]] = fixTextNodes(doc[parts[0]] as never, Number(node[1]), fix)
    } else {
      setAt(doc, parts, (v) => (typeof v === 'string' ? fix(v) : v))
    }
    changed.add(parts[0])
    applied.push({ rule: f.rule, field })
  }
  return { data: Object.fromEntries([...changed].map((k) => [k, doc[k]])), applied }
}
