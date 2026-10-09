import type { Locale } from '@/i18n/config'
import { getTags, type ArticleView, type Localized, type Tag } from '@/content'

/**
 * Splits the first listing page into a lead, a picture grid and the dense
 * chronological list. The lead is the newest editorial story: partner
 * content keeps its chronological place (and its label) further down, but
 * never takes the lead slot unless the listing holds nothing else. The grid
 * takes six stories when there are enough to leave a list below it (six
 * fills both the two- and three-column grids), otherwise up to three, so
 * short rubrics still get a list.
 */
export function splitFront(list: ArticleView[]): { lead?: ArticleView; grid: ArticleView[]; rest: ArticleView[] } {
  const lead = list.find((a) => !a.sponsored) ?? list[0]
  const others = list.filter((a) => a !== lead)
  const n = others.length >= 9 ? 6 : Math.min(3, others.length)
  return { lead, grid: others.slice(0, n), rest: others.slice(n) }
}

/**
 * Explainer series numbers: the oldest editorial explainer is 01. Partner
 * content is not part of the newsroom series and gets no number.
 */
export function seriesNumbers(list: ArticleView[]): Map<string, number> {
  const editorial = list.filter((a) => !a.sponsored).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
  return new Map(editorial.map((a, i) => [a.id, i + 1]))
}

/** Most-read stories within a list (partner content excluded). */
export function mostReadWithin(list: ArticleView[], limit = 5): ArticleView[] {
  return list
    .filter((a) => !a.sponsored)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

/** Tags that most often appear alongside `slug` in the given stories. */
export function relatedTags(locale: Locale, slug: string, list: ArticleView[], limit = 8): Localized<Tag>[] {
  const counts = new Map<string, number>()
  for (const a of list) for (const t of a.tags) if (t !== slug) counts.set(t, (counts.get(t) ?? 0) + 1)
  const all = getTags(locale)
  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([s]) => all.find((t) => t.slug === s))
    .filter((t): t is Localized<Tag> => !!t)
    .slice(0, limit)
}
