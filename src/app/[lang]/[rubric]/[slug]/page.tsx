import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, locales, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { articleMessages } from '@/i18n/messages/article'
import {
  getArticle,
  getArticles,
  getAuthor,
  getMostRead,
  getRelated,
  getTag,
  getTerm,
  isRubric,
  isSlug,
  resolveMissing,
  type ArticleView,
} from '@/content'
import { site } from '@/content/data/site'
import { formatDate } from '@/lib/format'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { keepNumberWords } from '@/components/ui/InlineText'
import { Figure } from '@/components/ui/Figure'
import { Kicker } from '@/components/ui/Kicker'
import { Icon } from '@/components/ui/Icon'
import { SponsoredLabel } from '@/components/ui/Labels'
import { Thumb } from '@/components/ui/Figure'
import { TelegramButton } from '@/components/ui/TelegramButton'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ArticleBlocks } from '@/components/article/Blocks'
import { Byline } from '@/components/article/Byline'
import { ShareBar } from '@/components/article/ShareBar'
import { CorrectionNote, EditorialNote, SourceList, SponsorDisclosure, TagList } from '@/components/article/EndMatter'
import { StoryItem } from '@/components/story/StoryItem'
import { MostRead } from '@/components/story/MostRead'
import { AdSlot } from '@/components/blocks/AdSlot'

type Params = { params: Promise<{ lang: string; rubric: string; slug: string }> }

/** Seconds; a change to the story reaches the page sooner through its tags (CMS-SPEC §8.2). */
export const revalidate = 3600

/** Stories prerendered at build time; any other published story renders on its first request. */
const PRERENDERED = 50

export async function generateStaticParams() {
  const params = await Promise.all(
    locales.map(async (lang) => (await getArticles(lang)).slice(0, PRERENDERED).map((a) => ({ lang, rubric: a.rubric, slug: a.slug }))),
  )
  return params.flat()
}

/** Route params are checked before any read (§8.1); an invalid one is a 404 without a query. */
async function load(lang: string, rubric: string, slug: string) {
  if (!isLocale(lang) || !isRubric(rubric) || !isSlug(slug)) return undefined
  return getArticle(lang, rubric, slug)
}

/** Editions that actually carry this story's text: uz, kr, and ru/en where the translation is shown. */
async function editions(a: ArticleView): Promise<Locale[]> {
  const own = await Promise.all((['ru', 'en'] as const).map(async (l) => ((await getArticle(l, a.rubric, a.slug))?.contentLang === l ? [l] : [])))
  return ['uz', 'kr', ...own.flat()]
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, rubric, slug } = await params
  const a = await load(lang, rubric, slug)
  if (!a || !isLocale(lang)) return {}
  const t = pick(commonMessages, lang)
  const fallback = (lang === 'ru' || lang === 'en') && a.contentLang === 'uz'
  const withdrawnTitle = a.withdrawn?.hideTitle ? pick(articleMessages, lang).withdrawnTitle : undefined
  return pageMetadata({
    locale: lang,
    path: a.url,
    title: withdrawnTitle ?? a.title,
    description: a.withdrawn ? a.withdrawn.notice : a.lead,
    type: 'article',
    languages: await editions(a),
    canonicalLocale: fallback ? 'uz' : undefined,
    images: [{ url: absoluteUrl(`${localePath(lang, a.url)}/opengraph-image`), width: 1200, height: 630, alt: withdrawnTitle ?? a.title }],
    article: {
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt ?? a.corrections?.at(-1)?.date,
      section: t.rubrics[a.rubric].name,
      authors: await Promise.all(a.authors.map(async (s) => (await getAuthor(lang, s))?.name ?? s)),
      tags: await Promise.all(a.tags.map(async (s) => (await getTag(lang, s))?.label ?? s)),
    },
    // A withdrawn story stays at its address with the notice, out of search engines (§5.8).
    noindex: Boolean(a.withdrawn || a.noindex),
  })
}

