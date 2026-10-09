import { localePath, type Locale } from '@/i18n/config'
import { site } from '@/content/data/site'

/** Locale-free paths for every page type. Combine with `href(locale, path)`. */
export const paths = {
  home: () => '/',
  rubric: (rubric: string) => `/${rubric}`,
  article: (a: { rubric: string; slug: string }) => `/${a.rubric}/${a.slug}`,
  glossary: () => '/lugat',
  term: (slug: string) => `/lugat/${slug}`,
  market: () => '/xarita',
  club: () => '/klub',
  clubEvent: (slug: string) => `/klub/${slug}`,
  clubJoin: () => '/klub#ariza',
  clubNext: () => '/klub#navbatdagi-uchrashuv',
  digest: () => '/dayjest',
  about: () => '/biz-haqimizda',
  policy: () => '/biz-haqimizda#tahririyat-siyosati',
  advertise: () => '/reklama',
  contact: () => '/aloqa',
  /** Contact form with a topic preselected, e.g. 'tuzatish' for error reports. */
  contactTopic: (topic: string) => `/aloqa?mavzu=${encodeURIComponent(topic)}#xabar`,
  corrections: () => '/biz-haqimizda#tuzatishlar',
  search: (q?: string) => (q ? `/qidiruv?q=${encodeURIComponent(q)}` : '/qidiruv'),
  tag: (slug: string) => `/mavzu/${slug}`,
  author: (slug: string) => `/muallif/${slug}`,
  rss: () => '/rss.xml',
}

/** Localised href for a locale-free path. */
export function href(locale: Locale, path: string): string {
  return localePath(locale, path)
}

/** Absolute URL on the canonical domain. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString()
}

/** Telegram share link for a URL and title. */
export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
}
