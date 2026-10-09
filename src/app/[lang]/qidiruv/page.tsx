import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { searchMessages } from '@/i18n/messages/search'
import { getArticleById, getLatest, search, type ArticleView, type SearchResults } from '@/content'
import { href, paths } from '@/lib/routes'
import { pageMetadata } from '@/lib/seo'
import { SearchForm } from '@/components/layout/SearchForm'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Icon } from '@/components/ui/Icon'
import { buttonClass } from '@/components/ui/Button'
import { StoryItem } from '@/components/story/StoryItem'
import { LatestFeed } from '@/components/story/LatestFeed'
import { Template } from '@/components/search/Highlight'
import { ArticleResult, GroupHeader, InstitutionResult, TermMatch, TermResult } from '@/components/search/Results'
import { PopularSearches, PopularTerms, SectionList, siteSections } from '@/components/search/Browse'
import { fillTemplate, otherScriptQuery, queryWords, sameText, termNames } from '@/components/search/text'

type Params = {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ q?: string | string[]; n?: string | string[] }>
}

/** Stories per "page"; "show more" extends the list in steps of this size. */
const STEP = 10
/** Institutions listed before pointing to the market map. */
const INSTITUTIONS_SHOWN = 5

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)

function readQuery(v?: string | string[]): string {
  return (first(v) ?? '').replace(/\s+/g, ' ').trim().slice(0, 100)
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const q = readQuery((await searchParams).q)
  const m = pick(searchMessages, lang).search
  return pageMetadata({
    locale: lang,
    path: paths.search(),
    title: q ? fillTemplate(m.metaTitle, q) : m.title,
    description: m.description,
    noindex: true,
  })
}

/** Union of two lists by key, keeping the order of the first and appending new items from the second. */
function union<T>(a: readonly T[], b: readonly T[], key: (x: T) => string): T[] {
  const seen = new Set(a.map(key))
  return [...a, ...b.filter((x) => !seen.has(key(x)))]
}

interface SearchRun {
  results: SearchResults
  /** The query the results answer: the typed one, or its other-script spelling. */
  used: string
  /** Other-script spelling whose matches were added to the typed query's. */
  also?: string
  /** Every spelling to highlight. */
  words: string[]
}

/**
 * Search in the edition's script and, when the query was typed in the other
 * script (Latin on /kr, Cyrillic elsewhere), in its transliteration too. With
 * no direct match the transliterated results replace the empty set; with
 * both, the two are merged so a Latin query on /kr still finds everything.
 */
async function runSearch(locale: Locale, q: string): Promise<SearchRun> {
  const results = await search(locale, q)
  const alt = otherScriptQuery(locale, q)
  const retry = alt ? await search(locale, alt) : undefined
  if (!alt || !retry || retry.total === 0) return { results, used: q, words: queryWords(q) }
  if (results.total === 0) return { results: retry, used: alt, words: queryWords(alt) }
  const articles = union(results.articles, retry.articles, (a) => a.id)
  const terms = union(results.terms, retry.terms, (t) => t.slug)
  const institutions = union(results.institutions, retry.institutions, (i) => i.id)
  const merged: SearchResults = {
    query: q,
    articles,
    terms,
    institutions,
    total: articles.length + terms.length + institutions.length,
  }
  if (merged.total === results.total) return { results, used: q, words: queryWords(q) }
  const words = [...new Set([...queryWords(q), ...queryWords(alt)])].sort((a, b) => b.length - a.length)
  return { results: merged, used: q, also: alt, words }
}

