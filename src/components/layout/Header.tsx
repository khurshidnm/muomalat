import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { contentNow, getArticles, rubricSlugs } from '@/content'
import { formatDate } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { TelegramButton } from '@/components/ui/TelegramButton'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { HomeOnly, NavLink } from './NavLink'
import { SearchForm } from './SearchForm'
import { ContentLanguageNotice } from './ContentLanguageNotice'
import { Wordmark } from './Wordmark'

const DEMO = process.env.NEXT_PUBLIC_DEMO_NOTICE !== 'off'

/** Stories whose text exists in the page language (ru/en translations). */
async function translatedPaths(locale: Locale): Promise<string[]> {
  if (locale !== 'ru' && locale !== 'en') return []
  return (await getArticles(locale))
    .filter((a) => a.contentLang === locale)
    .map((a) => a.url)
}

export async function Header({ locale }: { locale: Locale }) {
  const t = pick(commonMessages, locale)
  const home = href(locale, '/')
  const sections = [
    ...rubricSlugs.map((r) => ({ path: paths.rubric(r), label: t.rubrics[r].name })),
    { path: paths.glossary(), label: t.nav.lugat },
    { path: paths.market(), label: t.nav.xaritaShort },
    { path: paths.club(), label: t.nav.klub },
  ]
  const secondary = [
    { path: paths.digest(), label: t.nav.dayjest },
    { path: paths.about(), label: t.nav.about },
    { path: paths.advertise(), label: t.nav.advertise },
    { path: paths.contact(), label: t.nav.contact },
  ]
  const today = contentNow()
  const hideNotice = await translatedPaths(locale)

  // `display: contents` on the banner: its children are laid out as children of
  // <body>, so the sticky row sticks for the whole page (a sticky box only
  // sticks inside its parent's box), while the demo strip, utility bar,
  // masthead, sticky row and section strip all stay inside one banner landmark.
  return (
    <header className="no-print contents">
      <div>
        {DEMO ? (
          <p className="bg-ink px-4 py-1.5 text-center text-[0.75rem] leading-snug text-paper/85">
            <span aria-hidden="true" className="mr-2 inline-block size-1.5 -translate-y-px rotate-45 bg-brass align-middle" />
            {t.demoNotice}
          </p>
        ) : null}

        {/* Utility bar: date, editions, theme */}
        <div className="border-b border-rule">
          <div className="wrap flex h-9 items-center justify-between gap-3">
            <p className="truncate text-meta text-ink-3">
              <span className="hidden sm:inline">{formatDate(today, locale, 'weekdayDate')}</span>
              <span className="sm:hidden">{formatDate(today, locale, 'date')}</span>
            </p>
            <div className="flex items-center gap-1">
              <LanguageSwitcher current={locale} label={t.labels.language} className="-mr-1" />
              <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-rule sm:block" />
              <div className="hidden sm:block">
                <ThemeToggle toDark={t.labels.themeToDark} toLight={t.labels.themeToLight} />
              </div>
            </div>
          </div>
        </div>

        {/* Masthead: front page only, tablet and up */}
        <HomeOnly>
          <div className="hidden border-b border-rule md:block">
            <div className="wrap grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-6">
              <p className="max-w-[24ch] text-meta leading-snug text-ink-3">{t.tagline}</p>
              <Wordmark href={home} size="xl" />
              <div className="flex justify-end">
                <Link
                  href={href(locale, paths.digest())}
                  prefetch={false}
                  className="group text-right text-meta leading-snug text-ink-2 hover:text-emerald"
                >
                  <span className="label-caps block text-brass-ink">{t.nav.dayjest}</span>
                  <span className="underline decoration-rule underline-offset-4 group-hover:decoration-emerald">
                    {t.actions.subscribe}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </HomeOnly>
      </div>

      {/* Sticky bar: wordmark, sections, search, Telegram */}
      <div className="sticky top-0 z-40 border-b border-rule bg-paper">
        <div className="wrap flex h-14 items-center gap-3 lg:gap-6">
          <HomeOnly invert>
            <Wordmark href={home} size="sm" className="mr-auto shrink-0 lg:mr-0" />
          </HomeOnly>
          <HomeOnly>
            <Wordmark href={home} size="sm" className="mr-auto shrink-0 md:hidden" />
            <Wordmark href={home} size="sm" className="sticky-reveal shrink-0" />
          </HomeOnly>

          <nav aria-label={t.nav.primary} className="hidden min-w-0 flex-1 lg:block">
            <ul className="flex items-center gap-x-4 lg:gap-x-5">
              {sections.map((s, i) => (
                <li key={s.path} className={i === 5 ? 'border-l border-rule pl-4 lg:pl-5' : ''}>
                  <NavLink
                    href={href(locale, s.path)}
                    section={s.path}
                    className="relative inline-flex h-14 items-center text-[0.875rem] font-medium whitespace-nowrap text-ink-2 hover:text-ink"
                    activeClassName="!text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-emerald"
                  >
                    {s.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* min-w-0: under pressure (320px, text-spacing overrides) the Telegram
              label truncates instead of pushing the menu button off-screen. */}
          <div className="ml-auto flex min-w-0 items-center gap-1 lg:shrink-0 lg:gap-2">
            <Link
              href={href(locale, paths.search())}
              className="hidden size-10 items-center justify-center rounded-[2px] text-ink-2 hover:bg-paper-2 hover:text-ink lg:inline-flex"
            >
              <Icon name="search" size={20} />
              <span className="sr-only">{t.nav.search}</span>
            </Link>
            <TelegramButton label={t.actions.readOnTelegram} size="sm" compact className="xs:px-3" />
            <div className="shrink-0 lg:hidden">
              <MobileMenu openLabel={t.actions.openMenu} closeLabel={t.actions.close} title={t.actions.menu}>
                <div className="wrap py-5">
                  <SearchForm
                    action={href(locale, paths.search())}
                    label={t.search.label}
                    placeholder={t.search.placeholder}
                    submitLabel={t.search.submit}
                    id="menu-q"
                  />
                  <ul className="mt-6 border-t-2 border-ink">
                    {sections.map((s) => (
                      <li key={s.path} className="border-b border-rule">
                        <Link
                          href={href(locale, s.path)}
                          className="flex items-center justify-between py-3.5 font-display text-[1.375rem] font-semibold"
                        >
                          {s.label}
                          <Icon name="chevron-right" size={18} className="text-ink-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-ui text-ink-2">
                    {secondary.map((s) => (
                      <li key={s.path}>
                        <Link href={href(locale, s.path)} className="hover:text-emerald">
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex items-center justify-between border-t border-rule pt-4">
                    <LanguageSwitcher current={locale} label={t.labels.language} className="-ml-1.5" />
                    <ThemeToggle toDark={t.labels.themeToDark} toLight={t.labels.themeToLight} />
                  </div>
                  <p className="mt-6 text-meta text-ink-3">{t.editorial.short}</p>
                </div>
              </MobileMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Section strip: phones and small tablets */}
      <nav aria-label={t.nav.primary} className="border-b border-rule lg:hidden">
        <ul className="scroll-x wrap flex gap-5">
          {sections.map((s) => (
            <li key={s.path} className="shrink-0">
              <NavLink
                href={href(locale, s.path)}
                section={s.path}
                className="relative inline-flex h-11 items-center text-meta font-medium whitespace-nowrap text-ink-2"
                activeClassName="!text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-emerald"
              >
                {s.label}
              </NavLink>
            </li>
          ))}
          <li className="shrink-0 pr-4">
            <Link
              href={href(locale, paths.search())}
              className="inline-flex h-11 items-center gap-1.5 text-meta font-medium text-ink-2"
            >
              <Icon name="search" size={16} />
              {t.nav.search}
            </Link>
          </li>
        </ul>
      </nav>

      {t.contentLanguageNotice ? (
        <ContentLanguageNotice text={t.contentLanguageNotice} hideOn={hideNotice} />
      ) : null}
    </header>
  )
}
