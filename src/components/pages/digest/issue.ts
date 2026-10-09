import {
  contentNow,
  getArticleById,
  getArticles,
  getClubEvents,
  getMostRead,
  getTerm,
  getTermOfDay,
  type ArticleView,
  type ClubEvent,
  type GlossaryTerm,
  type Localized,
} from '@/content'
import type { Locale } from '@/i18n/config'

/**
 * The weekly e-mail digest, derived from the article feed: issue №1 went out
 * on `firstIssue`, and every issue since covers the week up to its send time
 * (Friday 18:00 Tashkent), ranked by readership.
 */
export const digestConfig = {
  firstIssue: '2026-06-05T18:00:00+05:00',
  stories: 6,
  /** Story the "number of the week" comes from (figure and caption live in digest messages). */
  numberArticleId: 'th-05',
} as const

const WEEK_MS = 7 * 86_400_000

export interface DigestIssue {
  number: number
  /** ISO send time. */
  sentAt: string
  stories: ArticleView[]
  minutes: number
}

export interface DigestIssueFull extends DigestIssue {
  term?: Localized<GlossaryTerm>
  club?: Localized<ClubEvent>
  numberStory?: ArticleView
}

function sendTime(n: number): number {
  return Date.parse(digestConfig.firstIssue) + (n - 1) * WEEK_MS
}

/** Number of the most recent issue already sent at `now`. */
export function latestIssueNumber(now: string = contentNow()): number {
  return Math.max(1, Math.floor((Date.parse(now) - Date.parse(digestConfig.firstIssue)) / WEEK_MS) + 1)
}

/** ISO time of the next issue after `now`. */
export function nextIssueAt(now: string = contentNow()): string {
  return new Date(sendTime(latestIssueNumber(now) + 1)).toISOString()
}

export async function getIssue(locale: Locale, n: number, limit: number = digestConfig.stories): Promise<DigestIssue> {
  const sent = sendTime(n)
  const from = sent - WEEK_MS
  const stories = (await getArticles(locale))
    .filter((a) => {
      const t = Date.parse(a.publishedAt)
      return !a.sponsored && t > from && t <= sent
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
  return {
    number: n,
    sentAt: new Date(sent).toISOString(),
    stories,
    minutes: stories.reduce((sum, a) => sum + a.readingMinutes, 0),
  }
}

/** The latest issue with everything the preview shows. */
export async function getLatestIssue(locale: Locale, now: string = contentNow()): Promise<DigestIssueFull> {
  const issue = await getIssue(locale, latestIssueNumber(now))
  // A thin week is topped up with the most-read stories so the e-mail never looks empty.
  if (issue.stories.length < 5) {
    const have = new Set(issue.stories.map((a) => a.id))
    issue.stories = [...issue.stories, ...(await getMostRead(locale, 12)).filter((a) => !have.has(a.id))].slice(0, digestConfig.stories)
    issue.minutes = issue.stories.reduce((sum, a) => sum + a.readingMinutes, 0)
  }
  const sent = Date.parse(issue.sentAt)
  // Term of the week: the first glossary term behind the week's top story.
  const termSlug = issue.stories[0]?.terms?.[0]
  const term = (termSlug ? await getTerm(locale, termSlug) : undefined) ?? (await getTermOfDay(locale, issue.sentAt))
  const club = (await getClubEvents(locale))
    .filter((e) => Date.parse(e.startsAt) > sent)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  const numberStory = await getArticleById(locale, digestConfig.numberArticleId)
  return { ...issue, term, club, numberStory }
}

/** Earlier issues (newest first) that carried at least one story. */
export async function getPreviousIssues(locale: Locale, count = 3, now: string = contentNow()): Promise<DigestIssue[]> {
  const out: DigestIssue[] = []
  for (let n = latestIssueNumber(now) - 1; n >= 1 && out.length < count; n--) {
    const issue = await getIssue(locale, n, 1)
    if (issue.stories.length) out.push(issue)
  }
  return out
}

/** First sentence of a standfirst, for one-line summaries. */
export function firstSentence(text: string): string {
  const m = text.match(/^[\s\S]+?[.!?…](?=\s+[«"„A-ZÀ-ÖØ-ÞА-ЯЁЎҚҒҲ0-9]|\s*$)/u)
  return (m ? m[0] : text).trim()
}
