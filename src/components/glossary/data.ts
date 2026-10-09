import type { Locale } from '@/i18n/config'
import { getGlossary, getTerm, type GlossaryCategory, type GlossaryTerm, type Localized } from '@/content'
import { alphabet, letterOf, orderTerms, OTHER_LETTER, type Letter } from './alphabet'
import { toHaystack } from './text'

/** Display order of the five categories (filter chips, legends). */
export const CATEGORIES: readonly GlossaryCategory[] = ['shartnoma', 'tamoyil', 'institut', 'bozor', 'standart']

export type Term = Localized<GlossaryTerm>

/** The glossary in Uzbek alphabet order for an edition. */
export function orderedGlossary(locale: Locale): Term[] {
  return orderTerms(getGlossary(locale), locale)
}

/** Alphabet neighbours used by the previous/next links on a term page. */
export function neighbours(locale: Locale, slug: string): { prev?: Term; next?: Term } {
  const list = orderedGlossary(locale)
  const i = list.findIndex((t) => t.slug === slug)
  if (i < 0) return {}
  return { prev: list[i - 1], next: list[i + 1] }
}

/** Letters to show in the A–Z bar: the full alphabet, plus "#" only if a headword needs it. */
export function indexLetters(locale: Locale, terms: Term[]): Letter[] {
  const letters = alphabet(locale)
  return terms.some((t) => letterOf(t.term, locale).id === OTHER_LETTER.id) ? [...letters, OTHER_LETTER] : letters
}

/**
 * Text the client-side filter matches against: the headword in both scripts
 * (readers type Latin in the Cyrillic edition and the other way round), the
 * equivalents in other languages and the one-line definition.
 */
export function searchHaystack(locale: Locale, t: Term): string {
  const other = getTerm(locale === 'kr' ? 'uz' : 'kr', t.slug)
  const parts = [
    t.term,
    other?.term,
    t.aliases.en,
    t.aliases.ru,
    t.aliases.ar,
    ...(t.aliases.other ?? []),
    t.short,
    other?.short,
  ]
  return toHaystack(parts.filter(Boolean).join(' '))
}

export { fill } from './text'
