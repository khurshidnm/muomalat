/**
 * Content validator: run with `npm run validate`.
 * Checks Uzbek orthography (ʻ U+02BB / ʼ U+02BC), banned religious material,
 * real institution names, referential integrity and dates in the content
 * data, the Uzbek interface strings (src/i18n/messages/*), the image library
 * and site constants; then checks the generated Cyrillic (/kr) output.
 *
 * Optional scope argument: articles | glossary | market | club | messages | kr
 */
import { yangiliklar } from '../src/content/data/articles/yangiliklar'
import { tahlil } from '../src/content/data/articles/tahlil'
import { intervyu } from '../src/content/data/articles/intervyu'
import { izoh } from '../src/content/data/articles/izoh'
import { dunyo } from '../src/content/data/articles/dunyo'
import { glossary } from '../src/content/data/glossary'
import { institutions } from '../src/content/data/institutions'
import { milestones } from '../src/content/data/milestones'
import { clubEvents } from '../src/content/data/club'
import { tags } from '../src/content/data/tags'
import { authors } from '../src/content/data/authors'
import { images } from '../src/content/data/images'
import { site } from '../src/content/data/site'
import { rubrics } from '../src/content/data/rubrics'
import {
  getArticles,
  getAuthors,
  getClubEvents,
  getGlossary,
  getInstitutions,
  getMilestones,
  getRubrics,
  getTags,
} from '../src/content'
import { pick, type MessageSet, type MessageTree } from '../src/i18n/messages'
import { deepCyrillic } from '../src/i18n/translit'
import * as aboutModule from '../src/i18n/messages/about'
import * as advertiseModule from '../src/i18n/messages/advertise'
import * as articleModule from '../src/i18n/messages/article'
import * as clubModule from '../src/i18n/messages/club'
import * as commonModule from '../src/i18n/messages/common'
import * as contactModule from '../src/i18n/messages/contact'
import * as digestModule from '../src/i18n/messages/digest'
import * as formsModule from '../src/i18n/messages/forms'
import * as glossaryModule from '../src/i18n/messages/glossary'
import * as homeModule from '../src/i18n/messages/home'
import * as listingModule from '../src/i18n/messages/listing'
import * as marketModule from '../src/i18n/messages/market'
import * as searchModule from '../src/i18n/messages/search'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const NOW = Date.parse('2026-10-08T16:00:00+05:00')
const errors: string[] = []
const warnings: string[] = []
const err = (m: string) => errors.push(m)
const warn = (m: string) => warnings.push(m)

const articles = [...yangiliklar, ...tahlil, ...intervyu, ...izoh, ...dunyo]
const only = process.argv[2] // optional: articles | glossary | market | club

