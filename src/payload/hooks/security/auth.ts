import type {
  CollectionAfterErrorHook,
  CollectionAfterLoginHook,
  CollectionBeforeLoginHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from 'payload'
import { APIError, ValidationError } from 'payload'
import { generateExpiredPayloadCookie } from 'payload/shared'

import { clientIp, hit, refund } from '../../../lib/rateLimit'
import { assertEdgeIdentity } from '../../access/edge'
import { passwordProblem } from '../../security/password'

/**
 * Security hooks on the users collection (CMS-SPEC §12.2, §12.3, §9.4).
 */

// ---------------------------------------------------------------------------
// Login rate limit (§12.3)
// ---------------------------------------------------------------------------

/**
 * 10 attempts per 15 minutes per IP, for login and for forgot-password, each
 * counted on its own. `beforeOperation` runs before the password is checked,
 * so the eleventh attempt gets 429 without touching the hash. A correct login
 * is refunded: many staff behind one office or carrier address must not lock
 * each other out, so in effect the limit counts failures. Per account,
 * Payload's lockout applies (5 failures, 15 minutes).
 */
export const LOGIN_LIMIT = { max: 10, windowMs: 15 * 60_000 } as const

const limitKey = (operation: 'login' | 'forgotPassword', req: PayloadRequest) => `${operation}:ip:${clientIp(req.headers)}`

export const loginRateLimit: CollectionBeforeOperationHook = ({ operation, req }) => {
  if (operation !== 'login' && operation !== 'forgotPassword') return
  const result = hit(limitKey(operation, req), LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)
  if (result.ok) return
  req.responseHeaders = new Headers({ 'Retry-After': String(result.retryAfterSeconds) })
  // The generic login error, as for a wrong password (§12.3); 429 tells the client to wait.
  throw new APIError(req.t('error:emailOrPasswordIncorrect'), 429, undefined, true)
}

export const refundSuccessfulLogin: CollectionAfterLoginHook = ({ req, user }) => {
  refund(limitKey('login', req))
  return user
}

// ---------------------------------------------------------------------------
// Edge identity (§12.2)
// ---------------------------------------------------------------------------

/**
 * The Access JWT must belong to the account being logged in to. A 403 here
 * leaves no session and no failed-login count (PHASE0 §1.5).
 */
export const edgeIdentityAtLogin: CollectionBeforeLoginHook = async ({ req, user }) => {
  await assertEdgeIdentity(req, user)
  return user
}

/**
 * A token refresh needs an active account and, when required, the matching
 * Access identity: refresh calls no access function, so withEdge alone would
 * let a disabled account or a stolen cookie keep renewing its session.
 */
export const refreshGuard: CollectionBeforeOperationHook = async ({ operation, req }) => {
  if (operation !== 'refresh' || !req.user) return
  if ((req.user as { active?: boolean | null }).active === false) throw new APIError(req.t('error:notAllowedToPerformAction'), 403)
  await assertEdgeIdentity(req)
}

// ---------------------------------------------------------------------------
// Password policy (§12.2)
// ---------------------------------------------------------------------------

/**
 * Runs in `beforeOperation`, not `beforeValidate`: reset-password hashes the
 * new password before any validate hook sees it, and its beforeValidate data
 * carries no password at all.
 */
export const passwordPolicy: CollectionBeforeOperationHook = async ({ args, collection, operation, req }) => {
  if (operation !== 'create' && operation !== 'update' && operation !== 'resetPassword') return
  const password = (args as { data?: { password?: unknown } })?.data?.password
  if (typeof password !== 'string' || password === '') return
  const message = await passwordProblem(password, req.payload.logger)
  if (message) throw new ValidationError({ collection: collection.slug, errors: [{ message, path: 'password' }], req }, req.t)
}

// ---------------------------------------------------------------------------
// Logout (PHASE0 risk 23)
// ---------------------------------------------------------------------------

/**
 * The admin's logout view calls `POST /api/users/logout` twice in production
 * builds. The first call ends the session; when the second arrives after it,
 * Payload finds no user and answers 400 "No User". Logging out an ended
 * session is a success: answer 200 and expire the cookie again.
 */
export const idempotentLogout: CollectionAfterErrorHook = ({ collection, error, req }) => {
  if (!req.pathname?.endsWith(`/${collection.slug}/logout`)) return
  if (!(error instanceof APIError) || error.status !== 400 || error.message !== 'No User') return
  const headers = req.responseHeaders ?? new Headers()
  headers.append(
    'Set-Cookie',
    generateExpiredPayloadCookie({ collectionAuthConfig: collection.auth, config: req.payload.config, cookiePrefix: req.payload.config.cookiePrefix }),
  )
  req.responseHeaders = headers
  return { status: 200, response: { message: req.t('authentication:logoutSuccessful') } }
}
