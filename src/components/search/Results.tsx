import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { marketMessages } from '@/i18n/messages/market'
import { searchMessages } from '@/i18n/messages/search'
import {
  CONTENT_NOW,
  getArticleById,
  type ArticleView,
  type GlossaryTerm,
  type Institution,
  type LicenceStatus,
  type Localized,
} from '@/content'
import { formatDate, smartDate } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { Thumb } from '@/components/ui/Figure'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StoryKicker } from '@/components/story/StoryKicker'
import { StatusMark } from '@/components/market/StatusMark'
import { keepNumberWords } from '@/components/ui/InlineText'
import { Highlight } from './Highlight'
import { bodyTexts, excerpt, hasMatch } from './text'

/** Group heading: section rule, name and result count. */
export function GroupHeader({
  id,
  title,
  count,
  href: link,
  linkLabel,
}: {
  id: string
  title: string
  count: number
  href?: string
  linkLabel?: string
}) {
  return (
    <SectionHeader
      id={id}
      href={link}
      linkLabel={linkLabel}
      title={
        <>
          {title}
          <span className="figures ml-2 align-[0.08em] font-sans text-ui font-normal text-ink-3">
            <span className="sr-only">: </span>
            {count}
          </span>
        </>
      }
    />
  )
}

/** The excerpt that best explains why a story matched. */
function storyExcerpt(a: ArticleView, words: readonly string[]): string {
  if (!words.length || hasMatch(a.lead, words)) return a.lead
  if (hasMatch(a.title, words)) return a.lead
  const hit = bodyTexts(a.body).find((t) => hasMatch(t, words))
  return hit ? excerpt(hit, words) : a.lead
}

/** One story in the results: kicker and date, headline, matching excerpt. */
export function ArticleResult({ article: a, locale, words }: { article: ArticleView; locale: Locale; words: readonly string[] }) {
  const t = pick(commonMessages, locale)
  const url = href(locale, a.url)
  const d = smartDate(a.publishedAt, locale, t.labels, CONTENT_NOW)
  return (
    <article className="grid gap-4 sm:grid-cols-[1fr_8.5rem] sm:gap-6">
      <div className="min-w-0">
        <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StoryKicker article={a} locale={locale} prefer="rubric" />
          {a.kicker && !a.sponsored ? (
            <>
              <span aria-hidden="true" className="text-rule-strong">/</span>
              <span lang={a.contentLang} className="label-caps text-ink-3">{a.kicker}</span>
            </>
          ) : null}
          <span aria-hidden="true" className="text-rule-strong">·</span>
          <time dateTime={a.publishedAt} className="figures text-meta text-ink-3">
            {d.isToday ? `${t.labels.today}, ${d.text}` : d.text}
          </time>
        </p>
        <h3 lang={a.contentLang} className="font-display text-h4 font-semibold text-ink sm:text-h3">
          <Link href={url} prefetch={false} className="headline-link">
            <Highlight text={a.title} words={words} />
          </Link>
        </h3>
        <p lang={a.contentLang} className="mt-1.5 text-ui text-ink-2">
          <Highlight text={storyExcerpt(a, words)} words={words} />
        </p>
      </div>
      {a.image ? (
        <Link href={url} prefetch={false} tabIndex={-1} aria-hidden="true" className="hidden self-start sm:block">
          <Thumb image={a.image} sizes="136px" ratio="3/2" />
        </Link>
      ) : null}
    </article>
  )
}

function Aliases({ term, words }: { term: GlossaryTerm; words: readonly string[] }) {
  const items = [
    term.aliases.en ? { lang: 'en', text: term.aliases.en } : null,
    term.aliases.ru ? { lang: 'ru', text: term.aliases.ru } : null,
  ].filter((x) => !!x)
  if (!items.length) return null
  return (
    <p className="mt-0.5 text-meta text-ink-3">
      {items.map((x, i) => (
        <span key={x.lang}>
          {i > 0 ? <span aria-hidden="true" className="mx-1.5 text-rule-strong">·</span> : null}
          <span lang={x.lang}>
            <Highlight text={x.text} words={words} />
          </span>
        </span>
      ))}
    </p>
  )
}

