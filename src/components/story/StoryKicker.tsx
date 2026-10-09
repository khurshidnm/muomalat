import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import type { ArticleView } from '@/content'
import { Kicker } from '@/components/ui/Kicker'
import { SponsoredLabel } from '@/components/ui/Labels'

/** Kicker for a story: sponsored label, topical kicker, or rubric name. */
export function StoryKicker({
  article,
  locale,
  prefer = 'kicker',
  className = '',
}: {
  article: ArticleView
  locale: Locale
  /** 'rubric' always shows the rubric name (useful in mixed feeds). */
  prefer?: 'kicker' | 'rubric'
  className?: string
}) {
  const t = pick(commonMessages, locale)
  if (article.sponsored) return <SponsoredLabel className={className}>{t.labels.sponsored}</SponsoredLabel>
  // A topical kicker is story text (lang of the story); the rubric name is an interface word.
  if (prefer === 'kicker' && article.kicker) {
    return (
      <Kicker lang={article.contentLang} className={className}>
        {article.kicker}
      </Kicker>
    )
  }
  return <Kicker className={className}>{t.rubrics[article.rubric].name}</Kicker>
}
