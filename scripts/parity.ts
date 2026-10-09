/**
 * Parity check (CMS-SPEC §11.4): does the site show the same content from
 * the CMS as from the mock data?
 *
 *   npm run parity                       data, then views when both adapters exist
 *   npm run parity -- --data-only        only the import round trip
 *   npm run parity -- --only=getArticle,search --locale=ru --verbose
 *   npm run parity -- --production       `views` is not compared (§11.4)
 *
 * 1. Data: every published record read back through the Local API as the
 *    public site reads it (src/payload/import/readback.ts) against the mock
 *    data: rubrics, tags, authors, glossary, institutions, milestones, club,
 *    articles.
 * 2. Views: for every content function that src/content/adapters/mock.ts and
 *    src/content/adapters/payload.ts both export, in uz, kr, ru and en, the
 *    two results deep-compared. Payload ids are mapped to `legacyId`, Media
 *    URLs to the library files they were made from, and image sizes are
 *    compared as a ratio; fields only the CMS has (§3.17) may be added.
 *    Everything else must match, list views included: components read the
 *    body of list items too (InterviewFeature's pull quote, search excerpts).
 *
 * Exit code 1 on any difference. Run it against a database the importer has
 * filled (npm run seed:dev, or scripts/test-db.sh + the importer); it only reads.
 */
// First: Next's request storage needs AsyncLocalStorage before any next/* module loads (the Payload config loads one).
import { installIncrementalCache } from '../src/payload/import/next-shim'

import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config'
import { compare, type CompareOptions, type Difference, formatDifference } from '../src/payload/import/compare'
import { dataParity, mediaSrcResolver, ok, type Section } from '../src/payload/import/parity'
import { readBack } from '../src/payload/import/readback'
import { mock, MOCK_NOW } from '../src/payload/import/source'
import { toCyrillic } from '../src/i18n/translit'

const { values } = parseArgs({
  options: {
    'data-only': { type: 'boolean', default: false },
    only: { type: 'string' },
    locale: { type: 'string' },
    production: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
  },
})

const LOCALES = ((values.locale?.split(',') ?? ['uz', 'kr', 'ru', 'en']) as Locale[]).filter((l) => ['uz', 'kr', 'ru', 'en'].includes(l))
type Locale = 'uz' | 'kr' | 'ru' | 'en'
const ONLY = values.only ? new Set(values.only.split(',')) : undefined
const SHOW = values.verbose ? 20 : 3

/** Twenty fixed queries (§11.4): eighteen Uzbek ones across the corpus, one Russian and one English one for the translated story (kr gets the Cyrillic of each). */
const QUERIES = [
  'murobaha', 'ijora', 'sukuk', 'takaful', 'islom oynasi', 'litsenziya', 'Tijorat banki E', 'AAOIFI', 'lizing', 'shariat kengashi',
  'mikromoliya', 'Toshkent', 'Andijon', 'uy-joy', 'kafolat', 'muzoraba', 'eksport', 'investitsiya hisobvaragʻi', 'лицензию', 'Islamic window',
]

const resolveSrc = mediaSrcResolver()
const compareOptions: CompareOptions = {
  sameSrc: (m, c) => m === c || resolveSrc(c) === m,
  ignore: values.production ? new Set(['views']) : undefined,
  limit: 200,
}

function printSection(s: Section, width = 22) {
  const status = ok(s) ? 'ok' : `${s.differences.length} differ`
  console.log(`  ${s.name.padEnd(width)} ${String(s.checked).padStart(4)}  ${status}`)
  for (const n of s.notes) console.log(`      note: ${n}`)
  for (const d of s.differences.slice(0, SHOW)) {
    console.log(`    ${d.key}`)
    for (const x of d.differences.slice(0, SHOW)) console.log(`      ${formatDifference(x)}`)
    if (d.differences.length > SHOW) console.log(`      … ${d.differences.length - SHOW} more`)
  }
  if (s.differences.length > SHOW) console.log(`    … ${s.differences.length - SHOW} more`)
}

