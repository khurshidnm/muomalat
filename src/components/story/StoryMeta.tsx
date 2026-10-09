import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { CONTENT_NOW, getAuthor, type ArticleView } from '@/content'
import { smartDate } from '@/lib/format'

/** "Aziza Rahimova · 14:05 · 4 daqiqa" — compact metadata under a headline. */
export function StoryMeta({
  article,
  locale,
  show = ['time'],
  className = '',
}: {
  article: ArticleView
  locale: Locale
  show?: ('author' | 'time' | 'reading')[]
  className?: string
}) {
  const t = pick(commonMessages, locale)
  const parts: React.ReactNode[] = []
  if (show.includes('author')) {
    const authors = article.authors.map((s) => getAuthor(locale, s)).filter((a) => !!a)
    if (authors.length) {
      parts.push(
        <span key="a" lang={authors[0].contentLang} className="text-ink-2">
          {authors.map((a) => a.name).join(', ')}
        </span>,
      )
    }
  }
  if (show.includes('time')) {
    const d = smartDate(article.publishedAt, locale, t.labels, CONTENT_NOW)
    parts.push(
      <time key="t" dateTime={article.publishedAt} className="figures whitespace-nowrap">
        {d.text}
      </time>,
    )
  }
  if (show.includes('reading')) {
    parts.push(
      <span key="r" className="whitespace-nowrap">
        {t.labels.minutes(article.readingMinutes)}
      </span>,
    )
  }
  if (!parts.length) return null
  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-meta text-ink-3 ${className}`}>
      {/* The dot ends the previous item, so a wrapped line never starts with one. */}
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-x-2">
          {p}
          {i < parts.length - 1 ? (
            <span aria-hidden="true" className="text-rule-strong">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </p>
  )
}
