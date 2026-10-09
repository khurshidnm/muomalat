/**
 * Tashkent wall-clock helpers for the alerts (office hours) and the nightly
 * export (one file per Tashkent day). Uzbekistan keeps UTC+05:00 all year.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000

const shifted = (d: Date | string | number) => new Date(new Date(d).getTime() + OFFSET_MS)

/** `YYYY-MM-DD` in Tashkent. */
export const tashkentDay = (d: Date | string | number) => shifted(d).toISOString().slice(0, 10)

/** `HH:MM` in Tashkent. */
export const tashkentTime = (d: Date | string | number) => shifted(d).toISOString().slice(11, 16)

/** `09.10.2026 14:03` in Tashkent, the admin's date format. */
export function tashkentStamp(d: Date | string | number): string {
  const iso = shifted(d).toISOString()
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)} ${iso.slice(11, 16)}`
}

/** The UTC instant at which a Tashkent day (`YYYY-MM-DD`) starts. */
export const tashkentDayStart = (day: string) => new Date(Date.parse(`${day}T00:00:00.000Z`) - OFFSET_MS)