// ── views ───────────────────────────────────────────────────────────────────
type Adapter = Record<string, unknown>
type Side = {
  name: 'mock' | 'cms'
  mod: Adapter
  /** The id this side uses for a mock article id. */
  articleId(legacy: string): string
}

async function call(side: Side, fn: string, args: unknown[]): Promise<{ value?: unknown; error?: string }> {
  const f = side.mod[fn]
  if (typeof f !== 'function') return { error: `${fn} is not exported` }
  try {
    return { value: await (f as (...a: unknown[]) => unknown)(...args) }
  } catch (error) {
    return { error: `threw: ${error instanceof Error ? error.message : String(error)}` }
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isArticle = (v: Record<string, unknown>) => typeof v.publishedAt === 'string' && typeof v.rubric === 'string' && 'lead' in v
const isInstitution = (v: Record<string, unknown>) => typeof v.statusDate === 'string' && 'products' in v
const isMilestone = (v: Record<string, unknown>) => typeof v.date === 'string' && typeof v.status === 'string' && 'text' in v && !isInstitution(v)
const isAuthor = (v: Record<string, unknown>) => typeof v.slug === 'string' && 'bio' in v && 'role' in v

/** CMS values with Payload ids replaced by the mock ids. */
function normalize(value: unknown, maps: { articles: Map<string, string>; institutions: Map<string, string> }): unknown {
  const art = (id: unknown) => (typeof id === 'string' || typeof id === 'number' ? (maps.articles.get(String(id)) ?? id) : id)
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk)
    if (!isObj(v)) return v
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = walk(x)
    if (isArticle(out)) {
      out.id = art(out.id)
      if (Array.isArray(out.related)) out.related = out.related.map(art)
    }
    if (isInstitution(out)) out.id = maps.institutions.get(String(out.id)) ?? out.id
    if ((isInstitution(out) || isMilestone(out)) && out.articleId !== undefined) out.articleId = art(out.articleId)
    return out
  }
  return walk(value)
}

/** Both sides: a byline's `commercial` as isCommercialAuthor() reads it (the mock marks the partner byline by slug only). */
function commercialBylines(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(commercialBylines)
  if (!isObj(value)) return value
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(value)) out[k] = commercialBylines(x)
  if (isAuthor(out)) out.commercial = Boolean(out.commercial ?? out.slug === 'hamkorlik')
  return out
}

/**
 * Differences that are by design. `translations` is the mock's raw ru/en data;
 * no page reads it (the views carry the localised text). Lists are summaries in
 * the CMS (§8.1: no body, no sources), so only the single-story functions
 * compare those two.
 */
const FULL_STORY = new Set(['getArticle', 'getArticleById'])
function byDesign(value: unknown, fn: string): unknown {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk)
    if (!isObj(v)) return v
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = walk(x)
    if (isArticle(out)) {
      delete out.translations
      if (!FULL_STORY.has(fn)) {
        delete out.body
        delete out.sources
      }
    }
    return out
  }
  return walk(value)
}

