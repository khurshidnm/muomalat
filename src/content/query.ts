/**
 * List and search semantics shared by both content adapters (mock and
 * Payload). Pure functions over views that are already localized, so the two
 * adapters answer `getLatest`, `getRelated`, `search`… the same way; only
 * where the views come from differs.
 */
import type { Locale } from '@/i18n/config'
import type { Article, ArticleBlock, ClubEvent, GlossaryTerm, Institution } from './types'
import type { ArticleView, Localized } from './views'

const newestFirst = (a: { publishedAt: string }, b: { publishedAt: string }) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)

/** Home page lead: the newest featured story. */
export function leadStory(all: ArticleView[]): ArticleView | undefined {
  return all.find((a) => a.featured && !a.sponsored) ?? all[0]
}

export function latest(all: ArticleView[], limit: number, exclude: string[]): ArticleView[] {
  return all.filter((a) => !exclude.includes(a.id)).slice(0, limit)
}

export function mostRead(all: ArticleView[], limit: number): ArticleView[] {
  return [...all]
    .filter((a) => !a.sponsored)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

/** Hand-picked related stories first, then the closest by shared tags, terms and rubric. */
export function related(all: ArticleView[], article: Article, limit: number): ArticleView[] {
  const pool = all.filter((a) => a.id !== article.id && !a.sponsored)
  const picked = (article.related ?? []).map((id) => pool.find((a) => a.id === id)).filter(Boolean) as ArticleView[]
  const scored = pool
    .filter((a) => !picked.includes(a))
    .map((a) => ({
      a,
      score:
        a.tags.filter((t) => article.tags.includes(t)).length * 2 +
        (a.terms ?? []).filter((t) => article.terms?.includes(t)).length +
        (a.rubric === article.rubric ? 0.5 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || newestFirst(x.a, y.a))
    .map((x) => x.a)
  return [...picked, ...scored].slice(0, limit)
}

/** Stories that list the term or use it in the body (a term card or an inline glossary link). */
export function byTerm(all: ArticleView[], term: string): ArticleView[] {
  return all.filter(
    (a) =>
      a.terms?.includes(term) ||
      a.body.some((b) => (b.type === 'term' && b.slug === term) || ('text' in b && typeof b.text === 'string' && b.text.includes(`[[${term}|`))),
  )
}

/** Deterministic term of the day for a given ISO date. */
export function termOfDay<T>(terms: T[], isoDate: string): T | undefined {
  if (!terms.length) return undefined
  const day = Math.floor(Date.parse(isoDate) / 86_400_000)
  return terms[day % terms.length]
}

/** Club meetings are listed newest first; the next one is the soonest upcoming. */
export function nextClubEvent<E extends Pick<ClubEvent, 'status'>>(newestFirstEvents: E[]): E | undefined {
  return [...newestFirstEvents].reverse().find((e) => e.status === 'upcoming')
}

// ── Search ────────────────────────────────────────────────────────────────

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’'`]/g, '')
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\{en:([^}]+)\}/g, '$1')
    .replace(/[*_]/g, '')
}

/** The words a reader sees in a body block (no keys, paths or markup targets). */
export function blockText(b: ArticleBlock, termName: (slug: string) => string | undefined): string {
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
      return termName(b.slug) ?? ''
    default:
      return ''
  }
}

/** Normalised plain text of a story body, as search matches it. */
export function bodySearchText(body: ArticleBlock[], termName: (slug: string) => string | undefined): string {
  return normalize(body.map((b) => blockText(b, termName)).join(' '))
}

/**
 * The same text reduced to its distinct whitespace-separated tokens. Every
 * query word contains no whitespace, so `text.includes(word)` gives the same
 * answer on this form as on the full text; it only takes less room in the
 * cached search index.
 */
export function compactSearchText(text: string): string {
  return [...new Set(text.split(/\s+/).filter(Boolean))].join(' ')
}

export interface SearchResults {
  query: string
  articles: ArticleView[]
  terms: Localized<GlossaryTerm>[]
  institutions: Localized<Institution>[]
  total: number
}

export interface SearchSource {
  articles: ArticleView[]
  /** Normalised body text by article id. */
  bodies: Map<string, string>
  glossary: Localized<GlossaryTerm>[]
  institutions: Localized<Institution>[]
}

/** Plain-text search across headlines, leads, bodies, glossary and the market map. */
export function searchIn(_locale: Locale, query: string, src: SearchSource): SearchResults {
  const q = normalize(query.trim())
  const empty = { query, articles: [], terms: [], institutions: [], total: 0 }
  if (q.length < 2) return empty
  const words = q.split(/\s+/).filter(Boolean)
  const has = (h: string) => words.every((w) => h.includes(w))
  const match = (hay: string) => has(normalize(hay))
  const articles = src.articles
    .map((a) => {
      const head = `${a.title} ${a.kicker ?? ''} ${a.lead}`
      const score = match(a.title) ? 3 : match(head) ? 2 : has(src.bodies.get(a.id) ?? '') ? 1 : 0
      return { a, score }
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || newestFirst(x.a, y.a))
    .map((x) => x.a)
  const terms = src.glossary.filter((t) =>
    match(`${t.term} ${t.short} ${t.aliases.ru ?? ''} ${t.aliases.en ?? ''} ${t.aliases.ar ?? ''} ${(t.aliases.other ?? []).join(' ')}`),
  )
  const institutions = src.institutions.filter((i) => match(`${i.name} ${i.parent ?? ''} ${i.city} ${i.products.join(' ')}`))
  return { query, articles, terms, institutions, total: articles.length + terms.length + institutions.length }
}
