/**
 * Payload content adapter (CONTENT_SOURCE=payload, CMS-SPEC §8).
 *
 * Reads: the Local API with no user and `overrideAccess: false`, so only
 * published documents come back (./cms/client.ts). Each read is cached with
 * unstable_cache under the §8.3 tags from src/payload/delivery/tags.ts
 * (Option B, §8.2): per edition, one index of every story (summaries), one
 * entry per full story (`article:<id>`), and one entry each for the glossary,
 * the vocabulary, the market map and the club. Lists by rubric, tag, author
 * or term are filtered from the index, which every change to them already
 * invalidates through `articles` (unstable_cache entries cannot nest: an
 * inner one is bypassed, so a per-list entry would rebuild the index).
 *
 * Draft mode on the CMS host (§5.13): single documents (a story, a term, a
 * meeting) are read as the signed-in staff member with `draft: true`; lists
 * stay published. Next bypasses every unstable_cache read in draft mode.
 *
 * The clock is the request time: meeting status and the term of the day are
 * computed after the cached read.
 */
import { cache } from 'react'

import type { Locale } from '@/i18n/config'
import { localePath, splitLocale } from '@/i18n/config'
import { TAG } from '@/payload/delivery/tags'
import type { Article, Author, ClubEvent, GlossaryTerm, Institution, Milestone, RubricSlug, Tag } from '../types'
import type { ArticleView, Localized, RubricView } from '../views'
import { contentNow } from '../clock'
import { isRubric, isSlug } from '../shared'
import { bodySearchText, byTerm, compactSearchText, latest, leadStory, mostRead, nextClubEvent, related, searchIn, termOfDay, type SearchResults } from '../query'
import { cached, cachedOrMissing, Missing, REVALIDATE } from './cms/cache'
import { PUBLIC, payloadClient, readAs, type Reader } from './cms/client'
import { currentReader } from './cms/preview'
import { applyTranslitRules, type Doc } from './cms/locale'
import { buildIndex, fetchArticleDocs, pathsOf, sourcesFor, articleView, type ArticleIndex } from './cms/articles'
import { loadRefs, rubricSlugsById, type Refs } from './cms/refs'
import { loadAuthors, loadRubrics, loadTags } from './cms/vocabulary'
import { fetchTermDocs, glossaryOf, termView } from './cms/glossary'
import { loadInstitutions, loadMilestones } from './cms/market'
import { eventsOf, fetchEventDocs, withStatus, type StoredEvent } from './cms/club'
import { loadRedirects, normalizePath, redirectTarget } from './cms/redirects'

/** Cyrillic output depends on the editor-maintained transliteration exceptions (§6.4): tag it with `rules`. */
const editionTags = (locale: Locale, ...tags: string[]) => (locale === 'kr' ? [...tags, TAG.rules] : tags)

// ── Transliteration exceptions (editorial-rules) ──────────────────────────

const translitRules = () =>
  cached(['translit-rules'], { tags: [TAG.rules], revalidate: REVALIDATE.vocabulary }, async () => {
    const payload = await payloadClient()
    const rules = (await payload.findGlobal({
      slug: 'editorial-rules',
      depth: 0,
      select: { translitExceptions: true, translitKeep: true } as never,
      ...readAs(PUBLIC),
    })) as unknown as { translitExceptions?: { latin?: string; cyrillic?: string; softEnd?: boolean }[]; translitKeep?: { term?: string }[] }
    return {
      exceptions: (rules.translitExceptions ?? []).map((e) => ({ latin: e.latin ?? null, cyrillic: e.cyrillic ?? null, softEnd: e.softEnd ?? null })),
      keep: (rules.translitKeep ?? []).map((k) => k.term ?? null),
    }
  })

/**
 * Load the exceptions before any Cyrillic text is made: every loader of an
 * edition calls this first (once per request through React cache), so a
 * cache miss and the refresh of a stale entry transliterate with them.
 */
const prepare = cache(async (locale: Locale) => {
  if (locale !== 'kr') return
  try {
    applyTranslitRules(await translitRules())
  } catch {
    // Without the global the built-in rules apply.
  }
})

// ── Stories ───────────────────────────────────────────────────────────────

async function loadIndex(locale: Locale, reader: Reader): Promise<ArticleIndex> {
  await prepare(locale)
  const payload = await payloadClient()
  const docs = await fetchArticleDocs(payload, reader)
  const rubric = await rubricSlugsById(payload)
  const refs = await loadRefs(payload, pathsOf(docs, rubric))
  return buildIndex(docs, locale, await sourcesFor(payload, docs, refs), reader)
}

