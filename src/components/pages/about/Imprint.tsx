import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import { commonMessages } from '@/i18n/messages/common'
import { site } from '@/content/data/site'
import { href, paths } from '@/lib/routes'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TelegramButton } from '@/components/ui/TelegramButton'
import { Legal } from '@/components/layout/Footer'
import { AboutSection } from './Section'

/** Publisher details from site.legal (placeholders until registration), plus contact routes. */
export function Imprint({ id, locale }: { id: string; locale: Locale }) {
  const m = pick(aboutMessages, locale).legal
  const t = pick(commonMessages, locale)
  const f = t.footer
  const L = site.legal
  const rows: [string, React.ReactNode][] = [
    [f.founder, <Legal key="founder" field={L.founder} locale={locale} prose />],
    [
      f.registration,
      <span key="reg">
        <Legal field={L.registrationNumber} locale={locale} /> · {f.registrationDate}:{' '}
        <Legal field={L.registrationDate} locale={locale} mask={f.dateMask} />
      </span>,
    ],
    [f.registrar, <Legal key="registrar" field={L.registrar} locale={locale} prose />],
    [f.editorInChief, <Legal key="editor" field={L.editorInChief} locale={locale} prose />],
    [f.address, <Legal key="address" field={L.address} locale={locale} prose />],
    [f.email, <Legal key="email" field={L.email} locale={locale} />],
    [f.phone, <Legal key="phone" field={L.phone} locale={locale} />],
    [f.ageMark, <Legal key="age" field={L.ageMark} locale={locale} />],
  ]
  return (
    <AboutSection id={id} title={m.title} description={m.lead}>
      <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 border-t border-rule py-3">
            <dt className="text-meta text-ink-3">{label}</dt>
            <dd className="mt-0.5 text-ui text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 border-t border-rule pt-3 text-[0.75rem] text-ink-3">{f.placeholderNote}</p>

      <h3 className="label-caps mt-8 text-ink-3">{m.contacts}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={href(locale, paths.contact())} variant="secondary" className="w-full xs:w-auto">
          <Icon name="mail" size={18} />
          {m.contact}
        </ButtonLink>
        <ButtonLink href={href(locale, paths.advertise())} variant="secondary" className="w-full xs:w-auto">
          {m.advertise}
        </ButtonLink>
        <TelegramButton label={t.actions.readOnTelegram} className="h-11 w-full justify-center xs:w-auto" />
      </div>
    </AboutSection>
  )
}
