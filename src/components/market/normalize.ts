/**
 * Search normalisation shared by the server (haystacks) and the client
 * (queries): lower case, no ʻ/ʼ/apostrophes, single spaces. "fargʻona",
 * "farg'ona" and "fargona" all match.
 */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFC')
    .replace(/[ʻʼ‘’'`ʹ]/g, '')
    .replace(/[«»"“”(),.;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Replace `{0}`, `{1}`… in a message template with strings. */
export function format(template: string, ...values: (string | number)[]): string {
  return template.replace(/\{(\d)\}/g, (_, i: string) => String(values[Number(i)] ?? ''))
}

/**
 * Keep Uzbek numeric prefixes with their word ("1-noyabr", "2027-yil",
 * "7-oktabrda") so lines never break after the hyphen. Inserts U+2060 WORD
 * JOINER, which is invisible and ignored by search.
 */
export function keepNumbersTogether(value: string): string {
  return value.replace(/(\d)-(?=\p{L})/gu, '$1-⁠')
}
