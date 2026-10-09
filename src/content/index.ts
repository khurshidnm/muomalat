/**
 * Content query layer. Pages call only these functions; a CMS adapter can
 * replace the implementations without touching components.
 *
 * Localisation: Uzbek Latin is the source. The Cyrillic edition is
 * transliterated automatically; Russian and English use an article's
 * `translations` when present and fall back to the Uzbek original
 * (marked with `contentLang: 'uz'` so pages can set lang="uz").
 */
import type { ContentLang, Locale } from '@/i18n/config'
import { deepCyrillic } from '@/i18n/translit'
import { readingMinutes } from '@/lib/format'
import type { Article, ArticleBlock, Author, ClubEvent, GlossaryTerm, ImageRef, Institution, Milestone, Rubric, RubricSlug, Tag } from './types'
import { yangiliklar } from './data/articles/yangiliklar'
import { tahlil } from './data/articles/tahlil'
import { intervyu } from './data/articles/intervyu'
import { izoh } from './data/articles/izoh'
import { dunyo } from './data/articles/dunyo'
import { authors as allAuthors } from './data/authors'
import { tags as allTags } from './data/tags'
import { glossary as allTerms } from './data/glossary'
import { institutions as allInstitutions } from './data/institutions'
import { milestones as allMilestones } from './data/milestones'
import { clubEvents as allEvents } from './data/club'
import { rubrics as allRubrics } from './data/rubrics'

export type * from './types'

export const rubricSlugs: RubricSlug[] = [...allRubrics].sort((a, b) => a.order - b.order).map((r) => r.slug)

export function isRubric(value: string): value is RubricSlug {
  return (rubricSlugs as string[]).includes(value)
}

/** Reference "now" for mock data: the newsroom clock the content was written against. */
export const CONTENT_NOW = '2026-10-08T16:00:00+05:00'

export type Localized<T> = T & { contentLang: ContentLang }

export type ArticleView = Localized<Article> & {
  readingMinutes: number
  url: string
}

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

export type RubricView = Localized<Omit<Rubric, 'translations'>>

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

export function articlePath(a: Pick<Article, 'rubric' | 'slug'>): string {
  return `/${a.rubric}/${a.slug}`
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
  return getArticles(locale).filter(
    (a) =>
      a.terms?.includes(term) ||
      a.body.some((b) => (b.type === 'term' && b.slug === term) || ('text' in b && typeof b.text === 'string' && b.text.includes(`[[${term}|`))),
  )
}

/** Home page lead: the newest featured story. */
export function getLeadStory(locale: Locale): ArticleView | undefined {
  const all = getArticles(locale)
  return all.find((a) => a.featured && !a.sponsored) ?? all[0]
}

export function getLatest(locale: Locale, limit = 10, exclude: string[] = []): ArticleView[] {
  return getArticles(locale)
    .filter((a) => !exclude.includes(a.id))
    .slice(0, limit)
}

