/**
 * Uzbek Latin → Uzbek Cyrillic transliteration for the /kr edition.
 *
 * Rule-based, following the 1995 alphabet correspondence, with an exception
 * list for Russian loanwords (ц, ь, я/ю after consonants). Text inside inline
 * markup targets ([label](href), [[slug|label]]), foreign words marked
 * {en:…}, URLs, domains (muomalat.uz), e-mail addresses, @handles and the
 * international acronyms in KEEP (AAOIFI, IFSB) is left untouched; Uzbek
 * acronyms are transliterated (OAV → ОАВ, QQS → ҚҚС).
 * Editorial review of the Cyrillic edition is still expected.
 */

const MOD = 'ʻ' // U+02BB, oʻ / gʻ
const TUTUQ = 'ʼ' // U+02BC, tutuq belgisi → ъ

// Loanword stems, longest first. Keys are lower-case Latin; values Cyrillic.
const STEMS: [string, string][] = [
  ['konsultatsiya', 'консультация'],
  ['assotsiatsiya', 'ассоциация'],
  ['yurisdiksiya', 'юрисдикция'],
  ['tendensiya', 'тенденция'],
  ['litsenziya', 'лицензия'],
  ['avtomobil', 'автомобил'],
  ['potentsial', 'потенциал'],
  ['potensial', 'потенциал'],
  ['intervyu', 'интервью'],
  ['ssenariy', 'сценарий'],
  ['litsenz', 'лиценз'],
  ['sentabr', 'сентябр'],
  ['oktabr', 'октябр'],
  ['noyabr', 'ноябр'],
  ['dekabr', 'декабр'],
  ['yanvar', 'январ'],
  ['fevral', 'феврал'],
  ['aprel', 'апрел'],
  ['tsentr', 'центр'],
  ['sotsial', 'социал'],
  ['aksiya', 'акция'],
  ['portfel', 'портфел'],
  ['model', 'модел'],
  ['dollar', 'доллар'],
  ['kapital', 'капитал'],
  ['profil', 'профил'],
  ['filtr', 'фильтр'],
  ['mebel', 'мебел'],
  ['iyun', 'июн'],
  ['iyul', 'июл'],
]
// Stems that take a soft sign when the word ends on the stem (мебель, but мебеллари).
const SOFT_END = new Set([
  'sentabr', 'oktabr', 'noyabr', 'dekabr', 'yanvar', 'fevral', 'aprel', 'iyun', 'iyul', 'portfel', 'model',
  'avtomobil', 'profil', 'mebel',
])

const SINGLE: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к',
  l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у',
  v: 'в', x: 'х', y: 'й', z: 'з', c: 'с', w: 'в',
}
const VOWELS = new Set(['а', 'е', 'и', 'о', 'у', 'ў', 'э', 'ю', 'я', 'ё'])

function matchCase(src: string, out: string): string {
  if (src.length > 0 && src === src.toUpperCase() && src !== src.toLowerCase()) {
    // Whole token upper-case → upper-case output; single capital → capitalise.
    return src.length > 1 ? out.toUpperCase() : out.charAt(0).toUpperCase() + out.slice(1)
  }
  if (src.charAt(0) !== src.charAt(0).toLowerCase()) {
    return out.charAt(0).toUpperCase() + out.slice(1)
  }
  return out
}

function translitWord(word: string): string {
  const lower = word.toLowerCase()
  let out = ''
  let i = 0
  const isUpperWord = word.length > 1 && word === word.toUpperCase()
  const caseOf = (start: number, len: number, cyr: string) => {
    const src = word.slice(start, start + len)
    if (isUpperWord) return cyr.toUpperCase()
    return src.charAt(0) !== src.charAt(0).toLowerCase() ? cyr.charAt(0).toUpperCase() + cyr.slice(1) : cyr
  }

  while (i < word.length) {
    // цех: safe only at the start of a word ("sex" occurs inside native words).
    if (i === 0 && lower.startsWith('sex')) {
      out += caseOf(0, 3, 'цех')
      i = 3
      continue
    }
    // Loanword stems
    let matched = false
    for (const [stem, cyr] of STEMS) {
      if (lower.startsWith(stem, i)) {
        let rep = cyr
        if (SOFT_END.has(stem) && i + stem.length === word.length) rep += 'ь'
        out += caseOf(i, stem.length, rep)
        i += stem.length
        matched = true
        break
      }
    }
    if (matched) continue

    const c = lower[i]
    const n = lower[i + 1]
    const prev = out.length ? out[out.length - 1].toLowerCase() : ''
    const atStart = i === 0

    if ((c === 'o' || c === 'g') && (n === MOD || n === '‘' || n === "'" || n === '`')) {
      out += caseOf(i, 1, c === 'o' ? 'ў' : 'ғ')
      i += 2
      continue
    }
    if (c === 's' && n === 'h') { out += caseOf(i, 2, 'ш'); i += 2; continue }
    if (c === 'c' && n === 'h') { out += caseOf(i, 2, 'ч'); i += 2; continue }
    // yoʻ is й + ў (йўқ, йўл, Йўлдошев), not ё + a stray okina.
    const n2 = lower[i + 2]
    if (c === 'y' && n === 'o' && (n2 === MOD || n2 === '‘' || n2 === "'" || n2 === '`')) { out += caseOf(i, 1, 'й'); i += 1; continue }
    if (c === 'y' && n === 'o') { out += caseOf(i, 2, 'ё'); i += 2; continue }
    if (c === 'y' && n === 'u') { out += caseOf(i, 2, 'ю'); i += 2; continue }
    if (c === 'y' && n === 'a') { out += caseOf(i, 2, 'я'); i += 2; continue }
    if (c === 'y' && n === 'e') { out += caseOf(i, 2, 'е'); i += 2; continue }
    if (c === 't' && lower.startsWith('tsiya', i)) { out += caseOf(i, 5, 'ция'); i += 5; continue }
    if (c === 't' && lower.startsWith('tsion', i)) { out += caseOf(i, 5, 'цион'); i += 5; continue }
    // -ksiya loanwords: funksiya → функция, sanksiya → санкция, tranzaksiya → транзакция.
    if (c === 'k' && lower.startsWith('ksiya', i)) { out += caseOf(i, 5, 'кция'); i += 5; continue }
    if (c === TUTUQ || c === '’') { out += 'ъ'; i += 1; continue }
    if (c === 'e') {
      out += caseOf(i, 1, atStart || VOWELS.has(prev) || prev === 'ъ' ? 'э' : 'е')
      i += 1
      continue
    }
    const single = SINGLE[c]
    if (single) {
      out += caseOf(i, 1, single)
    } else {
      out += word[i]
    }
    i += 1
  }
  return out
}

