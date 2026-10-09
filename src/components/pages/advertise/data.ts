import type { Locale } from '@/i18n/config'

/**
 * Placeholder audience figures and prices for /reklama. Nothing here is a
 * real measurement: headline figures and prices are zero patterns (they cannot
 * be mistaken for a claim), the segment splits are indicative shares so the
 * bars can be drawn. Every value renders through <Placeholder>. Replace from
 * web analytics, subscription data and the reader survey before launch.
 */

export type FormatKey = 'banner' | 'sponsored' | 'telegram' | 'digest' | 'club'
export const FORMAT_KEYS: FormatKey[] = ['banner', 'sponsored', 'telegram', 'digest', 'club']

export type StatKey = 'telegram' | 'site' | 'digest' | 'mobile'

export const audience = {
  /** Date the figures refer to (DD.MM.YYYY); null until measured, shown as the edition's date mask. */
  asOf: null as string | null,
  stats: [
    { key: 'telegram', digits: 5 },
    { key: 'site', digits: 6 },
    { key: 'digest', digits: 4 },
    { key: 'mobile', digits: 2, percent: true },
  ] satisfies { key: StatKey; digits: number; percent?: boolean }[],
  /** Indicative shares (%), sum 100, largest first. */
  sectors: [
    { key: 'bank', value: 31 },
    { key: 'sme', value: 24 },
    { key: 'leasing', value: 15 },
    { key: 'invest', value: 12 },
    { key: 'takaful', value: 9 },
    { key: 'public', value: 9 },
  ] as const,
  roles: [
    { key: 'specialist', value: 41 },
    { key: 'head', value: 28 },
    { key: 'owner', value: 22 },
    { key: 'student', value: 9 },
  ] as const,
}

/** Price per unit (week, article, post, issue, meeting), number of digits in the zero pattern. */
export const priceDigits: Record<FormatKey, number> = {
  banner: 7,
  sponsored: 8,
  telegram: 7,
  digest: 7,
  club: 8,
}

/** Hashtag that opens every paid post on the Telegram channel (the channel is Uzbek). */
export const TELEGRAM_AD_TAG = '#reklama'

const NNBSP = ' '

/** "00 000" / "00,000": a zero pattern grouped like formatNumber() output. */
export function zeroPattern(digits: number, locale: Locale): string {
  const sep = locale === 'en' ? ',' : NNBSP
  const s = '0'.repeat(digits)
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

/** "31 %" in Uzbek and Russian, "31%" in English. */
export function percent(value: string | number, locale: Locale): string {
  return locale === 'en' ? `${value}%` : `${value}${NNBSP}%`
}
