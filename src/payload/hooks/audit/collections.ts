import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterOperationHook,
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
  SanitizedCollectionConfig,
} from 'payload'

import type { AuditAction } from '../../audit/actions'
import { actorOf, latestRowFor, recordAudit, type AuditEntry } from '../../audit/writer'
import { articleEvents, isWithdrawOrRestore, publishFacts } from './articles'
import { isolated, latestVersionId, localeOf, titleOf } from './common'
import { diffDocs, type Diff } from './diff'
import { PERSONAL_DATA_COLLECTIONS } from './policy'
import { once, operationFor, rememberDoc, rememberOperation, takeDoc } from './state'
import { userEntries } from './users'

/**
 * Content audit for every collection (CMS-SPEC §9.2 "Content", "Users"): one
 * row per committed change, written inside the change's transaction
 * (src/payload/audit/writer.ts says why).
 *
 * The action is derived from what the save did, not from how it was called,
 * so the admin buttons, REST, the transition endpoint, the scheduler and
 * scripts produce the same rows:
 *
 * | Save                                               | Action                      |
 * |----------------------------------------------------|-----------------------------|
 * | create (published at once: `doc.publish_first`)    | `doc.create`                |
 * | draft save (autosave included)                     | `doc.update`                |
 * | publish, never published before                    | `doc.publish_first`         |
 * | publish of a document that was published before    | `doc.publish_change` (+kind)|
 * | save without `draft: true` that leaves a live doc as a draft | `doc.unpublish`   |
 * | `deletedAt` set / cleared                          | `doc.trash` / `doc.restore_from_trash` |
 * | version restore                                    | `doc.version_restore`       |
 * | permanent delete                                   | `doc.delete`                |
 * | users                                              | `user.*`, `auth.password_changed` |
 *
 * plus the article rows of ./articles.ts; an article's withdraw or restore
 * save is the workflow concern's `article.withdraw` / `article.restore` row
 * alone. A publish is diffed against the live row it replaces, so
 * `changedPaths` says what readers will see change, however many autosaves
 * came before.
 *
 * Autosave: the admin autosaves drafts every 2 s while an editor types. A
 * draft autosave is recorded unless the same person's last row for the same
 * document is an autosave row in the same locale, less than 5 minutes old,
 * that already lists every path this one changed; a new path or another
 * locale always gets a row. Publishing writes its own row in any case.
 */

type Doc = Record<string, unknown>
const AUTOSAVE_WINDOW_MS = 5 * 60 * 1000
const WRITE_OPERATIONS = new Set(['create', 'update', 'delete', 'restoreVersion'])

const hasDrafts = (config: SanitizedCollectionConfig) => Boolean(config.versions && typeof config.versions === 'object' && config.versions.drafts)

/** beforeOperation: remember `draft`, `autosave` and the raw change note for the hooks that do not receive them. */
export const stashOperation: CollectionBeforeOperationHook = ({ args, collection, operation, req }) => {
  if (!WRITE_OPERATIONS.has(operation)) return
  const a = args as { id?: number | string; draft?: boolean; autosave?: boolean; data?: Doc }
  // restoreVersion's id is the version's, not the document's: keep it under `*`.
  rememberOperation(req, collection.slug, operation === 'restoreVersion' ? undefined : a.id, {
    operation,
    draft: Boolean(a.draft),
    autosave: Boolean(a.autosave),
    changeNote: a.data?.changeNote,
  })
}

/**
 * beforeChange: read what the write is about to replace. For a publish, the
 * live row (the diff base) and whether the document was ever published; for
 * a save without `draft: true`, whether the document is live now, which is
 * how an unpublish is told from a draft save (PHASE0 item 2).
 */
