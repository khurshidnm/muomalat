import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { listingMessages } from '@/i18n/messages/listing'
import type { ArticleView, RubricSlug } from '@/content'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DigestSignup } from '@/components/blocks/DigestSignup'
import { AdSlot } from '@/components/blocks/AdSlot'
import { MostRead } from '@/components/story/MostRead'
import { splitFront } from './data'
import { FeedList, GridItem, LeadItem } from './Items'
import { RubricNav } from './RubricNav'
import type { KickerMode } from './parts'

// Literal class names so Tailwind generates them.
const ROW = ['', 'lg:row-start-1', 'lg:row-start-2', 'lg:row-start-3', 'lg:row-start-4'] as const

/**
 * The one listing template behind rubric, topic and author pages.
 *
 * Phones read top to bottom: lead, picture grid, dense list, pagination,
 * then the rail (most read, digest, advert). From 1024px the rail moves
 * beside the lead and beside the list, and the picture grid runs the full
 * width between them. Later pages (`page > 1`) are a plain dense list.
 */
export function ListingBody({
  locale,
  articles,
  kicker,
  page = 1,
  series,
  mostRead,
  mostReadScope,
  pagination,
  empty,
  currentRubric,
  idPrefix = 'listing',
}: {
  locale: Locale
  /** Stories on this page, newest first. */
  articles: ArticleView[]
  kicker: KickerMode
  page?: number
  /** Explainer series numbers by article id (izoh only). */
  series?: Map<string, number>
  mostRead: ArticleView[]
  mostReadScope: string
  pagination?: React.ReactNode
  /** Shown instead of the stories when there are none. */
  empty?: React.ReactNode
  currentRubric?: RubricSlug
  idPrefix?: string
}) {
  const m = pick(listingMessages, locale)
  const front = page === 1 ? splitFront(articles) : { lead: undefined, grid: [], rest: articles }
  const { lead, grid, rest } = front

  // Row plan on large screens: lead row (rail: most read), grid row (full
  // width), list row (rail: digest + advert). Without a list the digest and
  // advert get a full-width row of their own after the grid.
  let row = 0
  const leadRow = lead ? ++row : 0
  const gridRow = grid.length ? ++row : 0
  const listRow = rest.length || pagination ? ++row : 0
  const tailRow = listRow ? 0 : ++row

  const most = (
    <MostRead articles={mostRead} locale={locale} description={mostReadScope} label={kicker} id={`${idPrefix}-most-read`} />
  )
  const digest = <DigestSignup locale={locale} id={`${idPrefix}-digest`} />
  const ad = <AdSlot locale={locale} format="mpu" slot={`${idPrefix}-rail`} />

  return (
    <>
      <div className="wrap mt-6 md:mt-8">
        {!articles.length ? (
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-8">{empty}</div>
            <div className="space-y-10 lg:col-span-4">
              {most}
              {digest}
              {ad}
            </div>
          </div>
        ) : (
          <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-12">
            {lead ? (
              <section
                aria-labelledby={`${idPrefix}-lead`}
                className={`lg:col-span-8 lg:border-r lg:border-rule lg:pr-8 ${ROW[leadRow]}`}
              >
                <h2 id={`${idPrefix}-lead`} className="sr-only">
                  {m.latest}
                </h2>
                <LeadItem article={lead} locale={locale} kicker={kicker} series={series?.get(lead.id)} />
              </section>
            ) : null}

            {grid.length ? (
              <section aria-labelledby={`${idPrefix}-grid`} className={`lg:col-span-12 ${ROW[gridRow]}`}>
                <h2 id={`${idPrefix}-grid`} className="sr-only">
                  {m.topStories}
                </h2>
                <ul className="grid border-t border-rule sm:grid-cols-2 sm:gap-x-6 sm:gap-y-9 sm:pt-6 lg:grid-cols-3 lg:gap-x-8">
                  {grid.map((a, i) => {
                    const wide = grid.length % 2 === 1 && i === grid.length - 1
                    return (
                      <li
                        key={a.id}
                        className={`border-b border-rule py-4 sm:border-b-0 sm:py-0 ${wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}
                      >
                        <GridItem article={a} locale={locale} kicker={kicker} series={series?.get(a.id)} wide={wide} />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {listRow ? (
              <div className={`min-w-0 lg:col-span-8 ${ROW[listRow]}`}>
                {rest.length ? (
                  <section aria-labelledby={`${idPrefix}-list`}>
                    <SectionHeader id={`${idPrefix}-list`} title={m.earlier} />
                    <FeedList articles={rest} locale={locale} kicker={kicker} series={series} idPrefix={`${idPrefix}-day`} />
                  </section>
                ) : null}
                {pagination ? <div className="mt-8">{pagination}</div> : null}
              </div>
            ) : null}

            {/* Rail */}
            {leadRow && listRow ? (
              <>
                <div className={`lg:col-span-4 lg:col-start-9 ${ROW[leadRow]}`}>{most}</div>
                <div className={`lg:col-span-4 lg:col-start-9 ${ROW[listRow]}`}>
                  <div className="space-y-10 lg:sticky lg:top-20">
                    {digest}
                    {ad}
                  </div>
                </div>
              </>
            ) : listRow ? (
              <div className={`lg:col-span-4 lg:col-start-9 ${ROW[listRow]}`}>
                <div className="space-y-10 lg:sticky lg:top-20">
                  {most}
                  {digest}
                  {ad}
                </div>
              </div>
            ) : (
              <>
                <div className={`lg:col-span-4 lg:col-start-9 ${ROW[leadRow]}`}>{most}</div>
                <div className={`grid gap-10 lg:col-span-12 lg:grid-cols-12 lg:gap-x-8 ${ROW[tailRow]}`}>
                  <div className="lg:col-span-8">{digest}</div>
                  <div className="lg:col-span-4">{ad}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <RubricNav locale={locale} current={currentRubric} id={`${idPrefix}-rubrics`} className="wrap mt-14 md:mt-16" />
    </>
  )
}
