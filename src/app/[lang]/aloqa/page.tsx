import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { formMessages } from '@/i18n/messages/forms'
import { contactMessages } from '@/i18n/messages/contact'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { Kicker } from '@/components/ui/Kicker'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Icon } from '@/components/ui/Icon'
import { ContactForm } from '@/components/pages/contact/ContactForm'
import { TopicLink } from '@/components/pages/contact/TopicLink'
import { InfoLine, MailLink, Value } from '@/components/pages/contact/parts'
import { contacts } from '@/components/pages/contact/data'
import { CONTACT_FORM_ID } from '@/components/pages/contact/options'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const m = pick(contactMessages, lang)
  return pageMetadata({ locale: lang, path: paths.contact(), title: m.metaTitle, description: m.metaDescription })
}

/** Corrections policy anchor on the about page. */
const CORRECTIONS_PATH = `${paths.about()}#tuzatishlar`

/**
 * Hairlines for the 1 / 2 / 3-column directory: every cell after the first
 * row carries a top rule, every cell after the first column a left rule.
 */
const CELL = [
  'sm:pr-6 lg:pr-6',
  'border-t sm:border-t-0 sm:border-l sm:pl-6 lg:pl-6 lg:pr-6',
  'border-t lg:border-t-0 sm:pr-6 lg:border-l lg:pl-6 lg:pr-0',
  'border-t sm:border-l sm:pl-6 lg:border-l-0 lg:pl-0 lg:pr-6',
  'border-t sm:pr-6 lg:border-l lg:pl-6',
  'border-t sm:border-l sm:pl-6 lg:pr-0',
]

