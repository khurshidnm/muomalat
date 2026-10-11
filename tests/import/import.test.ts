import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { sql } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { compare, formatDifference } from '@/payload/import/compare'
import { checkOptions, ImportRefused, mediaEntries, PRODUCTION_SCOPES, rasterSize, runImport, SCOPES, type ImportReport } from '@/payload/import'
import { IMPORT_HISTORY_NOTE } from '@/payload/import/articles'
import { dataParity, expectedCorpus, ok } from '@/payload/import/parity'
import { readBack, type ReadBack } from '@/payload/import/readback'
import { milestoneKey, mock } from '@/payload/import/source'
import { editorialHash, translationHash } from '@/payload/hooks/workflow/hash'
import { AD_SLOT_IDS, AD_SLOTS } from '@/payload/globals/AdSlots'
import { setCacheImpl } from '@/content/adapters/cms/cache'
import { validatePublished } from '@/payload/hooks/validate/published'
import { testPayload } from '../helpers/payload'

/**
 * The mock importer and its round trip (CMS-SPEC §11, acceptance group M).
 *
 * The import writes vocabulary and globals that other test files also use,
 * so this file runs in a database of its own: scripts/test-db.sh makes a
 * fresh, migrated `<run database>_import` (e.g. `muomalat_test_mine_import`)
 * before Payload boots. Named after the run's database, so two runs at once
 * never drop each other's. Uploads go to a temporary folder. Because nothing
 * here touches the shared database, the file runs in parallel with the others.
 */
// Awaited, so the database exists and DATABASE_URL points at it before the Payload config is imported.
await vi.hoisted(async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const run = /\/muomalat_test_([a-z0-9_]+)(\?|$)/.exec(process.env.DATABASE_URL ?? '')?.[1] ?? 'default'
  const suffix = `${run.slice(0, 40)}_import`
  const out = execFileSync('scripts/test-db.sh', [suffix], { encoding: 'utf8' })
  const url = out.trim().split('\n').at(-1)!.replace(/^DATABASE_URL=/, '')
  if (!url.endsWith(`/muomalat_test_${suffix}`)) throw new Error(`unexpected test database: ${url}`)
  process.env.DATABASE_URL = url
  process.env.MEDIA_DIR = mkdtempSync(join(tmpdir(), 'muomalat-import-media-'))
})

type Doc = Record<string, unknown> & { id: number }
let payload: Awaited<ReturnType<typeof testPayload>>
const LONG = 600_000
const devImport = () => runImport(payload, { scopes: [...SCOPES], translations: 'approved', siteEnv: 'development' })
const count = async (collection: string, where?: Record<string, unknown>) =>
  (await payload.count({ collection: collection as never, overrideAccess: true, ...(where ? { where: where as never } : {}) })).totalDocs

const SIZES = {
  media: mediaEntries().length,
  rubrics: mock.rubrics.length,
  tags: mock.tags.length,
  authors: mock.authors.length,
  'glossary-terms': mock.glossary.length,
  articles: mock.articles.length,
  institutions: mock.institutions.length,
  milestones: mock.milestones.length,
  'club-events': mock.clubEvents.length,
} as const

beforeAll(async () => {
  payload = await testPayload()
})
afterAll(async () => {
  const { rm } = await import('node:fs/promises')
  if (process.env.MEDIA_DIR?.includes('muomalat-import-media-')) await rm(process.env.MEDIA_DIR, { recursive: true, force: true })
  await payload?.destroy()
})

