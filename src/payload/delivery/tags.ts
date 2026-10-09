import { localePath, locales, type Locale } from '../../i18n/config'

/**
 * Cache tags and invalidation targets (CMS-SPEC §8.3, §8.5). This is the one
 * module that names them: the content adapter tags its `unstable_cache` reads
 * with TAG, and the invalidate concern, /internal/revalidate and the outbox
 * worker invalidate with the Targets built here.
 *
 * Reads and the tags they must carry (wave 3, src/content/adapters/payload.ts):
 * - every article read (lists, summaries and the full article): TAG.articles.
 *   A full article also carries TAG.article(id). Author, tag, term and media
 *   changes reach article pages through TAG.articles (test H4);
 * - rubric, tag and author listings: TAG.rubric/tag/author(slug) as well;
 * - glossary index and term pages: TAG.glossary and TAG.term(slug);
 * - market map: TAG.institutions, TAG.milestones; club pages: TAG.club and
 *   TAG.clubEvent(slug);
 * - globals: TAG.home, TAG.settings, TAG.navigation, TAG.ads, TAG.rules;
 *   lib/rss.ts and the OG routes read through the same tagged functions;
 * - corrections list: TAG.corrections; resolveMissing: TAG.redirects;
 *   /t/<code>: TAG.shortlinks.
 * Tag names must stay under 256 characters (Next ignores longer ones); slugs
 * are short and ids are numbers, so they do.
 */
export const TAG = {
  articles: 'articles',
  article: (id: string | number) => `article:${id}`,
  rubric: (slug: string) => `rubric:${slug}`,
  tag: (slug: string) => `tag:${slug}`,
  author: (slug: string) => `author:${slug}`,
  glossary: 'glossary',
  term: (slug: string) => `term:${slug}`,
  institutions: 'institutions',
  milestones: 'milestones',
  club: 'club',
  clubEvent: (slug: string) => `club:${slug}`,
  home: 'home',
  settings: 'settings',
  navigation: 'navigation',
  ads: 'ads',
  rules: 'rules',
  corrections: 'corrections',
  redirects: 'redirects',
  shortlinks: 'shortlinks',
} as const

/**
 * What one change invalidates. Stored as JSON in `publish-events.targets` and
 * sent to /internal/revalidate, so it holds strings only. Paths here never
 * carry a host: the worker adds SITE_URL for Cloudflare and SITE_HOST for the
 * warm-up, so staging and production build the same rows.
 */
export type Targets = {
  /** revalidateTag(tag, { expire: 0 }): the next request blocks and gets fresh data. */
  expire: string[]
  /** revalidateTag(tag, 'max'): stale-while-revalidate. */
  tags: string[]
  /**
   * revalidatePath(path) on route paths: the internal /uz/… form for pages,
   * and for uz route handlers (OG images, RSS) the public form as well, because
   * an entry regenerated through the proxy rewrite is keyed by the public path
   * (PHASE0 item 9).
   */
  paths: string[]
  /** revalidatePath(pattern, 'layout'): every page under the layout. */
  layouts: string[]
  /** Public paths purged at Cloudflare by exact URL. */
  urls: string[]
  /** Public pages requested twice by the worker before the purge (§8.4 step 3.1). */
  warm: string[]
  /** Public path prefixes purged at Cloudflare; only when a slug or rubric changed. */
  prefixes: string[]
  /** Purge the whole zone: settings, navigation and rubric changes (rare). */
  purgeEverything?: boolean
  /** The change is the story's first publication (for the Telegram step, §10.3). */
  first?: boolean
}

export const emptyTargets = (): Targets => ({ expire: [], tags: [], paths: [], layouts: [], urls: [], warm: [], prefixes: [] })

const LIST_KEYS = ['expire', 'tags', 'paths', 'layouts', 'urls', 'warm', 'prefixes'] as const

/** Union of several targets, without duplicates. A tag that expires anywhere is not also marked stale. */
export function mergeTargets(...parts: Targets[]): Targets {
  const out = emptyTargets()
  for (const part of parts) {
    for (const key of LIST_KEYS) out[key].push(...part[key])
    if (part.purgeEverything) out.purgeEverything = true
    if (part.first) out.first = true
  }
  for (const key of LIST_KEYS) out[key] = [...new Set(out[key])]
  const expired = new Set(out.expire)
  out.tags = out.tags.filter((t) => !expired.has(t))
  return out
}

const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string')

/** Validates JSON read back from the outbox or a request body. */
export function parseTargets(value: unknown): Targets | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const v = value as Record<string, unknown>
  const out = emptyTargets()
  for (const key of LIST_KEYS) {
    const list = v[key] ?? []
    if (!isStringList(list)) return undefined
    out[key] = list
  }
  if (v.purgeEverything === true) out.purgeEverything = true
  if (v.first === true) out.first = true
  return out
}

