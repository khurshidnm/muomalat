import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { homeMessages } from '@/i18n/messages/home'
import {
  getArticles,
  getArticlesByRubric,
  getLatest,
  getLeadStory,
  getMostRead,
  getNextClubEvent,
  getTermOfDay,
  type ArticleView,
} from '@/content'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GirihDivider } from '@/components/ui/Girih'
import { StoryLead } from '@/components/story/StoryLead'
import { StoryItem } from '@/components/story/StoryItem'
import { StoryMeta } from '@/components/story/StoryMeta'
import { LatestFeed } from '@/components/story/LatestFeed'
import { MostRead } from '@/components/story/MostRead'
import { MarketSnapshot } from '@/components/blocks/MarketSnapshot'
import { TermOfDay } from '@/components/blocks/TermOfDay'
import { ClubTeaser } from '@/components/blocks/ClubTeaser'
import { DigestSignup } from '@/components/blocks/DigestSignup'
import { AdSlot } from '@/components/blocks/AdSlot'
import { SponsoredTeaser } from '@/components/blocks/SponsoredTeaser'
import { InterviewFeature } from '@/components/blocks/InterviewFeature'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const h = pick(homeMessages, lang)
  const t = pick(commonMessages, lang)
  return {
    ...pageMetadata({ locale: lang, path: '/', title: h.metaTitle, description: t.description }),
    title: { absolute: h.metaTitle },
  }
}

/** Picks articles for front-page slots without repeating any story. */
function slotPicker() {
  const used = new Set<string>()
  return {
    take(list: ArticleView[], n: number, filter: (a: ArticleView) => boolean = () => true) {
      const out = list.filter((a) => !used.has(a.id) && !a.sponsored && filter(a)).slice(0, n)
      out.forEach((a) => used.add(a.id))
      return out
    },
    use(a?: ArticleView) {
      if (a) used.add(a.id)
      return a
    },
  }
}

