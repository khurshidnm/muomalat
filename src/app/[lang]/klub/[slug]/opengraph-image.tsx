import { isLocale, locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { homeMessages } from '@/i18n/messages/home'
import { getClubEvent, getClubEvents } from '@/content'
import { formatDate } from '@/lib/format'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat klubi'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => getClubEvents(lang).map((e) => ({ lang, slug: e.slug })))
}

/** Telegram card for a club meeting: number, date, title. */
export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params
  const locale = isLocale(lang) ? lang : 'uz'
  const e = getClubEvent(locale, slug)
  const t = pick(homeMessages, locale).club
  if (!e) return ogCard({ kicker: t.kicker, title: t.text, footer: t.kicker })
  return ogCard({
    kicker: `${t.kicker} · №${e.number}`,
    title: e.title,
    footer: `${formatDate(e.startsAt, locale, 'date')}, ${formatDate(e.startsAt, locale, 'time')} · ${e.venue.city}`,
  })
}
