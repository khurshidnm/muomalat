import { isolateObjectProperty, ValidationError, type CollectionSlug, type Payload, type PayloadRequest } from 'payload'

import type { Role } from '../access/roles'
import { deliveryEnv } from '../delivery/env'
import { embargoActive } from '../hooks/workflow/embargo'
import type { TelegramPost } from '../../payload-types'
import { articleCaption, captionHtmlProblem, CAPTION_LIMIT, captionLength, shortUrlFor, TEXT_LIMIT } from './caption'
import { telegramEnv } from './env'
import { actionOf, correctionOf, STATUS_LABELS } from './labels'

export { actionOf, correctionOf, historyLabel, mark, STATUS_LABELS } from './labels'

/**
 * Vocabulary shared by the Telegram hooks, the outbox step, the worker and
 * the admin endpoints (CMS-SPEC §10.2–10.3).
 *
 * Lifecycle of a `telegram-posts` row:
 *
 * | kind               | draft → approve →  | worker          | later                                   |
 * |--------------------|--------------------|-----------------|-----------------------------------------|
 * | `article`          | `queued` (delay)   | `sent`          | caption edit: `edit_pending` → approve → `approved` → `edited` |
 * | `correction_reply` | `queued` (delay)   | `sent`          |                                         |
 * | `retraction`       | `approved` (eic)   | `retracted`, or `edited` while the channel owner still has to delete a post by hand | |
 *
 * `queued` is a new channel message waiting out its cancellable delay;
 * `approved` is an approved change to a message that already exists (an
 * edit, a retraction), applied on the worker's next run. `failed` needs an
 * editor: they re-approve it (re-queue) or cancel it; nothing is resent on
 * its own (§10.3 step 6).
 */

export const POSTS = 'telegram-posts' as CollectionSlug
export const ARTICLES = 'articles' as CollectionSlug

export type Id = string | number
export type Doc = Record<string, unknown>
export type Post = TelegramPost
export type PostStatus = Post['status']
export type PostKind = Post['kind']

/** Corrections that reach Telegram (§10.3 step 4); a `correction` also gets a reply post. */
export const CORRECTION_KINDS = new Set(['correction', 'clarification', 'editors_note'])

/** The bot can delete its posts for 48 h (Bot API deleteMessage); a minute is kept back for the call itself. */
export const DELETE_WINDOW_MS = 48 * 60 * 60 * 1000 - 60 * 1000
/** A queued post this late (the worker or posting was down) is not sent: an editor re-queues it. */
export const MAX_LATENESS_MS = 60 * 60 * 1000

export const MINUTE = 60 * 1000
export const nowIso = () => new Date().toISOString()

export const idOf = (v: unknown): Id | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'object') return (v as { id?: Id }).id
  return v as Id
}
export const sameId = (a: unknown, b: unknown) => {
  const x = idOf(a)
  const y = idOf(b)
  return x !== undefined && y !== undefined && String(x) === String(y)
}
const time = (v: unknown) => {
  if (v === null || v === undefined || v === '') return undefined
  const t = new Date(v as string).getTime()
  return Number.isNaN(t) ? undefined : t
}
export const timeOf = time

/** Nested Local API calls share the transaction but never the locale (payloadcms#18246). */
export const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])
/** The same, with a context of its own, for nested writes. */
export const isolatedWrite = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale', 'context'])

/**
 * `req.context` keys of this module. None can be set over HTTP (PHASE0 item 3).
 * - `telegramAction`: an admin action (approve, cancel, confirm_deleted) the
 *   hooks perform and check, set by the endpoint (or a cascade from it);
 * - `telegramBookkeeping`: the worker recording what Telegram did (status,
 *   message id, history). It changes no content, so the caption checks do not
 *   run again: a sent post must always be recordable.
 */
export type TelegramAction = { action: 'approve' | 'cancel' | 'confirm_deleted'; sendAt?: string; cascade?: boolean }
export type TelegramContext = { telegramAction?: TelegramAction; telegramBookkeeping?: boolean }
export const tctx = (req: PayloadRequest) => req.context as TelegramContext & Record<string, unknown>

/** Context for the worker's and the outbox's own writes; `audit` names the row (src/payload/audit). */
export const systemContext = (audit?: { action?: string; summary?: string }, bookkeeping = true) => ({
  trustedInternal: true,
  auditActor: 'system:telegram',
  ...(bookkeeping ? { telegramBookkeeping: true } : {}),
  ...(audit ? { audit } : {}),
})

