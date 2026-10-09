import type { Access, FieldAccess, Where } from 'payload'
import { isolateObjectProperty } from 'payload'

import { editRefusal } from '../hooks/workflow/editRules'
import type { WorkflowState } from '../hooks/workflow/shared'
import { anonymousRead, PUBLISHED } from './editorial'
import { hasRole, type Role, userRole, withEdge } from './roles'

/**
 * Articles access (CMS-SPEC §4.2 "Articles", §4.3). Every collection-level
 * function is wrapped in withEdge.
 *
 * Publishing has three locks (PHASE0 §1.2). This module is lock 1: create and
 * update return booleans that refuse `_status: 'published'` for the roles that
 * never publish (reporter, commercial). The admin asks update access with
 * `data._status: 'published'` to decide whether to show Publish, so those
 * roles see Save draft and autosave only, on published stories too. Lock 2,
 * the beforeOperation guard that also closes Unpublish and the other REST
 * paths, and lock 3, the two-person rule, are in the workflow concern.
 *
 * Ownership, workflow state, embargo and sponsorship rules for writes are not
 * expressed here as Where clauses: on a drafts collection Payload checks such
 * a clause against the stale main row in the admin and against the latest
 * version on save. They run in beforeChange hooks against the latest draft.
 */

/** Roles that may publish editorial content. */
export const PUBLISHERS: Role[] = ['editor', 'eic']
/** Roles that may write article drafts but never publish. */
export const DRAFT_WRITERS: Role[] = ['reporter', 'commercial']

const wantsPublish = (data: unknown) => (data as { _status?: string } | undefined)?._status === 'published'

/**
 * Read (§4.3). Editors and the editor-in-chief read everything. A reporter
 * reads published stories, their own (author through `_authorUsers`, or
 * assignee), and others' drafts unless embargoed or legally sensitive.
 * Commercial reads published and sponsored stories; admin published only.
 *
 * The Where is checked against the main row by the admin's permission check
 * and against the latest version in `draft: true` reads; test A4 covers both.
 */
export const articlesRead: Access = withEdge(({ req }) => {
  const role = userRole(req)
  if (!role || !req.user) return anonymousRead(req)
  const now = new Date().toISOString()
  switch (role) {
    case 'editor':
    case 'eic':
      return true
    case 'reporter': {
      const notEmbargoed: Where = { or: [{ 'embargo.until': { exists: false } }, { 'embargo.until': { less_than: now } }] }
      const readable: Where = {
        or: [
          PUBLISHED,
          { _authorUsers: { in: [req.user.id] } },
          { assignee: { equals: req.user.id } },
          { and: [notEmbargoed, { 'embargo.indefinite': { not_equals: true } }, { legallySensitive: { not_equals: true } }] },
        ],
      }
      return readable
    }
    case 'commercial': {
      const readable: Where = { or: [PUBLISHED, { 'sponsored.enabled': { equals: true } }] }
      return readable
    }
    case 'admin':
      return PUBLISHED
    default:
      return false
  }
})

/**
 * Create and update (lock 1). Reporter and commercial may write drafts of any
 * story they can read; which stories and states they may actually change
 * (own idea/draft, own sponsored before approval, translator locales) is
 * checked by the workflow, sponsored and translation hooks. Admin writes no
 * editorial content.
 */
const writeArticle: Access = ({ req, data }) => {
  const role = userRole(req)
  if (!role) return false
  if (PUBLISHERS.includes(role)) return true
  if (DRAFT_WRITERS.includes(role)) return !wantsPublish(data)
  return false
}

/**
 * The admin form's permission (§4.3: "an async access function that loads the
 * draft and returns a boolean would also make the admin show the form
 * read-only"). When Payload computes a document's permissions, for the edit
 * view and `/api/articles/access/:id`, update access also asks the workflow's
 * edit rule against the latest version: a reporter on a story in edit, an
 * editor on a sponsored story, anyone but the editor-in-chief on a legal hold
 * then gets a read-only form instead of an autosave that fails every two
 * seconds. Payload passes `collectionConfig` only on that path
 * (utilities/getEntityPermissions, 3.90.2); a real write gets the plain
 * boolean above and the hooks refuse it with their own message.
 */
