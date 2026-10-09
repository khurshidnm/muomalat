import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, locales, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { articleMessages } from '@/i18n/messages/article'
import { glossaryMessages } from '@/i18n/messages/glossary'
import { getArticlesByTerm, getGlossary, getTerm, isSlug, resolveMissing } from '@/content'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { InlineText, plainText } from '@/components/ui/InlineText'
import { Kicker } from '@/components/ui/Kicker'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Icon } from '@/components/ui/Icon'
import { ShareBar } from '@/components/article/ShareBar'
import { EditorialNote } from '@/components/article/EndMatter'
import { StoryItem } from '@/components/story/StoryItem'
import { neighbours, orderedGlossary, type Term } from '@/components/glossary/data'
import { AliasList, ExampleBox, RelatedTerms, StepList, TermNav, categoryHref } from '@/components/glossary/parts'

type Params = { params: Promise<{ lang: string; term: string }> }

/** Seconds; a change to the term reaches the page sooner through tags (CMS-SPEC §8.2). */
export const revalidate = 3600

export async function generateStaticParams() {
  return (await Promise.all(locales.map(async (lang) => (await getGlossary(lang)).map((t) => ({ lang, term: t.slug }))))).flat()
}

/** Stories listed in full before the rest fold into "Yana N ta maqola". */
const ARTICLES_SHOWN = 5

async function load(lang: string, slug: string): Promise<Term | undefined> {
  if (!isLocale(lang) || !isSlug(slug)) return undefined
  return getTerm(lang, slug)
}

/** Editions that carry the term's text: uz, kr, and ru/en where an approved translation is shown. */
async function editions(slug: string): Promise<Locale[]> {
  const own = await Promise.all((['ru', 'en'] as const).map(async (l) => ((await getTerm(l, slug))?.contentLang === l ? [l] : [])))
  return ['uz', 'kr', ...own.flat()]
}

/** Glossary text is written in Uzbek; ru/en pages show the Uzbek original. */
function isFallback(locale: Locale, term: Term) {
  return (locale === 'ru' || locale === 'en') && term.contentLang === 'uz'
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, term: slug } = await params
  const term = await load(lang, slug)
  if (!term || !isLocale(lang)) return {}
  const m = pick(glossaryMessages, lang)
  return pageMetadata({
    locale: lang,
    path: paths.term(term.slug),
    title: m.meta.termTitle(term.term),
    description: plainText(term.short),
    languages: await editions(term.slug),
    canonicalLocale: isFallback(lang, term) ? 'uz' : undefined,
    images: [{ url: absoluteUrl(`${localePath(lang, paths.term(term.slug))}/opengraph-image`), width: 1200, height: 630, alt: term.term }],
  })
}

const H2 = 'scroll-mt-6 font-display text-h3 font-semibold text-ink'

