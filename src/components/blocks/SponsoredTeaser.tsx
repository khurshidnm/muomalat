import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { articleMessages } from '@/i18n/messages/article'
import { getSponsoredLabel, type ArticleView } from '@/content'
import { href } from '@/lib/routes'
import { SponsoredLabel } from '@/components/ui/Labels'
import { keepNumberWords } from '@/components/ui/InlineText'

/** Partner content teaser: brass panel and frame, partner named. */
export async function SponsoredTeaser({ article, locale, className = '' }: { article: ArticleView; locale: Locale; className?: string }) {
  const a = pick(articleMessages, locale)
  if (!article.sponsored) return null
  const label = await getSponsoredLabel(locale)
  // "Hamkor: {partner}": the label in the page language, the partner as written (Uzbek).
  const MARK = '\u0000'
  const [before, after = ''] = a.sponsorBadge(MARK).split(MARK)
  const base = locale === 'kr' ? 'uz-Cyrl' : 'uz'
  return (
    <aside aria-label={label} className={`border border-brass bg-brass-wash p-4 ${className}`}>
      <SponsoredLabel>{label}</SponsoredLabel>
      <h3 lang={article.contentLang} className="mt-2.5 font-serif text-lead leading-snug font-semibold">
        <Link href={href(locale, article.url)} prefetch={false} className="headline-link">
          {keepNumberWords(article.title)}
        </Link>
      </h3>
      <p className="mt-2 text-meta text-brass-ink">
        {before}
        <span lang={base}>{article.sponsored.partner}</span>
        {after}
      </p>
    </aside>
  )
}