export default async function ContactPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const f = pick(formMessages, locale)
  const m = pick(contactMessages, locale)
  const ph = t.labels.placeholder
  const c = m.cards
  const contactHref = href(locale, paths.contact())
  const url = absoluteUrl(localePath(locale, paths.contact()))
  const languages = ['uz', 'ru', 'en']

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': `${url}#webpage`,
        url,
        name: m.title,
        description: m.metaDescription,
        inLanguage: localeMeta[locale].htmlLang,
        isPartOf: { '@id': `${site.url}/#website` },
        about: { '@id': `${site.url}/#organization` },
        mainEntity: { '@id': `${site.url}/#organization` },
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
      {
        ...publisherLd,
        '@id': `${site.url}/#organization`,
        // Phone and street address stay out until they are confirmed (they are placeholders).
        contactPoint: [
          { '@type': 'ContactPoint', contactType: 'newsroom', email: contacts.editorialEmail.value, availableLanguage: languages },
          { '@type': 'ContactPoint', contactType: 'advertising', email: contacts.advertisingEmail.value, availableLanguage: languages },
          { '@type': 'ContactPoint', contactType: 'events', email: contacts.clubEmail.value, availableLanguage: languages },
        ],
      },
    ],
  }

  const cardTitle = 'font-display text-h4 font-semibold text-ink'
  const cardText = 'mt-1.5 text-meta leading-relaxed text-ink-2'
  const moreLink = 'inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-emerald hover:text-emerald-ink'

  const cards: { key: string; title: string; body: React.ReactNode }[] = [
    {
      key: 'editorial',
      title: c.editorial.title,
      body: (
        <>
          <p className={cardText}>{c.editorial.text}</p>
          <MailLink field={contacts.editorialEmail} placeholderTitle={ph} className="mt-2" />
        </>
      ),
    },
    {
      key: 'advertising',
      title: c.advertising.title,
      body: (
        <>
          <p className={cardText}>{c.advertising.text}</p>
          <MailLink field={contacts.advertisingEmail} placeholderTitle={ph} className="mt-2" />
          <p>
            <Link href={href(locale, paths.advertise())} className={moreLink}>
              {c.advertising.link}
              <Icon name="arrow-right" size={14} />
            </Link>
          </p>
        </>
      ),
    },
    {
      key: 'club',
      title: c.club.title,
      body: (
        <>
          <p className={cardText}>{c.club.text}</p>
          <MailLink field={contacts.clubEmail} placeholderTitle={ph} className="mt-2" />
          <p>
            <Link href={href(locale, paths.club())} className={moreLink}>
              {c.club.link}
              <Icon name="arrow-right" size={14} />
            </Link>
          </p>
        </>
      ),
    },
    {
      key: 'telegram',
      title: c.telegram.title,
      body: (
        <>
          <p className={cardText}>{c.telegram.text}</p>
          <dl className="mt-3 space-y-2.5">
            <div>
              <dt className="label-caps text-ink-3">{c.telegram.channel}</dt>
              <dd>
                <a
                  href={site.telegram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-2 text-ui font-medium text-emerald hover:text-emerald-ink"
                >
                  <Icon name="telegram" size={18} className="shrink-0" />
                  <span className="underline decoration-emerald/45 underline-offset-[0.2em] group-hover:decoration-current">
                    {contacts.telegramChannel.value}
                  </span>
                </a>
              </dd>
            </div>
            <div>
              <dt className="label-caps text-ink-3">{c.telegram.write}</dt>
              <dd className="mt-1.5">
                {/* No working link until the bot exists: a placeholder must not send readers to someone else's account. */}
                <InfoLine icon="telegram">
                  <Value field={contacts.telegramBot} title={ph} />
                </InfoLine>
              </dd>
            </div>
          </dl>
        </>
      ),
    },
    {
      key: 'phone',
      title: c.phone.title,
      body: (
        <>
          <dl className="mt-2 space-y-2.5 text-ui">
            <div>
              <dt className="sr-only">{f.phone}</dt>
              <dd className="figures text-ink">
                <Value field={contacts.phone} title={ph} />
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 border-t border-rule pt-2.5">
              <dt className="text-ink-2">{c.phone.weekdays}</dt>
              <dd className="figures text-ink">
                <Value field={contacts.hours.weekdays} title={ph} />
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 border-t border-rule pt-2.5">
              <dt className="text-ink-2">{c.phone.weekend}</dt>
              <dd className="text-ink">{c.phone.weekendValue}</dd>
            </div>
          </dl>
          <p className="mt-2.5 flex items-center gap-1.5 border-t border-rule pt-2.5 text-meta text-ink-3">
            <Icon name="clock" size={15} className="shrink-0" />
            {c.phone.timezone} ({contacts.utcOffset})
          </p>
        </>
      ),
    },
    {
      key: 'address',
      title: c.address.title,
      body: (
        <>
          <InfoLine icon="pin" className="mt-2.5">
            {/* The registered address is written in Uzbek Latin in every edition. */}
            <span lang={locale === 'uz' ? undefined : 'uz'}>
              <Value field={contacts.address} title={ph} />
            </span>
          </InfoLine>
          <p className={`${cardText} mt-2.5`}>{c.address.text}</p>
        </>
      ),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      {/* Header + corrections callout */}
      {/* Same top padding and kicker + h1 as the other static pages (about, digest, advertising). */}
      <div className="wrap pt-5 md:pt-9">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-8">
          <header className="lg:col-span-7">
            <Kicker>{m.kicker}</Kicker>
            <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{m.title}</h1>
            <p className="mt-3 max-w-[40rem] font-serif text-standfirst text-ink-2 md:mt-4">{m.lead}</p>
          </header>
          <aside
            id="xato"
            aria-labelledby="aloqa-correction"
            className="border-l-2 border-signal bg-signal-wash px-4 py-4 sm:px-5 lg:col-span-5 lg:self-start"
          >
            <h2 id="aloqa-correction" className="flex items-center gap-2 font-display text-h4 font-semibold text-ink">
              <Icon name="alert" size={18} className="shrink-0 text-signal" />
              {m.correction.title}
            </h2>
            <p className="mt-1.5 text-ui text-ink-2">{m.correction.text}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
              <TopicLink
                href={contactHref}
                topic="tuzatish"
                className="inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-signal underline decoration-signal/40 underline-offset-[0.2em] hover:decoration-current"
              >
                {m.correction.cta}
                <Icon name="arrow-right" size={16} />
              </TopicLink>
              <Link href={href(locale, CORRECTIONS_PATH)} className="inline-flex min-h-11 items-center text-meta font-medium text-ink-2 underline decoration-rule-strong underline-offset-[0.2em] hover:text-ink">
                {m.correction.policy}
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Directory */}
      <section aria-labelledby="aloqa-directory" className="wrap mt-10 md:mt-14">
        <SectionHeader id="aloqa-directory" title={m.directoryTitle} />
        <ul className="mt-2 grid border-b border-rule sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <li key={card.key} className={`min-w-0 border-rule py-5 ${CELL[i]}`}>
              <h3 className={cardTitle}>{card.title}</h3>
              {card.body}
            </li>
          ))}
        </ul>
      </section>

      {/* Form + guidance */}
      <div className="wrap mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-x-8">
        <section id={CONTACT_FORM_ID} aria-labelledby="aloqa-form-title" className="min-w-0 lg:col-span-7">
          <SectionHeader id="aloqa-form-title" title={m.form.title} />
          <p className="mt-2 max-w-[56ch] text-ui text-ink-2">{m.form.intro}</p>
          <p className="mt-1 mb-6 text-meta text-ink-3">{m.form.allRequired}</p>
          <ContactForm
            text={{
              topicLabel: m.form.topicLabel,
              topicPrompt: m.form.topicPrompt,
              topics: m.form.topics,
              name: f.name,
              email: f.email,
              emailPlaceholder: f.emailPlaceholder,
              urlLabel: m.form.urlLabel,
              urlHint: m.form.urlHint,
              urlPlaceholder: m.form.urlPlaceholder,
              message: f.message,
              messageHint: m.form.messageHint,
              consent: f.consent,
              optional: f.optional,
              honeypot: m.form.honeypot,
              submit: m.form.submit,
              sending: t.actions.sending,
              success: m.form.success,
              errorSummary: f.errors.summary,
              demoNote: f.demoNote,
              errors: { ...f.errors, choose: m.form.choose, url: m.form.urlError },
            }}
          />
        </section>

        <div className="min-w-0 space-y-10 lg:col-span-5">
          <section aria-labelledby="aloqa-tips" className="border-t-2 border-brass bg-paper-2 p-5 sm:p-6">
            <h2 id="aloqa-tips" className="font-display text-h4 font-semibold text-ink">
              {m.tips.title}
            </h2>
            <ol className="mt-3 space-y-2.5">
              {m.tips.items.map((item, i) => (
                <li key={item} className="grid grid-cols-[1.5rem_1fr] gap-2 text-ui text-ink-2">
                  <span aria-hidden="true" className="figures font-display text-[1.125rem] leading-[1.35] font-semibold text-brass-ink">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 border-t border-rule pt-3.5 text-meta leading-relaxed text-ink-2">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-emerald" />
              {m.tips.confidential}
            </p>
          </section>

          <section aria-labelledby="aloqa-religion" className="rule-ink pt-2.5">
            <h2 id="aloqa-religion" className="font-display text-h4 font-semibold text-ink">
              {m.religion.title}
            </h2>
            <p className="mt-1.5 text-ui leading-relaxed text-ink-2">{m.religion.text}</p>
            <p className="mt-3">
              <Link href={href(locale, paths.policy())} className="inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-emerald hover:text-emerald-ink">
                {t.nav.policy}
                <Icon name="arrow-right" size={14} />
              </Link>
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
