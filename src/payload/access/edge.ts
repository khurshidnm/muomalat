import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose'
import { APIError, type PayloadRequest } from 'payload'

import { hit } from '../../lib/rateLimit'
import { recordAudit } from '../audit'

/**
 * Edge identity (CMS-SPEC §12.2, PHASE0-FINDINGS §1.5). Cloudflare Access
 * sits in front of cms.muomalat.uz and adds a signed JWT to every request it
 * lets through (`Cf-Access-Jwt-Assertion`). With ACCESS_JWT_REQUIRED=true a
 * logged-in request must carry a valid token for the same email as the
 * Payload user, so a stolen Payload cookie is useless without the matching
 * Access session.
 *
 * Checked in two places: users `beforeLogin` (a 403 there leaves no session
 * and no failed-login count) and `withEdge`, which wraps every access
 * function, on every request. The result is cached in `req.context`. It
 * cannot be an `auth.strategies` entry: Payload catches strategy errors, so a
 * strategy cannot refuse a request.
 *
 * Promoted from .spike/auth/access-jwt.ts (15 cases, key rotation, JWKS
 * outage), with a 5 s refetch cooldown and `type: 'app'` required.
 */

export const ACCESS_HEADER = 'cf-access-jwt-assertion'

export type AccessVerifierOptions = {
  /** e.g. 'muomalat.cloudflareaccess.com' (CF_ACCESS_TEAM_DOMAIN) */
  teamDomain: string
  /** Application Audience (AUD) tag (CF_ACCESS_AUD) */
  audience: string
  /** Tests only; default https://<teamDomain>/cdn-cgi/access/certs */
  jwksUrl?: string
  /** Tests only; default https://<teamDomain> */
  issuer?: string
  /** Seconds of clock skew tolerated for exp, nbf and iat. */
  clockTolerance?: number
  /**
   * Minimum ms between JWKS refetches triggered by an unknown `kid`. A token
   * signed with a rotated-in key is refused for at most this long after the
   * last fetch; then one refetch accepts it. 5–10 s per §12.2.
   */
  cooldownDuration?: number
}

export type AccessResult =
  | { ok: true; email: string; sub?: string; country?: string; exp?: number }
  | { ok: false; reason: string; email?: string }

export type AccessVerifier = (headers: Headers, expectedEmail?: string | null) => Promise<AccessResult>

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export function createAccessVerifier(opts: AccessVerifierOptions): AccessVerifier {
  const issuer = opts.issuer ?? `https://${opts.teamDomain}`
  const jwks = createRemoteJWKSet(new URL(opts.jwksUrl ?? `https://${opts.teamDomain}/cdn-cgi/access/certs`), {
    timeoutDuration: 5_000, // the certs endpoint hangs → the check fails closed
    cooldownDuration: opts.cooldownDuration ?? 5_000,
    cacheMaxAge: 10 * 60_000,
  })

  /**
   * @param headers request headers
   * @param expectedEmail the Payload user's email; omit to check the edge identity only
   */
  return async function verifyAccess(headers, expectedEmail) {
    const token = headers.get(ACCESS_HEADER)
    if (!token) return { ok: false, reason: 'missing_header' }
    let payload: JWTPayload
    try {
      ;({ payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: opts.audience, // Cloudflare sends `aud` as an array; jose accepts that
        algorithms: ['RS256'],
        requiredClaims: ['exp', 'iat', 'email'],
        clockTolerance: opts.clockTolerance ?? 5,
      }))
    } catch (e) {
      const code =
        e instanceof errors.JOSEError ? e.code : String((e as { code?: unknown })?.code ?? (e as Error)?.name ?? 'ERR_UNKNOWN')
      const claim = e instanceof errors.JWTClaimValidationFailed ? `:${e.claim}` : ''
      return { ok: false, reason: `${code}${claim}` }
    }
    // Application tokens only. Access service tokens carry no email and are
    // refused by design; organization tokens have type 'org'.
    if (payload.type !== 'app') return { ok: false, reason: 'wrong_token_type' }
    const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : ''
    if (!email) return { ok: false, reason: 'no_email_claim' }
    if (expectedEmail != null && email !== normalizeEmail(expectedEmail)) {
      return { ok: false, reason: 'email_mismatch', email }
    }
    return {
      ok: true,
      email,
      sub: payload.sub,
      country: typeof payload.country === 'string' ? payload.country : undefined,
      exp: payload.exp,
    }
  }
}

// ---------------------------------------------------------------------------
// The app's verifier and the per-request check
// ---------------------------------------------------------------------------

/** Read on every call, so a test (or an operator) can switch it without a restart. */
export const edgeIdentityRequired = () => process.env.ACCESS_JWT_REQUIRED === 'true'

