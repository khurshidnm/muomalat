import { localeMeta, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { articleMessages } from '@/i18n/messages/article'
import { listingMessages } from '@/i18n/messages/listing'
import { getSponsoredLabel, type ArticleView } from '@/content'
import { Icon } from '@/components/ui/Icon'
import { Kicker } from '@/components/ui/Kicker'
import { SponsoredLabel } from '@/components/ui/Labels'
import { Thumb } from '@/components/ui/Figure'
import { formatDate, tashkentDay } from '@/lib/format'

/** What a listing item shows above its headline. */
export type KickerMode = 'kicker' | 'rubric'

/**
 * Label above a listing headline. Partner content always carries the brass
 * SponsoredLabel; on rubric pages only a topical kicker is shown (the rubric
 * is the page), in mixed feeds the rubric name.
 */
export async function ItemKicker({
  article,
  locale,
  mode,
  className = '',
}: {
  article: ArticleView
  locale: Locale
  mode: KickerMode
  className?: string
}) {
  const t = pick(commonMessages, locale)
  // Items carry lang={contentLang}; the rubric name and the sponsored label are interface words.
  const ui = localeMeta[locale].htmlLang
  if (article.sponsored)
    return (
      <SponsoredLabel lang={ui} className={className}>
        {await getSponsoredLabel(locale)}
      </SponsoredLabel>
    )
  if (mode === 'rubric')
    return (
      <Kicker lang={ui} className={className}>
        {t.rubrics[article.rubric].name}
      </Kicker>
    )
  return article.kicker ? <Kicker className={className}>{article.kicker}</Kicker> : null
}

/** Explainer series number in brass figures (decorative; the headline carries the meaning). */
export function SeriesNumber({ n, size = 'md', className = '' }: { n: number; size?: 'md' | 'lg'; className?: string }) {
  return (
    <p
      aria-hidden="true"
      className={`figures font-display leading-none font-semibold text-brass ${size === 'lg' ? 'text-[2.25rem]' : 'text-[1.75rem]'} ${className}`}
    >
      {String(n).padStart(2, '0')}
    </p>
  )
}

/**
 * Rubric-specific lines under a headline: interviewee, sponsoring partner,
 * correction flag. Each flag pairs an icon or label with text, never colour alone.
 */
export function ItemFlags({
  article: a,
  locale,
  portrait = false,
  updated = false,
  className = 'mt-1.5',
}: {
  article: ArticleView
  locale: Locale
  portrait?: boolean
  /** Also mention a later update (dense lists, where the time column shows only publication). */
  updated?: boolean
  className?: string
}) {
  const m = pick(listingMessages, locale)
  const am = pick(articleMessages, locale)
  // Items carry lang={contentLang}; interface words inside them keep the page language.
  const ui = localeMeta[locale].htmlLang
  const lines: React.ReactNode[] = []
  if (a.interviewee) {
    const who = a.interviewee
    lines.push(
      <div key="who" className="flex items-center gap-2.5 text-meta leading-snug text-ink-3">
        {portrait && who.portrait ? (
          <Thumb image={who.portrait} sizes="40px" ratio="1/1" className="w-10 shrink-0 overflow-hidden rounded-full" />
        ) : null}
        <span>
          <span lang={ui} className="sr-only">
            {m.interviewWith}:{' '}
          </span>
          <span className="font-semibold text-ink-2">{who.name}</span>, {who.role}, {who.organisation}
        </span>
      </div>,
    )
  }
  if (a.sponsored) {
    lines.push(
      <p key="sp" className="text-meta leading-snug text-brass-ink">
        {am.sponsorBadge(a.sponsored.partner)}
      </p>,
    )
  }
  if (a.corrections?.length) {
    lines.push(
      <p key="corr" lang={ui} className="inline-flex items-center gap-1.5 text-meta font-semibold text-signal">
        <Icon name="alert" size={14} className="shrink-0" />
        {m.flags.corrected}
      </p>,
    )
  } else if (updated && a.updatedAt) {
    lines.push(
      <p key="upd" lang={ui} className="inline-flex items-center gap-1.5 text-meta text-ink-3">
        <Icon name="clock" size={14} className="shrink-0" />
        {m.flags.updated}{' '}
        <time dateTime={a.updatedAt} className="figures">
          {formatDate(a.updatedAt, locale, tashkentDay(a.updatedAt) === tashkentDay(a.publishedAt) ? 'time' : 'dayMonthTime')}
        </time>
      </p>,
    )
  }
  if (!lines.length) return null
  return <div className={`space-y-1.5 ${className}`}>{lines}</div>
}
