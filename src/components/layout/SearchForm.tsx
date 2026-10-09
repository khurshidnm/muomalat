import { Icon } from '@/components/ui/Icon'
import { buttonClass } from '@/components/ui/Button'

/** GET search form: works without JavaScript. */
export function SearchForm({
  action,
  label,
  placeholder,
  submitLabel,
  defaultValue,
  size = 'md',
  autoFocus,
  id = 'q',
}: {
  action: string
  label: string
  placeholder: string
  submitLabel: string
  defaultValue?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  id?: string
}) {
  const h = size === 'lg' ? 'h-12 text-lead' : 'h-11 text-ui'
  return (
    <form action={action} method="get" role="search" className="flex w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoFocus={autoFocus}
          enterKeyHint="search"
          className={`w-full rounded-l-[2px] border border-ink-3 bg-paper pr-3 pl-10 text-ink placeholder:text-ink-3 focus:border-emerald focus:outline-2 focus:outline-offset-0 focus:outline-emerald ${h}`}
        />
      </div>
      <button type="submit" className={buttonClass('primary', size === 'lg' ? 'lg' : 'md', 'shrink-0 rounded-l-none')}>
        {submitLabel}
      </button>
    </form>
  )
}