export const isEmptyTargets = (t: Targets) => LIST_KEYS.every((k) => t[k].length === 0) && !t.purgeEverything

// ── paths ───────────────────────────────────────────────────────────────────
/** Every edition: Uzbek Latin at the root, then /kr, /ru, /en (src/i18n/config.ts). */
export const EDITIONS: readonly Locale[] = locales

/**
 * Locale-free page paths. They mirror `paths` in src/lib/routes.ts, which this
 * module cannot import (it uses the @/ alias, and the worker and the Payload
 * CLI load this file too); tests/delivery/targets.test.ts keeps them equal.
 */
export const PAGE = {
  home: () => '/',
  rubric: (rubric: string) => `/${rubric}`,
  article: (rubric: string, slug: string) => `/${rubric}/${slug}`,
  glossary: () => '/lugat',
  term: (slug: string) => `/lugat/${slug}`,
  market: () => '/xarita',
  club: () => '/klub',
  clubEvent: (slug: string) => `/klub/${slug}`,
  tag: (slug: string) => `/mavzu/${slug}`,
  author: (slug: string) => `/muallif/${slug}`,
  about: () => '/biz-haqimizda',
  rss: () => '/rss.xml',
  shortLink: (code: string) => `/t/${code}`,
} as const

/** Public path in an edition: /tahlil/x, /kr/tahlil/x. */
export const publicPath = (locale: Locale, path: string) => localePath(locale, path)

/** Route path behind the proxy rewrite: /uz/tahlil/x, /kr/tahlil/x. */
export const internalPath = (locale: Locale, path: string) => `/${locale}${path === '/' ? '' : path}`

/** Internal route path of a public path (a redirect's `from`): /tahlil/x → /uz/tahlil/x; /ru/… stays. */
export function internalOf(publicPathname: string): string {
  const first = publicPathname.split('/')[1] ?? ''
  if ((EDITIONS as readonly string[]).includes(first) && first !== 'uz') return publicPathname
  if (first === 'uz') return publicPathname
  return internalPath('uz', publicPathname)
}

/** Shorthand for building one change's targets. */
class Builder {
  readonly t = emptyTargets()

  expire(...tags: string[]) {
    this.t.expire.push(...tags)
    return this
  }

  stale(...tags: string[]) {
    this.t.tags.push(...tags)
    return this
  }

  /** A page in every edition: revalidated at its internal path, purged and optionally warmed at its public path. */
  page(path: string, { warm = false } = {}) {
    for (const l of EDITIONS) {
      this.t.paths.push(internalPath(l, path))
      this.t.urls.push(publicPath(l, path))
      if (warm) this.t.warm.push(publicPath(l, path))
    }
    return this
  }

  /**
   * A route handler under [lang] in every edition (OG image, RSS). In the uz
   * edition both forms are revalidated, and both are purged where both are
   * reachable from outside: the proxy serves `/uz/…/opengraph-image` as is but
   * redirects `/uz/rss.xml`.
   */
  handler(path: string, { uzInternalIsPublic }: { uzInternalIsPublic: boolean }) {
    for (const l of EDITIONS) {
      this.t.paths.push(internalPath(l, path))
      this.t.urls.push(publicPath(l, path))
    }
    this.t.paths.push(publicPath('uz', path))
    if (uzInternalIsPublic) this.t.urls.push(internalPath('uz', path))
    return this
  }

  og(path: string) {
    return this.handler(`${path}/opengraph-image`, { uzInternalIsPublic: true })
  }

  rss() {
    return this.handler(PAGE.rss(), { uzInternalIsPublic: false })
  }

  sitemap() {
    this.t.paths.push('/sitemap.xml')
    this.t.urls.push('/sitemap.xml')
    return this
  }

  /** A public path prefix in every edition (Cloudflare prefix purge). */
  prefix(path: string) {
    for (const l of EDITIONS) this.t.prefixes.push(publicPath(l, path))
    return this
  }

  /** Purge exact public URLs only (no route path). */
  url(...urls: string[]) {
    this.t.urls.push(...urls)
    return this
  }

  /** Every page of the site: the [lang] root layout, and the whole Cloudflare zone. */
  everything() {
    this.t.layouts.push('/[lang]')
    this.t.purgeEverything = true
    return this
  }

  build(): Targets {
    return mergeTargets(this.t)
  }
}

export const targets = () => new Builder()

/** `/t/<code>` and its edition variants, as Cloudflare caches them (the 301 is kept for a day). */
export const shortLinkUrls = (code: string) => [PAGE.shortLink(code), ...EDITIONS.filter((l) => l !== 'uz').map((l) => `${PAGE.shortLink(code)}?l=${l}`)]