describe('M1: production receives the vocabulary only', () => {
  it('refuses stories, bylines, club meetings and the other mock content before writing anything', async () => {
    for (const scopes of [[...SCOPES], ['articles'], ['authors'], ['club'], ['media'], ['globals'], ['milestones']] as const) {
      expect(() => checkOptions({ scopes: [...scopes], translations: 'unapproved', siteEnv: 'production' })).toThrow(ImportRefused)
      await expect(runImport(payload, { scopes: [...scopes], translations: 'unapproved', siteEnv: 'production' })).rejects.toThrow(/SITE_ENV=production/)
    }
    // Approved translations would go live without a person's review.
    await expect(runImport(payload, { scopes: ['glossary'], translations: 'approved', siteEnv: 'production' })).rejects.toThrow(/unapproved/)
    for (const c of Object.keys(SIZES)) expect(await count(c), c).toBe(0)
  })

  it('imports rubrics and tags live, glossary terms and institutions as drafts marked for review', { timeout: LONG }, async () => {
    const report = await runImport(payload, { scopes: [...PRODUCTION_SCOPES], translations: 'unapproved', siteEnv: 'production' })
    expect(Object.keys(report.counts).sort()).toEqual([...PRODUCTION_SCOPES].sort())
    expect(await count('rubrics', { _status: { equals: 'published' } })).toBe(SIZES.rubrics)
    expect(await count('tags', { _status: { equals: 'published' } })).toBe(SIZES.tags)
    for (const c of ['glossary-terms', 'institutions']) {
      expect(await count(c), c).toBe(SIZES[c as keyof typeof SIZES])
      expect(await count(c, { _status: { equals: 'published' } }), c).toBe(0)
    }
    const term = (await payload.find({ collection: 'glossary-terms', where: { slug: { equals: 'murobaha' } }, draft: true, depth: 0, overrideAccess: true })).docs[0] as unknown as Doc
    expect(term.needsReview).toBe(true)
    for (const c of ['articles', 'authors', 'club-events', 'milestones', 'media']) expect(await count(c), c).toBe(0)
    // The public read sees no unreviewed term (NR-1 keeps them unpublished).
    const rb = await readBack(payload)
    expect(rb.glossary).toEqual([])
    expect(rb.institutions).toEqual([])
  })
})

