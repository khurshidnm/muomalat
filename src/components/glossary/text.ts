/**
 * Pure text helpers shared by the server pages and the client-side filter.
 * Kept free of content and transliteration imports so the client bundle stays small.
 */

/** Lower-case, drop apostrophe-like marks and inline markup, collapse spaces. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/[ʻʼ‘’'`*]/g, '')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Words of a normalised string; punctuation counts as a word break. */
export function searchWords(s: string): string[] {
  return normalizeSearch(s)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
}

/**
 * Haystack for word-prefix matching: " word word … ". A query word matches
 * only at the start of a word, so "ijora" finds "ijorachi" but not "notijorat".
 */
export function toHaystack(s: string): string {
  return ` ${searchWords(s).join(' ')} `
}

export function matchesAll(haystack: string, words: string[]): boolean {
  return words.every((w) => haystack.includes(` ${w}`))
}

/** Fill "{0}", "{1}" placeholders in a message template. */
export function fill(template: string, ...values: (string | number)[]): string {
  return template.replace(/\{(\d)\}/g, (m, i: string) => String(values[Number(i)] ?? m))
}
