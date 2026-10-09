'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { locales, localeMeta, localePath, splitLocale, type Locale } from '@/i18n/config'

/** Oʻz · Ўзб · Рус · Eng — links to the same page in each edition. */
export function LanguageSwitcher({ current, label, className = '' }: { current: Locale; label: string; className?: string }) {
  const pathname = usePathname() ?? '/'
  const { path } = splitLocale(pathname)
  // On Latin-script pages, set the two Cyrillic labels (Ўзб, Рус) in the system
  // stack: drawing them in Plex would download its 26 KB Cyrillic subset on
  // every uz/en page just for six letters. Cyrillic pages load it anyway.
  const latinPage = localeMeta[current].htmlLang === 'uz' || localeMeta[current].htmlLang === 'en'
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center">
        {locales.map((l) => {
          const active = l === current
          const cyrillic = l === 'kr' || l === 'ru'
          return (
            <li key={l}>
              <Link
                href={localePath(l, path)}
                // Editions are switched rarely; skip prefetching (saves mobile data, and
                // avoids prefetching 404 targets from the not-found page).
                prefetch={false}
                hrefLang={localeMeta[l].hreflang}
                lang={localeMeta[l].htmlLang}
                aria-current={active ? 'true' : undefined}
                title={localeMeta[l].name}
                style={latinPage && cyrillic ? { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' } : undefined}
                className={`inline-flex h-8 min-w-9 items-center justify-center px-1.5 text-meta font-medium transition-colors ${
                  active ? 'text-ink underline decoration-brass decoration-2 underline-offset-[6px]' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {localeMeta[l].label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
