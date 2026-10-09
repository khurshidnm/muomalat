import type { Locale } from '@/i18n/config'
import { localeMeta } from '@/i18n/config'
import { eventHost, slotIso, type EventView } from './event'

/**
 * Meeting agenda as a timeline: tabular start times on the left, a hairline
 * spine with brass diamonds, the session and its speaker on the right.
 * Talks get a filled diamond, breaks (registration, Q&A) an outlined one —
 * the speaker line carries the same distinction in text.
 */
export async function Agenda({ event, locale, className = '' }: { event: EventView; locale: Locale; className?: string }) {
  // Speaker roles are part of the meeting (its language); the host's comes from the translated author profile.
  const roles = new Map<string, { role: string; lang?: string }>(event.speakers.map((s) => [s.name, { role: s.role }]))
  const host = await eventHost(event, locale)
  if (host?.role) roles.set(host.name, { role: host.role, lang: host.lang })
  const ui = localeMeta[locale].htmlLang
  return (
    <ol className={className}>
      {event.agenda.map((slot, i) => {
        const role = slot.speaker ? roles.get(slot.speaker) : undefined
        const last = i === event.agenda.length - 1
        return (
          <li key={`${slot.time}-${i}`} className="grid grid-cols-[3.25rem_1fr] gap-x-3 sm:grid-cols-[4rem_1fr] sm:gap-x-4">
            <time dateTime={slotIso(event, slot.time)} lang={ui} className="figures pt-[0.95rem] text-data font-semibold text-ink">
              {slot.time}
            </time>
            <div className={`relative border-l border-rule pt-3 pl-5 ${last ? 'pb-1' : 'pb-3'}`}>
              <span
                aria-hidden="true"
                className={`absolute top-[1.3rem] -left-[4.5px] size-2 rotate-45 ${slot.speaker ? 'bg-brass' : 'border border-brass bg-paper'}`}
              />
              <p lang={event.contentLang} className={`text-ui leading-snug ${slot.speaker ? 'font-medium text-ink' : 'text-ink-2'}`}>
                {slot.title}
              </p>
              {slot.speaker ? (
                <p lang={event.contentLang} className="mt-0.5 text-meta text-ink-3">
                  <span className="font-semibold text-ink-2">{slot.speaker}</span>
                  {role ? (
                    <>
                      , <span lang={role.lang}>{role.role}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
