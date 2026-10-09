import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { recordWorkflowEvent } from './audit'
import { correctionsRules, stampCorrectionVersion } from './corrections'
import { appendHistory, approvalFollowsContent, assertMayEdit } from './editing'
import { embargoRules } from './embargo'
import { scheduleFlush } from './notify'
import { buildSave, type Save } from './save'
import { type Doc, forbidden, type Id, takePending, wctx } from './shared'
import { forceCommercialCreate, sponsoredRules } from './sponsored'
import { applyTransition } from './transitions'
import { articleTranslationRules, markTranslationsOutdated } from './translation'
import { publishRules } from './twoPerson'
import { secondReadRules } from './urgent'
import { flagRules, legalHoldRules, trashRules, unpublishRules } from './withdrawal'

/**
 * The articles beforeChange hook of the workflow concern: one entry point,
 * so every rule sees the same computed state and runs in a fixed order.
 *
 *  1. SP-1 forces the sponsored flag and byline on a commercial create.
 *  2. Trash and restore-from-trash carry no content: only the trash rules.
 *  3. A transition (endpoint or worker) is checked against the table;
 *     anything else must be an edit this user may make in this state.
 *  4. Field rules: legal hold, legal and picture flags, sponsorship, embargo,
 *     corrections log, translation status, second read.
 *  5. The write itself: an unpublish (§5.8), a publish (two-person rule and
 *     change kinds, §5.3 and §5.6), or a draft save that may cancel an
 *     approval (§5.2).
 *
 * Writes the workflow makes itself (`workflowSync`) and the importer skip it.
 */
export const articleBeforeChange: CollectionBeforeChangeHook = async ({ collection, data, originalDoc, operation, req }) => {
  const ctx = wctx(req)
  if (ctx.workflowSync || ctx.importing) return data
  if (operation === 'create') await forceCommercialCreate(req, data as Doc)
  const s = buildSave({ req, data: data as Doc, originalDoc: originalDoc as Doc | undefined, operation })

  if (s.trashing || s.untrashing) {
    await trashRules(s)
    rejectContentOnTrash(s)
    return data
  }

  if (s.restoring) restoreRules(s)
  if (s.transition) await applyTransition(s)
  else await assertMayEdit(s)

  legalHoldRules(s)
  flagRules(s)
  await sponsoredRules(s)
  await embargoRules(s)
  await correctionsRules(s)
  await articleTranslationRules(s, collection.fields)
  await secondReadRules(s)

  if (await s.unpublishing()) await unpublishRules(s)
  else if (s.publishing) await publishRules(s)
  else if (!s.transition) await approvalFollowsContent(s)
  return data
}

const TRASH_ONLY = new Set(['deletedAt', 'updatedAt'])

/**
 * A trash or restore-from-trash write moves the story and nothing else: it
 * skips the field rules below, so any other field that differs from the
 * stored story is refused rather than let past them.
 */
function rejectContentOnTrash(s: Save) {
  if (s.system) return
  for (const [k, v] of Object.entries(s.data)) {
    if (TRASH_ONLY.has(k)) continue
    if (JSON.stringify(v ?? null) !== JSON.stringify(s.original[k] ?? null)) {
      throw forbidden('Savatga tashlash yoki savatdan tiklash bilan birga boshqa maydonni oʻzgartirib boʻlmaydi.')
    }
  }
}

/** Workflow state that belongs to the story, not to a version: a restore keeps today's (§5.12). */
const STORY_STATE = [
  'workflowStatus',
  'deskEditor',
  'submittedBy',
  'submittedAt',
  'approvedBy',
  'approvedAt',
  'approvedContentHash',
  'publishedBy',
  'scheduledBy',
  'scheduledAt',
  'scheduleError',
  'firstPublishedAt',
  'publishedAt',
  'significantUpdateAt',
  'secondRead',
  'workflowHistory',
  'legalSignOff',
  'legalHold',
  'needsLegal',
  'shortCode',
  'slugHistory',
] as const

/**
 * Restoring a version (always as a draft on a story that has been published,
 * ./guard) brings back its content, not its workflow record: the state,
 * approvals, publication dates, history, legal flags and the system parts of
 * the sponsorship and withdrawal stay as they are today. The corrections log
 * stays append-only: a version older than a correction cannot be restored.
 */
function restoreRules(s: Save) {
  if (!s.system && s.role !== 'editor' && s.role !== 'eic') throw forbidden('Versiyani faqat muharrir yoki bosh muharrir tiklaydi.')
  for (const k of STORY_STATE) s.data[k] = s.original[k] ?? null
  const sp = (s.original.sponsored ?? {}) as Doc
  s.data.sponsored = { ...((s.data.sponsored as Doc | undefined) ?? {}), approvedBy: sp.approvedBy ?? null, approvedAt: sp.approvedAt ?? null, retainUntil: sp.retainUntil ?? null }
  const w = (s.original.withdrawal ?? {}) as Doc
  s.data.withdrawal = { ...((s.data.withdrawal as Doc | undefined) ?? {}), at: w.at ?? null, by: w.by ?? null }
  s.data.changeNote = { kind: null, reason: null, numbersOverride: false }
  const kept = new Set(((s.data.corrections as Doc[] | undefined) ?? []).map((r) => String(r.id)))
  if (((s.original.corrections as Doc[] | undefined) ?? []).some((r) => !kept.has(String(r.id)))) {
    throw forbidden('Bu versiya keyingi tuzatishlardan oldingi: uni tiklasa tuzatishlar jurnali qisqaradi. Kerakli matnni qoʻlda koʻchiring.')
  }
  appendHistory(s, s.state, s.state, 'Versiya qoralama sifatida tiklandi')
}

/**
 * After the write, still inside the transaction: the audit rows, the
 * translation status sync and the correction version ids. Notices wait for
 * the commit (./notify).
 */
export const articleAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  const ctx = wctx(req)
  if (ctx.workflowSync || ctx.importing) return doc
  const id = (doc as Doc).id as Id
  const work = takePending(req, id)
  if (work) {
    for (const event of work.events) {
      await recordWorkflowEvent(req, { ...event, collection: 'articles', docId: id, docTitle: ((doc as Doc).title as string | undefined) ?? null })
    }
    if (work.publishedCorrections?.length) await stampCorrectionVersion(req, id, work.publishedCorrections)
    if (work.outdate) await markTranslationsOutdated(req, id, work.outdate.hidden)
  }
  for (const n of ctx.workflowNotices ?? []) if (n.articleId === undefined) n.articleId = id
  scheduleFlush(req)
  return doc
}
