export const locales = ['uz', 'kr', 'ru', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'uz'

/** BCP 47 tag for the language a piece of text is written in. */
export type ContentLang = 'uz' | 'uz-Cyrl' | 'ru' | 'en'

export const localeMeta: Record<
  Locale,
  { label: string; name: string; htmlLang: ContentLang; hreflang: string; ogLocale: string }
> = {
  uz: { label: 'Oʻz', name: 'Oʻzbekcha', htmlLang: 'uz', hreflang: 'uz', ogLocale: 'uz_UZ' },
  kr: { label: 'Ўзб', name: 'Ўзбекча', htmlLang: 'uz-Cyrl', hreflang: 'uz-Cyrl', ogLocale: 'uz_UZ' },
  ru: { label: 'Рус', name: 'Русский', htmlLang: 'ru', hreflang: 'ru', ogLocale: 'ru_RU' },
  en: { label: 'Eng', name: 'English', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US' },
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

/**
 * Public URL path for a locale. Uzbek Latin lives at the root (/tahlil),
 * the others under a prefix (/kr/tahlil, /ru/tahlil, /en/tahlil).
 */
export function localePath(locale: Locale, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (locale === defaultLocale) return p
  return p === '/' ? `/${locale}` : `/${locale}${p}`
}

/**
 * Split a pathname into its locale and the locale-free path. A leading `uz`
 * segment counts as a prefix too: src/proxy.ts rewrites unprefixed URLs to the
 * internal /uz segment, and usePathname() returns that internal path while
 * prerendering. Public URLs never start with /uz (the proxy 308s them), so
 * server and client both get the same locale-free path.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/')
  if (first && isLocale(first)) {
    return { locale: first, path: `/${rest.join('/')}`.replace(/\/$/, '') || '/' }
  }
  return { locale: defaultLocale, path: pathname || '/' }
}
