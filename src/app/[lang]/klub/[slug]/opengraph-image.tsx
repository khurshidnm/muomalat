import { isLocale, locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { homeMessages } from '@/i18n/messages/home'
import { getClubEvent, getClubEvents, isSlug } from '@/content'
import { formatDate } from '@/lib/format'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat klubi'
// A new meeting's card renders on its first request; unknown meetings 404 (CMS-SPEC §8.7).
export const revalidate = 3600

export async function generateStaticParams() {
  return (await Promise.all(locales.map(async (lang) => (await getClubEvents(lang)).map((e) => ({ lang, slug: e.slug }))))).flat()
}

/**
 * 404 for an unknown card (CMS-SPEC §8.7). Returned, not thrown: a thrown
 * notFound() leaves Next a cached 404 with no tags and no revalidate, which
 * would outlive the story's publication; a returned one carries the route's
 * tags and path, so the publication's invalidation clears it.
 */
const missing = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

/** Telegram card for a club meeting: number, date, title. */
export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params
  const e = isLocale(lang) && isSlug(slug) ? await getClubEvent(lang, slug) : undefined
  if (!e || !isLocale(lang)) return missing()
  const locale = lang
  const t = pick(homeMessages, locale).club
  return ogCard({
    kicker: `${t.kicker} · №${e.number}`,
    title: e.title,
    footer: `${formatDate(e.startsAt, locale, 'date')}, ${formatDate(e.startsAt, locale, 'time')} · ${e.venue.city}`,
  })
}
