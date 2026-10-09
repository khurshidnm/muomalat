import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { AdLabel } from '@/components/ui/Labels'

const SIZES = {
  leaderboard: 'h-[100px] max-w-[728px] md:h-[90px]',
  mpu: 'h-[250px] max-w-[300px]',
  inline: 'h-[120px] max-w-[640px]',
}

/**
 * Advertising slot. Reserved height prevents layout shift; the hatched
 * neutral field and "Reklama" label keep it unmistakably non-editorial.
 * An ad server would render into [data-ad-slot].
 */
export function AdSlot({ locale, format = 'leaderboard', slot, className = '' }: {
  locale: Locale
  format?: keyof typeof SIZES
  slot: string
  className?: string
}) {
  const t = pick(commonMessages, locale)
  return (
    <aside aria-label={t.labels.advert} className={`no-print ${className}`}>
      <div className="mb-1.5 flex justify-center">
        <AdLabel>{t.labels.advert}</AdLabel>
      </div>
      <div
        data-ad-slot={slot}
        className={`mx-auto flex w-full items-center justify-center border border-dashed border-ad-ink/40 bg-ad text-meta text-ad-ink ${SIZES[format]}`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, transparent 0 9px, color-mix(in srgb, var(--ad-ink) 9%, transparent) 9px 10px)',
        }}
      >
        <span className="figures">{format === 'leaderboard' ? '728 × 90' : format === 'mpu' ? '300 × 250' : '640 × 120'}</span>
      </div>
    </aside>
  )
}