// ── string walkers ────────────────────────────────────────────────────────
function walk(value: unknown, path: string, visit: (s: string, p: string) => void, skip = new Set(['translations', 'labels', 'aliases', 'src', 'url', 'slug', 'id'])) {
  if (typeof value === 'string') return visit(value, path)
  if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`, visit, skip))
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!skip.has(k)) walk(v, `${path}.${k}`, visit, skip)
  }
}

const BAD_OKINA = /[oOgG]['‘’`ʼʽ]/ // o' g' with wrong mark
const BAD_TUTUQ = /[A-Za-z]['\u2019`](?=[A-Za-z])|[A-FH-NP-Za-fh-np-z]\u02BB(?=[A-Za-z])/ // apostrophe used as tutuq (should be ʼ U+02BC)
const BANNED = [/qurʼ?on/i, /qur'on/i, /\boyat/i, /\bhadis/i, /\bsura\b/i, /paygʻambar/i, /\balloh/i, /\bmasjid/i, /\bnamoz/i, /\bduo\b/i, /\bimom\b/i]
const REVIEW = [/fatvo/i, /\bharom\b/i, /\bhalol\b/i, /\bjoiz\b/i]
/** The editorial disclaimer ("we issue no fatvo") names the word to deny it: not a ruling. */
const DISCLAIMER = /(chiqarmay|chiqarilmay|bermay|bermaydi)/i
/** Common words that start like an organisation name (alifbo = alphabet). */
const ORG_FALSE_FRIENDS: Record<string, RegExp> = { alif: /(^|[^a-zʻ])alifbo/gi }
const REAL_ORGS = [
  'hamkorbank', 'ipoteka', 'kapitalbank', 'asaka', 'agrobank', 'orient finans', 'davr bank', 'turonbank', 'turon bank', 'trastbank', 'ravnaq',
  'universal bank', 'madad', 'tenge', 'kdb', 'ziraat', 'anorbank', 'anor bank', 'garant bank', 'tbc', 'uzum', 'hayot bank', 'saderat', 'poytaxt bank',
  'apex bank', 'octobank', 'smartbank', 'yangi bank', 'asia alliance', 'infinbank', 'aloqabank', 'mikrokreditbank', 'xalq banki', 'milliy bank', 'nbu',
  'sqb', 'sanoatqurilish', 'qishloq qurilish', 'alif', 'alfa-bank', 'ipak yoʻli', 'hi-tech bank', 'markaziy bank', 'al rajhi', 'dubai islamic',
  'maybank', 'cimb', 'kuwait finance', 'kfh', 'islom taraqqiyot banki', 'islamic development bank', 'isdb', 'ifc', 'osiyo taraqqiyot', 'jahon banki',
  'world bank', 'xvf', 'imf', 'moody', 'fitch', 's&p', 'lseg', 'refinitiv', 'bloomberg', 'reuters', 'nasdaq', 'toshkent fond birjasi', 'uzse',
]

function textChecks(label: string, obj: unknown) {
  walk(obj, label, (s, p) => {
    if (BAD_OKINA.test(s)) err(`${p}: use ʻ (U+02BB) in oʻ/gʻ → "${s.match(BAD_OKINA)?.[0]}" in "${s.slice(0, 80)}"`)
    if (BAD_TUTUQ.test(s) && !/https?:/.test(s)) warn(`${p}: apostrophe between letters — tutuq should be ʼ (U+02BC): "${s.slice(0, 80)}"`)
    for (const re of BANNED) if (re.test(s)) err(`${p}: banned religious term ${re} in "${s.slice(0, 100)}"`)
    for (const re of REVIEW) if (re.test(s) && !DISCLAIMER.test(s)) warn(`${p}: review wording ${re} (no rulings): "${s.slice(0, 100)}"`)
    const low = s.toLowerCase()
    for (const name of REAL_ORGS) if (new RegExp(`(^|[^a-zʻ])${name.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}`, 'i').test(low.replace(ORG_FALSE_FRIENDS[name] ?? /$^/, ' '))) warn(`${p}: mentions real organisation "${name}": "${s.slice(0, 100)}"`)
    if (/\s{2,}/.test(s.trim())) warn(`${p}: double space`)
    if (/ ,|\s\./.test(s) && !/\d \./.test(s)) warn(`${p}: space before punctuation: "${s.slice(0, 60)}"`)
    if (/"/.test(s)) warn(`${p}: straight double quote — use «guillemets»: "${s.slice(0, 60)}"`)
    // Months: standard Uzbek Latin spelling and the hyphenated day form (8-oktabr).
    if (/\b(oktyabr|sentyabr|noyabr[ʼ']|yanvar[ʼ']|fevral[ʼ']|aprel[ʼ']|iyun[ʼ']|iyul[ʼ'])/i.test(s)) err(`${p}: month spelling — use sentabr/oktabr: "${s.slice(0, 80)}"`)
    if (/\b\d{4} yil/.test(s)) warn(`${p}: year needs a hyphen (2026-yil): "${s.slice(0, 60)}"`)
    if (/\b\d{1,2} (yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr)/i.test(s)) warn(`${p}: date needs a hyphen (8-oktabr): "${(s.match(/\b\d{1,2} \w+/) ?? [''])[0]}"`)
  })
}

const tagSlugs = new Set(tags.map((t) => t.slug))
const termSlugs = new Set(glossary.map((t) => t.slug))
const authorSlugs = new Set(authors.map((a) => a.slug))
const imageSrcs = new Set(Object.values(images).map((i) => i.src))
const ids = new Set<string>()
const slugs = new Set<string>()

function checkImage(p: string, src?: string) {
  if (!src) return
  if (!imageSrcs.has(src)) err(`${p}: image ${src} is not in the image registry`)
  else if (!existsSync(join(process.cwd(), 'public', src))) warn(`${p}: image file public${src} not generated yet`)
}

const isoTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+05:00$/

if (!only || only === 'articles') {
  for (const a of articles) {
    const p = `article ${a.id}`
    if (ids.has(a.id)) err(`${p}: duplicate id`)
    ids.add(a.id)
    const key = `${a.rubric}/${a.slug}`
    if (slugs.has(key)) err(`${p}: duplicate slug ${key}`)
    slugs.add(key)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) err(`${p}: slug must be lower-case ascii with hyphens: ${a.slug}`)
    if (!isoTz.test(a.publishedAt)) err(`${p}: publishedAt must be ISO with +05:00: ${a.publishedAt}`)
    if (Date.parse(a.publishedAt) > NOW) err(`${p}: publishedAt is in the future`)
    if (a.updatedAt && (!isoTz.test(a.updatedAt) || Date.parse(a.updatedAt) < Date.parse(a.publishedAt) || Date.parse(a.updatedAt) > NOW)) err(`${p}: bad updatedAt`)
    for (const t of a.tags) if (!tagSlugs.has(t)) err(`${p}: unknown tag ${t}`)
    for (const t of a.terms ?? []) if (termSlugs.size && !termSlugs.has(t)) err(`${p}: unknown glossary term ${t}`)
    for (const au of a.authors) if (!authorSlugs.has(au)) err(`${p}: unknown author ${au}`)
    if (!a.sources.length) err(`${p}: needs at least one source (Manbalar)`)
    checkImage(p, a.image?.src)
    checkImage(p, a.interviewee?.portrait?.src)
    for (const b of a.body) {
      if (b.type === 'figure') checkImage(p, b.image.src)
      if (b.type === 'term' && termSlugs.size && !termSlugs.has(b.slug)) err(`${p}: term block unknown slug ${b.slug}`)
      if (b.type === 'table') for (const r of b.rows) if (r.length !== b.columns.length) err(`${p}: table "${b.caption}" row length ${r.length} ≠ ${b.columns.length} columns`)
      if (b.type === 'chart' && b.chart.kind === 'line') for (const s of b.chart.series) if (s.values.length !== b.chart.xLabels.length) err(`${p}: line chart series "${s.name}" length mismatch`)
      const texts = b.type === 'p' || b.type === 'callout' ? [b.text] : b.type === 'list' ? b.items : b.type === 'qa' ? b.answer : []
      for (const t of texts) for (const m of t.matchAll(/\[\[([^|\]]+)\|/g)) if (termSlugs.size && !termSlugs.has(m[1])) err(`${p}: inline glossary link to unknown term ${m[1]}`)
    }
    if (a.rubric === 'intervyu' && (!a.interviewee || !a.body.some((b) => b.type === 'qa'))) err(`${p}: interviews need interviewee and qa blocks`)
    if (a.rubric === 'tahlil' && !a.body.some((b) => b.type === 'table' || b.type === 'chart')) warn(`${p}: analysis without table or chart`)
    textChecks(p, a)
  }
  for (const a of articles) for (const r of a.related ?? []) if (!ids.has(r)) err(`article ${a.id}: related id ${r} does not exist`)
}

if (!only || only === 'glossary') {
  const seen = new Set<string>()
  for (const t of glossary) {
    const p = `term ${t.slug}`
    if (seen.has(t.slug)) err(`${p}: duplicate`)
    seen.add(t.slug)
    for (const r of t.related) if (!termSlugs.has(r)) err(`${p}: related term ${r} does not exist`)
    for (const s of [...t.definition, t.origin, ...t.practice, t.example?.text ?? ''])
      for (const m of s.matchAll(/\[\[([^|\]]+)\|/g)) if (!termSlugs.has(m[1])) err(`${p}: inline link to unknown term ${m[1]}`)
    if (/[؀-ۿ]/.test(JSON.stringify(t))) err(`${p}: no Arabic script — use Latin transliteration`)
    textChecks(p, t)
  }
}

if (!only || only === 'market') {
  for (const i of institutions) {
    const p = `institution ${i.id}`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.statusDate) || Date.parse(i.statusDate) > NOW) err(`${p}: statusDate must be YYYY-MM-DD and not in the future`)
    if (i.type === 'window' && !i.parent) err(`${p}: Islamic window needs a parent`)
    if (i.articleId && ids.size && !ids.has(i.articleId)) err(`${p}: articleId ${i.articleId} does not exist`)
    textChecks(p, i)
  }
  for (const m of milestones) {
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(m.date)) err(`milestone ${m.title}: bad date`)
    if (m.articleId && ids.size && !ids.has(m.articleId)) err(`milestone ${m.title}: articleId does not exist`)
    textChecks(`milestone ${m.date}`, m)
  }
}

if (!only || only === 'club') {
  for (const e of clubEvents) {
    const p = `event ${e.slug}`
    if (!isoTz.test(e.startsAt) || !isoTz.test(e.endsAt)) err(`${p}: startsAt/endsAt must be ISO with +05:00`)
    const future = Date.parse(e.startsAt) > NOW
    if ((e.status === 'upcoming') !== future) err(`${p}: status ${e.status} does not match date`)
    checkImage(p, e.image?.src)
    for (const s of e.speakers) checkImage(p, s.portrait?.src)
    textChecks(p, e)
  }
}

// ── interface strings, image library, site constants (Uzbek Latin) ────────
const MESSAGE_MODULES: Record<string, Record<string, unknown>> = {
  about: aboutModule,
  advertise: advertiseModule,
  article: articleModule,
  club: clubModule,
  common: commonModule,
  contact: contactModule,
  digest: digestModule,
  forms: formsModule,
  glossary: glossaryModule,
  home: homeModule,
  listing: listingModule,
  market: marketModule,
  search: searchModule,
}

function isMessageSet(value: unknown): value is MessageSet<MessageTree> {
  return !!value && typeof value === 'object' && 'uz' in value && 'ru' in value && 'en' in value
}

const messageSets: [string, MessageSet<MessageTree>][] = []
for (const [file, mod] of Object.entries(MESSAGE_MODULES))
  for (const [name, value] of Object.entries(mod)) if (isMessageSet(value)) messageSets.push([`${file}.${name}`, value])

// Every message file must be imported above, so a new one cannot skip the checks.
for (const f of readdirSync(join(process.cwd(), 'src/i18n/messages')))
  if (f.endsWith('.ts') && !(f.slice(0, -3) in MESSAGE_MODULES)) err(`src/i18n/messages/${f}: not covered — import it in scripts/validate-content.ts`)

/** Arguments tried on message functions: counts first, then a word in the edition's script. */
const sampleArgs = (script: 'latin' | 'cyrillic'): unknown[][] => {
  const word = script === 'latin' ? 'Namuna' : 'Намуна'
  return [
    [3, 3, 3],
    [word, word, word],
  ]
}

/** A message tree as plain strings: each function is called with sample arguments. */
function resolveMessages(value: unknown, script: 'latin' | 'cyrillic' = 'latin'): unknown {
  if (typeof value === 'function') {
    for (const args of sampleArgs(script)) {
      try {
        const out = (value as (...a: unknown[]) => unknown)(...args)
        if (typeof out === 'string') return out
      } catch {
        // wrong argument shape: try the next one
      }
    }
    return undefined
  }
  if (Array.isArray(value)) return value.map((v) => resolveMessages(v, script))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveMessages(v, script)]))
  return value
}

