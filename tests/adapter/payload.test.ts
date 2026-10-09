import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'

import * as cms from '@/content/adapters/payload'
import * as mock from '@/content/adapters/mock'
import { setCacheImpl, type CacheOptions } from '@/content/adapters/cms/cache'
import type { ArticleView, ImageRef } from '@/content'
import { locales, type Locale } from '@/i18n/config'
import { deepCyrillic } from '@/i18n/translit'
import { TAG } from '@/payload/delivery/tags'
import { testPayload } from '../helpers/payload'
import { body, RUN } from '../delivery/fixtures'
import { seedMock, SEED_ARTICLES, SEED_CONTEXT, type Seeded } from './seed'

/**
 * The Payload content adapter against a seeded database (CMS-SPEC §6.5, §8):
 * published-only reads, translation gating, Cyrillic overrides, withdrawn
 * stories, date offsets, media mapping, and the cache tags of each read. The
 * seeded mock stories must come out as the mock adapter shows them (§11.4).
 */

let payload: Payload
let seeded: Seeded
/** Every cached read: key → options. */
const reads = new Map<string, CacheOptions>()

beforeAll(async () => {
  payload = await testPayload()
  seeded = await seedMock(payload)
  setCacheImpl(async (fn, key, options) => {
    reads.set(key.join('|'), options)
    return fn()
  })
}, 300_000)

afterAll(async () => {
  setCacheImpl(undefined)
  await payload.destroy()
})