/**
 * Trusted in-process callers (worker, scripts) pass this as `context` on
 * Local API calls made without an HTTP `req`; HTTP requests cannot set
 * `req.context` (PHASE0 item 3). Never pass it together with an HTTP `req`:
 * context merges into `req.context` and stays there for the rest of the request.
 */
export const TRUSTED_INTERNAL = { trustedInternal: true } as const

export const isTrustedInternal = (req: Pick<PayloadRequest, 'context'>) => req.context?.trustedInternal === true

let configured: { key: string; verify: AccessVerifier } | undefined
let override: AccessVerifier | undefined

/** Tests only: verify against a local JWKS instead of CF_ACCESS_TEAM_DOMAIN. `undefined` restores the default. */
export function setAccessVerifier(verify: AccessVerifier | undefined) {
  override = verify
}

function appVerifier(): AccessVerifier | undefined {
  if (override) return override
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const audience = process.env.CF_ACCESS_AUD?.trim()
  if (!teamDomain || !audience) return undefined
  const key = `${teamDomain}|${audience}`
  if (configured?.key !== key) configured = { key, verify: createAccessVerifier({ teamDomain, audience }) }
  return configured.verify
}

type Cached = { email: string; result: Promise<AccessResult>; audited: boolean }
/** A symbol, so no Local API `context` object can pre-fill the cache by accident. */
const CACHE = Symbol.for('muomalat.edgeIdentity')

function cacheOf(req: PayloadRequest): Record<symbol, Cached | undefined> {
  if (!req.context) req.context = {}
  return req.context as unknown as Record<symbol, Cached | undefined>
}

/**
 * Verify the request's Access JWT against `email`, once per request: the
 * promise is cached in `req.context`, so the many access functions the admin
 * evaluates in parallel share one verification.
 */
export function verifyEdgeIdentity(req: PayloadRequest, email: string): Promise<AccessResult> {
  const expected = normalizeEmail(email)
  const cache = cacheOf(req)
  const hitEntry = cache[CACHE]
  if (hitEntry && hitEntry.email === expected) return hitEntry.result
  const verify = appVerifier()
  const result = verify ? verify(req.headers, expected) : Promise.resolve<AccessResult>({ ok: false, reason: 'access_not_configured' })
  cache[CACHE] = { email: expected, result, audited: false }
  return result
}

type EdgeUser = { id?: number | string; email?: string | null; role?: string | null; collection?: string }

/** The edge identity does not match the Payload user. */
export class EdgeIdentityError extends APIError {
  constructor(reason: string) {
    super(
      'Kirish rad etildi: Cloudflare Access orqali tasdiqlangan hisob bu CMS hisobiga mos kelmaydi. Sahifani yangilang yoki qaytadan kiring.',
      403,
      { reason },
      true,
    )
  }
}

/**
 * Throw a 403 unless the request carries a valid Access JWT for `user`
 * (default: the request's user). A no-op when ACCESS_JWT_REQUIRED is not
 * `true`, for anonymous requests and for trusted internal calls.
 */
export async function assertEdgeIdentity(req: PayloadRequest, user: EdgeUser | null | undefined = req.user as EdgeUser | null) {
  if (!edgeIdentityRequired() || !user || isTrustedInternal(req)) return
  const result = await verifyEdgeIdentity(req, user.email ?? '')
  if (result.ok) return
  const entry = cacheOf(req)[CACHE]
  if (entry && !entry.audited) {
    entry.audited = true
    await auditEdgeMismatch(req, user, result)
  }
  throw new EdgeIdentityError(result.reason)
}

/**
 * `auth.edge_mismatch` (§9.2), at most once per request and once a minute per
 * user and reason, so a JWKS outage does not write a row per request. The row
 * is committed in a transaction of its own (`independent`), so it survives
 * the 403 that rolls the request back; at login `req.user` is not set yet, so
 * the actor is passed in. The alert (§9.3) is the audit concern's.
 */
async function auditEdgeMismatch(req: PayloadRequest, user: EdgeUser, result: Extract<AccessResult, { ok: false }>) {
  if (!hit(`edge-audit:${user.id ?? user.email}:${result.reason}`, 1, 60_000).ok) return
  try {
    await recordAudit(
      req,
      {
        action: 'auth.edge_mismatch',
        actor: { id: user.id ?? null, email: user.email ?? null, role: user.role ?? null },
        collection: 'users',
        docId: user.id ?? null,
        summary: result.email ? `${result.reason}: Access ${result.email}` : result.reason,
      },
      { independent: true },
    )
  } catch (err) {
    req.payload.logger.error({ err, msg: 'audit auth.edge_mismatch failed' })
  }
}
