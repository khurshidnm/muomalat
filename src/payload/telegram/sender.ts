import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { sql } from '@payloadcms/db-postgres'
import type { CollectionSlug, Payload } from 'payload'
import sharp from 'sharp'

import { sendOperationalAlert } from '../audit/alerts'
import { isReadOnly } from '../security/readOnly'
import { retractionCaption, TEXT_LIMIT } from './caption'
import { createBotClient, isBadFileId, isCannotDelete, isMessageGone, isNotModified, TelegramError, type BotClient, type TgMessage } from './client'
import { redact, telegramConfigured } from './env'
import { verifyRights } from './monitor'
import {
  actionOf,
  articleFacts,
  chatFor,
  correctionOf,
  DELETE_WINDOW_MS,
  historyOf,
  idOf,
  isLiveMessage,
  MAX_LATENESS_MS,
  messageLink,
  POSTS,
  systemContext,
  telegramSettings,
  timeOf,
  withHistory,
  type ArticleFacts,
  type Doc,
  type Id,
} from './shared'

/**
 * The send step (CMS-SPEC §10.3 steps 3–6), run by the worker's telegram job
 * every few seconds. Due rows are `queued` posts whose `sendAt` has come and
 * `approved` changes (caption edits, retractions).
 *
 * Before anything goes out it checks again: read-only mode is off; the bot's
 * rights pass the allow-list (a fresh getChatMember, §10.5); for a new
 * message, `site-settings.telegram.postingEnabled` is on; the story is
 * published, not withdrawn and not under embargo; the row is still what was
 * approved. An approved edit or retraction still runs while posting is
 * switched off: it changes or removes what is already in the channel.
 *
 * At most once. Each row is claimed with one conditional UPDATE (status
 * `queued`/`approved` → `failed`, "sending…") before the Bot API call, and
 * the result is written after it. If the process dies in between, or
 * Telegram does not answer, the row stays `failed` with a note to check the
 * channel; an editor re-queues it (step 6). A second worker can never claim
 * the same row.
 */

export type SendOutcome = { sent: Id[]; edited: Id[]; retracted: Id[]; failed: { id: Id; error: string }[]; paused?: string }

export type SenderOptions = {
  client?: BotClient
  now?: () => number
  /** Rows to consider (tests share one database). */
  scope?: Record<string, unknown>
  /** Where uploads live (Media.ts staticDir). */
  mediaDir?: string
  alert?: (payload: Payload, subject: string, text: string) => Promise<void>
}

const CLAIM_NOTE = 'Yuborilmoqda. Bu yozuv qolgan boʻlsa, natija yozilmagan: kanalni tekshiring, keyin qayta tasdiqlang yoki bekor qiling.'
const BATCH = 10

