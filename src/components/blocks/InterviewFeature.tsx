import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { ArticleView } from '@/content'
import { href } from '@/lib/routes'
import { Thumb } from '@/components/ui/Figure'
import { StoryMeta } from '@/components/story/StoryMeta'
import { keepNumberWords } from '@/components/ui/InlineText'

/** Interview teaser led by the interviewee's words. */
export function InterviewFeature({ article, locale }: { article: ArticleView; locale: Locale }) {
  const quote = article.body.find((b) => b.type === 'quote')
  const who = article.interviewee
  const url = href(locale, article.url)
  // Story text in the story's language; the interviewee (never translated) in Uzbek.
  const base = locale === 'kr' ? 'uz-Cyrl' : 'uz'
  return (
    <article className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
      {who?.portrait ? (
        <Link href={url} prefetch={false} tabIndex={-1} aria-hidden="true" className="block">
          <Thumb image={who.portrait} sizes="(min-width: 640px) 280px, 100vw" ratio="4/5" />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-col">
        {quote && quote.type === 'quote' ? (
          <p lang={article.contentLang} className="relative font-display text-[1.375rem] leading-[1.25] font-medium italic text-ink sm:text-[1.625rem]">
            <span aria-hidden="true" className="absolute -top-1 -left-0.5 font-display text-[3rem] leading-none text-brass not-italic">
              «
            </span>
            <span className="block pl-6">{quote.text}</span>
          </p>
        ) : null}
        {who ? (
          <p lang={base} className="mt-3 pl-6 text-meta text-ink-3">
            <span className="font-semibold text-ink">{who.name}</span>, {who.role}
          </p>
        ) : null}
        <h3 lang={article.contentLang} className="mt-5 border-t border-rule pt-3 font-display text-h4 font-semibold">
          <Link href={url} prefetch={false} className="headline-link">
            {keepNumberWords(article.title)}
          </Link>
        </h3>
        <StoryMeta article={article} locale={locale} show={['author', 'time']} className="mt-2" />
      </div>
    </article>
  )
}
