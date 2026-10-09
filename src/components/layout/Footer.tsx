import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { rubricSlugs } from '@/content'
import { site, type LegalField } from '@/content/data/site'
import { toCyrillic } from '@/i18n/translit'
import { href, paths } from '@/lib/routes'
import { Girih } from '@/components/ui/Girih'
import { Icon } from '@/components/ui/Icon'
import { Placeholder } from '@/components/ui/Placeholder'
import { TelegramButton } from '@/components/ui/TelegramButton'
import { Wordmark } from './Wordmark'

/**
 * One imprint value. Values are written in Uzbek Latin: transliterated for the
 * Cyrillic edition, marked lang="uz" in ru/en when `prose` (names, addresses).
 * `mask` replaces a date placeholder with the edition's own mask (ДД.ММ.ГГГГ).
 * Also used by the imprint on /biz-haqimizda, so both render the same values.
 */
export function Legal({ field, locale, prose = false, mask }: { field: LegalField; locale: Locale; prose?: boolean; mask?: string }) {
  const value = mask && field.placeholder ? mask : locale === 'kr' ? toCyrillic(field.value) : field.value
  const lang = prose && (locale === 'ru' || locale === 'en') ? 'uz' : undefined
  return field.placeholder ? <Placeholder lang={lang}>{value}</Placeholder> : <span lang={lang}>{value}</span>
}

export function Footer({ locale }: { locale: Locale }) {
  const t = pick(commonMessages, locale)
  const L = site.legal
  const col = 'label-caps mb-3 text-ink-3'
  const link = 'text-ui text-ink-2 hover:text-emerald'
  const legal = (field: LegalField, prose = false, mask?: string) => <Legal field={field} locale={locale} prose={prose} mask={mask} />

  return (
    <footer className="no-print mt-16 border-t-2 border-ink bg-paper md:mt-24">
      <div aria-hidden="true" className="border-b border-rule py-[5px]">
        <Girih size={16} className="h-4" />
      </div>
      <div className="wrap grid gap-10 py-10 md:grid-cols-12 md:gap-6 md:py-14">
        <div className="md:col-span-12 lg:col-span-4">
          <Wordmark href={href(locale, '/')} size="md" />
          <p className="mt-3 max-w-[36ch] text-ui text-ink-2">{t.description}</p>
          <div className="mt-5">
            <p className="label-caps mb-2 text-ink-3">{t.footer.follow}</p>
            <p className="mb-3 max-w-[36ch] text-meta text-ink-3">{t.footer.followText}</p>
            <TelegramButton label={t.actions.readOnTelegram} />
          </div>
        </div>

        <nav aria-label={t.footer.rubrics} className="md:col-span-4 lg:col-span-2 lg:col-start-6">
          <p className={col}>{t.footer.rubrics}</p>
          <ul className="space-y-2">
            {rubricSlugs.map((r) => (
              <li key={r}>
                <Link href={href(locale, paths.rubric(r))} prefetch={false} className={link}>
                  {t.rubrics[r].name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t.footer.projects} className="md:col-span-4 lg:col-span-2">
          <p className={col}>{t.footer.projects}</p>
          <ul className="space-y-2">
            <li><Link href={href(locale, paths.glossary())} prefetch={false} className={link}>{t.nav.lugat}</Link></li>
            <li><Link href={href(locale, paths.market())} prefetch={false} className={link}>{t.nav.xarita}</Link></li>
            <li><Link href={href(locale, paths.club())} prefetch={false} className={link}>{t.nav.klub}</Link></li>
            <li><Link href={href(locale, paths.digest())} prefetch={false} className={link}>{t.nav.dayjest}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t.footer.publication} className="md:col-span-4 lg:col-span-3">
          <p className={col}>{t.footer.publication}</p>
          <ul className="space-y-2">
            <li><Link href={href(locale, paths.about())} prefetch={false} className={link}>{t.nav.about}</Link></li>
            <li><Link href={href(locale, paths.policy())} prefetch={false} className={link}>{t.nav.policy}</Link></li>
            <li><Link href={href(locale, paths.advertise())} prefetch={false} className={link}>{t.nav.advertise}</Link></li>
            <li><Link href={href(locale, paths.contact())} prefetch={false} className={link}>{t.nav.contact}</Link></li>
            <li>
              <a href={href(locale, paths.rss())} className={`${link} inline-flex items-center gap-1.5`}>
                <Icon name="rss" size={15} />
                {t.nav.rss}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="wrap">
        <div className="grid gap-8 border-t border-rule py-8 md:grid-cols-12 md:gap-6">
          {/* Not a landmark: the footer is one already, and pages such as
              /biz-haqimizda carry their own "Nashr maqomi" region. */}
          <div className="md:col-span-4">
            <p className="label-caps mb-2 text-emerald">{t.editorial.label}</p>
            <p className="max-w-[44ch] text-meta leading-relaxed text-ink-2">{t.editorial.long}</p>
          </div>

          <section aria-labelledby="legal-title" className="md:col-span-8">
            <h2 id="legal-title" className="label-caps mb-3 text-ink-3">
              {t.footer.legalTitle}
            </h2>
            <dl className="grid gap-x-6 gap-y-2.5 text-meta sm:grid-cols-2">
              {[
                [t.footer.registration, <>{legal(L.registrationNumber)} · {t.footer.registrationDate}: {legal(L.registrationDate, false, t.footer.dateMask)}</>],
                [t.footer.registrar, legal(L.registrar, true)],
                [t.footer.founder, legal(L.founder, true)],
                [t.footer.editorInChief, legal(L.editorInChief, true)],
                [t.footer.address, legal(L.address, true)],
                [t.footer.email, legal(L.email)],
                [t.footer.phone, legal(L.phone)],
                [t.footer.ageMark, legal(L.ageMark)],
              ].map(([dt, dd], i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-ink-3">{dt}</dt>
                  <dd className="text-ink">{dd}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.75rem] text-ink-3">{t.footer.placeholderNote}</p>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-rule py-5 text-[0.75rem] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright(site.foundedYear)}</p>
          <p className="max-w-[60ch]">{t.footer.reprint}</p>
          <p className="font-semibold text-ink-2" aria-label={`${t.footer.ageMark}: ${site.legal.ageMark.value}`}>
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-ink-3 text-[0.75rem]">
              {site.legal.ageMark.value}
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}
