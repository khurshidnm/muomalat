import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { clubMessages } from '@/i18n/messages/club'
import { formMessages } from '@/i18n/messages/forms'
import { href, paths } from '@/lib/routes'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Placeholder } from '@/components/ui/Placeholder'
import { ClubForm, type ClubFormText } from './ClubForm'
import { eventDate, type EventView } from './event'

/** Server-side resolution of every form string (functions can't cross to the client). */
function formText(locale: Locale, next?: EventView): ClubFormText {
  const c = pick(clubMessages, locale).form
  const f = pick(formMessages, locale)
  return {
    required: f.required,
    optional: f.optional,
    name: f.name,
    company: f.company,
    sector: c.sector,
    size: c.size,
    choose: c.choose,
    sectors: c.sectors,
    sizes: c.sizes,
    phone: f.phone,
    phonePlaceholder: f.phonePlaceholder,
    phoneHint: c.phoneHint,
    email: f.email,
    emailPlaceholder: f.emailPlaceholder,
    interest: c.interest,
    interestHint: c.interestHint,
    interests: c.interests,
    message: f.message,
    messageHint: c.messageHint,
    attend: next ? c.attend(eventDate(next, locale).dayMonth) : undefined,
    honeypot: c.honeypot,
    consent: f.consent,
    submit: c.submit,
    sending: c.sending,
    success: c.success,
    errorSummary: f.errors.summary,
    errorList: c.errorList,
    errors: { ...f.errors, select: c.errors.select, interest: c.errors.interest },
    formErrors: f.formErrors,
    privacyNote: f.privacyNote,
    privacyLink: f.privacyLink,
    privacyHref: href(locale, paths.privacy()),
  }
}

/** Membership application section, anchored at #ariza. */
export function Application({ locale, next, className = '' }: { locale: Locale; next?: EventView; className?: string }) {
  const c = pick(clubMessages, locale).form
  return (
    <section id="ariza" aria-labelledby="ariza-title" className={`wrap scroll-mt-20 ${className}`}>
      <SectionHeader id="ariza-title" title={c.title} />
      {/* Phones: intro → form → next steps. Desktop: intro and steps in a rail beside the form. */}
      <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8">
        <p className="font-serif text-lead leading-relaxed text-ink-2 lg:col-span-4 lg:row-start-1">{c.intro}</p>
        <div className="min-w-0 lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-rule lg:pl-8">
          <ClubForm text={formText(locale, next)} permalink={href(locale, paths.clubJoin())} />
        </div>
        <div className="self-start border-t-2 border-brass bg-paper-2 p-5 lg:col-span-4 lg:row-start-2">
          <h3 className="label-caps text-brass-ink">{c.stepsTitle}</h3>
          <ol className="mt-3 space-y-3">
            {c.steps.map((s, i) => (
              <li key={s} className="grid grid-cols-[1.75rem_1fr] gap-x-2 text-ui text-ink-2">
                <span aria-hidden="true" className="figures font-display text-[1.375rem] leading-none font-semibold text-brass-ink">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <dl className="mt-5 space-y-2 border-t border-rule pt-4 text-meta">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
              <dt className="text-ink-3">{c.reviewTime}</dt>
              <dd className="text-ink">
                <Placeholder>{c.reviewTimeValue}</Placeholder>
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
              <dt className="text-ink-3">{c.questions}</dt>
              <dd className="figures text-ink">
                <Placeholder>{c.questionsPhone}</Placeholder>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
