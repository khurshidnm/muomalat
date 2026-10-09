import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { homeMessages } from '@/i18n/messages/home'
import { getInstitutions, contentNow, type LicenceStatus } from '@/content'
import { formatDate } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { keepNumberWords } from '@/components/ui/InlineText'

const ORDER: LicenceStatus[] = ['granted', 'review', 'applied', 'announced']

/**
 * Four tabular figures summarising the market map. The three-part row starts
 * at lg: below that the stats get the full width, so labels never break
 * mid-word, and each stat pins its numeral to the bottom so all four share a
 * baseline whatever the label length.
 */
export async function MarketSnapshot({ locale }: { locale: Locale }) {
  const t = pick(homeMessages, locale).market
  const list = await getInstitutions(locale)
  const counts = Object.fromEntries(ORDER.map((s) => [s, list.filter((i) => i.status === s).length])) as Record<LicenceStatus, number>
  return (
    <section aria-labelledby="market-snapshot" className="wrap">
      <div className="grid gap-5 border-y border-rule py-6 lg:grid-cols-12 lg:items-center lg:gap-6">
        <div className="lg:col-span-4">
          <h2 id="market-snapshot" className="font-display text-h3 font-semibold">
            <Link href={href(locale, paths.market())} prefetch={false} className="headline-link">
              {t.title}
            </Link>
          </h2>
          <p className="mt-1 text-meta text-ink-3">
            {t.intro} {keepNumberWords(t.asOf(formatDate(contentNow(), locale, 'dayMonth')))}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:col-span-6">
          {ORDER.map((s, i) => (
            <div key={s} className={`flex flex-col justify-between border-l pl-3 ${i === 0 ? 'border-emerald' : 'border-rule'}`}>
              <dt className="text-meta leading-tight text-ink-3">{t[s]}</dt>
              <dd className={`figures mt-1 text-numeral font-semibold ${i === 0 ? 'text-emerald' : 'text-ink'}`}>{counts[s]}</dd>
            </div>
          ))}
        </dl>
        <div className="lg:col-span-2 lg:text-right">
          <Link
            href={href(locale, paths.market())}
            prefetch={false}
            className="group inline-flex items-center gap-1.5 text-ui font-semibold whitespace-nowrap text-emerald hover:text-emerald-ink"
          >
            {t.cta}
            <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
