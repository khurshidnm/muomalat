import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { aboutMessages } from '@/i18n/messages/about'
import { getArticleById, getArticles, getArticlesByAuthor, getAuthors, getTerm } from '@/content'
import { site } from '@/content/data/site'
import { absoluteUrl, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { Kicker } from '@/components/ui/Kicker'
import { AboutToc, type TocItem } from '@/components/pages/about/Toc'
import { keepDash } from '@/components/pages/about/Section'
import { Mission, BEAT_ORDER } from '@/components/pages/about/Mission'
import { Scope } from '@/components/pages/about/Scope'
import { NameStudy } from '@/components/pages/about/NameStudy'
import { Policy } from '@/components/pages/about/Policy'
import { Corrections } from '@/components/pages/about/Corrections'
import { COLLECTIVE_BYLINES, Team, type TeamMember } from '@/components/pages/about/Team'
import { Imprint } from '@/components/pages/about/Imprint'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

/**
 * Section anchors. `tahririyat-siyosati` and `tuzatishlar` are fixed: every
 * article links to them and publisherLd points at them.
 */
const IDS = {
  mission: 'missiya',
  scope: 'nima-qilamiz',
  name: 'nega-muomalat',
  policy: 'tahririyat-siyosati',
  corrections: 'tuzatishlar',
  team: 'jamoa',
  legal: 'nashr-malumotlari',
} as const

/** Explainer on what a Sharia board does, linked from the scope block. */
const BOARD_EXPLAINER_ID = 'iz-06'
const BOARD_TERM = 'shariat-kengashi'

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const a = pick(aboutMessages, lang)
  return pageMetadata({ locale: lang, path: paths.about(), title: a.metaTitle, description: a.metaDescription })
}

export default async function AboutPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const a = pick(aboutMessages, locale)

  const members: TeamMember[] = getAuthors(locale).map((author) => ({
    author,
    stories: getArticlesByAuthor(locale, author.slug).length,
  }))
  const people = members.filter((m) => !COLLECTIVE_BYLINES.includes(m.author.slug))
  const collective = members.filter((m) => COLLECTIVE_BYLINES.includes(m.author.slug))
  // The most recent corrected story serves as the live example of a "Tuzatish" note.
  const corrected = getArticles(locale).find((x) => x.corrections?.length)
  const explainer = getArticleById(locale, BOARD_EXPLAINER_ID)
  const boardTerm = getTerm(locale, BOARD_TERM)

  const toc: TocItem[] = [
    { id: IDS.mission, label: a.mission.short },
    { id: IDS.scope, label: a.scope.short },
    { id: IDS.name, label: a.name.short },
    { id: IDS.policy, label: a.policy.short },
    { id: IDS.corrections, label: a.corrections.short },
    { id: IDS.team, label: a.team.short },
    { id: IDS.legal, label: a.legal.short },
  ]

  const url = absoluteUrl(localePath(locale, paths.about()))
  const canonical = absoluteUrl(paths.about())
  const orgId = `${site.url}/#organization`
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${url}#webpage`,
        url,
        name: a.metaTitle,
        description: a.metaDescription,
        inLanguage: localeMeta[locale].htmlLang,
        isPartOf: { '@id': `${site.url}/#website` },
        about: { '@id': orgId },
        mainEntity: { '@id': orgId },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
            { '@type': 'ListItem', position: 2, name: a.title, item: url },
          ],
        },
      },
      {
        ...publisherLd,
        '@id': orgId,
        description: t.description,
        foundingDate: String(site.foundedYear),
        knowsAbout: BEAT_ORDER.map((k) => a.mission.beat[k].title),
        masthead: `${canonical}#${IDS.team}`,
        missionCoveragePrioritiesPolicy: `${canonical}#${IDS.mission}`,
        verificationFactCheckingPolicy: `${canonical}#siyosat-manbalar`,
        unnamedSourcesPolicy: `${canonical}#siyosat-anonim-manbalar`,
        actionableFeedbackPolicy: `${canonical}#${IDS.corrections}`,
        ownershipFundingInfo: `${canonical}#${IDS.legal}`,
        employee: people.map(({ author }) => ({
          '@type': 'Person',
          name: author.name,
          jobTitle: author.role,
          url: absoluteUrl(localePath(locale, paths.author(author.slug))),
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      <header className="wrap pt-5 md:pt-9">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8">
            <Kicker>{a.kicker}</Kicker>
            <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{a.title}</h1>
            <p className="mt-3 max-w-[46rem] font-serif text-standfirst text-ink-2 md:mt-4">{keepDash(a.standfirst)}</p>
          </div>
          <dl aria-label={a.facts.label} className="self-end border-t-2 border-brass text-meta lg:col-span-4">
            {[
              [a.facts.type, a.facts.typeValue],
              [a.facts.beat, a.facts.beatValue],
              [a.facts.founded, a.facts.foundedValue(site.foundedYear)],
              [a.facts.editions, a.facts.editionsValue],
            ].map(([dt, dd]) => (
              <div key={dt} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 border-b border-rule py-2.5">
                <dt className="text-ink-3">{dt}</dt>
                <dd className="text-ink">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="wrap mt-8 md:mt-12">
        <AboutToc items={toc} label={a.toc} variant="inline" />
        <div className="mt-10 grid gap-x-8 lg:mt-0 lg:grid-cols-12">
          <div className="min-w-0 space-y-14 md:space-y-16 lg:col-span-8">
            <Mission id={IDS.mission} locale={locale} />
            <Scope id={IDS.scope} locale={locale} explainer={explainer} term={boardTerm} />
            <NameStudy id={IDS.name} locale={locale} />
            <Policy id={IDS.policy} locale={locale} />
            <Corrections id={IDS.corrections} locale={locale} example={corrected} />
            <Team id={IDS.team} locale={locale} people={people} collective={collective} />
            <Imprint id={IDS.legal} locale={locale} />
          </div>
          {/* The "Nashr maqomi" statement is not repeated here: the footer carries it on every page. */}
          <div className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-20">
              <AboutToc items={toc} label={a.toc} variant="rail" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
