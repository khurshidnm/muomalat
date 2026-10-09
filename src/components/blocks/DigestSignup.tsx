import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { digestMessages } from '@/i18n/messages/digest'
import { formMessages } from '@/i18n/messages/forms'
import { site } from '@/content/data/site'
import { Icon } from '@/components/ui/Icon'
import { DigestForm } from './DigestForm'

/** Weekly digest signup panel: e-mail form plus the Telegram alternative. */
export function DigestSignup({ locale, id = 'digest', className = '' }: { locale: Locale; id?: string; className?: string }) {
  const d = pick(digestMessages, locale)
  const f = pick(formMessages, locale)
  const t = pick(commonMessages, locale)
  return (
    <section aria-labelledby={`${id}-title`} className={`border-t-2 border-brass bg-paper-2 p-5 sm:p-6 ${className}`}>
      <p className="label-caps text-brass-ink">{t.actions.subscribe}</p>
      <h2 id={`${id}-title`} className="mt-1 font-display text-h3 font-semibold">
        {d.title}
      </h2>
      <p className="mt-2 mb-4 text-ui text-ink-2">{d.pitch}</p>
      <DigestForm
        idPrefix={id}
        text={{
          emailLabel: d.emailLabel,
          placeholder: d.placeholder,
          submit: d.submit,
          sending: d.sending,
          success: d.success,
          errorSummary: f.errors.summary,
          formErrors: f.formErrors,
          errors: { required: f.errors.required, email: f.errors.email },
          note: d.note,
          honeypot: f.honeypot,
        }}
      />
      <a
        href={site.telegram.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 border-t border-rule pt-4 text-meta font-semibold text-emerald hover:text-emerald-ink"
      >
        <Icon name="telegram" size={16} />
        {d.orTelegram} · {site.telegram.handle}
      </a>
    </section>
  )
}
