/**
 * Content query layer. Pages call only these functions (CMS-SPEC §8.1): the
 * same names and arguments as before the CMS, now returning promises.
 *
 * CONTENT_SOURCE picks the implementation:
 * - `payload` (the default): published content from the CMS through the
 *   Payload Local API, cached with unstable_cache and the §8.3 tags
 *   (./adapters/payload.ts). In draft mode on the CMS host, single documents
 *   are read as the signed-in staff member, uncached (§5.13).
 * - `mock`: the typed data files in src/content/data, localised exactly as
 *   before (./adapters/mock.ts), for front-end work without a database and
 *   for tests.
 *
 * Localisation is the same in both: Uzbek Latin is the source, `kr` is
 * transliterated at read time, and ru/en show a translation only where one
 * exists (in the CMS: is approved, §6.3); otherwise the Uzbek original with
 * `contentLang: 'uz'`, so pages set lang="uz" and canonicalise to Uzbek.
 */
import { permanentRedirect } from 'next/navigation'
import type { Locale } from '@/i18n/config'
import type { Article, Author, ClubEvent, GlossaryTerm, Institution, Milestone, RubricSlug, Tag } from './types'
import type { ArticleView, Localized, RubricView } from './views'
import type { SearchResults } from './query'
import { contentNow, contentSource } from './clock'

export type * from './types'
export type { ArticleView, Localized, RubricView } from './views'
export type { SearchResults } from './query'
export { articlePath, CONTENT_NOW, isCommercialAuthor, isRubric, isSlug, rubricSlugs } from './shared'
export { contentNow, contentSource, type ContentSource } from './clock'

const adapter = () => (contentSource() === 'mock' ? import('./adapters/mock') : import('./adapters/payload'))

// ── Rubrics ───────────────────────────────────────────────────────────────

export async function getRubrics(locale: Locale): Promise<RubricView[]> {
  return (await adapter()).getRubrics(locale)
}

export async function getRubric(locale: Locale, slug: RubricSlug): Promise<RubricView> {
  return (await adapter()).getRubric(locale, slug)
}

// ── Articles ──────────────────────────────────────────────────────────────
// Lists leave withdrawn stories out (§5.8); getArticle still returns them, so
// their address shows the withdrawal notice.

export async function getArticles(locale: Locale): Promise<ArticleView[]> {
  return (await adapter()).getArticles(locale)
}

export async function getArticle(locale: Locale, rubric: string, slug: string): Promise<ArticleView | undefined> {
  return (await adapter()).getArticle(locale, rubric, slug)
}

export async function getArticleById(locale: Locale, id: string): Promise<ArticleView | undefined> {
  return (await adapter()).getArticleById(locale, id)
}

export async function getArticlesByRubric(locale: Locale, rubric: RubricSlug): Promise<ArticleView[]> {
  return (await adapter()).getArticlesByRubric(locale, rubric)
}

export async function getArticlesByTag(locale: Locale, tag: string): Promise<ArticleView[]> {
  return (await adapter()).getArticlesByTag(locale, tag)
}

export async function getArticlesByAuthor(locale: Locale, author: string): Promise<ArticleView[]> {
  return (await adapter()).getArticlesByAuthor(locale, author)
}

export async function getArticlesByTerm(locale: Locale, term: string): Promise<ArticleView[]> {
  return (await adapter()).getArticlesByTerm(locale, term)
}

/** Home page lead: the newest featured story. */
export async function getLeadStory(locale: Locale): Promise<ArticleView | undefined> {
  return (await adapter()).getLeadStory(locale)
}

export async function getLatest(locale: Locale, limit = 10, exclude: string[] = []): Promise<ArticleView[]> {
  return (await adapter()).getLatest(locale, limit, exclude)
}

export async function getMostRead(locale: Locale, limit = 5): Promise<ArticleView[]> {
  return (await adapter()).getMostRead(locale, limit)
}

