import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { glossaryMessages } from '@/i18n/messages/glossary'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { EditorialNote } from '@/components/article/EndMatter'
import { GlossaryBrowser, type BrowserEntry, type BrowserLabels } from '@/components/glossary/GlossaryBrowser'
import { GlossaryAbout, GlossaryNotes } from '@/components/glossary/parts'
import { letterOf } from '@/components/glossary/alphabet'
import { CATEGORIES, indexLetters, orderedGlossary, searchHaystack } from '@/components/glossary/data'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const m = pick(glossaryMessages, lang)
  return pageMetadata({
    locale: lang,
    path: paths.glossary(),
    title: m.meta.indexTitle,
    description: m.meta.indexDescription,
  })
}

export default async function GlossaryPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const m = pick(glossaryMessages, locale)

  const terms = orderedGlossary(locale)
  const contentLang = terms[0]?.contentLang ?? 'uz'
  const uiLang = localeMeta[locale].htmlLang
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, terms.filter((x) => x.category === c).length]))

  const entries: BrowserEntry[] = terms.map((x) => ({
    slug: x.slug,
    term: x.term,
    href: href(locale, paths.term(x.slug)),
    letter: letterOf(x.term, locale).id,
    category: x.category,
    en: x.aliases.en,
    ru: x.aliases.ru,
    short: x.short,
    haystack: searchHaystack(locale, x),
  }))

  const labels: BrowserLabels = {
    searchLabel: m.filter.searchLabel,
    searchPlaceholder: m.filter.searchPlaceholder,
    searchHint: m.filter.searchHint,
    submit: m.filter.submit,
    clearQuery: m.filter.clearQuery,
    categories: m.filter.categories,
    all: m.filter.all,
    alphabet: m.filter.alphabet,
    alphabetTitle: m.filter.alphabetTitle,
    total: m.index.count(terms.length),
    shown: m.filter.shown,
    none: m.filter.none,
    noneCategory: m.filter.noneCategory,
    siteSearch: m.filter.siteSearch,
    reset: m.filter.reset,
    termsIn: m.index.termsIn,
    categoryNames: Object.fromEntries(CATEGORIES.map((c) => [c, m.categories[c].plural])) as BrowserLabels['categoryNames'],
    categoryLabels: Object.fromEntries(CATEGORIES.map((c) => [c, m.categories[c].name])) as BrowserLabels['categoryLabels'],
  }

  const pageUrl = absoluteUrl(localePath(locale, paths.glossary()))
  const inLanguage = localeMeta[locale].htmlLang
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTermSet',
        '@id': `${pageUrl}#set`,
        name: m.meta.setName,
        description: m.meta.indexDescription,
        url: pageUrl,
        inLanguage: contentLang,
        publisher: { ...publisherLd, '@id': `${site.url}/#organization` },
        hasDefinedTerm: terms.map((x) => {
          const url = absoluteUrl(localePath(locale, paths.term(x.slug)))
          return {
            '@type': 'DefinedTerm',
            '@id': `${url}#term`,
            name: x.term,
            description: x.short,
            url,
            termCode: x.slug,
          }
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: m.index.title, item: pageUrl },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': pageUrl,
        url: pageUrl,
        name: m.meta.indexTitle,
        inLanguage,
        mainEntity: { '@id': `${pageUrl}#set` },
        isPartOf: { '@id': `${site.url}/#website` },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="wrap pt-5 md:pt-8">
        <Breadcrumbs
          label={t.labels.breadcrumbs}
          items={[{ name: t.nav.home, href: href(locale, '/') }, { name: m.index.title }]}
        />
        <header className="mt-4 max-w-[52rem] md:mt-6">
          <h1 className="font-display text-h1 font-semibold text-ink">{m.index.title}</h1>
          <p className="mt-3 font-serif text-standfirst text-ink-2 md:mt-4">{m.index.intro}</p>
          <div className="mt-4 max-w-measure">
            <EditorialNote text={m.index.note} linkLabel={t.nav.policy} href={href(locale, paths.policy())} />
            {contentLang === 'uz' && (locale === 'ru' || locale === 'en') ? (
              <p className="mt-2 pl-6 text-meta text-ink-3">{t.labels.originalLanguage}</p>
            ) : null}
          </div>
        </header>

        <div className="mt-6 border-t border-rule pt-5 md:mt-10 md:pt-6">
          <GlossaryBrowser
            entries={entries}
            letters={indexLetters(locale, terms)}
            categories={CATEGORIES}
            labels={labels}
            searchAction={href(locale, paths.search())}
            contentLang={contentLang}
            uiLang={uiLang}
            aside={<GlossaryAbout locale={locale} />}
            footer={<GlossaryNotes locale={locale} counts={counts} />}
          />
        </div>
      </div>
    </>
  )
}