// The brand stays Latin in every edition, including inflected forms (Muomalatga),
// as do URLs, bare domains (muomalat.uz), e-mail, @handles, Roman numerals and
// international acronyms. Uzbek acronyms are not listed: OAV → ОАВ, QQS → ҚҚС.
const ACRONYMS = 'AAOIFI|IFSB|IIFM|IsDB|IMF|OIC|PSIA|PLS|SSB|SPV|CNC|ESG|KPI|ISO|IT|RSS|PDF|UTC|UZS|USD|EUR|EN|RU|AR'
const KEEP = new RegExp(
  `^(?:Muomalat[a-zʻʼ]*|https?:\\/\\/\\S+|www\\.\\S+|\\S+@\\S+\\.\\S+|@\\w+|(?:[a-z0-9-]+\\.)+(?:uz|com|org|net|ru)(?:\\/\\S*)?|(?:${ACRONYMS})(?:-[A-Z0-9]+)*|[IVX]{2,}|\\d[\\d.,:%]*)$`,
)
const WORD = /[A-Za-zʻʼ‘’'`]+/g

// Placeholder institution letters ("Tijorat banki E", "Takaful operatori Q")
// are labels, not words: keep them Latin after these nouns.
const LABEL_HOST = /(?:bank|banki|tashkiloti|kompaniyasi|operatori|oynasi)$/i

function translitPlain(text: string): string {
  let prevWord = ''
  return text
    .split(/(\s+)/)
    .map((chunk) => {
      if (!chunk.trim()) return chunk
      const core = chunk.replace(/^[«"(\[]+|[»".,;:!?)\]]+$/g, '')
      const host = prevWord
      prevWord = core
      if (KEEP.test(core)) return chunk
      if (/^[A-Z]$/.test(core) && LABEL_HOST.test(host)) return chunk
      return chunk.replace(WORD, (w) => translitWord(w))
    })
    .join('')
}

// [[slug|label]] and [label](href): transliterate only the label.
// {en:…}: foreign words, copied unchanged.
const MARKUP = /(\[\[[^|\]]+\|)([^\]]+)(\]\])|(\[)([^\]]+)(\]\([^)]+\))|(\{en:[^}]+\})/g

/** Transliterate Uzbek Latin text (with optional inline markup) into Cyrillic. */
export function toCyrillic(text: string): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(MARKUP)) {
    out += translitPlain(text.slice(last, m.index))
    if (m[1]) out += m[1] + translitPlain(m[2]) + m[3]
    else if (m[7]) out += m[7]
    else out += m[4] + translitPlain(m[5]) + m[6]
    last = (m.index ?? 0) + m[0].length
  }
  out += translitPlain(text.slice(last))
  return out
}

/** Keys whose string values are identifiers, not prose. */
const SKIP_KEYS = new Set([
  'id', 'slug', 'rubric', 'src', 'url', 'href', 'publishedAt', 'updatedAt', 'date', 'startsAt', 'endsAt',
  'statusDate', 'type', 'status', 'kind', 'category', 'authors', 'tags', 'terms', 'related', 'articles',
  'articleId', 'align', 'format', 'email', 'telegram', 'time', 'orientation', 'aliases',
])

/** Deep-transliterate every prose string in a content object. */
export function deepCyrillic<T>(value: T, key?: string): T {
  if (key && SKIP_KEYS.has(key)) return value
  if (typeof value === 'string') return toCyrillic(value) as T
  if (Array.isArray(value)) return value.map((v) => deepCyrillic(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepCyrillic(v, k)
    return out as T
  }
  return value
}