/** The edition's index of every published story, newest first (withdrawn ones flagged). */
const articleIndex = cache((locale: Locale) =>
  cached(['article-index', locale], { tags: editionTags(locale, TAG.articles), revalidate: REVALIDATE.lists }, () => loadIndex(locale, PUBLIC)),
)

const visible = (a: ArticleView) => !a.withdrawn

async function loadFull(locale: Locale, where: Doc, reader: Reader): Promise<ArticleView> {
  await prepare(locale)
  const payload = await payloadClient()
  const docs = await fetchArticleDocs(payload, reader, where as never)
  const doc = docs[0]
  if (!doc) throw new Missing(`article ${JSON.stringify(where)}`)
  const view = articleView(doc, locale, await sourcesFor(payload, [doc]), { summary: false, reader })
  if (!view) throw new Missing(`article ${String(doc.id)} (no rubric or slug)`)
  return view
}

/** A full published story by CMS id: its own entry, expired by `article:<id>` when it changes. */
const fullArticle = cache((locale: Locale, id: string) =>
  cachedOrMissing(['article', locale, id], { tags: editionTags(locale, TAG.articles, TAG.article(id)), revalidate: REVALIDATE.documents }, () =>
    loadFull(locale, { id: { equals: id } }, PUBLIC),
  ),
)

export async function getArticles(locale: Locale): Promise<ArticleView[]> {
  return (await articleIndex(locale)).items.filter(visible)
}

/**
 * The story at /<rubric>/<slug>, withdrawn ones included (their page shows
 * the notice). A slug the cached index does not know yet (a story published
 * a moment ago) is looked up directly; misses are never cached.
 */
export async function getArticle(locale: Locale, rubric: string, slug: string): Promise<ArticleView | undefined> {
  if (!isRubric(rubric) || !isSlug(slug)) return undefined
  const reader = await currentReader()
  if (reader.kind === 'preview') {
    try {
      const view = await loadFull(locale, { slug: { equals: slug } }, reader)
      return view.rubric === rubric ? view : undefined
    } catch (error) {
      if (error instanceof Missing) return undefined
      throw error
    }
  }
  const known = (await articleIndex(locale)).items.find((a) => a.rubric === rubric && a.slug === slug)
  const id = known?.id ?? (await lookupId(rubric, slug))
  if (!id) return undefined
  const view = await fullArticle(locale, id)
  return view && view.rubric === rubric && view.slug === slug ? view : undefined
}

async function lookupId(rubric: RubricSlug, slug: string): Promise<string | undefined> {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    select: { rubric: true },
    ...readAs(PUBLIC),
  })
  const doc = docs[0] as { id: number; rubric?: unknown } | undefined
  if (!doc) return undefined
  const rubrics = await rubricSlugsById(payload)
  const r = rubrics.get(String(typeof doc.rubric === 'object' && doc.rubric ? (doc.rubric as { id: number }).id : doc.rubric))
  return r === rubric ? String(doc.id) : undefined
}

/**
 * A visible story by id, full. Mock ids that code still names (the digest's
 * "number of the week", §11.2 step 12) resolve through `legacyId`.
 */
export async function getArticleById(locale: Locale, id: string): Promise<ArticleView | undefined> {
  const index = await articleIndex(locale)
  const resolved = /^\d+$/.test(id) ? id : index.legacy.find(([legacy]) => legacy === id)?.[1]
  if (!resolved) return undefined
  const view = await fullArticle(locale, resolved)
  return view && visible(view) ? view : undefined
}

export async function getArticlesByRubric(locale: Locale, rubric: RubricSlug): Promise<ArticleView[]> {
  return (await getArticles(locale)).filter((a) => a.rubric === rubric)
}

export async function getArticlesByTag(locale: Locale, tag: string): Promise<ArticleView[]> {
  return (await getArticles(locale)).filter((a) => a.tags.includes(tag))
}

export async function getArticlesByAuthor(locale: Locale, author: string): Promise<ArticleView[]> {
  return (await getArticles(locale)).filter((a) => a.authors.includes(author))
}

/** Summaries carry no body; `terms` already holds every term the body uses (the articles hook merges them in, §3.3). */
export async function getArticlesByTerm(locale: Locale, term: string): Promise<ArticleView[]> {
  return byTerm(await getArticles(locale), term)
}

export async function getLeadStory(locale: Locale): Promise<ArticleView | undefined> {
  return leadStory(await getArticles(locale))
}

export async function getLatest(locale: Locale, limit = 10, exclude: string[] = []): Promise<ArticleView[]> {
  return latest(await getArticles(locale), limit, exclude)
}

