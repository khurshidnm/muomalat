import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { digestMessages } from '@/i18n/messages/digest'
import { site } from '@/content/data/site'
import { absoluteUrl, href, paths } from '@/lib/routes'
import { jsonLd, pageMetadata, publisherLd } from '@/lib/seo'
import { plainText } from '@/components/ui/InlineText'
import { Kicker } from '@/components/ui/Kicker'
import { Icon } from '@/components/ui/Icon'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ButtonLink } from '@/components/ui/Button'
import { FollowWays } from '@/components/pages/digest/FollowWays'
import { IssuePreview, NextIssue, PreviousIssues } from '@/components/pages/digest/IssuePreview'
import { FaqList, type FaqItem } from '@/components/pages/digest/Faq'
import { getLatestIssue, getPreviousIssues, nextIssueAt } from '@/components/pages/digest/issue'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

const FAQ_ORDER = ['when', 'difference', 'cost', 'privacy', 'unsubscribe', 'confirm', 'language'] as const

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const p = pick(digestMessages, lang).page
  return pageMetadata({ locale: lang, path: paths.digest(), title: p.metaTitle, description: p.metaDescription })
}

export default async function DigestPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = pick(commonMessages, locale)
  const d = pick(digestMessages, locale)
  const p = d.page

  const issue = getLatestIssue(locale)
  const previous = getPreviousIssues(locale, 3)
  const nextAt = nextIssueAt()
  const faq: FaqItem[] = FAQ_ORDER.map((id) => ({ id, ...p.faq.items[id] }))

  const url = absoluteUrl(localePath(locale, paths.digest()))
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${url}#webpage`,
        url,
        name: p.metaTitle,
        description: p.metaDescription,
        inLanguage: localeMeta[locale].htmlLang,
        isPartOf: { '@id': `${site.url}/#website` },
        publisher: { '@id': `${site.url}/#organization` },
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(localePath(locale, '/')) },
          { '@type': 'ListItem', position: 2, name: d.title, item: url },
        ],
      },
      { ...publisherLd, '@id': `${site.url}/#organization` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      <header className="wrap pt-5 md:pt-9">
        <div className="max-w-[52rem]">
          <Kicker>{p.kicker}</Kicker>
          <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{d.title}</h1>
          <p className="mt-3 font-serif text-standfirst text-ink-2 md:mt-4">{p.standfirst}</p>
          <ul aria-label={p.facts.label} className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-meta text-ink-2">
            <li className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={16} className="text-emerald" />
              {p.facts.schedule}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Icon name="check" size={16} className="text-emerald" />
              {p.facts.free}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Icon name="mail" size={16} className="text-emerald" />
              {p.facts.unsubscribe}
            </li>
          </ul>
        </div>
      </header>

      <section aria-labelledby="ways-title" className="wrap mt-9 md:mt-12">
        <SectionHeader id="ways-title" title={p.ways.title} description={p.ways.description} />
        <div className="mt-5">
          <FollowWays locale={locale} />
        </div>
      </section>

      <section id="songgi-son" aria-labelledby="preview-title" className="wrap mt-12 scroll-mt-24 md:mt-16">
        <SectionHeader id="preview-title" title={p.preview.title} description={p.preview.description} />
        <div className="mt-5 grid gap-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="min-w-0 lg:col-span-8">
            <IssuePreview issue={issue} locale={locale} />
          </div>
          <div className="space-y-8 lg:col-span-4">
            <div className="space-y-8 lg:sticky lg:top-20">
              <NextIssue number={issue.number + 1} sendAt={nextAt} locale={locale} />
              <PreviousIssues issues={previous} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      <section id="savollar" aria-labelledby="faq-title" className="wrap mt-12 scroll-mt-24 md:mt-16">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8">
            <SectionHeader id="faq-title" title={p.faq.title} description={p.faq.description} />
            <div className="mt-4">
              <FaqList items={faq} locale={locale} />
            </div>
          </div>
          <div className="lg:col-span-4 lg:pt-[4.25rem]">
            <div className="border-t-2 border-emerald bg-emerald-wash/60 p-5">
              <h3 className="font-display text-h4 font-semibold">{p.faq.moreTitle}</h3>
              <p className="mt-1.5 text-ui text-ink-2">{p.faq.moreText}</p>
              <ButtonLink href={href(locale, paths.contact())} variant="secondary" className="mt-4">
                <Icon name="mail" size={18} />
                {p.faq.moreCta}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
