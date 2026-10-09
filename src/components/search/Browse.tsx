import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { searchMessages } from '@/i18n/messages/search'
import { toCyrillic } from '@/i18n/translit'
import { getTerm, rubricSlugs } from '@/content'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'

/** Glossary entries readers look for most; their headwords double as popular searches. */
const POPULAR_TERMS = ['murobaha', 'sukuk', 'ijora', 'takaful', 'islom-oynasi', 'mushoraka', 'shariat-kengashi', 'aaoifi']
/** Topical searches that are not glossary headwords (Uzbek Latin source). */
const POPULAR_TOPICS = ['litsenziya', 'lizing']

async function popularTerms(locale: Locale) {
  return (await Promise.all(POPULAR_TERMS.map((s) => getTerm(locale, s)))).filter((x) => !!x)
}

/** Popular searches as links to /qidiruv?q=… (term headwords in the edition's script). */
export async function PopularSearches({ locale, className = '' }: { locale: Locale; className?: string }) {
  const terms = (await popularTerms(locale)).map((t) => ({ q: t.term, lang: t.contentLang }))
  const topics = POPULAR_TOPICS.map((q) => (locale === 'kr' ? { q: toCyrillic(q), lang: 'uz-Cyrl' } : { q, lang: 'uz' }))
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {[...terms, ...topics].map((item) => (
        <li key={item.q}>
          <Link
            href={href(locale, paths.search(item.q))}
            lang={item.lang}
            className="inline-flex h-11 items-center gap-2 rounded-[2px] border border-rule px-3.5 text-ui text-ink transition-colors hover:border-emerald hover:text-emerald sm:h-10"
          >
            <Icon name="search" size={15} className="text-ink-3" />
            {item.q}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** The same entries as glossary links (dotted brass term links). */
export async function PopularTerms({ locale, className = '' }: { locale: Locale; className?: string }) {
  const terms = await popularTerms(locale)
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2.5 ${className}`}>
      {terms.map((t) => (
        <li key={t.slug} lang={t.contentLang}>
          <Link href={href(locale, paths.term(t.slug))} className="term-link font-serif text-lead">
            {t.term}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export interface SiteSection {
  href: string
  label: string
  description: string
}

/** Rubrics and projects with one-line descriptions, for "where to go next" lists. */
export function siteSections(locale: Locale) {
  const t = pick(commonMessages, locale)
  const n = pick(searchMessages, locale).notFound
  const rubrics: SiteSection[] = rubricSlugs.map((r) => ({
    href: href(locale, paths.rubric(r)),
    label: t.rubrics[r].name,
    description: t.rubrics[r].description,
  }))
  const projects: SiteSection[] = [
    { href: href(locale, paths.glossary()), label: t.nav.lugat, description: n.glossary },
    { href: href(locale, paths.market()), label: t.nav.xarita, description: n.market },
    { href: href(locale, paths.club()), label: t.nav.klub, description: n.club },
  ]
  return { rubrics, projects }
}

/** Hairline list of section links: serif name, description, chevron. */
export function SectionList({ items, className = '' }: { items: SiteSection[]; className?: string }) {
  return (
    <ul className={`border-t border-rule ${className}`}>
      {items.map((s) => (
        <li key={s.href} className="border-b border-rule">
          <Link href={s.href} className="group flex min-h-11 items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block font-display text-h4 font-semibold text-ink underline decoration-transparent decoration-1 underline-offset-[0.16em] transition-colors group-hover:decoration-emerald">
                {s.label}
              </span>
              <span className="mt-0.5 block text-meta text-ink-3">{s.description}</span>
            </span>
            <Icon name="chevron-right" size={18} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
