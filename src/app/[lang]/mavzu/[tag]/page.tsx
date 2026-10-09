import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, locales, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import { getArticles, getArticlesByTag, getLatest, getMostRead, getTag, getTags, isSlug, resolveMissing } from '@/content'
import { href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { TagList } from '@/components/article/EndMatter'
import { ListingHeader, type Crumb } from '@/components/listing/ListingHeader'
import { ListingBody } from '@/components/listing/ListingBody'
import { EmptyState } from '@/components/listing/EmptyState'
import { mostReadWithin, relatedTags } from '@/components/listing/data'
import { listingLd } from '@/components/listing/ld'

type Params = { params: Promise<{ lang: string; tag: string }> }

/** Seconds; a new story on the topic reaches the page sooner through tags (CMS-SPEC §8.2). */
export const revalidate = 3600

export async function generateStaticParams() {
  return (await Promise.all(locales.map(async (lang) => (await getTags(lang)).map((t) => ({ lang, tag: t.slug }))))).flat()
}

async function load(lang: string, slug: string) {
  if (!isLocale(lang) || !isSlug(slug)) return undefined
  const tag = await getTag(lang, slug)
  return tag ? { locale: lang as Locale, tag } : undefined
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, tag: slug } = await params
  const p = await load(lang, slug)
  if (!p) return {}
  const m = pick(listingMessages, p.locale)
  const count = (await getArticlesByTag(p.locale, slug)).length
  return pageMetadata({
    locale: p.locale,
    path: paths.tag(slug),
    title: m.tag.metaTitle(p.tag.label),
    description: m.tag.description(p.tag.label),
    // An empty topic page has nothing for search engines yet.
    noindex: count === 0,
  })
}

export default async function TagPage({ params }: Params) {
  const { lang, tag: slug } = await params
  const p = await load(lang, slug)
  if (!p) {
    if (isLocale(lang) && isSlug(slug)) await resolveMissing(localePath(lang, paths.tag(slug)))
    notFound()
  }
  const { locale, tag } = p
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  const items = await getArticlesByTag(locale, slug)
  const related = await relatedTags(locale, slug, items)
  const ownMostRead = mostReadWithin(items, 5)
  const scoped = ownMostRead.length >= 3
  const description = m.tag.description(tag.label)

  const crumbs: Crumb[] = [{ name: t.nav.home, href: href(locale, paths.home()) }, { name: tag.label }]
  const ld = listingLd({
    locale,
    path: paths.tag(slug),
    name: m.tag.metaTitle(tag.label),
    description,
    articles: items,
    total: items.length,
    crumbs,
    about: { '@type': 'Thing', name: tag.label },
  })

  // Topics that do have stories, for the empty state.
  const all = await getArticles(locale)
  const otherTopics = (await getTags(locale)).filter((x) => x.slug !== slug && all.some((a) => a.tags.includes(x.slug)))
  const siteMostRead = scoped ? ownMostRead : await getMostRead(locale, 5)
  const latest = await getLatest(locale, 5)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <ListingHeader
        locale={locale}
        crumbs={crumbs}
        kicker={m.tag.kicker}
        title={tag.label}
        titleLang={tag.contentLang}
        description={description}
        count={items.length}
      >
        {related.length ? (
          <div className="mt-4">
            <TagList tags={related} locale={locale} label={m.tag.related} />
          </div>
        ) : null}
      </ListingHeader>
      <ListingBody
        locale={locale}
        articles={items}
        kicker="rubric"
        mostRead={siteMostRead}
        mostReadScope={scoped ? m.mostReadScope.tag(tag.label) : m.mostReadScope.site}
        idPrefix={`tag-${slug}`}
        empty={
          <EmptyState locale={locale} title={m.empty.title} text={m.empty.tag} latest={latest} id={`tag-${slug}-empty`}>
            {otherTopics.length ? (
              <div className="mt-5">
                <TagList tags={otherTopics} locale={locale} label={m.empty.otherTopics} />
              </div>
            ) : null}
          </EmptyState>
        }
      />
    </>
  )
}