export default async function SearchPage({ params, searchParams }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const sp = await searchParams
  const t = pick(commonMessages, locale)
  const m = pick(searchMessages, locale).search

  const q = readQuery(sp.q)
  const tooShort = q.length > 0 && queryWords(q).join('').length < 2
  const searched = q.length > 0 && !tooShort
  const run = searched ? await runSearch(locale, q) : undefined
  const results = run?.results
  // Everything the views show is read here, so they render in one pass.
  const latest = await getLatest(locale, 6)
  const stories = new Map(
    await Promise.all(
      (results?.institutions ?? [])
        .slice(0, INSTITUTIONS_SHOWN)
        .flatMap((i) => (i.articleId ? [i.articleId] : []))
        .map(async (id) => [id, await getArticleById(locale, id)] as const),
    ),
  )
  const used = run?.used ?? q
  const words = run?.words ?? []
  const converted = used !== q
  const total = results?.total ?? 0

  const searchPath = href(locale, paths.search())
  const strong = (text: string) => (
    <strong key={text} className="font-semibold text-ink">
      {text}
    </strong>
  )

  return (
    <div className="wrap pt-6 md:pt-10">
      <header className="max-w-[48rem]">
        <h1 className="font-display text-h1 font-semibold text-ink">{m.title}</h1>
        {!q ? <p className="mt-2 text-ui text-ink-2">{m.intro}</p> : null}
        <div className="mt-5">
          <SearchForm
            action={searchPath}
            label={t.search.label}
            placeholder={t.search.placeholder}
            submitLabel={t.search.submit}
            defaultValue={q}
            size="lg"
            autoFocus={!q}
            id="search-page-q"
          />
        </div>
        <div role="status" aria-live="polite" aria-atomic="true">
          {tooShort ? <p className="mt-4 text-ui text-ink-2">{m.status.tooShort}</p> : null}
          {searched && total > 0 ? (
            <>
              {converted ? (
                <p className="mt-4 flex gap-2 text-meta text-ink-3">
                  <Icon name="info" size={16} className="mt-px shrink-0" />
                  <span>
                    <Template template={m.status.converted} values={[strong(q), strong(used)]} />
                  </span>
                </p>
              ) : null}
              <p className={`${converted ? 'mt-2' : 'mt-4'} text-ui text-ink-2`}>
                <Template template={m.status.results(total)} values={[strong(used)]} />
              </p>
              {run?.also ? (
                <p className="mt-1.5 flex gap-2 text-meta text-ink-3">
                  <Icon name="info" size={16} className="mt-px shrink-0" />
                  <span>
                    <Template template={m.status.merged} values={[strong(q), strong(run.also)]} />
                  </span>
                </p>
              ) : null}
            </>
          ) : null}
          {searched && total === 0 ? (
            <p className="mt-5 font-display text-h3 font-semibold text-ink">
              <Template template={m.status.none} values={[q]} />
            </p>
          ) : null}
        </div>
      </header>

      {results && total > 0 ? (
        <ResultsView
          locale={locale}
          results={results}
          q={q}
          spellings={[used, run?.also].filter((x): x is string => !!x)}
          words={words}
          shownParam={first(sp.n)}
          latest={latest}
          stories={stories}
        />
      ) : searched ? (
        <EmptyView locale={locale} latest={latest} />
      ) : (
        <IdleView locale={locale} latest={latest} />
      )}
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────

function ResultsView({
  locale,
  results,
  q,
  spellings,
  words,
  shownParam,
  latest,
  stories,
}: {
  locale: Locale
  results: SearchResults
  q: string
  /** The query's spellings that produced results (typed, and/or other script). */
  spellings: string[]
  words: string[]
  shownParam?: string
  latest: ArticleView[]
  /** Stories covering the institutions shown, by article id. */
  stories: Map<string, ArticleView | undefined>
}) {
  const m = pick(searchMessages, locale).search
  const { articles, terms, institutions } = results
  const exact = terms.find((term) => termNames(term).some((name) => spellings.some((sp) => sameText(name, sp))))
  const otherTerms = terms.filter((term) => term !== exact)

  const requested = Number.parseInt(shownParam ?? '', 10)
  const shown = Math.min(articles.length, Number.isFinite(requested) && requested > STEP ? requested : STEP)
  const remaining = articles.length - shown
  const moreHref = `${href(locale, paths.search(q))}&n=${shown + STEP}#natija-${shown + 1}`

  // Without story results the side column would stand alone: use one column.
  const twoColumns = articles.length > 0
  const groups = [
    articles.length ? { id: 'natijalar-maqolalar', label: m.groups.articles, count: articles.length } : null,
    terms.length ? { id: 'natijalar-lugat', label: m.groups.terms, count: terms.length } : null,
    institutions.length ? { id: 'natijalar-xarita', label: m.groups.institutions, count: institutions.length } : null,
  ].filter((g) => !!g)
  const termsFirst = !!exact || !twoColumns

  const termsSection = terms.length ? (
    <section aria-labelledby="natijalar-lugat">
      <GroupHeader
        id="natijalar-lugat"
        title={m.groups.terms}
        count={terms.length}
        href={href(locale, paths.glossary())}
        linkLabel={m.allTerms}
      />
      {exact ? (
        <div className="mt-4">
          <TermMatch term={exact} locale={locale} words={words} />
        </div>
      ) : null}
      {otherTerms.length ? (
        <ul className={exact ? 'mt-2' : 'mt-1'}>
          {otherTerms.map((term) => (
            <li key={term.slug} className="border-b border-rule py-3.5 last:border-b-0">
              <TermResult term={term} locale={locale} words={words} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  ) : null

  const institutionsSection = institutions.length ? (
    <section aria-labelledby="natijalar-xarita">
      <GroupHeader id="natijalar-xarita" title={m.groups.institutions} count={institutions.length} />
      <ul className="mt-1">
        {institutions.slice(0, INSTITUTIONS_SHOWN).map((i) => (
          <li key={i.id} className="border-b border-rule py-3.5">
            <InstitutionResult institution={i} locale={locale} words={words} story={i.articleId ? stories.get(i.articleId) : undefined} />
          </li>
        ))}
      </ul>
      <p className="mt-3">
        <Link
          href={href(locale, paths.market())}
          className="group inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink sm:min-h-0"
        >
          {institutions.length > INSTITUTIONS_SHOWN ? m.moreInstitutions(institutions.length - INSTITUTIONS_SHOWN) : m.openMap}
          <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </p>
    </section>
  ) : null

  const articlesSection = articles.length ? (
    <section aria-labelledby="natijalar-maqolalar">
      <GroupHeader id="natijalar-maqolalar" title={m.groups.articles} count={articles.length} />
      <ol className="mt-1">
        {articles.slice(0, shown).map((a, i) => (
          <li key={a.id} id={`natija-${i + 1}`} className="border-b border-rule py-4 last:border-b-0 md:py-5">
            <ArticleResult article={a} locale={locale} words={words} />
          </li>
        ))}
      </ol>
      {remaining > 0 ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-rule pt-4">
          <p className="text-meta text-ink-3">{m.shownOf(shown, articles.length)}</p>
          <Link href={moreHref} className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
            {m.moreArticles(Math.min(STEP, remaining))}
            <Icon name="chevron-down" size={16} />
          </Link>
        </div>
      ) : null}
    </section>
  ) : null

  return (
    <>
      {groups.length > 1 ? (
        <nav aria-label={m.jumpLabel} className="mt-6 border-y border-rule">
          <ul className="flex flex-wrap gap-x-6">
            {groups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="inline-flex h-11 items-center gap-1.5 text-meta font-medium whitespace-nowrap text-ink-2 hover:text-emerald"
                >
                  {g.label}
                  <span className="figures text-ink-3">{g.count}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-x-8">
        <div className="min-w-0 space-y-12 lg:col-span-8">
          {termsFirst ? termsSection : null}
          {articlesSection}
          {twoColumns ? null : institutionsSection}
        </div>
        <div className="min-w-0 space-y-12 lg:col-span-4">
          {termsFirst ? null : termsSection}
          {twoColumns ? institutionsSection : <LatestFeed articles={latest} locale={locale} id="search-latest" />}
        </div>
      </div>
    </>
  )
}

// ── Nothing found ─────────────────────────────────────────────────────────

function EmptyView({ locale, latest }: { locale: Locale; latest: ArticleView[] }) {
  const m = pick(searchMessages, locale).search
  const { rubrics, projects } = siteSections(locale)
  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-x-8">
      <section aria-labelledby="search-empty" className="min-w-0 lg:col-span-8">
        <SectionHeader id="search-empty" title={m.empty.title} description={m.empty.text} />
        <div className="mt-6 grid gap-8 sm:grid-cols-2 sm:gap-x-8">
          <div>
            <h3 className="label-caps text-ink-3">{m.empty.tipsTitle}</h3>
            <ul className="mt-3 space-y-2.5">
              {m.empty.tips.map((tip) => (
                <li key={tip} className="relative pl-5 text-ui text-ink-2">
                  <span aria-hidden="true" className="absolute top-[0.6em] left-0.5 size-1.5 rotate-45 bg-brass" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="label-caps text-ink-3">{m.empty.popularTerms}</h3>
            <PopularTerms locale={locale} className="mt-3" />
          </div>
        </div>
        <h3 className="label-caps mt-10 text-ink-3">{m.empty.sections}</h3>
        <SectionList items={[...rubrics, ...projects]} className="mt-3" />
      </section>
      <div className="min-w-0 lg:col-span-4">
        <LatestFeed articles={latest} locale={locale} id="search-latest" />
      </div>
    </div>
  )
}

// ── No query yet ──────────────────────────────────────────────────────────

function IdleView({ locale, latest }: { locale: Locale; latest: ArticleView[] }) {
  const t = pick(commonMessages, locale)
  const m = pick(searchMessages, locale).search
  const { rubrics, projects } = siteSections(locale)
  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-x-8">
      <div className="min-w-0 space-y-12 lg:col-span-8">
        <section aria-labelledby="search-popular">
          <SectionHeader id="search-popular" title={m.idle.popular} description={m.idle.hint} />
          <PopularSearches locale={locale} className="mt-4" />
        </section>
        <section aria-labelledby="search-recent">
          <SectionHeader id="search-recent" title={m.idle.latest} href={href(locale, paths.rubric('yangiliklar'))} linkLabel={t.actions.all} />
          <ul className="mt-1">
            {latest.map((a) => (
              <li key={a.id} className="border-b border-rule py-4 last:border-b-0">
                <StoryItem article={a} locale={locale} variant="media-side" kicker="rubric" meta={['time']} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section aria-labelledby="search-sections" className="min-w-0 lg:col-span-4">
        <SectionHeader id="search-sections" title={m.idle.sections} />
        <SectionList items={[...projects, ...rubrics]} className="mt-3" />
      </section>
    </div>
  )
}
