import { ValidationError, type Payload } from 'payload'

import { sendOperationalAlert } from '../audit/alerts'
import type { Targets } from '../delivery/tags'
import type { PublishEvent } from '../../payload-types'
import { appendNote, articleCaption, correctionNote, correctionReplyText, retractionCaption } from './caption'
import { telegramConfigured } from './env'
import {
  actionOf,
  articleFacts,
  CORRECTION_KINDS,
  deliveredCaption,
  deliveredStatus,
  handledCorrections,
  hasMessage,
  historyOf,
  isLiveMessage,
  limitOf,
  mark,
  POSTS,
  systemContext,
  templateCaption,
  timeOf,
  withHistory,
  type ArticleFacts,
  type CorrectionRow,
  type Doc,
  type Id,
} from './shared'

/**
 * The Telegram step of the publish outbox (CMS-SPEC §8.4 step 3, §10.3),
 * called by src/worker/jobs/outbox.ts once per event after the purge. It only
 * prepares rows; nothing reaches Telegram until a person approves a row and
 * the telegram job sends it.
 *
 * - First publication (`publish_first`, or a scheduled run that is one) of a
 *   story with `telegram.autopost`: a `draft` post from the template; the
 *   sponsored template for ads (step 1).
 * - A published `correction`, `clarification` or `editors_note`: the post's
 *   caption plus "Tuzatish (dd.mm): …" as `edit_pending`, and for a
 *   correction a `correction_reply` draft (step 4). A post not sent yet is
 *   rebuilt from the corrected story instead, and its approval voided.
 * - Withdrawal: pending rows cancelled, and a `retraction` draft for the
 *   editor-in-chief when the story has messages in the channel (step 5).
 * - Unpublish or delete: pending rows cancelled. Sent posts stay; the short
 *   link then answers 404.
 *
 * The outbox retries a whole batch when any step throws, so every branch is
 * idempotent: it looks for the rows it would create first. A refusal by the
 * caption checks is permanent, so it is alerted and not thrown (a throw would
 * also hold back the cache refresh of the batch).
 */

let warnedUnconfigured = false

const idFrom = (docId: string): Id => (/^\d+$/.test(docId) ? Number(docId) : docId)

async function postsOf(payload: Payload, articleId: Id): Promise<Doc[]> {
  const { docs } = await payload.find({
    collection: POSTS,
    where: { article: { equals: articleId } },
    sort: 'createdAt',
    depth: 0,
    limit: 200,
    overrideAccess: true,
  })
  return docs as unknown as Doc[]
}

export async function telegramForEvent(payload: Payload, event: PublishEvent, targets: Targets): Promise<void> {
  if (event.collection !== 'articles' || !event.docId) return
  if (!telegramConfigured()) {
    if (!warnedUnconfigured) payload.logger.info('telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL not set; no Telegram posts are prepared')
    warnedUnconfigured = true
    return
  }
  const id = idFrom(event.docId)
  try {
    switch (event.kind) {
      case 'publish_first':
        await draftForFirstPublication(payload, id)
        break
      case 'schedule_run':
        if (targets.first) await draftForFirstPublication(payload, id)
        else await afterChange(payload, id)
        break
      case 'publish_change':
        await afterChange(payload, id)
        break
      case 'withdraw':
        await afterWithdrawal(payload, id)
        break
      case 'unpublish':
      case 'delete':
        await cancelPending(payload, await postsOf(payload, id), 'Maqola nashrdan olindi')
        break
    }
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    const detail = (error.data as { errors?: { message?: string }[] } | undefined)?.errors?.map((e) => e.message).join(' ') || error.message
    payload.logger.warn(`telegram: article ${String(id)}: post not prepared: ${detail}`)
    await sendOperationalAlert(payload, 'Telegram posti tayyorlanmadi', `Maqola #${String(id)} (${event.kind}): ${detail}. Postni qoʻlda yarating yoki matnni tuzating.`)
  }
}

// ── first publication ───────────────────────────────────────────────────────

