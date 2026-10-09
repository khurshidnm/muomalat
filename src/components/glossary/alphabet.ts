import type { Locale } from '@/i18n/config'
import { toCyrillic } from '@/i18n/translit'
import type { GlossaryTerm, Localized } from '@/content'

/**
 * Uzbek alphabet order for the glossary index.
 *
 * Latin (1995 alphabet): the digraph letters Oʻ, Gʻ, Sh and Ch are letters in
 * their own right and come after Z. Cyrillic (/kr): the official order with
 * Ў Қ Ғ Ҳ at the end. ICU collation for uz-Cyrl does not follow it, so both
 * scripts are ordered here explicitly.
 */

export interface Letter {
  /** Display form: "A", "Oʻ", "Sh", "Ш". */
  label: string
  /** ASCII anchor fragment without the "harf-" prefix: "a", "ou", "sh". */
  id: string
}

const LATIN: Letter[] = [
  ...'ABDEFGHIJKLMNOPQRSTUVXYZ'.split('').map((l) => ({ label: l, id: l.toLowerCase() })),
  { label: 'Oʻ', id: 'ou' },
  { label: 'Gʻ', id: 'gh' },
  { label: 'Sh', id: 'sh' },
  { label: 'Ch', id: 'ch' },
]

const CYRILLIC_IDS: Record<string, string> = {
  А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Е: 'ye', Ё: 'yo', Ж: 'j', З: 'z', И: 'i', Й: 'y', К: 'k',
  Л: 'l', М: 'm', Н: 'n', О: 'o', П: 'p', Р: 'r', С: 's', Т: 't', У: 'u', Ф: 'f', Х: 'x', Ц: 'ts',
  Ч: 'ch', Ш: 'sh', Э: 'e', Ю: 'yu', Я: 'ya', Ў: 'ou', Қ: 'q', Ғ: 'gh', Ҳ: 'h',
}
const CYRILLIC: Letter[] = Object.entries(CYRILLIC_IDS).map(([label, id]) => ({ label, id }))

/** Fallback group for headwords that start with a digit or a foreign letter. */
export const OTHER_LETTER: Letter = { label: '#', id: 'boshqa' }

export function alphabet(locale: Locale): Letter[] {
  return locale === 'kr' ? CYRILLIC : LATIN
}

// ── Collation ─────────────────────────────────────────────────────────────

const APOSTROPHES = /[ʻʼ‘’'`]/

/** Split Latin Uzbek into alphabet units: "shariat" → sh·a·r·i·a·t, "oʻz" → oʻ·z. */
function latinUnits(word: string): string[] {
  const s = word.toLowerCase()
  const out: string[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const n = s[i + 1] ?? ''
    if ((c === 'o' || c === 'g') && APOSTROPHES.test(n) && n !== 'ʼ') {
      out.push(`${c}ʻ`)
      i++
    } else if ((c === 's' || c === 'c') && n === 'h') {
      out.push(`${c}h`)
      i++
    } else {
      out.push(c)
    }
  }
  return out
}

const LATIN_RANK = new Map<string, number>(
  [...'abdefghijklmnopqrstuvxyz'.split(''), 'c', 'w', 'oʻ', 'gʻ', 'sh', 'ch', 'ʼ'].map((u, i) => [u, i + 1]),
)
const CYRILLIC_RANK = new Map<string, number>(
  [...'абвгдеёжзийклмнопрстуфхцчшъьэюяўқғҳ'.split('')].map((u, i) => [u, i + 1]),
)

function rankOf(unit: string, table: Map<string, number>): number {
  if (/\s|[-–—(),.]/.test(unit)) return 0 // word breaks sort first: "Ijora" < "Ijora muntahiya"
  return table.get(unit) ?? 1000 + unit.codePointAt(0)!
}

function sortKey(term: string, locale: Locale): number[] {
  if (locale === 'kr') {
    // Acronyms (AAOIFI, IFSB) stay Latin in the Cyrillic edition; sort them by their Cyrillic reading.
    const cyr = toCyrillic(term.toLowerCase()).toLowerCase()
    return [...cyr].map((u) => rankOf(u, CYRILLIC_RANK))
  }
  return latinUnits(term).map((u) => rankOf(u, LATIN_RANK))
}

export function compareTerms(a: string, b: string, locale: Locale): number {
  const ka = sortKey(a, locale)
  const kb = sortKey(b, locale)
  for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i]
  }
  return ka.length - kb.length
}

/** The alphabet letter a headword is filed under. */
export function letterOf(term: string, locale: Locale): Letter {
  const s = term.trim()
  if (locale === 'kr') {
    let first = s.charAt(0)
    if (/[A-Za-z]/.test(first)) first = toCyrillic(first.toLowerCase())
    const up = first.toUpperCase()
    return CYRILLIC.find((l) => l.label === up) ?? OTHER_LETTER
  }
  const unit = latinUnits(s)[0] ?? ''
  return LATIN.find((l) => l.label.toLowerCase() === unit) ?? OTHER_LETTER
}

/** Glossary in alphabet order (the order used by the index and prev/next links). */
export function orderTerms<T extends Localized<GlossaryTerm>>(terms: T[], locale: Locale): T[] {
  const letters = [...alphabet(locale), OTHER_LETTER]
  const pos = (t: T) => letters.findIndex((l) => l.id === letterOf(t.term, locale).id)
  return [...terms].sort((a, b) => pos(a) - pos(b) || compareTerms(a.term, b.term, locale))
}

// ── Search ────────────────────────────────────────────────────────────────

export { normalizeSearch } from './text'
