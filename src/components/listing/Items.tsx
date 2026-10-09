import Link from 'next/link'
import { localeMeta, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { CONTENT_NOW, type ArticleView } from '@/content'
import { formatDate, tashkentDay } from '@/lib/format'
import { href } from '@/lib/routes'
import { keepNumberWords } from '@/components/ui/InlineText'
import { Thumb } from '@/components/ui/Figure'
import { StoryMeta } from '@/components/story/StoryMeta'
import { ItemFlags, ItemKicker, SeriesNumber, type KickerMode } from './parts'

type Meta = ('author' | 'time' | 'reading')[]

/** Story metadata in the interface language, even inside an Uzbek-only item. */
function Meta({ article, locale, show, className }: { article: ArticleView; locale: Locale; show: Meta; className?: string }) {
  return (
    <div lang={localeMeta[locale].htmlLang}>
      <StoryMeta article={article} locale={locale} show={show} className={className} />
    </div>
  )
}

/**
 * Listing lead: the newest story. Phones: picture, headline, standfirst.
 * From tablet up the headline runs across the column and the standfirst
 * sits beside the picture, as in the front-page lead.
 */
export function LeadItem({
  article: a,
  locale,
  kicker,
  series,
}: {
  article: ArticleView
  locale: Locale
  kicker: KickerMode
  series?: number
}) {
  const url = href(locale, a.url)
  return (
    <article lang={a.contentLang} className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-x-6">
      <div className="min-w-0 md:order-1 md:col-span-2">
        {series ? <SeriesNumber n={series} size="lg" className="mb-2.5" /> : null}
        <ItemKicker article={a} locale={locale} mode={kicker} className="mb-2" />
        <h3 className="font-display text-h2 font-semibold text-ink lg:text-[2.25rem] lg:leading-[1.1]">
          <Link href={url} prefetch={false} className="headline-link">
            {keepNumberWords(a.title)}
          </Link>
        </h3>
      </div>
      <div className="min-w-0 md:order-2 md:mt-4">
        <p className="mt-3 font-serif text-[1.125rem] leading-[1.45] text-ink-2 [text-wrap:pretty] md:mt-0">{a.lead}</p>
        <ItemFlags article={a} locale={locale} portrait className="mt-3" />
        <Meta article={a} locale={locale} show={['author', 'time', 'reading']} className="mt-3" />
      </div>
      {a.image ? (
        <Link href={url} prefetch={false} tabIndex={-1} aria-hidden="true" className="order-first mb-4 block md:order-3 md:mt-4 md:mb-0">
          <Thumb image={a.image} sizes="(min-width: 1280px) 480px, (min-width: 768px) 60vw, 100vw" preload />
        </Link>
      ) : null}
    </article>
  )
}

/**
 * Picture-grid story. Phones get a compact row (text left, thumbnail right)
 * so six stories do not turn into six screen-high pictures; from 640px the
 * picture sits on top. `wide` marks an odd last item, which spans both
 * columns of the two-column grid as a side-by-side row.
 */
export function GridItem({
  article: a,
  locale,
  kicker,
  series,
  wide = false,
}: {
  article: ArticleView
  locale: Locale
  kicker: KickerMode
  series?: number
  wide?: boolean
}) {
  const url = href(locale, a.url)
  const layout = a.image
    ? `grid grid-cols-[minmax(0,1fr)_7rem] gap-4 ${wide ? 'sm:grid-cols-2 sm:gap-6 lg:block' : 'sm:block'}`
    : ''
  return (
    <article lang={a.contentLang} className={layout}>
      {a.image ? (
        <Link
          href={url}
          prefetch={false}
          tabIndex={-1}
          aria-hidden="true"
          className={`order-2 block ${wide ? 'sm:order-none lg:mb-3' : 'sm:order-none sm:mb-3'}`}
        >
          <Thumb image={a.image} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 112px" />
        </Link>
      ) : null}
      <div className="min-w-0">
        {series ? <SeriesNumber n={series} className="mb-2" /> : null}
        <ItemKicker article={a} locale={locale} mode={kicker} className="mb-1.5" />
        <h3 className="font-display text-h4 font-semibold text-ink sm:text-h3">
          <Link href={url} prefetch={false} className="headline-link">
            {keepNumberWords(a.title)}
          </Link>
        </h3>
        <p className="mt-2 hidden text-ui text-ink-2 [text-wrap:pretty] sm:block">{a.lead}</p>
        <ItemFlags article={a} locale={locale} className="mt-2" />
        <Meta article={a} locale={locale} show={['author', 'time']} className="mt-2" />
      </div>
    </article>
  )
}

/** "Bugun", "Kecha", "6-oktabr" (or with the year when it differs). */
function dayLabel(day: string, locale: Locale): string {
  const t = pick(commonMessages, locale)
  const today = tashkentDay(CONTENT_NOW)
  const yesterday = tashkentDay(new Date(Date.parse(`${today}T12:00:00+05:00`) - 86_400_000).toISOString())
  if (day === today) return t.labels.today
  if (day === yesterday) return t.labels.yesterday
  return formatDate(day, locale, day.slice(0, 4) === today.slice(0, 4) ? 'dayMonth' : 'date')
}

/**
 * Dense chronological list grouped by day: time column, headline, standfirst,
 * byline. Explainer lists put the series number in the left column instead
 * of the time (the day heading still dates each explainer).
 */
export function FeedList({
  articles,
  locale,
  kicker,
  series,
  idPrefix,
}: {
  articles: ArticleView[]
  locale: Locale
  kicker: KickerMode
  series?: Map<string, number>
  idPrefix: string
}) {
  const groups: { day: string; items: ArticleView[] }[] = []
  for (const a of articles) {
    const day = tashkentDay(a.publishedAt)
    const last = groups.at(-1)
    if (last && last.day === day) last.items.push(a)
    else groups.push({ day, items: [a] })
  }
  return (
    <div>
      {groups.map((g) => {
        const labelId = `${idPrefix}-${g.day}`
        return (
          <div key={g.day}>
            <p id={labelId} className="label-caps border-b border-rule pt-5 pb-2 text-ink-3">
              <time dateTime={g.day}>{dayLabel(g.day, locale)}</time>
            </p>
            <ol aria-labelledby={labelId}>
              {g.items.map((a) => {
                const n = series?.get(a.id)
                const numbered = !!series
                return (
                  <li
                    key={a.id}
                    lang={a.contentLang}
                    className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-b border-rule py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-5"
                  >
                    <div className="pt-[3px]">
                      {numbered ? (
                        n ? (
                          <SeriesNumber n={n} />
                        ) : null
                      ) : (
                        <time dateTime={a.publishedAt} className="figures text-meta font-semibold text-emerald">
                          {formatDate(a.publishedAt, locale, 'time')}
                        </time>
                      )}
                    </div>
                    <article className="min-w-0">
                      <ItemKicker article={a} locale={locale} mode={kicker} className="mb-1" />
                      <h3 className="font-display text-h4 font-semibold text-ink">
                        <Link href={href(locale, a.url)} prefetch={false} className="headline-link">
                          {keepNumberWords(a.title)}
                        </Link>
                      </h3>
                      <p className="mt-1.5 max-w-[60ch] text-ui text-ink-2 [text-wrap:pretty]">{a.lead}</p>
                      <ItemFlags article={a} locale={locale} updated className="mt-2" />
                      <Meta
                        article={a}
                        locale={locale}
                        show={['author', 'reading']}
                        className="mt-2"
                      />
                    </article>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
