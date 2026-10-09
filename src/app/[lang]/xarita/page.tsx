import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { marketMessages } from '@/i18n/messages/market'
import { contentNow, getArticleById, getArticlesByTag, getInstitutions, getMilestones, type ArticleView } from '@/content'
import { site } from '@/content/data/site'
import { formatDate } from '@/lib/format'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icon } from '@/components/ui/Icon'
import { Kicker } from '@/components/ui/Kicker'
import { Placeholder } from '@/components/ui/Placeholder'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StoryItem } from '@/components/story/StoryItem'
import { EditorialNote } from '@/components/article/EndMatter'
import { MarketTable, type MarketRow } from '@/components/market/MarketTable'
import { MarketSummary } from '@/components/market/MarketSummary'
import { MarketTimeline, type TimelineItem } from '@/components/market/MarketTimeline'
import { STATUS_RANK } from '@/components/market/StatusMark'
import { keepNumbersTogether, normalizeSearch } from '@/components/market/normalize'
import { Fill } from '@/components/market/fill'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false
/** Seconds; market-map changes reach the page sooner through tags (CMS-SPEC §8.2). */
export const revalidate = 3600

type Params = { params: Promise<{ lang: string }> }

const PATH = paths.market()

/** Collation for "sort by name": Uzbek Latin sorts like Latin, Cyrillic like Russian. */
const COLLATION: Record<Locale, string> = { uz: 'uz-Latn', kr: 'uz-Cyrl', ru: 'ru', en: 'en' }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const m = pick(marketMessages, lang)
  return pageMetadata({ locale: lang, path: PATH, title: m.metaTitle, description: m.metaDescription })
}

/** Stories on licensing first, then on Islamic windows; no duplicates, no partner content. */
async function relatedStories(locale: Locale, limit: number): Promise<ArticleView[]> {
  const seen = new Set<string>()
  const out: ArticleView[] = []
  for (const a of [...(await getArticlesByTag(locale, 'litsenziyalash')), ...(await getArticlesByTag(locale, 'islom-oynasi'))]) {
    if (seen.has(a.id) || a.sponsored) continue
    seen.add(a.id)
    out.push(a)
  }
  return out.slice(0, limit)
}

