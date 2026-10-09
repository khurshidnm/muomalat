import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { Correction, Source, Sponsorship, Tag, Localized } from '@/content'
import { formatDate } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { SponsoredLabel } from '@/components/ui/Labels'

/** "Tuzatish": dated correction notes, signal-coloured rule. */
export function CorrectionNote({
  corrections,
  locale,
  contentLang,
  labels,
}: {
  corrections: Correction[]
  locale: Locale
  /** Language of the correction texts when it differs from the page's. */
  contentLang?: string
  labels: { title: string; date: (d: string) => string }
}) {
  return (
    <section id="tuzatish" aria-labelledby="tuzatish-title" className="scroll-mt-24 border-l-2 border-signal bg-signal-wash px-4 py-3.5">
      <h2 id="tuzatish-title" className="label-caps flex items-center gap-1.5 text-signal">
        <Icon name="alert" size={14} />
        {labels.title}
      </h2>
      {corrections.map((c, i) => (
        <div key={i} className="mt-2">
          <p className="text-meta text-ink-3">
            <time dateTime={c.date}>{labels.date(formatDate(c.date, locale, 'datetime'))}</time>
          </p>
          <p lang={contentLang} className="mt-1 font-serif text-lead leading-relaxed text-ink">
            {c.text}
          </p>
        </div>
      ))}
    </section>
  )
}

/**
 * Sponsor disclosure: who paid, who wrote, newsroom not involved. Render one
 * instance per page as the `aside` landmark; others as="div" (no duplicate
 * landmark names).
 */
export function SponsorDisclosure({
  sponsored,
  labels,
  contentLang,
  compact = false,
  showLabel = true,
  as: Tag = 'aside',
}: {
  sponsored: Sponsorship
  labels: { label: string; title: string; partner: (p: string) => string }
  /** Language of the partner name and disclosure when it differs from the page's. */
  contentLang?: string
  compact?: boolean
  showLabel?: boolean
  as?: 'aside' | 'div'
}) {
  // "Hamkor: {partner}" with only the partner name in the content language.
  const MARK = '\u0000'
  const [before, after = ''] = labels.partner(MARK).split(MARK)
  return (
    <Tag aria-label={Tag === 'aside' ? labels.title : undefined} className="border border-brass bg-brass-wash px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {showLabel ? <SponsoredLabel>{labels.label}</SponsoredLabel> : null}
        <span className="text-meta font-semibold text-brass-ink">
          {before}
          <span lang={contentLang}>{sponsored.partner}</span>
          {after}
        </span>
      </div>
      {!compact ? (
        <p lang={contentLang} className="mt-2 text-meta leading-relaxed text-ink-2">
          {sponsored.disclosure}
        </p>
      ) : null}
    </Tag>
  )
}

/** "Manbalar": numbered source list. */
export function SourceList({
  sources,
  locale,
  contentLang,
  sponsored = false,
  labels,
}: {
  sources: Source[]
  locale: Locale
  /** Language of source titles and publishers when it differs from the page's. */
  contentLang?: string
  /** Partner content: external source links are paid links (rel="sponsored"). */
  sponsored?: boolean
  labels: { title: string; intro: string }
}) {
  return (
    <section aria-labelledby="manbalar" className="border-t-2 border-ink pt-3">
      <h2 id="manbalar" className="font-display text-h4 font-semibold">
        {labels.title}
      </h2>
      <p className="mt-1 text-meta text-ink-3">{labels.intro}</p>
      <ol className="mt-3 space-y-2.5">
        {sources.map((s, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-2 text-meta">
            <span className="figures font-semibold text-ink-3">{i + 1}.</span>
            <span className="text-ink-2">
              {s.url?.startsWith('/') ? (
                <Link href={href(locale, s.url)} prefetch={false} lang={contentLang} className="text-link font-medium">
                  {s.title}
                </Link>
              ) : s.url ? (
                <a
                  href={s.url}
                  lang={contentLang}
                  rel={sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                  className="text-link font-medium"
                >
                  {s.title}
                </a>
              ) : (
                <span lang={contentLang} className="font-medium text-ink">
                  {s.title}
                </span>
              )}
              <span className="text-ink-3">
                {' — '}
                <span lang={contentLang}>{s.publisher}</span>
                {s.date ? (
                  <>
                    {', '}
                    <time dateTime={s.date} className="whitespace-nowrap">
                      {formatDate(s.date, locale, 'date')}
                    </time>
                  </>
                ) : null}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Tags as plain links separated by hairlines. */
export function TagList({ tags, locale, label }: { tags: Localized<Tag>[]; locale: Locale; label: string }) {
  if (!tags.length) return null
  return (
    <nav aria-label={label} className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-meta">
      <span className="label-caps mr-1 text-ink-3">{label}</span>
      {tags.map((t) => (
        <Link
          key={t.slug}
          href={href(locale, paths.tag(t.slug))}
          prefetch={false}
          lang={t.contentLang}
          className="rounded-[2px] border border-rule px-2 py-1 font-medium text-ink-2 hover:border-emerald hover:text-emerald"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

/** The editorial-status line shown on every article. */
export function EditorialNote({ text, linkLabel, href: link }: { text: string; linkLabel: string; href: string }) {
  return (
    <p className="flex items-start gap-2 text-meta leading-relaxed text-ink-3">
      <Icon name="info" size={16} className="mt-0.5 shrink-0 text-emerald" />
      <span>
        {text}{' '}
        <Link href={link} prefetch={false} className="text-link whitespace-nowrap">
          {linkLabel}
        </Link>
      </span>
    </p>
  )
}