/**
 * The query string /t/<code> appends (§8.8). `content` is the channel post's
 * message id, or the short code while posting is manual (Phase 1). Built in
 * one place because Cloudflare caches each query string as its own object:
 * the story's purge list carries these exact URLs too.
 */
export const utmQuery = (content: string) =>
  new URLSearchParams({ utm_source: 'telegram', utm_medium: 'channel', utm_campaign: 'muomalatuz', utm_content: content }).toString()

// ── change → targets (§8.5) ─────────────────────────────────────────────────
/** The public facts of a story that decide what a change touches. Slugs, not ids. */
export type ArticleFacts = {
  rubric?: string
  slug?: string
  tags: string[]
  authors: string[]
  terms: string[]
  shortCode?: string
  /** utm_content of the story's short link (see utmQuery). */
  utmContent?: string
}

export type ArticleChange = {
  id: string | number
  /** The live row before the change; undefined when the story was not public. */
  before?: ArticleFacts
  /** The live row after the change; undefined when the story is no longer public. */
  after?: ArticleFacts
  /** `about` or `mentions` changed. */
  institutions?: boolean
  /** A correction, clarification or editor's note was added. */
  corrections?: boolean
  /**
   * The story left the site or its lists (withdrawal, unpublish, delete). List
   * tags then expire instead of going stale, so no reader is served a list
   * that still carries it, even once.
   */
  removal?: boolean
  /**
   * Purge every cached variant of the story's address, not just the exact
   * URLs: a correction or a removal must also reach the copies Cloudflare
   * keeps per query string (?fbclid=…, foreign UTM tags). Costs one prefix
   * request (5 a minute on Free), so only for corrections, removals and
   * republication (H3).
   */
  everyVariant?: boolean
  first?: boolean
}

const located = (f?: ArticleFacts) => (f?.rubric && f.slug ? PAGE.article(f.rubric, f.slug) : undefined)

/**
 * Article first publication, change, withdrawal, unpublish or delete (§8.5,
 * first row): the story in four editions with its OG images, its old address
 * when the slug or rubric changed (exact and prefix purge), home, the old and
 * new rubric fronts, RSS and the sitemap. Cloudflare gets exact URLs, plus
 * prefixes for a move, a correction, a removal or a republication.
 */
export function articleTargets(c: ArticleChange): Targets {
  const b = targets()
  const facts = [c.before, c.after].filter((f): f is ArticleFacts => Boolean(f))
  const lists = [
    TAG.articles,
    TAG.home,
    ...facts.flatMap((f) => [
      ...(f.rubric ? [TAG.rubric(f.rubric)] : []),
      ...f.tags.map(TAG.tag),
      ...f.authors.map(TAG.author),
      ...f.terms.map(TAG.term),
    ]),
    ...(c.institutions ? [TAG.institutions] : []),
    ...(c.corrections ? [TAG.corrections] : []),
  ]
  b.expire(TAG.article(c.id))
  if (c.removal) b.expire(...lists)
  else b.stale(...lists)

  const was = located(c.before)
  const now = located(c.after)
  const moved = Boolean(was && now && was !== now)
  if (now) b.page(now, { warm: true }).og(now)
  if (was && was !== now) b.page(was).og(was)
  if (moved && was) b.prefix(was)
  if (c.everyVariant) for (const path of new Set([was, now])) if (path) b.prefix(path)
  // Readers who arrive from the channel land on the UTM variant, which Cloudflare caches separately.
  for (const [path, facts] of [
    [now, c.after],
    [was, c.before],
  ] as const) {
    if (path && facts?.utmContent) b.url(...EDITIONS.map((l) => `${publicPath(l, path)}?${utmQuery(facts.utmContent!)}`))
  }

  // The short link resolves to a different place, or to nothing.
  const code = c.after?.shortCode ?? c.before?.shortCode
  if (moved || !c.before || !c.after) b.expire(TAG.shortlinks)
  if (code && (moved || !c.after)) b.url(...shortLinkUrls(code))

  b.page(PAGE.home(), { warm: true })
  for (const rubric of new Set(facts.map((f) => f.rubric).filter((r): r is string => Boolean(r)))) {
    b.page(PAGE.rubric(rubric), { warm: rubric === c.after?.rubric })
  }
  if (c.corrections) b.page(PAGE.about())
  b.rss().sitemap()
  const out = b.build()
  if (c.first) out.first = true
  return out
}

/** Slug before and after; either may be missing (created, deleted, unpublished). */
export type SlugChange = { before?: string; after?: string }
const slugsOf = (s: SlugChange) => [...new Set([s.before, s.after].filter((x): x is string => Boolean(x)))]

/** Author: their page in four editions; bylines on stories through `articles` (§8.5, H4). */
export function authorTargets(s: SlugChange): Targets {
  const b = targets().stale(TAG.articles)
  for (const slug of slugsOf(s)) b.stale(TAG.author(slug)).page(PAGE.author(slug), { warm: slug === s.after })
  return b.build()
}