async function viewParity(payload: Payload, mockMod: Adapter, cmsMod: Adapter): Promise<Section[]> {
  // Payload id ↔ mock id, from what the importer wrote (read only).
  const legacy = async (collection: 'articles' | 'institutions') => {
    const { docs } = await payload.find({ collection, depth: 0, pagination: false, draft: false, overrideAccess: true, select: { legacyId: true } as never })
    return new Map((docs as { id: number; legacyId?: string | null }[]).filter((d) => d.legacyId).map((d) => [String(d.id), d.legacyId as string]))
  }
  const articleMap = await legacy('articles')
  const maps = { articles: articleMap, institutions: await legacy('institutions') }
  const toCms = new Map([...articleMap].map(([id, l]) => [l, id]))
  const sides: [Side, Side] = [
    { name: 'mock', mod: mockMod, articleId: (l) => l },
    { name: 'cms', mod: cmsMod, articleId: (l) => toCms.get(l) ?? `missing:${l}` },
  ]

  const lead = mock.articles.find((a) => a.featured && !a.sponsored) ?? mock.articles[0]
  type Case = { fn: string; label: string; args: (side: Side, locale: Locale) => Promise<unknown[]> | unknown[] }
  const plain = (fn: string, ...rest: unknown[]): Case => ({ fn, label: rest.length ? `${fn}(${rest.map((r) => JSON.stringify(r)).join(', ')})` : fn, args: (_s, l) => [l, ...rest] })
  const cases: Case[] = [
    plain('getRubrics'),
    ...mock.rubrics.map((r) => plain('getRubric', r.slug)),
    plain('getArticles'),
    ...mock.articles.map((a) => plain('getArticle', a.rubric, a.slug)),
    ...mock.articles.map((a): Case => ({ fn: 'getArticleById', label: `getArticleById(${a.id})`, args: (s, l) => [l, s.articleId(a.id)] })),
    ...mock.rubrics.map((r) => plain('getArticlesByRubric', r.slug)),
    ...mock.tags.map((t) => plain('getArticlesByTag', t.slug)),
    ...mock.authors.map((a) => plain('getArticlesByAuthor', a.slug)),
    ...mock.glossary.map((t) => plain('getArticlesByTerm', t.slug)),
    plain('getLeadStory'),
    plain('getLatest'),
    { fn: 'getLatest', label: `getLatest(5, [${lead.id}])`, args: (s: Side, l: Locale) => [l, 5, [s.articleId(lead.id)]] },
    plain('getMostRead'),
    plain('getMostRead', 10),
    ...mock.articles.map((a): Case => ({
      fn: 'getRelated',
      label: `getRelated(${a.id})`,
      args: async (s: Side, l: Locale) => [l, (await call(s, 'getArticle', [l, a.rubric, a.slug])).value, 4],
    })),
    plain('getAuthors'),
    ...mock.authors.map((a) => plain('getAuthor', a.slug)),
    plain('getTags'),
    ...mock.tags.map((t) => plain('getTag', t.slug)),
    plain('getGlossary'),
    ...mock.glossary.map((t) => plain('getTerm', t.slug)),
    plain('getTermOfDay', MOCK_NOW),
    plain('getTermOfDay', '2026-11-15T12:00:00+05:00'),
    plain('getInstitutions'),
    plain('getMilestones'),
    plain('getClubEvents'),
    ...mock.clubEvents.map((e) => plain('getClubEvent', e.slug)),
    plain('getNextClubEvent'),
    plain('getPastClubEvents'),
    ...QUERIES.map((q): Case => ({ fn: 'search', label: `search(${JSON.stringify(q)})`, args: (_s, l) => [l, l === 'kr' && /[a-zʻʼ]/i.test(q) ? toCyrillic(q) : q] })),
  ].filter((c) => !ONLY || ONLY.has(c.fn))

  const sections = new Map<string, Section>()
  for (const locale of LOCALES) {
    for (const c of cases) {
      const name = `${c.fn} ${locale}`
      const s = sections.get(name) ?? { name, checked: 0, differences: [], notes: [] }
      sections.set(name, s)
      s.checked++
      const [m, cms] = await Promise.all(sides.map(async (side) => call(side, c.fn, await c.args(side, locale))))
      if (m.error || cms.error) {
        if (m.error !== cms.error) s.differences.push({ key: c.label, differences: [{ path: '(call)', mock: m.error ?? 'ok', cms: cms.error ?? 'ok' }] })
        continue
      }
      const diffs: Difference[] = compare(byDesign(commercialBylines(m.value), c.fn), byDesign(commercialBylines(normalize(cms.value, maps)), c.fn), compareOptions)
      if (diffs.length) s.differences.push({ key: c.label, differences: diffs })
    }
  }
  return [...sections.values()]
}

