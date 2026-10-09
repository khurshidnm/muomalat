import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { clubMessages } from '@/i18n/messages/club'
import { getClubEvents, getNextClubEvent, getPastClubEvents } from '@/content'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { formatNumber } from '@/lib/format'
import { Girih } from '@/components/ui/Girih'
import { Kicker } from '@/components/ui/Kicker'
import { Icon } from '@/components/ui/Icon'
import { Thumb } from '@/components/ui/Figure'
import { ButtonLink } from '@/components/ui/Button'
import { Placeholder } from '@/components/ui/Placeholder'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EventDate } from '@/components/club/EventDate'
import { Agenda } from '@/components/club/Agenda'
import { Speakers } from '@/components/club/Speakers'
import { EventFacts, RegisterPanel, Takeaways } from '@/components/club/EventParts'
import { Application } from '@/components/club/Application'
import { daysUntil, eventDate, eventLd } from '@/components/club/event'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false
/** Seconds; meeting changes reach the page sooner through tags (CMS-SPEC §8.2). */
export const revalidate = 3600

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const m = pick(clubMessages, lang)
  return {
    ...pageMetadata({ locale: lang, path: paths.club(), title: m.metaTitle, description: m.metaDescription }),
    title: { absolute: m.metaTitle },
  }
}

