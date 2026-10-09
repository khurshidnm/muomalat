import { createHash } from 'node:crypto'
import { headers } from 'next/headers'

import { splitLocale, type Locale } from '@/i18n/config'
import { clientIp, hit } from '@/lib/rateLimit'

/**
 * Server-side context shared by the form actions: which edition and page the
 * form was sent from, and the app-level rate limits (CMS-SPEC §12.3; the
 * Cloudflare Free plan leaves form limiting to the app).
 *
 * The edition comes from the Referer, which the browser sends for these
 * same-origin POSTs (Referrer-Policy strict-origin-when-cross-origin, §12.4),
 * with and without JavaScript. Without one the form counts as Uzbek Latin.
 */
export type FormContext = { locale: Locale; path: string | null; ip: string }

export async function formContext(): Promise<FormContext> {
  const h = await headers()
  const ip = clientIp(h)
  const referer = h.get('referer')
  if (!referer) return { locale: 'uz', path: null, ip }
  try {
    const url = new URL(referer)
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host && url.host !== host) return { locale: 'uz', path: null, ip }
    const { locale, path } = splitLocale(url.pathname)
    return { locale, path: path.slice(0, 300), ip }
  } catch {
    return { locale: 'uz', path: null, ip }
  }
}

/**
 * Limits per form, counted only for submissions that pass validation (they
 * are the ones that store a record or send a mail):
 * - per IP: generous, because mobile carriers put many people behind one
 *   address (CGNAT);
 * - per identity (the e-mail, or the phone where e-mail is optional): stops
 *   one address being flooded with confirmation mails.
 * The identity is hashed, so the limiter never holds an address in memory.
 */
export const FORM_LIMITS = {
  ip: { max: 20, windowMs: 10 * 60_000 },
  identity: { max: 5, windowMs: 60 * 60_000 },
  /** Digest and rights links: fewer mails to one address. */
  mailIdentity: { max: 3, windowMs: 60 * 60_000 },
  /** Confirm and unsubscribe buttons: tokens are unguessable, this only stops hammering. */
  token: { max: 30, windowMs: 10 * 60_000 },
} as const

export type LimitHit = 'ip' | 'identity' | null

const hashKey = (value: string) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32)

export function limitForm(
  form: string,
  ip: string,
  identity: string | undefined,
  perIdentity: { max: number; windowMs: number } = FORM_LIMITS.identity,
): LimitHit {
  if (!hit(`form:${form}:ip:${ip}`, FORM_LIMITS.ip.max, FORM_LIMITS.ip.windowMs).ok) return 'ip'
  if (identity && !hit(`form:${form}:id:${hashKey(identity)}`, perIdentity.max, perIdentity.windowMs).ok) return 'identity'
  return null
}

export function limitToken(action: string, ip: string): boolean {
  return hit(`token:${action}:ip:${ip}`, FORM_LIMITS.token.max, FORM_LIMITS.token.windowMs).ok
}
