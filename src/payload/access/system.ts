import type { Access, FieldAccess, PayloadRequest } from 'payload'

import { hasRole, userRole, withEdge, type Role } from './roles'

/**
 * Access for the system collections (requests, audit log, publish events,
 * Telegram posts) and the globals (CMS-SPEC §4.2, §3.16), plus the field-level
 * helpers the people and settings schemas share.
 *
 * None of these collections has drafts, so a Where clause in their access is
 * checked against the one row that exists. The globals that do have drafts
 * (home-page, ad-slots, navigation) use booleans for update: every role that
 * may update them may also publish them, so no publish lock is needed there.
 */

// ---------------------------------------------------------------------------
// Field-level helpers. Field access returns booleans only and drops a
// forbidden write silently (§4.3); rules that must fail loudly are hooks.
// ---------------------------------------------------------------------------

/** Field access for a fixed list of roles. A disabled account matches none. */
export const fieldRoles =
  (...roles: Role[]): FieldAccess =>
  ({ req }) =>
    hasRole(req, ...roles)

export const denyField: FieldAccess = () => false

/**
 * System fields (CMS-SPEC §3.1): written only by hooks and overrideAccess
 * calls. Payload drops client values silently; values a collection hook sets
 * still persist, because field access runs before the collection hooks.
 */
export const systemFieldAccess = { create: denyField, update: denyField } as const

/** Any active staff account. */
export const staffField: FieldAccess = ({ req }) => userRole(req) !== undefined

/** The document is the requesting user's own account (users collection). */
export const isSelfField: FieldAccess = ({ req, doc, id }) => {
  if (!userRole(req) || !req.user) return false
  const target = doc?.id ?? id
  return target !== undefined && String(target) === String(req.user.id)
}

/** The user's own account, or one of the given roles. */
export const selfOrRoles =
  (...roles: Role[]): FieldAccess =>
  (args) =>
    hasRole(args.req, ...roles) || isSelfField(args)

/**
 * `admin.hidden` by role (CMS-SPEC §13.5): the entity disappears from the nav
 * and admin routes of every role that cannot read it. Access still decides;
 * this only keeps the admin tidy.
 */
export const hiddenUnless =
  (...roles: Role[]) =>
  ({ user }: { user?: unknown }): boolean => {
    const u = user as { active?: boolean | null; role?: string | null } | null | undefined
    if (!u || u.active === false) return true
    return !roles.includes(u.role as Role)
  }

// ---------------------------------------------------------------------------
// Shared collection and global helpers
// ---------------------------------------------------------------------------

/**
 * The public site's own read: server-side Local API, no user (CMS-SPEC §4.3).
 * `payloadAPI` is not a trust signal, so it is used only here, in the
 * anonymous branch, and grants published data only.
 */
const isSiteRead = (req: PayloadRequest) => !req.user && req.payloadAPI === 'local'

const published = { _status: { equals: 'published' } } as const

const roles =
  (...list: Role[]): Access =>
  ({ req }) =>
    hasRole(req, ...list)

const nobody: Access = () => false

/**
 * Read access for a global with drafts. `full` roles see drafts; other staff
 * and the public site get the published version only. An unpublished global's
 * main row holds draft content, so the Where makes it read as absent (§3.16).
 */
const draftGlobalRead =
  (full: Role[], publishedOnly: Role[]): Access =>
  ({ req }) => {
    const role = userRole(req)
    if (role && full.includes(role)) return true
    if (role && publishedOnly.includes(role)) return published
    return isSiteRead(req) ? published : false
  }

/** Read access for a global without drafts: all staff, and the public site. */
const plainGlobalRead: Access = ({ req }) => userRole(req) !== undefined || isSiteRead(req)

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/**
 * `requests` ("Murojaatlar", §3.15). Reporters log `error_report` items, which
 * is how they propose a correction, and can follow the ones they logged.
 * Who may record which decision is a workflow rule (later wave).
 */
export const requestsAccess = {
  create: withEdge<Access>(({ req, data }) => {
    if (hasRole(req, 'editor', 'eic')) return true
    // `kind` defaults to error_report, so a reporter's empty kind is allowed.
    if (hasRole(req, 'reporter')) return !data?.kind || data.kind === 'error_report'
    return false
  }),
  read: withEdge<Access>(({ req }) => {
    if (hasRole(req, 'editor', 'eic', 'admin')) return true
    if (hasRole(req, 'reporter') && req.user) return { createdBy: { equals: req.user.id } }
    return false
  }),
  update: withEdge(roles('editor', 'eic')),
  delete: withEdge(nobody),
}

