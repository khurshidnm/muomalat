import type { Locale } from '@/i18n/config'
import type { ClubEvent } from '@/content'
import { eventDate } from './event'

/**
 * Big tabular date for a meeting: day numeral, month and year, weekday and
 * time range — the proportions of the home page club teaser. Screen readers
 * get one <time> with the full date; the visual pieces are hidden from them.
 * `responsive` lays the pieces out in a row on phones and stacks them from `sm`.
 */
export function EventDate({
  event,
  locale,
  size = 'lg',
  note,
  responsive = false,
  className = '',
}: {
  event: ClubEvent
  locale: Locale
  size?: 'lg' | 'md' | 'sm'
  /** Extra line under the time, e.g. "22 kun qoldi". */
  note?: React.ReactNode
  responsive?: boolean
  className?: string
}) {
  const d = eventDate(event, locale)
  const day =
    size === 'lg' ? 'text-[3.5rem] sm:text-[4.5rem]' : size === 'md' ? 'text-[3.25rem] sm:text-[3.75rem]' : 'text-[2.25rem]'
  const small = size === 'sm'
  return (
    <div className={`${responsive ? 'flex items-center gap-4 sm:block sm:text-center' : 'text-center'} ${className}`}>
      <time dateTime={event.startsAt} className="sr-only">
        {small ? d.date : `${d.weekday}, ${d.date}, ${d.time}`}
      </time>
      <span aria-hidden="true" className={`figures block shrink-0 leading-none font-semibold text-ink ${day}`}>
        {d.day}
      </span>
      <span className={`block ${responsive ? 'text-left sm:mt-1.5 sm:text-center' : 'mt-1.5'}`}>
        <span aria-hidden="true" className="label-caps block text-ink-2">
          {/* Never break a month name mid-word; columns are sized for the longest one. */}
          <span className="whitespace-nowrap">{d.month}</span>
          {small ? null : <span className="figures"> {d.year}</span>}
        </span>
        {small ? (
          <span aria-hidden="true" className="figures mt-0.5 block text-meta text-ink-3">
            {d.year}
          </span>
        ) : (
          <>
            <span aria-hidden="true" className="mt-1 block text-meta text-ink-3">
              {d.weekday}
            </span>
            <span aria-hidden="true" className="figures block text-meta text-ink-3">
              {d.time}
            </span>
          </>
        )}
        {note ? <span className="mt-1.5 block text-meta font-semibold text-emerald">{note}</span> : null}
      </span>
    </div>
  )
}
