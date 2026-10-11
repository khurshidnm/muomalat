import type { Endpoint, PayloadHandler, PayloadRequest } from 'payload'
import { addDataAndFileToRequest, commitTransaction, initTransaction, killTransaction } from 'payload'

import { userRole } from '../access/roles'
import { errorResponse } from '../endpoints/transition'
import { isReadOnly } from '../security/readOnly'
import { captionLength } from './caption'
import { telegramConfigured } from './env'
import { KV } from './monitor'
import {
  approvalProblem,
  articleFacts,
  cancelProblem,
  confirmDeletedProblem,
  correctionOf,
  hasMessage,
  historyOf,
  idOf,
  isEdit,
  isLiveMessage,
  isolated,
  limitOf,
  messageLink,
  POSTS,
  STATUS_LABELS,
  telegramSettings,
  type Doc,
  type Id,
  type PostStatus,
  type TelegramAction,
} from './shared'

/**
 * `POST /api/telegram-posts/:id/action` with `{ action, sendAt? }` and
 * `GET /api/telegram-posts/:id/state`, behind the admin's Telegram panel.
 *
 * Custom endpoints get Payload's cookie auth and CSRF check but no access
 * control (PHASE0 item 14): a request without a user is 401, the post is
 * read with the caller's access, and the action is an update with
 * `overrideAccess: false`, so the collection's update access (editors and
 * the editor-in-chief) applies first and the read-only guard refuses it in
 * an incident. The rules themselves are the hooks' (src/payload/hooks/
 * telegram/posts.ts); the update and its audit row commit together.
 */

const ACTIONS = new Set<TelegramAction['action']>(['approve', 'cancel', 'confirm_deleted'])
const AUDIT = { approve: 'telegram.approve', cancel: 'telegram.cancel', confirm_deleted: 'telegram.delete' } as const

const json = (body: unknown, status = 200) => Response.json(body, { status })

const idParam = (req: PayloadRequest): Id | undefined => {
  const raw = req.routeParams?.id
  if (typeof raw !== 'string' || raw === '') return undefined
  return /^\d+$/.test(raw) ? Number(raw) : raw
}

const readAsCaller = async (req: PayloadRequest, id: Id) =>
  (await req.payload.findByID({ collection: POSTS, id, depth: 0, overrideAccess: false, req: isolated(req) })) as unknown as Doc

function labelFor(action: TelegramAction['action'], post: Doc): string {
  if (action === 'confirm_deleted') return 'Qoʻlda oʻchirildi'
  if (action === 'cancel') return post.status === 'queued' ? 'Yuborishni bekor qilish' : isEdit(post) ? 'Tahrirni bekor qilish' : 'Bekor qilish'
  if (post.kind === 'retraction') return 'Olib tashlashni tasdiqlash'
  if (isEdit(post)) return 'Tahrirni tasdiqlash'
  return post.status === 'failed' ? 'Qayta navbatga qoʻyish' : 'Tasdiqlash va navbatga qoʻyish'
}

export const telegramActionHandler: PayloadHandler = async (req) => {
  if (!req.user) return json({ errors: [{ message: 'Tizimga kiring.' }] }, 401)
  const id = idParam(req)
  if (id === undefined) return json({ errors: [{ message: 'Post koʻrsatilmagan.' }] }, 400)
  if (req.data === undefined) await addDataAndFileToRequest(req)
  const body = (req.data ?? {}) as { action?: string; sendAt?: string }
  const action = body.action as TelegramAction['action']
  if (!ACTIONS.has(action)) return json({ errors: [{ message: 'Bunday amal yoʻq.' }] }, 400)
  let committed = false
  try {
    await initTransaction(req)
    const post = await readAsCaller(req, id)
    const telegramAction: TelegramAction = { action, ...(action === 'approve' && typeof body.sendAt === 'string' && body.sendAt ? { sendAt: body.sendAt } : {}) }
    const updated = (await req.payload.update({
      collection: POSTS,
      id,
      data: {},
      depth: 0,
      req,
      overrideAccess: false,
      context: { telegramAction, audit: { action: AUDIT[action], summary: `${labelFor(action, post)} (#${String(id)})` } },
    })) as unknown as Doc
    await commitTransaction(req)
    committed = true
    const when = updated.status === 'queued' && typeof updated.sendAt === 'string' ? ` Yuboriladi: ${updated.sendAt}.` : ''
    return json({ message: `«${labelFor(action, post)}» bajarildi.${when}`, doc: { id: updated.id, status: updated.status, sendAt: updated.sendAt ?? null } })
  } catch (error) {
    if (!committed) await killTransaction(req)
    return errorResponse(error)
  }
}

