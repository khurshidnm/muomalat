import { afterEach, describe, expect, it } from 'vitest'

import * as mock from '@/content/adapters/mock'
import * as content from '@/content'
import { cached, cachedOrMissing, Missing, setCacheImpl } from '@/content/adapters/cms/cache'
import { cyrillic, translationGate } from '@/content/adapters/cms/locale'
import { imageRef, mediaFile, type MediaRow } from '@/content/adapters/cms/media'
import { normalizePath, redirectTarget } from '@/content/adapters/cms/redirects'
import { tashkentIso, tashkentIsoOrUndefined } from '@/content/dates'
import { bodySearchText, compactSearchText, normalize } from '@/content/query'
import { CONTENT_NOW, isSlug } from '@/content/shared'
import { deepCyrillic, setTranslitExceptions, toCyrillic } from '@/i18n/translit'
import { locales } from '@/i18n/config'

/**
 * The content layer without a database: the async API over the mock adapter,
 * the clock, date offsets, the read-time helpers of the Payload adapter
 * (translation gate, Cyrillic, media mapping, redirects) and the cache
 * wrapper outside Next.js.
 */

afterEach(() => {
  process.env.CONTENT_SOURCE = 'mock'
  setCacheImpl(undefined)
  setTranslitExceptions(undefined)
})

describe('async API over the mock adapter (CONTENT_SOURCE=mock)', () => {
  it('returns what the synchronous mock adapter returns, for every edition', async () => {
    process.env.CONTENT_SOURCE = 'mock'
    expect(content.contentSource()).toBe('mock')
    for (const l of locales) {
      expect(await content.getArticles(l)).toEqual(mock.getArticles(l))
      expect(await content.getGlossary(l)).toEqual(mock.getGlossary(l))
      expect(await content.getInstitutions(l)).toEqual(mock.getInstitutions(l))
      expect(await content.getMilestones(l)).toEqual(mock.getMilestones(l))
      expect(await content.getClubEvents(l)).toEqual(mock.getClubEvents(l))
      expect(await content.getAuthors(l)).toEqual(mock.getAuthors(l))
      expect(await content.getTags(l)).toEqual(mock.getTags(l))
      expect(await content.getRubrics(l)).toEqual(mock.getRubrics(l))
      expect(await content.search(l, 'murobaha')).toEqual(mock.search(l, 'murobaha'))
      expect(await content.getTermOfDay(l)).toEqual(mock.getTermOfDay(l))
    }
    const a = mock.getArticles('uz')[3]
    expect(await content.getArticle('ru', a.rubric, a.slug)).toEqual(mock.getArticle('ru', a.rubric, a.slug))
    expect(await content.getRelated('uz', a, 4)).toEqual(mock.getRelated('uz', a, 4))
    expect(await content.resolveRedirect('/tahlil/eski')).toBeUndefined()
    expect(await content.isPreview()).toBe(false)
  })

  it('keeps the mock clock; the CMS uses the time of the render', () => {
    process.env.CONTENT_SOURCE = 'mock'
    expect(content.contentNow()).toBe(CONTENT_NOW)
    process.env.CONTENT_SOURCE = 'payload'
    const now = content.contentNow()
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:00$/)
    expect(Math.abs(Date.parse(now) - Date.now())).toBeLessThan(5_000)
  })

  it('checks slugs before any read (§8.1)', () => {
    for (const s of ['murobaha', 'oktabr-2026-ijora-uskuna', 'a1']) expect(isSlug(s)).toBe(true)
    for (const s of ['', 'Murobaha', 'a--b', '-a', "a'; drop", '../x', 'a b', 'x'.repeat(201)]) expect(isSlug(s)).toBe(false)
    // Every mock slug passes the check, so no mock page turns into a 404.
    for (const l of ['uz'] as const) {
      for (const a of mock.getArticles(l)) expect(isSlug(a.slug), a.slug).toBe(true)
      for (const t of mock.getGlossary(l)) expect(isSlug(t.slug), t.slug).toBe(true)
      for (const e of mock.getClubEvents(l)) expect(isSlug(e.slug), e.slug).toBe(true)
      for (const t of mock.getTags(l)) expect(isSlug(t.slug), t.slug).toBe(true)
      for (const a of mock.getAuthors(l)) expect(isSlug(a.slug), a.slug).toBe(true)
    }
  })
})

