import type { Access, FieldAccess, PayloadRequest } from 'payload'

import { assertEdgeIdentity, edgeIdentityRequired, isTrustedInternal } from './edge'

/**
 * Role helpers. Every access function in the CMS goes through this module
 * (CMS-SPEC §4.3), so a disabled account or an unknown role is denied in one
 * place.
 */
export const ROLES = ['reporter', 'editor', 'eic', 'commercial', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const roleOptions: { label: string; value: Role }[] = [
  { label: 'Muxbir', value: 'reporter' },
  { label: 'Muharrir', value: 'editor' },
  { label: 'Bosh muharrir', value: 'eic' },
  { label: 'Tijorat boʻlimi', value: 'commercial' },
  { label: 'Administrator', value: 'admin' },
]

type MaybeUser = { active?: boolean | null; role?: string | null } | null | undefined

/** The role of an active user; undefined for anonymous or disabled accounts. */
export function userRole(req: PayloadRequest): Role | undefined {
  const user = req.user as MaybeUser
  if (!user || user.active === false) return undefined
  return ROLES.includes(user.role as Role) ? (user.role as Role) : undefined
}

export const hasRole = (req: PayloadRequest, ...roles: Role[]) => {
  const role = userRole(req)
  return role !== undefined && roles.includes(role)
}

/**
 * Every collection and global access function is wrapped in withEdge (CMS-SPEC
 * §4.3). With ACCESS_JWT_REQUIRED=true a logged-in request must carry a valid
 * Cloudflare Access JWT for the same email (./edge.ts); otherwise the access
 * call throws a 403 and the mismatch is audited. The check runs once per
 * request (cached in `req.context`); anonymous requests and trusted internal
 * calls skip it, and without the flag the wrapped function runs unchanged.
 *
 * Read-only mode (§12.10) is not decided here: an access function is not told
 * which operation asked for it, and the admin evaluates read, update and
 * delete with the same arguments. The security concern's `beforeOperation`
 * guard refuses every write instead (src/payload/hooks/security/readOnly.ts).
 */
export const withEdge =
  <A extends Access>(fn: A): A =>
  ((args: Parameters<A>[0]) => {
    const { req } = args
    if (!req.user || !edgeIdentityRequired() || isTrustedInternal(req)) return fn(args)
    return assertEdgeIdentity(req).then(() => fn(args))
  }) as A

export const isAdmin: Access = ({ req }) => hasRole(req, 'admin')
export const isStaff: Access = ({ req }) => userRole(req) !== undefined
export const denyAll: Access = () => false

export const isAdminField: FieldAccess = ({ req }) => hasRole(req, 'admin')