export async function getMostRead(locale: Locale, limit = 5): Promise<ArticleView[]> {
  return mostRead(await getArticles(locale), limit)
}

export async function getRelated(locale: Locale, article: Article, limit = 4): Promise<ArticleView[]> {
  return related(await getArticles(locale), article, limit)
}

// ── Rubrics, authors and tags ─────────────────────────────────────────────

const rubricList = cache((locale: Locale) =>
  cached(['rubrics', locale], { tags: editionTags(locale, TAG.articles, TAG.navigation), revalidate: REVALIDATE.vocabulary }, async () => {
    await prepare(locale)
    return loadRubrics(await payloadClient(), locale)
  }),
)

export async function getRubrics(locale: Locale): Promise<RubricView[]> {
  return rubricList(locale)
}

export async function getRubric(locale: Locale, slug: RubricSlug): Promise<RubricView> {
  return (await getRubrics(locale)).find((r) => r.slug === slug)!
}

/** Bylines change with TAG.articles (authorTargets, §8.5). */
const authorList = cache((locale: Locale) =>
  cached(['authors', locale], { tags: editionTags(locale, TAG.articles), revalidate: REVALIDATE.vocabulary }, async () => {
    await prepare(locale)
    return loadAuthors(await payloadClient(), locale)
  }),
)

export async function getAuthors(locale: Locale): Promise<Localized<Author>[]> {
  return authorList(locale)
}

export async function getAuthor(locale: Locale, slug: string): Promise<Localized<Author> | undefined> {
  if (!isSlug(slug)) return undefined
  return (await getAuthors(locale)).find((a) => a.slug === slug)
}

const tagList = cache((locale: Locale) =>
  cached(['tags', locale], { tags: editionTags(locale, TAG.articles), revalidate: REVALIDATE.vocabulary }, async () => {
    await prepare(locale)
    return loadTags(await payloadClient(), locale)
  }),
)

export async function getTags(locale: Locale): Promise<Localized<Tag>[]> {
  return tagList(locale)
}

export async function getTag(locale: Locale, slug: string): Promise<Localized<Tag> | undefined> {
  if (!isSlug(slug)) return undefined
  return (await getTags(locale)).find((t) => t.slug === slug)
}

// ── Glossary ──────────────────────────────────────────────────────────────

/** Terms link to stories, so the glossary also follows `articles`. */
const glossaryList = cache((locale: Locale) =>
  cached(['glossary', locale], { tags: editionTags(locale, TAG.glossary, TAG.articles), revalidate: REVALIDATE.vocabulary }, async () => {
    await prepare(locale)
    const payload = await payloadClient()
    const [docs, refs] = await Promise.all([fetchTermDocs(payload, PUBLIC), loadRefs(payload)])
    return glossaryOf(docs, locale, refs, PUBLIC)
  }),
)

export async function getGlossary(locale: Locale): Promise<Localized<GlossaryTerm>[]> {
  return glossaryList(locale)
}

export async function getTerm(locale: Locale, slug: string): Promise<Localized<GlossaryTerm> | undefined> {
  if (!isSlug(slug)) return undefined
  const reader = await currentReader()
  if (reader.kind === 'preview') {
    await prepare(locale)
    const payload = await payloadClient()
    const [docs, refs] = await Promise.all([fetchTermDocs(payload, reader, slug), loadRefs(payload)])
    return docs[0] ? termView(docs[0], locale, refs, reader) : undefined
  }
  return (await getGlossary(locale)).find((t) => t.slug === slug)
}

export async function getTermOfDay(locale: Locale, isoDate: string = contentNow()): Promise<Localized<GlossaryTerm> | undefined> {
  return termOfDay(await getGlossary(locale), isoDate)
}

// ── Market map ────────────────────────────────────────────────────────────

const institutionList = cache((locale: Locale) =>
  cached(['institutions', locale], { tags: editionTags(locale, TAG.institutions), revalidate: REVALIDATE.vocabulary }, async () => {
    await prepare(locale)
    return loadInstitutions(await payloadClient(), locale)
  }),
)

export async function getInstitutions(locale: Locale): Promise<Localized<Institution>[]> {
  return institutionList(locale)
}

const milestoneList = cache((locale: Locale) =>
  cached(['milestones', locale], { tags: editionTags(locale, TAG.milestones), revalidate: REVALIDATE.vocabulary }, async () => {
    await prepare(locale)
    return loadMilestones(await payloadClient(), locale)
  }),
)

export async function getMilestones(locale: Locale): Promise<Localized<Milestone>[]> {
  return milestoneList(locale)
}