type Db = { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
const dbOf = (payload: Payload) => (payload.db as unknown as { drizzle: Db }).drizzle

/** The conditional claim: true only for the one caller that moved the row out of `expected`. */
async function claim(payload: Payload, id: Id, expected: 'queued' | 'approved'): Promise<boolean> {
  const { rows } = await dbOf(payload).execute(
    sql`UPDATE "telegram_posts" SET "status" = 'failed', "last_error" = ${CLAIM_NOTE}, "updated_at" = now() WHERE "id" = ${Number(id)} AND "status" = ${expected} RETURNING "id"`,
  )
  return rows.length === 1
}

/**
 * Marks a correction row of the story as handled on Telegram (Articles.ts
 * `corrections[].telegramAction`), on the live row and in every version, so
 * the next publish does not reset it. One column, written directly like the
 * correction's version stamp (src/payload/hooks/workflow/corrections.ts): a
 * Local API update would create a new version of the story.
 */
async function stampCorrection(payload: Payload, correctionId: string, action: 'caption_edited' | 'reply_posted') {
  try {
    const db = dbOf(payload)
    const keep = action === 'caption_edited' ? sql` AND "telegram_action" IS DISTINCT FROM 'reply_posted'` : sql``
    await db.execute(sql`UPDATE "articles_corrections" SET "telegram_action" = ${action} WHERE "id" = ${correctionId}${keep}`)
    await db.execute(sql`UPDATE "_articles_v_version_corrections" SET "telegram_action" = ${action} WHERE "_uuid" = ${correctionId}${keep}`)
  } catch (error) {
    payload.logger.warn({ err: error, msg: `telegram: correction ${correctionId} not marked ${action}` })
  }
}

const largestPhoto = (m: TgMessage) => [...(m.photo ?? [])].sort((a, b) => b.width * b.height - a.width * a.height)[0]

type Photo = { fileId?: string; upload: () => Promise<{ data: Uint8Array; filename: string; contentType: string }> }

/**
 * The post's image (its own, else the story's hero image, as the field says):
 * a `file_id` Telegram already has for it, else the `og` size (JPEG
 * 1200×630) from disk.
 */
async function photoFor(payload: Payload, post: Doc, mediaDir: string, facts?: ArticleFacts): Promise<Photo | undefined> {
  const mediaId = idOf(post.photo) ?? facts?.imageId
  if (mediaId === undefined) return undefined
  const media = (await payload.findByID({ collection: 'media' as CollectionSlug, id: mediaId, depth: 0, disableErrors: true, overrideAccess: true })) as Doc | null
  if (!media) throw new Error(`Rasm #${String(mediaId)} topilmadi.`)
  const until = timeOf(media.usableUntil)
  if (until !== undefined && until < Date.now()) throw new Error('Rasmdan foydalanish muddati tugagan: boshqa rasm tanlang.')
  let fileId = typeof post.imageFileId === 'string' && post.imageFileId ? post.imageFileId : undefined
  if (!fileId) {
    const { docs } = await payload.find({
      collection: POSTS,
      where: { and: [{ photo: { equals: mediaId } }, { imageFileId: { exists: true } }] },
      sort: '-sentAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    fileId = (docs[0] as unknown as Doc | undefined)?.imageFileId as string | undefined
  }
  const og = ((media.sizes as Doc | undefined)?.og as Doc | undefined)?.filename
  const name = (typeof og === 'string' && og) || (typeof media.filename === 'string' ? media.filename : '')
  return {
    fileId,
    upload: async () => {
      if (!name) throw new Error(`Rasm #${String(mediaId)} faylining nomi yoʻq.`)
      const file = path.join(mediaDir, path.basename(name))
      const raw = await readFile(file)
      // Telegram takes JPEG reliably; the og size already is one, the original is WebP.
      const data = /\.jpe?g$/i.test(name) ? raw : await sharp(raw).jpeg({ quality: 85 }).toBuffer()
      return { data: new Uint8Array(data), filename: 'photo.jpg', contentType: 'image/jpeg' }
    },
  }
}

const errorText = (error: unknown) => {
  if (error instanceof TelegramError) {
    return error.delivered === 'unknown'
      ? `${error.message}. Xabar kanalga yetgan boʻlishi mumkin: kanalni tekshiring, keyin qayta tasdiqlang yoki bekor qiling.`
      : error.message
  }
  return redact(error instanceof Error ? error.message : String(error))
}

export async function processDuePosts(payload: Payload, options: SenderOptions = {}): Promise<SendOutcome> {
  const out: SendOutcome = { sent: [], edited: [], retracted: [], failed: [] }
  if (!telegramConfigured()) return { ...out, paused: 'not configured' }
  const now = options.now ?? Date.now
  const alert = options.alert ?? sendOperationalAlert
  const mediaDir = options.mediaDir ?? path.resolve(process.env.MEDIA_DIR || './.data/media')

  const { docs } = await payload.find({
    collection: POSTS,
    where: {
      and: [
        { or: [{ status: { equals: 'queued' } }, { status: { equals: 'approved' } }] },
        { sendAt: { less_than_equal: new Date(now()).toISOString() } },
        ...(options.scope ? [options.scope] : []),
      ],
    } as never,
    sort: 'sendAt',
    limit: BATCH,
    depth: 0,
    overrideAccess: true,
  })
  if (!docs.length) return out

  // Read-only mode (§12.10) pauses everything; the rows wait.
  if (await isReadOnly({ payload })) return { ...out, paused: 'read-only' }
  const settings = await telegramSettings(payload)
  const client = options.client ?? createBotClient()
  const chatId = chatFor(settings)
  const rights = await verifyRights(payload, client, chatId)
  if (!rights.ok) return { ...out, paused: rights.error ?? 'rights' }

  for (const row of docs as unknown as Doc[]) {
    const id = row.id as Id
    const isNew = row.status === 'queued'
    if (isNew && !settings.postingEnabled) {
      out.paused = 'posting disabled'
      continue
    }
    const t = now()
    if (isNew && t - (timeOf(row.sendAt) ?? t) > MAX_LATENESS_MS) {
      if (await claim(payload, id, 'queued')) {
        const error = 'Post vaqtida yuborilmadi (bir soatdan koʻp kechikdi): eskirgan boʻlishi mumkin. Tekshirib, qayta tasdiqlang yoki bekor qiling.'
        await recordFailure(payload, row, error, alert)
        out.failed.push({ id, error })
      }
      continue
    }
    const articleId = idOf(row.article)
    const facts = articleId === undefined ? undefined : await articleFacts(payload, articleId)
    // Checked before the claim, so a refused row keeps its reason and nothing half-happens.
    const refusal = refusalFor(row, facts)
    if (!(await claim(payload, id, isNew ? 'queued' : 'approved'))) continue
    try {
      if (refusal) throw new Error(refusal)
      if (row.kind === 'retraction') {
        const result = await retract(payload, client, row, facts!, chatId, alert)
        out.retracted.push(id)
        if (result.failed) out.failed.push({ id, error: result.failed })
      } else if (!isNew) {
        await applyEdit(payload, client, row, chatId)
        out.edited.push(id)
      } else {
        await send(payload, client, row, chatId, mediaDir, facts)
        out.sent.push(id)
      }
    } catch (error) {
      const text = errorText(error)
      await recordFailure(payload, row, text, alert)
      out.failed.push({ id, error: text })
    }
  }
  return out
}

/** §10.3 step 3: what must still hold for this row to go out. */
function refusalFor(row: Doc, facts: ArticleFacts | undefined): string | undefined {
  if (row.kind === 'retraction') return facts?.exists ? undefined : 'Maqola topilmadi.'
  if (!facts?.exists || facts.deleted) return 'Maqola topilmadi yoki oʻchirilgan: post yuborilmadi.'
  if (!facts.live) return 'Maqola chop etilmagan: post yuborilmadi.'
  if (facts.withdrawn) return 'Maqola olib tashlangan: post yuborilmadi.'
  if (facts.embargo) return 'Embargo amalda: post yuborilmadi.'
  if (!String(row.captionHtml ?? '').trim()) return 'Post matni boʻsh.'
  return undefined
}

async function recordFailure(payload: Payload, row: Doc, error: string, alert: NonNullable<SenderOptions['alert']>) {
  await payload.update({
    collection: POSTS,
    id: row.id as Id,
    data: { status: 'failed', lastError: error.slice(0, 2000), history: withHistory(row, { action: 'failed' }) } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ summary: `Telegram xatosi: ${error}`.slice(0, 900) }),
  })
  payload.logger.warn(`telegram: post ${String(row.id)} failed: ${error}`)
  await alert(payload, 'Telegram posti yuborilmadi', `Post #${String(row.id)} (${String(row.kind)}): ${error}`)
}

// ── a new message ───────────────────────────────────────────────────────────

/** Telegram has acted; if writing that down fails, the row must say so, or someone would send it again. */
async function recorded<T>(messageId: number, write: Promise<T>): Promise<T> {
  try {
    return await write
  } catch (error) {
    throw new Error(
      `Telegram bajardi (message_id ${messageId}), lekin natija CMSga yozilmadi: ${redact(error instanceof Error ? error.message : String(error))}. Qayta tasdiqlamang: kanalni tekshiring.`,
    )
  }
}

async function send(payload: Payload, client: BotClient, row: Doc, chatId: string, mediaDir: string, facts?: ArticleFacts) {
  const caption = String(row.captionHtml)
  const silent = row.silent === true
  let message: TgMessage
  if (row.kind === 'correction_reply') {
    const replyTo = Number(row.replyTo)
    if (!Number.isSafeInteger(replyTo) || replyTo <= 0) throw new Error('Javob beriladigan xabar raqami yoʻq.')
    const target = await payload.find({ collection: POSTS, where: { messageId: { equals: String(replyTo) } }, limit: 5, depth: 0, overrideAccess: true })
    if (!target.docs.some((d) => isLiveMessage(d as unknown as Doc))) throw new Error('Tuzatish javob qilinadigan post kanalda yoʻq.')
    message = await client.sendMessage({ chatId, text: caption, silent, replyTo, preview: false })
  } else {
    const photo = await photoFor(payload, row, mediaDir, facts)
    if (!photo) message = await client.sendMessage({ chatId, text: caption.slice(0, TEXT_LIMIT), silent })
    else if (photo.fileId) {
      try {
        message = await client.sendPhoto({ chatId, photo: photo.fileId, caption, silent })
      } catch (error) {
        // Telegram refused the file id itself, so nothing was posted: upload the file once instead.
        if (!isBadFileId(error)) throw error
        message = await client.sendPhoto({ chatId, photo: await photo.upload(), caption, silent })
      }
    } else message = await client.sendPhoto({ chatId, photo: await photo.upload(), caption, silent })
  }
  const largest = largestPhoto(message)
  await recorded(message.message_id, payload.update({
    collection: POSTS,
    id: row.id as Id,
    data: {
      status: 'sent',
      chatId: String(message.chat.id),
      messageId: String(message.message_id),
      sentAt: new Date((message.date || Date.now() / 1000) * 1000).toISOString(),
      imageFileId: largest?.file_id ?? (row.imageFileId as string | undefined) ?? null,
      lastError: null,
      history: withHistory(row, { action: row.kind === 'correction_reply' ? historyMarkOf(row, 'sent') : 'sent', captionHtml: caption }),
    } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ action: 'telegram.send', summary: row.kind === 'correction_reply' ? 'TUZATISH javobi kanalga yuborildi' : 'Post kanalga yuborildi' }),
  }))
  if (row.kind === 'correction_reply') for (const cid of correctionsOf(row)) await stampCorrection(payload, cid, 'reply_posted')
}

