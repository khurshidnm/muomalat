import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, locales, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { clubMessages } from '@/i18n/messages/club'
import { getClubEvent, getClubEvents, getNextClubEvent } from '@/content'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Figure } from '@/components/ui/Figure'
import { Icon } from '@/components/ui/Icon'
import { InlineText } from '@/components/ui/InlineText'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ButtonLink } from '@/components/ui/Button'
import { EventDate } from '@/components/club/EventDate'
import { Agenda } from '@/components/club/Agenda'
import { Speakers } from '@/components/club/Speakers'
import { EventFacts, RegisterPanel, Takeaways } from '@/components/club/EventParts'
import { EventStatus } from '@/components/club/EventStatus'
import { daysUntil, eventDate, eventLd, eventSnippet } from '@/components/club/event'

type Params = { params: Promise<{ lang: string; slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => getClubEvents(lang).map((e) => ({ lang, slug: e.slug })))
}

function load(lang: string, slug: string) {
  if (!isLocale(lang)) return undefined
  return getClubEvent(lang, slug)
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params
  const e = load(lang, slug)
  if (!e || !isLocale(lang)) return {}
  const m = pick(clubMessages, lang)
  const title = `${e.title} — ${m.title}`
  // Meetings are written in Uzbek only: ru/en pages show the Uzbek text, so
  // they point canonical to Uzbek and only uz/uz-Cyrl are declared editions.
  const fallback = (lang === 'ru' || lang === 'en') && e.contentLang === 'uz'
  return {
    ...pageMetadata({
      locale: lang,
      path: paths.clubEvent(e.slug),
      title,
      description: eventSnippet(e),
      languages: ['uz', 'kr'],
      canonicalLocale: fallback ? 'uz' : undefined,
      images: [{ url: absoluteUrl(`${localePath(lang, paths.clubEvent(e.slug))}/opengraph-image`), width: 1200, height: 630, alt: e.title }],
    }),
    title: { absolute: title },
  }
}