export const captureBefore: CollectionBeforeChangeHook = async ({ collection, data, operation, originalDoc, req }) => {
  if (operation !== 'update' || !originalDoc?.id) return data
  const slug = collection.slug
  const id = originalDoc.id as number | string
  const op = operationFor(req, slug, id)
  // A restore is recorded as such; Payload leaves `isRestoringVersion` on the context afterwards, so ask the operation.
  if (op?.operation === 'restoreVersion') return data
  if (slug === 'users' && typeof data?.password === 'string' && data.password) rememberDoc(req, slug, id, { passwordChanged: true })
  if (!hasDrafts(collection)) return data

  const publishing = data?._status === 'published'
  if (!publishing && op?.draft) return data
  const live = (await req.payload.findByID({
    collection: slug,
    id,
    draft: false,
    depth: 0,
    trash: true,
    overrideAccess: true,
    showHiddenFields: true,
    disableErrors: true,
    req: isolated(req),
  })) as Doc | null
  const wasLive = live?._status === 'published'
  let everPublished = wasLive || Boolean((originalDoc as Doc).firstPublishedAt)
  if (publishing && !everPublished) {
    const { totalDocs } = await req.payload.db.countVersions({
      collection: slug,
      where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
      req,
    })
    everPublished = totalDocs > 0
  }
  rememberDoc(req, slug, id, { live, wasLive, everPublished })
  return data
}

/**
 * The workflow's own follow-up writes (`context.workflowSync`): recorded, so
 * the log shows every change, and labelled, so they are not read as an
 * editor's edit (CMS-SPEC §5.6, §5.7, §5.11).
 */
const WORKFLOW_SYNC_LABELS: Record<string, string> = {
  'translation-outdated': 'tarjima holati «Eskirgan» qilindi',
  'schedule-failed': 'rejali chop etish bajarilmadi, maqola «Tayyor»ga qaytdi',
  'request-decision': 'murojaat tuzatish bilan yopildi',
}

function summaryFor(action: AuditAction, extra: { kind?: string | null; restoredAs?: string; scheduled?: boolean }): string | null {
  switch (action) {
    case 'doc.publish_change':
      return extra.kind ? `Oʻzgarish turi: ${extra.kind}` : null
    case 'doc.publish_first':
      return extra.scheduled ? 'Rejali nashr' : null
    case 'doc.version_restore':
      return extra.restoredAs === 'published' ? 'Versiya tiklandi va chop etildi' : 'Versiya qoralama sifatida tiklandi'
    default:
      return null
  }
}

/** Skip an autosave row the previous row of the same person already covers. */
async function coveredAutosave(req: PayloadRequest, slug: string, id: number | string, diff: Diff): Promise<boolean> {
  const { actorId } = actorOf(req)
  const last = await latestRowFor(req, { collection: slug, docId: String(id), actorId })
  if (!last || last.action !== 'doc.update' || !last.summary?.startsWith('Avto') || (last.locale ?? null) !== localeOf(req)) return false
  if (Date.now() - new Date(last.at ?? 0).getTime() > AUTOSAVE_WINDOW_MS) return false
  const listed = new Set(Array.isArray(last.changedPaths) ? (last.changedPaths as string[]) : [])
  return diff.paths.every((p) => listed.has(p))
}

