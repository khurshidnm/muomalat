import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSponsoredLabel } from '@/content'
import * as cms from '@/content/adapters/payload'
import * as mock from '@/content/adapters/mock'
import { setCacheImpl, type CacheOptions } from '@/content/adapters/cms/cache'
import { locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { toCyrillic } from '@/i18n/translit'
import { buildRss } from '@/lib/rss'
import { TAG } from '@/payload/delivery/tags'
import { testPayload } from '../helpers/payload'
import { AS_IMPORT, author, body, rubric, RUN, story } from '../delivery/fixtures'

/**
 * The partner-content label comes from site-settings `labels.sponsored` when
 * the site reads the CMS, and falls back to the interface message
 * (src/i18n/messages/common.ts) when the setting is empty. Writes the shared
 * site-settings global, so it runs with the other files that write shared
 * globals (vitest.config.ts), and puts the labels back afterwards.
 */
/**
 * The feed lists every published story in the shared database, including
 * other files' fixtures (some have no publication date). The RSS check looks
 * at this file's story alone.
 */
const feed = vi.hoisted(() => ({ only: undefined as string | undefined }))
vi.mock('@/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content')>()
  return {
    ...actual,
    getArticles: async (locale: Parameters<typeof actual.getArticles>[0]) => (await actual.getArticles(locale)).filter((a) => !feed.only || a.id === feed.only),
  }
})

const reads = new Map<string, CacheOptions>()
const message = (l: (typeof locales)[number]) => pick(commonMessages, l).labels.sponsored
let saved: unknown
let previousSource: string | undefined

async function setLabels(values: Partial<Record<'uz' | 'ru' | 'en', string | null>>) {
  const payload = await testPayload()
  for (const [locale, sponsored] of Object.entries(values)) {
    await payload.updateGlobal({ slug: 'site-settings', locale: locale as 'uz', data: { labels: { sponsored } } as never, overrideAccess: true })
  }
}

beforeAll(async () => {
  previousSource = process.env.CONTENT_SOURCE
  process.env.CONTENT_SOURCE = 'payload'
  const payload = await testPayload()
  saved = ((await payload.findGlobal({ slug: 'site-settings', locale: 'all', depth: 0, overrideAccess: true })) as { labels?: { sponsored?: unknown } }).labels?.sponsored
  // Outside Next the reads run uncached; record their keys and tags instead.
  setCacheImpl(async (fn, key, options) => {
    reads.set(key.join('|'), options)
    return fn()
  })
})

afterAll(async () => {
  setCacheImpl(undefined)
  process.env.CONTENT_SOURCE = previousSource
  const back = (saved ?? {}) as Record<string, string | null | undefined>
  await setLabels({ uz: back.uz ?? null, ru: back.ru ?? null, en: back.en ?? null })
  await (await testPayload()).destroy()
})

describe('the sponsored label on the site', () => {
  it('is the CMS setting in each edition; the Cyrillic edition transliterates the Uzbek one', async () => {
    await setLabels({ uz: 'Reklama · Hamkor maqolasi', ru: 'Реклама · Материал партнёра', en: 'Advertisement · Sponsored by a partner' })
    expect(await cms.getSponsoredLabel('uz')).toBe('Reklama · Hamkor maqolasi')
    expect(await cms.getSponsoredLabel('kr')).toBe(toCyrillic('Reklama · Hamkor maqolasi'))
    expect(await cms.getSponsoredLabel('ru')).toBe('Реклама · Материал партнёра')
    expect(await cms.getSponsoredLabel('en')).toBe('Advertisement · Sponsored by a partner')
    // The public content API reads it from the adapter CONTENT_SOURCE picks.
    expect(await getSponsoredLabel('uz')).toBe('Reklama · Hamkor maqolasi')
  })

  it('is read once for every edition, cached under the settings tag', async () => {
    reads.clear()
    await cms.getSponsoredLabel('ru')
    expect([...reads.keys()]).toEqual(['content|site-labels'])
    expect(reads.get('content|site-labels')!.tags).toEqual([TAG.settings])
  })

  it('falls back to the interface message when the setting is empty, so nothing changes on the page', async () => {
    await setLabels({ uz: '', ru: null, en: '   ' })
    for (const l of locales) expect([l, await cms.getSponsoredLabel(l)]).toEqual([l, message(l)])
  })

  it('in the default wording is exactly what the site showed before, the Cyrillic edition included', async () => {
    await setLabels({ uz: 'Reklama · Hamkorlik materiali', ru: 'Реклама · Партнёрский материал', en: 'Advertisement · Partner content' })
    for (const l of locales) {
      expect([l, await cms.getSponsoredLabel(l)]).toEqual([l, message(l)])
      expect([l, mock.getSponsoredLabel(l)]).toEqual([l, message(l)])
    }
  })

  it('prefixes partner content in the RSS feed', async () => {
    const payload = await testPayload()
    await setLabels({ uz: 'Reklama · Hamkor maqolasi' })
    const title = `Hamkor sinovi ${RUN}`
    const partner = await payload.create({
      collection: 'articles',
      data: {
        title,
        slug: `hamkor-sinovi-${RUN}`,
        workflowStatus: 'published',
        lead: 'Hamkor tashkilot yangi xizmatini taqdim etdi.',
        body: body('Xizmat haqida maʼlumot.'),
        rubric: (await rubric('yangiliklar')).id,
        authors: [(await author('labels-partner')).id],
        sources: [{ title: 'Press-reliz', publisher: 'Hamkor' }],
        sponsored: { enabled: true, partner: 'Hamkor MChJ', disclosure: 'Reklama: material hamkor buyurtmasi bilan tayyorlangan.', contractRef: 'SH-1' },
        publishedAt: new Date().toISOString(),
        firstPublishedAt: new Date().toISOString(),
        _status: 'published',
      } as never,
      depth: 0,
      context: AS_IMPORT,
      overrideAccess: true,
    })
    // Another file's kind of fixture: published, with no publication date. It must not change the result.
    await story({ tag: 'labels-undated', rubric: (await rubric('yangiliklar')).id, authors: [(await author('labels-undated')).id] })
    feed.only = String(partner.id)
    try {
      const xml = await buildRss('uz')
      expect(xml).toContain(`<title>Reklama · Hamkor maqolasi: ${title}</title>`)
    } finally {
      feed.only = undefined
    }
  })
})
