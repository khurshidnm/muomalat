/**
 * Content rules shared by `scripts/validate-content.ts` and the CMS
 * validation concern (CMS-SPEC §7.1). Pure functions with no I/O: callers
 * pass in the text, the path it came from and what they know about the
 * document, and get findings back.
 *
 *   checkText(s, path, opts)     orthography, banned and review terms, real organisations, dates (TXT-*)
 *   checkKr(s, path)             the generated Cyrillic (/kr) text (KR-*)
 *   checkArticle(view, ctx)      structural article rules (ART-*)
 *   checkMedia(media, path, ctx) alt text and image rights (ART-13 to ART-16)
 *
 * Messages are Uzbek and say how to fix the problem (§7.3). Muomalat reports
 * Islamic finance as finance: it never quotes scripture and never issues a
 * ruling, which is what TXT-3 and TXT-4 guard.
 *
 * The rules the script ran before this module existed keep their behaviour:
 * on the mock data it still reports nothing. Rules added for the CMS run only
 * in checkArticle's `all` scope or through options the script does not pass.
 */
import type { ArticleBlock, ChartSpec, Interviewee, Source } from './types'

export type Level = 'error' | 'warning'

/** A one-click fix (TXT-1, TXT-2, TXT-7): replace `from` with `to` in the string at `path`. */
export interface Fix {
  from: string
  to: string
}

export interface Finding {
  /** Rule id of CMS-SPEC §7.2, e.g. TXT-1, ART-14, KR-2. */
  rule: string
  level: Level
  /** Where the text came from: a field path in the CMS, an object path in the script. */
  path: string
  /** Uzbek; says what is wrong and how to fix it. */
  message: string
  /** The text around the problem, so the editor can find it. */
  excerpt?: string
  fix?: Fix
}

/** The parts of the `editorial-rules` global that extend the code-level lists (§3.16). */
export interface EditorialRulesLike {
  bannedTerms?: { pattern?: string | null }[] | null
  reviewTerms?: { pattern?: string | null }[] | null
  realOrgNames?: { name?: string | null }[] | null
  houseSpellings?: { wrong?: string | null; right?: string | null }[] | null
  limits?: Partial<Limits> | null
}

export interface Limits {
  titleWarn: number
  titleMax: number
  leadWarn: number
  leadMax: number
  telegramCaption: number
}

export const DEFAULT_LIMITS: Limits = { titleWarn: 80, titleMax: 140, leadWarn: 300, leadMax: 500, telegramCaption: 1024 }

