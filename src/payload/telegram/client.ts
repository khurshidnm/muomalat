import { randomUUID } from 'node:crypto'

import { redact, telegramEnv } from './env'

/**
 * A small Bot API client (CMS-SPEC §10): only the methods the worker uses,
 * each call with a timeout, and retries only where a retry cannot post twice.
 *
 * - Reads and changes to an existing message (get*, editMessage*,
 *   deleteMessage) are retried on network errors, timeouts, 5xx and 429.
 * - New messages (sendPhoto, sendMessage) are retried only when Telegram
 *   certainly did not act: a 429 with `retry_after`, or a connection that was
 *   never made. A timeout or a dropped connection may have posted already, so
 *   the error says `delivered: 'unknown'` and the caller marks the post failed
 *   for an editor to check and re-queue (§10.3 step 6: no automatic resend).
 *
 * The token is part of every URL, so URLs are never logged, and every error
 * message passes through `redact`.
 */

export type TgUser = { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string }
export type TgChat = { id: number; type: 'private' | 'group' | 'supergroup' | 'channel'; title?: string; username?: string }
export type TgChatMember = { status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'; user: TgUser } & Record<string, unknown>
export type TgPhotoSize = { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }
export type TgEntity = { type: string; offset: number; length: number; url?: string; language?: string; unix_time?: number; date_time_format?: string }
export type TgMessage = {
  message_id: number
  date: number
  edit_date?: number
  chat: TgChat
  from?: TgUser
  sender_chat?: TgChat
  author_signature?: string
  text?: string
  entities?: TgEntity[]
  caption?: string
  caption_entities?: TgEntity[]
  photo?: TgPhotoSize[]
  via_bot?: TgUser
}
export type TgChatMemberUpdated = {
  chat: TgChat
  from: TgUser
  date: number
  old_chat_member: TgChatMember
  new_chat_member: TgChatMember
}
export type TgUpdate = {
  update_id: number
  channel_post?: TgMessage
  edited_channel_post?: TgMessage
  chat_member?: TgChatMemberUpdated
  my_chat_member?: TgChatMemberUpdated
}

export class TelegramError extends Error {
  readonly method: string
  /** HTTP status; 0 for a network error or timeout. */
  readonly status: number
  readonly code?: number
  readonly description?: string
  readonly retryAfter?: number
  /** Whether Telegram may have acted on the request (relevant for new messages). */
  readonly delivered: 'no' | 'unknown'
  constructor(init: { method: string; status: number; code?: number; description?: string; retryAfter?: number; delivered: 'no' | 'unknown'; message: string }) {
    super(redact(init.message))
    this.name = 'TelegramError'
    this.method = init.method
    this.status = init.status
    this.code = init.code
    this.description = init.description ? redact(init.description) : undefined
    this.retryAfter = init.retryAfter
    this.delivered = init.delivered
  }
}

/** Telegram refused because nothing changed: an edit to the same caption counts as done. */
export const isNotModified = (e: unknown) => e instanceof TelegramError && /message is not modified/i.test(e.description ?? '')
/** The message no longer exists (deleted by hand, or the id is wrong). */
export const isMessageGone = (e: unknown) => e instanceof TelegramError && /message to (delete|edit) not found|message can't be found|MESSAGE_ID_INVALID/i.test(e.description ?? '')
/** A delete Telegram refuses: older than 48 h, or not the bot's to delete. */
export const isCannotDelete = (e: unknown) => e instanceof TelegramError && /message can't be deleted/i.test(e.description ?? '')
/** A `file_id` Telegram no longer accepts; the photo is uploaded again. */
export const isBadFileId = (e: unknown) => e instanceof TelegramError && /wrong file identifier|file reference|wrong remote file|FILE_ID_INVALID/i.test(e.description ?? '')
/** `getUpdates` while a webhook is set, or while another process polls with the same token (§10.6). */
export const isConflict = (e: unknown) => e instanceof TelegramError && e.status === 409

export type ClientOptions = {
  token?: string
  apiBase?: string
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Per request, default 15 s; getUpdates adds its long-poll time. */
  timeoutMs?: number
  /** Attempts per call for retryable failures (default 3). */
  attempts?: number
  /** A 429 asking to wait longer than this is not waited for (default 30 s). */
  maxRetryAfterMs?: number
}

const IDEMPOTENT = new Set(['getMe', 'getChat', 'getChatMember', 'getChatAdministrators', 'editMessageCaption', 'editMessageText', 'deleteMessage'])
/** Connection never made: safe to retry even a send. */
const NOT_CONNECTED = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH'])

type Params = Record<string, unknown>
export type Upload = { field: string; data: Uint8Array; filename: string; contentType: string }

/**
 * multipart/form-data written by hand. FormData would do, except that the
 * HTML serialisation turns every "\n" in a field into "\r\n": the caption
 * Telegram received would differ from the one approved, and be longer.
 */
function multipart(params: Params, upload: Upload): { bytes: Uint8Array; contentType: string } {
  const boundary = `----muomalat${randomUUID().replace(/-/g, '')}`
  const quote = (s: string) => s.replace(/[\r\n"]/g, (c) => encodeURIComponent(c))
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    const value = typeof v === 'object' ? JSON.stringify(v) : String(v)
    parts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${quote(k)}"\r\n\r\n${value}\r\n`))
  }
  parts.push(
    enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${quote(upload.field)}"; filename="${quote(upload.filename)}"\r\nContent-Type: ${upload.contentType}\r\n\r\n`),
    upload.data,
    enc.encode(`\r\n--${boundary}--\r\n`),
  )
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    bytes.set(p, at)
    at += p.length
  }
  return { bytes, contentType: `multipart/form-data; boundary=${boundary}` }
}

const errorCode = (error: unknown): string | undefined => {
  const e = error as { code?: string; cause?: { code?: string; errors?: { code?: string }[] } }
  return e?.code ?? e?.cause?.code ?? e?.cause?.errors?.[0]?.code
}

export function createBotClient(options: ClientOptions = {}) {
  const env = telegramEnv()
  const token = options.token ?? env.token
  const apiBase = (options.apiBase ?? env.apiBase).replace(/\/+$/, '')
  const doFetch = options.fetch ?? fetch
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const timeoutMs = options.timeoutMs ?? 15_000
  const attempts = Math.max(1, options.attempts ?? 3)
  const maxRetryAfterMs = options.maxRetryAfterMs ?? 30_000

  async function once<T>(method: string, params: Params, upload: Upload | undefined, waitMs: number): Promise<T> {
    if (!token) throw new TelegramError({ method, status: 0, delivered: 'no', message: `Telegram ${method}: TELEGRAM_BOT_TOKEN is not set` })
    let body: BodyInit
    const headers: Record<string, string> = {}
    if (upload) {
      const { bytes, contentType } = multipart(params, upload)
      headers['content-type'] = contentType
      body = bytes as BodyInit
    } else {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null)))
    }
    let res: Response
    try {
      res = await doFetch(`${apiBase}/bot${token}/${method}`, { method: 'POST', headers, body, signal: AbortSignal.timeout(waitMs) })
    } catch (error) {
      const timedOut = (error as Error)?.name === 'TimeoutError' || (error as Error)?.name === 'AbortError'
      const code = errorCode(error)
      throw new TelegramError({
        method,
        status: 0,
        delivered: !timedOut && code && NOT_CONNECTED.has(code) ? 'no' : 'unknown',
        message: `Telegram ${method}: ${timedOut ? `no answer within ${Math.round(waitMs / 1000)} s` : `network error${code ? ` (${code})` : ''}`}`,
      })
    }
    const json = (await res.json().catch(() => undefined)) as
      | { ok?: boolean; result?: T; error_code?: number; description?: string; parameters?: { retry_after?: number } }
      | undefined
    if (res.ok && json?.ok === true) return json.result as T
    const description = json?.description ?? `HTTP ${res.status}`
    throw new TelegramError({
      method,
      status: res.status,
      code: json?.error_code,
      description,
      retryAfter: json?.parameters?.retry_after,
      // Telegram answered: it refused the request. A 5xx from a proxy in front of it may hide a success.
      delivered: res.status >= 500 || !json ? 'unknown' : 'no',
      message: `Telegram ${method} ${res.status}: ${description}`,
    })
  }

  async function call<T>(method: string, params: Params = {}, opts: { upload?: Upload; waitMs?: number } = {}): Promise<T> {
    const idempotent = IDEMPOTENT.has(method)
    let last: unknown
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await once<T>(method, params, opts.upload, opts.waitMs ?? timeoutMs)
      } catch (error) {
        last = error
        if (!(error instanceof TelegramError) || attempt === attempts) break
        if (error.status === 429) {
          const wait = (error.retryAfter ?? 1) * 1000
          if (wait > maxRetryAfterMs) break
          await sleep(wait)
          continue
        }
        const transient = error.status === 0 || error.status >= 500
        if (!transient) break
        if (!idempotent && error.delivered !== 'no') break
        await sleep(500 * 2 ** (attempt - 1))
      }
    }
    throw last
  }

  return {
    call,
    getMe: () => call<TgUser>('getMe'),
    getChat: (chatId: string | number) => call<TgChat>('getChat', { chat_id: chatId }),
    getChatMember: (chatId: string | number, userId: number) => call<TgChatMember>('getChatMember', { chat_id: chatId, user_id: userId }),
    getChatAdministrators: (chatId: string | number) => call<TgChatMember[]>('getChatAdministrators', { chat_id: chatId }),
    /** `photo` is a `file_id` to reuse, or the bytes to upload (multipart). */
    sendPhoto: (p: { chatId: string | number; photo: string | { data: Uint8Array; filename: string; contentType: string }; caption: string; silent?: boolean }) =>
      call<TgMessage>(
        'sendPhoto',
        {
          chat_id: p.chatId,
          caption: p.caption,
          parse_mode: 'HTML',
          disable_notification: p.silent || undefined,
          ...(typeof p.photo === 'string' ? { photo: p.photo } : {}),
        },
        typeof p.photo === 'string' ? {} : { upload: { field: 'photo', ...p.photo }, waitMs: Math.max(timeoutMs, 30_000) },
      ),
    sendMessage: (p: { chatId: string | number; text: string; silent?: boolean; replyTo?: number; preview?: boolean }) =>
      call<TgMessage>('sendMessage', {
        chat_id: p.chatId,
        text: p.text,
        parse_mode: 'HTML',
        disable_notification: p.silent || undefined,
        link_preview_options: p.preview === false ? { is_disabled: true } : undefined,
        // A correction reply must stay attached to the post it corrects: never sent on its own.
        reply_parameters: p.replyTo ? { message_id: p.replyTo, allow_sending_without_reply: false } : undefined,
      }),
    editMessageCaption: (p: { chatId: string | number; messageId: number; caption: string }) =>
      call<TgMessage | true>('editMessageCaption', { chat_id: p.chatId, message_id: p.messageId, caption: p.caption, parse_mode: 'HTML' }),
    editMessageText: (p: { chatId: string | number; messageId: number; text: string }) =>
      call<TgMessage | true>('editMessageText', { chat_id: p.chatId, message_id: p.messageId, text: p.text, parse_mode: 'HTML' }),
    deleteMessage: (p: { chatId: string | number; messageId: number }) => call<true>('deleteMessage', { chat_id: p.chatId, message_id: p.messageId }),
    /** Long poll; one attempt (the job polls again). */
    getUpdates: (p: { offset?: number; timeout: number; allowedUpdates: string[]; limit?: number }) =>
      once<TgUpdate[]>('getUpdates', { offset: p.offset, timeout: p.timeout, limit: p.limit ?? 100, allowed_updates: p.allowedUpdates }, undefined, (p.timeout + 10) * 1000),
  }
}

export type BotClient = ReturnType<typeof createBotClient>