export default async function TermPage({ params }: Params) {
  const { lang, term: slug } = await params
  const loaded = await load(lang, slug)
  if (!loaded || !isLocale(lang)) {
    if (isLocale(lang) && isSlug(slug)) await resolveMissing(localePath(lang, paths.term(slug)))
    notFound()
  }
  const locale: Locale = lang
  const term = loaded
  const t = pick(commonMessages, locale)
  const am = pick(articleMessages, locale)
  const m = pick(glossaryMessages, locale)
  const cl = term.contentLang
  const ui = localeMeta[locale].htmlLang

  const category = m.categories[term.category]
  const related = (await Promise.all(term.related.map((s) => getTerm(locale, s)))).filter((x): x is Term => !!x)
  const articles = await getArticlesByTerm(locale, term.slug)
  const { prev, next } = await neighbours(locale, term.slug)
  const sameCategory = (await orderedGlossary(locale)).filter((x) => x.category === term.category)

  const glossaryUrl = absoluteUrl(localePath(locale, paths.glossary()))
  const url = absoluteUrl(localePath(locale, paths.term(term.slug)))
  const shareLabels = {
    share: m.term.share,
    telegram: am.shareTelegram,
    copy: t.actions.copyLink,
    copied: t.actions.copied,
    heading: t.actions.share,
  }

  const toc = [
    { id: 'tarif', label: m.term.definition },
    { id: 'kelib-chiqishi', label: m.term.origin },
    { id: 'amalda', label: m.term.practice },
    ...(term.example ? [{ id: 'misol', label: m.term.example }] : []),
    ...(related.length ? [{ id: 'bogliq-atamalar', label: m.term.related }] : []),
    { id: 'maqolalar', label: m.term.articles },
  ]

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTerm',
        '@id': `${url}#term`,
        name: term.term,
        alternateName: [term.aliases.en, term.aliases.ru, term.aliases.ar].filter(Boolean),
        description: plainText(term.short),
        url,
        termCode: term.slug,
        inLanguage: cl,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          '@id': `${glossaryUrl}#set`,
          name: m.meta.setName,
          url: glossaryUrl,
        },
        subjectOf: articles.slice(0, ARTICLES_SHOWN).map((a) => ({
          '@type': 'NewsArticle',
          headline: a.title,
          url: absoluteUrl(localePath(locale, a.url)),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: m.index.title, item: glossaryUrl },
          { '@type': 'ListItem', position: 3, name: term.term, item: url },
        ],
      },
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: m.meta.termTitle(term.term),
        inLanguage: ui,
        mainEntity: { '@id': `${url}#term` },
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
          items={[
            { name: t.nav.home, href: href(locale, '/') },
            { name: m.index.title, href: href(locale, paths.glossary()) },
            { name: term.term },
          ]}
        />

        <header className="mt-5 max-w-[52rem] pb-6 md:mt-7 md:pb-8">
          <Kicker href={categoryHref(locale, term.category)}>{category.name}</Kicker>
          <h1 lang={cl} className="mt-2 font-display text-h1 font-semibold text-ink">
            {term.term}
          </h1>
          <AliasList term={term} locale={locale} className="mt-3" />
          <p lang={cl} className="mt-4 font-serif text-standfirst text-ink-2">
            {term.short}
          </p>
          {isFallback(locale, term) ? <p className="mt-3 text-meta text-ink-3">{t.labels.originalLanguage}</p> : null}
          <ShareBar url={url} title={term.term} labels={shareLabels} className="mt-5" />
        </header>

        <div className="grid gap-x-8 border-t border-rule pt-8 md:pt-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <section aria-labelledby="tarif">
              <h2 id="tarif" className={H2}>
                {m.term.definition}
              </h2>
              <div lang={cl} className="article-body mt-3">
                {term.definition.map((p, i) => (
                  <p key={i}>
                    <InlineText text={p} locale={locale} />
                  </p>
                ))}
              </div>
            </section>

            <section aria-labelledby="kelib-chiqishi" className="mt-10 md:mt-12">
              <h2 id="kelib-chiqishi" className={H2}>
                {m.term.origin}
              </h2>
              <div lang={cl} className="article-body mt-3">
                <p>
                  <InlineText text={term.origin} locale={locale} />
                </p>
              </div>
            </section>

            <section aria-labelledby="amalda" className="mt-10 md:mt-12">
              <h2 id="amalda" className={H2}>
                {m.term.practice}
              </h2>
              <div lang={cl} className="article-body mt-3">
                {term.practice.map((p, i) => (
                  <p key={i}>
                    <InlineText text={p} locale={locale} />
                  </p>
                ))}
              </div>
              {term.steps?.length ? (
                <div className="mt-8 max-w-measure">
                  <h3 id="bosqichlar" className="label-caps mb-3 text-ink-3">
                    {m.term.steps}
                  </h3>
                  <div lang={cl}>
                    <StepList steps={term.steps} />
                  </div>
                </div>
              ) : null}
            </section>

            {term.example ? (
              <section aria-labelledby="misol" className="mt-10 max-w-measure md:mt-12">
                <h2 id="misol" className={H2}>
                  {m.term.example}
                </h2>
                <div lang={cl} className="mt-4">
                  <ExampleBox example={term.example} note={m.term.exampleNote} id="misol-title" />
                </div>
              </section>
            ) : null}

            <div className="mt-10 max-w-measure">
              <EditorialNote text={m.term.editorial} linkLabel={t.nav.policy} href={href(locale, paths.policy())} />
            </div>

            {related.length ? (
              <section aria-labelledby="bogliq-atamalar" className="mt-12 md:mt-16">
                <SectionHeader id="bogliq-atamalar" title={m.term.related} className="scroll-mt-6" />
                <div className="mt-4">
                  <RelatedTerms terms={related} locale={locale} />
                </div>
              </section>
            ) : null}

            <section aria-labelledby="maqolalar" className="mt-12 md:mt-16">
              <SectionHeader id="maqolalar" title={m.term.articles} className="scroll-mt-6" />
              {articles.length ? (
                <>
                  <ul className="mt-4">
                    {articles.slice(0, ARTICLES_SHOWN).map((a) => (
                      <li key={a.id} className="border-b border-rule py-4 first:pt-0">
                        <StoryItem
                          article={a}
                          locale={locale}
                          variant="media-side"
                          kicker="rubric"
                          meta={['time', 'reading']}
                        />
                      </li>
                    ))}
                  </ul>
                  {articles.length > ARTICLES_SHOWN ? (
                    <details className="group border-b border-rule">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 py-2 text-ui font-semibold text-emerald hover:text-emerald-ink [&::-webkit-details-marker]:hidden">
                        <Icon name="chevron-down" size={16} className="transition-transform group-open:rotate-180" />
                        {m.term.moreArticles(articles.length - ARTICLES_SHOWN)}
                      </summary>
                      <ul className="pb-2">
                        {articles.slice(ARTICLES_SHOWN).map((a) => (
                          <li key={a.id} className="border-t border-rule py-3">
                            <StoryItem article={a} locale={locale} variant="headline" kicker="rubric" meta={['time']} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              ) : (
                <p className="mt-4 text-ui text-ink-3">{m.term.noArticles}</p>
              )}
            </section>

            <div className="mt-12 md:mt-16">
              <TermNav prev={prev} next={next} locale={locale} />
            </div>
            <div className="mt-6 border-t border-rule pt-5">
              <ShareBar url={url} title={term.term} labels={shareLabels} />
            </div>
          </div>

          {/* Desktop rail */}
          <aside aria-label={m.index.title} className="no-print hidden lg:col-span-4 lg:block">
            <section aria-labelledby="same-category" className="border-t-2 border-brass bg-paper-2 p-4">
              <h2 id="same-category" className="label-caps text-brass-ink">
                {m.term.sameCategory}
              </h2>
              <p className="mt-1 text-meta text-ink-3">
                <Link href={categoryHref(locale, term.category)} className="hover:text-emerald hover:underline underline-offset-2">
                  {category.plural}
                </Link>
                {' · '}
                <span className="figures">{sameCategory.length}</span>
              </p>
              <ul lang={cl} className="mt-3 divide-y divide-rule border-t border-rule">
                {sameCategory.map((x) => (
                  <li key={x.slug}>
                    {x.slug === term.slug ? (
                      <span aria-current="page" className="flex min-h-9 items-center gap-2 py-1.5 font-display text-lead font-semibold text-ink">
                        <span aria-hidden="true" className="size-1.5 rotate-45 bg-brass" />
                        {x.term}
                      </span>
                    ) : (
                      <Link
                        href={href(locale, paths.term(x.slug))}
                        className="flex min-h-9 items-center py-1.5 font-display text-lead text-ink-2 hover:text-emerald"
                      >
                        {x.term}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <nav aria-labelledby="toc-title" className="sticky top-20 mt-8">
              <h2 id="toc-title" className="label-caps text-ink-3">
                {m.term.onThisPage}
              </h2>
              <ol className="mt-2 border-l border-rule">
                {toc.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-ui text-ink-2 hover:border-emerald hover:text-emerald"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        </div>
      </div>
    </>
  )
}