// ── main ────────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
let failed = false
try {
  console.log(`Parity: mock data against the CMS at ${(process.env.DATABASE_URL ?? '').replace(/:\/\/[^@]*@/, '://…@')}`)
  console.log('\n1. Data (published records read as the public site reads them)')
  const data = dataParity(mock, await readBack(payload), compareOptions)
  data.forEach((s) => printSection(s))
  failed ||= data.some((s) => !ok(s))

  if (!values['data-only']) {
    console.log(`\n2. Views (${LOCALES.join(', ')})`)
    const adapters = ['mock', 'payload'].map((n) => `src/content/adapters/${n}.ts`)
    const missing = adapters.filter((f) => !existsSync(new URL(`../${f}`, import.meta.url)))
    if (missing.length) console.log(`  skipped: ${missing.join(', ')} not found`)
    else {
      installIncrementalCache()
      const [mockMod, cmsMod] = (await Promise.all([import('../src/content/adapters/mock'), import('../src/content/adapters/payload')])) as Adapter[]
      const shared = Object.keys(mockMod).filter((k) => typeof mockMod[k] === 'function' && typeof cmsMod[k] === 'function')
      const onlyMock = Object.keys(mockMod).filter((k) => typeof mockMod[k] === 'function' && typeof cmsMod[k] !== 'function')
      if (onlyMock.length) console.log(`  not in the payload adapter: ${onlyMock.join(', ')}`)
      const views = await viewParity(payload, mockMod, cmsMod)
      const byFn = new Map<string, Section[]>()
      for (const s of views) {
        const fn = s.name.split(' ')[0]
        byFn.set(fn, [...(byFn.get(fn) ?? []), s])
      }
      for (const [fn, list] of byFn) {
        const line = list.map((s) => `${s.name.split(' ')[1]} ${ok(s) ? 'ok' : `${s.differences.length}✗`}`).join('  ')
        console.log(`  ${fn.padEnd(22)} ${String(list[0].checked).padStart(4)}  ${line}`)
        for (const s of list) {
          for (const n of s.notes) console.log(`      ${s.name}: ${n}`)
          for (const d of s.differences.slice(0, SHOW)) {
            console.log(`    ${s.name}: ${d.key}`)
            for (const x of d.differences.slice(0, SHOW)) console.log(`      ${formatDifference(x)}`)
            if (d.differences.length > SHOW) console.log(`      … ${d.differences.length - SHOW} more`)
          }
        }
      }
      const notCompared = shared.filter((fn) => !byFn.has(fn))
      if (notCompared.length) console.log(`  exported by both, no parity case: ${notCompared.join(', ')}`)
      // What differs most, across functions and locales: one line per field path (list positions folded).
      const tally = new Map<string, { n: number; fns: Set<string> }>()
      for (const s of views)
        for (const d of s.differences)
          for (const x of d.differences) {
            const path = x.path.replace(/\[\d+\]/g, '[]')
            const t = tally.get(path) ?? { n: 0, fns: new Set() }
            t.n++
            t.fns.add(s.name.split(' ')[0])
            tally.set(path, t)
          }
      if (tally.size) {
        console.log('\n  Differing fields (all functions and locales):')
        for (const [path, t] of [...tally].sort((a, b) => b[1].n - a[1].n).slice(0, 20))
          console.log(`    ${String(t.n).padStart(5)}  ${path.padEnd(32)} ${[...t.fns].slice(0, 6).join(', ')}${t.fns.size > 6 ? ', …' : ''}`)
      }
      failed ||= views.some((s) => !ok(s))
    }
  }
  console.log(failed ? '\nParity: differences found.' : '\nParity: no differences.')
} catch (error) {
  failed = true
  console.error(error)
} finally {
  await payload.destroy()
}
process.exit(failed ? 1 : 0)
