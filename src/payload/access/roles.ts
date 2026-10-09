import type { Access, FieldAccess, PayloadRequest } from 'payload'

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

export const isAdmin: Access = ({ req }) => hasRole(req, 'admin')
export const isStaff: Access = ({ req }) => userRole(req) !== undefined
export const denyAll: Access = () => false

export const isAdminField: FieldAccess = ({ req }) => hasRole(req, 'admin')
