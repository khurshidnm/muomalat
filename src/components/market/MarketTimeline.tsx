import Link from 'next/link'
import { Fragment } from 'react'

export interface TimelineItem {
  key: string
  /** ISO date (YYYY-MM-DD) or month (YYYY-MM). */
  date: string
  dateText: string
  title: string
  text: string
  status: 'done' | 'upcoming'
  story?: { href: string; title: string; lang: string }
}

export interface TimelineText {
  done: string
  upcoming: string
  now: string
  story: string
}

/**
 * Milestone marker. Shape carries the state: a filled disc with a tick for
 * steps already taken, an open ring for expected ones.
 */
function Marker({ status }: { status: 'done' | 'upcoming' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="relative block bg-paper">
      {status === 'done' ? (
        <>
          <circle cx="8" cy="8" r="7" className="fill-emerald" />
          <path d="m4.8 8.2 2.1 2.1 4.3-4.6" fill="none" className="stroke-paper" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <circle cx="8" cy="8" r="6.2" fill="none" className="stroke-ink-3" strokeWidth="1.6" />
      )}
    </svg>
  )
}

/** Rail segment through a row: solid for the past, dashed after today. */
function Rail({ dashed, first, last }: { dashed: boolean; first: boolean; last: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute left-1/2 w-0 -translate-x-1/2 border-l ${dashed ? 'border-dashed border-rule-strong' : 'border-solid border-ink-3'} ${first ? 'top-3' : 'top-0'} ${last ? 'h-3' : 'bottom-0'}`}
    />
  )
}

const ROW = 'relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[9.5rem_1.5rem_minmax(0,1fr)] md:gap-x-4'

/**
 * Vertical timeline of regulatory milestones. A "today" row sits between the
 * last step taken and the first expected one; past and future differ by
 * marker shape, rail style and a text label, never by colour alone.
 */
export function MarketTimeline({
  items,
  nowIso,
  nowText,
  text,
  lang,
}: {
  items: TimelineItem[]
  nowIso: string
  nowText: string
  text: TimelineText
  /** Language of the milestone texts. */
  lang: string
}) {
  const today = nowIso.slice(0, 10)
  const isPast = (m: TimelineItem) => m.status === 'done' && m.date <= today.slice(0, m.date.length)
  let nowIndex = items.findIndex((m) => !isPast(m))
  if (nowIndex === -1) nowIndex = items.length

  return (
    <ol className="mt-5">
      {items.map((m, i) => {
        const future = i >= nowIndex
        return (
          <Fragment key={m.key}>
            {i === nowIndex ? <NowRow text={text.now} date={nowText} iso={nowIso} /> : null}
            <li className={ROW}>
              {/* Date + state: above the title on phones, in its own column from md. */}
              <p className="col-start-2 row-start-1 flex flex-wrap items-baseline gap-x-2 pt-0.5 text-meta md:col-start-1 md:block md:pt-0.5 md:text-right">
                <time dateTime={m.date} className="figures font-semibold whitespace-nowrap text-ink md:block">
                  {m.dateText}
                </time>
                <span aria-hidden="true" className="text-rule-strong md:hidden">
                  ·
                </span>
                <span className={`md:mt-0.5 md:block ${m.status === 'done' ? 'text-emerald-ink' : 'text-ink-3'}`}>
                  {m.status === 'done' ? text.done : text.upcoming}
                </span>
              </p>
              <div className="relative col-start-1 row-span-2 row-start-1 flex justify-center md:col-start-2 md:row-span-1">
                <Rail dashed={future} first={i === 0} last={i === items.length - 1 && nowIndex < items.length} />
                <span className="relative mt-1">
                  <Marker status={m.status} />
                </span>
              </div>
              <div lang={lang} className="col-start-2 row-start-2 pt-1 pb-7 md:col-start-3 md:row-start-1 md:pt-0">
                <h3 className={`font-display text-h4 font-semibold ${future ? 'text-ink-2' : 'text-ink'}`}>{m.title}</h3>
                <p className="mt-1.5 text-ui leading-relaxed text-ink-2">{m.text}</p>
                {m.story ? (
                  <p className="mt-2 text-meta">
                    <span className="text-ink-3">{text.story}: </span>
                    <Link href={m.story.href} lang={m.story.lang} className="text-link font-medium">
                      {m.story.title}
                    </Link>
                  </p>
                ) : null}
              </div>
            </li>
          </Fragment>
        )
      })}
      {nowIndex === items.length ? <NowRow text={text.now} date={nowText} iso={nowIso} last /> : null}
    </ol>
  )
}

/** "Bugun": a 2px ink rule across the timeline at the current date. */
function NowRow({ text, date, iso, last = false }: { text: string; date: string; iso: string; last?: boolean }) {
  return (
    <li className={`${ROW} pb-7`}>
      <span aria-hidden="true" className="hidden md:col-start-1 md:row-start-1 md:block" />
      <div className="relative col-start-1 row-start-1 flex justify-center md:col-start-2">
        {last ? null : (
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-1/2 w-0 -translate-x-1/2 border-l border-dashed border-rule-strong" />
        )}
        <span aria-hidden="true" className="relative block h-[3px] w-4 bg-ink" />
      </div>
      <p className="col-start-2 row-start-1 flex flex-wrap items-baseline gap-x-2 border-t-2 border-ink pt-1.5 md:col-start-3">
        <span className="label-caps text-ink">{text}</span>
        <time dateTime={iso} className="figures text-meta whitespace-nowrap text-ink-3">
          {date}
        </time>
      </p>
    </li>
  )
}
