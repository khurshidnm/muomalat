import { Icon, type IconName } from '@/components/ui/Icon'
import { Placeholder } from '@/components/ui/Placeholder'
import { mailto, type ContactValue } from './data'

/** A directory value: plain text when confirmed, <Placeholder> until then. */
export function Value({ field, title }: { field: ContactValue; title?: string }) {
  return field.placeholder ? <Placeholder title={title}>{field.value}</Placeholder> : <>{field.value}</>
}

/**
 * E-mail link with a 44px touch target. A placeholder address keeps its
 * dotted frame; the emerald underline and icon still mark it as a link.
 */
export function MailLink({
  field,
  subject,
  placeholderTitle,
  className = '',
}: {
  field: ContactValue
  subject?: string
  placeholderTitle?: string
  className?: string
}) {
  return (
    <a
      href={mailto(field.value, subject)}
      className={`group inline-flex min-h-11 max-w-full items-center gap-2 text-ui font-medium text-emerald hover:text-emerald-ink ${className}`}
    >
      <Icon name="mail" size={18} className="shrink-0" />
      <span className="min-w-0 break-all underline decoration-emerald/45 decoration-1 underline-offset-[0.2em] group-hover:decoration-current">
        <Value field={field} title={placeholderTitle} />
      </span>
    </a>
  )
}

/** Icon + text line for values that are not links (phone placeholder, address). */
export function InfoLine({ icon, children, className = '' }: { icon: IconName; children: React.ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-ui text-ink ${className}`}>
      <Icon name={icon} size={18} className="mt-0.5 shrink-0 text-ink-3" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}
