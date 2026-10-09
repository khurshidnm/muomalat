import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { formMessages } from '@/i18n/messages/forms'
import { site } from '@/content/data/site'
import { pageMetadata } from '@/lib/seo'
import { privacyOfficer } from '@/payload/personalData'
import { CONSENT_VERSIONS, type SubmissionKind } from '@/payload/personalData/consent'
import { PD_PATHS } from '@/payload/personalData/tokens'
import { plain, privacyText } from '@/payload/personalData/texts'
import { InlineText } from '@/components/ui/InlineText'
import { Kicker } from '@/components/ui/Kicker'
import { Placeholder } from '@/components/ui/Placeholder'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Icon } from '@/components/ui/Icon'
import { RightsForm } from '../_personal-data/RightsForm'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }> }

/** Anchor of the rights-request form (CMS-SPEC §13.3: /maxfiylik#sorov). */
const FORM_ID = 'sorov'
const BLOCKS: (SubmissionKind | 'rights')[] = ['club', 'digest', 'contact', 'advertising', 'rights']

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const p = privacyText(lang).pages.privacy
  return pageMetadata({ locale: lang, path: PD_PATHS.privacy, title: p.metaTitle, description: plain(p.metaDescription) })
}

/**
 * The privacy notice (CMS-SPEC §13.2), built from the same texts the forms
 * record as consent versions, and the rights-request form (§13.3). States the
 * controller, storage in the EU (Lithuania), the processors, what each form
 * keeps and for how long, the rights, and the person responsible
 * (site-settings → policies.personalDataOfficer).
 */
export default async function PrivacyPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = privacyText(locale)
  const f = pick(formMessages, locale)
  const p = t.pages.privacy
  const n = t.notice
  const officer = await privacyOfficer()
  const founder = site.legal.founder
  const [beforeFounder, afterFounder] = n.controller('\u0000').split('\u0000')

  return (
    <>
      <header className="wrap pt-5 md:pt-9">
        <div className="max-w-[52rem]">
          <Kicker>{p.kicker}</Kicker>
          <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{p.title}</h1>
          <p className="mt-3 font-serif text-standfirst text-ink-2 md:mt-4">{p.lead}</p>
        </div>
      </header>

      <div className="wrap mt-9 grid gap-12 md:mt-12 lg:grid-cols-12 lg:gap-x-8">
        <div className="min-w-0 space-y-12 lg:col-span-7">
          <section aria-labelledby="pd-who">
            <SectionHeader id="pd-who" title={p.who} />
            <div className="mt-4 max-w-[62ch] space-y-3 font-serif text-body text-ink-2">
              <p>
                {beforeFounder}
                {founder.placeholder ? <Placeholder>{founder.value}</Placeholder> : founder.value}
                {afterFounder}
              </p>
              <p>{n.storage}</p>
              <p>
                <InlineText text={n.processors} locale={locale} />
              </p>
              <p>{n.noSharing}</p>
              <p>
                <InlineText text={n.noIp} locale={locale} />
              </p>
            </div>
          </section>

          <section aria-labelledby="pd-forms">
            <SectionHeader id="pd-forms" title={p.forms} />
            <div className="mt-2 divide-y divide-rule border-b border-rule">
              {BLOCKS.map((kind) => {
                const b = t.purposes[kind]
                return (
                  <section key={kind} aria-labelledby={`pd-${kind}`} className="py-5">
                    <h3 id={`pd-${kind}`} className="font-display text-h4 font-semibold text-ink">
                      {b.title}
                    </h3>
                    <dl className="mt-2 grid gap-x-5 gap-y-2 text-ui sm:grid-cols-[9rem_1fr]">
                      <dt className="text-ink-3">{p.data}</dt>
                      <dd className="text-ink-2">{b.data}</dd>
                      <dt className="text-ink-3">{p.purpose}</dt>
                      <dd className="text-ink-2">{b.purpose}</dd>
                      <dt className="text-ink-3">{p.retention}</dt>
                      <dd className="text-ink-2">
                        <InlineText text={b.retention} locale={locale} />
                      </dd>
                      {kind !== 'rights' ? (
                        <>
                          <dt className="text-ink-3">{p.version}</dt>
                          <dd className="figures text-meta text-ink-3">
                            <code>{CONSENT_VERSIONS[kind]}</code>
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </section>
                )
              })}
            </div>
          </section>

          <section id="huquqlar" aria-labelledby="pd-rights" className="scroll-mt-24">
            <SectionHeader id="pd-rights" title={p.rights} />
            <div className="mt-4 max-w-[62ch] space-y-3 font-serif text-body text-ink-2">
              <p>{n.rights}</p>
              <p>{n.howTo}</p>
            </div>
            <div className="mt-5 border-t-2 border-emerald bg-emerald-wash/60 p-5">
              <h3 className="font-display text-h4 font-semibold text-ink">{n.officer}</h3>
              <p className="mt-1.5 text-ui text-ink-2">{officer.name ?? <Placeholder>{p.officerPending}</Placeholder>}</p>
              <a
                href={`mailto:${officer.email ?? site.email}`}
                className="group mt-1 inline-flex min-h-11 max-w-full items-center gap-2 text-ui font-medium text-emerald hover:text-emerald-ink"
              >
                <Icon name="mail" size={18} className="shrink-0" />
                <span className="min-w-0 break-all underline decoration-emerald/45 decoration-1 underline-offset-[0.2em] group-hover:decoration-current">
                  {officer.email ?? site.email}
                </span>
              </a>
            </div>
          </section>
        </div>

        <section id={FORM_ID} aria-labelledby="pd-form-title" className="min-w-0 scroll-mt-24 lg:col-span-5">
          <div className="border-t-2 border-brass bg-paper-2 p-5 sm:p-6 lg:sticky lg:top-20">
            <h2 id="pd-form-title" className="font-display text-h3 font-semibold text-ink">
              {t.pages.rightsForm.title}
            </h2>
            <p className="mt-2 mb-5 text-ui text-ink-2">{t.pages.rightsForm.intro}</p>
            <RightsForm
              text={{
                email: t.pages.rightsForm.email,
                emailPlaceholder: f.emailPlaceholder,
                kindLabel: t.pages.rightsForm.kindLabel,
                kindPrompt: t.pages.rightsForm.kindPrompt,
                kinds: t.rightsKinds,
                note: t.pages.rightsForm.note,
                submit: t.pages.rightsForm.submit,
                sending: t.pages.common.sending,
                success: t.pages.rightsForm.success,
                errorSummary: f.errors.summary,
                busy: t.pages.common.busy,
                honeypot: f.honeypot,
                errors: { required: f.errors.required, email: f.errors.email, choose: t.pages.rightsForm.choose },
              }}
            />
          </div>
        </section>
      </div>
      <div className="mb-12 md:mb-16" />
    </>
  )
}