async function draftForFirstPublication(payload: Payload, articleId: Id) {
  const facts = await articleFacts(payload, articleId)
  if (!facts.live || facts.withdrawn || facts.embargo) return
  if (!facts.autopost) {
    payload.logger.info(`telegram: article ${String(articleId)} has autopost off; no draft`)
    return
  }
  const posts = await postsOf(payload, articleId)
  if (posts.some((p) => p.kind === 'article')) return
  const draft: Doc = { article: articleId, kind: 'article', photo: facts.imageId ?? null }
  const captionHtml = templateCaption(facts, undefined, limitOf(draft, facts))
  await payload.create({
    collection: POSTS,
    data: {
      ...draft,
      status: 'draft',
      captionHtml,
      silent: facts.silent,
      sponsored: facts.sponsored,
      requestedBy: null,
      history: withHistory(undefined, { action: 'created', captionHtml }),
    } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ summary: facts.sponsored ? 'Reklama posti qoralamasi (birinchi nashr)' : 'Avtomatik post qoralamasi (birinchi nashr)' }, false),
  })
}

// ── corrections ─────────────────────────────────────────────────────────────

/** Corrections that are public (their version is stamped) and of a kind Telegram hears about. */
const publicCorrections = (facts: ArticleFacts) => facts.corrections.filter((c) => CORRECTION_KINDS.has(c.kind) && c.versionId && c.publicText.trim())

async function afterChange(payload: Payload, articleId: Id) {
  const facts = await articleFacts(payload, articleId)
  if (!facts.live || facts.withdrawn) return
  const corrections = publicCorrections(facts)
  if (!corrections.length) return
  const posts = await postsOf(payload, articleId)
  const handled = new Set(posts.flatMap((p) => [...handledCorrections(p)]))
  const fresh = corrections.filter((c) => !handled.has(c.id))
  if (!fresh.length) return

  // Posts not in the channel yet: rebuilt from the corrected story; whoever approved them sees it again.
  for (const post of posts.filter((p) => p.kind === 'article' && !hasMessage(p) && ['draft', 'queued', 'failed'].includes(String(p.status)))) {
    const newer = fresh.filter((c) => (timeOf(c.createdAt) ?? 0) > (timeOf(post.createdAt) ?? 0))
    if (!newer.length) continue
    const captionHtml = templateCaption(facts, undefined, limitOf(post, facts))
    await payload.update({
      collection: POSTS,
      id: post.id as Id,
      data: {
        status: 'draft',
        approvedBy: null,
        requestedBy: null,
        captionHtml,
        history: withHistory(post, ...newer.map((c) => ({ action: mark(post.status === 'queued' ? 'approval_voided' : 'rebuilt', c.id), captionHtml }))),
      } as never,
      depth: 0,
      overrideAccess: true,
      context: systemContext({ summary: 'Maqolaga tuzatish kiritildi: post matni qayta yasaldi, qayta tasdiqlash kerak' }, false),
    })
  }

  // The post in the channel: one caption edit (all new notes at once) and a reply per factual correction. The
  // bot's own post first: editing one an admin posted by hand needs can_edit_messages (§10.5).
  const byBot = (p: Doc) => historyOf(p).some((h) => actionOf(h.action) === 'sent')
  const live = posts
    .filter((p) => p.kind === 'article' && isLiveMessage(p))
    .sort((a, b) => Number(byBot(b)) - Number(byBot(a)) || (timeOf(b.sentAt) ?? 0) - (timeOf(a.sentAt) ?? 0))[0]
  if (!live) return
  const sentAt = timeOf(live.sentAt) ?? 0
  const due = fresh.filter((c) => (timeOf(c.createdAt) ?? 0) >= sentAt)
  if (!due.length) return
  // An edit still waiting (or one that failed) already carries the earlier notes: add to it.
  const pending = ['edit_pending', 'approved', 'failed'].includes(String(live.status))
  let caption = pending ? String(live.captionHtml ?? '') : (deliveredCaption(live) ?? String(live.captionHtml ?? ''))
  const limit = limitOf(live, facts)
  for (const c of due) {
    const note = correctionNote(c.kind, c.publicText, c.createdAt ?? Date.now())
    caption =
      appendNote(caption, note, limit) ??
      appendNote(articleCaption({ title: facts.title, shortUrl: facts.shortUrl ?? '', rubricSlug: facts.rubricSlug, sponsored: facts.sponsored, partner: facts.partner }, limit), note, limit) ??
      caption
  }
  await payload.update({
    collection: POSTS,
    id: live.id as Id,
    data: {
      status: 'edit_pending',
      approvedBy: null,
      requestedBy: null,
      captionHtml: caption,
      history: withHistory(live, ...due.map((c) => ({ action: mark('edit_requested', c.id), captionHtml: caption }))),
    } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ summary: `Tuzatish: kanaldagi post matnini tahrirlash soʻraldi (${due.map((c) => c.kind).join(', ')})` }, false),
  })
  for (const c of due.filter((x) => x.kind === 'correction')) await createReply(payload, facts, live, c)
}

