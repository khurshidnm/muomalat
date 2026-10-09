import type { Payload, PayloadRequest } from 'payload'

/**
 * Read-only mode (CMS-SPEC §12.10): the emergency switch for an incident.
 * Two independent switches; either one turns it on:
 *
 * - `CMS_READ_ONLY=1` in the environment. It survives a compromised database,
 *   and only someone with server access can turn it off (restart without it).
 * - `site-settings.operations.readOnly`, which an admin flips in the admin.
 *
 * While it is on, the security concern refuses every staff create, update and
 * delete (src/payload/hooks/security/readOnly.ts), except an admin changing
 * `site-settings.operations`; system writes with `overrideAccess: true` (audit
 * rows, sessions) go on. The worker pauses Telegram posting and the scheduler
 * by asking `isReadOnly({ payload })` before each run. The public site keeps
 * serving.
 */

export const readOnlyFromEnv = () => /^(1|true|yes|on)$/i.test(process.env.CMS_READ_ONLY?.trim() ?? '')

/** The settings flag is re-read at most every 5 s per process, and at once after site-settings changes. */
const SETTINGS_TTL_MS = 5_000
let cached: { value: boolean; at: number } | undefined

/** Drop the cached settings flag (site-settings afterChange). */
export function forgetReadOnlySetting() {
  cached = undefined
}

/**
 * `site-settings.operations.readOnly`. Inside a request the read joins the
 * request's transaction (`req`, same locale: payloadcms#18246 does not apply).
 * A failed read throws, so the write it guards fails too.
 */
export async function readOnlyFromSettings(payload: Payload, req?: PayloadRequest): Promise<boolean> {
  const now = Date.now()
  if (cached && now - cached.at < SETTINGS_TTL_MS) return cached.value
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
    select: { operations: { readOnly: true } },
    ...(req ? { req } : {}),
  })
  const value = (settings as { operations?: { readOnly?: boolean | null } | null })?.operations?.readOnly === true
  cached = { value, at: now }
  return value
}

/** Whether the CMS is read-only now. Pass `req` inside a request, `payload` alone in the worker. */
export async function isReadOnly({ payload, req }: { payload?: Payload; req?: PayloadRequest }): Promise<boolean> {
  if (readOnlyFromEnv()) return true
  const instance = payload ?? req?.payload
  if (!instance) return false
  return readOnlyFromSettings(instance, req)
}