// ── Club ──────────────────────────────────────────────────────────────────

const eventList = cache((locale: Locale) =>
  cached(['club', locale], { tags: editionTags(locale, TAG.club), revalidate: REVALIDATE.vocabulary }, async (): Promise<StoredEvent[]> => {
    await prepare(locale)
    const payload = await payloadClient()
    const [docs, refs] = await Promise.all([fetchEventDocs(payload, PUBLIC), loadRefs(payload)])
    return eventsOf(payload, docs, locale, refs, PUBLIC)
  }),
)

/** Newest first, each with its status at the time of the request. */
export async function getClubEvents(locale: Locale): Promise<Localized<ClubEvent>[]> {
  const now = contentNow()
  return (await eventList(locale)).map((e) => withStatus(e, now))
}

export async function getNextClubEvent(locale: Locale): Promise<Localized<ClubEvent> | undefined> {
  return nextClubEvent(await getClubEvents(locale))
}

export async function getPastClubEvents(locale: Locale): Promise<Localized<ClubEvent>[]> {
  return (await getClubEvents(locale)).filter((e) => e.status === 'past')
}

export async function getClubEvent(locale: Locale, slug: string): Promise<Localized<ClubEvent> | undefined> {
  if (!isSlug(slug)) return undefined
  const reader = await currentReader()
  if (reader.kind === 'preview') {
    await prepare(locale)
    const payload = await payloadClient()
    const [docs, refs] = await Promise.all([fetchEventDocs(payload, reader, slug), loadRefs(payload)])
    const [event] = await eventsOf(payload, docs, locale, refs, reader)
    return event ? withStatus(event, contentNow()) : undefined
  }
  return (await getClubEvents(locale)).find((e) => e.slug === slug)
}

// ── Search ────────────────────────────────────────────────────────────────

/**
 * Normalised body text of every published story, per edition: today's
 * in-memory search over cached bodies (§8.1), until Postgres full-text
 * search replaces it (LATER). Stored as distinct tokens (compactSearchText).
 */
const searchIndex = cache((locale: Locale) =>
  cached(['search-index', locale], { tags: editionTags(locale, TAG.articles, TAG.glossary), revalidate: REVALIDATE.lists }, async () => {
    await prepare(locale)
    const payload = await payloadClient()
    const docs = await fetchArticleDocs(payload, PUBLIC)
    const rubric = await rubricSlugsById(payload)
    const refs = await loadRefs(payload, pathsOf(docs, rubric))
    const sources = await sourcesFor(payload, docs, refs)
    const glossary = await getGlossary(locale)
    const termName = (slug: string) => glossary.find((t) => t.slug === slug)?.term
    const out: [string, string][] = []
    for (const doc of docs) {
      const view = articleView(doc, locale, sources, { summary: false, reader: PUBLIC })
      if (view && visible(view)) out.push([view.id, compactSearchText(bodySearchText(view.body, termName))])
    }
    return out
  }),
)

/** The query is matched in memory only; it never reaches a database filter (§8.1). */
export async function search(locale: Locale, query: string): Promise<SearchResults> {
  const [articles, bodies, glossary, institutions] = await Promise.all([getArticles(locale), searchIndex(locale), getGlossary(locale), getInstitutions(locale)])
  const results = searchIn(locale, query, { articles, bodies: new Map(bodies), glossary, institutions })
  // Result excerpts quote the body: matched stories come back in full.
  const full = await Promise.all(results.articles.map(async (a) => (await fullArticle(locale, a.id)) ?? a))
  return { ...results, articles: full.filter(visible) }
}

// ── Redirects ─────────────────────────────────────────────────────────────

const redirectMap = cache(() =>
  cached(['redirects'], { tags: [TAG.redirects, TAG.articles], revalidate: REVALIDATE.vocabulary }, async () => {
    const payload = await payloadClient()
    return loadRedirects(payload, await loadRefs(payload))
  }),
)

/** The public path an old address now lives at: a `redirects` entry, or an earlier slug of a story. */
export async function resolveRedirect(path: string): Promise<string | undefined> {
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 512) return undefined
  const target = redirectTarget(await redirectMap(), path)
  if (target) return target
  const { locale, path: bare } = splitLocale(path)
  const index = await articleIndex(locale)
  const id = index.moved.find(([from]) => from === normalizePath(bare))?.[1]
  const story = id ? index.items.find((a) => a.id === id) : undefined
  return story ? localePath(locale, story.url) : undefined
}

/** Refs for callers outside this module (tests). */
export const _internal = { loadRefs: async (): Promise<Refs> => loadRefs(await payloadClient()) }