export default async function ClubPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const m = pick(clubMessages, locale)
  const next = await getNextClubEvent(locale)
  const past = await getPastClubEvents(locale)
  const all = await getClubEvents(locale)
  // Place and size of the meetings, for the Format column: "Toshkent · bir uchrashuvda 60–80 oʻrin".
  const capacities = all.map((e) => e.capacity).filter((n): n is number => !!n)
  const minSeats = capacities.length ? Math.min(...capacities) : 0
  const maxSeats = capacities.length ? Math.max(...capacities) : 0
  const seats = maxSeats
    ? m.about.seatsPerMeeting(
        minSeats !== maxSeats ? `${formatNumber(minSeats, locale)}–${formatNumber(maxSeats, locale)}` : formatNumber(maxSeats, locale),
        maxSeats,
      )
    : undefined
  const venueOf = next ?? past[0]
  const nd = next ? eventDate(next, locale) : undefined
  const left = next ? daysUntil(next.startsAt) : 0
  const nextHref = next ? href(locale, paths.clubEvent(next.slug)) : ''

  const url = absoluteUrl(localePath(locale, paths.club()))
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      ...(next ? [eventLd(next, locale)] : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: m.title, item: url },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      {/* Header band: the club is one of the two places the girih appears. */}
      <header className="border-b border-rule bg-paper-2">
        <div aria-hidden="true" className="border-b border-rule opacity-80 lg:hidden">
          <Girih size={36} className="h-[4.5rem]" />
        </div>
        <div className="wrap">
          <div className="grid lg:grid-cols-12 lg:gap-x-8">
            <div className="py-7 md:py-10 lg:col-span-7 lg:py-16">
              <Kicker>{m.kicker}</Kicker>
              <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{m.title}</h1>
              <p className="mt-3 max-w-[36rem] font-serif text-standfirst text-ink-2 md:mt-4">{m.standfirst}</p>
              <div className="mt-6 flex flex-col gap-2 xs:flex-row xs:flex-wrap">
                <ButtonLink href="#ariza" size="lg">
                  {t.actions.joinClub}
                </ButtonLink>
                {next && nd ? (
                  <ButtonLink href="#navbatdagi-uchrashuv" variant="secondary" size="lg" className="lg:hidden">
                    <Icon name="calendar" size={18} />
                    {m.nextShort(nd.dayMonth)}
                  </ButtonLink>
                ) : null}
              </div>
            </div>
            <div className="relative hidden border-x border-rule lg:col-span-5 lg:flex lg:items-center lg:justify-center lg:py-12">
              <div aria-hidden="true" className="absolute inset-0 opacity-75">
                <Girih size={72} className="h-full w-full" />
              </div>
              {next && nd ? (
                <a
                  href="#navbatdagi-uchrashuv"
                  className="group relative block w-[15.5rem] border border-rule border-t-2 border-t-brass bg-paper px-6 pt-4 pb-5 text-center"
                >
                  <span className="label-caps block text-ink-3">{m.event.upcoming}</span>
                  <span className="figures mt-0.5 block text-meta text-ink-3">{m.event.number(next.number)}</span>
                  <EventDate event={next} locale={locale} size="lg" className="mt-3" />
                  <span className="mt-4 flex items-center justify-center gap-1.5 border-t border-rule pt-3 text-meta font-semibold text-emerald group-hover:text-emerald-ink">
                    {m.event.register}
                    <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* About */}
      <section aria-labelledby="klub-about" className="wrap mt-8 md:mt-12">
        <SectionHeader id="klub-about" title={m.about.title} />
        <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-x-8">
          <div className="max-w-measure min-w-0 space-y-4 font-serif text-[1.125rem] leading-[1.62] text-ink md:text-body lg:col-span-7">
            {m.about.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <aside aria-labelledby="klub-members" className="lg:col-span-5">
            <div className="border-t-2 border-brass bg-paper-2 p-5 md:p-6">
              <h3 id="klub-members" className="label-caps text-brass-ink">
                {m.about.membersTitle}
              </h3>
              <Takeaways items={m.about.members} className="mt-4 [&>li]:text-ink" />
              <dl className="mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-rule pt-4 text-meta">
                <dt className="text-ink-3">{m.about.fee}</dt>
                <dd className="text-ink">
                  <Placeholder>{m.about.feeValue}</Placeholder>
                </dd>
              </dl>
              <Link
                href="#ariza"
                className="group mt-3 inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink"
              >
                {t.actions.joinClub}
                <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </aside>
        </div>
        <dl className="mt-8 grid border-y border-rule md:grid-cols-3">
          {(
            [
              [m.about.whoTitle, m.about.who],
              [m.about.formatTitle, m.about.format],
              [m.about.organiserTitle, m.about.organiser],
            ] as const
          ).map(([k, v], i) => (
            <div
              key={k}
              className={`py-4 md:py-5 ${i > 0 ? 'border-t border-rule md:border-t-0 md:border-l md:pl-6' : ''} ${i < 2 ? 'md:pr-6' : ''}`}
            >
              <dt className="label-caps text-ink-3">{k}</dt>
              <dd className="mt-1.5 text-ui text-ink-2">
                {v}
                {k === m.about.formatTitle && venueOf ? (
                  <span className="mt-2 block text-meta font-semibold text-ink">
                    <span lang={venueOf.contentLang}>{venueOf.venue.city}</span>
                    {seats ? (
                      <>
                        <span aria-hidden="true" className="px-1.5 font-normal text-rule-strong">
                          ·
                        </span>
                        {seats}
                      </>
                    ) : null}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex max-w-[52rem] items-start gap-2 text-meta leading-relaxed text-ink-3">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-emerald" />
          <span>
            {m.about.notice}{' '}
            <Link href={href(locale, paths.policy())} className="text-link whitespace-nowrap">
              {t.nav.policy}
            </Link>
          </span>
        </p>
      </section>

      {/* Next meeting */}
      {next && nd ? (
        <section id="navbatdagi-uchrashuv" aria-labelledby="next-title" className="wrap mt-12 scroll-mt-20 md:mt-16">
          <SectionHeader id="next-title" title={m.event.upcoming} href={nextHref} linkLabel={t.actions.more} />
          <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-x-8">
            <div className="min-w-0 lg:col-span-8">
              <div className="grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-7">
                <EventDate
                  event={next}
                  locale={locale}
                  size="lg"
                  note={left > 0 ? m.event.daysLeft(left) : undefined}
                  className="border-r border-rule pr-5 sm:pr-7"
                />
                <div className="min-w-0">
                  <p className="label-caps text-emerald">{m.event.number(next.number)}</p>
                  <h3 lang={next.contentLang} className="mt-1.5 font-display text-h3 font-semibold md:text-h2">
                    <Link href={nextHref} className="headline-link">
                      {next.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-meta text-ink-3">
                    <span className="font-semibold text-ink-2">{m.event.theme}:</span>{' '}
                    <span lang={next.contentLang}>{next.theme}</span>
                  </p>
                </div>
              </div>
              <p lang={next.contentLang} className="mt-5 max-w-measure font-serif text-lead leading-relaxed text-ink-2 md:text-[1.125rem]">
                {next.summary}
              </p>
              <EventFacts event={next} locale={locale} showDate={false} className="mt-6 max-w-measure" />
              <RegisterPanel event={next} locale={locale} href="#ariza" id="next-register-m" as="h3" className="mt-6 lg:hidden" />
              <div className="mt-8">
                <h3 className="label-caps text-ink-3">{m.event.agenda}</h3>
                <Agenda event={next} locale={locale} className="mt-1 max-w-measure" />
              </div>
            </div>
            <div className="space-y-8 lg:col-span-4">
              <RegisterPanel event={next} locale={locale} href="#ariza" id="next-register" as="h3" className="hidden lg:block" />
              <section aria-labelledby="next-speakers">
                <h3 id="next-speakers" className="rule-ink label-caps pt-2.5 text-ink">
                  {m.event.speakers}
                </h3>
                <Speakers event={next} locale={locale} hostLabel={m.event.host} className="mt-3" />
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {/* Past meetings */}
      {past.length ? (
        <section aria-labelledby="past-title" className="wrap mt-12 md:mt-16">
          <SectionHeader id="past-title" title={m.past.title} description={m.past.intro} />
          <ol className="mt-5">
            {past.map((e) => {
              const link = href(locale, paths.clubEvent(e.slug))
              return (
                <li
                  key={e.slug}
                  className="grid grid-cols-[6rem_1fr] gap-x-4 border-t border-rule py-6 first:border-t-0 first:pt-1 sm:grid-cols-[6.5rem_1fr] sm:gap-x-6 lg:grid-cols-12 lg:gap-x-8"
                >
                  <EventDate event={e} locale={locale} size="sm" className="border-r border-rule pr-4 sm:pr-6 lg:col-span-2 lg:pr-8" />
                  <div className="min-w-0 lg:col-span-6">
                    <p className="label-caps text-ink-3">{m.event.number(e.number)}</p>
                    <h3 lang={e.contentLang} className="mt-1 font-display text-h3 font-semibold">
                      <Link href={link} className="headline-link">
                        {e.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-meta text-ink-3">
                      <span className="font-semibold text-ink-2">{m.event.theme}:</span> <span lang={e.contentLang}>{e.theme}</span>
                    </p>
                    {e.takeaways?.length ? (
                      <div className="mt-4">
                        <p className="label-caps text-ink-3">{m.event.takeaways}</p>
                        <Takeaways items={e.takeaways.slice(0, 3)} lang={e.contentLang} className="mt-2" />
                      </div>
                    ) : null}
                    <Link
                      href={link}
                      className="group mt-3 inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-emerald hover:text-emerald-ink"
                    >
                      {m.event.readReport}
                      <span className="sr-only">
                        : <span lang={e.contentLang}>{e.title}</span>
                      </span>
                      <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                  {e.image ? (
                    <Link href={link} tabIndex={-1} aria-hidden="true" className="hidden lg:col-span-4 lg:block">
                      <Thumb image={e.image} sizes="(min-width: 1280px) 400px, 33vw" />
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      <Application locale={locale} next={next} className="mt-12 md:mt-16" />
    </>
  )
}
