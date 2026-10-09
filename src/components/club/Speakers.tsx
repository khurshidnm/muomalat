import type { Locale } from '@/i18n/config'
import { Thumb } from '@/components/ui/Figure'
import { Avatar } from '@/components/ui/Avatar'
import { eventHost, type EventView } from './event'

/**
 * Speakers with square portraits. `list` stacks portrait + name rows (rails,
 * phones); `grid` turns into three columns of larger portraits from `sm`.
 */
export async function Speakers({
  event,
  locale,
  layout = 'list',
  hostLabel,
  className = '',
}: {
  event: EventView
  locale: Locale
  layout?: 'list' | 'grid'
  /** "Uchrashuvni olib boradi" — shows the moderator under the speakers. */
  hostLabel?: string
  className?: string
}) {
  const host = hostLabel ? await eventHost(event, locale) : undefined
  const grid = layout === 'grid'
  return (
    <div className={className}>
      <ul className={grid ? 'grid gap-y-0 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8' : ''}>
        {event.speakers.map((s, i) => (
          <li
            key={s.name}
            className={`flex items-start gap-4 border-rule py-4 ${i > 0 ? 'border-t' : 'pt-1'} ${
              grid ? 'sm:block sm:border-t-0 sm:py-0' : ''
            }`}
          >
            {s.portrait ? (
              <Thumb
                image={s.portrait}
                ratio="1/1"
                sizes={grid ? '(min-width: 640px) 160px, 72px' : '72px'}
                className={`w-[4.5rem] shrink-0 ${grid ? 'sm:w-40' : ''}`}
              />
            ) : (
              <Avatar name={s.name} size={72} />
            )}
            <div lang={event.contentLang} className={`min-w-0 ${grid ? 'sm:mt-3' : ''}`}>
              <p className="font-display text-h4 font-semibold text-ink">{s.name}</p>
              <p className="mt-1 text-meta text-ink-2">{s.role}</p>
            </div>
          </li>
        ))}
      </ul>
      {host ? (
        <p className={`flex items-center gap-3 border-t border-rule pt-4 ${grid ? 'mt-4 sm:mt-8' : 'mt-0'}`}>
          <Avatar name={host.name} size={40} />
          <span className="text-meta leading-snug">
            <span className="label-caps block text-ink-3">{hostLabel}</span>
            <span lang={event.contentLang}>
              <span className="font-semibold text-ink">{host.name}</span>
              {host.role ? (
                <span className="text-ink-2">
                  , <span lang={host.lang}>{host.role}</span>
                </span>
              ) : null}
            </span>
          </span>
        </p>
      ) : null}
    </div>
  )
}