export const telegramStateHandler: PayloadHandler = async (req) => {
  if (!req.user) return json({ errors: [{ message: 'Tizimga kiring.' }] }, 401)
  const id = idParam(req)
  if (id === undefined) return json({ errors: [{ message: 'Post koʻrsatilmagan.' }] }, 400)
  try {
    const post = await readAsCaller(req, id)
    const articleId = idOf(post.article)
    const facts = articleId === undefined ? undefined : await articleFacts(req.payload, articleId, req)
    const actor = { id: req.user.id as Id, role: userRole(req) }
    const settings = await telegramSettings(req.payload, req)
    const rights = await req.payload.kv.get<{ ok: boolean; at: string; summary: string }>(KV.rights)
    let replyTargetLive = true
    if (post.kind === 'correction_reply' && post.replyTo) {
      const { docs } = await req.payload.find({ collection: POSTS, where: { messageId: { equals: String(post.replyTo) } }, limit: 5, depth: 0, overrideAccess: true, req: isolated(req) })
      replyTargetLive = docs.some((d) => isLiveMessage(d as unknown as Doc))
    }
    const checks: { action: TelegramAction['action']; problem: string | null }[] = [
      { action: 'approve', problem: facts ? approvalProblem(actor, post, facts, { replyTargetLive }) : 'Post maqolaga bogʻlanmagan.' },
      { action: 'cancel', problem: cancelProblem(actor, post) },
      { action: 'confirm_deleted', problem: confirmDeletedProblem(actor, post) },
    ]
    const actions = checks.filter((c) => !c.problem).map((c) => ({ id: c.action, label: labelFor(c.action, post) }))
    const status = post.status as PostStatus
    const approvable: PostStatus[] = post.kind === 'retraction' ? ['draft', 'failed'] : ['draft', 'failed', 'edit_pending']
    const approveProblem = checks[0].problem
    const notes: string[] = []
    if (isEdit(post) && ['edit_pending', 'approved'].includes(status) && historyOf(post).some((h) => String(h.action ?? '').startsWith('edit_requested') && correctionOf(h.action))) {
      notes.push('Bu tahrir maqoladagi tuzatish uchun. Faktik tuzatishda tasdiq «TUZATISH:» javob postini ham navbatga qoʻyadi.')
    }
    if (post.kind === 'retraction') notes.push('48 soatdan yosh postlarni bot oʻchiradi; eskilarining matni olib tashlash xabariga almashtiriladi va kanal egasi ularni qoʻlda oʻchiradi.')
    if (post.sponsored) notes.push('Reklama posti: birinchi qator «Reklama · hamkor» oʻzgarmaydi; tasdiqni faqat bosh muharrir beradi.')
    return json({
      id: post.id,
      kind: post.kind,
      status,
      statusLabel: STATUS_LABELS[status] ?? status,
      sendAt: post.sendAt ?? null,
      now: Date.now(),
      sentAt: post.sentAt ?? null,
      messageLink: hasMessage(post) ? (messageLink(post.chatId as string | undefined, post.messageId as string) ?? null) : null,
      lastError: post.lastError ?? null,
      sponsored: Boolean(post.sponsored),
      limit: limitOf(post, facts),
      length: captionLength(String(post.captionHtml ?? '')),
      article: facts?.exists ? { id: facts.id, title: facts.title, live: facts.live, withdrawn: facts.withdrawn, embargo: facts.embargo } : null,
      posting: {
        configured: telegramConfigured(),
        enabled: settings.postingEnabled,
        delayMinutes: settings.delayMinutes,
        readOnly: await isReadOnly({ req }),
        rights: rights ?? null,
      },
      actions,
      // Why this user cannot approve a post that is waiting for approval (the panel shows it, so nobody guesses).
      hint: !actions.some((a) => a.id === 'approve') && approvable.includes(status) ? approveProblem : null,
      notes,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export const telegramEndpoints: Endpoint[] = [
  { path: '/:id/action', method: 'post', handler: telegramActionHandler },
  { path: '/:id/state', method: 'get', handler: telegramStateHandler },
]
