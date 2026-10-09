import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { formMessages } from '@/i18n/messages/forms'
import { advertiseMessages } from '@/i18n/messages/advertise'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Kicker } from '@/components/ui/Kicker'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Placeholder } from '@/components/ui/Placeholder'
import { ButtonLink } from '@/components/ui/Button'
import { EditorialNote } from '@/components/article/EndMatter'
import { AdvertiseForm } from '@/components/pages/advertise/AdvertiseForm'
import { FormatSpecimen } from '@/components/pages/advertise/Specimens'
import { SegmentBars } from '@/components/pages/advertise/SegmentBars'
import { AD_FORM_ID, MEDIA_KIT_ID } from '@/components/pages/advertise/options'
import { FORMAT_KEYS, audience, percent, priceDigits, zeroPattern } from '@/components/pages/advertise/data'
import { contacts, mailto } from '@/components/pages/contact/data'
import { MailLink, Value } from '@/components/pages/contact/parts'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const m = pick(advertiseMessages, lang)
  return pageMetadata({ locale: lang, path: paths.advertise(), title: m.metaTitle, description: m.metaDescription })
}

const CHANNEL_ICONS: Record<'site' | 'telegram' | 'digest' | 'club', IconName> = {
  site: 'globe',
  telegram: 'telegram',
  digest: 'mail',
  club: 'users',
}

/** Hairlines for the 2 × 2 (phone) / 1 × 4 (desktop) stat row. */
const STAT_CELL = [
  'pr-4 lg:pr-6',
  'border-l border-rule pl-4 lg:px-6',
  'border-t border-rule pt-5 pr-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 lg:pr-6',
  'border-t border-l border-rule pt-5 pl-4 lg:border-t-0 lg:pt-0 lg:pl-6',
]