const legacyOf = (id: string) => [...seeded.articles.entries()].find(([, v]) => String(v) === id)?.[0] ?? id
const stem = (src: string) => src.replace(/^.*\//, '').replace(/(-[0-9a-f]{12})?(-\d+x\d+)?\.(webp|svg)$/, '')
const ratio = (i: ImageRef) => Math.round((i.width / i.height) * 100) / 100

/** A view with CMS ids and files mapped to the mock's, and the CMS-only fields (§3.17) left out. */
function comparable(v: ArticleView | undefined, side: 'cms' | 'mock'): unknown {
  if (!v) return v
  const img = (i?: ImageRef) =>
    i && {
      ...i,
      src: stem(i.src),
      width: ratio(i),
      height: undefined,
      creator: undefined,
      copyrightNotice: undefined,
      licenseUrl: undefined,
      decorative: undefined,
    }
  return {
    ...v,
    id: side === 'cms' ? legacyOf(v.id) : v.id,
    related: (() => {
      const ids = side === 'cms' ? v.related?.map(legacyOf) : v.related?.filter((id) => SEED_ARTICLES.includes(id))
      return ids?.length ? ids : undefined
    })(),
    image: img(v.image),
    interviewee: v.interviewee && { ...v.interviewee, portrait: img(v.interviewee.portrait) },
    body: v.body.map((b) => (b.type === 'figure' ? { ...b, image: img(b.image) } : b)),
    corrections: v.corrections?.map((c) => ({ date: c.date, text: c.text })),
    sponsored: v.sponsored && { partner: v.sponsored.partner, disclosure: v.sponsored.disclosure },
    translations: undefined,
    firstPublishedAt: undefined,
    shortCode: undefined,
  }
}

const mockSeeded = (l: Locale) => mock.getArticles(l).filter((a) => SEED_ARTICLES.includes(a.id))

describe('the seeded mock stories (parity, §11.4)', () => {
  it.each(locales)('full stories match the mock adapter in %s', async (l) => {
    for (const m of mockSeeded(l)) {
      const c = await cms.getArticle(l, m.rubric, m.slug)
      expect(comparable(c, 'cms'), `${l} ${m.id}`).toEqual(comparable(m, 'mock'))
    }
  })

  it.each(locales)('summaries are the stories without body and sources, newest first, in %s', async (l) => {
    const list = (await cms.getArticles(l)).filter((a) => SEED_ARTICLES.includes(legacyOf(a.id)))
    expect(list.map((a) => legacyOf(a.id))).toEqual(mockSeeded(l).map((a) => a.id))
    for (const a of list) {
      expect(a.body).toEqual([])
      expect(a.sources).toEqual([])
      const full = (await cms.getArticleById(l, a.id))!
      expect(a.readingMinutes).toBe(full.readingMinutes)
      expect({ ...a, body: full.body, sources: full.sources }).toEqual(full)
    }
  })

  it('formats every date with the Tashkent offset, as the mock data does', async () => {
    for (const m of mockSeeded('uz')) {
      const c = (await cms.getArticle('uz', m.rubric, m.slug))!
      expect(c.publishedAt).toBe(m.publishedAt)
      expect(c.updatedAt).toBe(m.updatedAt)
      expect(c.firstPublishedAt).toBe(m.publishedAt)
      for (const [i, x] of (c.corrections ?? []).entries()) expect(x.date).toBe(m.corrections![i].date)
    }
  })

  it('maps media to /api/media/file with the alt and credit of each language', async () => {
    const m = mock.getArticles('uz').find((a) => a.id === 'th-01')!
    const uz = (await cms.getArticle('uz', m.rubric, m.slug))!
    expect(uz.image!.src).toMatch(/^\/api\/media\/file\/[a-z0-9-]+\.webp$/)
    expect(uz.image!.alt).toBe(m.image!.alt)
    expect(uz.image!.credit).toBe(m.image!.credit)
    expect(uz.image!.translations).toEqual(m.image!.translations)
    expect(ratio(uz.image!)).toBeCloseTo(m.image!.width / m.image!.height, 2)
    const figure = uz.body.find((b) => b.type === 'figure')
    expect(figure?.type === 'figure' && figure.image.src).toMatch(/^\/api\/media\/file\//)
    // A ru story's hero takes the ru alt and credit; an untranslated one on /ru keeps Uzbek.
    const yn = mock.getArticles('ru').find((a) => a.id === 'yn-01')!
    const ru = (await cms.getArticle('ru', yn.rubric, yn.slug))!
    expect(ru.contentLang).toBe('ru')
    expect([ru.image!.alt, ru.image!.credit, ru.image!.caption]).toEqual([yn.image!.alt, yn.image!.credit, yn.image!.caption])
    const ruFallback = (await cms.getArticle('ru', m.rubric, m.slug))!
    expect(ruFallback.contentLang).toBe('uz')
    expect(ruFallback.image!.alt).toBe(m.image!.alt)
  })

  it('reads the glossary, vocabulary, market map and club as the mock adapter does', async () => {
    for (const l of locales) {
      expect(await cms.getGlossary(l), l).toEqual(mock.getGlossary(l))
      expect((await cms.getAuthors(l)).map((a) => ({ ...a, isTeam: undefined, commercial: a.commercial })), l).toEqual(
        mock.getAuthors(l).map((a) => ({ ...a, commercial: a.commercial ?? (a.slug === 'hamkorlik' ? true : undefined) })),
      )
      expect(await cms.getTags(l), l).toEqual(mock.getTags(l))
      expect(await cms.getRubrics(l), l).toEqual(mock.getRubrics(l))
      const inst = await cms.getInstitutions(l)
      expect(inst.map((i) => ({ ...i, id: undefined, articleId: i.articleId ? legacyOf(i.articleId) : undefined })), l).toEqual(
        mock.getInstitutions(l).map((i) => ({ ...i, id: undefined, articleId: i.articleId && SEED_ARTICLES.includes(i.articleId) ? i.articleId : undefined })),
      )
      expect((await cms.getMilestones(l)).map((x) => ({ ...x, articleId: x.articleId ? legacyOf(x.articleId) : undefined })), l).toEqual(
        mock.getMilestones(l).map((x) => ({ ...x, articleId: x.articleId && SEED_ARTICLES.includes(x.articleId) ? x.articleId : undefined })),
      )
      const events = await cms.getClubEvents(l)
      const img = (i?: ImageRef) => i && { ...i, src: stem(i.src), width: ratio(i), height: undefined, creator: undefined }
      const norm = (e: (typeof events)[number]) => ({ ...e, image: img(e.image), speakers: e.speakers.map((s) => ({ ...s, portrait: img(s.portrait) })) })
      expect(events.map(norm), l).toEqual(mock.getClubEvents(l).map(norm))
    }
  })

  it('searches with the same semantics', async () => {
    for (const [l, q] of [['uz', 'murobaha'], ['uz', 'islom oynasi'], ['kr', 'мураба'], ['ru', 'лицензию'], ['en', 'Islamic window'], ['uz', 'Tijorat banki E']] as const) {
      const c = await cms.search(l, q)
      const m = mock.search(l, q)
      expect(c.articles.map((a) => legacyOf(a.id)).filter((id) => SEED_ARTICLES.includes(id)), `${l} ${q}`).toEqual(m.articles.map((a) => a.id).filter((id) => SEED_ARTICLES.includes(id)))
      expect(c.terms, `${l} ${q}`).toEqual(m.terms)
      // Search results carry their body (the excerpt quotes it).
      for (const a of c.articles) expect(a.body.length).toBeGreaterThan(0)
    }
  })
})

// ── behaviour on documents made for these tests ──────────────────────────────

const write = { depth: 0, overrideAccess: true, context: SEED_CONTEXT } as const

async function story(tag: string, data: Record<string, unknown> = {}) {
  const title = `Adapter sinovi ${tag} ${RUN}`
  const slug = `adapter-sinovi-${tag}-${RUN}`.toLowerCase()
  const doc = await payload.create({
    ...write,
    collection: 'articles',
    data: {
      title,
      slug,
      lead: 'Bank regulyatori yangi hisobot eʼlon qildi.',
      body: body('Hisobotda islom moliyasi xizmatlari haqida maʼlumot berilgan.'),
      rubric: seeded.rubrics.get('yangiliklar'),
      authors: [seeded.authors.get('malika-yusupova')],
      tags: [seeded.tags.get('regulyator')],
      sources: [{ title: 'Hisobot', publisher: 'Bank regulyatori' }],
      workflowStatus: 'published',
      publishedAt: '2026-10-08T06:00:00.000Z',
      firstPublishedAt: '2026-10-08T06:00:00.000Z',
      _status: 'published',
      ...data,
    } as never,
  })
  return { id: String(doc.id), slug, title }
}

describe('published-only reads', () => {
  it('never shows a draft: neither a story never published nor the newer draft of a live one', async () => {
    const draftOnly = await payload.create({
      ...write,
      collection: 'articles',
      draft: true,
      data: { title: `Qoralama ${RUN}`, slug: `qoralama-${RUN}`, lead: 'Lid', rubric: seeded.rubrics.get('yangiliklar'), authors: [seeded.authors.get('malika-yusupova')], _status: 'draft' } as never,
    })
    expect(await cms.getArticle('uz', 'yangiliklar', `qoralama-${RUN}`)).toBeUndefined()
    expect((await cms.getArticles('uz')).some((a) => a.id === String(draftOnly.id))).toBe(false)

    const live = await story('jonli')
    await payload.update({ ...write, collection: 'articles', id: live.id, draft: true, data: { title: 'Chop etilmagan sarlavha', _status: 'draft' } as never })
    expect((await cms.getArticle('uz', 'yangiliklar', live.slug))!.title).toBe(live.title)
    expect((await cms.getArticles('uz')).find((a) => a.id === live.id)!.title).toBe(live.title)
  })

  it('leaves out references to unpublished documents (tags, terms, related)', async () => {
    const tag = await payload.create({ ...write, collection: 'tags', draft: true, data: { slug: `qoralama-mavzu-${RUN}`, label: 'Qoralama mavzu', _status: 'draft' } as never })
    const s = await story('boglanish', { tags: [tag.id, seeded.tags.get('regulyator')] })
    expect((await cms.getArticle('uz', 'yangiliklar', s.slug))!.tags).toEqual(['regulyator'])
  })

  it('finds a story the cached index does not know yet, and never caches a miss', async () => {
    const s = await story('yangi')
    expect((await cms.getArticle('uz', 'yangiliklar', s.slug))?.id).toBe(s.id)
    expect(await cms.getArticle('uz', 'yangiliklar', `yoq-${RUN}`)).toBeUndefined()
    expect(await cms.getArticle('uz', 'tahlil', s.slug)).toBeUndefined()
    // Invalid params never reach a query.
    expect(await cms.getArticle('uz', 'yangiliklar', "x' or 1=1")).toBeUndefined()
    expect(await cms.getArticle('uz', 'nomalum', s.slug)).toBeUndefined()
  })
})

describe('translation gating (§6.3)', () => {
  async function translated(tag: string) {
    const s = await story(tag)
    await payload.update({ ...write, collection: 'articles', id: s.id, locale: 'ru', data: { title: 'Русский заголовок', lead: 'Русский лид.', body: body('Русский текст.'), _status: 'published' } as never })
    const stored = (await payload.findByID({ collection: 'articles', id: s.id, locale: 'ru', depth: 0, overrideAccess: true })) as unknown as Record<string, unknown>
    const { translationHash } = await import('@/payload/hooks/workflow/hash')
    const hash = translationHash(stored, 'ru')
    const setTranslation = (translation: Record<string, unknown>) =>
      payload.update({ ...write, collection: 'articles', id: s.id, locale: 'ru', data: { translation, _status: 'published' } as never })
    return { ...s, hash, setTranslation }
  }

  it('shows ru only when approved and the hash matches; otherwise the Uzbek original with contentLang uz', async () => {
    const s = await translated('tarjima')
    const ru = () => cms.getArticle('ru', 'yangiliklar', s.slug)

    await s.setTranslation({ status: 'in_edit', contentHash: s.hash })
    expect(await ru()).toMatchObject({ title: s.title, contentLang: 'uz' })

    await s.setTranslation({ status: 'approved', contentHash: s.hash })
    expect(await ru()).toMatchObject({ title: 'Русский заголовок', lead: 'Русский лид.', contentLang: 'ru' })
    expect((await ru())!.originalUpdatedAt).toBeUndefined()
    // The summary agrees, and en (no translation) stays Uzbek.
    expect((await cms.getArticles('ru')).find((a) => a.id === s.id)).toMatchObject({ title: 'Русский заголовок', contentLang: 'ru' })
    expect(await cms.getArticle('en', 'yangiliklar', s.slug)).toMatchObject({ title: s.title, contentLang: 'uz' })

    // A copied or forged approval without the hash of this text.
    await s.setTranslation({ status: 'approved', contentHash: 'forged' })
    expect(await ru()).toMatchObject({ title: s.title, contentLang: 'uz' })

    // Outdated after an update: still shown, with the date the original changed.
    await payload.update({ ...write, collection: 'articles', id: s.id, locale: 'uz', data: { significantUpdateAt: '2026-10-09T07:30:00.000Z', _status: 'published' } as never })
    await s.setTranslation({ status: 'outdated', contentHash: s.hash })
    expect(await ru()).toMatchObject({ title: 'Русский заголовок', contentLang: 'ru', originalUpdatedAt: '2026-10-09T12:30:00+05:00' })

    // Outdated after a correction: the hook cleared the hash, so Uzbek is shown.
    await s.setTranslation({ status: 'outdated', contentHash: null })
    expect(await ru()).toMatchObject({ title: s.title, contentLang: 'uz' })
  })

  it('gates glossary translations on their hash too', async () => {
    const { approveTranslation } = await import('./seed')
    const { GLOSSARY_TRANSLATED } = await import('@/content/adapters/cms/glossary')
    const id = seeded.terms.get('ifsb')!
    const uz = (await cms.getTerm('ru', 'ifsb'))!
    expect(uz.contentLang).toBe('uz')
    await approveTranslation(payload, 'glossary-terms', id, 'ru', GLOSSARY_TRANSLATED, { short: 'Русское определение.' })
    expect(await cms.getTerm('ru', 'ifsb')).toMatchObject({ short: 'Русское определение.', contentLang: 'ru' })
    await payload.update({ ...write, collection: 'glossary-terms', id, locale: 'ru', data: { translation: { status: 'in_edit' }, _status: 'published' } as never })
    expect(await cms.getTerm('ru', 'ifsb')).toMatchObject({ short: uz.short, contentLang: 'uz' })
  })
})

describe('Cyrillic (§6.4)', () => {
  it('is deepCyrillic of the Uzbek view, with the kr overrides for title, lead and kicker', async () => {
    const s = await story('kirill', { kicker: 'Litsenziyalash' })
    const uz = (await cms.getArticle('uz', 'yangiliklar', s.slug))!
    const kr = (await cms.getArticle('kr', 'yangiliklar', s.slug))!
    const { contentLang: _a, readingMinutes: _b, url: _c, ...latin } = uz
    expect(kr).toEqual({ ...deepCyrillic(latin), firstPublishedAt: uz.firstPublishedAt, shortCode: uz.shortCode, contentLang: 'uz-Cyrl', readingMinutes: uz.readingMinutes, url: uz.url })

    await payload.update({ ...write, collection: 'articles', id: s.id, data: { kr: { title: 'Қўлда ёзилган сарлавҳа', lead: 'Қўлда ёзилган лид.', kicker: 'Лицензиялаш' }, _status: 'published' } as never })
    expect(await cms.getArticle('kr', 'yangiliklar', s.slug)).toMatchObject({ title: 'Қўлда ёзилган сарлавҳа', lead: 'Қўлда ёзилган лид.', kicker: 'Лицензиялаш', contentLang: 'uz-Cyrl' })
    expect((await cms.getArticles('kr')).find((a) => a.id === s.id)!.title).toBe('Қўлда ёзилган сарлавҳа')
    // The Latin edition is untouched.
    expect((await cms.getArticle('uz', 'yangiliklar', s.slug))!.title).toBe(s.title)
  })
})

describe('withdrawn stories (§5.8)', () => {
  it('drop out of every list and the search; their address shows the notice', async () => {
    const s = await story('olib-tashlash')
    expect((await cms.getArticles('uz')).some((a) => a.id === s.id)).toBe(true)
    await payload.update({
      ...write,
      collection: 'articles',
      id: s.id,
      data: { workflowStatus: 'withdrawn', noindex: true, withdrawal: { at: '2026-10-09T05:00:00.000Z', publicNotice: 'Material tahririyat qarori bilan olib tashlandi.' }, _status: 'published' } as never,
    })
    for (const l of locales) {
      expect((await cms.getArticles(l)).some((a) => a.id === s.id), l).toBe(false)
      expect((await cms.getLatest(l, 50)).some((a) => a.id === s.id), l).toBe(false)
      expect((await cms.getArticlesByTag(l, 'regulyator')).some((a) => a.id === s.id), l).toBe(false)
      expect((await cms.search(l, 'Adapter sinovi olib-tashlash')).articles.some((a) => a.id === s.id), l).toBe(false)
      expect(await cms.getArticleById(l, s.id), l).toBeUndefined()
    }
    const page = (await cms.getArticle('uz', 'yangiliklar', s.slug))!
    expect(page.withdrawn).toEqual({ at: '2026-10-09T10:00:00+05:00', notice: 'Material tahririyat qarori bilan olib tashlandi.' })
    expect(page.noindex).toBe(true)
    expect((await cms.getArticle('kr', 'yangiliklar', s.slug))!.withdrawn!.at).toBe('2026-10-09T10:00:00+05:00')
  })
})

describe('cache tags of each read (§8.3)', () => {
  const tagsOf = (prefix: string) => [...reads.entries()].filter(([k]) => k.startsWith(prefix)).map(([, o]) => o)

  it('tags stories with articles, a full story with article:<id>, Cyrillic with rules', async () => {
    reads.clear()
    const m = mock.getArticles('uz').find((a) => a.id === 'yn-07')!
    const view = (await cms.getArticle('uz', m.rubric, m.slug))!
    await cms.getArticle('kr', m.rubric, m.slug)
    expect(tagsOf('content|article-index|uz')).toEqual([{ tags: [TAG.articles], revalidate: 300 }])
    expect(tagsOf('content|article-index|kr')).toEqual([{ tags: [TAG.articles, TAG.rules], revalidate: 300 }])
    expect(tagsOf(`content|article|uz|${view.id}`)).toEqual([{ tags: [TAG.articles, TAG.article(view.id)], revalidate: 3600 }])
    expect(tagsOf(`content|article|kr|${view.id}`)).toEqual([{ tags: [TAG.articles, TAG.article(view.id), TAG.rules], revalidate: 3600 }])
  })

  it('tags the glossary, vocabulary, market map, club, search index and redirects', async () => {
    reads.clear()
    await Promise.all([
      cms.getGlossary('uz'),
      cms.getAuthors('uz'),
      cms.getTags('uz'),
      cms.getRubrics('ru'),
      cms.getInstitutions('uz'),
      cms.getMilestones('uz'),
      cms.getClubEvents('uz'),
      cms.search('uz', 'murobaha'),
      cms.resolveRedirect('/tahlil/eski-manzil'),
    ])
    expect(tagsOf('content|glossary|uz')[0].tags).toEqual([TAG.glossary, TAG.articles])
    expect(tagsOf('content|authors|uz')[0].tags).toEqual([TAG.articles])
    expect(tagsOf('content|tags|uz')[0].tags).toEqual([TAG.articles])
    expect(tagsOf('content|rubrics|ru')[0].tags).toEqual([TAG.articles, TAG.navigation])
    expect(tagsOf('content|institutions|uz')[0].tags).toEqual([TAG.institutions])
    expect(tagsOf('content|milestones|uz')[0].tags).toEqual([TAG.milestones])
    expect(tagsOf('content|club|uz')[0].tags).toEqual([TAG.club])
    expect(tagsOf('content|search-index|uz')[0].tags).toEqual([TAG.articles, TAG.glossary])
    expect(tagsOf('content|redirects')[0].tags).toEqual([TAG.redirects, TAG.articles])
    // Every read is cached: nothing above ran without a tag.
    for (const [key, o] of reads) expect(o.tags.length, key).toBeGreaterThan(0)
  })
})

describe('redirects (§8.8)', () => {
  it('sends an old address to the story, in its edition', async () => {
    const s = await story('manzil')
    await payload.create({
      ...write,
      collection: 'redirects',
      data: { from: `/ru/yangiliklar/eski-${RUN}`, to: { type: 'reference', reference: { relationTo: 'articles', value: Number(s.id) } }, type: '301' } as never,
    })
    expect(await cms.resolveRedirect(`/ru/yangiliklar/eski-${RUN}`)).toBe(`/ru/yangiliklar/${s.slug}`)
    expect(await cms.resolveRedirect(`/yangiliklar/hech-qachon-${RUN}`)).toBeUndefined()
  })
})
