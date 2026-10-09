import type { CollectionBeforeDeleteHook } from 'payload'

import { appendHistory } from './editing'
import { isOwner, type Save } from './save'
import { assertUnpublishWindow } from './transitions'
import { ARTICLES, type Doc, fieldError, forbidden, isBlank, isolated, nowIso, pendingFor, time, wctx } from './shared'

/**
 * Withdrawal, unpublishing, legal hold and trash (CMS-SPEC §5.8).
 *
 * - A public story is never unpublished, except by the editor-in-chief within
 *   15 minutes of first publication (the accidental-unpublish transition, or
 *   Payload's Unpublish with a reason in `changeNote.reason`). Withdrawal keeps
 *   `_status: 'published'` and is a transition (./transitions).
 * - Unpublish detection (PHASE0 §1.2): a write without the draft argument
 *   that leaves the main row unpublished, on a story whose main row is
 *   published. That covers the admin's Unpublish, a plain
 *   `PATCH {_status:'draft'}`, `?draft=false`, and a PATCH with neither on a
 *   story with a pending draft.
 * - Trash is for stories that were never published; permanent deletion for
 *   the editor-in-chief, never while retained (sponsored, Art. 15) or on hold.
 */
export async function unpublishRules(s: Save): Promise<void> {
  if (s.system) return
  const viaTransition = s.transition?.id === 'unpublish'
  if (!viaTransition) {
    if (s.role !== 'eic') throw forbidden('Chop etilgan maqola oʻchirilmaydi — «Olib tashlash»dan foydalaning.')
    assertUnpublishWindow(s)
    const reason = ((s.merged.changeNote ?? {}) as Doc).reason
    if (isBlank(reason)) {
      throw fieldError(s.req, 'changeNote.reason', 'Nashrdan olish sababini «Oʻzgarish izohi → Sabab»ga yozing yoki «Nashrdan olish» tugmasidan foydalaning.')
    }
    s.data.approvedBy = null
    s.data.approvedAt = null
    s.data.approvedContentHash = null
    s.data.changeNote = { kind: null, reason: null, numbersOverride: false }
    appendHistory(s, s.state, 'draft', String(reason))
    pendingFor(s.req, s.id).events.push({ action: 'workflow.transition', summary: `${s.state} → draft (nashrdan olindi)`, after: { reason } })
  }
  s.data.workflowStatus = 'draft'
}

/** Trash and restore from trash (§4.2 "Move to trash", §5.8). */
export async function trashRules(s: Save): Promise<void> {
  if (s.system) return
  const { original } = s
  if (original.firstPublishedAt || (await s.mainPublished())) {
    throw forbidden('Chop etilgan maqola savatga tashlanmaydi va oʻchirilmaydi — «Olib tashlash»dan foydalaning.')
  }
  if (original.legalHold) throw forbidden('Yuridik saqlovdagi maqola savatga tashlanmaydi.')
  const sponsored = Boolean((original.sponsored as Doc | undefined)?.enabled)
  switch (s.role) {
    case 'eic':
      return
    case 'editor':
      if (sponsored) throw forbidden('Homiylik materialini muharrir savatga tashlay olmaydi (SP-11).')
      return
    case 'reporter':
      if (sponsored || !isOwner(s, s.actor) || !['idea', 'draft'].includes(s.state)) {
        throw forbidden('Muxbir faqat oʻzining «Gʻoya» yoki «Qoralama» holatidagi maqolasini savatga tashlaydi.')
      }
      return
    case 'commercial':
      if (!sponsored || !['idea', 'draft'].includes(s.state)) throw forbidden('Tijorat boʻlimi faqat homiylik qoralamasini savatga tashlaydi.')
      return
    default:
      throw forbidden('Savatga tashlashga ruxsatingiz yoʻq.')
  }
}

/** Legal hold is the editor-in-chief's (§5.8). */
export function legalHoldRules(s: Save): void {
  const before = Boolean(s.original.legalHold)
  const after = Boolean(s.merged.legalHold)
  const hide = Boolean(((s.merged.withdrawal ?? {}) as Doc).hideTitle)
  if (after && hide && !((s.original.withdrawal ?? {}) as Doc).hideTitle) {
    throw forbidden('Yuridik saqlovdagi maqolaning sarlavhasi yashirilmaydi.')
  }
  if (before === after) return
  // The audit concern records legal.hold_set / legal.hold_cleared.
  if (!s.system && s.role !== 'eic') throw forbidden('Yuridik saqlovni faqat bosh muharrir belgilaydi.')
}

/**
 * Legal and picture flags (§3.3 tab Ichki, CMS-RESEARCH §2): anyone may set
 * `required`; only the editor-in-chief sets legal `complete`, which records
 * the sign-off; editors and the editor-in-chief set picture `complete`.
 * Clearing a requirement is the desk's. Publishing is blocked while either is
 * `required` (./twoPerson).
 */
export function flagRules(s: Save): void {
  const legalBefore = (s.original.needsLegal as string | undefined) ?? 'na'
  const legalAfter = (s.merged.needsLegal as string | undefined) ?? 'na'
  if (legalBefore !== legalAfter && !s.system) {
    if (legalAfter === 'complete' && s.role !== 'eic') throw forbidden('Yuridik koʻrikni faqat bosh muharrir «Bajarildi» deb belgilaydi.')
    if (legalBefore !== 'na' && legalAfter === 'na' && s.role !== 'eic' && s.role !== 'editor') {
      throw forbidden('Yuridik koʻrik talabini faqat muharrir olib tashlaydi.')
    }
  }
  if (legalBefore !== legalAfter) {
    if (legalAfter === 'complete') {
      // The audit concern records legal.signoff from the stamped sign-off.
      s.data.legalSignOff = { ...((s.data.legalSignOff as Doc | undefined) ?? {}), by: s.actor ?? null, at: nowIso() }
    } else if (legalBefore === 'complete') {
      s.data.legalSignOff = { by: null, at: null, note: null }
    }
  }
  const picBefore = (s.original.needsPicture as string | undefined) ?? 'na'
  const picAfter = (s.merged.needsPicture as string | undefined) ?? 'na'
  if (picBefore !== picAfter && !s.system && picAfter !== 'required' && s.role !== 'editor' && s.role !== 'eic') {
    throw forbidden('Rasm talabini faqat muharrir yopadi.')
  }
}

/** Permanent deletion from the trash (§5.8): never-published, not retained, not on legal hold. */
export const articleBeforeDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (wctx(req).importing) return
  const doc = (await req.payload.findByID({
    collection: ARTICLES,
    id,
    draft: true,
    trash: true,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req: isolated(req),
  })) as Doc | null
  if (!doc) return
  if (doc.firstPublishedAt) throw forbidden('Chop etilgan maqola oʻchirilmaydi — «Olib tashlash»dan foydalaning.')
  if (doc.legalHold) throw forbidden('Yuridik saqlovdagi maqola oʻchirilmaydi.')
  const retain = time(((doc.sponsored ?? {}) as Doc).retainUntil)
  if (retain !== undefined && retain > Date.now()) throw forbidden('Homiylik materiali saqlash muddati tugaguncha oʻchirilmaydi (Art. 15).')
}
