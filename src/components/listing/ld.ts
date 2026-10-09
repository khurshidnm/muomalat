import { localeMeta, localePath, type Locale } from '@/i18n/config'
import type { ArticleView } from '@/content'
import { site } from '@/content/data/site'
import { absoluteUrl } from '@/lib/routes'
import { publisherLd } from '@/lib/seo'
import type { Crumb } from './ListingHeader'

/**
 * CollectionPage + ItemList + BreadcrumbList for a listing page.
 * `crumbs` hrefs are already localised; the last crumb is the page itself.
 */
export function listingLd({
  locale,
  path,
  name,
  description,
  articles,
  offset = 0,
  total,
  crumbs,
  about,
}: {
  locale: Locale
  /** Locale-free path of this page. */
  path: string
  name: string
  description: string
  /** Stories shown on this page. */
  articles: ArticleView[]
  /** Position of the first story in the whole listing (pagination). */
  offset?: number
  total: number
  crumbs: Crumb[]
  about?: Record<string, unknown>
}) {
  const url = absoluteUrl(localePath(locale, path))
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        url,
        name,
        description,
        inLanguage: localeMeta[locale].htmlLang,
        isPartOf: { '@type': 'WebSite', '@id': `${site.url}/#website`, name: site.name, url: site.url },
        publisher: { ...publisherLd, '@id': `${site.url}/#organization` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        ...(about ? { about } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: total,
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          itemListElement: articles.map((a, i) => ({
            '@type': 'ListItem',
            position: offset + i + 1,
            url: absoluteUrl(localePath(locale, a.url)),
            name: a.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.href ? absoluteUrl(c.href) : url,
        })),
      },
    ],
  }
}
