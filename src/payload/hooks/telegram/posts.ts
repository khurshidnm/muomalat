import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { userRole } from '../../access/roles'
import { captionHtmlProblem, splitSponsored, sponsoredEditProblem } from '../../telegram/caption'
import {
  approvalProblem,
  articleFacts,
  cancelProblem,
  confirmDeletedProblem,
  correctionOf,
  deliveredCaption,
  deliveredStatus,
  EDITABLE,
  hasMessage,
  historyOf,
  idOf,
  isEdit,
  isLiveMessage,
  isolated,
  isolatedWrite,
  limitOf,
  mark,
  MINUTE,
  nowIso,
  postFieldError,
  POSTS,
  sameId,
  STATUS_LABELS,
  tctx,
  telegramSettings,
  templateCaption,
  timeOf,
  withHistory,
  type ArticleFacts,
  type Doc,
  type Id,
  type PostStatus,
  type TelegramAction,
} from '../../telegram/shared'

/**
 * Rules of `telegram-posts` (CMS-SPEC §10.2–10.3, tests I1, I2, I4), the
 * workflow concern's entry for the collection. Three kinds of write:
 *
 * - **An admin action** (`context.telegramAction`, set only by the endpoint
 *   in src/payload/telegram/endpoints.ts or a cascade from it): approve,
 *   cancel, or confirm a manual deletion. The rules are checked here, inside
 *   the save, so no other path can set the status: `status`, `approvedBy`
 *   and the message fields are system fields that Payload drops from a
 *   client's data.
 * - **A person's edit** (create, or a caption change): only a story that is
 *   live, not withdrawn and not under embargo; the caption must be HTML that
 *   Telegram parses; a sponsored caption keeps its «Reklama» line and only
 *   its partner may change (I4). Whoever writes a caption or picks a photo
 *   becomes `requestedBy`, and `requestedBy` may not approve (I1): one person
 *   never both writes and releases what the channel shows. Editing a sent
 *   post's caption asks for an edit (`edit_pending`), approved like a post.
 * - **The system** (the outbox step and the worker, `trustedInternal`): the
 *   module's own code, which keeps these rules itself.
 */

type Actor = { id?: Id; role?: ReturnType<typeof userRole> }
const actorOf = (req: PayloadRequest): Actor => ({ id: req.user?.id as Id | undefined, role: userRole(req) })

const forbidden = (message: string) => new APIError(message, 403)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** The document after this save: stored values overlaid by the incoming data. */
const overlay = (orig: Doc | undefined, data: Doc): Doc => {
  const out: Doc = { ...(orig ?? {}) }
  for (const [k, v] of Object.entries(data)) if (v !== undefined) out[k] = v
  return out
}

const isSystem = (req: PayloadRequest) => {
  const ctx = tctx(req)
  return !req.user || ctx.telegramBookkeeping === true || req.context?.trustedInternal === true
}