/** Glossary term in a result list. */
export function TermResult({ term, locale, words }: { term: Localized<GlossaryTerm>; locale: Locale; words: readonly string[] }) {
  return (
    <article>
      <h3 lang={term.contentLang} className="font-display text-h4 font-semibold">
        <Link href={href(locale, paths.term(term.slug))} prefetch={false} className="headline-link">
          <Highlight text={term.term} words={words} />
        </Link>
      </h3>
      <Aliases term={term} words={words} />
      <p lang={term.contentLang} className="mt-1.5 text-meta leading-relaxed text-ink-2">
        <Highlight text={term.short} words={words} />
      </p>
    </article>
  )
}

/** The glossary entry whose name is exactly the query: shown first, as the answer. */
export function TermMatch({ term, locale, words }: { term: Localized<GlossaryTerm>; locale: Locale; words: readonly string[] }) {
  const m = pick(searchMessages, locale).search
  const url = href(locale, paths.term(term.slug))
  return (
    <article className="border-t-2 border-brass bg-paper-2 p-5">
      <p className="label-caps text-brass-ink">{m.exactMatch}</p>
      <h3 lang={term.contentLang} className="mt-2 font-display text-h2 font-semibold" style={{ fontVariationSettings: '"opsz" 48' }}>
        <Link href={url} prefetch={false} className="headline-link">
          {term.term}
        </Link>
      </h3>
      <Aliases term={term} words={[]} />
      <p lang={term.contentLang} className="mt-3 max-w-measure font-serif text-lead leading-relaxed text-ink-2">
        <Highlight text={term.short} words={words} />
      </p>
      <p className="mt-4 border-t border-rule pt-3">
        <Link
          href={url}
          prefetch={false}
          className="group inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink sm:min-h-0"
        >
          {m.termPage}
          <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </p>
    </article>
  )
}

/**
 * Licence status: the market map's data mark and wording (shape and label,
 * never colour alone), with the date of the change.
 */
export function LicenceBadge({ status, date, locale }: { status: LicenceStatus; date: string; locale: Locale }) {
  const m = pick(searchMessages, locale).search
  const statuses = pick(marketMessages, locale).statuses
  const sameYear = date.slice(0, 4) === CONTENT_NOW.slice(0, 4)
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta">
      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
        <StatusMark status={status} size={12} />
        {statuses[status]}
      </span>
      <span aria-hidden="true" className="text-rule-strong">·</span>
      <time dateTime={date} className="figures text-ink-3">
        {m.asOf(formatDate(date, locale, sameYear ? 'dayMonth' : 'date'))}
      </time>
    </p>
  )
}

/** A market-map institution in the results. */
export function InstitutionResult({
  institution: i,
  locale,
  words,
}: {
  institution: Localized<Institution>
  locale: Locale
  words: readonly string[]
}) {
  const m = pick(searchMessages, locale).search
  const products = i.products.filter((p) => hasMatch(p, words))
  const story = i.articleId ? getArticleById(locale, i.articleId) : undefined
  return (
    <article>
      <h3 lang={i.contentLang} className="font-serif text-lead leading-snug font-semibold">
        <Link href={`${href(locale, paths.market())}#${i.id}`} prefetch={false} className="headline-link">
          <Highlight text={i.name} words={words} />
        </Link>
      </h3>
      <p className="mt-0.5 text-meta text-ink-3">
        {m.types[i.type]}
        <span aria-hidden="true" className="mx-1.5 text-rule-strong">·</span>
        <span lang={i.contentLang}>
          <Highlight text={i.city} words={words} />
        </span>
      </p>
      <div className="mt-1.5">
        <LicenceBadge status={i.status} date={i.statusDate} locale={locale} />
      </div>
      {products.length ? (
        <p className="mt-1.5 text-meta text-ink-2">
          <span className="text-ink-3">{m.products}: </span>
          <span lang={i.contentLang}>
            {products.map((p, k) => (
              <span key={p}>
                {k > 0 ? ', ' : null}
                <Highlight text={p} words={words} />
              </span>
            ))}
          </span>
        </p>
      ) : null}
      {story ? (
        <p className="mt-1.5 text-meta">
          <span className="text-ink-3">{m.coverage}: </span>
          <Link href={href(locale, story.url)} prefetch={false} lang={story.contentLang} className="text-link">
            {keepNumberWords(story.title)}
          </Link>
        </p>
      ) : null}
    </article>
  )
}