export function getMostRead(locale: Locale, limit = 5): ArticleView[] {
  return [...getArticles(locale)]
    .filter((a) => !a.sponsored)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

export function getRelated(locale: Locale, article: Article, limit = 4): ArticleView[] {
  const all = getArticles(locale).filter((a) => a.id !== article.id && !a.sponsored)
  const picked = (article.related ?? []).map((id) => all.find((a) => a.id === id)).filter(Boolean) as ArticleView[]
  const scored = all
    .filter((a) => !picked.includes(a))
    .map((a) => ({
      a,
      score:
        a.tags.filter((t) => article.tags.includes(t)).length * 2 +
        (a.terms ?? []).filter((t) => article.terms?.includes(t)).length +
        (a.rubric === article.rubric ? 0.5 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || Date.parse(y.a.publishedAt) - Date.parse(x.a.publishedAt))
    .map((x) => x.a)
  return [...picked, ...scored].slice(0, limit)
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

/** Partner-content byline ("Hamkorlik loyihalari"): styled as commercial, never as editorial. */
export function isCommercialAuthor(a: Pick<Author, 'slug' | 'commercial'>): boolean {
  return a.commercial ?? a.slug === 'hamkorlik'
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
  const terms = getGlossary(locale)
  if (!terms.length) return undefined
  const day = Math.floor(Date.parse(isoDate) / 86_400_000)
  return terms[day % terms.length]
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
  return [...getClubEvents(locale)].reverse().find((e) => e.status === 'upcoming')
}

export function getPastClubEvents(locale: Locale): Localized<ClubEvent>[] {
  return getClubEvents(locale).filter((e) => e.status === 'past')
}

export function getClubEvent(locale: Locale, slug: string): Localized<ClubEvent> | undefined {
  return getClubEvents(locale).find((e) => e.slug === slug)
}

// ── Search ────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’'`]/g, '')
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\{en:([^}]+)\}/g, '$1')
    .replace(/[*_]/g, '')
}

/** The words a reader sees in a body block (no keys, paths or markup targets). */
function blockText(b: ArticleBlock, locale: Locale): string {
  switch (b.type) {
    case 'p':
    case 'h2':
    case 'h3':
      return b.text
    case 'list':
      return b.items.join(' ')
    case 'quote':
      return [b.text, b.cite, b.role].filter(Boolean).join(' ')
    case 'figure':
      return [b.image.caption, b.image.alt].filter(Boolean).join(' ')
    case 'table':
      return [b.caption, ...b.columns.map((c) => c.label), ...b.rows.flat().filter((v) => typeof v === 'string'), b.note]
        .filter(Boolean)
        .join(' ')
    case 'chart':
      return b.chart.kind === 'bar'
        ? [b.chart.title, b.chart.subtitle, ...b.chart.data.map((d) => d.label), b.chart.note].filter(Boolean).join(' ')
        : [b.chart.title, b.chart.subtitle, ...b.chart.series.map((x) => x.name), ...b.chart.xLabels, b.chart.note]
            .filter(Boolean)
            .join(' ')
    case 'qa':
      return [b.question, ...b.answer].join(' ')
    case 'factbox':
      return [b.title, ...b.items.flatMap((it) => [it.label, it.value]), b.note].filter(Boolean).join(' ')
    case 'callout':
      return [b.title, b.text].filter(Boolean).join(' ')
    case 'term':
      return getTerm(locale, b.slug)?.term ?? ''
    default:
      return ''
  }
}

/** Normalised plain text of every article body, per edition (built once). */
function bodyText(locale: Locale): Map<string, string> {
  return memo(`search:${locale}`, () => new Map(getArticles(locale).map((a) => [a.id, normalize(a.body.map((b) => blockText(b, locale)).join(' '))])))
}

export interface SearchResults {
  query: string
  articles: ArticleView[]
  terms: Localized<GlossaryTerm>[]
  institutions: Localized<Institution>[]
  total: number
}

/** Plain-text search across headlines, leads, bodies, glossary and the market map. */
export function search(locale: Locale, query: string): SearchResults {
  const q = normalize(query.trim())
  const empty = { query, articles: [], terms: [], institutions: [], total: 0 }
  if (q.length < 2) return empty
  const words = q.split(/\s+/).filter(Boolean)
  const has = (h: string) => words.every((w) => h.includes(w))
  const match = (hay: string) => has(normalize(hay))
  const bodies = bodyText(locale)
  const articles = getArticles(locale)
    .map((a) => {
      const head = `${a.title} ${a.kicker ?? ''} ${a.lead}`
      const score = match(a.title) ? 3 : match(head) ? 2 : has(bodies.get(a.id) ?? '') ? 1 : 0
      return { a, score }
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || Date.parse(y.a.publishedAt) - Date.parse(x.a.publishedAt))
    .map((x) => x.a)
  const terms = getGlossary(locale).filter((t) =>
    match(`${t.term} ${t.short} ${t.aliases.ru ?? ''} ${t.aliases.en ?? ''} ${t.aliases.ar ?? ''} ${(t.aliases.other ?? []).join(' ')}`),
  )
  const institutions = getInstitutions(locale).filter((i) => match(`${i.name} ${i.parent ?? ''} ${i.city} ${i.products.join(' ')}`))
  return { query, articles, terms, institutions, total: articles.length + terms.length + institutions.length }
}
