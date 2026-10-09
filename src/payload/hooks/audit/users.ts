import {
  AuthenticationError,
  commitTransaction,
  initTransaction,
  type CollectionAfterErrorHook,
  type CollectionAfterForgotPasswordHook,
  type CollectionAfterLoginHook,
  type CollectionAfterLogoutHook,
  type CollectionAfterOperationHook,
  type CollectionBeforeOperationHook,
  type PayloadRequest,
} from 'payload'

import { recordAudit, requestMeta, type AuditEntry } from '../../audit/writer'
import { str } from './common'
import type { Diff } from './diff'

/**
 * Account and authentication events (CMS-SPEC §9.2 "Auth", "Users", §9.4,
 * PHASE0 §1.4). Login, logout, password reset and unlock rows are written
 * inside the operation's transaction; failed logins in one of their own,
 * because Payload has already rolled the login back when afterError runs.
 */

type UserDoc = { id?: number | string; name?: string | null; email?: string | null; role?: string | null; active?: boolean | null }

const CONTEXT_RESET = 'auditPasswordReset'
const CONTEXT_UNLOCK = 'auditUnlockTransaction'

/** cf-ipcountry sends XX when Cloudflare does not know the country; T1 (Tor) counts as a country. */
const UNKNOWN_COUNTRY = 'XX'

/** The rows for one save of a user account (create or update). */
export function userEntries(args: {
  operation: 'create' | 'update'
  previous: UserDoc
  doc: UserDoc
  diff: Diff
  passwordChanged: boolean
}): AuditEntry[] {
  const { operation, previous, doc, diff, passwordChanged } = args
  if (operation === 'create') {
    return [{ action: 'user.create', summary: `Rol: ${doc.role ?? '—'}`, after: { role: doc.role ?? null, active: doc.active !== false } }]
  }
  const out: AuditEntry[] = []
  if (doc.role !== undefined && previous.role !== doc.role) {
    out.push({
      action: 'user.role_change',
      summary: `${previous.role ?? '—'} → ${doc.role ?? '—'}`,
      before: { role: previous.role ?? null },
      after: { role: doc.role ?? null },
    })
  }
  if (doc.active !== undefined && (previous.active !== false) !== (doc.active !== false)) {
    out.push({ action: doc.active === false ? 'user.disable' : 'user.enable', before: { active: previous.active !== false }, after: { active: doc.active !== false } })
  }
  if (passwordChanged) out.push({ action: 'auth.password_changed', summary: 'Parol hisob sozlamalarida oʻzgartirildi' })
  if (out.length) return out
  // Nothing a person can see changed: Payload's own writes through update (the
  // reset token of forgotPassword) or a save without changes.
  if (!diff.paths.length) return []
  // Values only for the admin fields (offboardedAt); personal and auth fields are paths only.
  return [{ action: 'user.update', before: diff.before, after: diff.after }]
}

const userRef = (user: UserDoc | null | undefined) => ({
  collection: 'users',
  docId: user?.id ?? null,
  docTitle: str(user?.name),
})

/**
 * Successful login (§9.2 `auth.login`) and the country check (§3.13, §9.3):
 * `lastLoginAt`, `lastLoginCountry` and `knownCountries` are updated, and a
 * country not seen before is recorded on the row (before/after
 * `knownCountries`), which is what the new-country alert reads. Runs inside the
 * login transaction, after the session is created. A password reset also logs
 * the user in; it records `auth.password_changed` first.
 */
export const auditLogin: CollectionAfterLoginHook = async ({ req, user }) => {
  const u = user as UserDoc & { knownCountries?: unknown }
  const { country } = requestMeta(req)
  const known = Array.isArray(u.knownCountries) ? u.knownCountries.filter((c): c is string => typeof c === 'string') : []
  const tracked = country && country !== UNKNOWN_COUNTRY ? country : null
  const isNew = Boolean(tracked && !known.includes(tracked))
  const nextKnown = isNew ? [...known, tracked as string] : known

  await req.payload.db.updateOne({
    collection: 'users',
    id: u.id as number,
    data: {
      lastLoginAt: new Date().toISOString(),
      ...(tracked ? { lastLoginCountry: tracked } : {}),
      ...(isNew ? { knownCountries: nextKnown } : {}),
    },
    req,
    returning: false,
  })

  if ((req.context as Record<string, unknown>)[CONTEXT_RESET]) {
    await recordAudit(req, { ...userRef(u), action: 'auth.password_changed', summary: 'Parol tiklash havolasi orqali oʻrnatildi' })
  }
  await recordAudit(req, {
    ...userRef(u),
    action: 'auth.login',
    summary: isNew ? `Yangi mamlakatdan kirish: ${tracked}` : null,
    changedPaths: isNew ? ['knownCountries'] : null,
    before: isNew ? { knownCountries: known } : null,
    after: isNew ? { knownCountries: nextKnown } : null,
  })
  return user
}