/**
 * `audit-log` (§9.1): append-only. Hooks insert with `overrideAccess: true`;
 * no role may create, change or delete a row through Payload, and the
 * database role has no UPDATE or DELETE on the table either.
 */
export const auditLogAccess = {
  create: withEdge(nobody),
  read: withEdge(roles('eic', 'admin')),
  update: withEdge(nobody),
  delete: withEdge(nobody),
}

/** `publish-events` (§8.4): written by hooks and the worker only. */
export const publishEventsAccess = {
  create: withEdge(nobody),
  read: withEdge(roles('editor', 'eic', 'admin')),
  update: withEdge(nobody),
  delete: withEdge(nobody),
}

/**
 * `telegram-posts` (§10.2; behaviour is Phase 2). Commercial reads sponsored
 * posts and may propose one; approval, cancel and retraction rules (¬author,
 * editor-in-chief) are workflow hooks in Phase 2. Posts are never deleted:
 * their caption history is the Art. 15 record for advertising.
 */
export const telegramPostsAccess = {
  create: withEdge(roles('editor', 'eic', 'commercial')),
  read: withEdge<Access>(({ req }) => {
    if (hasRole(req, 'reporter', 'editor', 'eic', 'admin')) return true
    if (hasRole(req, 'commercial')) return { sponsored: { equals: true } }
    return false
  }),
  update: withEdge(roles('editor', 'eic')),
  delete: withEdge(nobody),
}

/**
 * `redirects` (@payloadcms/plugin-redirects, §3.15, §8.8). The plugin's own
 * default read is public; here staff who maintain redirects read them, and
 * the public site reads them through the Local API with no user. Editors and
 * the editor-in-chief add and change them by hand; the workflow concern
 * creates them from `slugHistory` with `overrideAccess`. Nobody deletes one
 * through Payload: an old URL that once worked keeps redirecting.
 */
export const redirectsAccess = {
  create: withEdge(roles('editor', 'eic')),
  read: withEdge<Access>(({ req }) => hasRole(req, 'editor', 'eic', 'admin') || isSiteRead(req)),
  update: withEdge(roles('editor', 'eic')),
  delete: withEdge(nobody),
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

/**
 * Version restore on globals runs no hooks and no field access (PHASE0 item
 * 12): it needs `readVersions` and `update`, then writes the stored version
 * straight into the main row. `readVersions` is therefore limited to the
 * roles that own the whole global, so a role with partial field rights
 * (an editor on site-settings) cannot restore. The full restore guard
 * (re-running HOME-1, HOME-2, SP-7, SET-1) is a `beforeOperation` hook in a
 * later wave.
 */

/**
 * `site-settings` (§3.16). Update is open to every role that owns at least one
 * group; field access narrows each group to its writers.
 */
export const siteSettingsAccess = {
  read: withEdge(plainGlobalRead),
  update: withEdge(roles('editor', 'eic', 'admin')),
  readVersions: withEdge(roles('eic', 'admin')),
}

/** `navigation`: drafts on; editor-in-chief and admin edit and publish. */
export const navigationAccess = {
  read: withEdge(draftGlobalRead(['eic', 'admin'], ['reporter', 'editor', 'commercial'])),
  update: withEdge(roles('eic', 'admin')),
  readVersions: withEdge(roles('eic', 'admin')),
}

/**
 * `ad-slots`: drafts on; commercial edits and publishes. Reporters have no
 * access. The editor-in-chief's veto (unpublish) goes through a custom
 * endpoint in a later wave, which checks the role itself and calls the Local
 * API with `unpublishAllLocales: true`, so eic gets no update access here.
 */
export const adSlotsAccess = {
  read: withEdge(draftGlobalRead(['commercial'], ['editor', 'eic', 'admin'])),
  update: withEdge(roles('commercial')),
  readVersions: withEdge(roles('commercial', 'eic')),
}

/** `home-page`: drafts on; editors and the editor-in-chief launch it by publishing. */
export const homePageAccess = {
  read: withEdge(draftGlobalRead(['editor', 'eic'], ['reporter', 'commercial', 'admin'])),
  update: withEdge(roles('editor', 'eic')),
  readVersions: withEdge(roles('editor', 'eic')),
}

/** `editorial-rules`: everyone reads; the editor-in-chief writes. */
export const editorialRulesAccess = {
  read: withEdge(plainGlobalRead),
  update: withEdge(roles('eic')),
  readVersions: withEdge(roles('eic')),
}
