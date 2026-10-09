import type { Metadata } from 'next'
import Link from 'next/link'
import { locales, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import { getArticlesByRubric, getLatest, rubricSlugs, type RubricSlug } from '@/content'
import { href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { ListingHeader, type Crumb } from './ListingHeader'
import { ListingBody } from './ListingBody'
import { Pagination } from './Pagination'
import { EmptyState } from './EmptyState'
import { mostReadWithin, seriesNumbers } from './data'
import { listingLd } from './ld'
import { PAGE_SIZE, pageCount, pageSlice, rubricPagePath } from './paginate'

/** Every { lang, rubric } pair. */
export function rubricParams() {
  return locales.flatMap((lang) => rubricSlugs.map((rubric) => ({ lang, rubric })))
}

/** Every { lang, rubric, page } for pages 2…n that actually have stories. */
export async function rubricPageParams() {
  const out: { lang: Locale; rubric: RubricSlug; page: string }[] = []
  for (const lang of locales) {
    for (const rubric of rubricSlugs) {
      const total = pageCount((await getArticlesByRubric(lang, rubric)).length)
      for (let page = 2; page <= total; page++) out.push({ lang, rubric, page: String(page) })
    }
  }
  return out
}

/** True when `page` exists for the rubric (page 1 always exists, even when empty). */
export async function rubricPageExists(locale: Locale, rubric: RubricSlug, page: number): Promise<boolean> {
  return page >= 1 && page <= pageCount((await getArticlesByRubric(locale, rubric)).length)
}

export function rubricMetadata(locale: Locale, rubric: RubricSlug, page: number): Metadata {
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  const name = t.rubrics[rubric].name
  return pageMetadata({
    locale,
    path: rubricPagePath(rubric, page),
    title: page > 1 ? m.pageTitle(name, page) : name,
    description: t.rubrics[rubric].description,
  })
}

/** Rubric front (page 1) and its later pages: one template for all five rubrics. */
export async function RubricListing({ locale, rubric, page }: { locale: Locale; rubric: RubricSlug; page: number }) {
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  const all = await getArticlesByRubric(locale, rubric)
  const latest = await getLatest(locale, 5)
  const total = pageCount(all.length)
  const items = pageSlice(all, page)
  const name = t.rubrics[rubric].name
  const description = t.rubrics[rubric].description
  const path = rubricPagePath(rubric, page)
  const rubricHref = href(locale, paths.rubric(rubric))

  const crumbs: Crumb[] = [
    { name: t.nav.home, href: href(locale, paths.home()) },
    ...(page > 1 ? [{ name, href: rubricHref }, { name: m.page(page) }] : [{ name }]),
  ]

  const ld = listingLd({
    locale,
    path,
    name: page > 1 ? m.pageTitle(name, page) : name,
    description,
    articles: items,
    offset: (page - 1) * PAGE_SIZE,
    total: all.length,
    crumbs,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <ListingHeader
        locale={locale}
        crumbs={crumbs}
        title={name}
        description={description}
        count={all.length}
        page={page}
        totalPages={total}
      />
      <ListingBody
        locale={locale}
        articles={items}
        page={page}
        kicker="kicker"
        series={rubric === 'izoh' ? seriesNumbers(all) : undefined}
        mostRead={mostReadWithin(all, 5)}
        mostReadScope={m.mostReadScope.rubric(name)}
        currentRubric={rubric}
        idPrefix={`rubric-${rubric}`}
        pagination={
          total > 1 ? <Pagination locale={locale} page={page} total={total} pathFor={(n) => rubricPagePath(rubric, n)} /> : undefined
        }
        empty={
          <EmptyState locale={locale} title={m.empty.title} text={m.empty.rubric} latest={latest} id={`rubric-${rubric}-empty`}>
            <p className="mt-6 text-ui">
              <Link href={href(locale, paths.home())} className="text-link">
                {t.actions.backHome}
              </Link>
            </p>
          </EmptyState>
        }
      />
    </>
  )
}
