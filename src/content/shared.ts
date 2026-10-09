/**
 * Synchronous parts of the content API: they depend on code, not on stored
 * content, so they are the same for both adapters.
 */
import type { Article, Author, RubricSlug } from './types'
import { rubrics as allRubrics } from './data/rubrics'

/**
 * The five rubrics in navigation order. A rubric is added or removed only
 * together with a code change (messages, routes; CMS-SPEC §3.6), so the list
 * lives in code.
 */
export const rubricSlugs: RubricSlug[] = [...allRubrics].sort((a, b) => a.order - b.order).map((r) => r.slug)

export function isRubric(value: string): value is RubricSlug {
  return (rubricSlugs as string[]).includes(value)
}

/** Reference "now" for mock data: the newsroom clock the content was written against. */
export const CONTENT_NOW = '2026-10-08T16:00:00+05:00'

export function articlePath(a: Pick<Article, 'rubric' | 'slug'>): string {
  return `/${a.rubric}/${a.slug}`
}

/**
 * Partner-content byline ("Hamkorlik loyihalari"): styled as commercial,
 * never as editorial. The fallback on the `hamkorlik` slug is for the mock
 * data only; CMS authors always carry the flag (CMS-SPEC §3.5).
 */
export function isCommercialAuthor(a: Pick<Author, 'slug' | 'commercial'>): boolean {
  return a.commercial ?? a.slug === 'hamkorlik'
}

/** Slugs of stories, terms, meetings, tags and authors (CMS-SPEC §3.1). Route params are checked against it before any query (§8.1). */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const isSlug = (value: string) => value.length <= 200 && SLUG_RE.test(value)
