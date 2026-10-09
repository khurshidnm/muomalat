import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { clubMessages } from '@/i18n/messages/club'
import { Icon } from '@/components/ui/Icon'
import type { EventView } from './event'

/** "Navbatdagi / Oʻtgan uchrashuv" — icon + text, never colour alone. */
export function EventStatus({ event, locale, className = '' }: { event: EventView; locale: Locale; className?: string }) {
  const m = pick(clubMessages, locale).event
  const upcoming = event.status === 'upcoming'
  return (
    <span className={`label-caps inline-flex items-center gap-1.5 ${upcoming ? 'text-emerald' : 'text-ink-3'} ${className}`}>
      <Icon name={upcoming ? 'calendar' : 'check'} size={14} className="shrink-0" />
      {upcoming ? m.upcoming : m.past}
    </span>
  )
}
