import { site } from '@/content/data/site'
import { Icon } from './Icon'

/**
 * The persistent "Telegramda oʻqish" call to action. 44px tall on touch
 * screens (DESIGN.md: primary touch target); `sm` drops to 40px on desktop.
 * `compact` lets the label truncate under pressure and hides it below 360px,
 * keeping the accessible name (used in the sticky header row).
 */
export function TelegramButton({
  label,
  size = 'md',
  compact = false,
  className = '',
}: {
  label: string
  size?: 'sm' | 'md'
  compact?: boolean
  className?: string
}) {
  const sz = size === 'sm' ? 'h-11 gap-1.5 px-2.5 text-meta lg:h-10' : 'h-11 gap-2 px-3.5 text-ui'
  return (
    <a
      href={site.telegram.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center whitespace-nowrap rounded-[2px] bg-emerald font-semibold text-on-emerald transition-colors hover:bg-emerald-ink ${
        compact ? 'min-w-11 justify-center max-[22.5rem]:px-0' : 'shrink-0'
      } ${sz} ${className}`}
    >
      <Icon name="telegram" size={size === 'sm' ? 16 : 18} className="shrink-0" />
      {compact ? <span className="min-w-0 truncate max-[22.5rem]:sr-only">{label}</span> : label}
    </a>
  )
}
