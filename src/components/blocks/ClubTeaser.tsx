import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { homeMessages } from '@/i18n/messages/home'
import { commonMessages } from '@/i18n/messages/common'
import type { ClubEvent, Localized } from '@/content'
import { formatDate, tashkentParts } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

/** Next club meeting: big tabular date, theme, venue, two actions. */
export function ClubTeaser({ event, locale, className = '' }: { event: Localized<ClubEvent>; locale: Locale; className?: string }) {
  const t = pick(homeMessages, locale).club
  const c = pick(commonMessages, locale)
  const p = tashkentParts(event.startsAt)
  const month = formatDate(event.startsAt, locale, 'dayMonth').replace(/^\d+[-\s]?/, '')
  return (
    <section aria-labelledby="club-teaser" className={`border-t-2 border-ink ${className}`}>
      <div className="flex items-baseline justify-between gap-4 pt-2.5">
        <p className="label-caps text-emerald">{t.kicker}</p>
        <Link href={href(locale, paths.club())} prefetch={false} className="text-meta text-ink-3 hover:text-emerald">
          {t.about}
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 sm:gap-x-7">
        <div className="border-r border-rule pr-5 text-center sm:pr-7">
          <p className="figures text-[3.5rem] leading-none font-semibold text-ink sm:text-[4.5rem]">{p.day}</p>
          <p className="label-caps mt-1 text-ink-2">{month}</p>
          <p className="figures mt-1 text-meta text-ink-3">{formatDate(event.startsAt, locale, 'time')}</p>
        </div>
        <div className="min-w-0">
          <p className="text-meta text-ink-3">
            {t.next} · №{event.number}
          </p>
          <h2 id="club-teaser" lang={event.contentLang} className="mt-1 font-display text-h3 font-semibold">
            <Link href={href(locale, paths.clubEvent(event.slug))} prefetch={false} className="headline-link">
              {event.title}
            </Link>
          </h2>
          <p lang={event.contentLang} className="mt-2 hidden text-ui text-ink-2 sm:block">
            {event.summary}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-meta text-ink-3">
            <Icon name="pin" size={15} className="mt-0.5 shrink-0" />
            <span>
              <span lang={event.contentLang}>
                {event.venue.name}, {event.venue.city}
              </span>
              {event.capacity ? ` · ${t.seats(event.capacity)}` : ''}
            </span>
          </p>
        </div>
      </div>
      <p lang={event.contentLang} className="mt-4 text-ui text-ink-2 sm:hidden">
        {event.summary}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href={href(locale, paths.clubNext())}>{t.register}</ButtonLink>
        <ButtonLink href={href(locale, paths.club())} variant="secondary">
          {c.actions.joinClub}
        </ButtonLink>
      </div>
    </section>
  )
}