/** Whether a correction reply's target message is still in the channel. */
async function replyTargetLive(req: PayloadRequest, post: Doc): Promise<boolean> {
  if (post.kind !== 'correction_reply' || !post.replyTo) return true
  const { docs } = await req.payload.find({
    collection: POSTS,
    where: { and: [{ messageId: { equals: String(post.replyTo) } }, { kind: { equals: 'article' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: isolated(req),
  })
  return docs.some((d) => isLiveMessage(d as unknown as Doc))
}

// ── the admin actions ───────────────────────────────────────────────────────

async function performAction(req: PayloadRequest, action: TelegramAction, orig: Doc, data: Doc): Promise<Doc> {
  const actor = actorOf(req)
  const post = overlay(orig, data)
  if (action.action === 'approve') {
    const articleId = idOf(post.article)
    if (articleId === undefined) throw forbidden('Post maqolaga bogʻlanmagan.')
    const facts = await articleFacts(req.payload, articleId, req)
    const problem = approvalProblem(actor, post, facts, { replyTargetLive: await replyTargetLive(req, post) })
    if (problem) throw forbidden(problem)
    data.approvedBy = actor.id ?? null
    data.lastError = null
    if (post.kind === 'retraction' || isEdit(post)) {
      // A change to messages already in the channel: applied on the worker's next run, no delay.
      data.status = 'approved' satisfies PostStatus
      data.sendAt = nowIso()
    } else {
      // A new message: the cancellable delay of §10.3 step 2, or the chosen later time.
      const { delayMinutes } = await telegramSettings(req.payload, req)
      const earliest = Date.now() + delayMinutes * MINUTE
      const chosen = timeOf(action.sendAt) ?? timeOf(orig.status === 'draft' ? orig.sendAt : undefined) ?? 0
      data.status = 'queued' satisfies PostStatus
      data.sendAt = new Date(Math.max(earliest, chosen)).toISOString()
    }
    data.history = withHistory(orig, { action: 'approved' })
    return data
  }
  if (action.action === 'cancel') {
    const problem = cancelProblem(actor, post)
    if (problem) throw forbidden(problem)
    if (post.kind !== 'retraction' && hasMessage(post)) {
      // A pending edit: the channel keeps the caption it shows, and so does the row.
      data.captionHtml = deliveredCaption(orig) ?? orig.captionHtml ?? null
      data.status = deliveredStatus(orig)
      data.history = withHistory(orig, { action: mark('edit_cancelled', currentCorrection(orig)) })
    } else {
      data.status = 'cancelled' satisfies PostStatus
      data.history = withHistory(orig, { action: 'cancelled' })
    }
    return data
  }
  // confirm_deleted: the channel owner deleted the retracted posts by hand (§10.3 step 5).
  const problem = confirmDeletedProblem(actor, post)
  if (problem) throw forbidden(problem)
  data.status = 'retracted' satisfies PostStatus
  data.history = withHistory(orig, { action: 'manual_deletion_confirmed' })
  return data
}

/** The correction a pending edit is for: the newest `edit_requested:correction:<id>` entry. */
function currentCorrection(post: Doc): string | undefined {
  const h = historyOf(post)
  for (let i = h.length - 1; i >= 0; i--) {
    const a = String(h[i].action ?? '')
    if (a.startsWith('edit_requested')) return correctionOf(a)
    if (a.startsWith('edited') || a.startsWith('sent')) return undefined
  }
  return undefined
}

// ── a person's create or edit ───────────────────────────────────────────────

async function liveFacts(req: PayloadRequest, articleId: Id | undefined): Promise<ArticleFacts> {
  if (articleId === undefined) throw postFieldError(req, 'article', 'Maqolani tanlang.')
  const facts = await articleFacts(req.payload, articleId, req)
  if (!facts.exists || facts.deleted) throw postFieldError(req, 'article', 'Maqola topilmadi yoki oʻchirilgan.')
  if (!facts.live) throw postFieldError(req, 'article', 'Maqola chop etilmagan: Telegram posti faqat chop etilgan maqola uchun.')
  if (facts.withdrawn) throw postFieldError(req, 'article', 'Maqola olib tashlangan: Telegram posti yaratilmaydi.')
  if (facts.embargo) throw postFieldError(req, 'article', 'Embargo amalda: Telegram posti yaratilmaydi.')
  return facts
}

async function userCreate(req: PayloadRequest, data: Doc): Promise<Doc> {
  const role = userRole(req)
  if ((data.kind ?? 'article') !== 'article') throw forbidden('Qoʻlda faqat maqola posti yaratiladi; tuzatish va olib tashlash postlarini tizim yaratadi.')
  const facts = await liveFacts(req, idOf(data.article))
  if (role === 'commercial' && !facts.sponsored) throw forbidden('Tijorat boʻlimi faqat homiylik materiali uchun post taklif qiladi.')
  data.kind = 'article'
  data.status = 'draft' satisfies PostStatus
  data.sponsored = facts.sponsored
  data.requestedBy = req.user?.id ?? null
  data.approvedBy = null
  if (data.photo === undefined || data.photo === null) data.photo = facts.imageId ?? null
  if (data.silent === undefined || data.silent === null) data.silent = facts.silent
  const limit = limitOf(data, facts)
  const given = str(data.captionHtml).trim()
  if (facts.sponsored) {
    // The ad template is fixed (§10.3 step 1); a partner written on line one is kept.
    const partner = given ? splitSponsored(given)?.partner : undefined
    data.captionHtml = templateCaption(facts, partner ? partner.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : undefined, limit)
  } else if (!given) {
    data.captionHtml = templateCaption(facts, undefined, limit)
  } else {
    const problem = captionHtmlProblem(given)
    if (problem) throw postFieldError(req, 'captionHtml', problem)
    data.captionHtml = given
  }
  data.history = withHistory(undefined, { action: 'created', captionHtml: data.captionHtml as string })
  return data
}

async function userUpdate(req: PayloadRequest, orig: Doc, data: Doc): Promise<Doc> {
  if (data.kind !== undefined && data.kind !== orig.kind) throw forbidden('Post turi oʻzgartirilmaydi.')
  if (data.article !== undefined && !sameId(data.article, orig.article) && !(idOf(data.article) === undefined && idOf(orig.article) === undefined)) {
    throw forbidden('Postning maqolasi oʻzgartirilmaydi: yangi post yarating.')
  }
  const caption = data.captionHtml === undefined ? str(orig.captionHtml) : str(data.captionHtml)
  const captionChanged = caption !== str(orig.captionHtml)
  const photoChanged = data.photo !== undefined && String(idOf(data.photo) ?? '') !== String(idOf(orig.photo) ?? '')
  const otherChanged =
    (data.silent !== undefined && Boolean(data.silent) !== Boolean(orig.silent)) ||
    (data.sendAt !== undefined && (timeOf(data.sendAt) ?? null) !== (timeOf(orig.sendAt) ?? null))
  if (!captionChanged && !photoChanged && !otherChanged) return data

  const status = orig.status as PostStatus
  if (!EDITABLE.includes(status)) {
    throw forbidden(
      status === 'queued' || status === 'approved'
        ? 'Post tasdiqlangan va navbatda: oʻzgartirish uchun avval «Bekor qilish»ni bosing.'
        : `«${STATUS_LABELS[status] ?? status}» holatidagi post oʻzgartirilmaydi.`,
    )
  }
  if (orig.kind === 'retraction' && (captionChanged || photoChanged)) throw forbidden('Olib tashlash xabari maqoladan yasaladi va qoʻlda oʻzgartirilmaydi.')
  const message = hasMessage(orig)
  if (message && photoChanged) throw forbidden('Kanaldagi postning rasmi almashtirilmaydi: faqat matnini tahrirlash mumkin.')
  if (message && !captionChanged) return data

  let partnerOnly = false
  if (captionChanged) {
    const problem = captionHtmlProblem(caption)
    if (problem) throw postFieldError(req, 'captionHtml', problem)
    if (orig.sponsored) {
      const sp = sponsoredEditProblem(str(orig.captionHtml), caption)
      if (sp) throw postFieldError(req, 'captionHtml', sp)
      partnerOnly = splitSponsored(str(orig.captionHtml))?.rest === splitSponsored(caption)?.rest
    }
  }
  if (captionChanged || photoChanged) {
    // Who writes the text or picks the photo may not also release it (I1). The partner on an ad's first line is a
    // label the editor-in-chief checks at approval, so changing only it does not.
    if (!partnerOnly) data.requestedBy = req.user?.id ?? null
    data.approvedBy = null
    data.status = (message ? 'edit_pending' : 'draft') satisfies PostStatus
    if (message) data.history = withHistory(orig, { action: 'edit_requested', captionHtml: caption })
  }
  return data
}

// ── hooks ───────────────────────────────────────────────────────────────────

export const telegramPostBeforeChange: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const action = tctx(req).telegramAction
  if (action && operation === 'update' && originalDoc) return performAction(req, action, originalDoc as Doc, data as Doc)
  if (isSystem(req)) return data
  if (operation === 'create') return userCreate(req, data as Doc)
  return userUpdate(req, originalDoc as Doc, data as Doc)
}

/**
 * After an edit for a factual correction is approved or cancelled, its reply
 * post (created with it by the outbox) follows: one approval releases the
 * caption edit and queues the «TUZATISH:» reply behind the usual delay
 * (§10.3 step 4), where it can still be cancelled on its own.
 */
export const telegramPostAfterChange: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  const action = tctx(req).telegramAction
  if (!action || action.cascade || operation !== 'update') return doc
  const post = doc as Doc
  if (post.kind !== 'article' || !hasMessage(post)) return doc
  const cid = action.action === 'approve' ? currentCorrection(post) : correctionFromCancel(post)
  if (!cid) return doc
  const wanted = action.action === 'approve' ? ['draft'] : ['draft', 'queued']
  const { docs } = await req.payload.find({
    collection: POSTS,
    where: { and: [{ article: { equals: idOf(post.article) } }, { kind: { equals: 'correction_reply' } }, { status: { in: wanted } }] },
    depth: 0,
    limit: 20,
    overrideAccess: true,
    req: isolated(req),
  })
  const actor = actorOf(req)
  const articleId = idOf(post.article)
  const facts = action.action === 'approve' && articleId !== undefined ? await articleFacts(req.payload, articleId, req) : undefined
  for (const reply of docs as unknown as Doc[]) {
    if (!historyOf(reply).some((h) => correctionOf(h.action) === cid)) continue
    // Checked first: a refusal inside the nested save would fail the approval of the edit itself.
    const problem = action.action === 'cancel' ? cancelProblem(actor, reply) : facts ? approvalProblem(actor, reply, facts, { replyTargetLive: true }) : 'no story'
    if (problem) continue
    await req.payload.update({
      collection: POSTS,
      id: reply.id as Id,
      data: {},
      depth: 0,
      overrideAccess: true,
      req: isolatedWrite(req),
      context: {
        telegramAction: { action: action.action, cascade: true } satisfies TelegramAction,
        audit: { action: action.action === 'approve' ? 'telegram.approve' : 'telegram.cancel', summary: 'Tuzatish javobi tahrir bilan birga' },
      },
    })
  }
  return doc
}

function correctionFromCancel(post: Doc): string | undefined {
  const h = historyOf(post)
  const last = h[h.length - 1]
  return last && String(last.action ?? '').startsWith('edit_cancelled') ? correctionOf(last.action) : undefined
}

export const telegramPostHooks = {
  beforeChange: [telegramPostBeforeChange],
  afterChange: [telegramPostAfterChange],
}
