import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, locales, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import { getArticles, getArticlesByTag, getLatest, getMostRead, getTag, getTags } from '@/content'
import { href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { TagList } from '@/components/article/EndMatter'
import { ListingHeader, type Crumb } from '@/components/listing/ListingHeader'
import { ListingBody } from '@/components/listing/ListingBody'
import { EmptyState } from '@/components/listing/EmptyState'
import { mostReadWithin, relatedTags } from '@/components/listing/data'
import { listingLd } from '@/components/listing/ld'

type Params = { params: Promise<{ lang: string; tag: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => getTags(lang).map((t) => ({ lang, tag: t.slug })))
}

function load(lang: string, slug: string) {
  if (!isLocale(lang)) return undefined
  const tag = getTag(lang, slug)
  return tag ? { locale: lang as Locale, tag } : undefined
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, tag: slug } = await params
  const p = load(lang, slug)
  if (!p) return {}
  const m = pick(listingMessages, p.locale)
  const count = getArticlesByTag(p.locale, slug).length
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
  const p = load(lang, slug)
  if (!p) notFound()
  const { locale, tag } = p
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  const items = getArticlesByTag(locale, slug)
  const related = relatedTags(locale, slug, items)
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
  const all = getArticles(locale)
  const otherTopics = getTags(locale).filter((x) => x.slug !== slug && all.some((a) => a.tags.includes(x.slug)))

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
        mostRead={scoped ? ownMostRead : getMostRead(locale, 5)}
        mostReadScope={scoped ? m.mostReadScope.tag(tag.label) : m.mostReadScope.site}
        idPrefix={`tag-${slug}`}
        empty={
          <EmptyState locale={locale} title={m.empty.title} text={m.empty.tag} latest={getLatest(locale, 5)} id={`tag-${slug}-empty`}>
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