if (!only || only === 'messages') {
  for (const [name, set] of messageSets) textChecks(`messages ${name}.uz`, resolveMessages(pick(set, 'uz')))
  textChecks('images', images)
  textChecks('site', site)
  textChecks('tags', tags)
  textChecks('authors', authors)
  textChecks('rubrics', rubrics)
}

// ── Cyrillic edition (/kr) ────────────────────────────────────────────────
// The /kr pages are transliterated from Uzbek Latin (src/i18n/translit.ts).
// These checks run on that output, so transliteration slips show up here.

/** Keys whose values are identifiers or other-language text, not Cyrillic prose. */
const KR_SKIP = new Set([
  'translations', 'labels', 'aliases', 'id', 'slug', 'rubric', 'src', 'url', 'href', 'email', 'telegram', 'contentLang',
  'publishedAt', 'updatedAt', 'date', 'startsAt', 'endsAt', 'statusDate', 'type', 'status', 'kind', 'category', 'authors',
  'tags', 'terms', 'related', 'articleId', 'align', 'format', 'orientation',
])
/** Latin runs allowed in Cyrillic text: the brand, acronyms (AAOIFI, SMS), placeholder letters (Tijorat banki E). */
const KR_LATIN_OK = /^(?:Muomalat[a-zʻʼ]*|[A-Z][A-Z0-9]+|[A-Z])$/
/** Latin kept on purpose by a `kr` override, by path prefix. */
const KR_LATIN_INTENDED: [string, string[]][] = [
  // The name study quotes the Latin spellings of the name on purpose.
  ['messages about.aboutMessages.kr.name.', ['o', 'muomala', 'muamalat']],
  // An English search example: the glossary also matches English names.
  ['messages glossary.glossaryMessages.kr.filter.searchPlaceholder', ['lease']],
]
const DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?$/i
/** Loanword stems the rules get wrong: Russian spelling keeps ц and ь in these words. */
const KR_BANNED: [RegExp, string][] = [
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

const krFindings = new Map<string, { path: string; count: number }>()
function krFinding(key: string, path: string) {
  const f = krFindings.get(key)
  if (f) f.count++
  else krFindings.set(key, { path, count: 1 })
}

function krChecks(label: string, obj: unknown) {
  walk(
    obj,
    label,
    (raw, p) => {
      // Markup targets stay Latin by design; check only the visible labels.
      // {en:…} marks foreign words that translit copies unchanged, so skip them.
      const s = raw
        .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\{en:[^}]+\}/g, '')
      if (/[ʻʼ]/.test(s)) krFinding(`ʻ/ʼ left in Cyrillic: "${(s.match(/\S*[ʻʼ]\S*/) ?? [''])[0]}"`, p)
      const intended = KR_LATIN_INTENDED.find(([prefix]) => p.startsWith(prefix))?.[1] ?? []
      for (const token of s.split(/\s+/)) {
        const core = token.replace(/^[«“"(\[]+|[»”".,;:!?)\]]+$/g, '')
        if (/^(?:https?:|www\.)|@/.test(core) || DOMAIN.test(core)) continue // URLs, domains, e-mail addresses, @handles
        for (const run of core.match(/[A-Za-z][A-Za-z0-9ʻʼ]*/g) ?? [])
          if (!KR_LATIN_OK.test(run) && !intended.includes(run)) krFinding(`Latin word in Cyrillic text: "${run}"`, p)
      }
      for (const word of s.match(/[А-Яа-яЁёЎўҚқҒғҲҳ]+/g) ?? [])
        for (const [re, fix] of KR_BANNED) if (re.test(word)) krFinding(`loanword spelling "${word}" (→ ${fix})`, p)
    },
    KR_SKIP,
  )
}

if (!only || only === 'kr') {
  for (const [name, set] of messageSets) krChecks(`messages ${name}.kr`, resolveMessages(pick(set, 'kr'), 'cyrillic'))
  krChecks('kr articles', getArticles('kr'))
  krChecks('kr glossary', getGlossary('kr'))
  krChecks('kr institutions', getInstitutions('kr'))
  krChecks('kr milestones', getMilestones('kr'))
  krChecks('kr club', getClubEvents('kr'))
  krChecks('kr tags', getTags('kr'))
  krChecks('kr authors', getAuthors('kr'))
  krChecks('kr rubrics', getRubrics('kr'))
  krChecks('kr images', deepCyrillic(images))
  krChecks('kr site', deepCyrillic(site))
  for (const [issue, { path, count }] of krFindings) err(`${path}: ${issue}${count > 1 ? ` (${count}×)` : ''}`)
}

for (const w of warnings) console.log('warn ', w)
for (const e of errors) console.log('ERROR', e)
console.log(`\n${articles.length} articles · ${glossary.length} terms · ${institutions.length} institutions · ${milestones.length} milestones · ${clubEvents.length} club events`)
console.log(`${errors.length} errors, ${warnings.length} warnings`)
process.exit(errors.length ? 1 : 0)