// ── the lists and patterns ────────────────────────────────────────────────
/** oʻ / gʻ written with a wrong mark. */
export const BAD_OKINA = /[oOgG]['‘’`ʼʽ]/
/** An apostrophe used as the tutuq belgisi (should be ʼ U+02BC), or ʻ after a letter other than o/g. */
export const BAD_TUTUQ = /[A-Za-z]['’`](?=[A-Za-z])|[A-FH-NP-Za-fh-np-z]ʻ(?=[A-Za-z])/
/** Religious material Muomalat never publishes: scripture, hadith, worship. */
export const BANNED = [/qurʼ?on/i, /qur'on/i, /\boyat/i, /\bhadis/i, /\bsura\b/i, /paygʻambar/i, /\balloh/i, /\bmasjid/i, /\bnamoz/i, /\bduo\b/i, /\bimom\b/i]
/** Words that sound like a ruling: allowed only in the disclaimer form. */
export const REVIEW = [/fatvo/i, /\bharom\b/i, /\bhalol\b/i, /\bjoiz\b/i]
/** The editorial disclaimer ("we issue no fatvo") names the word to deny it: not a ruling. */
export const DISCLAIMER = /(chiqarmay|chiqarilmay|bermay|bermaydi)/i
/** Common words that start like an organisation name (alifbo = alphabet). */
export const ORG_FALSE_FRIENDS: Record<string, RegExp> = { alif: /(^|[^a-zʻ])alifbo/gi }
export const REAL_ORGS = [
  'hamkorbank', 'ipoteka', 'kapitalbank', 'asaka', 'agrobank', 'orient finans', 'davr bank', 'turonbank', 'turon bank', 'trastbank', 'ravnaq',
  'universal bank', 'madad', 'tenge', 'kdb', 'ziraat', 'anorbank', 'anor bank', 'garant bank', 'tbc', 'uzum', 'hayot bank', 'saderat', 'poytaxt bank',
  'apex bank', 'octobank', 'smartbank', 'yangi bank', 'asia alliance', 'infinbank', 'aloqabank', 'mikrokreditbank', 'xalq banki', 'milliy bank', 'nbu',
  'sqb', 'sanoatqurilish', 'qishloq qurilish', 'alif', 'alfa-bank', 'ipak yoʻli', 'hi-tech bank', 'markaziy bank', 'al rajhi', 'dubai islamic',
  'maybank', 'cimb', 'kuwait finance', 'kfh', 'islom taraqqiyot banki', 'islamic development bank', 'isdb', 'ifc', 'osiyo taraqqiyot', 'jahon banki',
  'world bank', 'xvf', 'imf', 'moody', 'fitch', 's&p', 'lseg', 'refinitiv', 'bloomberg', 'reuters', 'nasdaq', 'toshkent fond birjasi', 'uzse',
]
/** Russian month spellings and months written with an apostrophe (standard Uzbek: sentabr, oktabr, noyabr). */
export const MONTH_MISSPELT = /\b(oktyabr|sentyabr|noyabr[ʼ']|yanvar[ʼ']|fevral[ʼ']|aprel[ʼ']|iyun[ʼ']|iyul[ʼ'])/i
/** "2026 yil" instead of "2026-yil". */
export const YEAR_NO_HYPHEN = /\b\d{4} yil/
/** "8 oktabr" instead of "8-oktabr". */
export const DAY_NO_HYPHEN = /\b\d{1,2} (yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr)/i
/** ISO 8601 with the Tashkent offset, the format of the mock data. */
export const isoTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+05:00$/
/** CMS-SPEC §3.1. */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** Arabic script (TXT-11): terms are transliterated into Latin. */
export const ARABIC = /[؀-ۿ]/

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')

/** The word (or the 60 characters) around a match, for the message. */
function wordAt(s: string, index: number): string {
  let a = index
  let b = index
  while (a > 0 && !/[\s«»"(),;:!?]/.test(s[a - 1])) a--
  while (b < s.length && !/[\s«»"(),;:!?]/.test(s[b])) b++
  return s.slice(a, b).slice(0, 60)
}

function around(s: string, index: number, width = 40): string {
  const a = Math.max(0, index - width)
  const b = Math.min(s.length, index + width)
  return `${a > 0 ? '…' : ''}${s.slice(a, b)}${b < s.length ? '…' : ''}`
}

/** TXT-1 fix: every o/g followed by a wrong mark gets ʻ (U+02BB). */
export const fixOkina = (s: string) => s.replace(/([oOgG])['‘’`ʼʽ]/g, '$1ʻ')
/** TXT-2 fix: an apostrophe between letters becomes ʼ (U+02BC). After o and g it is TXT-1's, so it is left alone. */
export const fixTutuq = (s: string) => s.replace(/([A-FH-NP-Za-fh-np-z])['’`ʻ](?=[A-Za-z])/g, '$1ʼ')
/** TXT-7 fix: "…" pairs become «…». An unpaired quote is left for the editor. */
export const fixQuotes = (s: string) => s.replace(/"([^"\n]*)"/g, '«$1»')

const compile = (patterns: { pattern?: string | null }[] | null | undefined): RegExp[] =>
  (patterns ?? []).flatMap((p) => {
    if (!p?.pattern) return []
    try {
      return [new RegExp(p.pattern, 'i')]
    } catch {
      return [] // the global validates patterns on save; a broken one never disables the others
    }
  })

// ── text rules (TXT-*) ────────────────────────────────────────────────────
export interface TextCheckOptions {
  /**
   * `site-settings.demo.noticeEnabled`. In demo mode every real organisation
   * name warns (TXT-5), because the demo site uses invented names only.
   */
  demoMode: boolean
  /** The `editorial-rules` global: additions to the code-level lists. */
  extra?: EditorialRulesLike | null
  /**
   * Outside demo mode: names of the institutions tagged in About / Mentions.
   * A real organisation in the text that matches none of them warns "tag
   * it?". Left out, outside demo mode, TXT-5 is skipped (glossary, club).
   */
  tagged?: string[]
  /** false: no TXT-5 at all (an institution's own name). */
  realOrgs?: boolean
  /** TXT-11 level: error in the glossary, warning elsewhere. Left out, TXT-11 is skipped. */
  arabic?: Level
}

/**
 * TXT-1 to TXT-11 on one string. Paths are the caller's; the findings come in
 * the order the original script reported them.
 */
export function checkText(s: string, path: string, opts: TextCheckOptions): Finding[] {
  const out: Finding[] = []
  const add = (rule: string, level: Level, message: string, index = 0, fix?: Fix) =>
    out.push({ rule, level, path, message, excerpt: around(s, index), ...(fix && fix.from !== fix.to ? { fix } : {}) })

  const okina = s.match(BAD_OKINA)
  if (okina) add('TXT-1', 'error', `«${wordAt(s, okina.index ?? 0)}» — oʻ va gʻ harflarida ʻ (U+02BB) belgisidan foydalaning`, okina.index, { from: s, to: fixOkina(s) })
  const tutuq = s.match(BAD_TUTUQ)
  if (tutuq && !/https?:/.test(s)) add('TXT-2', 'warning', `«${wordAt(s, tutuq.index ?? 0)}» — tutuq belgisi ʼ (U+02BC) boʻlishi kerak`, tutuq.index, { from: s, to: fixTutuq(s) })

  for (const re of [...BANNED, ...compile(opts.extra?.bannedTerms)]) {
    const m = s.match(re)
    if (m) add('TXT-3', 'error', `«${wordAt(s, m.index ?? 0)}» — diniy matn (oyat, hadis, fatvo) va ibodatga oid soʻzlar nashr qilinmaydi: Muomalat faqat moliyaviy faktlarni yozadi`, m.index)
  }
  if (!DISCLAIMER.test(s)) {
    for (const re of [...REVIEW, ...compile(opts.extra?.reviewTerms)]) {
      const m = s.match(re)
      if (m) add('TXT-4', 'warning', `«${wordAt(s, m.index ?? 0)}» — hukmga oʻxshash soʻz: Muomalat hukm chiqarmaydi, iborani tekshiring yoki kimning fikri ekanini yozing`, m.index)
    }
  }

  if (opts.realOrgs !== false && (opts.demoMode || opts.tagged)) {
    const low = s.toLowerCase()
    const extraNames = (opts.extra?.realOrgNames ?? []).map((o) => o?.name?.trim().toLowerCase()).filter((n): n is string => !!n)
    const names = [...REAL_ORGS, ...extraNames.filter((n) => !REAL_ORGS.includes(n))]
    const tagged = (opts.tagged ?? []).map((t) => t.toLowerCase())
    for (const name of names) {
      if (!new RegExp(`(^|[^a-zʻ])${escapeRe(name)}`, 'i').test(low.replace(ORG_FALSE_FRIENDS[name] ?? /$^/, ' '))) continue
      const at = Math.max(0, low.indexOf(name))
      if (opts.demoMode) {
        add('TXT-5', 'warning', `«${name}» — haqiqiy tashkilot nomi: demo rejimida faqat shartli nomlar ishlatiladi`, at)
      } else if (!tagged.some((t) => t.includes(name) || name.includes(t))) {
        add('TXT-5', 'warning', `«${name}» tilga olingan, lekin «Asosiy tashkilot» yoki «Tilga olingan tashkilotlar» maydonida belgilanmagan: belgilab qoʻyasizmi?`, at)
      }
    }
  }

  if (/\s{2,}/.test(s.trim())) add('TXT-6', 'warning', 'Ketma-ket ikki boʻsh joy: bittasini oʻchiring', s.search(/\s{2,}/))
  if (/ ,|\s\./.test(s) && !/\d \./.test(s)) add('TXT-6', 'warning', 'Tinish belgisidan oldin boʻsh joy: uni oʻchiring', s.search(/ ,|\s\./))
  if (/"/.test(s)) add('TXT-7', 'warning', 'Toʻgʻri qoʻshtirnoq (") ishlatilgan: «…» qoʻshtirnogʻidan foydalaning', s.indexOf('"'), { from: s, to: fixQuotes(s) })

  const month = s.match(MONTH_MISSPELT)
  if (month) add('TXT-8', 'error', `«${month[0]}» — oy nomi notoʻgʻri: sentabr, oktabr, noyabr, yanvar… deb yozing`, month.index)
  const year = s.match(YEAR_NO_HYPHEN)
  if (year) add('TXT-9', 'warning', `«${year[0]}» — yildan keyin chiziqcha qoʻying: «2026-yil»`, year.index)
  const day = s.match(DAY_NO_HYPHEN)
  if (day) add('TXT-9', 'warning', `«${day[0]}» — kun va oy orasiga chiziqcha qoʻying: «8-oktabr»`, day.index)

  for (const h of opts.extra?.houseSpellings ?? []) {
    const wrong = h?.wrong?.trim()
    if (!wrong || !h?.right) continue
    const m = new RegExp(`(^|[^\\p{L}ʻʼ])(${escapeRe(wrong)})(?=$|[^\\p{L}ʻʼ])`, 'iu').exec(s)
    if (m) add('TXT-10', 'warning', `«${m[2]}» — tahririyat imlosi boʻyicha «${h.right}» deb yozing`, m.index + m[1].length)
  }

  if (opts.arabic) {
    const m = s.match(ARABIC)
    if (m) add('TXT-11', opts.arabic, 'Arab yozuvi ishlatilgan: lotin transliteratsiyasidan foydalaning', m.index)
  }
  return out
}

// ── Cyrillic edition (KR-*) ───────────────────────────────────────────────
// The /kr pages are transliterated from Uzbek Latin (src/i18n/translit.ts).
// These checks run on that output, so transliteration slips show up here.

/** Keys whose values are identifiers or other-language text, not Cyrillic prose. */
export const KR_SKIP = new Set([
  'translations', 'labels', 'aliases', 'id', 'slug', 'rubric', 'src', 'url', 'href', 'email', 'telegram', 'contentLang',
  'publishedAt', 'updatedAt', 'date', 'startsAt', 'endsAt', 'statusDate', 'type', 'status', 'kind', 'category', 'authors',
  'tags', 'terms', 'related', 'articleId', 'align', 'format', 'orientation',
])
/** Latin runs allowed in Cyrillic text: the brand, acronyms (AAOIFI, SMS), placeholder letters (Tijorat banki E). */
export const KR_LATIN_OK = /^(?:Muomalat[a-zʻʼ]*|[A-Z][A-Z0-9]+|[A-Z])$/
/** Latin kept on purpose by a `kr` override, by path prefix. */
export const KR_LATIN_INTENDED: [string, string[]][] = [
  // The name study quotes the Latin spellings of the name on purpose.
  ['messages about.aboutMessages.kr.name.', ['o', 'muomala', 'muamalat']],
  // An English search example: the glossary also matches English names.
  ['messages glossary.glossaryMessages.kr.filter.searchPlaceholder', ['lease']],
]
export const DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?$/i
/** Loanword stems the rules get wrong: Russian spelling keeps ц and ь in these words. */
export const KR_BANNED: [RegExp, string][] = [
  [/тенденс/i, 'тенденция'],
  [/филтр/i, 'фильтр'],
  [/^профил$/i, 'профиль'],
  [/^мебел$/i, 'мебель'],
  [/^сех(?:$|[игдлн])/i, 'цех'],
  [/потенс/i, 'потенциал'],
  [/конференс/i, 'конференция'],
  [/ссенар/i, 'сценарий'],
  [/ксия/i, '-кция (акция, функция)'],
]

/**
 * KR-1 to KR-3 on one Cyrillic string. All are warnings here (§7.2); the
 * script treats them as errors, and an override in `kr.*` is ART-26.
 */
export function checkKr(raw: string, path: string): Finding[] {
  const out: Finding[] = []
  const add = (rule: string, message: string) => out.push({ rule, level: 'warning', path, message })
  // Markup targets stay Latin by design; check only the visible labels.
  // {en:…} marks foreign words that translit copies unchanged, so skip them.
  const s = raw
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\{en:[^}]+\}/g, '')
  if (/[ʻʼ]/.test(s)) add('KR-1', `Kirill matnida ʻ yoki ʼ qolgan: «${(s.match(/\S*[ʻʼ]\S*/) ?? [''])[0]}»`)
  const intended = KR_LATIN_INTENDED.find(([prefix]) => path.startsWith(prefix))?.[1] ?? []
  for (const token of s.split(/\s+/)) {
    const core = token.replace(/^[«“"(\[]+|[»”".,;:!?)\]]+$/g, '')
    if (/^(?:https?:|www\.)|@/.test(core) || DOMAIN.test(core)) continue // URLs, domains, e-mail addresses, @handles
    for (const run of core.match(/[A-Za-z][A-Za-z0-9ʻʼ]*/g) ?? [])
      if (!KR_LATIN_OK.test(run) && !intended.includes(run)) add('KR-2', `Kirill matnida lotin harflaridagi soʻz: «${run}»`)
  }
  for (const word of s.match(/[А-Яа-яЁёЎўҚқҒғҲҳ]+/g) ?? [])
    for (const [re, fix] of KR_BANNED) if (re.test(word)) add('KR-3', `Oʻzlashma soʻz imlosi: «${word}» (→ ${fix})`)
  return out
}

// ── article structure (ART-*) ─────────────────────────────────────────────
/** What checkArticle reads: the mock `Article`, or the CMS view built from a Payload document. */
export interface ArticleCheckView {
  id?: string
  slug?: string | null
  rubric?: string | null
  title?: string | null
  lead?: string | null
  body: ArticleBlock[]
  authors: string[]
  tags: string[]
  sources: Source[]
  terms?: string[]
  publishedAt?: string | null
  updatedAt?: string | null
  image?: { src?: string; width?: number | null; height?: number | null } | null
  interviewee?: Partial<Interviewee> | null
  // CMS only (scope `all`)
  urgent?: boolean | null
  needsLegal?: string | null
  embargo?: { until?: string | null; indefinite?: boolean | null } | null
  meta?: { title?: string | null; description?: string | null } | null
  /** Words in the body (ART-30); computed by the caller from the stored tree. */
  bodyWords?: number
}

export interface ArticleCheckCtx {
  /**
   * `legacy`: exactly the checks the validator script ran before §7 (the mock
   * data passes them). `all`: the full §7.2 set the CMS enforces.
   */
  scope: 'legacy' | 'all'
  now: number
  /** Slugs that exist, for references in the mock data (the CMS has foreign keys). */
  known?: { tags?: ReadonlySet<string>; terms?: ReadonlySet<string>; authors?: ReadonlySet<string> }
  /** Mock only: checks an image reference against the image registry, in the script's order. */
  image?: (src: string | undefined) => Finding[]
  limits?: Partial<Limits> | null
  /** What the save does (CMS): ART-23 (embargo) applies at publish only. */
  gate?: 'draft' | 'submit' | 'approve' | 'publish'
}

/** Characters as an editor counts them (code points, not UTF-16 units). */
const chars = (s: string) => [...s].length

const SEO_TITLE_MAX = 70
const SEO_DESCRIPTION_MAX = 160
const URGENT_MAX_WORDS = 400

/** Block texts as one list, for rules that read every paragraph of the body. */
export function blockTexts(b: ArticleBlock): string[] {
  switch (b.type) {
    case 'p':
    case 'h2':
    case 'h3':
      return [b.text]
    case 'callout':
      return [b.title ?? '', b.text]
    case 'list':
      return b.items
    case 'qa':
      return [b.question, ...b.answer]
    case 'quote':
      return [b.text]
    case 'factbox':
      return [b.title, ...b.items.flatMap((i) => [i.label, i.value]), b.note ?? '']
    default:
      return []
  }
}

/** Words in markup text: tokens of letters or digits, markup characters ignored. */
export function countWords(texts: string[]): number {
  return texts.reduce((n, t) => n + (t.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').match(/[\p{L}\p{N}ʻʼ'-]+/gu) ?? []).length, 0)
}

function checkChart(chart: ChartSpec, path: string, add: (rule: string, level: Level, path: string, message: string) => void, all: boolean) {
  const name = `«${chart.title}» diagrammasi`
  if (chart.kind === 'line') {
    for (const s of chart.series) if (s.values.length !== chart.xLabels.length) add('ART-8', 'error', path, `${name}: «${s.name}» seriyasidagi qiymatlar soni (${s.values.length}) davrlar soniga (${chart.xLabels.length}) teng emas`)
  }
  if (!all) return
  if (!chart.source?.trim()) add('ART-9', 'error', path, `${name}: manba koʻrsatilmagan`)
  if (chart.kind === 'bar') {
    if (chart.data.length < 2) add('ART-10', 'error', path, `${name}: kamida ikkita ustun kerak`)
    const bad = chart.data.filter((d) => typeof d.value !== 'number' || !Number.isFinite(d.value))
    if (bad.length) add('ART-10', 'error', path, `${name}: «${bad.map((d) => d.label).join('», «')}» qiymati raqam emas (oʻzbekcha yozing: 4,5)`)
  } else {
    if (chart.xLabels.length < 2) add('ART-10', 'error', path, `${name}: kamida ikkita davr kerak`)
    if (!chart.series.length) add('ART-10', 'error', path, `${name}: birorta seriya yoʻq; birinchi qatorga «Davr;Seriya A» yozing`)
    for (const s of chart.series) {
      if (s.values.some((v) => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) add('ART-10', 'error', path, `${name}: «${s.name}» seriyasida raqam boʻlmagan qiymat bor (oʻzbekcha yozing: 4,5)`)
    }
  }
}

/**
 * The structural article rules. Paths are relative to the article: `slug`,
 * `sources`, `body[3]`. In the `legacy` scope this is exactly what the
 * validator script checked before §7; `all` adds the CMS rules.
 */
export function checkArticle(a: ArticleCheckView, ctx: ArticleCheckCtx): Finding[] {
  const out: Finding[] = []
  const all = ctx.scope === 'all'
  const add = (rule: string, level: Level, path: string, message: string) => out.push({ rule, level, path, message })
  const limits = { ...DEFAULT_LIMITS, ...Object.fromEntries(Object.entries(ctx.limits ?? {}).filter(([, v]) => typeof v === 'number')) } as Limits

  if (!SLUG_RE.test(a.slug ?? '')) add('ART-1', 'error', 'slug', `Slug faqat kichik lotin harflari, raqamlar va chiziqchadan iborat boʻlsin: «${a.slug ?? ''}»`)
  if (!all) {
    if (!isoTz.test(a.publishedAt ?? '')) add('ART-28', 'error', 'publishedAt', `Chop etilgan sana ISO shaklida +05:00 bilan boʻlsin: «${a.publishedAt ?? ''}»`)
    if (Date.parse(a.publishedAt ?? '') > ctx.now) add('ART-28', 'error', 'publishedAt', 'Chop etilgan sana kelajakda')
    if (a.updatedAt && (!isoTz.test(a.updatedAt) || Date.parse(a.updatedAt) < Date.parse(a.publishedAt ?? '') || Date.parse(a.updatedAt) > ctx.now))
      add('ART-28', 'error', 'updatedAt', `Yangilangan sana notoʻgʻri: «${a.updatedAt}»`)
  } else {
    const soon = ctx.now + 60_000
    for (const [field, v] of [['publishedAt', a.publishedAt], ['updatedAt', a.updatedAt]] as const)
      if (v && Date.parse(v) > soon) add('ART-28', 'error', field, 'Sana kelajakda boʻlishi mumkin emas')
    if (a.publishedAt && a.updatedAt && Date.parse(a.updatedAt) < Date.parse(a.publishedAt)) add('ART-28', 'error', 'updatedAt', 'Muhim yangilanish sanasi chop etilgan sanadan oldin')
  }

  if (all) {
    const title = (a.title ?? '').trim()
    if (!title) add('ART-2', 'error', 'title', 'Oʻzbekcha sarlavha yozilmagan')
    else if (chars(title) > limits.titleMax) add('ART-2', 'error', 'title', `Sarlavha ${chars(title)} belgi: ${limits.titleMax} dan oshmasin`)
    else if (chars(title) > limits.titleWarn) add('ART-2', 'warning', 'title', `Sarlavha ${chars(title)} belgi: ${limits.titleWarn} belgigacha qisqartirish tavsiya etiladi`)
    const lead = (a.lead ?? '').trim()
    if (!lead) add('ART-3', 'error', 'lead', 'Oʻzbekcha lid yozilmagan')
    else if (chars(lead) > limits.leadMax) add('ART-3', 'error', 'lead', `Lid ${chars(lead)} belgi: ${limits.leadMax} dan oshmasin`)
    else if (chars(lead) > limits.leadWarn) add('ART-3', 'warning', 'lead', `Lid ${chars(lead)} belgi: ${limits.leadWarn} belgigacha qisqartirish tavsiya etiladi`)
    if (!a.authors.length) add('ART-4', 'error', 'authors', 'Kamida bitta muallif tanlang')
  }

  const known = ctx.known ?? {}
  for (const t of a.tags) if (known.tags && !known.tags.has(t)) add('ART-19', 'error', 'tags', `Mavzu topilmadi: «${t}»`)
  for (const t of a.terms ?? []) if (known.terms?.size && !known.terms.has(t)) add('ART-19', 'error', 'terms', `Lugʻat atamasi topilmadi: «${t}»`)
  for (const au of a.authors) if (known.authors && !known.authors.has(au)) add('ART-4', 'error', 'authors', `Muallif topilmadi: «${au}»`)
  if (!a.sources.length) add('ART-5', 'error', 'sources', 'Kamida bitta manba kiriting («Manbalar» roʻyxati)')
  if (ctx.image) {
    out.push(...ctx.image(a.image?.src))
    out.push(...ctx.image(a.interviewee?.portrait?.src))
  }

  a.body.forEach((b, i) => {
    const path = `body[${i}]`
    if (b.type === 'figure' && ctx.image) out.push(...ctx.image(b.image.src))
    if (b.type === 'term' && known.terms?.size && !known.terms.has(b.slug)) add('ART-19', 'error', path, `Atama kartochkasi topilmagan atamaga olib boradi: «${b.slug}»`)
    if (b.type === 'table') {
      b.rows.forEach((r, k) => {
        if (r.length !== b.columns.length) add('ART-8', 'error', path, `«${b.caption}» jadvalining ${k + 1}-qatorida ${r.length} ta katak, ustunlar esa ${b.columns.length} ta`)
      })
      if (all && !b.source?.trim()) add('ART-9', 'error', path, `«${b.caption}» jadvalida manba koʻrsatilmagan`)
    }
    if (b.type === 'chart') checkChart(b.chart, path, add, all)
    const texts = b.type === 'p' || b.type === 'callout' ? [b.text] : b.type === 'list' ? b.items : b.type === 'qa' ? b.answer : []
    for (const t of texts)
      for (const m of t.matchAll(/\[\[([^|\]]+)\|/g)) if (known.terms?.size && !known.terms.has(m[1])) add('ART-19', 'error', path, `Lugʻat havolasi topilmagan atamaga olib boradi: «${m[1]}»`)
  })

  if (a.rubric === 'intervyu' && (!a.interviewee?.name || !a.body.some((b) => b.type === 'qa')))
    add('ART-6', 'error', a.interviewee?.name ? 'body' : 'interviewee', '«Intervyu» rubrikasida suhbatdosh va kamida bitta «Savol-javob» bloki boʻlishi shart')
  if (a.rubric === 'tahlil' && !a.body.some((b) => b.type === 'table' || b.type === 'chart'))
    add('ART-7', 'warning', 'body', '«Tahlil» maqolasida jadval yoki diagramma yoʻq: raqamlarni jadval yoki diagrammada koʻrsatish tavsiya etiladi')

  if (!all) return out

  if (!a.image) add('ART-16', 'warning', 'image', 'Asosiy rasm tanlanmagan: ulashishda va roʻyxatlarda rasm koʻrinmaydi')
  else {
    const w = a.image.width ?? 0
    const h = a.image.height ?? 0
    if (w && h) {
      if (w * h < 50_000) add('ART-16', 'warning', 'image', `Asosiy rasm juda kichik (${w}×${h}): kamida 50 000 piksel kerak`)
      const r = w / h
      if (![16 / 9, 4 / 3, 1].some((x) => Math.abs(r - x) / x < 0.02)) add('ART-16', 'warning', 'image', `Asosiy rasm nisbati ${w}×${h}: qidiruv tizimlari 16:9, 4:3 yoki 1:1 ni afzal koʻradi`)
    }
  }
  if (!a.tags.length) add('ART-17', 'warning', 'tags', 'Birorta mavzu tanlanmagan')
  const seoTitle = a.meta?.title?.trim() ?? ''
  const seoDescription = a.meta?.description?.trim() ?? ''
  if (!seoTitle) add('ART-18', 'warning', 'meta.title', 'SEO sarlavha boʻsh: oʻrniga maqola sarlavhasi ishlatiladi')
  else if (chars(seoTitle) > SEO_TITLE_MAX) add('ART-18', 'warning', 'meta.title', `SEO sarlavha ${chars(seoTitle)} belgi: ${SEO_TITLE_MAX} dan oshmasin`)
  if (!seoDescription) add('ART-18', 'warning', 'meta.description', 'SEO tavsif boʻsh: oʻrniga lid ishlatiladi')
  else if (chars(seoDescription) > SEO_DESCRIPTION_MAX) add('ART-18', 'warning', 'meta.description', `SEO tavsif ${chars(seoDescription)} belgi: ${SEO_DESCRIPTION_MAX} dan oshmasin`)

  if (ctx.gate === 'publish') {
    const until = a.embargo?.until ? Date.parse(a.embargo.until) : NaN
    if (a.embargo?.indefinite || until > ctx.now) add('ART-23', 'error', 'embargo', 'Embargo amalda: embargo tugaguncha maqola chop etilmaydi')
  }
  if (a.needsLegal === 'required') add('ART-24', 'error', 'needsLegal', 'Yuridik koʻrik talab qilingan: bosh muharrir koʻrib chiqib, «Bajarildi» deb belgilashi kerak')
  const words = a.bodyWords ?? countWords(a.body.flatMap(blockTexts))
  if (a.urgent && words > URGENT_MAX_WORDS) add('ART-30', 'error', 'body', `Shoshilinch maqola ${words} soʻz: tezkor yoʻl faqat ${URGENT_MAX_WORDS} soʻzgacha boʻlgan xabar uchun`)
  return out
}

// ── images (ART-13 to ART-16) ─────────────────────────────────────────────
/** A media document reduced to what the rights checks read (uz values for localized fields). */
export interface MediaCheckView {
  id?: string | number
  filename?: string | null
  alt?: string | null
  decorative?: boolean | null
  credit?: string | null
  rightsCategory?: string | null
  licenceUrl?: string | null
  usableUntil?: string | null
  sponsoredOnly?: boolean | null
}

/**
 * Alt text, credit and rights of one image used by a story. `label` names
 * the use ("Asosiy rasm", "4-xatboshidagi rasm") for the message.
 */
export function checkMedia(m: MediaCheckView, path: string, ctx: { now: number; sponsoredStory: boolean; label: string }): Finding[] {
  const out: Finding[] = []
  const name = `${ctx.label}${m.filename ? ` (${m.filename})` : ''}`
  const add = (rule: string, message: string) => out.push({ rule, level: 'error', path, message: `${name}: ${message}` })
  if (!m.decorative && !m.alt?.trim()) add('ART-13', 'oʻzbekcha muqobil matn (alt) yozilmagan; rasm bezak uchun boʻlsa, «Bezak uchun» belgisini qoʻying')
  if (!m.credit?.trim()) add('ART-14', 'oʻzbekcha muallif / manba yozilmagan, masalan «Foto: Muomalat»')
  if (!m.rightsCategory || m.rightsCategory === 'unknown') add('ART-14', 'huquq toifasi «Nomaʼlum»: rasmdan foydalanish huquqini aniqlang')
  if (m.rightsCategory === 'creative_commons' && !m.licenceUrl?.trim()) add('ART-14', 'Creative Commons rasmi uchun litsenziya havolasi kerak')
  if (m.usableUntil && Date.parse(m.usableUntil) < ctx.now) add('ART-14', `foydalanish muddati tugagan (${m.usableUntil.slice(0, 10)})`)
  if (m.sponsoredOnly && !ctx.sponsoredStory) add('ART-15', 'faqat homiylik materiallari uchun yuklangan rasm tahririyat maqolasida ishlatilmaydi')
  return out
}

/** ART-29: Telegram counts the caption after entity parsing; JS length (UTF-16 units) is the conservative bound (§10.2). */
export function telegramCaptionLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').length
}
