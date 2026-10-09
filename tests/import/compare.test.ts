import { describe, expect, it } from 'vitest'

import { compare } from '@/payload/import/compare'
import { mediaEntries, mediaKey, rasterSize } from '@/payload/import/media'
import { expectedCorpus, mediaSrcResolver } from '@/payload/import/parity'
import { milestoneKey, mock } from '@/payload/import/source'
import { toTashkent } from '@/payload/import/shared'

/** The parity comparison rules (CMS-SPEC §11.4) and the importer's keys, without a database. */
describe('parity comparison', () => {
  const image = { src: '/images/bank-hall.svg', alt: 'Bank zali', width: 1200, height: 800 }

  it('compares image sizes as a ratio and src through the media map', () => {
    const sameSrc = (m: string, c: string) => mediaSrcResolver()(c) === m
    expect(compare(image, { ...image, src: '/api/media/file/bank-hall-1600x1067.webp', width: 1600, height: 1067 }, { sameSrc })).toEqual([])
    expect(compare(image, { ...image, src: 'http://cms.localhost:3000/api/media/file/bank-hall.webp', width: 1602, height: 1068 }, { sameSrc })).toEqual([])
    expect(compare(image, { ...image, width: 800, height: 800 }).map((d) => d.path)).toEqual(['width/height'])
    expect(compare(image, { ...image, src: '/api/media/file/city-street.webp' }, { sameSrc }).map((d) => d.path)).toEqual(['src'])
  })

  it('lets the CMS add §3.17 fields, nothing else, and treats undefined as absent', () => {
    expect(compare({ id: 'yn-01', title: 'A' }, { id: 'yn-01', title: 'A', shortCode: 'abc123', firstPublishedAt: '2026-10-08T09:40:00+05:00' })).toEqual([])
    expect(compare({ title: 'A' }, { title: 'A', editorNotes: 'x' }).map((d) => d.path)).toEqual(['editorNotes'])
    expect(compare({ title: 'A', kicker: undefined }, { title: 'A' })).toEqual([])
    expect(compare({ title: 'A' }, { title: 'A', kicker: null }).map((d) => d.path)).toEqual(['kicker'])
    expect(compare([1, 2], [1, 2, 3]).map((d) => d.path)).toEqual(['length'])
  })
})

describe('import keys', () => {
  it('names a Media item after its library file, or after the file and its own alt', () => {
    expect(mediaKey({ src: '/images/portrait-05.svg', alt: 'Shuhrat Mirzayev' })).toBe('portrait-05-shuhrat-mirzayev')
    expect(mediaKey({ src: '/images/bank-hall.svg', alt: 'Ustunlar va mijozlarga xizmat koʻrsatish oynalari boʻlgan bank zali' })).toBe('bank-hall')
    const keys = mediaEntries().map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('rasterizes at the exact mock ratio and at least 1600 px wide', () => {
    expect(rasterSize(1200, 800)).toEqual({ width: 1602, height: 1068 })
    expect(rasterSize(800, 800)).toEqual({ width: 1600, height: 1600 })
    expect(rasterSize(2400, 1600)).toEqual({ width: 2400, height: 1600 })
  })

  it('keys milestones by date and title, uniquely', () => {
    const keys = mock.milestones.map(milestoneKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('writes Tashkent time back in the mock format', () => {
    expect(toTashkent('2026-10-08T04:40:00.000Z')).toBe('2026-10-08T09:40:00+05:00')
    for (const a of mock.articles) expect(toTashkent(new Date(a.publishedAt).toISOString()), a.id).toBe(a.publishedAt)
  })

  it('the stored model differs from the mock only where the spec says: commercial byline, merged terms, no featured: false', () => {
    const want = expectedCorpus(mock)
    expect(want.authors.find((a) => a.slug === 'hamkorlik')?.commercial).toBe(true)
    expect(want.authors.find((a) => a.slug === 'aziza-rahimova')?.commercial).toBeUndefined()
    // Every term a mock body uses is already in its `terms` list, so the merged list is the mock's own.
    for (const a of mock.articles) expect(want.articles.find((x) => x.id === a.id)?.terms, a.id).toEqual(a.terms)
  })
})
