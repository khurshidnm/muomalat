import { describe, expect, it } from 'vitest'

import { paths } from '@/lib/routes'
import {
  articleTargets,
  globalTargets,
  internalOf,
  mergeTargets,
  PAGE,
  parseTargets,
  redirectTargets,
  shortLinkUrls,
  TAG,
  utmQuery,
  type ArticleFacts,
} from '@/payload/delivery/tags'

/** The tag names and the change → targets map (CMS-SPEC §8.3, §8.5), without a database. */
const facts = (over: Partial<ArticleFacts> = {}): ArticleFacts => ({
  rubric: 'tahlil',
  slug: 'islom-oynasi',
  tags: ['murobaha'],
  authors: ['aziza-rahimova'],
  terms: ['sukuk'],
  shortCode: 'ab12cd',
  ...over,
})

describe('tag names (§8.3)', () => {
  it('match the spec', () => {
    expect([TAG.articles, TAG.article(7), TAG.rubric('tahlil'), TAG.tag('t'), TAG.author('a')]).toEqual(['articles', 'article:7', 'rubric:tahlil', 'tag:t', 'author:a'])
    expect([TAG.glossary, TAG.term('sukuk'), TAG.institutions, TAG.milestones, TAG.club, TAG.clubEvent('5-uchrashuv')]).toEqual([
      'glossary',
      'term:sukuk',
      'institutions',
      'milestones',
      'club',
      'club:5-uchrashuv',
    ])
    expect([TAG.home, TAG.settings, TAG.navigation, TAG.ads, TAG.rules, TAG.corrections, TAG.redirects, TAG.shortlinks]).toEqual([
      'home',
      'settings',
      'navigation',
      'ads',
      'rules',
      'corrections',
      'redirects',
      'shortlinks',
    ])
  })

  it('page paths mirror src/lib/routes.ts', () => {
    expect(PAGE.article('tahlil', 'x')).toBe(paths.article({ rubric: 'tahlil', slug: 'x' }))
    for (const k of ['home', 'glossary', 'market', 'club', 'about', 'rss'] as const) expect(PAGE[k]()).toBe(paths[k]())
    expect(PAGE.rubric('dunyo')).toBe(paths.rubric('dunyo'))
    expect(PAGE.term('sukuk')).toBe(paths.term('sukuk'))
    expect(PAGE.clubEvent('a')).toBe(paths.clubEvent('a'))
    expect(PAGE.tag('a')).toBe(paths.tag('a'))
    expect(PAGE.author('a')).toBe(paths.author('a'))
  })
})

describe('article targets (§8.5)', () => {
  it('covers all four editions, both uz OG and RSS forms, home, rubric and the sitemap', () => {
    const t = articleTargets({ id: 3, after: facts(), first: true })
    const p = '/tahlil/islom-oynasi'
    expect(t.expire).toEqual(['article:3', 'shortlinks'])
    expect(t.tags).toEqual(['articles', 'home', 'rubric:tahlil', 'tag:murobaha', 'author:aziza-rahimova', 'term:sukuk'])
    for (const l of ['uz', 'kr', 'ru', 'en']) {
      expect(t.paths).toContain(`/${l}${p}`)
      expect(t.paths).toContain(`/${l}${p}/opengraph-image`)
      expect(t.paths).toContain(`/${l}/rss.xml`)
      expect(t.paths).toContain(`/${l}`)
      expect(t.paths).toContain(`/${l}/tahlil`)
    }
    expect(t.paths).toEqual(expect.arrayContaining([`${p}/opengraph-image`, '/rss.xml', '/sitemap.xml']))
    expect(t.urls).toEqual(expect.arrayContaining([p, `/kr${p}`, `/ru${p}`, `/en${p}`, '/', '/kr', '/ru', '/en', `/uz${p}/opengraph-image`]))
    expect(t.urls).not.toContain('/uz/rss.xml')
    expect(t.first).toBe(true)
  })

  it('a move adds the old address and prefixes, and refreshes the short link', () => {
    const t = articleTargets({ id: 3, before: facts(), after: facts({ rubric: 'dunyo', slug: 'yangi' }) })
    expect(t.prefixes).toEqual(['/tahlil/islom-oynasi', '/kr/tahlil/islom-oynasi', '/ru/tahlil/islom-oynasi', '/en/tahlil/islom-oynasi'])
    expect(t.paths).toEqual(expect.arrayContaining(['/uz/tahlil/islom-oynasi', '/uz/dunyo/yangi', '/uz/tahlil', '/uz/dunyo']))
    expect(t.urls).toEqual(expect.arrayContaining(shortLinkUrls('ab12cd')))
    expect(t.expire).toContain('shortlinks')
  })

  it('a removal expires the lists instead of marking them stale', () => {
    const t = articleTargets({ id: 3, before: facts(), removal: true, everyVariant: true })
    expect(t.tags).toEqual([])
    expect(t.expire).toEqual(expect.arrayContaining(['article:3', 'articles', 'home', 'rubric:tahlil']))
    expect(t.warm).not.toContain('/tahlil/islom-oynasi')
    expect(t.prefixes).toEqual(['/tahlil/islom-oynasi', '/kr/tahlil/islom-oynasi', '/ru/tahlil/islom-oynasi', '/en/tahlil/islom-oynasi'])
  })

  it('an ordinary change purges exact URLs only', () => {
    expect(articleTargets({ id: 3, before: facts(), after: facts() }).prefixes).toEqual([])
  })

  it('purges the UTM variant readers reach from the channel', () => {
    const t = articleTargets({ id: 3, after: facts({ utmContent: '991' }) })
    expect(t.urls).toContain(`/ru/tahlil/islom-oynasi?${utmQuery('991')}`)
    expect(utmQuery('991')).toBe('utm_source=telegram&utm_medium=channel&utm_campaign=muomalatuz&utm_content=991')
  })
})

