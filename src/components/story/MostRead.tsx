import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import type { ArticleView } from '@/content'
import { href } from '@/lib/routes'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SponsoredLabel } from '@/components/ui/Labels'
import { keepNumberWords } from '@/components/ui/InlineText'

/**
 * "Koʻp oʻqilgan": numbered list with large brass numerals and a quiet ink-3
 * label, never the emerald kickers of the main column. Used on the home page,
 * articles and listings; a listing passes `description` to spell out its scope
 * (rubric, topic or byline). The label is the rubric name; in a list scoped to
 * one rubric (`label="kicker"`), where that name would only repeat the scope
 * line, it is the story's topic instead, in the story's language.
 */
export function MostRead({
  articles,
  locale,
  id = 'most-read',
  description,
  label = 'rubric',
}: {
  articles: ArticleView[]
  locale: Locale
  id?: string
  description?: string
  label?: 'rubric' | 'kicker'
}) {
  const t = pick(commonMessages, locale)
  if (!articles.length) return null
  return (
    <section aria-labelledby={id}>
      <SectionHeader id={id} title={t.labels.mostRead} description={description} />
      <ol className="mt-2">
        {articles.map((a, i) => {
          const text = label === 'rubric' ? t.rubrics[a.rubric].name : a.kicker
          return (
            <li key={a.id} className="grid grid-cols-[2.25rem_1fr] gap-3 border-b border-rule py-3.5 last:border-b-0">
              <span aria-hidden="true" className="font-display text-[2rem] leading-[0.9] font-semibold text-brass" style={{ fontVariationSettings: '"opsz" 60' }}>
                {i + 1}
              </span>
              <div className="min-w-0">
                {/* Partner content keeps its label wherever it appears (callers already leave it out of most read). */}
                {a.sponsored ? (
                  <SponsoredLabel className="mb-1">{t.labels.sponsored}</SponsoredLabel>
                ) : text ? (
                  <p lang={label === 'kicker' ? a.contentLang : undefined} className="label-caps mb-1 text-ink-3">
                    {text}
                  </p>
                ) : null}
                <h3 lang={a.contentLang} className="font-serif text-lead leading-snug font-semibold">
                  <Link href={href(locale, a.url)} prefetch={false} className="headline-link">
                    {keepNumberWords(a.title)}
                  </Link>
                </h3>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