export default async function HomePage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const h = pick(homeMessages, locale)

  const all = getArticles(locale)
  const pick_ = slotPicker()
  const lead = pick_.use(getLeadStory(locale))
  const secondary = [
    ...pick_.take(all, 1, (a) => !!a.featured),
    ...pick_.take(all, 1, (a) => a.rubric === 'yangiliklar'),
    ...pick_.take(all, 1, (a) => a.rubric === 'dunyo' || a.rubric === 'intervyu'),
  ]
  const latest = getLatest(locale, 9, [lead?.id, ...secondary.map((a) => a.id)].filter((x): x is string => !!x))
  const analysis = pick_.take(getArticlesByRubric(locale, 'tahlil'), 4)
  const interviews = pick_.take(getArticlesByRubric(locale, 'intervyu'), 3)
  const explainers = pick_.take(getArticlesByRubric(locale, 'izoh'), 3)
  const world = pick_.take(getArticlesByRubric(locale, 'dunyo'), 4)
  const sponsored = all.find((a) => a.sponsored)
  const mostRead = getMostRead(locale, 5)
  const term = getTermOfDay(locale)
  const nextEvent = getNextClubEvent(locale)

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        name: site.name,
        url: absoluteUrl(localePath(locale, '/')),
        inLanguage: locale === 'kr' ? 'uz-Cyrl' : locale,
        description: t.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl(localePath(locale, '/qidiruv'))}?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      { ...publisherLd, '@id': `${site.url}/#organization` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <h1 className="sr-only">
        {t.siteName} — {t.taglineInline}
      </h1>

      {/* Front: lead, secondary row, latest wire */}
      <div className="wrap pt-5 md:pt-7">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8 lg:border-r lg:border-rule lg:pr-8">
            {lead ? <StoryLead article={lead} locale={locale} /> : null}
            {secondary.length ? (
              <ul className="mt-7 grid border-t border-rule sm:grid-cols-3">
                {secondary.map((a, i) => (
                  <li
                    key={a.id}
                    className={`border-b border-rule py-4 sm:border-b-0 sm:py-5 ${i > 0 ? 'sm:border-l sm:pl-5' : ''} ${i < secondary.length - 1 ? 'sm:pr-5' : ''}`}
                  >
                    <StoryItem article={a} locale={locale} variant="compact" kicker="rubric" meta={['time']} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="lg:col-span-4">
            <LatestFeed articles={latest} locale={locale} />
          </div>
        </div>
      </div>

      <div className="mt-10 md:mt-14">
        <MarketSnapshot locale={locale} />
      </div>

      {/* Tahlil */}
      {analysis.length ? (
        <section aria-labelledby="home-analysis" className="wrap mt-10 md:mt-14">
          <SectionHeader
            id="home-analysis"
            title={h.analysis}
            href={href(locale, paths.rubric('tahlil'))}
            linkLabel={t.actions.all}
            description={t.rubrics.tahlil.description}
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-7">
              <StoryItem
                article={analysis[0]}
                locale={locale}
                variant="media-top"
                as="h3"
                kicker
                lead
                meta={['author', 'reading']}
                imageSizes="(min-width: 1024px) 700px, 100vw"
              />
            </div>
            <ul className="lg:col-span-5">
              {analysis.slice(1).map((a) => (
                <li key={a.id} className="border-t border-rule py-4 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-4">
                  <StoryItem article={a} locale={locale} variant="media-side" kicker lead={false} meta={['author', 'reading']} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Intervyu + Koʻp oʻqilgan */}
      <div className="wrap mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-x-8">
        {interviews.length ? (
          <section aria-labelledby="home-interviews" className="lg:col-span-8">
            <SectionHeader id="home-interviews" title={h.interviews} href={href(locale, paths.rubric('intervyu'))} linkLabel={t.actions.all} />
            <div className="mt-5">
              <InterviewFeature article={interviews[0]} locale={locale} />
            </div>
            {interviews.length > 1 ? (
              <ul className="mt-7 grid gap-5 border-t border-rule pt-5 sm:grid-cols-2 sm:gap-6">
                {interviews.slice(1).map((a) => (
                  <li key={a.id}>
                    <StoryItem article={a} locale={locale} variant="compact" kicker={false} meta={['time']} />
                    {a.interviewee ? (
                      <p lang={locale === 'kr' ? 'uz-Cyrl' : 'uz'} className="mt-1.5 text-meta text-ink-3">
                        {a.interviewee.name}, {a.interviewee.role}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        <div className="space-y-8 lg:col-span-4">
          <MostRead articles={mostRead} locale={locale} />
          {sponsored ? <SponsoredTeaser article={sponsored} locale={locale} /> : null}
        </div>
      </div>

      <div className="wrap mt-12 md:mt-16">
        <AdSlot locale={locale} format="leaderboard" slot="home-mid" className="hidden md:block" />
        <AdSlot locale={locale} format="mpu" slot="home-mid-mobile" className="md:hidden" />
      </div>

      {/* Izoh + Kun atamasi */}
      <section aria-labelledby="home-explainers" className="wrap mt-12 md:mt-16">
        <SectionHeader
          id="home-explainers"
          title={h.explainers}
          href={href(locale, paths.rubric('izoh'))}
          linkLabel={t.actions.all}
          description={h.explainersIntro}
        />
        <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-x-8">
          <ol className="grid gap-0 sm:grid-cols-3 lg:col-span-8">
            {explainers.map((a, i) => (
              <li
                key={a.id}
                lang={a.contentLang}
                className={`border-b border-rule py-4 sm:border-b-0 sm:py-0 ${i > 0 ? 'sm:border-l sm:pl-5' : ''} ${i < explainers.length - 1 ? 'sm:pr-5' : ''}`}
              >
                <p aria-hidden="true" className="figures font-display text-[1.75rem] leading-none font-semibold text-brass">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-h4 font-semibold">
                  <Link href={href(locale, a.url)} className="headline-link">
                    {a.title}
                  </Link>
                </h3>
                <p className="mt-2 text-meta text-ink-2">{a.lead}</p>
                <StoryMeta article={a} locale={locale} show={['reading']} className="mt-2" />
              </li>
            ))}
          </ol>
          {term ? <TermOfDay term={term} locale={locale} className="lg:col-span-4" /> : null}
        </div>
      </section>

      <GirihDivider className="mt-12 md:mt-16" />

      {/* Klub + Dayjest */}
      <div className="wrap mt-10 grid gap-10 md:mt-12 lg:grid-cols-12 lg:gap-x-8">
        {nextEvent ? <ClubTeaser event={nextEvent} locale={locale} className="lg:col-span-7" /> : null}
        <DigestSignup locale={locale} id="home-digest" className="lg:col-span-5" />
      </div>

      {/* Dunyo */}
      {world.length ? (
        <section aria-labelledby="home-world" className="wrap mt-12 md:mt-16">
          <SectionHeader
            id="home-world"
            title={h.world}
            href={href(locale, paths.rubric('dunyo'))}
            linkLabel={t.actions.all}
            description={t.rubrics.dunyo.description}
          />
          <ul className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {world.map((a) => (
              <li key={a.id}>
                <StoryItem
                  article={a}
                  locale={locale}
                  variant="media-top"
                  as="h3"
                  kicker={false}
                  meta={['time']}
                  imageSizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
