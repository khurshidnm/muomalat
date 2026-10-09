import { localeMeta, localePath, type ContentLang, type Locale } from '@/i18n/config'
import { contentNow, getAuthors, type ClubEvent, type Localized } from '@/content'
import { site } from '@/content/data/site'
import { formatDate, tashkentDay, tashkentParts } from '@/lib/format'
import { absoluteUrl, paths } from '@/lib/routes'
import { publisherLd } from '@/lib/seo'
import { plainText } from '@/components/ui/InlineText'

export type EventView = Localized<ClubEvent>

/** Calendar pieces for the big date blocks, all in Tashkent time. */
export function eventDate(event: ClubEvent, locale: Locale) {
  const p = tashkentParts(event.startsAt)
  return {
    day: p.day,
    year: p.year,
    month: formatDate(event.startsAt, locale, 'dayMonth').replace(/^\d+[-\s]?/, ''),
    weekday: formatDate(event.startsAt, locale, 'weekdayDate').split(',')[0],
    dayMonth: formatDate(event.startsAt, locale, 'dayMonth'),
    date: formatDate(event.startsAt, locale, 'date'),
    time: `${formatDate(event.startsAt, locale, 'time')}–${formatDate(event.endsAt, locale, 'time')}`,
  }
}

/** Whole days from the content clock to the meeting day (0 = today). */
export function daysUntil(iso: string, now = contentNow()): number {
  const a = Date.parse(`${tashkentDay(now)}T12:00:00+05:00`)
  const b = Date.parse(`${tashkentDay(iso)}T12:00:00+05:00`)
  return Math.round((b - a) / 86_400_000)
}

/** ISO timestamp for an agenda slot ("18:50") on the meeting day. */
export function slotIso(event: ClubEvent, time: string): string {
  return `${tashkentDay(event.startsAt)}T${time}:00+05:00`
}

/**
 * The moderator: whoever speaks in the agenda without being one of the
 * listed speakers. Resolved against the newsroom's authors for a role line.
 */
/** `lang` is the language of the role text: author profiles are translated, the meeting itself is not. */
export async function eventHost(
  event: EventView,
  locale: Locale,
): Promise<{ name: string; role?: string; lang?: ContentLang; slug?: string } | undefined> {
  const listed = new Set(event.speakers.map((s) => s.name))
  const name = event.agenda.find((a) => a.speaker && !listed.has(a.speaker))?.speaker
  if (!name) return undefined
  const author = (await getAuthors(locale)).find((a) => a.name === name)
  return { name, role: author?.role, lang: author?.contentLang, slug: author?.slug }
}

/**
 * Search/preview description for a meeting: the summary's opening sentences
 * up to `max` characters (Google trims snippets at ~155–160), or the first
 * sentence cut at a word boundary when even that is longer.
 */
export function eventSnippet(event: Pick<ClubEvent, 'summary'>, max = 160): string {
  const text = plainText(event.summary).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  let out = ''
  for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
    const joined = out ? `${out} ${sentence}` : sentence
    if (joined.length > max) break
    out = joined
  }
  if (out) return out
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '')}…`
}

/** schema.org Event for a club meeting. */
export function eventLd(event: EventView, locale: Locale) {
  const path = localePath(locale, paths.clubEvent(event.slug))
  const url = absoluteUrl(path)
  const upcoming = event.status === 'upcoming'
  return {
    '@type': 'Event',
    '@id': `${url}#event`,
    url,
    name: event.title,
    description: plainText(event.summary),
    inLanguage: event.contentLang ?? localeMeta[locale].htmlLang,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue.address,
        addressLocality: event.venue.city,
        addressCountry: 'UZ',
      },
    },
    organizer: { ...publisherLd, '@id': `${site.url}/#organization` },
    // Raster card first (1200×630 PNG, app/[lang]/klub/[slug]/opengraph-image.tsx); the SVG illustration as an extra.
    image: [absoluteUrl(`${path}/opengraph-image`), ...(event.image ? [absoluteUrl(event.image.src)] : [])],
    // Registration goes through the club application form. No price: the club's
    // terms are not announced yet (membership fee is a <Placeholder>) — add
    // `price`/`priceCurrency` here once they are, rather than guess "free".
    ...(upcoming
      ? {
          offers: {
            '@type': 'Offer',
            url: absoluteUrl(localePath(locale, paths.clubJoin())),
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
    ...(event.capacity ? { maximumAttendeeCapacity: event.capacity } : {}),
    ...(event.speakers.length
      ? { performer: event.speakers.map((s) => ({ '@type': 'Person', name: s.name, jobTitle: s.role })) }
      : {}),
  }
}