/** afterChange: classify the save and write its rows. */
export const auditChange: CollectionAfterChangeHook = async ({ collection, doc, operation, previousDoc, req }) => {
  const slug = collection.slug
  const id = (doc as Doc).id as number | string
  const op = operationFor(req, slug, id)
  const state = takeDoc(req, slug, id)
  if (op?.override?.skip) return doc

  const prev = (operation === 'create' ? {} : (previousDoc ?? {})) as Doc
  const next = doc as Doc
  const drafts = hasDrafts(collection)
  const restoring = Boolean((req.context as { isRestoringVersion?: boolean }).isRestoringVersion) && op?.operation === 'restoreVersion'
  const published = drafts && next._status === 'published'

  let action: AuditAction
  let base: Doc = prev
  if (operation === 'create') action = published ? 'doc.publish_first' : 'doc.create'
  else if (restoring) action = 'doc.version_restore'
  else if (next.deletedAt && !prev.deletedAt) action = 'doc.trash'
  else if (!next.deletedAt && prev.deletedAt) action = 'doc.restore_from_trash'
  else if (published) {
    action = state.everPublished ? 'doc.publish_change' : 'doc.publish_first'
    if (state.live) base = state.live
  } else if (drafts && state.wasLive && !op?.draft) {
    action = 'doc.unpublish'
    if (state.live) base = state.live
  } else action = 'doc.update'

  const diff = diffDocs(collection.flattenedFields, base, next, { slug, localeAll: req.locale === 'all' })
  const ref = {
    collection: slug,
    docId: id,
    docTitle: titleOf(collection, next),
    locale: localeOf(req),
  }

  let entries: AuditEntry[]
  if (slug === 'users') {
    entries = userEntries({
      operation,
      previous: prev,
      doc: next,
      diff,
      passwordChanged: Boolean(state.passwordChanged),
    }).map((e) => ({ changedPaths: diff.paths, ...e }))
  } else {
    const first = action === 'doc.publish_first'
    // The workflow clears the change note in the same write and leaves what it published in req.context (§5.6).
    const workflowChange = (req.context as { workflowChange?: { kind?: string; reason?: string } }).workflowChange
    const facts = slug === 'articles' && published ? publishFacts(workflowChange ?? op?.changeNote, prev, next, first) : undefined
    const sync = (req.context as { workflowSync?: string }).workflowSync
    const primary: AuditEntry = {
      action,
      summary: sync
        ? `Ish jarayonining avtomatik yozuvi: ${WORKFLOW_SYNC_LABELS[sync] ?? sync}`
        : op?.autosave && action === 'doc.update'
          ? 'Avtomatik saqlash'
          : summaryFor(action, {
              kind: facts?.kind,
              restoredAs: String(next._status ?? ''),
              scheduled: Boolean((req.context as { scheduledRun?: boolean }).scheduledRun),
            }),
      changedPaths: diff.paths,
      before: diff.before,
      after: { ...diff.after, ...facts?.after },
    }
    const workflowRecords = slug === 'articles' && isWithdrawOrRestore(prev, next)
    const covered = workflowRecords || (action === 'doc.update' && op?.autosave && (await coveredAutosave(req, slug, id, diff)))
    entries = covered ? [] : [primary]
    if (slug === 'articles') entries.push(...articleEvents(collection.flattenedFields, prev, next))
  }
  if (op?.override?.action && entries[0]?.action === action) entries[0] = { ...entries[0], action: op.override.action }
  if (op?.override?.summary && entries[0]?.action === (op.override.action ?? action)) entries[0] = { ...entries[0], summary: op.override.summary }
  if (!entries.length) return doc

  const versionId = collection.versions ? await latestVersionId(req, slug, id) : null
  for (const entry of entries) await recordAudit(req, { ...ref, versionId, ...entry })
  return doc
}

/** afterDelete: a permanent delete (trash is an update). Callers may name the action (`pd.retention_purge`). */
export const auditDelete: CollectionAfterDeleteHook = async ({ collection, doc, id, req }) => {
  const op = operationFor(req, collection.slug, id)
  takeDoc(req, collection.slug, id)
  if (op?.override?.skip) return doc
  await recordAudit(req, {
    action: op?.override?.action ?? 'doc.delete',
    summary: op?.override?.summary ?? null,
    collection: collection.slug,
    docId: id,
    docTitle: titleOf(collection, doc),
  })
  return doc
}

/**
 * Single-document reads of personal data by staff (§9.2 `pd.read`), once per
 * request: the admin's edit view and `GET /api/<collection>/<id>`. Internal
 * reads (`overrideAccess: true`, or no user) and list views are not rows. The
 * row holds who read which document, never its content.
 */
export const auditPersonalRead: CollectionAfterOperationHook = async ({ args, collection, operation, req, result }) => {
  if (operation !== 'findByID' || !req.user || !PERSONAL_DATA_COLLECTIONS.has(collection.slug)) return result
  if ((args as { overrideAccess?: boolean }).overrideAccess === true) return result
  const id = (result as { id?: number | string } | null | undefined)?.id
  if (id === undefined || !once(req, `pd.read:${collection.slug}:${id}`)) return result
  await recordAudit(req, { action: 'pd.read', collection: collection.slug, docId: id })
  return result
}
