import type { Metadata } from 'next'
import { locales, localeMeta, localePath, type Locale } from '@/i18n/config'
import { site } from '@/content/data/site'
import { absoluteUrl } from './routes'

interface PageMetaInput {
  locale: Locale
  /** Locale-free path, e.g. "/tahlil". */
  path: string
  title: string
  description: string
  /** Locales that actually have this page's content (defaults to all). */
  languages?: readonly Locale[]
  type?: 'website' | 'article'
  images?: { url: string; width?: number; height?: number; alt?: string }[]
  article?: {
    publishedTime: string
    modifiedTime?: string
    section?: string
    authors?: string[]
    tags?: string[]
  }
  noindex?: boolean
  /** When the page shows content from another edition (ru/en fallback to Uzbek), point canonical there. */
  canonicalLocale?: Locale
}

/** hreflang map for a locale-free path, including x-default → Uzbek Latin. */
export function languageAlternates(path: string, available: readonly Locale[] = locales): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of available) out[localeMeta[l].hreflang] = absoluteUrl(localePath(l, path))
  out['x-default'] = absoluteUrl(localePath('uz', path))
  return out
}

/** Build Next.js metadata with canonical, hreflang and Open Graph (Telegram uses OG). */
export function pageMetadata(input: PageMetaInput): Metadata {
  const { locale, path, title, description, type = 'website' } = input
  const url = absoluteUrl(localePath(locale, path))
  const canonical = absoluteUrl(localePath(input.canonicalLocale ?? locale, path))
  const meta: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(path, input.languages),
      types: { 'application/rss+xml': [{ url: absoluteUrl(localePath(locale, '/rss.xml')), title: `${site.name} RSS` }] },
    },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: site.name,
      locale: localeMeta[locale].ogLocale,
      // Pages without their own card use the edition's default card
      // (app/[lang]/opengraph-image.tsx); file-based cards still take precedence.
      images: input.images ?? [{ url: absoluteUrl(localePath(locale, '/opengraph-image')), width: 1200, height: 630, alt: site.name }],
      ...(type === 'article' && input.article
        ? {
            publishedTime: input.article.publishedTime,
            modifiedTime: input.article.modifiedTime,
            section: input.article.section,
            authors: input.article.authors,
            tags: input.article.tags,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
  if (input.noindex) meta.robots = { index: false, follow: true }
  return meta
}

/** Serialize JSON-LD safely for a <script type="application/ld+json">. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export const publisherLd = {
  '@type': 'NewsMediaOrganization',
  name: site.name,
  url: site.url,
  logo: { '@type': 'ImageObject', url: absoluteUrl('/apple-icon'), width: 180, height: 180 },
  sameAs: [site.telegram.url],
  publishingPrinciples: absoluteUrl('/biz-haqimizda#tahririyat-siyosati'),
  correctionsPolicy: absoluteUrl('/biz-haqimizda#tuzatishlar'),
  ethicsPolicy: absoluteUrl('/biz-haqimizda#tahririyat-siyosati'),
}