export default async function ClubEventPage({ params }: Params) {
  const { lang, slug } = await params
  const event = load(lang, slug)
  if (!event || !isLocale(lang)) notFound()
  const locale: Locale = lang
  const e = event
  const t = pick(commonMessages, locale)
  const m = pick(clubMessages, locale)
  const upcoming = e.status === 'upcoming'
  const left = upcoming ? daysUntil(e.startsAt) : 0
  const join = href(locale, paths.clubJoin())
  const clubHref = href(locale, paths.club())
  const next = upcoming ? undefined : getNextClubEvent(locale)
  const others = getClubEvents(locale).filter((x) => x.slug !== e.slug).slice(0, 4)
  const url = absoluteUrl(localePath(locale, paths.clubEvent(e.slug)))

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      eventLd(e, locale),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: m.title, item: absoluteUrl(localePath(locale, paths.club())) },
          { '@type': 'ListItem', position: 3, name: e.title, item: url },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <article className="pb-4">
        <header className="wrap pt-5 pb-6 md:pt-8 md:pb-8">
          <Breadcrumbs
            label={t.labels.breadcrumbs}
            items={[
              { name: t.nav.home, href: href(locale, '/') },
              { name: m.title, href: clubHref },
              { name: m.event.number(e.number) },
            ]}
          />
          <div className="mt-5 max-w-[52rem]">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <EventStatus event={e} locale={locale} />
              <span aria-hidden="true" className="text-rule-strong">
                /
              </span>
              <span className="label-caps text-ink-3">{m.event.number(e.number)}</span>
            </p>
            <h1 lang={e.contentLang} className="mt-3 font-display text-h1 font-semibold text-ink">
              {e.title}
            </h1>
            <p className="mt-3 text-ui text-ink-2 md:mt-4">
              <span className="font-semibold text-ink">{m.event.theme}:</span> <span lang={e.contentLang}>{e.theme}</span>
            </p>
          </div>
        </header>

        <div className="wrap">
          <div className="grid gap-x-8 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              {/* When and where */}
              <div className="rule-ink pt-5 sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-7">
                <EventDate
                  event={e}
                  locale={locale}
                  size="md"
                  responsive
                  note={left > 0 ? m.event.daysLeft(left) : undefined}
                  className="sm:border-r sm:border-rule sm:pr-7"
                />
                <EventFacts
                  event={e}
                  locale={locale}
                  showDate={false}
                  className="mt-5 sm:mt-0 sm:[&>div:first-child]:border-t-0 sm:[&>div:first-child]:pt-0"
                />
              </div>

              {upcoming ? (
                <RegisterPanel
                  event={e}
                  locale={locale}
                  href={join}
                  id="register-inline"
                  className="mt-6 lg:hidden"
                />
              ) : null}

              <p lang={e.contentLang} className="mt-8 max-w-measure font-serif text-standfirst text-ink-2">
                {e.summary}
              </p>

              {e.takeaways?.length ? (
                <section aria-labelledby="xulosalar" className="mt-8 max-w-measure border-t-2 border-brass bg-paper-2 p-5 md:p-6">
                  <h2 id="xulosalar" className="label-caps text-brass-ink">
                    {m.event.takeaways}
                  </h2>
                  <Takeaways items={e.takeaways} lang={e.contentLang} className="mt-4 [&>li]:text-ink" />
                </section>
              ) : null}

              {e.image ? (
                <Figure
                  image={e.image}
                  lang={e.contentLang}
                  preload={!upcoming}
                  sizes="(min-width: 1280px) 790px, (min-width: 1024px) 66vw, 100vw"
                  className="-mx-4 mt-8 sm:mx-0 [&>figcaption]:px-4 sm:[&>figcaption]:px-0"
                />
              ) : null}

              {/* Report (past meetings) */}
              {e.report?.length ? (
                <section aria-labelledby="hisobot" className="mt-10">
                  <SectionHeader id="hisobot" title={m.event.report} />
                  <div lang={e.contentLang} className="article-body mt-5">
                    {e.report.map((p, i) => (
                      <p key={i}>
                        <InlineText text={p} locale={locale} />
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="kun-tartibi" className="mt-10 md:mt-12">
                <SectionHeader id="kun-tartibi" title={m.event.agenda} />
                <Agenda event={e} locale={locale} className="mt-3 max-w-measure" />
              </section>

              {e.speakers.length ? (
                <section aria-labelledby="spikerlar" className="mt-10 md:mt-12">
                  <SectionHeader id="spikerlar" title={m.event.speakers} />
                  <Speakers event={e} locale={locale} layout="grid" hostLabel={m.event.host} className="mt-5" />
                </section>
              ) : null}

              <p className="mt-10 flex max-w-measure items-start gap-2 text-meta leading-relaxed text-ink-3">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-emerald" />
                <span>
                  {m.about.notice}{' '}
                  <Link href={href(locale, paths.policy())} className="text-link whitespace-nowrap">
                    {t.nav.policy}
                  </Link>
                </span>
              </p>

              {/* Phones: the closing call to action */}
              <div className="mt-8 lg:hidden">
                {upcoming ? (
                  <ButtonLink href={join} size="lg" className="w-full xs:w-auto">
                    {m.event.register}
                    <Icon name="arrow-right" size={18} />
                  </ButtonLink>
                ) : (
                  <ClubJoin locale={locale} next={next} id="join-inline" />
                )}
              </div>
            </div>

            {/* Desktop rail */}
            <aside aria-label={m.event.inThisMeeting} className="no-print hidden lg:col-span-4 lg:block">
              <div className="sticky top-20 space-y-8">
                {upcoming ? (
                  <RegisterPanel
                    event={e}
                    locale={locale}
                    href={join}
                    id="register-rail"
                    secondary={{ href: clubHref, label: m.event.allMeetings }}
                  />
                ) : (
                  <ClubJoin locale={locale} next={next} id="join-rail" />
                )}
              </div>
            </aside>
          </div>
        </div>
      </article>

      {others.length ? (
        <section aria-labelledby="boshqa-uchrashuvlar" className="wrap no-print mt-12 md:mt-16">
          <SectionHeader id="boshqa-uchrashuvlar" title={m.event.others} href={clubHref} linkLabel={t.actions.all} />
          <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o, i) => (
              <li
                key={o.slug}
                className={`grid grid-cols-[5.5rem_1fr] gap-x-4 py-4 sm:block sm:py-0 sm:pr-5 lg:mt-0 lg:border-t-0 lg:pt-0 ${
                  i > 0 ? 'border-t border-rule lg:border-l lg:pl-5' : 'pt-0'
                } ${i < 2 ? 'sm:border-t-0' : 'sm:mt-5 sm:pt-5'} ${i % 2 === 1 ? 'sm:border-l sm:pl-5' : ''}`}
              >
                <EventDate event={o} locale={locale} size="sm" className="sm:text-left" />
                <div className="min-w-0 sm:mt-3">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <EventStatus event={o} locale={locale} />
                  </p>
                  <h3 lang={o.contentLang} className="mt-1.5 font-display text-h4 font-semibold">
                    <Link href={href(locale, paths.clubEvent(o.slug))} className="headline-link">
                      {o.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-meta text-ink-3">{m.event.number(o.number)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

/** Past-meeting rail: membership call to action and the next date. */
function ClubJoin({ locale, next, id }: { locale: Locale; next?: ReturnType<typeof getNextClubEvent>; id: string }) {
  const t = pick(commonMessages, locale)
  const m = pick(clubMessages, locale)
  const nd = next ? eventDate(next, locale) : undefined
  return (
    <section aria-labelledby={id} className="border-t-2 border-emerald bg-emerald-wash/60 p-5">
      <p className="label-caps text-emerald">{m.kicker}</p>
      <h2 id={id} className="mt-1.5 font-display text-h4 font-semibold text-ink">
        {m.title}
      </h2>
      <p className="mt-1.5 text-ui text-ink-2">{m.standfirst}</p>
      {next && nd ? (
        <p className="mt-4 border-t border-rule pt-3 text-meta text-ink-2">
          <span className="font-semibold text-ink">{m.nextShort(nd.dayMonth)}</span>
          <br />
          <Link href={href(locale, paths.clubEvent(next.slug))} lang={next.contentLang} className="text-link">
            {next.title}
          </Link>
        </p>
      ) : null}
      <ButtonLink href={href(locale, paths.clubJoin())} size="lg" className="mt-4 w-full xs:w-auto lg:w-full">
        {t.actions.joinClub}
        <Icon name="arrow-right" size={18} />
      </ButtonLink>
    </section>
  )
}
