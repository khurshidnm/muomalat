import http from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * A local stand-in for the Bot API (`https://api.telegram.org/bot<token>/<method>`),
 * on a free port of 127.0.0.1: the tests never reach api.telegram.org.
 * TELEGRAM_API_BASE points the client at it. It records every call (JSON
 * and multipart bodies alike), answers like Telegram (`{ ok, result }` or
 * `{ ok: false, error_code, description, parameters }`), and each method's
 * answer can be replaced per test with `on(method, handler)`.
 */

export const BOT_ID = 987654321
export const TOKEN = `${BOT_ID}:TEST-mock-token-abcdefghijklmnopqrstuv`
export const CHAT_ID = -1009876543210
export const CHANNEL = '@muomalat_test'

export type Call = {
  method: string
  token: string
  params: Record<string, unknown>
  files: Record<string, { name: string; type: string; size: number }>
}
export type Reply = unknown | { error: { status: number; description: string; retryAfter?: number } } | { delayMs: number; then: unknown }
export type Handler = (params: Record<string, unknown>, call: Call) => Reply | Promise<Reply>

export const fail = (status: number, description: string, retryAfter?: number) => ({ error: { status, description, retryAfter } })

const bot = { id: BOT_ID, is_bot: true, first_name: 'Muomalat test', username: 'muomalat_test_bot' }
const owner = { id: 111, is_bot: false, first_name: 'Kanal', last_name: 'Egasi', username: 'owner' }

/** The bot as a channel admin with exactly the allowed rights (Bot API 10.3 fields included). */
export const botMember = (extra: Record<string, unknown> = {}) => ({
  status: 'administrator',
  user: bot,
  can_be_edited: false,
  is_anonymous: false,
  can_manage_chat: true,
  can_delete_messages: true,
  can_manage_video_chats: false,
  can_restrict_members: false,
  can_promote_members: false,
  can_change_info: false,
  can_invite_users: false,
  can_post_messages: true,
  can_edit_messages: true,
  can_post_stories: false,
  can_edit_stories: false,
  can_delete_stories: false,
  can_send_welcome_messages: false,
  ...extra,
})

export const ownerMember = () => ({ status: 'creator', user: owner, is_anonymous: false })

const strip = (html: unknown) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')

/** `port` 0 (the default) takes a free one; a manual smoke run uses a fixed one. */
export async function startMockBotApi({ port: listenOn = 0 }: { port?: number } = {}) {
  const calls: Call[] = []
  const handlers = new Map<string, Handler>()
  // Message ids differ from run to run: test databases are reused, and rows are matched by message id.
  let nextMessageId = 100_000 + Math.floor(Math.random() * 100_000_000)
  const now = () => Math.floor(Date.now() / 1000)
  const chat = { id: CHAT_ID, type: 'channel', title: 'Muomalat test', username: CHANNEL.slice(1) }
  const message = (extra: Record<string, unknown>) => ({ message_id: nextMessageId++, date: now(), chat, sender_chat: chat, ...extra })

  const defaults: Record<string, Handler> = {
    getMe: () => bot,
    getChat: () => chat,
    getChatMember: () => botMember(),
    getChatAdministrators: () => [ownerMember(), botMember()],
    sendPhoto: (p, c) =>
      message({
        caption: strip(p.caption),
        photo: [
          { file_id: 'small-file-id', file_unique_id: 's', width: 320, height: 168 },
          { file_id: `big-file-id-${c.files.photo ? 'uploaded' : String(p.photo)}`, file_unique_id: 'b', width: 1200, height: 630 },
        ],
      }),
    sendMessage: (p) => message({ text: strip(p.text) }),
    editMessageCaption: (p) => ({ message_id: Number(p.message_id), date: now(), edit_date: now(), chat, caption: strip(p.caption) }),
    editMessageText: (p) => ({ message_id: Number(p.message_id), date: now(), edit_date: now(), chat, text: strip(p.text) }),
    deleteMessage: () => true,
    getUpdates: () => [],
  }

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks)
    const m = /^\/bot([^/]+)\/(\w+)$/.exec(req.url ?? '')
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (!m) return send(404, { ok: false, error_code: 404, description: 'Not Found' })
    const [, token, method] = m
    const type = String(req.headers['content-type'] ?? '')
    const params: Record<string, unknown> = {}
    const files: Call['files'] = {}
    if (type.startsWith('multipart/form-data')) {
      const form = await new Request('http://mock/', { method: 'POST', headers: { 'content-type': type }, body: raw }).formData()
      for (const [k, v] of form.entries()) {
        if (typeof v === 'string') {
          try {
            params[k] = /^[[{]/.test(v) ? JSON.parse(v) : v
          } catch {
            params[k] = v
          }
        } else files[k] = { name: v.name, type: v.type, size: v.size }
      }
    } else if (raw.length) Object.assign(params, JSON.parse(raw.toString('utf8')))
    const call: Call = { method, token, params, files }
    calls.push(call)
    if (token !== TOKEN) return send(401, { ok: false, error_code: 401, description: 'Unauthorized' })
    const handler = handlers.get(method) ?? defaults[method]
    if (!handler) return send(404, { ok: false, error_code: 404, description: 'Not Found: method not found' })
    let reply = await handler(params, call)
    if (reply && typeof reply === 'object' && 'delayMs' in (reply as object)) {
      const r = reply as { delayMs: number; then: unknown }
      await new Promise((ok) => setTimeout(ok, r.delayMs))
      if (res.destroyed) return
      reply = r.then
    }
    if (reply && typeof reply === 'object' && 'error' in (reply as object)) {
      const e = (reply as { error: { status: number; description: string; retryAfter?: number } }).error
      return send(e.status, { ok: false, error_code: e.status, description: e.description, ...(e.retryAfter ? { parameters: { retry_after: e.retryAfter } } : {}) })
    }
    send(200, { ok: true, result: reply })
  })
  await new Promise<void>((ok) => server.listen(listenOn, '127.0.0.1', ok))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    chat,
    /** Replace one method's answer; `undefined` restores the default. */
    on(method: string, handler: Handler | undefined) {
      if (handler) handlers.set(method, handler)
      else handlers.delete(method)
    },
    /** Calls of one method since the last reset. */
    of: (method: string) => calls.filter((c) => c.method === method),
    reset() {
      calls.length = 0
      handlers.clear()
    },
    close: () => new Promise<void>((ok) => server.close(() => ok())),
  }
}

export type MockBotApi = Awaited<ReturnType<typeof startMockBotApi>>
