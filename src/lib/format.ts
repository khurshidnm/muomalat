import type { Locale } from '@/i18n/config'
import { toCyrillic } from '@/i18n/translit'
import type { ArticleBlock } from '@/content/types'

/** All newsroom times are shown in Tashkent time (UTC+5, no DST), whatever the server TZ. */
const TASHKENT_OFFSET_MIN = 5 * 60

interface Parts {
  year: number
  month: number // 0-11
  day: number
  hours: number
  minutes: number
  weekday: number // 0 = Sunday
}

export function tashkentParts(iso: string | Date): Parts {
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.getTime()
  const d = new Date(t + TASHKENT_OFFSET_MIN * 60_000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  }
}

const MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const WEEKDAYS_UZ = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
const MONTHS_RU_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const pad = (n: number) => String(n).padStart(2, '0')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export type DateStyle =
  | 'time' // 14:05
  | 'dayMonth' // 8-oktabr
  | 'date' // 2026-yil 8-oktabr
  | 'datetime' // 2026-yil 8-oktabr, 14:05
  | 'dayMonthTime' // 8-oktabr, 14:05
  | 'weekdayDate' // Payshanba, 2026-yil 8-oktabr
  | 'monthYear' // 2026-yil oktabr
  | 'numeric' // 08.10.2026

function formatUz(p: Parts, style: DateStyle): string {
  const m = MONTHS_UZ[p.month]
  const time = `${pad(p.hours)}:${pad(p.minutes)}`
  switch (style) {
    case 'time':
      return time
    case 'dayMonth':
      return `${p.day}-${m}`
    case 'date':
      return `${p.year}-yil ${p.day}-${m}`
    case 'datetime':
      return `${p.year}-yil ${p.day}-${m}, ${time}`
    case 'dayMonthTime':
      return `${p.day}-${m}, ${time}`
    case 'weekdayDate':
      return `${cap(WEEKDAYS_UZ[p.weekday])}, ${p.year}-yil ${p.day}-${m}`
    case 'monthYear':
      return `${p.year}-yil ${m}`
    case 'numeric':
      return `${pad(p.day)}.${pad(p.month + 1)}.${p.year}`
  }
}

function formatRu(p: Parts, style: DateStyle): string {
  const m = MONTHS_RU_GEN[p.month]
  const time = `${pad(p.hours)}:${pad(p.minutes)}`
  switch (style) {
    case 'time':
      return time
    case 'dayMonth':
      return `${p.day} ${m}`
    case 'date':
      return `${p.day} ${m} ${p.year}`
    case 'datetime':
      return `${p.day} ${m} ${p.year}, ${time}`
    case 'dayMonthTime':
      return `${p.day} ${m}, ${time}`
    case 'weekdayDate':
      return `${cap(WEEKDAYS_RU[p.weekday])}, ${p.day} ${m} ${p.year}`
    case 'monthYear':
      return `${cap(MONTHS_RU[p.month])} ${p.year}`
    case 'numeric':
      return `${pad(p.day)}.${pad(p.month + 1)}.${p.year}`
  }
}

function formatEn(p: Parts, style: DateStyle): string {
  const m = MONTHS_EN[p.month]
  const time = `${pad(p.hours)}:${pad(p.minutes)}`
  switch (style) {
    case 'time':
      return time
    case 'dayMonth':
      return `${p.day} ${m}`
    case 'date':
      return `${p.day} ${m} ${p.year}`
    case 'datetime':
      return `${p.day} ${m} ${p.year}, ${time}`
    case 'dayMonthTime':
      return `${p.day} ${m}, ${time}`
    case 'weekdayDate':
      return `${WEEKDAYS_EN[p.weekday]}, ${p.day} ${m} ${p.year}`
    case 'monthYear':
      return `${m} ${p.year}`
    case 'numeric':
      return `${pad(p.day)}.${pad(p.month + 1)}.${p.year}`
  }
}

/** Format an ISO date in Tashkent time for the given interface locale. */
export function formatDate(iso: string, locale: Locale, style: DateStyle = 'date'): string {
  // Month-only values ("2026-06") are treated as the first of the month.
  const value = /^\d{4}-\d{2}$/.test(iso) ? `${iso}-01T12:00:00+05:00` : /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+05:00` : iso
  const p = tashkentParts(value)
  if (locale === 'ru') return formatRu(p, style)
  if (locale === 'en') return formatEn(p, style)
  const uz = formatUz(p, style)
  return locale === 'kr' ? toCyrillic(uz) : uz
}

/** YYYY-MM-DD of an ISO timestamp in Tashkent time; used to group feeds by day. */
export function tashkentDay(iso: string): string {
  const p = tashkentParts(iso)
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`
}

/**
 * Number formatting. Uzbek and Russian use a narrow no-break space for
 * thousands and a decimal comma; English uses comma and point.
 */
export function formatNumber(value: number, locale: Locale, fractionDigits?: number): string {
  const tag = locale === 'en' ? 'en-GB' : 'ru-RU'
  const out = new Intl.NumberFormat(tag, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits ?? 2,
  }).format(value)
  return out.replace(/ /g, ' ')
}

/** Words per minute for Uzbek long-form copy (longer agglutinative words). */
const WPM = 180

function blockText(b: ArticleBlock): string {
  switch (b.type) {
    case 'p':
    case 'h2':
    case 'h3':
    case 'quote':
    case 'callout':
      return b.text
    case 'list':
      return b.items.join(' ')
    case 'qa':
      return `${b.question} ${b.answer.join(' ')}`
    case 'factbox':
      return b.items.map((i) => `${i.label} ${i.value}`).join(' ')
    case 'table':
      return `${b.caption} ${b.rows.flat().join(' ')}`
    default:
      return ''
  }
}

export function readingMinutes(body: ArticleBlock[], lead = ''): number {
  const words = [lead, ...body.map(blockText)].join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WPM))
}

/**
 * Newsroom-style date for story lists: "14:05" today, "Kecha, 18:10"
 * yesterday, "6-oktabr" earlier this year. `now` defaults to the content
 * clock so static pages stay consistent with the mock data.
 */
export function smartDate(
  iso: string,
  locale: Locale,
  labels: { today: string; yesterday: string },
  now: string,
): { text: string; isToday: boolean } {
  const day = tashkentDay(iso)
  const today = tashkentDay(now)
  const y = new Date(Date.parse(`${today}T12:00:00+05:00`) - 86_400_000)
  const yesterday = tashkentDay(y.toISOString())
  if (day === today) return { text: formatDate(iso, locale, 'time'), isToday: true }
  if (day === yesterday) return { text: `${labels.yesterday}, ${formatDate(iso, locale, 'time')}`, isToday: false }
  const sameYear = day.slice(0, 4) === today.slice(0, 4)
  return { text: formatDate(iso, locale, sameYear ? 'dayMonth' : 'date'), isToday: false }
}
