import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { ArticleView } from '@/content'
import { href } from '@/lib/routes'
import { Thumb } from '@/components/ui/Figure'
import { keepNumberWords } from '@/components/ui/InlineText'
import { StoryKicker } from './StoryKicker'
import { StoryMeta } from './StoryMeta'

type Variant = 'standard' | 'compact' | 'media-top' | 'media-side' | 'headline'
type Level = 'h2' | 'h3' | 'h4'

const HEADLINE: Record<Variant, string> = {
  standard: 'text-h3',
  compact: 'text-h4',
  'media-top': 'text-h3',
  'media-side': 'text-h4',
  headline: 'text-lead leading-snug',
}

/**
 * One story teaser. No cards: hierarchy comes from type size, hairlines are
 * drawn by the list that contains it. Only the story text (headline, lead,
 * topical kicker) carries the story's lang; rubric names and meta stay in the
 * page language. Links skip prefetching: lists hold dozens of them.
 */
export function StoryItem({
  article,
  locale,
  variant = 'standard',
  as: As = 'h3',
  kicker = true,
  lead = false,
  meta = ['time'],
  imageSizes = '(min-width: 1024px) 360px, 100vw',
  preload = false,
  priority = false,
  className = '',
}: {
  article: ArticleView
  locale: Locale
  variant?: Variant
  as?: Level
  kicker?: boolean | 'rubric'
  lead?: boolean
  meta?: ('author' | 'time' | 'reading')[]
  imageSizes?: string
  /** Above-the-fold image: preload it. */
  preload?: boolean
  /** @deprecated use `preload`. */
  priority?: boolean
  className?: string
}) {
  const url = href(locale, article.url)
  const lang = article.contentLang
  const headline = (
    <As lang={lang} className={`font-display font-semibold text-ink ${HEADLINE[variant]}`}>
      <Link href={url} prefetch={false} className="headline-link">
        {keepNumberWords(article.title)}
      </Link>
    </As>
  )
  const body = (
    <div className="min-w-0">
      {kicker ? (
        <StoryKicker article={article} locale={locale} prefer={kicker === 'rubric' ? 'rubric' : 'kicker'} className="mb-1.5" />
      ) : null}
      {headline}
      {lead ? (
        <p lang={lang} className="mt-2 text-ui text-ink-2 [text-wrap:pretty]">
          {keepNumberWords(article.lead)}
        </p>
      ) : null}
      {meta.length ? <StoryMeta article={article} locale={locale} show={meta} className="mt-2" /> : null}
    </div>
  )

  if (variant === 'media-top' && article.image) {
    return (
      <article className={className}>
        <Link href={url} prefetch={false} tabIndex={-1} aria-hidden="true" className="mb-3 block">
          <Thumb image={article.image} sizes={imageSizes} preload={preload || priority} />
        </Link>
        {body}
      </article>
    )
  }
  if (variant === 'media-side' && article.image) {
    return (
      <article className={`grid grid-cols-[1fr_7rem] gap-4 sm:grid-cols-[1fr_9rem] ${className}`}>
        {body}
        <Link href={url} prefetch={false} tabIndex={-1} aria-hidden="true" className="block">
          <Thumb image={article.image} sizes="160px" ratio="1/1" />
        </Link>
      </article>
    )
  }
  return (
    <article className={className}>
      {body}
    </article>
  )
}