export default async function MarketPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const m = pick(marketMessages, locale)

  const institutions = await getInstitutions(locale)
  // City names are keyed by the Uzbek Latin source, so look them up on the uz record.
  const source = new Map((await getInstitutions('uz')).map((i) => [i.id, i]))
  const cityLang = locale === 'ru' || locale === 'en' ? locale : localeMeta[locale].htmlLang
  const cities = m.cities as Record<string, string>

  const milestones = await getMilestones(locale)
  // Stories linked from the table and the timeline, read once each.
  const linked = new Map(
    await Promise.all(
      [...new Set([...institutions, ...milestones].map((x) => x.articleId).filter((id): id is string => !!id))].map(
        async (id) => [id, await getArticleById(locale, id)] as const,
      ),
    ),
  )
  const story = (id?: string) => {
    const a = id ? linked.get(id) : undefined
    return a ? { href: href(locale, a.url), title: a.title, lang: a.contentLang } : undefined
  }

  const rows: MarketRow[] = institutions
    .map((i) => {
      const uz = source.get(i.id)
      const uzCity = uz?.city ?? i.city
      const city = cities[uzCity] ?? i.city
      const haystack = normalizeSearch(
        [
          i.name,
          i.parent,
          city,
          i.city,
          uzCity,
          uz?.name,
          uz?.parent,
          m.types[i.type],
          m.typesPlural[i.type],
          m.statuses[i.status],
          ...i.products,
          ...(uz?.products ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      )
      return {
        id: i.id,
        name: i.name,
        parent: i.parent,
        type: i.type,
        city,
        cityLang: cities[uzCity] ? cityLang : i.contentLang,
        status: i.status,
        statusDate: i.statusDate,
        statusDateText: keepNumbersTogether(formatDate(i.statusDate, locale, 'date')),
        products: i.products,
        note: i.note ? keepNumbersTogether(i.note) : undefined,
        article: story(i.articleId),
        lang: i.contentLang,
        haystack,
      }
    })
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.statusDate.localeCompare(a.statusDate) || a.name.localeCompare(b.name),
    )

  const timeline: TimelineItem[] = milestones.map((x, i) => ({
    key: `${x.date}-${i}`,
    date: x.date,
    dateText: keepNumbersTogether(formatDate(x.date, locale, x.date.length === 7 ? 'monthYear' : 'date')),
    title: keepNumbersTogether(x.title),
    text: keepNumbersTogether(x.text),
    status: x.status,
    story: story(x.articleId),
  }))
  const contentLang = milestones[0]?.contentLang ?? 'uz'

  const related = await relatedStories(locale, 4)
  const now = contentNow()
  const asOfDate = formatDate(now, locale, 'date')
  const url = absoluteUrl(localePath(locale, PATH))
  const firstDate = milestones[0]?.date ?? now.slice(0, 7)

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        '@id': `${url}#dataset`,
        name: m.title,
        alternateName: m.metaTitle,
        description: `${m.metaDescription} ${m.sample.title}.`,
        url,
        inLanguage: localeMeta[locale].htmlLang,
        isAccessibleForFree: true,
        dateModified: now,
        temporalCoverage: `${firstDate}/${now.slice(0, 10)}`,
        spatialCoverage: { '@type': 'Place', name: m.country },
        keywords: [m.metaTitle, ...Object.values(m.types)],
        variableMeasured: [m.table.type, m.table.colCity, m.table.status, m.table.colProducts],
        creator: { ...publisherLd, '@id': `${site.url}/#organization` },
        publisher: { ...publisherLd, '@id': `${site.url}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: t.nav.xarita, item: url },
        ],
      },
    ],
  }

  const jump = [
    { id: 'raqamlar', label: m.jump.summary },
    { id: 'reyestr', label: m.jump.register },
    { id: 'xronologiya', label: m.jump.timeline },
    { id: 'uslubiyat', label: m.jump.method },
  ]

  const notes = [
    { title: m.method.sourcesTitle, text: m.method.sourcesText },
    { title: m.method.statusTitle, text: m.method.statusText },
    { title: m.method.productsTitle, text: m.method.productsText },
    { title: m.method.scopeTitle, text: m.method.scopeText },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      {/* Header */}
      <div className="wrap pt-5 md:pt-7">
        <Breadcrumbs label={t.labels.breadcrumbs} items={[{ name: t.nav.home, href: href(locale, paths.home()) }, { name: t.nav.xarita }]} />
        <header className="mt-4 grid gap-6 md:mt-6 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8">
            <Kicker>{m.kicker}</Kicker>
            <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{m.title}</h1>
            <p className="mt-3 max-w-[46rem] font-serif text-standfirst text-ink-2 md:mt-4">{m.standfirst}</p>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
              <Icon name="calendar" size={15} className="shrink-0" />
              <time dateTime={now} className="figures font-semibold text-ink">
                {m.asOf(asOfDate)}
              </time>
              <span aria-hidden="true" className="hidden text-rule-strong sm:inline">
                ·
              </span>
              <span className="figures inline-flex gap-x-2 whitespace-nowrap">
                {m.institutions(rows.length)}
                <span aria-hidden="true" className="text-rule-strong">
                  ·
                </span>
                {m.milestones(timeline.length)}
              </span>
            </p>
          </div>
          <div role="note" aria-labelledby="xarita-sample" className="border-t-2 border-brass bg-paper-2 p-4 lg:col-span-4 lg:self-end">
            <p id="xarita-sample" className="label-caps flex items-center gap-1.5 text-brass-ink">
              <Icon name="info" size={15} className="shrink-0" />
              {m.sample.title}
            </p>
            <p className="mt-2 text-meta leading-relaxed text-ink-2">{m.sample.text}</p>
            {locale === 'ru' || locale === 'en' ? <p className="mt-2 text-meta leading-relaxed text-ink-2">{m.contentNote}</p> : null}
          </div>
        </header>

        <nav aria-label={m.onThisPage} className="mt-6 border-y border-rule md:mt-8">
          <ul className="grid grid-cols-2 gap-x-4 sm:flex sm:flex-wrap sm:gap-x-6">
            {jump.map((j) => (
              <li key={j.id}>
                <a
                  href={`#${j.id}`}
                  className="inline-flex min-h-11 items-center gap-1 text-meta font-semibold text-ink-2 hover:text-emerald"
                >
                  <Icon name="chevron-down" size={14} className="text-ink-3" />
                  {j.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Summary strip */}
      <MarketSummary
        id="raqamlar"
        headingId="xarita-summary"
        className="wrap mt-8 md:mt-12"
        rows={rows.map((r) => ({ id: r.id, type: r.type, status: r.status, city: r.city, cityLang: r.cityLang }))}
        text={{
          ...m.summary,
          statuses: m.statuses,
          statusDefs: m.statusDefs,
          typesPlural: m.typesPlural,
        }}
      />

      {/* Register */}
      <section id="reyestr" aria-labelledby="xarita-register" className="wrap mt-12 scroll-mt-20 md:mt-16">
        <SectionHeader id="xarita-register" title={m.table.title} description={m.table.description} />
        <div className="mt-5">
          <MarketTable
            rows={rows}
            collation={COLLATION[locale]}
            text={{ ...m.table, types: m.types, statuses: m.statuses }}
          />
        </div>
      </section>

      {/* Timeline + methodology */}
      <div className="wrap mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-x-8">
        <section id="xronologiya" aria-labelledby="xarita-timeline" className="scroll-mt-20 lg:col-span-8">
          <SectionHeader id="xarita-timeline" title={m.timeline.title} description={m.timeline.description} />
          <MarketTimeline items={timeline} nowIso={now} nowText={asOfDate} text={m.timeline} lang={contentLang} />
        </section>

        <section id="uslubiyat" aria-labelledby="xarita-method" className="scroll-mt-20 lg:col-span-4">
          <SectionHeader id="xarita-method" title={m.method.title} />
          <dl className="mt-4">
            {notes.map((n) => (
              <div key={n.title} className="border-b border-rule py-3 first:pt-0">
                <dt className="text-ui font-semibold text-ink">{n.title}</dt>
                <dd className="mt-1 text-meta leading-relaxed text-ink-2">{n.text}</dd>
              </div>
            ))}
            <div className="border-b border-rule py-3">
              <dt className="text-ui font-semibold text-ink">{m.method.updatesTitle}</dt>
              <dd className="mt-1 text-meta leading-relaxed text-ink-2">
                <Fill
                  template={m.method.updatesText}
                  values={[
                    <Placeholder key="c">{m.method.cadence}</Placeholder>,
                    <time key="d" dateTime={now} className="figures whitespace-nowrap">
                      {asOfDate}
                    </time>,
                  ]}
                />
              </dd>
            </div>
            <div className="border-b border-rule py-3">
              <dt className="text-ui font-semibold text-ink">{m.method.registerTitle}</dt>
              <dd className="mt-1 text-meta leading-relaxed text-ink-2">
                <Fill template={m.method.registerText} values={[<Placeholder key="r">{m.method.registerLink}</Placeholder>]} />
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-meta leading-relaxed text-ink-2">
            <Fill
              template={m.method.correctionsText}
              values={[
                <Link key="l" href={href(locale, paths.contact())} className="text-link font-medium">
                  {m.method.correctionsLink}
                </Link>,
              ]}
            />
          </p>
          <div className="mt-5 border-t border-rule pt-4">
            <EditorialNote text={t.editorial.short} linkLabel={t.nav.policy} href={href(locale, paths.policy())} />
          </div>
        </section>
      </div>

      {/* Related stories */}
      {related.length ? (
        <section aria-labelledby="xarita-related" className="wrap mt-12 md:mt-16">
          <SectionHeader
            id="xarita-related"
            title={m.related}
            description={m.relatedDescription}
            href={href(locale, paths.tag('litsenziyalash'))}
            linkLabel={t.actions.all}
          />
          <ul className="mt-4 grid sm:grid-cols-2 sm:gap-x-8">
            {related.map((a) => (
              <li key={a.id} className="border-b border-rule py-4">
                <StoryItem article={a} locale={locale} variant="media-side" kicker="rubric" meta={['time']} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