export async function getRelated(locale: Locale, article: Article, limit = 4): Promise<ArticleView[]> {
  return (await adapter()).getRelated(locale, article, limit)
}

// ── Authors and tags ──────────────────────────────────────────────────────

/**
 * Bylines and topics are site vocabulary, so ru/en show their translations
 * (contentLang = the edition); an entry without one falls back to Uzbek with
 * contentLang 'uz', which components put on the element as lang.
 */
export async function getAuthors(locale: Locale): Promise<Localized<Author>[]> {
  return (await adapter()).getAuthors(locale)
}

export async function getAuthor(locale: Locale, slug: string): Promise<Localized<Author> | undefined> {
  return (await adapter()).getAuthor(locale, slug)
}

export async function getTags(locale: Locale): Promise<Localized<Tag>[]> {
  return (await adapter()).getTags(locale)
}

export async function getTag(locale: Locale, slug: string): Promise<Localized<Tag> | undefined> {
  return (await adapter()).getTag(locale, slug)
}

// ── Glossary ──────────────────────────────────────────────────────────────

export async function getGlossary(locale: Locale): Promise<Localized<GlossaryTerm>[]> {
  return (await adapter()).getGlossary(locale)
}

export async function getTerm(locale: Locale, slug: string): Promise<Localized<GlossaryTerm> | undefined> {
  return (await adapter()).getTerm(locale, slug)
}

/** Deterministic term of the day for a given ISO date (default: the content clock). */
export async function getTermOfDay(locale: Locale, isoDate: string = contentNow()): Promise<Localized<GlossaryTerm> | undefined> {
  return (await adapter()).getTermOfDay(locale, isoDate)
}

// ── Market map ────────────────────────────────────────────────────────────

export async function getInstitutions(locale: Locale): Promise<Localized<Institution>[]> {
  return (await adapter()).getInstitutions(locale)
}

export async function getMilestones(locale: Locale): Promise<Localized<Milestone>[]> {
  return (await adapter()).getMilestones(locale)
}

// ── Club ──────────────────────────────────────────────────────────────────

export async function getClubEvents(locale: Locale): Promise<Localized<ClubEvent>[]> {
  return (await adapter()).getClubEvents(locale)
}

export async function getNextClubEvent(locale: Locale): Promise<Localized<ClubEvent> | undefined> {
  return (await adapter()).getNextClubEvent(locale)
}

export async function getPastClubEvents(locale: Locale): Promise<Localized<ClubEvent>[]> {
  return (await adapter()).getPastClubEvents(locale)
}

export async function getClubEvent(locale: Locale, slug: string): Promise<Localized<ClubEvent> | undefined> {
  return (await adapter()).getClubEvent(locale, slug)
}

// ── Search ────────────────────────────────────────────────────────────────

/**
 * Plain-text search across headlines, leads, bodies, glossary and the market
 * map. The query is used in memory only; it never reaches a database filter
 * (§8.1).
 */
export async function search(locale: Locale, query: string): Promise<SearchResults> {
  return (await adapter()).search(locale, query)
}

// ── Preview (§5.13) ───────────────────────────────────────────────────────

/** True while a signed-in staff member previews drafts on the CMS host (draft mode); never with mock content. */
export async function isPreview(): Promise<boolean> {
  if (contentSource() === 'mock') return false
  return (await import('./adapters/cms/preview')).isPreviewing()
}

// ── Redirects (§8.8) ──────────────────────────────────────────────────────

/**
 * For a page about to 404: the public path an old address now redirects to
 * (the `redirects` collection, or an earlier slug of a story), or undefined.
 */
export async function resolveRedirect(path: string): Promise<string | undefined> {
  return (await adapter()).resolveRedirect(path)
}

/** Call before notFound(): answers with a permanent redirect when the address has moved. */
export async function resolveMissing(path: string): Promise<void> {
  const to = await resolveRedirect(path)
  if (to && to !== path) permanentRedirect(to)
}