describe('dates with the Tashkent offset (PHASE0 §1.8)', () => {
  it('formats Payload UTC strings as +05:00 to the second', () => {
    expect(tashkentIso('2026-10-08T04:40:00.000Z')).toBe('2026-10-08T09:40:00+05:00')
    expect(tashkentIso('2026-10-07T21:30:15.250Z')).toBe('2026-10-08T02:30:15+05:00')
    expect(tashkentIso(new Date('2026-12-31T19:00:00Z'))).toBe('2027-01-01T00:00:00+05:00')
    // The mock dates survive the round trip through UTC.
    for (const a of mock.getArticles('uz')) expect(tashkentIso(new Date(a.publishedAt).toISOString())).toBe(a.publishedAt)
    expect(tashkentIsoOrUndefined(null)).toBeUndefined()
    expect(tashkentIsoOrUndefined('')).toBeUndefined()
    expect(tashkentIsoOrUndefined('not a date')).toBeUndefined()
  })
})

describe('search text', () => {
  it('the compact index answers every query word as the full text does', () => {
    const term = (slug: string) => mock.getTerm('uz', slug)?.term
    for (const a of mock.getArticles('uz')) {
      const full = bodySearchText(a.body, term)
      const compact = compactSearchText(full)
      for (const w of ['murobaha', 'oyna', 'mlrd', 'ijara', 'shartnoma', '2026-yil', 'bank', 'zzz', 'a', '«']) {
        const word = normalize(w)
        expect(compact.includes(word), `${a.id} ${w}`).toBe(full.includes(word))
      }
      expect(compact.length).toBeLessThanOrEqual(full.length)
    }
  })
})

describe('translation gate (§6.3)', () => {
  const hash = () => 'h1'
  it('opens for approved, or outdated after an update, with a matching hash', () => {
    expect(translationGate({ status: 'approved', contentHash: 'h1' }, hash)).toBe('approved')
    expect(translationGate({ status: 'outdated', contentHash: 'h1' }, hash)).toBe('outdated')
  })
  it('stays shut otherwise', () => {
    expect(translationGate({ status: 'in_edit', contentHash: 'h1' }, hash)).toBeUndefined()
    expect(translationGate({ status: 'machine_draft' }, hash)).toBeUndefined()
    expect(translationGate({ status: 'missing' }, hash)).toBeUndefined()
    expect(translationGate(undefined, hash)).toBeUndefined()
    // A copied or forged status without the right hash.
    expect(translationGate({ status: 'approved', contentHash: 'other' }, hash)).toBeUndefined()
    expect(translationGate({ status: 'approved', contentHash: null }, hash)).toBeUndefined()
    // After a correction the hook clears the hash: the outdated translation is hidden.
    expect(translationGate({ status: 'outdated', contentHash: null }, hash)).toBeUndefined()
  })
  it('decides on the status alone where no hook stores a hash', () => {
    expect(translationGate({ status: 'approved' }, undefined)).toBe('approved')
    expect(translationGate({ status: 'in_edit' }, undefined)).toBeUndefined()
  })
})

describe('Cyrillic (§6.4)', () => {
  it('is deepCyrillic of the Latin view, with dates and codes put back', () => {
    const view = { title: 'Litsenziya berildi', firstPublishedAt: '2026-10-08T09:40:00+05:00', withdrawn: { at: '2026-10-09T10:00:00+05:00', notice: 'Olib tashlandi' }, shortCode: 'ab12cd' }
    const out = cyrillic(view, ['firstPublishedAt', 'withdrawn.at', 'shortCode'])
    expect(out.title).toBe(toCyrillic(view.title))
    expect(out.withdrawn.notice).toBe(toCyrillic('Olib tashlandi'))
    expect(out.firstPublishedAt).toBe(view.firstPublishedAt)
    expect(out.withdrawn.at).toBe(view.withdrawn.at)
    expect(out.shortCode).toBe('ab12cd')
    // Without the restore deepCyrillic would turn the T of the date and the code into Cyrillic.
    expect(deepCyrillic(view).shortCode).not.toBe('ab12cd')
  })

  it('takes the editor-maintained exceptions on top of the built-in rules', () => {
    const text = 'Kompyuter va litsenziya, AAOIFI, NEWCO'
    const before = toCyrillic(text)
    expect(before).toBe('Компютер ва лицензия, AAOIFI, НЕВСО')
    setTranslitExceptions({ exceptions: [{ latin: 'kompyuter', cyrillic: 'компьютер' }, { latin: 'litsenziya', cyrillic: 'XXX' }], keep: ['NEWCO'] })
    // The new stem and the kept word apply; a built-in stem keeps its spelling.
    expect(toCyrillic(text)).toBe('Компьютер ва лицензия, AAOIFI, NEWCO')
    setTranslitExceptions(undefined)
    expect(toCyrillic(text)).toBe(before)
  })

  it('with an empty exception list, transliterates the mock texts exactly as before', () => {
    const texts = mock.getArticles('uz').flatMap((a) => [a.title, a.lead, ...a.body.flatMap((b) => ('text' in b && typeof b.text === 'string' ? [b.text] : []))])
    const before = texts.map(toCyrillic)
    setTranslitExceptions({ exceptions: [], keep: [] })
    expect(texts.map(toCyrillic)).toEqual(before)
  })
})

