/**
 * Text helpers for search results: query folding that mirrors the content
 * search (`search()` in src/content), match ranges for highlighting,
 * excerpts, a Latin ⇄ Cyrillic fallback for queries typed in the "other"
 * script, and {0}-style templates. Pure functions, safe on server or client.
 */
import type { Locale } from '@/i18n/config'
import { toCyrillic } from '@/i18n/translit'
import type { ArticleBlock } from '@/content/types'
import { plainText } from '@/components/ui/InlineText'

/** Characters the content search ignores (oʻ/gʻ marks, tutuq, apostrophes, markup). */
const IGNORED = /[ʻʼ‘’'`*_]/

/** Lower-cases and drops ignored characters, keeping a map back to the original indices. */
function fold(text: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (IGNORED.test(ch)) continue
    const lower = ch.toLowerCase()
    for (let k = 0; k < lower.length; k++) {
      folded += lower[k]
      map.push(i)
    }
  }
  return { folded, map }
}

/** Distinct query words worth highlighting (two characters or more), longest first. */
export function queryWords(query: string): string[] {
  const words = fold(query).folded.split(/\s+/).filter((w) => w.length >= 2)
  return [...new Set(words)].sort((a, b) => b.length - a.length)
}

export type Range = [start: number, end: number]

/** Merged [start, end) ranges in `text` where any of `words` occurs. */
export function matchRanges(text: string, words: readonly string[]): Range[] {
  if (!text || !words.length) return []
  const { folded, map } = fold(text)
  const ranges: Range[] = []
  for (const w of words) {
    let from = 0
    for (;;) {
      const at = folded.indexOf(w, from)
      if (at < 0) break
      ranges.push([map[at], map[at + w.length - 1] + 1])
      from = at + w.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1])
  const merged: Range[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}

/** Splits text into plain and matched parts, in order. */
export function splitByMatches(text: string, words: readonly string[]): { text: string; match: boolean }[] {
  const ranges = matchRanges(text, words)
  if (!ranges.length) return [{ text, match: false }]
  const parts: { text: string; match: boolean }[] = []
  let pos = 0
  for (const [s, e] of ranges) {
    if (s > pos) parts.push({ text: text.slice(pos, s), match: false })
    parts.push({ text: text.slice(s, e), match: true })
    pos = e
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), match: false })
  return parts
}

export function hasMatch(text: string, words: readonly string[]): boolean {
  return matchRanges(text, words).length > 0
}

/**
 * A window of about `length` characters around the first match, cut at word
 * boundaries, with ellipses where text was dropped.
 */
export function excerpt(text: string, words: readonly string[], length = 190): string {
  const first = matchRanges(text, words)[0]
  if (!first || text.length <= length) return text
  let start = Math.max(0, first[0] - Math.round(length * 0.35))
  if (start > 0) {
    const space = text.indexOf(' ', start)
    start = space > -1 && space < first[0] ? space + 1 : start
  }
  let end = Math.min(text.length, start + length)
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end)
    end = space > first[1] ? space : end
  }
  const body = text.slice(start, end).replace(/[\s,;:—–-]+$/, '')
  return `${start > 0 ? '… ' : ''}${body}${end < text.length ? ' …' : ''}`
}

/** Readable text of an article body, block by block (tables and charts skipped). */
export function bodyTexts(body: readonly ArticleBlock[]): string[] {
  const out: string[] = []
  for (const b of body) {
    switch (b.type) {
      case 'p':
      case 'h2':
      case 'h3':
      case 'quote':
      case 'callout':
        out.push(plainText(b.text))
        break
      case 'list':
        out.push(...b.items.map(plainText))
        break
      case 'qa':
        out.push(plainText(b.question), ...b.answer.map(plainText))
        break
      case 'factbox':
        out.push(...b.items.map((i) => `${i.label}: ${i.value}`))
        break
      default:
        break
    }
  }
  return out
}

// ── Script fallback ───────────────────────────────────────────────────────

const CYRILLIC = /[\u0400-\u04FF]/
const LATIN = /[A-Za-z]/

const TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', ғ: 'gʻ', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', о: 'o', ў: 'oʻ', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'x', ҳ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: 'ʼ', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
const VOWELS = new Set('аеёиоуўэюяы')

/** Simple Uzbek Cyrillic → Latin conversion, enough to retry a search query. */
export function toLatin(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const lower = ch.toLowerCase()
    let rep = TO_LATIN[lower]
    if (rep === undefined) {
      out += ch
      continue
    }
    if (lower === 'е') {
      const prev = text[i - 1]?.toLowerCase() ?? ''
      if (!prev || !CYRILLIC.test(prev) || VOWELS.has(prev) || prev === 'ъ' || prev === 'ь') rep = 'ye'
    }
    out += ch !== lower && rep ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep
  }
  return out
}

/**
 * The same query in the edition's other script, when it was typed in a script
 * the edition's text does not use: Latin on the Cyrillic edition, Cyrillic on
 * the Latin (and ru/en, mostly Uzbek-content) editions.
 */
export function otherScriptQuery(locale: Locale, query: string): string | undefined {
  const q = query.trim()
  const cyr = CYRILLIC.test(q)
  const lat = LATIN.test(q)
  let alt: string | undefined
  if (locale === 'kr') alt = lat && !cyr ? toCyrillic(q) : cyr ? toLatin(q) : undefined
  else alt = cyr ? toLatin(q) : undefined
  return alt && alt !== q ? alt : undefined
}

// ── Templates ─────────────────────────────────────────────────────────────

/** Replace {0}, {1}… in a message template with plain strings. */
export function fillTemplate(template: string, ...values: string[]): string {
  return template.replace(/\{(\d)\}/g, (_, i: string) => values[Number(i)] ?? '')
}

/** Split a template into literal text and placeholder indices. */
export function templateParts(template: string): (string | number)[] {
  return template.split(/\{(\d)\}/).map((part, i) => (i % 2 === 1 ? Number(part) : part))
}

// ── Exact matches ─────────────────────────────────────────────────────────

function key(text: string): string {
  return fold(text).folded.replace(/\s+/g, ' ').trim()
}

/** True when two strings are the same once case, marks and spacing are ignored. */
export function sameText(a: string, b: string): boolean {
  return key(a) === key(b)
}

/** Every name a glossary entry answers to: headword, equivalents without glosses, spellings. */
export function termNames(term: { term: string; aliases: { ru?: string; en?: string; ar?: string; other?: string[] } }): string[] {
  const strip = (s?: string) => (s ? s.replace(/\s*\(.*?\)\s*/g, ' ').split(',').map((x) => x.trim()) : [])
  return [term.term, ...strip(term.term), ...strip(term.aliases.en), ...strip(term.aliases.ru), ...strip(term.aliases.ar), ...(term.aliases.other ?? [])].filter(
    Boolean,
  )
}
