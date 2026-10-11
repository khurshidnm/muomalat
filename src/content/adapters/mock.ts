/**
 * Mock content adapter (CONTENT_SOURCE=mock): the typed data files in
 * src/content/data, localised exactly as the site did before the CMS. Used
 * for front-end work without a database, for tests and by
 * scripts/validate-content.ts. Synchronous; src/content/index.ts wraps it in
 * promises.
 *
 * Localisation: Uzbek Latin is the source. The Cyrillic edition is
 * transliterated automatically; Russian and English use an article's
 * `translations` when present and fall back to the Uzbek original
 * (marked with `contentLang: 'uz'` so pages can set lang="uz").
 */
import type { ContentLang, Locale } from '@/i18n/config'
import { deepCyrillic } from '@/i18n/translit'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { readingMinutes } from '@/lib/format'
import type { Article, ArticleBlock, Author, ClubEvent, GlossaryTerm, ImageRef, Institution, Milestone, RubricSlug, Tag } from '../types'
import type { ArticleView, Localized, RubricView } from '../views'
import { articlePath, CONTENT_NOW } from '../shared'
import { bodySearchText, byTerm, latest, leadStory, mostRead, nextClubEvent, related, searchIn, termOfDay, type SearchResults } from '../query'
import { yangiliklar } from '../data/articles/yangiliklar'
import { tahlil } from '../data/articles/tahlil'
import { intervyu } from '../data/articles/intervyu'
import { izoh } from '../data/articles/izoh'
import { dunyo } from '../data/articles/dunyo'
import { authors as allAuthors } from '../data/authors'
import { tags as allTags } from '../data/tags'
import { glossary as allTerms } from '../data/glossary'
import { institutions as allInstitutions } from '../data/institutions'
import { milestones as allMilestones } from '../data/milestones'
import { clubEvents as allEvents } from '../data/club'
import { rubrics as allRubrics } from '../data/rubrics'

const ALL_ARTICLES: Article[] = [...yangiliklar, ...tahlil, ...intervyu, ...izoh, ...dunyo].sort(
  (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
)

const cache = new Map<string, unknown>()
function memo<T>(key: string, fn: () => T): T {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key) as T
}

function localizeValue<T extends object>(value: T, locale: Locale): Localized<T> {
  if (locale === 'kr') return { ...deepCyrillic(value), contentLang: 'uz-Cyrl' }
  return { ...value, contentLang: 'uz' }
}

// ── Rubrics ───────────────────────────────────────────────────────────────

export function getRubrics(locale: Locale): RubricView[] {
  return memo(`rubrics:${locale}`, () =>
    [...allRubrics]
      .sort((a, b) => a.order - b.order)
      .map(({ translations, ...r }) => {
        const tr = locale === 'ru' || locale === 'en' ? translations?.[locale] : undefined
        if (tr) return { ...r, ...tr, contentLang: locale as ContentLang }
        return localizeValue(r, locale)
      }),
  )
}

export function getRubric(locale: Locale, slug: RubricSlug): RubricView {
  return getRubrics(locale).find((r) => r.slug === slug)!
}

/**
 * An image shown inside ru/en text: alt and credit in that language (falling
 * back to the Uzbek ones). Uzbek content keeps the Uzbek alt, matching the
 * lang="uz" its container carries.
 */
function translateImage(image: ImageRef, locale: 'ru' | 'en', caption?: string): ImageRef {
  const tr = image.translations?.[locale]
  return { ...image, alt: tr?.alt ?? image.alt, credit: tr?.credit ?? image.credit, caption }
}

function translateBlocks(body: ArticleBlock[], locale: 'ru' | 'en'): ArticleBlock[] {
  return body.map((b) => (b.type === 'figure' ? { ...b, image: translateImage(b.image, locale, b.image.caption) } : b))
}

function localizeArticle(a: Article, locale: Locale): ArticleView {
  let out: Localized<Article>
  const tl = locale === 'ru' || locale === 'en' ? locale : undefined
  const tr = tl ? a.translations?.[tl] : undefined
  if (tl && tr) {
    const { imageCaption, ...text } = tr
    out = {
      ...a,
      ...text,
      body: translateBlocks(tr.body, tl),
      kicker: tr.kicker,
      image: a.image ? translateImage(a.image, tl, imageCaption) : undefined,
      contentLang: tl,
    }
  }
  else out = localizeValue(a, locale)
  return { ...out, readingMinutes: readingMinutes(out.body, out.lead), url: articlePath(a) }
}

// ── Articles ──────────────────────────────────────────────────────────────

export function getArticles(locale: Locale): ArticleView[] {
  return memo(`articles:${locale}`, () => ALL_ARTICLES.map((a) => localizeArticle(a, locale)))
}

export function getArticle(locale: Locale, rubric: string, slug: string): ArticleView | undefined {
  return getArticles(locale).find((a) => a.rubric === rubric && a.slug === slug)
}

export function getArticleById(locale: Locale, id: string): ArticleView | undefined {
  return getArticles(locale).find((a) => a.id === id)
}

export function getArticlesByRubric(locale: Locale, rubric: RubricSlug): ArticleView[] {
  return getArticles(locale).filter((a) => a.rubric === rubric)
}

export function getArticlesByTag(locale: Locale, tag: string): ArticleView[] {
  return getArticles(locale).filter((a) => a.tags.includes(tag))
}

