import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { isCommercialAuthor, type Author, type Localized } from '@/content'
import { formatDate } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'

/** Authors, publication and update times, reading time. */
export function Byline({
  authors,
  publishedAt,
  updatedAt,
  readingMinutes,
  locale,
  labels,
}: {
  authors: Localized<Author>[]
  publishedAt: string
  updatedAt?: string
  readingMinutes: number
  locale: Locale
  labels: { by: string; published: string; updated: string; readingTime: string }
}) {
  const sameDay = updatedAt && formatDate(updatedAt, locale, 'date') === formatDate(publishedAt, locale, 'date')
  return (
    <div className="flex flex-col gap-3 border-y border-rule py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {authors.map((a) => (
            <Avatar key={a.slug} name={a.name} size={36} commercial={isCommercialAuthor(a)} />
          ))}
        </div>
        <p className="text-meta leading-snug">
          <span className="sr-only">{labels.by}: </span>
          {authors.map((a, i) => (
            <span key={a.slug}>
              {i > 0 ? ', ' : ''}
              <Link
                href={href(locale, paths.author(a.slug))}
                prefetch={false}
                lang={a.contentLang}
                className="font-semibold text-ink hover:text-emerald hover:underline underline-offset-2"
              >
                {a.name}
              </Link>
            </span>
          ))}
          {authors.length === 1 ? (
            <span lang={authors[0].contentLang} className="block text-ink-3">
              {authors[0].role}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-3">
        <p>
          {labels.published}{' '}
          <time dateTime={publishedAt} className="figures whitespace-nowrap text-ink-2">
            {formatDate(publishedAt, locale, 'datetime')}
          </time>
        </p>
        {updatedAt ? (
          <p>
            {labels.updated}{' '}
            <time dateTime={updatedAt} className="figures whitespace-nowrap text-ink-2">
              {formatDate(updatedAt, locale, sameDay ? 'time' : 'datetime')}
            </time>
          </p>
        ) : null}
        <p className="inline-flex items-center gap-1">
          <Icon name="clock" size={14} />
          {labels.readingTime}
        </p>
      </div>
    </div>
  )
}
