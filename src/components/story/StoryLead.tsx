import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { ArticleView } from '@/content'
import { href } from '@/lib/routes'
import { Figure } from '@/components/ui/Figure'
import { keepNumberWords } from '@/components/ui/InlineText'
import { StoryKicker } from './StoryKicker'
import { StoryMeta } from './StoryMeta'

/**
 * Front-page lead. Text first: kicker and display headline across the full
 * column, then standfirst beside the image on wider screens.
 */
export function StoryLead({ article, locale }: { article: ArticleView; locale: Locale }) {
  const url = href(locale, article.url)
  return (
    <article>
      <StoryKicker article={article} locale={locale} className="mb-2.5" />
      <h2 lang={article.contentLang} className="font-display text-display font-semibold text-ink">
        <Link href={url} prefetch={false} className="headline-link">
          {keepNumberWords(article.title)}
        </Link>
      </h2>
      <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
        <div className="md:order-1">
          <p lang={article.contentLang} className="font-serif text-standfirst text-ink-2">
            {keepNumberWords(article.lead)}
          </p>
          <StoryMeta article={article} locale={locale} show={['author', 'time', 'reading']} className="mt-3" />
        </div>
        {article.image ? (
          <Link href={url} prefetch={false} tabIndex={-1} aria-hidden="true" className="-order-1 block md:order-2">
            <Figure
              image={article.image}
              sizes="(min-width: 1280px) 500px, (min-width: 768px) 55vw, 100vw"
              preload
              showCaption={false}
            />
          </Link>
        ) : null}
      </div>
    </article>
  )
}
