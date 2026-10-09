import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { homeMessages } from '@/i18n/messages/home'
import type { GlossaryTerm, Localized } from '@/content'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'

/**
 * Glossary term of the day: headword, equivalents, one-line definition. The
 * headword and definition carry the term's lang; each equivalent its own.
 */
export function TermOfDay({ term, locale, className = '' }: { term: Localized<GlossaryTerm>; locale: Locale; className?: string }) {
  const t = pick(homeMessages, locale)
  const eq = [
    term.aliases.en ? { lang: 'en', text: term.aliases.en } : null,
    term.aliases.ru ? { lang: 'ru', text: term.aliases.ru } : null,
  ].filter((x) => x !== null)
  return (
    <section aria-labelledby="term-of-day" className={`relative border-t-2 border-brass bg-paper-2 p-5 ${className}`}>
      <p id="term-of-day" className="label-caps text-brass-ink">
        {t.termOfDay}
      </p>
      <p lang={term.contentLang} className="mt-3 font-display text-h2 font-semibold" style={{ fontVariationSettings: '"opsz" 48' }}>
        <Link href={href(locale, paths.term(term.slug))} prefetch={false} className="headline-link">
          {term.term}
        </Link>
      </p>
      {eq.length ? (
        <p className="mt-1 text-meta text-ink-3">
          {eq.map((x, i) => (
            <span key={x.lang}>
              {i > 0 ? <span aria-hidden="true"> · </span> : null}
              <span lang={x.lang}>{x.text}</span>
            </span>
          ))}
        </p>
      ) : null}
      <p lang={term.contentLang} className="mt-3 font-serif text-lead leading-relaxed text-ink-2">
        {term.short}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
        <Link
          href={href(locale, paths.term(term.slug))}
          prefetch={false}
          className="group inline-flex items-center gap-1.5 text-meta font-semibold text-emerald hover:text-emerald-ink"
        >
          {t.termCta}
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link href={href(locale, paths.glossary())} prefetch={false} className="text-meta text-ink-3 hover:text-emerald">
          {t.glossaryAll}
        </Link>
      </div>
    </section>
  )
}