/** The corrections a row was made for (`…:correction:<id>` in its history). */
const correctionsOf = (row: Doc) => [...new Set(historyOf(row).map((h) => correctionOf(h.action)).filter((x): x is string => Boolean(x)))]
const historyMarkOf = (row: Doc, action: string) => {
  const cid = correctionsOf(row)[0]
  return cid ? `${action}:correction:${cid}` : action
}

// ── an approved caption edit ────────────────────────────────────────────────

/** Corrections whose edit this one applies: requested since the last edit reached the channel. */
function pendingCorrections(row: Doc): string[] {
  const out: string[] = []
  for (const h of historyOf(row).reverse()) {
    const a = actionOf(h.action)
    if (a === 'edited' || a === 'sent') break
    const cid = correctionOf(h.action)
    if (a === 'edit_requested' && cid) out.push(cid)
  }
  return out
}

async function applyEdit(payload: Payload, client: BotClient, row: Doc, chatId: string) {
  const caption = String(row.captionHtml)
  const messageId = Number(row.messageId)
  const target = String(row.chatId || chatId)
  try {
    // A photo post has a caption; a text post (no image) has text.
    if (row.imageFileId) await client.editMessageCaption({ chatId: target, messageId, caption })
    else await client.editMessageText({ chatId: target, messageId, text: caption })
  } catch (error) {
    if (!isNotModified(error)) throw error
  }
  const cids = pendingCorrections(row)
  await recorded(messageId, payload.update({
    collection: POSTS,
    id: row.id as Id,
    data: { status: 'edited', lastError: null, history: withHistory(row, ...(cids.length ? cids : [undefined]).map((cid) => ({ action: cid ? `edited:correction:${cid}` : 'edited', captionHtml: caption }))) } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ action: 'telegram.edit', summary: cids.length ? 'Tuzatish: kanaldagi post matni tahrirlandi' : 'Kanaldagi post matni tahrirlandi' }),
  }))
  for (const cid of cids) await stampCorrection(payload, cid, 'caption_edited')
}

