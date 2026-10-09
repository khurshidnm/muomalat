import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { contentNow, type ArticleView } from '@/content'
import { formatDate, smartDate, tashkentDay } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SponsoredLabel } from '@/components/ui/Labels'
import { keepNumberWords } from '@/components/ui/InlineText'

/** "Soʻnggi yangiliklar": timestamped wire, grouped by day. */
export function LatestFeed({ articles, locale, id = 'latest' }: { articles: ArticleView[]; locale: Locale; id?: string }) {
  const t = pick(commonMessages, locale)
  const now = contentNow()
  let lastDay = ''
  return (
    <section aria-labelledby={id}>
      <SectionHeader id={id} title={t.labels.latest} href={href(locale, paths.rubric('yangiliklar'))} linkLabel={t.actions.all} />
      <ol className="mt-1">
        {articles.map((a) => {
          const d = smartDate(a.publishedAt, locale, t.labels, now)
          const day = tashkentDay(a.publishedAt)
          const showDay = day !== lastDay && (lastDay !== '' || !d.isToday)
          lastDay = day
          return (
            <li key={a.id} className="border-b border-rule last:border-b-0">
              {showDay ? (
                <p className="label-caps border-b border-rule pt-4 pb-2 text-ink-3">
                  {d.isToday ? t.labels.today : d.text.split(',')[0]}
                </p>
              ) : null}
              <div className="grid grid-cols-[3.25rem_1fr] gap-3 py-3">
                <time dateTime={a.publishedAt} className="figures pt-[3px] text-meta font-semibold text-emerald">
                  {formatDate(a.publishedAt, locale, 'time')}
                </time>
                <div className="min-w-0">
                  {a.sponsored ? <SponsoredLabel className="mb-1">{t.labels.sponsored}</SponsoredLabel> : null}
                  <h3 lang={a.contentLang} className="font-serif text-lead leading-snug font-semibold text-ink">
                    <Link href={href(locale, a.url)} prefetch={false} className="headline-link">
                      {keepNumberWords(a.title)}
                    </Link>
                  </h3>
                  {a.corrections?.length || a.updatedAt ? (
                    <p className="mt-1 text-[0.75rem] text-ink-3">
                      {a.corrections?.length ? t.labels.correction : t.labels.updated}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
