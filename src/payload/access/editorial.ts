import type { Access, CollectionConfig, FieldAccess, PayloadRequest, Where } from 'payload'

import { hasRole, type Role, userRole, withEdge } from './roles'

/**
 * Access for the editorial collections other than articles (CMS-SPEC §4.2,
 * "Other collections"). Every collection-level function is wrapped in
 * withEdge.
 *
 * Two rules from Phase 0 shape everything here:
 * - Publishing is lock 1 of PHASE0 §1.2: create and update return a boolean
 *   that is false when a role that may only save drafts sends
 *   `_status: 'published'`. This hides Publish and Unpublish from that role,
 *   while Save draft and autosave keep working. Locks 2 and 3 (the
 *   beforeOperation guard and the two-person rule) belong to the workflow
 *   concern.
 * - No ownership or workflow rule is written as an update-access Where clause
 *   on a drafts collection: Payload checks it against the stale main row in
 *   the admin and against the latest version on save. Such rules ("own
 *   profile", "unused", "commercial byline") run in hooks that load the draft.
 */

/** Published documents only. Main row for plain reads; with `draft: true` Payload applies it to the latest version. */
export const PUBLISHED: Where = { _status: { equals: 'published' } }

/**
 * Anonymous reads: the public site reads through the Local API with no user
 * and `overrideAccess: false`, and gets published documents only. Anonymous
 * REST is denied (CMS-SPEC §4.3); `payloadAPI` is trusted only to grant this.
 */
export const anonymousRead = (req: PayloadRequest) => (req.payloadAPI === 'local' ? PUBLISHED : false)

/** Read: `all` roles see drafts too; other staff see published documents only ("R" in §4.2). */
export const readFor = (all: Role[]): Access =>
  withEdge(({ req }) => {
    const role = userRole(req)
    if (!role) return anonymousRead(req)
    return all.includes(role) ? true : PUBLISHED
  })

/** Lock 1: `publish` roles may write and publish; `draftOnly` roles may write drafts only; everyone else nothing. */
export const writeFor = (publish: Role[], draftOnly: Role[] = []): Access =>
  withEdge(({ req, data }) => {
    const role = userRole(req)
    if (!role) return false
    if (publish.includes(role)) return true
    if (draftOnly.includes(role)) return (data as { _status?: string } | undefined)?._status !== 'published'
    return false
  })

/** A plain role check (delete, readVersions). */
export const rolesFor = (roles: Role[]): Access => withEdge(({ req }) => hasRole(req, ...roles))

export interface EditorialPolicy {
  /** Roles that read drafts; other staff read published documents only. */
  readAll: Role[]
  /** Roles that create documents; those not in `publish` create drafts only. */
  create: Role[]
  /** Roles that update and publish. */
  publish: Role[]
  /** Roles that update drafts only. */
  draftOnly?: Role[]
  delete: Role[]
}

/** The access block of a drafts-enabled editorial collection. */
export function editorialAccess(p: EditorialPolicy): NonNullable<CollectionConfig['access']> {
  const createPublish = p.create.filter((r) => p.publish.includes(r))
  const createDraft = p.create.filter((r) => !p.publish.includes(r))
  return {
    read: readFor(p.readAll),
    readVersions: rolesFor(p.readAll),
    create: writeFor(createPublish, createDraft),
    update: writeFor(p.publish, p.draftOnly),
    delete: rolesFor(p.delete),
  }
}

// ── field-level helpers (booleans only; a denied write is dropped silently) ──
// `fieldRoles` and `staffField` (any active staff account: internal fields are
// never readable without a user, CMS-SPEC §4.3) are shared with the system
// schemas and defined once, in ./system.
export { fieldRoles, staffField } from './system'

/** Everyone except admin: admin has no editorial writing (separation of duties, §4.1). */
export const notAdminField: FieldAccess = ({ req }) => userRole(req) !== undefined && !hasRole(req, 'admin')