export default async function AdvertisePage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const f = pick(formMessages, locale)
  const m = pick(advertiseMessages, locale)
  const ph = t.labels.placeholder
  /** The Telegram channel is Uzbek: mark its hashtag on ru/en pages. */
  const uzOnly = locale === 'ru' || locale === 'en' ? 'uz' : undefined
  const url = absoluteUrl(localePath(locale, paths.advertise()))

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: m.title,
        description: m.metaDescription,
        inLanguage: localeMeta[locale].htmlLang,
        isPartOf: { '@id': `${site.url}/#website` },
        about: { '@id': `${site.url}/#organization` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: m.title, item: url },
        ],
      },
      { ...publisherLd, '@id': `${site.url}/#organization` },
    ],
  }

  const specimenText = {
    ...m.formats.specimens,
    advert: t.labels.advert,
    sponsored: t.labels.sponsored,
    placeholder: ph,
  }

  const price = (key: (typeof FORMAT_KEYS)[number]) => {
    const amount = <Placeholder title={ph}>{zeroPattern(priceDigits[key], locale)}</Placeholder>
    return (
      <span className="figures">
        {locale === 'en' ? <>{m.formats.currency} {amount}</> : <>{amount} {m.formats.currency}</>}
        <span className="text-ink-3"> / {m.formats.priceUnits[key]}</span>
      </span>
    )
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      {/* Header: pitch + where advertisers appear */}
      <div className="wrap pt-5 md:pt-9">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-8">
          <header className="lg:col-span-8">
            <Kicker>{m.kicker}</Kicker>
            <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{m.title}</h1>
            <p className="mt-3 max-w-[40rem] font-serif text-standfirst text-ink-2 md:mt-4">{m.lead}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={`#${AD_FORM_ID}`} size="lg">
                {m.ctaForm}
                <Icon name="arrow-right" size={18} />
              </ButtonLink>
              <ButtonLink href={`#${MEDIA_KIT_ID}`} variant="secondary" size="lg">
                {m.ctaKit}
              </ButtonLink>
            </div>
          </header>
          <aside aria-labelledby="reklama-channels" className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-8">
            <h2 id="reklama-channels" className="label-caps text-ink-3">
              {m.channels.title}
            </h2>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 lg:grid-cols-1">
              {(['site', 'telegram', 'digest', 'club'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5 border-t border-rule py-3">
                  <Icon name={CHANNEL_ICONS[key]} size={18} className="mt-0.5 shrink-0 text-emerald" />
                  <span className="min-w-0">
                    <span className="block text-ui font-semibold text-ink">{m.channels[key].name}</span>
                    <span className="block text-meta text-ink-3">{m.channels[key].text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      {/* Audience */}
      <section aria-labelledby="reklama-audience" className="wrap mt-12 md:mt-16">
        <SectionHeader id="reklama-audience" title={m.audience.title} description={m.audience.intro} />
        <dl className="mt-6 grid grid-cols-2 lg:grid-cols-4">
          {audience.stats.map((s, i) => {
            const value = zeroPattern(s.digits, locale)
            return (
              <div key={s.key} className={`flex min-w-0 flex-col ${STAT_CELL[i]}`}>
                <dt className="text-meta font-semibold text-ink">{m.audience.stats[s.key].label}</dt>
                <dd className="order-first mb-2 font-sans text-[1.75rem] leading-none font-semibold text-ink figures sm:text-[2.25rem]">
                  <Placeholder title={ph}>{s.percent ? percent(value, locale) : value}</Placeholder>
                </dd>
                <dd className="mt-0.5 text-meta text-ink-3">{m.audience.stats[s.key].hint}</dd>
              </div>
            )
          })}
        </dl>
        <p className="mt-5 flex items-start gap-1.5 border-t border-rule pt-3 text-meta text-ink-3">
          <Icon name="info" size={16} className="mt-px shrink-0" />
          <span>
            {m.audience.asOf}: <Placeholder title={ph}>{audience.asOf ?? t.footer.dateMask}</Placeholder>. {m.audience.note}
          </span>
        </p>

        <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-x-8 lg:mt-10">
          <SegmentBars
            id="reklama-sectors"
            title={m.audience.sectors.title}
            subtitle={m.audience.sectors.subtitle}
            placeholderTitle={ph}
            items={audience.sectors.map((d) => ({
              label: m.audience.sectors.items[d.key],
              value: d.value,
              display: percent(d.value, locale),
            }))}
          />
          <SegmentBars
            id="reklama-roles"
            title={m.audience.roles.title}
            subtitle={m.audience.roles.subtitle}
            placeholderTitle={ph}
            items={audience.roles.map((d) => ({
              label: m.audience.roles.items[d.key],
              value: d.value,
              display: percent(d.value, locale),
            }))}
          />
        </div>
        <p className="mt-4 text-meta text-ink-3">{m.audience.barsNote}</p>
      </section>

      {/* Formats */}
      <section aria-labelledby="reklama-formats" className="wrap mt-12 md:mt-16">
        <SectionHeader id="reklama-formats" title={m.formats.title} description={m.formats.intro} />
        <ol className="mt-2">
          {FORMAT_KEYS.map((key, i) => {
            const item = m.formats.items[key]
            return (
              <li key={key} className={`py-7 md:py-9 ${i > 0 ? 'border-t border-rule' : ''}`}>
                <article aria-labelledby={`format-${key}`} className="grid gap-6 lg:grid-cols-12 lg:gap-x-8">
                  <div className="min-w-0 lg:col-span-7">
                    <p aria-hidden="true" className="figures font-display text-[1.75rem] leading-none font-semibold text-brass">
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 id={`format-${key}`} className="mt-2 font-display text-h3 font-semibold text-ink">
                      {item.name}
                    </h3>
                    <p className="figures mt-1 text-meta font-medium text-ink-3">{item.spec}</p>
                    <p className="mt-3 max-w-[60ch] text-ui text-ink-2">{item.what}</p>
                    <dl className="mt-5 grid gap-x-6 gap-y-4 text-meta sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="label-caps text-ink-3">{m.formats.labels.where}</dt>
                        <dd className="mt-1 leading-relaxed text-ink-2">{item.where}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="label-caps text-ink-3">{m.formats.labels.label}</dt>
                        <dd className="mt-1 leading-relaxed text-ink-2">{item.label}</dd>
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="label-caps text-ink-3">{m.formats.labels.price}</dt>
                        <dd className="mt-1 text-ui text-ink">{price(key)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="lg:col-span-5 lg:pt-1">
                    <FormatSpecimen format={key} text={specimenText} caption={m.formats.specimen} tagLang={uzOnly} />
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Rules */}
      <section aria-labelledby="reklama-rules" className="wrap mt-6 md:mt-10">
        <div className="rule-ink grid gap-6 pt-2.5 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-4">
            <h2 id="reklama-rules" className="font-display text-h3 font-semibold tracking-[-0.005em]">
              {m.rules.title}
            </h2>
            <p className="mt-2 max-w-[46ch] text-ui text-ink-2">{m.rules.intro}</p>
            <p className="mt-3">
              <Link href={href(locale, paths.policy())} className="inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink">
                {m.rules.policyLink}
                <Icon name="arrow-right" size={16} />
              </Link>
            </p>
          </div>
          <div className="min-w-0 lg:col-span-8">
            <ul>
              {(['label', 'disguise', 'religion', 'independence', 'licence'] as const).map((key, i) => (
                <li
                  key={key}
                  className={`grid grid-cols-[1.5rem_1fr] gap-x-3 py-4 ${i > 0 ? 'border-t border-rule' : 'pt-1 lg:pt-1.5'}`}
                >
                  <Icon name="check" size={20} className="mt-0.5 text-emerald" />
                  <div className="min-w-0">
                    <h3 className="font-display text-h4 font-semibold text-ink">{m.rules.items[key].title}</h3>
                    <p className="mt-1 text-ui text-ink-2">{m.rules.items[key].text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-rule pt-4">
              <EditorialNote text={t.editorial.short} linkLabel={t.nav.policy} href={href(locale, paths.policy())} />
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry form + media kit + commercial desk */}
      <div className="wrap mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-x-8">
        <section id={AD_FORM_ID} aria-labelledby="reklama-form-title" className="min-w-0 lg:col-span-7">
          <SectionHeader id="reklama-form-title" title={m.form.title} />
          <p className="mt-2 max-w-[56ch] text-ui text-ink-2">{m.form.intro}</p>
          <p className="mt-1 mb-6 text-meta text-ink-3">{m.form.allRequired}</p>
          <AdvertiseForm
            text={{
              name: f.name,
              company: f.company,
              email: f.email,
              emailPlaceholder: f.emailPlaceholder,
              phone: f.phone,
              phonePlaceholder: f.phonePlaceholder,
              formatLabel: m.form.formatLabel,
              formatPrompt: m.form.formatPrompt,
              formats: m.form.formats,
              budgetLabel: m.form.budgetLabel,
              budgetPrompt: m.form.budgetPrompt,
              budgets: m.form.budgets,
              messageLabel: m.form.messageLabel,
              messageHint: m.form.messageHint,
              consent: f.consent,
              optional: f.optional,
              honeypot: m.form.honeypot,
              submit: m.form.submit,
              sending: t.actions.sending,
              success: m.form.success,
              errorSummary: f.errors.summary,
              formErrors: f.formErrors,
              privacyNote: f.privacyNote,
              privacyLink: f.privacyLink,
              privacyHref: href(locale, paths.privacy()),
              errors: { ...f.errors, choose: m.form.choose, url: f.errors.required },
            }}
          />
        </section>

        <div className="min-w-0 space-y-10 lg:col-span-5">
          <section id={MEDIA_KIT_ID} aria-labelledby="media-kit-title" className="border-t-2 border-brass bg-paper-2 p-5 sm:p-6">
            <p className="label-caps text-brass-ink">{m.kit.label}</p>
            <h2 id="media-kit-title" className="mt-1 font-display text-h3 font-semibold text-ink">
              {m.kit.title}
            </h2>
            <ul className="mt-4 space-y-2">
              {m.kit.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-ui text-ink-2">
                  <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rotate-45 bg-brass" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-rule pt-4">
              <div className="grid grid-cols-[1.125rem_1fr] gap-x-2.5">
                <Icon name="book" size={18} className="mt-0.5 text-ink-3" />
                <div className="min-w-0">
                  <p className="text-ui font-semibold text-ink">{m.kit.download}</p>
                  <p className="mt-1 text-ui">
                    <Placeholder title={ph}>{m.kit.fileLink}</Placeholder>
                  </p>
                  <p className="mt-1 text-meta text-ink-3">
                    PDF · {m.kit.fileUpdated}: <Placeholder title={ph}>{audience.asOf ?? t.footer.dateMask}</Placeholder>
                  </p>
                </div>
              </div>
              <a
                href={mailto(contacts.advertisingEmail.value, m.kit.label)}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-ui font-semibold text-emerald hover:text-emerald-ink"
              >
                <Icon name="mail" size={18} />
                {m.kit.byEmail}
              </a>
            </div>
          </section>

          <section aria-labelledby="reklama-direct" className="rule-ink pt-2.5">
            <h2 id="reklama-direct" className="font-display text-h4 font-semibold text-ink">
              {m.direct.title}
            </h2>
            <p className="mt-1.5 text-ui text-ink-2">{m.direct.text}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="min-w-0">
                <dt className="label-caps text-ink-3">{m.direct.email}</dt>
                <dd className="-mt-1">
                  <MailLink field={contacts.advertisingEmail} subject={m.title} placeholderTitle={ph} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="label-caps text-ink-3">{m.direct.phone}</dt>
                <dd className="figures mt-1.5 text-ui text-ink">
                  <Value field={contacts.phone} title={ph} />
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-rule pt-3 text-meta text-ink-3">
              {m.direct.editorial}{' '}
              <Link href={href(locale, paths.contact())} className="text-link">
                {m.direct.editorialLink}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