export const auditLogout: CollectionAfterLogoutHook = async ({ req }) => {
  await recordAudit(req, { ...userRef(req.user as UserDoc), action: 'auth.logout' })
}

const emailOf = (data: unknown) => {
  const email = (data as { email?: unknown } | undefined)?.email
  return typeof email === 'string' ? email.toLowerCase().trim().slice(0, 320) : null
}

async function userByEmail(req: PayloadRequest, email: string | null) {
  if (!email) return null
  return (await req.payload.db.findOne({ collection: 'users', where: { email: { equals: email } }, req })) as
    | (UserDoc & { loginAttempts?: number | null; lockUntil?: string | null })
    | null
}

/**
 * Failed REST logins (§9.4, PHASE0 §1.4). The admin's login form posts to
 * /api/users/login, so it is covered; a Local API `payload.login` failure
 * never reaches afterError (scripts only).
 *
 * - `auth.login_failed` for a wrong password, an unknown email, or an attempt
 *   on a locked account, with the attempted email, IP and country.
 * - `auth.locked` when this attempt set the lock: Payload writes `lockUntil`
 *   on the fifth failure (outside any transaction) and still answers that one
 *   with the ordinary AuthenticationError; later attempts get LockedAuth.
 * - The LockedAuth answer ("This user is locked…") would reveal that the
 *   account exists, so it is replaced with the generic login error, same
 *   status and shape.
 *
 * A row that cannot be written is logged and does not change the answer: the
 * login has already failed, and the visitor must not learn more from a 500.
 */
export const auditFailedLogin: CollectionAfterErrorHook = async ({ error, req }) => {
  if (!req?.pathname?.endsWith('/users/login')) return
  const name = (error as { name?: string } | undefined)?.name
  if (name !== 'AuthenticationError' && name !== 'LockedAuth') return

  const email = emailOf(req.data)
  try {
    const user = await userByEmail(req, email)
    const base = { ...userRef(user), actor: { id: null, email, role: 'anonymous' } }
    await recordAudit(
      req,
      { ...base, action: 'auth.login_failed', summary: name === 'LockedAuth' ? 'Bloklangan hisobga kirish urinishi' : 'Notoʻgʻri parol yoki nomaʼlum e-pochta' },
      { independent: true },
    )
    const lockUntil = user?.lockUntil ? new Date(user.lockUntil) : null
    if (name === 'AuthenticationError' && lockUntil && lockUntil.getTime() > Date.now()) {
      await recordAudit(
        req,
        {
          ...base,
          action: 'auth.locked',
          summary: `${user?.loginAttempts ?? '?'} ta muvaffaqiyatsiz urinish; blok ${lockUntil.toISOString()} gacha`,
          after: { loginAttempts: user?.loginAttempts ?? null, lockUntil: lockUntil.toISOString() },
        },
        { independent: true },
      )
    }
  } catch (err) {
    req.payload.logger.error({ err, msg: 'audit: failed-login row was not written' })
  }

  if (name === 'LockedAuth') {
    return { response: { errors: [{ message: new AuthenticationError(req.t).message }] }, status: 401 }
  }
}

/** A reset link was requested for an existing account (Payload stays silent for unknown emails). */
export const auditForgotPassword: CollectionAfterForgotPasswordHook = async ({ args }) => {
  const req = (args as { req?: PayloadRequest } | undefined)?.req
  if (!req) return
  const email = emailOf((args as { data?: unknown }).data)
  const user = await userByEmail(req, email)
  await recordAudit(req, {
    ...userRef(user),
    action: 'auth.password_reset_requested',
    actor: req.user ? undefined : { id: null, email, role: 'anonymous' },
  })
}

/**
 * Before auth operations that write without collection hooks:
 * - `resetPassword` logs the user in; afterLogin records the change.
 * - `unlock` commits before its afterOperation hook, so the audit concern
 *   opens the transaction here; unlock then joins it instead of committing,
 *   and finishUnlock writes the row and commits. A failed unlock is rolled
 *   back by Payload together with the transaction.
 */
export const authOperations: CollectionBeforeOperationHook = async ({ operation, req }) => {
  const context = req.context as Record<string, unknown>
  if (operation === 'resetPassword') context[CONTEXT_RESET] = true
  if (operation === 'unlock' && (await initTransaction(req))) context[CONTEXT_UNLOCK] = true
}

export const finishUnlock: CollectionAfterOperationHook = async ({ args, operation, req, result }) => {
  if (operation !== 'unlock') return result
  const context = req.context as Record<string, unknown>
  const user = await userByEmail(req, emailOf((args as { data?: unknown }).data))
  await recordAudit(req, { ...userRef(user), action: 'auth.unlock' })
  if (context[CONTEXT_UNLOCK]) {
    delete context[CONTEXT_UNLOCK]
    await commitTransaction(req)
  }
  return result
}
