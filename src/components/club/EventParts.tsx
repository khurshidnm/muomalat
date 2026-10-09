import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { clubMessages } from '@/i18n/messages/club'
import { commonMessages } from '@/i18n/messages/common'
import { ButtonLink } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Placeholder } from '@/components/ui/Placeholder'
import { eventDate, type EventView } from './event'

/** Key facts of a meeting as a hairline definition list. */
export function EventFacts({
  event,
  locale,
  showDate = true,
  className = '',
}: {
  event: EventView
  locale: Locale
  /** Hide the date row when a big date block sits next to the list. */
  showDate?: boolean
  className?: string
}) {
  const m = pick(clubMessages, locale).event
  const t = pick(commonMessages, locale)
  const d = eventDate(event, locale)
  const upcoming = event.status === 'upcoming'
  const rows: { icon: IconName; label: string; value: React.ReactNode }[] = []
  if (showDate) {
    rows.push({
      icon: 'calendar',
      label: m.date,
      value: (
        <time dateTime={event.startsAt} className="figures">
          {d.weekday}, {d.date}
        </time>
      ),
    })
  }
  rows.push({ icon: 'clock', label: m.time, value: <span className="figures">{d.time}</span> })
  rows.push({
    icon: 'pin',
    label: m.venue,
    value: (
      <>
        <span lang={event.contentLang} className="block">
          {event.venue.name}
        </span>
        <span lang={event.contentLang} className="block text-ink-2">
          {event.venue.address}
        </span>
        {upcoming ? <span className="mt-1 block text-meta text-ink-3">{m.addressNote}</span> : null}
      </>
    ),
  })
  if (event.capacity) {
    rows.push({
      icon: 'users',
      label: m.seats,
      value: (
        <>
          <span className="figures">{m.seatsValue(event.capacity)}</span>
          {upcoming ? <span className="text-ink-2"> · {m.registrationRequired}</span> : null}
        </>
      ),
    })
  }
  rows.push({ icon: 'info', label: m.organiser, value: m.organiserValue })
  rows.push({
    icon: 'link',
    label: m.partners,
    value: <Placeholder>{upcoming ? m.partnersValue : t.labels.placeholder}</Placeholder>,
  })

  return (
    <dl className={`border-b border-rule ${className}`}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-4 border-t border-rule py-2.5 sm:grid-cols-[8.5rem_1fr]">
          <dt className="flex items-start gap-1.5 text-meta text-ink-3">
            <Icon name={r.icon} size={15} className="mt-[0.2rem] shrink-0" />
            {r.label}
          </dt>
          <dd className="min-w-0 text-ui text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Key takeaways with brass diamonds. */
export function Takeaways({ items, lang, className = '' }: { items: readonly string[]; lang?: string; className?: string }) {
  return (
    <ul lang={lang} className={`space-y-2 ${className}`}>
      {items.map((x) => (
        <li key={x} className="relative pl-5 text-ui text-ink-2">
          <span aria-hidden="true" className="absolute top-[0.55em] left-0.5 size-[7px] rotate-45 bg-brass" />
          {x}
        </li>
      ))}
    </ul>
  )
}

/** Registration call to action for the upcoming meeting. */
export function RegisterPanel({
  event,
  locale,
  href,
  id = 'register-cta',
  as: H = 'h2',
  secondary,
  className = '',
}: {
  event: EventView
  locale: Locale
  /** Where the form lives: "#ariza" on the hub, /klub#ariza elsewhere. */
  href: string
  id?: string
  as?: 'h2' | 'h3'
  secondary?: { href: string; label: string }
  className?: string
}) {
  const m = pick(clubMessages, locale).event
  const d = eventDate(event, locale)
  return (
    <section aria-labelledby={id} className={`border-t-2 border-emerald bg-emerald-wash/60 p-5 ${className}`}>
      <H id={id} className="font-display text-h4 font-semibold text-ink">
        {m.registerTitle}
      </H>
      <p className="mt-1.5 text-ui text-ink-2">{m.registerText}</p>
      <p className="figures mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-2">
        <Icon name="calendar" size={15} className="shrink-0 text-emerald" />
        <span>
          {d.dayMonth}, {d.time}
        </span>
        {event.capacity ? (
          <>
            <span aria-hidden="true" className="text-rule-strong">
              ·
            </span>
            <span>{m.seatsValue(event.capacity)}</span>
          </>
        ) : null}
      </p>
      <div className="mt-4 flex flex-col gap-2 xs:flex-row xs:flex-wrap lg:flex-col">
        <ButtonLink href={href} size="lg" className="w-full xs:w-auto lg:w-full">
          {m.register}
          <Icon name="arrow-right" size={18} />
        </ButtonLink>
        {secondary ? (
          <ButtonLink href={secondary.href} variant="secondary" size="lg" className="w-full xs:w-auto lg:w-full">
            {secondary.label}
          </ButtonLink>
        ) : null}
      </div>
    </section>
  )
}