describe('globals and redirects', () => {
  it('settings and navigation revalidate the [lang] layout and purge the zone', () => {
    for (const slug of ['site-settings', 'navigation']) {
      const t = globalTargets(slug)
      expect(t.layouts).toEqual(['/[lang]'])
      expect(t.purgeEverything).toBe(true)
    }
    expect(globalTargets('site-settings').tags).toEqual(['settings'])
  })

  it('ad slots purge only the pages that carry the changed slot', () => {
    const home = globalTargets('ad-slots', ['home-mid'])
    expect(home.purgeEverything).toBeUndefined()
    expect(home.urls).toEqual(['/', '/kr', '/ru', '/en'])
    expect(globalTargets('ad-slots', ['rubric-dunyo-rail']).urls).toEqual(['/dunyo', '/kr/dunyo', '/ru/dunyo', '/en/dunyo'])
    expect(globalTargets('ad-slots', ['article-rail']).purgeEverything).toBe(true)
    expect(globalTargets('ad-slots').purgeEverything).toBe(true)
  })

  it('a redirect revalidates the internal form of its old address', () => {
    expect(internalOf('/tahlil/eski')).toBe('/uz/tahlil/eski')
    expect(internalOf('/ru/tahlil/eski')).toBe('/ru/tahlil/eski')
    const t = redirectTargets(['/tahlil/eski?x=1', '//evil.example/x'])
    expect(t.paths).toEqual(['/uz/tahlil/eski'])
    expect(t.urls).toEqual(['/tahlil/eski'])
    expect(t.expire).toEqual(['redirects'])
  })
})

describe('targets JSON', () => {
  it('merging removes duplicates and an expired tag is not also stale', () => {
    const m = mergeTargets(articleTargets({ id: 1, after: facts() }), articleTargets({ id: 2, before: facts(), removal: true }))
    expect(m.tags).not.toContain('articles')
    expect(m.expire).toEqual(expect.arrayContaining(['article:1', 'article:2', 'articles']))
    expect(new Set(m.urls).size).toBe(m.urls.length)
  })

  it('parseTargets accepts targets and refuses anything else', () => {
    expect(parseTargets(articleTargets({ id: 1, after: facts() }))).toBeTruthy()
    expect(parseTargets({ tags: 'articles' })).toBeUndefined()
    expect(parseTargets({ paths: [1] })).toBeUndefined()
    expect(parseTargets([])).toBeUndefined()
    expect(parseTargets(null)).toBeUndefined()
    expect(parseTargets({})).toEqual({ expire: [], tags: [], paths: [], layouts: [], urls: [], warm: [], prefixes: [] })
  })
})
