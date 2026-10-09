import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, locales, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import { getArticlesByAuthor, getAuthor, getAuthors, getLatest, getMostRead, isCommercialAuthor, isSlug, resolveMissing } from '@/content'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata } from '@/lib/seo'
import { Avatar } from '@/components/ui/Avatar'
import { SponsoredLabel } from '@/components/ui/Labels'
import { ListingHeader, type Crumb } from '@/components/listing/ListingHeader'
import { ListingBody } from '@/components/listing/ListingBody'
import { EmptyState } from '@/components/listing/EmptyState'
import { AuthorIntro, isOrganisationByline } from '@/components/listing/AuthorIntro'
import { mostReadWithin } from '@/components/listing/data'
import { listingLd } from '@/components/listing/ld'

type Params = { params: Promise<{ lang: string; slug: string }> }

/** Seconds; a new story by the author reaches the page sooner through tags (CMS-SPEC §8.2). */
export const revalidate = 3600

export async function generateStaticParams() {
  return (await Promise.all(locales.map(async (lang) => (await getAuthors(lang)).map((a) => ({ lang, slug: a.slug }))))).flat()
}

async function load(lang: string, slug: string) {
  if (!isLocale(lang) || !isSlug(slug)) return undefined
  const author = await getAuthor(lang, slug)
  return author ? { locale: lang as Locale, author } : undefined
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params
  const p = await load(lang, slug)
  if (!p) return {}
  const m = pick(listingMessages, p.locale)
  return pageMetadata({
    locale: p.locale,
    path: paths.author(slug),
    title: p.author.name,
    description: m.author.metaDescription(p.author.name, p.author.role),
    noindex: (await getArticlesByAuthor(p.locale, slug)).length === 0,
  })
}

export default async function AuthorPage({ params }: Params) {
  const { lang, slug } = await params
  const p = await load(lang, slug)
  if (!p) {
    if (isLocale(lang) && isSlug(slug)) await resolveMissing(localePath(lang, paths.author(slug)))
    notFound()
  }
  const { locale, author: a } = p
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  const items = await getArticlesByAuthor(locale, slug)
  const ownMostRead = mostReadWithin(items, 5)
  const scoped = ownMostRead.length >= 3
  const siteMostRead = scoped ? ownMostRead : await getMostRead(locale, 5)
  const latest = await getLatest(locale, 5)
  const org = a.isTeam ?? isOrganisationByline(slug)
  // Partner-content byline: brass commercial label and avatar, never the editorial kicker.
  const commercial = isCommercialAuthor(a)
  const pageUrl = absoluteUrl(localePath(locale, paths.author(slug)))

  const crumbs: Crumb[] = [{ name: t.nav.home, href: href(locale, paths.home()) }, { name: a.name }]
  const ld = listingLd({
    locale,
    path: paths.author(slug),
    name: a.name,
    description: m.author.metaDescription(a.name, a.role),
    articles: items,
    total: items.length,
    crumbs,
    about: org
      ? {
          '@type': 'Organization',
          '@id': `${pageUrl}#author`,
          name: a.name,
          description: a.bio,
          url: pageUrl,
          parentOrganization: { '@id': `${site.url}/#organization` },
        }
      : {
          '@type': 'Person',
          '@id': `${pageUrl}#author`,
          name: a.name,
          jobTitle: a.role,
          description: a.bio,
          url: pageUrl,
          ...(a.email ? { email: `mailto:${a.email}` } : {}),
          worksFor: { '@id': `${site.url}/#organization` },
        },
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <ListingHeader
        locale={locale}
        crumbs={crumbs}
        kicker={commercial ? <SponsoredLabel>{t.labels.sponsored}</SponsoredLabel> : m.author.kicker}
        title={a.name}
        titleLang={a.contentLang}
        description={a.role}
        descriptionLang={a.contentLang}
        count={items.length}
        aside={
          <>
            <span className="block sm:hidden">
              <Avatar name={a.name} size={56} commercial={commercial} />
            </span>
            <span className="hidden sm:block">
              <Avatar name={a.name} size={88} commercial={commercial} />
            </span>
          </>
        }
      >
        <AuthorIntro author={a} locale={locale} />
      </ListingHeader>
      <ListingBody
        locale={locale}
        articles={items}
        kicker="rubric"
        mostRead={siteMostRead}
        mostReadScope={scoped ? m.mostReadScope.author : m.mostReadScope.site}
        idPrefix={`author-${slug}`}
        empty={<EmptyState locale={locale} title={m.empty.title} text={m.empty.author} latest={latest} id={`author-${slug}-empty`} />}
      />
    </>
  )
}