/** Tag: its page in four editions. */
export function tagTargets(s: SlugChange): Targets {
  const b = targets().stale(TAG.articles)
  for (const slug of slugsOf(s)) b.stale(TAG.tag(slug)).page(PAGE.tag(slug), { warm: slug === s.after })
  return b.build()
}

/** Glossary term: its page and OG image, and the glossary index, in four editions. */
export function termTargets(s: SlugChange): Targets {
  const b = targets().stale(TAG.glossary, TAG.articles).page(PAGE.glossary())
  for (const slug of slugsOf(s)) b.stale(TAG.term(slug)).page(PAGE.term(slug), { warm: slug === s.after }).og(PAGE.term(slug))
  return b.build()
}

/** Club meeting: the club page, the meeting page and OG image, and home, in four editions. */
export function clubEventTargets(s: SlugChange): Targets {
  const b = targets().stale(TAG.club).page(PAGE.club(), { warm: true }).page(PAGE.home())
  for (const slug of slugsOf(s)) b.stale(TAG.clubEvent(slug)).page(PAGE.clubEvent(slug), { warm: slug === s.after }).og(PAGE.clubEvent(slug))
  return b.build()
}

/** Institution or milestone: the market map and home, in four editions. */
export function marketTargets(tag: typeof TAG.institutions | typeof TAG.milestones): Targets {
  return targets().stale(tag).page(PAGE.market(), { warm: true }).page(PAGE.home()).build()
}

/** Media metadata (alt, credit, caption): the live stories that use the item (`mediaRefs`). */
export function mediaTargets(stories: { id: string | number; rubric?: string; slug?: string }[]): Targets {
  const b = targets().stale(TAG.articles)
  for (const s of stories) {
    b.expire(TAG.article(s.id))
    if (s.rubric && s.slug) b.page(PAGE.article(s.rubric, s.slug), { warm: true })
  }
  return b.build()
}

/**
 * Rubric name or description: the rubric front and every page's navigation,
 * so the whole site. Rubrics change about once a year.
 */
export function rubricTargets(slug?: string): Targets {
  const b = targets().stale(TAG.articles, TAG.navigation).everything()
  if (slug) b.stale(TAG.rubric(slug)).page(PAGE.rubric(slug), { warm: true })
  return b.build()
}

/**
 * A redirect: its old address may hold a cached 404 (on disk and at
 * Cloudflare), and the lookup is cached with `redirects`. The tag expires so
 * the very next request is redirected.
 */
export function redirectTargets(froms: string[]): Targets {
  const b = targets().expire(TAG.redirects)
  for (const from of new Set(froms)) {
    const path = from.split(/[?#]/)[0] || '/'
    if (!path.startsWith('/') || path.startsWith('//')) continue
    b.t.paths.push(internalOf(path))
    b.t.urls.push(path)
  }
  return b.build()
}

/** A Telegram post got its channel message id: /t/<code> carries it as utm_content (§8.8). */
export function shortLinkTargets(code?: string): Targets {
  const b = targets().expire(TAG.shortlinks)
  if (code) b.url(...shortLinkUrls(code))
  return b.build()
}

/** Which page an ad slot sits on (src/payload/globals/AdSlots.ts AD_SLOTS). */
function adSlotPage(slotId: string): string | 'everywhere' {
  if (slotId === 'home-mid' || slotId === 'home-mid-mobile') return PAGE.home()
  const rubric = /^rubric-([a-z]+)-rail$/.exec(slotId)?.[1]
  if (rubric) return PAGE.rubric(rubric)
  // article-rail, tag-rail and author-rail sit on every story, tag or author page.
  return 'everywhere'
}

/** Globals (§8.5). `changedSlots` lists the ad slot ids that changed; undefined means unknown. */
export function globalTargets(slug: string, changedSlots?: string[]): Targets {
  switch (slug) {
    case 'home-page':
      return targets().stale(TAG.home).page(PAGE.home(), { warm: true }).build()
    case 'site-settings':
      return targets().stale(TAG.settings).everything().page(PAGE.home(), { warm: true }).rss().build()
    case 'navigation':
      return targets().stale(TAG.navigation).everything().page(PAGE.home(), { warm: true }).build()
    case 'ad-slots': {
      const b = targets().stale(TAG.ads)
      const pages = changedSlots === undefined ? ['everywhere'] : changedSlots.map(adSlotPage)
      if (pages.includes('everywhere')) b.everything()
      for (const page of new Set(pages)) if (page !== 'everywhere') b.page(page, { warm: true })
      return b.build()
    }
    case 'editorial-rules':
      // Transliteration exceptions re-render /kr later (§6.4, LATER); today only the tag.
      return targets().stale(TAG.rules).build()
    default:
      return emptyTargets()
  }
}