/** A field error on a telegram-posts field, shown next to it in the admin. */
export function postFieldError(req: PayloadRequest, path: string, message: string) {
  const label = path === 'captionHtml' ? 'Matn (HTML)' : path === 'article' ? 'Maqola' : path === 'photo' ? 'Rasm' : undefined
  return new ValidationError({ collection: POSTS, errors: [{ path, message, ...(label ? { label } : {}) }], req }, req.t)
}

// ── history (Art. 15: every caption ever sent or edited) ────────────────────

export type HistoryEntry = { at: string; action: string; captionHtml?: string | null; id?: string | null }

export const historyOf = (post: Pick<Post, 'history'> | Doc | null | undefined): HistoryEntry[] =>
  (((post as Doc | null | undefined)?.history as HistoryEntry[] | null | undefined) ?? []).map((h) => ({ ...h }))

export const withHistory = (post: Pick<Post, 'history'> | Doc | null | undefined, ...entries: Omit<HistoryEntry, 'at'>[]) => [
  ...historyOf(post),
  ...entries.map((e) => ({ at: nowIso(), ...e })),
]

const DELIVERED = new Set(['sent', 'edited', 'manual_post', 'manual_edit', 'retraction_caption'])

/** The caption the channel shows now: the last one sent or edited. */
export function deliveredCaption(post: Pick<Post, 'history' | 'captionHtml'> | Doc): string | undefined {
  const h = historyOf(post)
  for (let i = h.length - 1; i >= 0; i--) if (DELIVERED.has(actionOf(h[i].action)) && typeof h[i].captionHtml === 'string') return h[i].captionHtml as string
  return undefined
}

/** The status a post with a channel message returns to when a pending edit is cancelled. */
export const deliveredStatus = (post: Pick<Post, 'history'> | Doc): PostStatus =>
  historyOf(post).some((h) => actionOf(h.action) === 'edited' || actionOf(h.action) === 'manual_edit') ? 'edited' : 'sent'

/** Corrections this post has already taken up (an edit requested, a reply created). */
export const handledCorrections = (post: Pick<Post, 'history'> | Doc) => new Set(historyOf(post).map((h) => correctionOf(h.action)).filter((x): x is string => Boolean(x)))

// ── what a row is ───────────────────────────────────────────────────────────

/** The row has a message in the channel (sent by the bot, or recorded from a manual post). */
export const hasMessage = (post: Pick<Post, 'messageId'> | Doc) => Boolean((post as Doc).messageId)
/** Approving it changes an existing message rather than posting a new one. */
export const isEdit = (post: Pick<Post, 'kind' | 'messageId'> | Doc) => (post as Doc).kind === 'article' && hasMessage(post)
/** A message the bot posted that is still up, i.e. a retraction has something to do. */
export const isLiveMessage = (post: Doc) => hasMessage(post) && !['retracted', 'cancelled'].includes(String(post.status)) && post.kind !== 'retraction'
/** Rows a person may still change the caption of. */
export const EDITABLE: PostStatus[] = ['draft', 'edit_pending', 'failed', 'sent', 'edited']

// ── settings ────────────────────────────────────────────────────────────────

export type TelegramSettings = { postingEnabled: boolean; delayMinutes: number; channelChatId?: string; channelHandle?: string }

export async function telegramSettings(payload: Payload, req?: PayloadRequest): Promise<TelegramSettings> {
  const s = (await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
    select: { telegram: true } as never,
    ...(req ? { req: isolated(req) } : {}),
  })) as { telegram?: Doc | null }
  const t = (s.telegram ?? {}) as Doc
  const delay = Number(t.delayMinutes)
  return {
    postingEnabled: t.postingEnabled === true,
    delayMinutes: Number.isFinite(delay) ? Math.min(30, Math.max(2, delay)) : 3,
    channelChatId: typeof t.channelChatId === 'string' && t.channelChatId ? t.channelChatId : undefined,
    channelHandle: typeof t.channelHandle === 'string' && t.channelHandle ? t.channelHandle : undefined,
  }
}

/** The chat to post to: the numeric id the rights check stored, else TELEGRAM_CHANNEL itself. */
export const chatFor = (settings: TelegramSettings) => settings.channelChatId || telegramEnv().channel

