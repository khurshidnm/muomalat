import { createHmac, timingSafeEqual } from 'node:crypto'

import { parseTargets, type Targets } from './tags'

/**
 * Signed requests to /internal/revalidate (CMS-SPEC §8.4 step 2): the body is
 * `{"targets": …, "ts": <ms since epoch>}`, and `X-Signature` carries the hex
 * HMAC-SHA256 of the exact body bytes under INTERNAL_REVALIDATE_SECRET.
 */
export const SIGNATURE_HEADER = 'x-signature'

/** A request older (or newer) than this is refused, so a captured request cannot be replayed later. */
export const MAX_SKEW_MS = 60_000

/** The secret must carry at least 32 bytes (§2.5); a shorter one is treated as missing. */
export const MIN_SECRET_BYTES = 32

/** Bodies are small JSON; anything larger is refused before parsing. */
export const MAX_BODY_BYTES = 256 * 1024

export const secretUsable = (secret: string | undefined): secret is string => Buffer.byteLength(secret ?? '') >= MIN_SECRET_BYTES

export const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body, 'utf8').digest('hex')

/** Body and headers for one POST. */
export function signedRequest(targets: Targets, secret: string, now = Date.now()) {
  const body = JSON.stringify({ targets, ts: now })
  return { body, headers: { 'content-type': 'application/json', [SIGNATURE_HEADER]: sign(body, secret) } }
}

/** Constant-time comparison of two hex digests; a malformed or wrong-length value fails without timing hints. */
function sameDigest(expectedHex: string, givenHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex')
  const given = /^[0-9a-f]+$/i.test(givenHex) ? Buffer.from(givenHex, 'hex') : Buffer.alloc(0)
  // timingSafeEqual needs equal lengths; compare against the expected value itself so the work is the same.
  const ok = timingSafeEqual(expected, given.length === expected.length ? given : expected)
  return ok && given.length === expected.length
}

/**
 * Signatures seen within the window. A replay inside the 60 s window is
 * refused too; revalidation is harmless to repeat, but nothing outside the
 * worker should be able to trigger it at will.
 */
const seen = new Map<string, number>()

function remember(signature: string, now: number): boolean {
  for (const [sig, at] of seen) if (now - at > 2 * MAX_SKEW_MS) seen.delete(sig)
  if (seen.has(signature)) return false
  seen.set(signature, now)
  return true
}

export type Verdict = { ok: true; targets: Targets } | { ok: false; reason: string }

/**
 * Checks one request. Every refusal gets the same 403 from the route; the
 * reason is for the log only.
 */
export function verifySigned(input: {
  body: string
  signature: string | null
  /** cf-connecting-ip: the request came in through the Cloudflare tunnel, from outside. */
  viaTunnel: boolean
  secret: string | undefined
  now?: number
}): Verdict {
  const now = input.now ?? Date.now()
  if (input.viaTunnel) return { ok: false, reason: 'cf-connecting-ip present' }
  if (!secretUsable(input.secret)) return { ok: false, reason: 'INTERNAL_REVALIDATE_SECRET missing or shorter than 32 bytes' }
  if (Buffer.byteLength(input.body) > MAX_BODY_BYTES) return { ok: false, reason: 'body too large' }
  if (!input.signature || !sameDigest(sign(input.body, input.secret), input.signature.trim())) return { ok: false, reason: 'bad signature' }
  let parsed: { targets?: unknown; ts?: unknown }
  try {
    parsed = JSON.parse(input.body) as typeof parsed
  } catch {
    return { ok: false, reason: 'body is not JSON' }
  }
  if (typeof parsed.ts !== 'number' || !Number.isFinite(parsed.ts)) return { ok: false, reason: 'no timestamp' }
  if (Math.abs(now - parsed.ts) > MAX_SKEW_MS) return { ok: false, reason: 'timestamp outside the 60 s window' }
  const targets = parseTargets(parsed.targets)
  if (!targets) return { ok: false, reason: 'malformed targets' }
  if (!remember(input.signature.trim().toLowerCase(), now)) return { ok: false, reason: 'replayed signature' }
  return { ok: true, targets }
}
