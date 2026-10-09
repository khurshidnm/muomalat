import { after } from 'next/server'
import type { GlobalSlug, Payload, PayloadRequest } from 'payload'

import { ARTICLES, type Doc, type StaffNotice, stateOf, wctx } from './shared'

/**
 * Staff notifications of the workflow (CMS-SPEC §10.9): submitted for edit,
 * sent back, approved, approval cancelled, second read due or overdue,
 * schedule failed. They go to the private staff group through the alerts bot
 * (ALERTS_BOT_TOKEN, ALERTS_CHAT_ID), with an email fallback to
 * site-settings `operations.alertRecipients`. They are not audit alerts.
 *
 * Nothing is sent inside a transaction. Hooks queue notices on req.context;
 * they are delivered after commit:
 * - the transition endpoint and the worker flush them themselves after
 *   commitTransaction or after the Local API call returns;
 * - built-in REST saves (Payload's Publish button, a draft save that cancels
 *   an approval) use next/server `after()`, which runs after the response.
 *   `after()` also runs when the request failed, so each notice names the
 *   state the article must be in, and a notice whose save was rolled back is
 *   dropped.
 * Outside a request and without a flushing caller, queued notices are
 * dropped (scripts).
 */

export type NoticeTransport = (notice: StaffNotice, payload: Payload) => Promise<void>

let transport: NoticeTransport | undefined

/** Tests and the worker can replace the delivery (e.g. to capture notices). */
export function setNoticeTransport(t: NoticeTransport | undefined) {
  transport = t
}

export function queueNotice(req: PayloadRequest, notice: StaffNotice) {
  ;(wctx(req).workflowNotices ??= []).push(notice)
}

/** Removes and returns the queued notices of a request or of a Local API `context` object. */
export function takeNotices(source: PayloadRequest | Record<string, unknown>): StaffNotice[] {
  const ctx = ('context' in source && source.context && typeof source.context === 'object' ? source.context : source) as {
    workflowNotices?: StaffNotice[]
  }
  const list = ctx.workflowNotices ?? []
  ctx.workflowNotices = []
  return list
}

/** Called from afterChange: deliver this request's notices once the response (and the commit) is done. */
export function scheduleFlush(req: PayloadRequest) {
  const ctx = wctx(req)
  if (ctx.noticesFlushedBy || !ctx.workflowNotices?.length) return
  const payload = req.payload
  try {
    after(() => flushNotices(payload, takeNotices(req)))
  } catch {
    // Outside a request scope (scripts, tests without a flushing caller): the caller may still flush.
  }
}

export async function flushNotices(payload: Payload, notices: StaffNotice[]): Promise<void> {
  for (const notice of notices) {
    try {
      if (notice.expectState && notice.articleId !== undefined) {
        const doc = (await payload.findByID({
          collection: ARTICLES,
          id: notice.articleId,
          draft: true,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        })) as Doc | null
        if (!doc || stateOf(doc) !== notice.expectState) continue
      }
      await (transport ?? deliver)(notice, payload)
    } catch (error) {
      payload.logger.error({ err: error, msg: `workflow notice ${notice.kind} not delivered` })
    }
  }
}

const AUDIENCE: Record<StaffNotice['audience'], string> = {
  desk: 'Muharrirlar',
  eic: 'Bosh muharrir',
  users: 'Muallif',
}

function render(notice: StaffNotice): string {
  const cms = process.env.CMS_URL || 'http://cms.localhost:3000'
  const link = notice.articleId !== undefined ? `\n${cms}/admin/collections/articles/${notice.articleId}` : ''
  const title = notice.title ? `«${notice.title}»: ` : ''
  return `${AUDIENCE[notice.audience]} · ${title}${notice.text}${link}`
}

async function deliver(notice: StaffNotice, payload: Payload): Promise<void> {
  const text = render(notice)
  const token = process.env.ALERTS_BOT_TOKEN
  const chat = process.env.ALERTS_CHAT_ID
  if (token && chat) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) return
      payload.logger.warn(`workflow notice: Telegram answered ${res.status}; trying email`)
    } catch (error) {
      payload.logger.warn({ err: error, msg: 'workflow notice: Telegram unreachable; trying email' })
    }
    await emailFallback(payload, text)
    return
  }
  payload.logger.info(`workflow notice: ${text}`)
}

async function emailFallback(payload: Payload, text: string) {
  const settings = (await payload.findGlobal({ slug: 'site-settings' as GlobalSlug, depth: 0, overrideAccess: true })) as unknown as Doc
  const recipients = ((settings.operations as Doc | undefined)?.alertRecipients as { email?: string }[] | undefined)
    ?.map((r) => r.email)
    .filter((e): e is string => Boolean(e))
  if (!recipients?.length) {
    payload.logger.warn(`workflow notice (no recipients): ${text}`)
    return
  }
  await payload.sendEmail({ to: recipients, subject: 'Muomalat CMS: ish jarayoni', text })
}
