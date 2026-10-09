import Link from 'next/link'
import { localeMeta, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { glossaryMessages } from '@/i18n/messages/glossary'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CATEGORIES, type Term } from './data'

/** Link to the index with a category preselected (the filter reads ?turkum=). */
export function categoryHref(locale: Locale, category: string): string {
  return `${href(locale, paths.glossary())}?turkum=${category}`
}

/** Index rail (sticky on desktop, after the list on phones): what the glossary is. */
export function GlossaryAbout({ locale }: { locale: Locale }) {
  const m = pick(glossaryMessages, locale)
  return (
    <section aria-labelledby="gl-about" className="border-t-2 border-brass bg-paper-2 p-5">
      <h2 id="gl-about" className="label-caps text-brass-ink">
        {m.aside.aboutTitle}
      </h2>
      <p className="mt-3 text-ui text-ink-2">{m.aside.aboutText}</p>
      <p className="mt-4 border-t border-rule pt-3 text-meta text-ink-2">
        {m.aside.suggest}{' '}
        <Link href={href(locale, paths.contact())} className="text-link font-semibold whitespace-nowrap">
          {m.aside.suggestLink}
        </Link>
      </p>
    </section>
  )
}

/** After the list: the five categories explained (the footer carries the editorial status). */
export function GlossaryNotes({ locale, counts }: { locale: Locale; counts: Record<string, number> }) {
  const m = pick(glossaryMessages, locale)
  return (
    <section aria-labelledby="gl-categories">
      <SectionHeader id="gl-categories" title={m.aside.categoriesTitle} />
      <dl className="mt-4 grid gap-x-8 border-t border-rule sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <div key={c} className="border-b border-rule py-3">
            <dt className="flex items-baseline justify-between gap-3">
              {/* Same page, new query: a plain link so the filter starts from the URL. */}
              <a
                href={categoryHref(locale, c)}
                className="font-display text-h4 font-semibold text-ink hover:text-emerald hover:underline underline-offset-2"
              >
                {m.categories[c].plural}
              </a>
              <span className="figures text-meta text-ink-3">{counts[c] ?? 0}</span>
            </dt>
            <dd className="mt-1 text-meta text-ink-2">{m.categories[c].description}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Equivalents in other languages under the headword. Visible codes (EN, RU,
 * AR) with the full language name for assistive tech; each value carries its
 * own lang so screen readers switch voice.
 */
export function AliasList({ term, locale, className = '' }: { term: Term; locale: Locale; className?: string }) {
  const m = pick(glossaryMessages, locale).term
  const ui = localeMeta[locale].htmlLang
  const all: { key: 'en' | 'ru' | 'ar'; value?: string; lang: string }[] = [
    { key: 'en', value: term.aliases.en, lang: 'en' },
    { key: 'ru', value: term.aliases.ru, lang: 'ru' },
    { key: 'ar', value: term.aliases.ar, lang: 'ar-Latn' },
  ]
  const rows = all.filter((r) => !!r.value)
  if (!rows.length) return null
  return (
    <dl aria-label={m.aliases} className={`flex flex-wrap gap-x-5 gap-y-1.5 text-ui ${className}`}>
      {rows.map(({ key, value, lang }) => (
        <div key={key} className="flex min-w-0 items-baseline gap-2">
          <dt lang={ui} title={m.langs[key]} className="label-caps shrink-0 text-ink-3">
            <span aria-hidden="true">{m.codes[key]}</span>
            <span className="sr-only">{m.langs[key]}</span>
          </dt>
          <dd lang={lang} className={`min-w-0 text-ink-2 ${key === 'ar' ? 'italic' : ''}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Numbered mechanics: brass numerals, serif text, hairlines between steps.
 * At 22px the numerals are below large-text size, so they use brass-ink (5.5:1).
 */
export function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {steps.map((s, i) => (
        <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-3">
          <span aria-hidden="true" className="figures pt-0.5 font-display text-[1.375rem] leading-none font-semibold text-brass-ink">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="font-serif text-lead leading-relaxed text-ink">{s}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Figures in a worked example set in tabular, semibold sans so the
 * arithmetic scans: "40 mln", "1,2 mln", "3 foiz", "2026-yil 1-oktabr".
 */
const NUMBER = /(\d[\d\s]*(?:[.,]\d+)?(?:\s?(?:mln|mlrd|ming)\b)?(?:\s?%)?)/g

function Figures({ text }: { text: string }) {
  const parts = text.split(NUMBER)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="figures font-sans text-[0.94em] font-semibold whitespace-nowrap text-ink">
            {p.trimEnd()}
            {p.endsWith(' ') ? ' ' : ''}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}

/** "Misol" box: tinted panel with a brass top rule. */
export function ExampleBox({
  example,
  note,
  id,
}: {
  example: { title: string; text: string }
  note: string
  id: string
}) {
  return (
    <div className="border-t-2 border-brass bg-paper-2 px-4 py-5 sm:px-6">
      <h3 id={id} className="font-display text-h4 font-semibold text-ink">
        {example.title}
      </h3>
      <p className="mt-2.5 font-serif text-lead leading-[1.65] text-ink">
        <Figures text={example.text} />
      </p>
      <p className="mt-4 flex items-start gap-1.5 border-t border-rule pt-3 text-meta text-ink-3">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        <span>{note}</span>
      </p>
    </div>
  )
}

/** Related terms: headword link, category, one-line definition. */
export function RelatedTerms({ terms, locale }: { terms: Term[]; locale: Locale }) {
  const m = pick(glossaryMessages, locale)
  const ui = localeMeta[locale].htmlLang
  return (
    <ul className="grid border-t border-rule sm:grid-cols-2 sm:gap-x-8">
      {terms.map((r) => (
        <li key={r.slug} lang={r.contentLang} className="border-b border-rule py-4">
          <p lang={ui} className="label-caps text-emerald">
            {m.categories[r.category].name}
          </p>
          <h3 className="mt-1 font-display text-h4 font-semibold">
            <Link href={href(locale, paths.term(r.slug))} prefetch={false} className="headline-link">
              {r.term}
            </Link>
          </h3>
          <p className="mt-1 text-meta text-ink-2">{r.short}</p>
        </li>
      ))}
    </ul>
  )
}

/** Previous / next term in alphabet order, plus the way back to the index. */
export function TermNav({ prev, next, locale }: { prev?: Term; next?: Term; locale: Locale }) {
  const m = pick(glossaryMessages, locale).term
  const cell = 'group flex min-h-[4.5rem] flex-col justify-center gap-1 py-3'
  return (
    <nav aria-label={m.nav} className="border-t-2 border-ink">
      <div className="grid grid-cols-2 gap-x-4 border-b border-rule">
        {prev ? (
          <Link href={href(locale, paths.term(prev.slug))} rel="prev" className={cell}>
            <span className="label-caps inline-flex items-center gap-1 text-ink-3">
              <Icon name="arrow-right" size={14} className="rotate-180" />
              {m.prev}
            </span>
            <span lang={prev.contentLang} className="font-display text-h4 font-semibold text-ink group-hover:text-emerald">
              {prev.term}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={href(locale, paths.term(next.slug))} rel="next" className={`${cell} items-end text-right`}>
            <span className="label-caps inline-flex items-center gap-1 text-ink-3">
              {m.next}
              <Icon name="arrow-right" size={14} />
            </span>
            <span lang={next.contentLang} className="font-display text-h4 font-semibold text-ink group-hover:text-emerald">
              {next.term}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      <p className="pt-3">
        <Link
          href={href(locale, paths.glossary())}
          className="group inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink"
        >
          {m.all}
          <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </p>
    </nav>
  )
}