/** A link staff can open to find the message (public channel by name, private by its numeric id). */
export function messageLink(chatId: string | null | undefined, messageId: string | number | null | undefined): string | undefined {
  if (!messageId) return undefined
  const channel = telegramEnv().channel
  if (channel.startsWith('@')) return `https://t.me/${channel.slice(1)}/${messageId}`
  const id = String(chatId ?? channel)
  return /^-100\d+$/.test(id) ? `https://t.me/c/${id.slice(4)}/${messageId}` : undefined
}

// ── the story behind a post ─────────────────────────────────────────────────

export type CorrectionRow = { id: string; kind: string; publicText: string; createdAt?: string; versionId?: string; telegramAction?: string }

export type ArticleFacts = {
  id: Id
  exists: boolean
  /** The main row is published (the public site shows it). */
  live: boolean
  deleted: boolean
  withdrawn: boolean
  embargo: boolean
  title: string
  lead: string
  shortCode?: string
  shortUrl?: string
  rubricSlug?: string
  imageId?: Id
  sponsored: boolean
  partner?: string
  /** Staff accounts of the bylines, and the account that submitted it: none may approve its posts (I1). */
  authors: Id[]
  autopost: boolean
  captionOverride?: string
  silent: boolean
  notice?: string
  corrections: CorrectionRow[]
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** The live story (Uzbek), as the public site shows it. */
export async function articleFacts(payload: Payload, articleId: Id, req?: PayloadRequest): Promise<ArticleFacts> {
  const doc = (await payload.findByID({
    collection: ARTICLES,
    id: articleId,
    draft: false,
    depth: 0,
    locale: 'uz',
    trash: true,
    disableErrors: true,
    overrideAccess: true,
    ...(req ? { req: isolated(req) } : {}),
  })) as Doc | null
  if (!doc) {
    return { id: articleId, exists: false, live: false, deleted: false, withdrawn: false, embargo: false, title: '', lead: '', sponsored: false, authors: [], autopost: false, silent: false, corrections: [] }
  }
  const rubricId = idOf(doc.rubric)
  const rubric =
    rubricId === undefined
      ? null
      : ((await payload.findByID({
          collection: 'rubrics' as CollectionSlug,
          id: rubricId,
          depth: 0,
          draft: false,
          disableErrors: true,
          overrideAccess: true,
          select: { slug: true } as never,
          ...(req ? { req: isolated(req) } : {}),
        })) as Doc | null)
  const withdrawal = (doc.withdrawal ?? {}) as Doc
  const sponsored = (doc.sponsored ?? {}) as Doc
  const telegram = (doc.telegram ?? {}) as Doc
  const shortCode = str(doc.shortCode) || undefined
  const authors = [...(((doc._authorUsers as unknown[]) ?? []).map(idOf) as (Id | undefined)[]), idOf(doc.submittedBy)].filter((x): x is Id => x !== undefined)
  return {
    id: doc.id as Id,
    exists: true,
    live: doc._status === 'published' && !doc.deletedAt,
    deleted: Boolean(doc.deletedAt),
    withdrawn: Boolean(withdrawal.at) || doc.workflowStatus === 'withdrawn',
    embargo: embargoActive(doc),
    title: str(doc.title),
    lead: str(doc.lead),
    shortCode,
    shortUrl: shortCode ? shortUrlFor(deliveryEnv().siteUrl, shortCode) : undefined,
    rubricSlug: str(rubric?.slug) || undefined,
    imageId: idOf(doc.image),
    sponsored: sponsored.enabled === true,
    partner: str(sponsored.partner) || undefined,
    authors,
    autopost: telegram.autopost !== false,
    captionOverride: str(telegram.captionOverride).trim() || undefined,
    silent: telegram.silent === true,
    notice: str(withdrawal.publicNotice) || undefined,
    corrections: (((doc.corrections as Doc[] | undefined) ?? []) as Doc[])
      .filter((r) => r.id)
      .map((r) => ({
        id: String(r.id),
        kind: str(r.kind) || 'correction',
        publicText: str(r.publicText),
        createdAt: str(r.createdAt) || undefined,
        versionId: str(r.versionId) || undefined,
        telegramAction: str(r.telegramAction) || 'none',
      })),
  }
}

/** The caption limit of a post: 1024 with a photo (its own, or the story's hero image), 4096 for text. */
export const limitOf = (post: Pick<Post, 'photo' | 'kind'> | Doc, facts?: Pick<ArticleFacts, 'imageId'>) =>
  (post as Doc).kind === 'correction_reply' ? TEXT_LIMIT : idOf((post as Doc).photo) !== undefined || facts?.imageId !== undefined ? CAPTION_LIMIT : TEXT_LIMIT

/** The template caption of a story: the hand-written one if any (not for ads), else title, lead, link, hashtag. */
export function templateCaption(facts: ArticleFacts, partner?: string, limit?: number): string {
  if (!facts.sponsored && facts.captionOverride && !captionHtmlProblem(facts.captionOverride)) return facts.captionOverride
  return articleCaption(
    { title: facts.title, lead: facts.lead, shortUrl: facts.shortUrl ?? '', rubricSlug: facts.rubricSlug, sponsored: facts.sponsored, partner: partner ?? facts.partner },
    limit,
  )
}

// ── who may do what (I1, I2, I4; §10.3) ─────────────────────────────────────

export type Actor = { id?: Id; role?: Role }

/** Why `actor` may not approve this post now; null when they may. */
export function approvalProblem(actor: Actor, post: Doc, facts: ArticleFacts, opts: { replyTargetLive?: boolean } = {}): string | null {
  if (actor.role !== 'editor' && actor.role !== 'eic') return 'Telegram postini faqat muharrir yoki bosh muharrir tasdiqlaydi.'
  const kind = post.kind as PostKind
  if (kind === 'retraction' && actor.role !== 'eic') return 'Postni kanaldan olib tashlashni faqat bosh muharrir tasdiqlaydi.'
  if (post.sponsored && actor.role !== 'eic') return 'Reklama postini faqat bosh muharrir tasdiqlaydi.'
  if (sameId(post.requestedBy, actor.id)) return 'Postni soʻragan yoki matnini yozgan xodim uni tasdiqlay olmaydi: buni boshqa muharrir qiladi.'
  if (kind !== 'retraction' && facts.authors.some((a) => sameId(a, actor.id))) return 'Maqola muallifi uning Telegram postini tasdiqlay olmaydi: buni boshqa muharrir qiladi.'
  const status = post.status as PostStatus
  const allowed: PostStatus[] = kind === 'retraction' ? ['draft', 'failed'] : ['draft', 'failed', 'edit_pending']
  if (!allowed.includes(status)) return `«${STATUS_LABELS[status] ?? status}» holatidagi post tasdiqlanmaydi.`
  if (!facts.exists || facts.deleted) return 'Maqola topilmadi yoki oʻchirilgan.'
  if (kind !== 'retraction') {
    if (!facts.live) return 'Maqola chop etilmagan: post faqat chop etilgan maqola uchun yuboriladi.'
    if (facts.withdrawn) return 'Maqola olib tashlangan: post yuborilmaydi.'
    if (facts.embargo) return 'Embargo amalda: post yuborilmaydi.'
    if (kind === 'correction_reply' && opts.replyTargetLive === false) return 'Tuzatish javob qilinadigan post kanalda yoʻq.'
  }
  const caption = str(post.captionHtml)
  if (!caption.trim()) return 'Post matni boʻsh.'
  const problem = captionHtmlProblem(caption)
  if (problem) return problem
  const limit = limitOf(post, facts)
  const n = captionLength(caption)
  if (n > limit) return `Post matni teglarsiz ${n} belgi: ${limit} belgidan oshmasin.`
  return null
}

export function cancelProblem(actor: Actor, post: Doc): string | null {
  if (actor.role !== 'editor' && actor.role !== 'eic') return 'Telegram postini faqat muharrir yoki bosh muharrir bekor qiladi.'
  const status = post.status as PostStatus
  const ok: PostStatus[] = ['draft', 'queued', 'approved', 'edit_pending', 'failed']
  if (!ok.includes(status)) return `«${STATUS_LABELS[status] ?? status}» holatidagi postni bekor qilib boʻlmaydi.`
  return null
}

export function confirmDeletedProblem(actor: Actor, post: Doc): string | null {
  if (actor.role !== 'editor' && actor.role !== 'eic') return 'Faqat muharrir yoki bosh muharrir belgilaydi.'
  if (post.kind !== 'retraction' || post.status !== 'edited') return 'Qoʻlda oʻchirish faqat olib tashlash vazifasi ochiq boʻlganda belgilanadi.'
  return null
}
