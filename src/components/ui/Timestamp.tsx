import type { Locale } from '@/i18n/config'
import { formatDate, type DateStyle } from '@/lib/format'

/** A <time> element formatted in Tashkent time. */
export function Timestamp({
  iso,
  locale,
  style = 'date',
  className = '',
}: {
  iso: string
  locale: Locale
  style?: DateStyle
  className?: string
}) {
  return (
    <time dateTime={iso} className={`figures whitespace-nowrap ${className}`}>
      {formatDate(iso, locale, style)}
    </time>
  )
}
