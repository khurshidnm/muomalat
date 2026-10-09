import type { Metadata } from 'next'
import Link from 'next/link'
import { lang } from 'next/root-params'
import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { searchMessages } from '@/i18n/messages/search'
import { href, paths } from '@/lib/routes'
import { SearchForm } from '@/components/layout/SearchForm'
import { Girih } from '@/components/ui/Girih'
import { Icon } from '@/components/ui/Icon'

/**
 * Localized 404, rendered inside the [lang] root layout (header and footer)
 * whenever a page calls notFound() or a path matches no route (see
 * [...rest]/page.tsx). not-found has no params, so the edition comes from the
 * root param via next/root-params, which renders the right language on the
 * server. Next.js adds <meta name="robots" content="noindex"> itself.
 *
 * Because the root layout lives under [lang], Next serves a 404 as a bare
 * HTML shell and builds the page on the client from the RSC payload; the
 * client tree carries the layout's default title, so the localized <title>
 * is also rendered here (React hoists it ahead of the default one).
 *
 * Keep this page lean. Next serializes the [lang] not-found boundary into the
 * RSC payload of every page on the site, so anything added here ships with
 * every article and listing. Story grids, term lists and other data-driven
 * blocks belong on /qidiruv, which this page points to.
 */
async function currentLocale(): Promise<Locale> {
  try {
    const value = await lang()
    return isLocale(value) ? value : defaultLocale
  } catch {
    return defaultLocale
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale()
  const n = pick(searchMessages, locale).notFound
  return { title: n.title, description: n.text, robots: { index: false, follow: true } }
}

export default async function NotFound() {
  const locale = await currentLocale()
  const t = pick(commonMessages, locale)
  const n = pick(searchMessages, locale).notFound

  return (
    <>
      <title>{`${n.title} — ${t.siteName}`}</title>
      <div className="border-b border-rule">
        <div className="wrap grid lg:grid-cols-12 lg:gap-x-8">
          {/* The girih field: a band on phones, the right-hand column from lg. Decorative. */}
          <div
            aria-hidden="true"
            className="relative -mx-4 h-36 overflow-hidden border-b border-rule md:-mx-6 md:h-48 lg:order-2 lg:col-span-5 lg:mr-[-1.5rem] lg:ml-0 xl:mr-[-2rem] lg:h-auto lg:min-h-[27rem] lg:border-b-0 lg:border-l"
          >
            <div className="absolute inset-0 opacity-55">
              <Girih size={64} className="h-full w-full md:hidden" />
              <Girih size={88} className="hidden h-full w-full md:block" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="figures bg-paper px-4 font-display text-[4.75rem] leading-[1.1] font-semibold tracking-[-0.02em] text-brass md:px-6 md:text-[7rem] lg:text-[9rem]"
                style={{ fontVariationSettings: '"opsz" 60' }}
              >
                404
              </span>
            </div>
          </div>

          <div className="min-w-0 pt-7 pb-9 md:pt-10 md:pb-12 lg:order-1 lg:col-span-7 lg:py-16 lg:pr-4">
            <p className="label-caps text-brass-ink">{n.code}</p>
            <h1 className="mt-2.5 font-display text-display font-semibold text-ink">{n.title}</h1>
            <p className="mt-4 max-w-[36rem] font-serif text-standfirst text-ink-2">{n.text}</p>
            <div className="mt-7 max-w-[36rem]">
              <p className="mb-2.5 text-ui text-ink-2">{n.searchHint}</p>
              <SearchForm
                action={href(locale, paths.search())}
                label={t.search.label}
                placeholder={t.search.placeholder}
                submitLabel={t.search.submit}
                size="lg"
                id="not-found-q"
              />
            </div>
            <p className="mt-6">
              <Link
                href={href(locale, paths.home())}
                className="group inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink"
              >
                {t.actions.backHome}
                <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-ui text-ink-2">
              <span>{n.start}:</span>
              {/* The two links wrap as one group, so the separator never dangles. */}
              <span className="inline-flex items-center gap-x-2">
                <Link href={href(locale, paths.rubric('yangiliklar'))} className="text-link inline-flex min-h-11 items-center font-medium">
                  {t.rubrics.yangiliklar.name}
                </Link>
                <span aria-hidden="true" className="text-rule-strong">·</span>
                <Link href={href(locale, paths.glossary())} className="text-link inline-flex min-h-11 items-center font-medium">
                  {t.nav.lugat}
                </Link>
              </span>
            </p>
            <p className="mt-2 max-w-[36rem] text-meta text-ink-3">
              {n.report}{' '}
              <Link href={href(locale, paths.contact())} className="text-link font-medium">
                {n.reportLink}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
