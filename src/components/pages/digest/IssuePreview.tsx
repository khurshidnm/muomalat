import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { digestMessages } from '@/i18n/messages/digest'
import { site } from '@/content/data/site'
import { formatDate, tashkentParts } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { Timestamp } from '@/components/ui/Timestamp'
import { buttonClass } from '@/components/ui/Button'
import { firstSentence, type DigestIssue, type DigestIssueFull } from './issue'

const OPSZ = { fontVariationSettings: '"opsz" 60' } as const

/** Group label inside the e-mail: small caps on an ink hairline, like a newsletter section head. */
function GroupTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h4 id={id} className="label-caps border-b border-ink pb-2 text-ink">
      {children}
    </h4>
  )
}

/**
 * Web version of the latest weekly e-mail: envelope (from / subject / date),
 * masthead, six stories with one-line summaries, number of the week, term of
 * the week and the next club meeting. Story text keeps its own `lang`.
 */
export function IssuePreview({ issue, locale }: { issue: DigestIssueFull; locale: Locale }) {
  const d = pick(digestMessages, locale).page
  const p = d.preview
  const num = d.numberOfWeek
  const t = pick(commonMessages, locale)
  const top = issue.stories[0]
  const { term, club, numberStory } = issue
  // Each equivalent in its own language, as in TermOfDay.
  const eq = term
    ? [
        term.aliases.en ? { lang: 'en', text: term.aliases.en } : null,
        term.aliases.ru ? { lang: 'ru', text: term.aliases.ru } : null,
      ].filter((x) => x !== null)
    : []

  return (
    <article aria-labelledby="issue-title" className="border border-rule bg-paper-2">
      {/* Mail-client chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
        <p className="label-caps inline-flex items-center gap-1.5 text-ink-3">
          <Icon name="mail" size={15} />
          {p.sample}
        </p>
        <p className="figures text-meta font-semibold text-ink-2">{p.issue(issue.number)}</p>
      </div>
      <dl aria-label={p.envelope} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-b border-rule px-4 py-3 text-meta">
        <dt className="text-ink-3">{p.from}</dt>
        <dd className="font-semibold text-ink">{p.sender}</dd>
        <dt className="text-ink-3">{p.subject}</dt>
        <dd className="text-ink">
          {p.issueTitle(issue.number)}
          {top ? (
            <>
              {': '}
              <span lang={top.contentLang}>{top.title}</span>
            </>
          ) : null}
        </dd>
        <dt className="text-ink-3">{p.date}</dt>
        <dd className="text-ink-2">
          <Timestamp iso={issue.sentAt} locale={locale} style="weekdayDate" />, <Timestamp iso={issue.sentAt} locale={locale} style="time" />
        </dd>
      </dl>
      {p.languageNote ? (
        <p className="flex items-start gap-1.5 border-b border-rule px-4 py-2.5 text-meta text-ink-3">
          <Icon name="globe" size={15} className="mt-px shrink-0" />
          {p.languageNote}
        </p>
      ) : null}

      {/* The e-mail itself */}
      <div className="sm:p-6 md:p-8">
        <div className="mx-auto max-w-[36rem] bg-paper px-4 pt-7 pb-6 sm:px-8 sm:pt-9 sm:pb-8">
          <header className="text-center">
            <p aria-hidden="true" className="inline-flex items-baseline font-display text-[1.875rem] leading-none font-semibold tracking-[-0.022em] text-ink" style={OPSZ}>
              {site.name}
              <span className="ml-[0.12em] inline-block size-2.5 translate-y-[-0.05em] rotate-45 bg-brass" />
            </p>
            <h3 id="issue-title" className="label-caps mt-3 text-ink-2">
              <span className="sr-only">{site.name}. </span>
              {p.issueTitle(issue.number)}
            </h3>
            <p className="mt-1 text-meta text-ink-3">
              <Timestamp iso={issue.sentAt} locale={locale} style="date" />
            </p>
          </header>
          <div aria-hidden="true" className="mt-5 border-t-2 border-ink" />
          <div aria-hidden="true" className="mt-[3px] border-t border-ink" />

          <p className="mt-6 font-serif text-[1.125rem] font-semibold text-ink">{p.greeting}</p>
          <p className="mt-2 font-serif text-lead leading-relaxed text-ink-2">{p.intro}</p>
          <p className="figures mt-3 inline-flex items-center gap-1.5 text-meta text-ink-3">
            <Icon name="clock" size={14} />
            {p.summary(issue.stories.length, issue.minutes)}
          </p>

          {/* Stories */}
          <section aria-labelledby="issue-stories" className="mt-8">
            <GroupTitle id="issue-stories">{p.stories}</GroupTitle>
            <ol>
              {issue.stories.map((a, i) => (
                <li key={a.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 border-b border-rule py-4 last:border-b-0 last:pb-0">
                  <span aria-hidden="true" className="figures font-display text-[1.625rem] leading-none font-semibold text-brass" style={OPSZ}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="label-caps text-emerald">{t.rubrics[a.rubric].name}</p>
                    <h5 lang={a.contentLang} className="mt-1 font-display text-h4 font-semibold">
                      <Link href={href(locale, a.url)} className="headline-link">
                        {a.title}
                      </Link>
                    </h5>
                    <p lang={a.contentLang} className="mt-1.5 text-ui text-ink-2">
                      {firstSentence(a.lead)}
                    </p>
                    <p className="mt-1.5 text-meta text-ink-3">{t.labels.readingTime(a.readingMinutes)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Number of the week */}
          <section aria-labelledby="issue-number" className="mt-8 border-t-2 border-brass bg-paper-2 px-4 py-5 sm:px-5">
            <h4 id="issue-number" className="label-caps text-brass-ink">
              {p.numberTitle}
            </h4>
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4">
              <p className="figures font-display text-numeral font-semibold text-brass-ink" style={OPSZ}>
                {num.value}
              </p>
              <p className="pt-1 font-serif text-lead leading-snug text-ink">{num.text}</p>
            </div>
            <p className="mt-3 border-t border-rule pt-3 text-meta text-ink-3">
              {p.source}: {num.source}
              {numberStory ? (
                <>
                  {' · '}
                  <Link href={href(locale, numberStory.url)} className="text-link font-medium">
                    {p.readStory}
                  </Link>
                </>
              ) : null}
            </p>
          </section>

          {/* Term of the week */}
          {term ? (
            <section aria-labelledby="issue-term" className="mt-8">
              <GroupTitle id="issue-term">{p.termTitle}</GroupTitle>
              <p lang={term.contentLang} className="mt-4 font-display text-h3 font-semibold" style={{ fontVariationSettings: '"opsz" 48' }}>
                <Link href={href(locale, paths.term(term.slug))} className="headline-link">
                  {term.term}
                </Link>
              </p>
              {eq.length ? (
                <p className="mt-1 text-meta text-ink-3">
                  {eq.map((x, i) => (
                    <span key={x.lang}>
                      {i > 0 ? <span aria-hidden="true"> · </span> : null}
                      <span lang={x.lang}>{x.text}</span>
                    </span>
                  ))}
                </p>
              ) : null}
              <p lang={term.contentLang} className="mt-2.5 font-serif text-lead leading-relaxed text-ink-2">
                {term.short}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="inline-flex items-center gap-1.5 text-meta text-ink-3">
                  <Icon name="info" size={14} className="shrink-0" />
                  {p.termWhy}
                </p>
                <Link
                  href={href(locale, paths.term(term.slug))}
                  className="group inline-flex items-center gap-1 text-meta font-semibold text-emerald hover:text-emerald-ink"
                >
                  {p.readTerm}
                  <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </section>
          ) : null}

          {/* Club */}
          {club ? <ClubLine club={club} locale={locale} /> : null}

          <p className="mt-9 font-serif text-lead text-ink-2 italic">— {p.signoff}</p>

          <footer className="mt-6 border-t border-rule pt-4 text-[0.75rem] leading-relaxed text-ink-3">
            <p>{p.footer}</p>
            <p className="mt-2">
              {d.unsubscribe} · {site.domain}
            </p>
          </footer>
        </div>
      </div>
    </article>
  )
}

function ClubLine({ club, locale }: { club: NonNullable<DigestIssueFull['club']>; locale: Locale }) {
  const p = pick(digestMessages, locale).page.preview
  const day = tashkentParts(club.startsAt).day
  const month = formatDate(club.startsAt, locale, 'dayMonth').replace(/^\d+[-\s]?/, '')
  return (
    <section aria-labelledby="issue-club" className="mt-8">
      <GroupTitle id="issue-club">{p.clubTitle}</GroupTitle>
      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
        <p className="border-r border-rule pr-4 text-center">
          <time dateTime={club.startsAt} className="block">
            <span className="figures block text-[2.5rem] leading-none font-semibold text-ink">{day}</span>
            <span className="label-caps mt-1 block text-ink-2">{month}</span>
            <span className="figures mt-0.5 block text-meta text-ink-3">{formatDate(club.startsAt, locale, 'time')}</span>
          </time>
        </p>
        <div className="min-w-0">
          <p className="text-meta text-ink-3">{p.clubMeeting(club.number)}</p>
          <h5 lang={club.contentLang} className="mt-1 font-display text-h4 font-semibold">
            <Link href={href(locale, paths.clubEvent(club.slug))} className="headline-link">
              {club.title}
            </Link>
          </h5>
          <p lang={club.contentLang} className="mt-1.5 flex items-start gap-1.5 text-meta text-ink-3">
            <Icon name="pin" size={15} className="mt-px shrink-0" />
            <span>
              {club.venue.name}, {club.venue.city}
            </span>
          </p>
        </div>
      </div>
      <Link href={href(locale, paths.clubJoin())} className={buttonClass('secondary', 'md', 'mt-4 w-full xs:w-auto')}>
        {p.clubCta}
      </Link>
    </section>
  )
}

/** "Keyingi son": when the next e-mail goes out, with a jump to the signup form. */
export function NextIssue({ number, sendAt, locale }: { number: number; sendAt: string; locale: Locale }) {
  const p = pick(digestMessages, locale).page.preview
  return (
    <section aria-labelledby="next-issue" className="border-t-2 border-ink pt-2.5">
      <h3 id="next-issue" className="label-caps text-ink-3">
        {p.nextTitle}
      </h3>
      <div className="mt-3 flex items-end gap-4">
        <p className="figures font-display text-numeral font-semibold text-brass-ink" style={OPSZ}>
          {p.issue(number)}
        </p>
      </div>
      <p className="mt-3 font-display text-h4 font-semibold">
        <Timestamp iso={sendAt} locale={locale} style="weekdayDate" />
      </p>
      <p className="mt-1 text-ui text-ink-2">{p.nextText}</p>
      <a href="#obuna" className={buttonClass('primary', 'md', 'mt-4 w-full')}>
        <Icon name="mail" size={18} />
        {p.nextCta}
      </a>
    </section>
  )
}

/** Earlier issues, each represented by its top story. */
export function PreviousIssues({ issues, locale }: { issues: DigestIssue[]; locale: Locale }) {
  const p = pick(digestMessages, locale).page.preview
  if (!issues.length) return null
  return (
    <section aria-labelledby="previous-issues" className="border-t-2 border-ink pt-2.5">
      <h3 id="previous-issues" className="font-display text-h4 font-semibold">
        {p.previousTitle}
      </h3>
      <ol className="mt-1">
        {issues.map((i) => {
          const lead = i.stories[0]
          return (
            <li key={i.number} className="border-b border-rule py-3.5 last:border-b-0">
              <p className="figures text-meta text-ink-3">
                <span className="font-semibold text-ink-2">{p.issue(i.number)}</span>
                {' · '}
                <Timestamp iso={i.sentAt} locale={locale} style="dayMonth" />
              </p>
              {lead ? (
                <>
                  <p className="label-caps mt-2 text-ink-3">{p.previousLead}</p>
                  <p lang={lead.contentLang} className="mt-1 font-serif text-lead leading-snug font-semibold">
                    <Link href={href(locale, lead.url)} className="headline-link">
                      {lead.title}
                    </Link>
                  </p>
                </>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
