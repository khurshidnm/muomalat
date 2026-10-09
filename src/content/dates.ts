/**
 * Dates in the content model are ISO 8601 with the Tashkent offset
 * (2026-10-08T14:05:00+05:00; src/content/types.ts). Payload stores
 * timestamptz and returns UTC strings ending in `Z` (CMS-SPEC §3.1,
 * PHASE0-FINDINGS §1.8), so the read layer formats them itself.
 */
const OFFSET_MS = 5 * 60 * 60_000
const pad = (n: number) => String(n).padStart(2, '0')

/** An instant as Tashkent wall time with +05:00, to the second: "2026-10-08T09:40:00+05:00". */
export function tashkentIso(value: string | Date): string {
  const t = typeof value === 'string' ? Date.parse(value) : value.getTime()
  const d = new Date(t + OFFSET_MS)
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+05:00`
  )
}

/** tashkentIso for an optional stored value; undefined for empty or unparsable input. */
export function tashkentIsoOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined
  const t = typeof value === 'string' ? Date.parse(value) : value.getTime()
  return Number.isNaN(t) ? undefined : tashkentIso(new Date(t))
}