const updateArticle: Access = async (args) => {
  if (!writeArticle(args)) return false
  const { req, id } = args
  const permissionCheck = (args as { collectionConfig?: unknown }).collectionConfig !== undefined
  if (!permissionCheck || id === undefined || id === null || !req.user) return true
  const doc = (await req.payload.findByID({
    collection: 'articles',
    id,
    draft: true,
    depth: 0,
    trash: true,
    overrideAccess: true,
    disableErrors: true,
    req: isolateObjectProperty(req, ['locale', 'fallbackLocale']),
  })) as Record<string, unknown> | null
  if (!doc) return true
  return (
    editRefusal({
      role: userRole(req),
      actor: req.user.id,
      state: (doc.workflowStatus as WorkflowState | undefined) ?? 'idea',
      doc,
      locale: (req.locale as string | undefined) ?? 'uz',
      sponsored: Boolean((doc.sponsored as { enabled?: boolean } | undefined)?.enabled),
    }) === null
  )
}
export const articlesCreate: Access = withEdge(writeArticle)
export const articlesUpdate: Access = withEdge(updateArticle)

/**
 * Trash and permanent delete share this function: a trash call carries
 * `data.deletedAt`, a permanent delete carries no data (Payload trash). Trash
 * is open to the roles that write stories; the rules that only never-published
 * stories go to the trash, and only their own `idea`/`draft` for reporters and
 * commercial, are in the workflow hook. Permanent deletion is for the
 * editor-in-chief only; retention and legal hold are checked in beforeDelete.
 */
export const articlesDelete: Access = withEdge(({ req, data }) => {
  const role = userRole(req)
  if (!role) return false
  const trashing = Boolean((data as { deletedAt?: unknown } | undefined)?.deletedAt)
  if (trashing) return role === 'reporter' || role === 'editor' || role === 'eic' || role === 'commercial'
  return role === 'eic'
})

/** Version history (§4.2 "Read versions"): own stories for reporters, sponsored ones for commercial. Paths are `version.*`. */
export const articlesReadVersions: Access = withEdge(({ req }) => {
  const role = userRole(req)
  if (!role || !req.user) return false
  switch (role) {
    case 'editor':
    case 'eic':
      return true
    case 'reporter': {
      const own: Where = { or: [{ 'version._authorUsers': { in: [req.user.id] } }, { 'version.assignee': { equals: req.user.id } }] }
      return own
    }
    case 'commercial': {
      const sponsored: Where = { 'version.sponsored.enabled': { equals: true } }
      return sponsored
    }
    default:
      return false
  }
})

// ── field-level access (booleans only; a denied write is dropped silently) ──
export const eicField: FieldAccess = ({ req }) => hasRole(req, 'eic')
export const publishersField: FieldAccess = ({ req }) => hasRole(req, ...PUBLISHERS)
/** "Editorial roles" of §3.3 tab Ichki: reporter, editor, editor-in-chief. */
export const editorialField: FieldAccess = ({ req }) => hasRole(req, 'reporter', 'editor', 'eic')
/** Tab Tijorat: commercial and the editor-in-chief write; editors read. */
export const sponsoredWriteField: FieldAccess = ({ req }) => hasRole(req, 'commercial', 'eic')
export const sponsoredInternalReadField: FieldAccess = ({ req }) => hasRole(req, 'editor', 'eic', 'commercial')

const idsOf = (v: unknown): (string | number)[] =>
  Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? (x as { id: string | number }).id : (x as string | number))) : []

/**
 * `sourceNotes` (§3.3, Art. 33): only the story's authors and the
 * editor-in-chief read or change it. On create the author list is not linked
 * yet, so any editorial writer may fill it in.
 */
export const sourceNotesField: FieldAccess = ({ req, doc }) => {
  if (hasRole(req, 'eic')) return true
  if (!req.user || !hasRole(req, 'reporter', 'editor')) return false
  if (!doc) return true
  return idsOf((doc as { _authorUsers?: unknown })._authorUsers).some((id) => String(id) === String(req.user!.id))
}