describe('the development import', () => {
  let first: ImportReport
  let second: ImportReport
  let rb: ReadBack

  it('imports everything from src/content/data', { timeout: LONG }, async () => {
    first = await devImport()
    for (const [c, n] of Object.entries(SIZES)) expect(await count(c), c).toBe(n)
    // Every record is live, under its mock id.
    for (const c of ['rubrics', 'tags', 'authors', 'glossary-terms', 'articles', 'institutions', 'milestones', 'club-events'])
      expect(await count(c, { and: [{ _status: { equals: 'published' } }, { legacyId: { exists: true } }] }), c).toBe(SIZES[c as keyof typeof SIZES])
    // The vocabulary imported above for production was adopted, not duplicated.
    expect(first.counts.rubrics).toMatchObject({ created: 0, updated: SIZES.rubrics })
    expect(first.counts.glossary).toMatchObject({ created: 0, updated: SIZES['glossary-terms'] })
    expect(first.counts.articles).toMatchObject({ created: SIZES.articles, updated: 0 })
    expect(first.counts.media).toMatchObject({ created: SIZES.media })
    expect(first.warnings).toEqual([])
    expect(await count('glossary-terms', { needsReview: { equals: true } })).toBe(0)
  })

  it('M2: a re-run updates what is there and creates nothing', { timeout: LONG }, async () => {
    const rowIds = async () =>
      ((await payload.find({ collection: 'articles', where: { legacyId: { equals: 'yn-07' } }, depth: 0, overrideAccess: true })).docs[0] as unknown as Doc).corrections as { id: string }[]
    const before = await rowIds()
    second = await devImport()
    for (const [scope, c] of Object.entries(second.counts)) expect(c?.created, scope).toBe(0)
    expect(second.counts.media).toMatchObject({ created: 0, updated: 0, unchanged: SIZES.media })
    for (const [c, n] of Object.entries(SIZES)) expect(await count(c), c).toBe(n)
    // Correction rows keep their ids, so ru/en texts written against them survive (§11.1).
    expect((await rowIds()).map((r) => r.id)).toEqual(before.map((r) => r.id))
    expect(second.warnings).toEqual([])
  })

  it('round-trips: the public read of every collection equals the mock data', { timeout: LONG }, async () => {
    rb = await readBack(payload)
    for (const s of dataParity(mock, rb)) {
      const lines = s.differences.flatMap((d) => d.differences.slice(0, 5).map((x) => `${d.key} ${formatDifference(x)}`))
      expect(lines, s.name).toEqual([])
      expect(ok(s)).toBe(true)
    }
  })

  // One sample per collection, compared field by field (image sizes as a ratio, src through the media map).
  const want = expectedCorpus(mock)
  const linkedMilestone = want.milestones.find((x) => x.articleId)!
  const samples: [string, (r: ReadBack) => unknown, unknown][] = [
    ['rubrics', (r) => r.rubrics.find((x) => x.slug === 'tahlil'), want.rubrics.find((x) => x.slug === 'tahlil')],
    ['tags', (r) => r.tags.find((x) => x.slug === 'murobaha'), want.tags.find((x) => x.slug === 'murobaha')],
    ['authors', (r) => r.authors.find((x) => x.slug === 'hamkorlik'), want.authors.find((x) => x.slug === 'hamkorlik')],
    ['glossary-terms', (r) => r.glossary.find((x) => x.slug === 'daromadni-tozalash'), want.glossary.find((x) => x.slug === 'daromadni-tozalash')],
    ['institutions', (r) => r.institutions.find((x) => x.id === 'inst-a'), want.institutions.find((x) => x.id === 'inst-a')],
    ['milestones', (r) => r.milestones.find((x) => milestoneKey(x) === milestoneKey(linkedMilestone)), linkedMilestone],
    ['club-events', (r) => r.clubEvents.find((x) => x.slug === 'sentabr-2026-eksport-moliyasi'), want.clubEvents.find((x) => x.slug === 'sentabr-2026-eksport-moliyasi')],
    ['articles: translated', (r) => r.articles.find((x) => x.id === 'yn-01'), want.articles.find((x) => x.id === 'yn-01')],
    ['articles: interview', (r) => r.articles.find((x) => x.id === 'iv-01'), want.articles.find((x) => x.id === 'iv-01')],
    ['articles: sponsored', (r) => r.articles.find((x) => x.id === 'iz-07'), want.articles.find((x) => x.id === 'iz-07')],
    ['articles: corrected', (r) => r.articles.find((x) => x.id === 'yn-07'), want.articles.find((x) => x.id === 'yn-07')],
  ]
  it.each(samples)('round-trips a sample: %s', (_name, pick, expected) => {
    expect(expected).toBeTruthy()
    expect(compare(expected, pick(rb)).map((d) => formatDifference(d))).toEqual([])
  })

  it('every article block type of the mock data survives the round trip', () => {
    const types = (articles: typeof mock.articles) => [...new Set(articles.flatMap((a) => a.body.map((b) => b.type)))].sort()
    expect(types(mock.articles)).toEqual(['callout', 'chart', 'factbox', 'figure', 'h2', 'h3', 'list', 'p', 'qa', 'quote', 'table', 'term'])
    expect(types(rb.articles)).toEqual(types(mock.articles))
  })

  it('M3: media are WebP with uz, ru and en alt and credit, staff rights, sized from the mock ratio', async () => {
    const { docs } = await payload.find({ collection: 'media', locale: 'all', depth: 0, pagination: false, overrideAccess: true })
    expect(docs).toHaveLength(SIZES.media)
    for (const m of docs as unknown as (Doc & { filename: string; mimeType: string; width: number; height: number; alt: Record<string, string>; credit: Record<string, string> })[]) {
      expect(m.mimeType, m.filename).toBe('image/webp')
      expect(m.filename).toMatch(/\.webp$/)
      for (const l of ['uz', 'ru', 'en']) {
        expect(m.alt?.[l], `${m.filename} alt ${l}`).toBeTruthy()
        expect(m.credit?.[l], `${m.filename} credit ${l}`).toBeTruthy()
      }
      expect(m.rightsCategory).toBe('staff')
      const entry = mediaEntries().find((e) => `${e.key}.webp` === m.filename)!
      expect({ width: m.width, height: m.height }).toEqual(rasterSize(entry.width, entry.height))
      expect(m.width).toBeGreaterThanOrEqual(1600)
      const file = await readFile(path.join(process.env.MEDIA_DIR!, m.filename))
      const meta = await sharp(file).metadata()
      expect(meta.format).toBe('webp')
      expect(meta.exif).toBeUndefined()
    }
    // A portrait used with a person's name is its own item, alt in every edition.
    const named = (docs as unknown as { filename: string; alt: Record<string, string> }[]).find((m) => m.filename === 'portrait-06-dilnoza-karimova.webp')
    expect(named?.alt).toEqual({ uz: 'Dilnoza Karimova', ru: 'Dilnoza Karimova', en: 'Dilnoza Karimova' })
  })

  it('stamps the publication as the import: no person named, dates from the mock, the approval hash of the live text', async () => {
    const a = (await payload.find({ collection: 'articles', where: { legacyId: { equals: 'yn-01' } }, depth: 0, overrideAccess: true, draft: false })).docs[0] as unknown as Doc
    const src = mock.articles.find((x) => x.id === 'yn-01')!
    expect(a._status).toBe('published')
    expect(a.workflowStatus).toBe('published')
    expect(a.firstPublishedAt).toBe(new Date(src.publishedAt).toISOString())
    expect(a.publishedAt).toBe(new Date(src.publishedAt).toISOString())
    expect(a.significantUpdateAt).toBe(new Date(src.updatedAt!).toISOString())
    expect(a.approvedBy ?? null).toBeNull()
    expect(a.publishedBy ?? null).toBeNull()
    expect(a.approvedContentHash).toBe(editorialHash(a))
    expect(a.views).toBe(src.views)
    expect(a.shortCode).toMatch(/^[0-9a-z]{6}$/)
    expect((a.workflowHistory as Doc[]).map((h) => [h.to, h.comment, h.by ?? null])).toEqual([['published', IMPORT_HISTORY_NOTE, null]])
    const audit = await payload.find({ collection: 'audit-log', where: { and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(a.id) } }] }, depth: 0, pagination: false, overrideAccess: true })
    expect(audit.docs.length).toBeGreaterThan(0)
    expect(new Set(audit.docs.map((d) => (d as unknown as Doc).actorEmail))).toEqual(new Set(['system:import']))
    // Outside a request the invalidations wait in the outbox (§8.4).
    expect(await count('publish-events', { and: [{ collection: { equals: 'articles' } }, { kind: { equals: 'publish_first' } }] })).toBe(SIZES.articles)
  })

  it('translations go in approved with the hash the read gate checks', async () => {
    const all = (await payload.find({ collection: 'articles', where: { legacyId: { equals: 'yn-01' } }, locale: 'all', depth: 0, overrideAccess: true, draft: false })).docs[0] as unknown as Doc
    for (const l of ['ru', 'en'] as const) {
      const tr = (all.translation as Record<string, Doc>)[l]
      expect(tr.status).toBe('approved')
      expect(tr.translatedBy ?? null).toBeNull()
      expect(tr.reviewedBy ?? null).toBeNull()
      const text = Object.fromEntries(['title', 'kicker', 'lead', 'imageCaption', 'body'].map((k) => [k, (all[k] as Record<string, unknown>)[l]]))
      expect(tr.contentHash).toBe(translationHash(text, l))
    }
  })

  it('globals: settings as in site.ts, the coded menus, today\'s lead, all ad slots off, the code limits', async () => {
    const settings = (await payload.findGlobal({ slug: 'site-settings', locale: 'all', depth: 0, overrideAccess: true })) as unknown as Doc
    const legal = settings.legal as Record<string, { value: string; placeholder: boolean }>
    expect(legal.registrationNumber).toMatchObject({ value: '№ 0000', placeholder: true })
    expect(legal.ageMark).toMatchObject({ value: '16+', placeholder: true })
    expect(Object.values(legal).filter((v) => v && typeof v === 'object' && 'placeholder' in v).every((v) => v.placeholder)).toBe(true)
    expect((settings.demo as Doc).noticeEnabled).toBe(true)
    expect(settings.telegram).toMatchObject({ channelHandle: '@muomalatuz', channelUrl: 'https://t.me/muomalatuz' })
    expect((settings.labels as Record<string, Record<string, string>>).sponsored).toEqual({
      uz: 'Reklama · Hamkorlik materiali',
      ru: 'Реклама · Партнёрский материал',
      en: 'Advertisement · Partner content',
    })

    const nav = (await payload.findGlobal({ slug: 'navigation', depth: 1, overrideAccess: true })) as unknown as Doc
    expect(nav._status).toBe('published')
    expect((nav.header as { kind: string; rubric?: { slug: string }; page?: string }[]).map((i) => (i.kind === 'rubric' ? i.rubric?.slug : i.page))).toEqual([
      'yangiliklar', 'tahlil', 'intervyu', 'izoh', 'dunyo', 'lugat', 'xarita', 'klub',
    ])

    const home = (await payload.findGlobal({ slug: 'home-page', depth: 1, overrideAccess: true })) as unknown as Doc
    const lead = mock.articles.find((x) => x.featured && !x.sponsored)!
    expect(home._status).toBe('published')
    expect((home.lead as Doc).legacyId).toBe(lead.id)
    expect(home.pinned).toEqual([])

    const ads = (await payload.findGlobal({ slug: 'ad-slots', depth: 0, overrideAccess: true })) as unknown as Doc
    expect((ads.slots as Doc[]).map((s) => [s.slotId, s.format, s.enabled])).toEqual(AD_SLOT_IDS.map((id) => [id, AD_SLOTS[id], false]))

    const rules = (await payload.findGlobal({ slug: 'editorial-rules', depth: 0, overrideAccess: true })) as unknown as Doc
    expect(rules.limits).toMatchObject({ titleWarn: 80, titleMax: 140, leadWarn: 300, leadMax: 500, telegramCaption: 1024 })
  })

  it('links resolve through the mock ids: related stories, institutions and milestones point at the imported stories', async () => {
    for (const a of mock.articles.filter((x) => x.related?.length)) expect(rb.articles.find((x) => x.id === a.id)?.related, a.id).toEqual(a.related)
    for (const i of mock.institutions.filter((x) => x.articleId)) expect(rb.institutions.find((x) => x.id === i.id)?.articleId, i.id).toBe(i.articleId)
    for (const m of mock.milestones.filter((x) => x.articleId)) expect(rb.milestones.find((x) => milestoneKey(x) === milestoneKey(m))?.articleId).toBe(m.articleId)
  })

  it('--translations=unapproved leaves ru and en in_edit, off the site; approved again on the next run', { timeout: LONG }, async () => {
    await runImport(payload, { scopes: ['articles'], translations: 'unapproved', siteEnv: 'development' })
    const off = await readBack(payload)
    expect(off.articles.find((a) => a.id === 'yn-01')?.translations).toBeUndefined()
    const all = (await payload.find({ collection: 'articles', where: { legacyId: { equals: 'yn-01' } }, locale: 'all', depth: 0, overrideAccess: true })).docs[0] as unknown as Doc
    expect((all.translation as Record<string, Doc>).ru).toMatchObject({ status: 'in_edit', contentHash: null })

    await runImport(payload, { scopes: ['articles'], translations: 'approved', siteEnv: 'development' })
    const on = await readBack(payload)
    expect(Object.keys(on.articles.find((a) => a.id === 'yn-01')?.translations ?? {}).sort()).toEqual(['en', 'ru'])
    expect(await count('articles')).toBe(SIZES.articles)
  })
})