describe('media mapping (§3.12, §6.5)', () => {
  const row: MediaRow = {
    id: 7,
    alt: { uz: 'Bank zali', ru: 'Зал банка', en: 'Bank hall' },
    credit: { uz: 'Foto: Muomalat', ru: 'Фото: Muomalat', en: null },
    caption: { uz: 'Izoh' },
    filename: 'bank-hall.webp',
    width: 3000,
    height: 2000,
    sizes: { wide: { filename: 'bank-hall-1600x1067.webp', width: 1600, height: 1067 } },
    creator: 'Muomalat',
    copyrightNotice: '© Muomalat, 2026',
    licenceUrl: null,
  }

  it('serves the wide rendition through /api/media/file with its size', () => {
    expect(mediaFile(row)).toEqual({ src: '/api/media/file/bank-hall-1600x1067.webp', width: 1600, height: 1067 })
    expect(mediaFile({ ...row, sizes: { wide: { filename: null } } })).toEqual({ src: '/api/media/file/bank-hall.webp', width: 3000, height: 2000 })
    expect(mediaFile({ id: 1, filename: 'a b.webp', width: 10, height: 5 })?.src).toBe('/api/media/file/a%20b.webp')
    expect(mediaFile({ id: 1 })).toBeUndefined()
  })

  it('takes alt and credit in the language of the text around it, falling back to Uzbek', () => {
    expect(imageRef(row, 'uz', { caption: 'Izoh' })).toEqual({
      src: '/api/media/file/bank-hall-1600x1067.webp',
      alt: 'Bank zali',
      width: 1600,
      height: 1067,
      caption: 'Izoh',
      credit: 'Foto: Muomalat',
      translations: { ru: { alt: 'Зал банка', credit: 'Фото: Muomalat' }, en: { alt: 'Bank hall' } },
      creator: 'Muomalat',
      copyrightNotice: '© Muomalat, 2026',
    })
    const en = imageRef(row, 'en')!
    expect([en.alt, en.credit]).toEqual(['Bank hall', 'Foto: Muomalat'])
    expect(imageRef(row, 'ru')!.alt).toBe('Зал банка')
  })

  it('renders decorative images with alt="" and portraits with the person’s name', () => {
    expect(imageRef({ ...row, decorative: true }, 'uz')).toMatchObject({ alt: '', decorative: true })
    expect(imageRef(row, 'ru', { altOverride: 'Shuhrat Mirzayev' })!.alt).toBe('Shuhrat Mirzayev')
  })
})

describe('redirects (§8.8)', () => {
  it('keeps the edition of the old address for document targets', () => {
    const map: [string, string][] = [
      ['/tahlil/eski', '~/tahlil/yangi'],
      ['/ru/lugat/eski', '~/lugat/yangi'],
      ['/kampaniya', 'https://example.org/x'],
    ]
    expect(redirectTarget(map, '/tahlil/eski')).toBe('/tahlil/yangi')
    expect(redirectTarget(map, '/tahlil/eski/')).toBe('/tahlil/yangi')
    expect(redirectTarget(map, '/ru/lugat/eski')).toBe('/ru/lugat/yangi')
    expect(redirectTarget(map, '/kampaniya')).toBe('https://example.org/x')
    expect(redirectTarget(map, '/ru/tahlil/eski')).toBeUndefined()
    expect(normalizePath('/A/B/')).toBe('/a/b')
  })
})

describe('cache wrapper (§8.2)', () => {
  it('runs the read uncached outside Next.js', async () => {
    let calls = 0
    expect(await cached(['k'], { tags: ['articles'], revalidate: 60 }, async () => ++calls)).toBe(1)
    expect(await cached(['k'], { tags: ['articles'], revalidate: 60 }, async () => ++calls)).toBe(2)
  })

  it('never caches a miss, and passes other errors on', async () => {
    const seen: string[][] = []
    setCacheImpl(async (fn, key) => {
      seen.push(key)
      return fn()
    })
    expect(await cachedOrMissing(['a', '1'], { tags: ['articles', 'article:1'], revalidate: 60 }, async () => { throw new Missing('a') })).toBeUndefined()
    await expect(cached(['b'], { tags: [], revalidate: 60 }, async () => { throw new Error('db down') })).rejects.toThrow('db down')
    expect(seen).toEqual([['content', 'a', '1'], ['content', 'b']])
  })
})
