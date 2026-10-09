/**
 * Content validator: run with `npm run validate`.
 * Checks Uzbek orthography (ʻ U+02BB / ʼ U+02BC), banned religious material,
 * real institution names, referential integrity and dates in the content
 * data, the Uzbek interface strings (src/i18n/messages/*), the image library
 * and site constants; then checks the generated Cyrillic (/kr) output.
 *
 * The rules live in src/content/rules.ts, shared with the CMS validation
 * concern (CMS-SPEC §7.1). This file only walks the mock data and prints.
 *
 * Optional scope argument: articles | glossary | market | club | messages | kr
 *
 * TODO(§7.1): `--source=payload` reads published content through the
 * Payload content adapter (wave 3) and runs the `all` rule scope; the worker
 * then runs it nightly and posts a summary to the editor-in-chief.
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
} from '../src/content/adapters/mock'
import { ARABIC, checkArticle, checkKr, checkText, isoTz, KR_SKIP, type Finding } from '../src/content/rules'
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
/** Findings from rules.ts, each printed as `<prefix>: <message>`. */
const report = (prefix: string, findings: Finding[]) => {
  for (const f of findings) (f.level === 'error' ? err : warn)(`${prefix}: ${f.message}${f.excerpt ? ` — «${f.excerpt}»` : ''}`)
}

const articles = [...yangiliklar, ...tahlil, ...intervyu, ...izoh, ...dunyo]
const only = process.argv.slice(2).find((a) => !a.startsWith('--')) // optional: articles | glossary | market | club

// ── string walkers ────────────────────────────────────────────────────────
function walk(value: unknown, path: string, visit: (s: string, p: string) => void, skip = new Set(['translations', 'labels', 'aliases', 'src', 'url', 'slug', 'id'])) {
  if (typeof value === 'string') return visit(value, path)
  if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`, visit, skip))
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!skip.has(k)) walk(v, `${path}.${k}`, visit, skip)
  }
}

/** The mock site is a demo: every real organisation name warns (TXT-5). */
function textChecks(label: string, obj: unknown) {
  walk(obj, label, (s, p) => report(p, checkText(s, p, { demoMode: true })))
}

const tagSlugs = new Set(tags.map((t) => t.slug))
const termSlugs = new Set(glossary.map((t) => t.slug))
const authorSlugs = new Set(authors.map((a) => a.slug))
const imageSrcs = new Set(Object.values(images).map((i) => i.src))
const ids = new Set<string>()
const slugs = new Set<string>()

/** Mock images come from the image registry and are generated into public/. */
function checkImage(src?: string): Finding[] {
  if (!src) return []
  if (!imageSrcs.has(src)) return [{ rule: 'IMG', level: 'error', path: 'image', message: `${src} rasmi rasm roʻyxatida yoʻq` }]
  if (!existsSync(join(process.cwd(), 'public', src))) return [{ rule: 'IMG', level: 'warning', path: 'image', message: `public${src} fayli hali yaratilmagan (npm run images)` }]
  return []
}

if (!only || only === 'articles') {
  for (const a of articles) {
    const p = `article ${a.id}`
    if (ids.has(a.id)) err(`${p}: takroriy ID`)
    ids.add(a.id)
    const key = `${a.rubric}/${a.slug}`
    if (slugs.has(key)) err(`${p}: takroriy slug ${key}`)
    slugs.add(key)
    report(p, checkArticle(a, { scope: 'legacy', now: NOW, known: { tags: tagSlugs, terms: termSlugs, authors: authorSlugs }, image: checkImage }))
    textChecks(p, a)
  }
  for (const a of articles) for (const r of a.related ?? []) if (!ids.has(r)) err(`article ${a.id}: aloqador maqola ${r} topilmadi`)
}

if (!only || only === 'glossary') {
  const seen = new Set<string>()
  for (const t of glossary) {
    const p = `term ${t.slug}`
    if (seen.has(t.slug)) err(`${p}: takroriy atama`)
    seen.add(t.slug)
    for (const r of t.related) if (!termSlugs.has(r)) err(`${p}: aloqador atama ${r} topilmadi`)
    for (const s of [...t.definition, t.origin, ...t.practice, t.example?.text ?? ''])
      for (const m of s.matchAll(/\[\[([^|\]]+)\|/g)) if (!termSlugs.has(m[1])) err(`${p}: lugʻat havolasi topilmagan atamaga olib boradi: ${m[1]}`)
    if (ARABIC.test(JSON.stringify(t))) err(`${p}: arab yozuvi ishlatilgan: lotin transliteratsiyasidan foydalaning`)
    textChecks(p, t)
  }
}

if (!only || only === 'market') {
  for (const i of institutions) {
    const p = `institution ${i.id}`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.statusDate) || Date.parse(i.statusDate) > NOW) err(`${p}: holat sanasi YYYY-MM-DD shaklida va kelajakda emas boʻlsin`)
    if (i.type === 'window' && !i.parent) err(`${p}: islom oynasi uchun bosh bank kerak`)
    if (i.articleId && ids.size && !ids.has(i.articleId)) err(`${p}: maqola ${i.articleId} topilmadi`)
    textChecks(p, i)
  }
  for (const m of milestones) {
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(m.date)) err(`milestone ${m.title}: sana notoʻgʻri`)
    if (m.articleId && ids.size && !ids.has(m.articleId)) err(`milestone ${m.title}: maqola topilmadi`)
    textChecks(`milestone ${m.date}`, m)
  }
}

if (!only || only === 'club') {
  for (const e of clubEvents) {
    const p = `event ${e.slug}`
    if (!isoTz.test(e.startsAt) || !isoTz.test(e.endsAt)) err(`${p}: boshlanish va tugash vaqti ISO shaklida +05:00 bilan boʻlsin`)
    const future = Date.parse(e.startsAt) > NOW
    if ((e.status === 'upcoming') !== future) err(`${p}: «${e.status}» holati sanaga mos emas`)
    report(p, checkImage(e.image?.src))
    for (const s of e.speakers) report(p, checkImage(s.portrait?.src))
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
  if (f.endsWith('.ts') && !(f.slice(0, -3) in MESSAGE_MODULES)) err(`src/i18n/messages/${f}: tekshirilmaydi — uni scripts/validate-content.ts ga import qiling`)

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
// The /kr pages are transliterated from Uzbek Latin (src/i18n/translit.ts);
// checkKr runs on that output. Repeats of one issue are counted, and every
// issue is an error here (the CMS shows them as warnings, §7.2).

const krFindings = new Map<string, { path: string; count: number }>()
function krChecks(label: string, obj: unknown) {
  walk(
    obj,
    label,
    (raw, p) => {
      for (const f of checkKr(raw, p)) {
        const seen = krFindings.get(f.message)
        if (seen) seen.count++
        else krFindings.set(f.message, { path: p, count: 1 })
      }
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
