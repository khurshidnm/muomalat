import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { digestMessages } from '@/i18n/messages/digest'
import { formMessages } from '@/i18n/messages/forms'
import { href, paths } from '@/lib/routes'
import { site } from '@/content/data/site'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Placeholder } from '@/components/ui/Placeholder'
import { TelegramButton } from '@/components/ui/TelegramButton'
import { DigestForm } from '@/components/blocks/DigestForm'

/** Subscriber counts are not public yet: shown as a placeholder on both panels. */
const SUBSCRIBERS_PLACEHOLDER = '0 000'

/** "Label: rest" items get a bold label, so the three Telegram formats scan at a glance. */
function Item({ text }: { text: string }) {
  const i = text.indexOf(': ')
  return (
    <li className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2.5 text-ui text-ink-2">
      <span aria-hidden="true" className="mt-[0.6em] size-1.5 rotate-45 bg-brass" />
      <span>
        {i > 0 ? (
          <>
            <strong className="font-semibold text-ink">{text.slice(0, i)}</strong>
            {text.slice(i)}
          </>
        ) : (
          text
        )}
      </span>
    </li>
  )
}

const tones = {
  brass: { panel: 'border-brass bg-paper-2', label: 'text-brass-ink' },
  emerald: { panel: 'border-emerald bg-emerald-wash/60', label: 'text-emerald' },
} as const

function Way({
  id,
  tone,
  icon,
  cadence,
  title,
  text,
  inside,
  items,
  subscribers,
  children,
}: {
  id: string
  tone: keyof typeof tones
  icon: IconName
  cadence: string
  title: string
  text: string
  inside: string
  items: readonly string[]
  subscribers: string
  children: React.ReactNode
}) {
  const c = tones[tone]
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`flex scroll-mt-24 flex-col border-t-2 p-5 sm:p-6 ${c.panel}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p className={`label-caps inline-flex items-center gap-1.5 ${c.label}`}>
          <Icon name={icon} size={15} />
          {cadence}
        </p>
        <p className="text-meta text-ink-3">
          {subscribers}: <Placeholder>{SUBSCRIBERS_PLACEHOLDER}</Placeholder>
        </p>
      </div>
      <h3 id={`${id}-title`} className="mt-3 font-display text-h3 font-semibold">
        {title}
      </h3>
      <p className="mt-2 text-ui text-ink-2">{text}</p>
      <h4 className="label-caps mt-5 text-ink-3">{inside}</h4>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <Item key={item} text={item} />
        ))}
      </ul>
      <div className="mt-auto pt-6">{children}</div>
    </section>
  )
}

/** The two equal ways to follow Muomalat: weekly e-mail and the daily Telegram channel. */
export function FollowWays({ locale }: { locale: Locale }) {
  const d = pick(digestMessages, locale)
  const w = d.page.ways
  const f = pick(formMessages, locale)
  const t = pick(commonMessages, locale)
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      <Way
        id="obuna"
        tone="brass"
        icon="mail"
        cadence={w.email.cadence}
        title={w.email.title}
        text={w.email.text}
        inside={w.inside}
        items={w.email.items}
        subscribers={w.subscribers}
      >
        <DigestForm
          idPrefix="dayjest"
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
        <p className="mt-3 flex items-start gap-1.5 border-t border-rule pt-3 text-[0.75rem] text-ink-3">
          <Icon name="info" size={14} className="mt-px shrink-0" />
          <span>
            {f.privacyNote}{' '}
            <a href={href(locale, paths.privacy())} className="text-link font-medium">
              {f.privacyLink}
            </a>
          </span>
        </p>
      </Way>
      <Way
        id="telegram"
        tone="emerald"
        icon="telegram"
        cadence={w.telegram.cadence}
        title={w.telegram.title}
        text={w.telegram.text}
        inside={w.inside}
        items={w.telegram.items}
        subscribers={w.subscribers}
      >
        <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:gap-4">
          <TelegramButton label={t.actions.readOnTelegram} className="h-11 justify-center" />
          <span className="text-ui font-semibold text-ink">{site.telegram.handle}</span>
        </div>
        <p className="mt-3 text-[0.75rem] text-ink-3">{w.telegram.openApp}</p>
      </Way>
    </div>
  )
}