export function getArticlesByAuthor(locale: Locale, author: string): ArticleView[] {
  return getArticles(locale).filter((a) => a.authors.includes(author))
}

export function getArticlesByTerm(locale: Locale, term: string): ArticleView[] {
  return byTerm(getArticles(locale), term)
}

/** Home page lead: the newest featured story. */
export function getLeadStory(locale: Locale): ArticleView | undefined {
  return leadStory(getArticles(locale))
}

export function getLatest(locale: Locale, limit = 10, exclude: string[] = []): ArticleView[] {
  return latest(getArticles(locale), limit, exclude)
}

export function getMostRead(locale: Locale, limit = 5): ArticleView[] {
  return mostRead(getArticles(locale), limit)
}

export function getRelated(locale: Locale, article: Article, limit = 4): ArticleView[] {
  return related(getArticles(locale), article, limit)
}

// ── Authors and tags ──────────────────────────────────────────────────────

/**
 * Bylines and topics are site vocabulary, so ru/en show their translations
 * (contentLang = the edition); an entry without one falls back to Uzbek with
 * contentLang 'uz', which components put on the element as lang.
 */
export function getAuthors(locale: Locale): Localized<Author>[] {
  return memo(`authors:${locale}`, () =>
    allAuthors.map(({ translations, ...a }) => {
      const tr = locale === 'ru' || locale === 'en' ? translations?.[locale] : undefined
      if (tr) return { ...a, name: tr.name ?? a.name, role: tr.role, bio: tr.bio, contentLang: locale as ContentLang }
      return localizeValue(a, locale)
    }),
  )
}

export function getAuthor(locale: Locale, slug: string): Localized<Author> | undefined {
  return getAuthors(locale).find((a) => a.slug === slug)
}

export function getTags(locale: Locale): Localized<Tag>[] {
  return memo(`tags:${locale}`, () =>
    allTags.map(({ labels, ...t }) => {
      const label = locale === 'ru' || locale === 'en' ? labels?.[locale] : undefined
      if (label) return { ...t, label, contentLang: locale as ContentLang }
      return localizeValue(t, locale)
    }),
  )
}

export function getTag(locale: Locale, slug: string): Localized<Tag> | undefined {
  return getTags(locale).find((t) => t.slug === slug)
}

// ── Glossary ──────────────────────────────────────────────────────────────

export function getGlossary(locale: Locale): Localized<GlossaryTerm>[] {
  return memo(`glossary:${locale}`, () =>
    allTerms.map((t) => localizeValue(t, locale)).sort((a, b) => a.term.localeCompare(b.term, locale === 'kr' ? 'uz-Cyrl' : 'uz')),
  )
}

export function getTerm(locale: Locale, slug: string): Localized<GlossaryTerm> | undefined {
  return getGlossary(locale).find((t) => t.slug === slug)
}

/** Deterministic term of the day for a given ISO date. */
export function getTermOfDay(locale: Locale, isoDate: string = CONTENT_NOW): Localized<GlossaryTerm> | undefined {
  return termOfDay(getGlossary(locale), isoDate)
}

// ── Market map ────────────────────────────────────────────────────────────

export function getInstitutions(locale: Locale): Localized<Institution>[] {
  return memo(`institutions:${locale}`, () => allInstitutions.map((i) => localizeValue(i, locale)))
}

export function getMilestones(locale: Locale): Localized<Milestone>[] {
  return memo(`milestones:${locale}`, () =>
    [...allMilestones].sort((a, b) => a.date.localeCompare(b.date)).map((m) => localizeValue(m, locale)),
  )
}

// ── Club ──────────────────────────────────────────────────────────────────

export function getClubEvents(locale: Locale): Localized<ClubEvent>[] {
  return memo(`club:${locale}`, () =>
    [...allEvents].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)).map((e) => localizeValue(e, locale)),
  )
}

export function getNextClubEvent(locale: Locale): Localized<ClubEvent> | undefined {
  return nextClubEvent(getClubEvents(locale))
}

export function getPastClubEvents(locale: Locale): Localized<ClubEvent>[] {
  return getClubEvents(locale).filter((e) => e.status === 'past')
}

export function getClubEvent(locale: Locale, slug: string): Localized<ClubEvent> | undefined {
  return getClubEvents(locale).find((e) => e.slug === slug)
}

// ── Search ────────────────────────────────────────────────────────────────

/** Normalised plain text of every article body, per edition (built once). */
function bodyText(locale: Locale): Map<string, string> {
  return memo(`search:${locale}`, () => {
    const termName = (slug: string) => getTerm(locale, slug)?.term
    return new Map(getArticles(locale).map((a) => [a.id, bodySearchText(a.body, termName)]))
  })
}

/** Plain-text search across headlines, leads, bodies, glossary and the market map. */
export function search(locale: Locale, query: string): SearchResults {
  return searchIn(locale, query, {
    articles: getArticles(locale),
    bodies: bodyText(locale),
    glossary: getGlossary(locale),
    institutions: getInstitutions(locale),
  })
}

/** Mock data has no redirects. */
export function resolveRedirect(): string | undefined {
  return undefined
}

/** The partner-content label: the interface message, as the CMS falls back to it (src/i18n/messages/common.ts). */
export function getSponsoredLabel(locale: Locale): string {
  return pick(commonMessages, locale).labels.sponsored
}
