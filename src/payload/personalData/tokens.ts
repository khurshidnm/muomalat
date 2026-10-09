import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { isLocale, localePath, type Locale } from '../../i18n/config'

/**
 * Tokens and links for the personal-data routes.
 *
 * - Digest confirmation: a random token in the e-mail; only its SHA-256 is
 *   stored (`confirmTokenHash`), and it is cleared once used.
 * - Unsubscribe: HMAC of the subscriber id, so every digest e-mail can carry
 *   a working link without storing anything, and old links keep working.
 * - Rights requests: the request itself travels in the link, encrypted and
 *   authenticated (AES-256-GCM), so the address never appears in a URL or an
 *   access log; nothing is stored until the person confirms it (§13.3:
 *   verified by an e-mailed link).
 *
 * The keys are derived from PAYLOAD_SECRET with a purpose label, so a token
 * made for one purpose never verifies for another.
 */

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** 256-bit random token, URL-safe. */
export const randomToken = () => randomBytes(32).toString('base64url')

function key(purpose: string): Buffer {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set')
  return createHmac('sha256', secret).update(`muomalat:personal-data:${purpose}`).digest()
}

const mac = (purpose: string, body: string) => createHmac('sha256', key(purpose)).update(body).digest('base64url')

export function sign(purpose: string, body: string): string {
  return `${body}.${mac(purpose, body)}`
}

/** The signed body, or null when the token was not made by us for this purpose. */
export function verify(purpose: string, token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 2048) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(mac(purpose, body))
  return given.length === expected.length && timingSafeEqual(given, expected) ? body : null
}

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

export const unsubscribeToken = (subscriberId: number | string) => sign('unsubscribe', String(subscriberId))

export function readUnsubscribeToken(token: unknown): number | null {
  const body = verify('unsubscribe', token)
  const id = body && /^\d{1,12}$/.test(body) ? Number(body) : NaN
  return Number.isSafeInteger(id) ? id : null
}

// ---------------------------------------------------------------------------
// Rights requests (§13.3)
// ---------------------------------------------------------------------------

export const RIGHTS_KINDS = ['delete', 'suspend', 'access'] as const
export type RightsKind = (typeof RIGHTS_KINDS)[number]
export const isRightsKind = (value: unknown): value is RightsKind => RIGHTS_KINDS.includes(value as RightsKind)

/** A rights-request link works for 48 hours. */
export const RIGHTS_TOKEN_TTL_MS = 48 * 60 * 60 * 1000

export type RightsClaim = { email: string; kind: RightsKind; locale: Locale; issuedAt: number; nonce: string }

export function rightsToken(claim: Omit<RightsClaim, 'issuedAt' | 'nonce'>, now = Date.now()): string {
  const body = { e: claim.email, k: claim.kind, l: claim.locale, t: Math.floor(now / 1000), n: randomBytes(9).toString('base64url') }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key('rights'), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(body), 'utf8'), cipher.final()])
  return Buffer.concat([iv, data, cipher.getAuthTag()]).toString('base64url')
}

export function readRightsToken(token: unknown, now = Date.now()): RightsClaim | 'expired' | null {
  if (typeof token !== 'string' || token.length > 1024 || !/^[\w-]+$/.test(token)) return null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 12 + 16 + 2) return null
    const decipher = createDecipheriv('aes-256-gcm', key('rights'), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(raw.length - 16))
    const json = Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]).toString('utf8')
    const v = JSON.parse(json) as Record<string, unknown>
    if (typeof v.e !== 'string' || !isRightsKind(v.k) || typeof v.l !== 'string' || !isLocale(v.l)) return null
    if (typeof v.t !== 'number' || typeof v.n !== 'string') return null
    if (now - v.t * 1000 > RIGHTS_TOKEN_TTL_MS || v.t * 1000 > now + 60_000) return 'expired'
    return { email: v.e, kind: v.k, locale: v.l, issuedAt: v.t * 1000, nonce: v.n }
  } catch {
    // Wrong key, tampered or truncated: GCM authentication fails.
    return null
  }
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** Locale-free paths of the personal-data pages (under src/app/[lang]). */
export const PD_PATHS = {
  privacy: '/maxfiylik',
  rightsForm: '/maxfiylik#sorov',
  rightsConfirm: '/maxfiylik/tasdiqlash',
  digestConfirm: '/dayjest/tasdiqlash',
  unsubscribe: '/dayjest/bekor-qilish',
  /** RFC 8058 one-click endpoint for the List-Unsubscribe-Post header. */
  unsubscribeOneClick: '/dayjest/bekor-qilish/bir-bosish',
} as const

export function siteUrl(): string {
  return process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://muomalat.uz'
}

/** Absolute link to a personal-data page in an edition, with an optional token. */
export function pdLink(locale: Locale, path: string, token?: string): string {
  const [pathname, hash] = path.split('#')
  const url = new URL(localePath(locale, pathname), siteUrl())
  if (token) url.searchParams.set('t', token)
  if (hash) url.hash = hash
  return url.toString()
}

/**
 * Headers for every digest e-mail (the sender is a later wave): the link in
 * the body and the one-click POST both unsubscribe (§13.3).
 */
export function listUnsubscribeHeaders(subscriberId: number | string, locale: Locale): Record<string, string> {
  const token = unsubscribeToken(subscriberId)
  return {
    'List-Unsubscribe': `<${pdLink(locale, PD_PATHS.unsubscribeOneClick, token)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