async function createReply(payload: Payload, facts: ArticleFacts, live: Doc, c: CorrectionRow) {
  const captionHtml = correctionReplyText(c.publicText, facts.shortUrl ?? '')
  await payload.create({
    collection: POSTS,
    data: {
      article: facts.id,
      kind: 'correction_reply',
      status: 'draft',
      captionHtml,
      replyTo: String(live.messageId),
      chatId: live.chatId ?? null,
      sponsored: facts.sponsored,
      requestedBy: null,
      history: withHistory(undefined, { action: mark('created', c.id), captionHtml }),
    } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ summary: 'TUZATISH javob posti qoralamasi' }, false),
  })
}

// ── withdrawal, unpublish ───────────────────────────────────────────────────

/** Rows still waiting for a person or the worker are stopped; a pending edit falls back to what the channel shows. */
async function cancelPending(payload: Payload, posts: Doc[], why: string) {
  for (const post of posts) {
    const status = String(post.status)
    if (!['draft', 'queued', 'approved', 'edit_pending'].includes(status)) continue
    if (post.kind === 'retraction') continue
    const edit = hasMessage(post)
    await payload.update({
      collection: POSTS,
      id: post.id as Id,
      data: (edit
        ? { status: deliveredStatus(post), captionHtml: deliveredCaption(post) ?? post.captionHtml ?? null, history: withHistory(post, { action: 'edit_cancelled' }) }
        : { status: 'cancelled', history: withHistory(post, { action: 'cancelled' }) }) as never,
      depth: 0,
      overrideAccess: true,
      context: systemContext({ action: 'telegram.cancel', summary: why }),
    })
  }
}

async function afterWithdrawal(payload: Payload, articleId: Id) {
  const posts = await postsOf(payload, articleId)
  await cancelPending(payload, posts, 'Maqola olib tashlandi')
  const fresh = await postsOf(payload, articleId)
  const live = fresh.filter(isLiveMessage)
  if (!live.length) return
  if (fresh.some((p) => p.kind === 'retraction' && ['draft', 'approved', 'failed'].includes(String(p.status)))) return
  const facts = await articleFacts(payload, articleId)
  const main = live.filter((p) => p.kind === 'article').sort((a, b) => (timeOf(a.sentAt) ?? 0) - (timeOf(b.sentAt) ?? 0))[0] ?? live[0]
  const captionHtml = retractionCaption({ notice: facts.notice, shortUrl: facts.shortUrl, sponsored: facts.sponsored, partner: facts.partner })
  await payload.create({
    collection: POSTS,
    data: {
      article: articleId,
      kind: 'retraction',
      status: 'draft',
      captionHtml,
      replyTo: String(main.messageId),
      chatId: main.chatId ?? null,
      sponsored: facts.sponsored,
      requestedBy: null,
      history: withHistory(undefined, { action: 'created', captionHtml }),
    } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ summary: `Maqola olib tashlandi: kanaldagi ${live.length} ta xabarni olib tashlash bosh muharrir tasdigʻini kutmoqda` }, false),
  })
}