// ── an approved retraction (§10.3 step 5) ───────────────────────────────────

async function retract(
  payload: Payload,
  client: BotClient,
  row: Doc,
  facts: ArticleFacts,
  chatId: string,
  alert: NonNullable<SenderOptions['alert']>,
): Promise<{ failed?: string }> {
  const { docs } = await payload.find({ collection: POSTS, where: { article: { equals: facts.id } }, depth: 0, limit: 200, overrideAccess: true })
  const messages = (docs as unknown as Doc[]).filter(isLiveMessage)
  const manual: string[] = []
  const errors: string[] = []
  let deleted = 0
  for (const m of messages) {
    const target = String(m.chatId || chatId)
    const messageId = Number(m.messageId)
    const caption =
      m.kind === 'correction_reply'
        ? retractionCaption({ notice: facts.notice, shortUrl: facts.shortUrl })
        : retractionCaption({ notice: facts.notice, shortUrl: facts.shortUrl, sponsored: facts.sponsored, partner: facts.partner })
    try {
      // The 48 hours count at the moment deleteMessage is called, not at approval.
      let gone = false
      if (Date.now() - (timeOf(m.sentAt) ?? 0) < DELETE_WINDOW_MS) {
        try {
          await client.deleteMessage({ chatId: target, messageId })
          gone = true
        } catch (error) {
          if (isMessageGone(error)) gone = true
          else if (!isCannotDelete(error)) throw error
        }
      }
      if (gone) {
        deleted++
        await payload.update({
          collection: POSTS,
          id: m.id as Id,
          data: { status: 'retracted', history: withHistory(m, { action: 'deleted' }) } as never,
          depth: 0,
          overrideAccess: true,
          context: systemContext({ action: 'telegram.delete', summary: 'Maqola olib tashlandi: post kanaldan oʻchirildi' }),
        })
        continue
      }
      // Older than 48 h: the bot can only replace the text; a person deletes the post (deleteMessage limits).
      try {
        if (m.imageFileId) await client.editMessageCaption({ chatId: target, messageId, caption })
        else await client.editMessageText({ chatId: target, messageId, text: caption })
      } catch (error) {
        if (!isNotModified(error)) throw error
      }
      manual.push(messageLink(target, messageId) ?? `message_id ${messageId}`)
      await payload.update({
        collection: POSTS,
        id: m.id as Id,
        data: { status: 'retracted', captionHtml: caption, history: withHistory(m, { action: 'retraction_caption', captionHtml: caption }) } as never,
        depth: 0,
        overrideAccess: true,
        context: systemContext({ action: 'telegram.edit', summary: 'Maqola olib tashlandi: post matni olib tashlash xabariga almashtirildi' }),
      })
    } catch (error) {
      errors.push(`#${String(m.id)}: ${errorText(error)}`)
    }
  }

  const failed = errors.length ? errors.join(' · ') : undefined
  const data: Doc = failed
    ? { status: 'failed', lastError: `Olib tashlash toʻliq bajarilmadi: ${failed}`.slice(0, 2000), history: withHistory(row, { action: 'failed' }) }
    : manual.length
      ? { status: 'edited', lastError: null, history: withHistory(row, { action: 'retraction_caption', captionHtml: String(row.captionHtml ?? '') }) }
      : { status: 'retracted', lastError: null, history: withHistory(row, { action: 'deleted' }) }
  await payload.update({
    collection: POSTS,
    id: row.id as Id,
    data: data as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({
      action: manual.length ? 'telegram.edit' : 'telegram.delete',
      summary: `Olib tashlash: ${deleted} ta xabar oʻchirildi, ${manual.length} tasi qoʻlda oʻchirilishi kerak${failed ? `; xato: ${failed}` : ''}`.slice(0, 900),
    }),
  })
  if (manual.length) {
    await alert(
      payload,
      'Telegram: postni qoʻlda oʻchiring',
      `«${facts.title}» olib tashlandi. Bot 48 soatdan eski postni oʻchira olmaydi, shuning uchun matni olib tashlash xabariga almashtirildi. ` +
        `Kanal egasi bu xabarlarni Telegram ilovasida qoʻlda oʻchirsin: ${manual.join(' , ')}. Keyin CMSdagi olib tashlash postida «Qoʻlda oʻchirildi» tugmasini bosing.`,
    )
  }
  if (failed) await alert(payload, 'Telegram posti olib tashlanmadi', `«${facts.title}»: ${failed}`)
  return { failed }
}