export default async function ArticlePage({ params }: Params) {
  const { lang, rubric, slug } = await params
  const article = await load(lang, rubric, slug)
  if (!article || !isLocale(lang)) {
    if (isLocale(lang) && isRubric(rubric) && isSlug(slug)) await resolveMissing(localePath(lang, `/${rubric}/${slug}`))
    notFound()
  }
  const locale: Locale = lang
  const a = article
  if (a.withdrawn) return <WithdrawnStory article={a} locale={locale} />
  const t = pick(commonMessages, locale)
  const m = pick(articleMessages, locale)
  const authors = (await Promise.all(a.authors.map((s) => getAuthor(locale, s)))).filter((x) => !!x)
  const tags = (await Promise.all(a.tags.map((s) => getTag(locale, s)))).filter((x) => !!x)
  const terms = (await Promise.all((a.terms ?? []).map((s) => getTerm(locale, s)))).filter((x) => !!x)
  const related = await getRelated(locale, a, 4)
  const mostRead = (await getMostRead(locale, 5)).filter((x) => x.id !== a.id).slice(0, 4)
  const url = absoluteUrl(localePath(locale, a.url))
  const rubricName = t.rubrics[a.rubric].name
  const isInterview = a.rubric === 'intervyu'
  // Language of parts: the page chrome is in the edition's language (from <html>);
  // only story text carries lang. `cl` is the language of the title, lead,
  // body, corrections and sponsor note (all translated with the story in the
  // CMS); `base` the language of fields that are never translated (sources,
  // interviewee): Uzbek, or Cyrillic Uzbek on /kr.
  const cl = a.contentLang
  const base = locale === 'kr' ? 'uz-Cyrl' : 'uz'
  const shareLabels = {
    share: m.shareLabel,
    telegram: m.shareTelegram,
    copy: t.actions.copyLink,
    copied: t.actions.copied,
    heading: t.actions.share,
  }
  const blockLabels = {
    lang: localeMeta[locale].htmlLang,
    source: m.source,
    note: m.note,
    scroll: m.scrollTable,
    period: m.period,
    category: m.category,
    dataTable: m.dataTable,
    chart: m.chart,
    more: t.actions.more,
    question: m.question,
    glossary: t.nav.lugat,
  }
  const modified = a.updatedAt ?? a.corrections?.at(-1)?.date

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        // Paid partner content is not news reporting.
        '@type': a.sponsored ? 'AdvertiserContentArticle' : 'NewsArticle',
        '@id': `${url}#article`,
        mainEntityOfPage: url,
        headline: a.title,
        description: a.lead,
        inLanguage: a.contentLang,
        datePublished: a.firstPublishedAt ?? a.publishedAt,
        dateModified: modified ?? a.publishedAt,
        articleSection: rubricName,
        keywords: tags.map((x) => x.label).join(', '),
        wordCount: a.readingMinutes * 180,
        isAccessibleForFree: true,
        image: [absoluteUrl(`${localePath(locale, a.url)}/opengraph-image`)],
        author: authors.map((p) =>
          (p.isTeam ?? (p.slug === 'tahririyat' || p.slug === 'hamkorlik'))
            ? { '@type': 'Organization', name: p.name, url: absoluteUrl(localePath(locale, paths.author(p.slug))) }
            : { '@type': 'Person', name: p.name, jobTitle: p.role, url: absoluteUrl(localePath(locale, paths.author(p.slug))) },
        ),
        publisher: { ...publisherLd, '@id': `${site.url}/#organization` },
        ...(a.sponsored ? { sponsor: { '@type': 'Organization', name: a.sponsored.partner } } : {}),
        ...(a.corrections?.length ? { correction: a.corrections.map((c) => ({ '@type': 'CorrectionComment', text: c.text, datePublished: c.date })) } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: rubricName, item: absoluteUrl(localePath(locale, paths.rubric(a.rubric))) },
          { '@type': 'ListItem', position: 3, name: a.title, item: url },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <article data-article-id={a.id} className="pb-4">
        {/* Header */}
        <header className={a.sponsored ? 'border-b border-brass bg-brass-wash/70' : ''}>
          <div className="wrap pt-5 pb-5 md:pt-9">
            <div className="max-w-[52rem]">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                {a.sponsored ? <SponsoredLabel>{t.labels.sponsored}</SponsoredLabel> : null}
                <span className="inline-flex items-center gap-x-3">
                  <Kicker href={href(locale, paths.rubric(a.rubric))}>{rubricName}</Kicker>
                  {a.kicker && !a.sponsored ? (
                    <>
                      <span aria-hidden="true" className="text-rule-strong">/</span>
                      <span lang={cl} className="label-caps text-ink-3">
                        {a.kicker}
                      </span>
                    </>
                  ) : null}
                </span>
              </div>
              <h1 lang={cl} className="font-display text-h1 font-semibold text-ink">
                {keepNumberWords(a.title)}
              </h1>
              <p lang={cl} className="mt-3 font-serif text-standfirst text-ink-2 md:mt-4">
                {keepNumberWords(a.lead)}
              </p>

              {a.sponsored ? (
                <div className="mt-5">
                  <SponsorDisclosure
                    as="div"
                    sponsored={a.sponsored}
                    contentLang={cl}
                    showLabel={false}
                    labels={{ label: t.labels.sponsored, title: m.sponsorNoteTitle, partner: m.sponsorBadge }}
                  />
                </div>
              ) : null}

              {a.corrections?.length ? (
                <p className="mt-4">
                  <a href="#tuzatish" className="inline-flex items-center gap-1.5 text-meta font-semibold text-signal hover:underline underline-offset-2">
                    <Icon name="alert" size={14} />
                    {m.correctionFlag}
                    <Icon name="chevron-down" size={14} />
                  </a>
                </p>
              ) : null}

              {isInterview && a.interviewee ? (
                <div className="mt-5 flex items-center gap-3">
                  {a.interviewee.portrait ? (
                    <Thumb image={a.interviewee.portrait} sizes="56px" ratio="1/1" className="w-14 shrink-0 overflow-hidden rounded-full" />
                  ) : null}
                  <p className="text-meta leading-snug">
                    <span className="label-caps block text-ink-3">{m.interviewWith}</span>
                    <span lang={base}>
                      <span className="font-semibold text-ink">{a.interviewee.name}</span>
                      <span className="text-ink-2">
                        , {a.interviewee.role}, {a.interviewee.organisation}
                      </span>
                    </span>
                  </p>
                </div>
              ) : null}

              <div className="mt-5">
                <Byline
                  authors={authors}
                  publishedAt={a.publishedAt}
                  updatedAt={a.updatedAt}
                  readingMinutes={a.readingMinutes}
                  locale={locale}
                  labels={{ by: t.labels.by, published: t.labels.published, updated: t.labels.updated, readingTime: t.labels.readingTime(a.readingMinutes) }}
                />
              </div>
              {/* One slot: an Uzbek original shown on ru/en, or a translation that lags an update of it (§6.3). */}
              {a.contentLang === 'uz' && (locale === 'ru' || locale === 'en') ? (
                <p className="mt-3 text-meta text-ink-3">{t.labels.originalLanguage}</p>
              ) : a.originalUpdatedAt ? (
                <p className="mt-3 text-meta text-ink-3">{m.translationOutdated(formatDate(a.originalUpdatedAt, locale, 'date'))}</p>
              ) : null}
              <ShareBar url={url} title={a.title} labels={shareLabels} className="mt-4" />
            </div>
          </div>
        </header>

        {/* Sponsored band: keep the image off its bottom rule, as on editorial stories. */}
        <div className={`wrap ${a.sponsored ? 'pt-6 md:pt-8' : ''}`}>
          <div className="grid gap-x-8 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              {a.image ? (
                <Figure
                  image={a.image}
                  preload
                  lang={cl}
                  sizes="(min-width: 1280px) 790px, (min-width: 1024px) 66vw, 100vw"
                  className="-mx-4 mb-8 sm:mx-0 [&>figcaption]:px-4 sm:[&>figcaption]:px-0"
                />
              ) : (
                <div className="mb-6" />
              )}

              <ArticleBlocks blocks={a.body} locale={locale} labels={blockLabels} contentLang={cl} sponsored={!!a.sponsored} />

              {/* End matter */}
              <div className="mt-12 max-w-measure space-y-8">
                {a.sponsored ? (
                  <SponsorDisclosure
                    sponsored={a.sponsored}
                    contentLang={cl}
                    labels={{ label: t.labels.sponsored, title: m.sponsorNoteTitle, partner: m.sponsorBadge }}
                  />
                ) : null}
                {a.corrections?.length ? (
                  <CorrectionNote
                    corrections={a.corrections}
                    locale={locale}
                    contentLang={cl}
                    labels={{ title: t.labels.correction, date: m.correctionDate }}
                  />
                ) : null}
                {a.sources.length ? (
                  <SourceList
                    sources={a.sources}
                    locale={locale}
                    contentLang={base}
                    sponsored={!!a.sponsored}
                    labels={{ title: t.labels.sources, intro: m.sourcesIntro }}
                  />
                ) : null}
                <EditorialNote text={t.editorial.short} linkLabel={t.nav.policy} href={href(locale, paths.policy())} />
                <p className="-mt-4 text-meta">
                  <Link href={href(locale, paths.contactTopic('tuzatish'))} prefetch={false} className="text-link">
                    {m.reportError}
                  </Link>
                </p>
                <TagList tags={tags} locale={locale} label={t.labels.tags} />
                {terms.length ? (
                  <section aria-labelledby="terms-in-story" className="lg:hidden">
                    <h2 id="terms-in-story" className="label-caps mb-2 text-ink-3">
                      {m.termsInStory}
                    </h2>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {terms.map((x) => (
                        <li key={x.slug}>
                          <Link href={href(locale, paths.term(x.slug))} prefetch={false} lang={x.contentLang} className="term-link font-serif text-lead">
                            {x.term}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <div className="border-t border-rule pt-6">
                  <ShareBar url={url} title={a.title} labels={shareLabels} />
                </div>
                <aside aria-labelledby="follow-tg" className="border-t-2 border-emerald bg-emerald-wash/60 p-5">
                  <h2 id="follow-tg" className="font-display text-h4 font-semibold">
                    {m.followTitle}
                  </h2>
                  <p className="mt-1.5 mb-4 text-ui text-ink-2">{m.followText}</p>
                  <TelegramButton label={t.actions.readOnTelegram} />
                </aside>
              </div>
            </div>

            {/* Desktop rail */}
            <aside className="no-print hidden lg:col-span-4 lg:block" aria-label={m.inThisStory}>
              <div className="sticky top-20 space-y-8">
                {terms.length ? (
                  <section aria-labelledby="terms-rail" className="border-t-2 border-brass bg-paper-2 p-4">
                    <h2 id="terms-rail" className="label-caps text-brass-ink">
                      {m.termsInStory}
                    </h2>
                    <dl className="mt-3 space-y-3">
                      {terms.slice(0, 4).map((x) => (
                        <div key={x.slug} lang={x.contentLang}>
                          <dt className="font-display text-lead font-semibold">
                            <Link href={href(locale, paths.term(x.slug))} prefetch={false} className="headline-link">
                              {x.term}
                            </Link>
                          </dt>
                          <dd className="mt-0.5 text-meta text-ink-2">{x.short}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}
                <MostRead articles={mostRead} locale={locale} id="rail-most-read" />
                <AdSlot locale={locale} format="mpu" slot="article-rail" />
              </div>
            </aside>
          </div>
        </div>
      </article>

      {related.length ? (
        <section aria-labelledby="related" className="wrap no-print mt-12 md:mt-16">
          <SectionHeader id="related" title={t.labels.related} />
          <ul className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.id}>
                <StoryItem article={r} locale={locale} variant="media-top" kicker="rubric" meta={['time']} imageSizes="(min-width: 1024px) 300px, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

/**
 * A withdrawn story (CMS-SPEC §5.8): the address stays, with the rubric, the
 * title (unless the editor-in-chief hid it), the date and the newsroom's
 * notice. No body, image, sharing or Telegram button; the page is noindex.
 */
function WithdrawnStory({ article: a, locale }: { article: ArticleView; locale: Locale }) {
  const t = pick(commonMessages, locale)
  const m = pick(articleMessages, locale)
  const notice = a.withdrawn!
  return (
    <article data-article-id={a.id} className="pb-4">
      <header>
        <div className="wrap pt-5 pb-10 md:pt-9">
          <div className="max-w-[52rem]">
            <div className="mb-3">
              <Kicker href={href(locale, paths.rubric(a.rubric))}>{t.rubrics[a.rubric].name}</Kicker>
            </div>
            {notice.hideTitle ? (
              <h1 className="font-display text-h1 font-semibold text-ink">{m.withdrawnTitle}</h1>
            ) : (
              <h1 lang={a.contentLang} className="font-display text-h1 font-semibold text-ink">
                {keepNumberWords(a.title)}
              </h1>
            )}
            <p className="mt-3 text-meta text-ink-3">
              <time dateTime={a.publishedAt} className="figures">
                {formatDate(a.publishedAt, locale, 'date')}
              </time>
            </p>
            <section aria-labelledby="olib-tashlandi" className="mt-6 max-w-measure border-l-2 border-signal bg-signal-wash px-4 py-3.5">
              <h2 id="olib-tashlandi" className="label-caps flex items-center gap-1.5 text-signal">
                <Icon name="alert" size={14} />
                {m.withdrawn}
              </h2>
              {notice.notice ? (
                <p lang={a.contentLang} className="mt-2 font-serif text-lead leading-relaxed text-ink">
                  {notice.notice}
                </p>
              ) : null}
              {notice.at ? (
                <p className="mt-2 text-meta text-ink-3">
                  <time dateTime={notice.at}>{formatDate(notice.at, locale, 'date')}</time>
                </p>
              ) : null}
            </section>
            <p className="mt-6 text-ui">
              <Link href={href(locale, paths.rubric(a.rubric))} className="text-link">
                {m.rubricAll(t.rubrics[a.rubric].name)}
              </Link>
            </p>
          </div>
        </div>
      </header>
    </article>
  )
}
