import type { ContentLang, Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import { href, paths } from '@/lib/routes'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icon } from '@/components/ui/Icon'
import { Kicker } from '@/components/ui/Kicker'

export interface Crumb {
  name: string
  href?: string
}

/**
 * Listing page head: breadcrumbs, optional kicker (a string renders as the
 * emerald Kicker; pass a node, e.g. SponsoredLabel, for commercial bylines), the h1 in the article
 * headline size, a standfirst, and a meta line with the story count, page
 * and the RSS feed. `aside` sits beside the title (author avatar; 88px from
 * 640px, which the indented detail column below assumes); `children` follow
 * the standfirst (author contacts, notes, related topics).
 */
export function ListingHeader({
  locale,
  crumbs,
  kicker,
  title,
  titleLang,
  description,
  descriptionLang,
  count,
  page,
  totalPages,
  aside,
  children,
}: {
  locale: Locale
  crumbs: Crumb[]
  kicker?: React.ReactNode
  title: string
  titleLang?: ContentLang
  description?: React.ReactNode
  descriptionLang?: ContentLang
  count: number
  page?: number
  totalPages?: number
  aside?: React.ReactNode
  children?: React.ReactNode
}) {
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  return (
    <header className="wrap pt-4 md:pt-6">
      <Breadcrumbs items={crumbs} label={t.labels.breadcrumbs} />
      <div className="mt-4 border-b border-rule pb-5 md:mt-6 md:pb-6">
        <div className={aside ? 'flex items-start gap-4 sm:gap-6' : ''}>
          {aside ? <div className="shrink-0">{aside}</div> : null}
          <div className="min-w-0 max-w-[48rem] flex-1">
            {typeof kicker === 'string' ? (
              <Kicker className="mb-1.5">{kicker}</Kicker>
            ) : kicker ? (
              <div className="mb-2">{kicker}</div>
            ) : null}
            <h1 lang={titleLang} className="font-display text-h1 font-semibold text-ink [text-wrap:balance]">
              {title}
              {page && page > 1 ? (
                <span className="sr-only">, {m.page(page)}</span>
              ) : null}
            </h1>
            {description ? (
              <p lang={descriptionLang} className="mt-2.5 font-serif text-standfirst text-ink-2 md:mt-3">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className={aside ? 'sm:pl-28' : ''}>
          {children ? <div className="max-w-[48rem]">{children}</div> : null}
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-3">
            <span className="figures font-semibold text-ink-2">{m.count(count)}</span>
            {page && totalPages && totalPages > 1 ? (
              <>
                <span aria-hidden="true" className="text-rule-strong">
                  ·
                </span>
                <span className="figures">
                  <span aria-hidden="true">{m.page(page)}</span>
                  <span className="sr-only">{m.pagination.current(page, totalPages)}</span>
                </span>
              </>
            ) : null}
            <span aria-hidden="true" className="text-rule-strong">
              ·
            </span>
            <a
              href={href(locale, paths.rss())}
              type="application/rss+xml"
              title={m.rssTitle}
              className="-my-2 inline-flex min-h-9 items-center gap-1.5 font-semibold text-emerald hover:text-emerald-ink"
            >
              <Icon name="rss" size={16} />
              {m.rss}
            </a>
          </p>
        </div>
      </div>
    </header>
  )
}
