import type { CollectionBeforeOperationHook, PayloadRequest } from 'payload'

import { type Role, userRole } from '../../access/roles'
import { ARTICLES, type Doc, forbidden, type Id, isolated, isPublisher, wctx } from './shared'

/**
 * Lock 2 of PHASE0 §1.2, the operation guard, for the API. Access (lock 1)
 * hides Publish and Unpublish from the roles that never publish, but leaves
 * four reporter calls open, each of which publishes or unpublishes: the
 * admin's Unpublish, a plain `PATCH {_status:'draft'}`, a PATCH with neither
 * `draft` nor `_status` (Payload copies the latest draft into the main row),
 * and a POST with `_status: 'published'`. This hook refuses, for those roles,
 * every call that writes the main row: a create that publishes, an update
 * without `draft: true` or with `_status: 'published'`, and a version restore
 * without `draft: true`. Draft saves and autosave keep working.
 *
 * It also copies `args.draft` into `req.context.draftArg`, because
 * beforeChange never receives the draft argument and `req.query.draft`
 * exists only on Payload's own REST routes.
 */

const PUBLISH_ONLY_EDITORS = 'Faqat muharrir chop eta oladi: siz faqat qoralama saqlaysiz (chop etish va nashrdan olish muharrir ishi).'
const PUBLISH_IN_LOCALE = '«Bitta tilda chop etish» oʻchirilgan: maqola barcha tillarda birga chop etiladi.'
const RESTORE_AS_DRAFT = 'Chop etilgan maqolada versiya faqat qoralama sifatida tiklanadi: «Qoralama sifatida tiklash»ni tanlang.'
const STATUS_BY_TRANSITION = 'Holat faqat ish jarayoni tugmalari orqali oʻzgaradi. Sahifani yangilang va tugmadan foydalaning.'

type OpArgs = {
  id?: Id
  data?: Doc
  draft?: boolean
  publishSpecificLocale?: string
  where?: unknown
}

const writes = (operation: string) => operation === 'create' || operation === 'update' || operation === 'restoreVersion'
const isTrashToggle = (data: Doc | undefined) => Boolean(data && 'deletedAt' in data)

/** The non-publisher checks shared by every drafts collection. */
function lockTwo(operation: string, a: OpArgs, opts: { trash: boolean }) {
  if (operation === 'create' && a.data?._status === 'published') throw forbidden(PUBLISH_ONLY_EDITORS)
  if (operation === 'update') {
    if (a.data?._status === 'published') throw forbidden(PUBLISH_ONLY_EDITORS)
    // A trash toggle writes the main row of a never-published story only: the trash rule checks that per document.
    if (!a.draft && !(opts.trash && isTrashToggle(a.data))) throw forbidden(PUBLISH_ONLY_EDITORS)
  }
  if (operation === 'restoreVersion' && !a.draft) throw forbidden(PUBLISH_ONLY_EDITORS)
}

async function latest(req: PayloadRequest, id: Id): Promise<Doc | null> {
  return (await req.payload.findByID({
    collection: ARTICLES,
    id,
    draft: true,
    trash: true,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req: isolated(req),
  })) as Doc | null
}

export const articleGuard: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (!writes(operation)) return args
  const a = args as OpArgs
  const ctx = wctx(req)
  ctx.draftArg = Boolean(a.draft)
  if (ctx.workflowSync || ctx.importing) return args
  if (operation === 'update' && a.publishSpecificLocale) throw forbidden(PUBLISH_IN_LOCALE)

  const role = userRole(req)
  if (req.user && !isPublisher(role)) lockTwo(operation, a, { trash: true })

  if (operation === 'restoreVersion' && !a.draft && a.id !== undefined) {
    // §5.12: the admin's Restore republishes at once; on a story that has been published only "Restore as draft" is allowed, for every role.
    const version = (await req.payload.findVersionByID({
      collection: ARTICLES,
      id: String(a.id),
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      req: isolated(req),
    })) as { parent?: unknown } | null
    const parent = version?.parent
    const parentId = parent && typeof parent === 'object' ? (parent as { id: Id }).id : (parent as Id | undefined)
    const story = parentId !== undefined ? await latest(req, parentId) : null
    if (story?.firstPublishedAt) throw forbidden(RESTORE_AS_DRAFT)
  }

  // Field access drops these writes silently; a workflow change must fail loudly (test B11).
  if (req.user && a.data && !ctx.transition && (operation === 'create' || operation === 'update')) {
    const sent = a.data
    if (operation === 'create') {
      if (sent.workflowStatus !== undefined && sent.workflowStatus !== null && sent.workflowStatus !== 'idea') throw forbidden(STATUS_BY_TRANSITION)
      if (sent.legalHold && role !== 'eic') throw forbidden('Yuridik saqlovni faqat bosh muharrir belgilaydi.')
    } else if ('workflowStatus' in sent || ('legalHold' in sent && role !== 'eic')) {
      if (a.id === undefined) {
        if (sent.workflowStatus !== undefined) throw forbidden(STATUS_BY_TRANSITION)
      } else {
        const current = await latest(req, a.id)
        if (current && sent.workflowStatus !== undefined && sent.workflowStatus !== current.workflowStatus) throw forbidden(STATUS_BY_TRANSITION)
        if (current && role !== 'eic' && 'legalHold' in sent && Boolean(sent.legalHold) !== Boolean(current.legalHold)) {
          throw forbidden('Yuridik saqlovni faqat bosh muharrir belgilaydi.')
        }
      }
    }
  }
  return args
}

/** Lock 2 for the other drafts collections: `publishers` may publish; every other role saves drafts only. */
export const draftOnlyGuard =
  (publishers: Role[]): CollectionBeforeOperationHook =>
  ({ args, operation, req }) => {
    if (!writes(operation)) return args
    const a = args as OpArgs
    const ctx = wctx(req)
    ctx.draftArg = Boolean(a.draft)
    if (ctx.workflowSync || ctx.importing) return args
    if (operation === 'update' && a.publishSpecificLocale) throw forbidden(PUBLISH_IN_LOCALE)
    const role = userRole(req)
    if (req.user && !(role && publishers.includes(role))) lockTwo(operation, a, { trash: false })
    return args
  }