describe('npm run validate -- --source=payload (§7.1) on the imported content', () => {
  it('reads every published record and reports no error', { timeout: LONG }, async () => {
    setCacheImpl(async (fn) => fn())
    try {
      const report = await validatePublished(payload)
      expect(report.counts).toEqual({
        articles: SIZES.articles,
        terms: SIZES['glossary-terms'],
        institutions: SIZES.institutions,
        milestones: SIZES.milestones,
        clubEvents: SIZES['club-events'],
      })
      expect(report.errors).toEqual([])
    } finally {
      setCacheImpl(undefined)
    }
  })

  it('finds what the CMS would refuse, in published content and in the Cyrillic edition', { timeout: LONG }, async () => {
    // A value changed behind the hooks (a careless script, straight SQL): «o'z» with a straight apostrophe
    // (TXT-1), and a loanword the transliteration spells wrong in the Cyrillic edition (KR-3).
    const term = (await payload.find({ collection: 'glossary-terms', where: { legacyId: { exists: true } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as Doc
    const before = (await payload.findByID({ collection: 'glossary-terms', id: term.id, locale: 'uz', depth: 0, overrideAccess: true })) as unknown as Doc
    const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
    const setShort = (text: unknown) => db.drizzle.execute(sql`UPDATE glossary_terms_locales SET short = ${String(text)} WHERE _parent_id = ${term.id} AND _locale = 'uz'`)
    await setShort("Bank o'z konferensiyasini oʻtkazdi.")
    setCacheImpl(async (fn) => fn())
    try {
      const glossary = await validatePublished(payload, 'glossary')
      expect(glossary.errors.some((e) => e.startsWith(`term ${String(term.slug)} › short:`) && e.includes('ʻ'))).toBe(true)
      const kr = await validatePublished(payload, 'kr')
      expect(kr.errors.some((e) => e.startsWith('kr glossary') && e.includes('конференция'))).toBe(true)
    } finally {
      setCacheImpl(undefined)
      await setShort(before.short)
    }
  })
})
