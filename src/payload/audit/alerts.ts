import type { Payload, Where } from 'payload'

import { ACTION_LABELS, isAuditAction } from './actions'
import { ipNetwork } from './hash'
import { tashkentStamp, tashkentTime } from './time'
import { AUDIT_SLUG, type AuditRow } from './writer'

/**
 * Immediate alerts (CMS-SPEC §9.3) to the private alerts Telegram group
 * (ALERTS_BOT_TOKEN / ALERTS_CHAT_ID, a different bot from the publishing
 * one) and by e-mail to `site-settings.operations.alertRecipients`.
 *
 * Delivery is an outbox over the audit log itself: the worker's auditAlerts
 * job reads rows after a cursor (one per transport, in Payload's key-value
 * store), decides for each row whether it is an alert, sends it and moves the
 * cursor. Consequences:
 * - only committed rows are ever alerted, so a rolled-back change alerts
 *   nobody, and no alert is sent from inside a transaction;
 * - every writer gets alerts, including the worker and scripts, which have no
 *   request to hang an after() callback on;
 * - a transport that is down is retried on the next tick (at least once per
 *   row; a crash between send and cursor save can repeat one alert), and a
 *   failing transport never holds up the others.
 * Rows become visible in id order (the writer's chain lock), so a cursor never
 * skips a row that commits late.
 *
 * Every rule is a function of the row and the rows before it, so the decision
 * needs nothing the request knew and is the same whenever it is made.
 */

export type AlertKind =
  | 'user_create'
  | 'role_change'
  | 'user_enable'
  | 'edge_mismatch'
  | 'locked'
  | 'failed_logins'
  | 'new_country'
  | 'off_hours_publish'
  | 'urgent'
  | 'withdraw'
  | 'unpublish'
  | 'settings'
  | 'ad_link'
  | 'mass_change'
  | 'telegram_admin'
  | 'backup_fail'
  | 'chain_break'
  | 'operations'

export type Alert = { kind: AlertKind; rowId: number; subject: string; text: string }

export interface AlertTransport {
  /** Names the cursor; keep it stable. */
  name: string
  send(alert: Alert, payload: Payload): Promise<void>
}

const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000
const FAILED_LOGIN_THRESHOLD = 5
const MASS_CHANGE_WINDOW_MS = 5 * 60 * 1000
const MASS_CHANGE_LIMIT = 10
/** Settings groups whose change is alerted (§9.3). */
const WATCHED_SETTINGS = ['legal', 'labels', 'telegram']
const BATCH = 100

/** 5, 10, 20, 40…: alert when a burst starts and as it doubles, not on every attempt. */
const isDoubling = (n: number, start: number) => n >= start && Number.isInteger(Math.log2(n / start))

const paths = (row: AuditRow): string[] => (Array.isArray(row.changedPaths) ? (row.changedPaths as unknown[]).filter((p): p is string => typeof p === 'string') : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

type Settings = { officeHours?: { start?: string | null; end?: string | null } | null }

export type RuleContext = {
  payload: Payload
  settings: () => Promise<Settings>
}

async function rowsBefore(payload: Payload, row: AuditRow, windowMs: number, where: Where[]) {
  const at = new Date(row.at ?? row.createdAt).getTime()
  const { docs } = await payload.find({
    collection: AUDIT_SLUG,
    where: { and: [{ id: { less_than_equal: row.id } }, { at: { greater_than: new Date(at - windowMs).toISOString() } }, ...where] },
    sort: '-id',
    limit: 1000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs
}

const officeHoursDefault = { start: '09:00', end: '19:00' }

/** Which alert, if any, a row raises. */
export async function alertFor(row: AuditRow, ctx: RuleContext): Promise<{ kind: AlertKind; headline?: string } | null> {
  const p = paths(row)
  switch (row.action) {
    case 'user.create':
      return { kind: 'user_create' }
    case 'user.role_change':
      return { kind: 'role_change', headline: row.summary ?? undefined }
    case 'user.enable':
      return { kind: 'user_enable' }
    case 'auth.edge_mismatch':
      return { kind: 'edge_mismatch' }
    case 'auth.locked':
      return { kind: 'locked' }
    case 'workflow.urgent_publish':
      return { kind: 'urgent' }
    case 'article.withdraw':
      return { kind: 'withdraw' }
    case 'doc.unpublish':
      return { kind: 'unpublish' }
    case 'telegram.channel_admin_change':
      return { kind: 'telegram_admin' }
    case 'ops.backup_fail':
      return { kind: 'backup_fail' }
    case 'ops.chain_break':
      return { kind: 'chain_break' }
    case 'auth.login_failed': {
      const recent = await rowsBefore(ctx.payload, row, FAILED_LOGIN_WINDOW_MS, [{ action: { equals: 'auth.login_failed' } }])
      return isDoubling(recent.length, FAILED_LOGIN_THRESHOLD)
        ? { kind: 'failed_logins', headline: `Soʻnggi 10 daqiqada ${recent.length} ta muvaffaqiyatsiz kirish urinishi` }
        : null
    }
    case 'auth.login': {
      const before = obj(row.before).knownCountries
      const after = obj(row.after).knownCountries
      if (!Array.isArray(after)) return null
      const added = after.filter((c) => !(Array.isArray(before) ? before : []).includes(c))
      return added.length ? { kind: 'new_country', headline: `Yangi mamlakatdan kirish: ${added.join(', ')}` } : null
    }
  }

  if (row.collection === 'site-settings' && p.some((path) => WATCHED_SETTINGS.includes(path.split('.')[0]))) {
    const groups = [...new Set(p.map((path) => path.split('.')[0]).filter((g) => WATCHED_SETTINGS.includes(g)))]
    return { kind: 'settings', headline: `Oʻzgargan boʻlimlar: ${groups.join(', ')}` }
  }
  if (row.collection === 'ad-slots' && p.some((path) => /(^|\.)linkUrl$/.test(path) || /^slots(\.\d+)?$/.test(path))) {
    return { kind: 'ad_link', headline: 'Reklama joyi havolasi oʻzgardi' }
  }

  if (row.action === 'doc.publish_first' && row.collection === 'articles') {
    const hours = { ...officeHoursDefault, ...obj((await ctx.settings()).officeHours) } as { start: string; end: string }
    const t = tashkentTime(row.at ?? row.createdAt)
    if (t < hours.start || t >= hours.end) return { kind: 'off_hours_publish', headline: `Ish vaqtidan tashqari birinchi nashr (${t}; ish vaqti ${hours.start}–${hours.end})` }
  }

  // One person changing more than 10 documents in 5 minutes.
  if (row.actorId !== null && row.actorId !== undefined && row.action.startsWith('doc.') && row.docId) {
    const recent = await rowsBefore(ctx.payload, row, MASS_CHANGE_WINDOW_MS, [{ actorId: { equals: row.actorId } }, { action: { like: 'doc.' } }])
    const key = (r: AuditRow) => `${r.collection}:${r.docId}`
    const earlier = new Set(recent.filter((r) => r.id !== row.id && r.docId).map(key))
    if (!earlier.has(key(row))) {
      const distinct = earlier.size + 1
      if (distinct > MASS_CHANGE_LIMIT && isDoubling(distinct - 1, MASS_CHANGE_LIMIT)) {
        return { kind: 'mass_change', headline: `Bir foydalanuvchi 5 daqiqada ${distinct} ta hujjatni oʻzgartirdi` }
      }
    }
  }
  return null
}

/** The alert text (Uzbek, plain text: no markup to escape). Addresses are shown as their network only. */
export function formatAlert(row: AuditRow, kind: AlertKind, headline?: string): Alert {
  const label = isAuditAction(row.action) ? ACTION_LABELS[row.action] : row.action
  const who = row.actorEmail ? `${row.actorEmail}${row.actorRole ? ` (${row.actorRole})` : ''}` : (row.actorRole ?? '—')
  const doc = row.collection ? `${row.collection}${row.docId ? ` #${row.docId}` : ''}${row.docTitle ? ` «${row.docTitle}»` : ''}` : null
  const net = ipNetwork(row.ip)
  const lines = [
    `Muomalat CMS: ${label}`,
    headline,
    `Kim: ${who}`,
    doc ? `Hujjat: ${doc}` : null,
    row.summary && row.summary !== headline ? `Qisqacha: ${row.summary}` : null,
    net || row.country ? `Manzil: ${[net, row.country].filter(Boolean).join(' · ')}` : null,
    `Vaqt: ${tashkentStamp(row.at ?? row.createdAt)} (Toshkent)`,
    `Audit yozuvi: #${row.id}`,
  ].filter((l): l is string => Boolean(l))
  return { kind, rowId: row.id, subject: `[Muomalat] ${label}`, text: lines.join('\n') }
}

// ── transports ──────────────────────────────────────────────────────────────

/** The private alerts group. Only when both variables are set (production and staging). */
export function telegramTransport(token: string, chatId: string): AlertTransport {
  return {
    name: 'telegram',
    async send(alert) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: alert.text.slice(0, 4000), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10_000),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string }
      if (!res.ok || body.ok !== true) throw new Error(`Telegram sendMessage ${res.status}: ${body.description ?? 'no description'}`)
    },
  }
}

/** E-mail to the founder and the editor-in-chief (site-settings → Ishlash → Ogohlantirish oluvchilar). */
export const emailTransport: AlertTransport = {
  name: 'email',
  async send(alert, payload) {
    const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as {
      operations?: { alertRecipients?: { email?: string | null }[] | null } | null
    }
    const to = (settings.operations?.alertRecipients ?? []).map((r) => r.email).filter((e): e is string => Boolean(e))
    if (!to.length) {
      // No recipients configured yet: keep the alert visible in the worker log.
      payload.logger.warn({ msg: `audit alert (${alert.kind}), no e-mail recipients set`, alert: alert.text })
      return
    }
    await payload.sendEmail({ to: to.join(', '), subject: alert.subject, text: alert.text })
  },
}

/** Development without a bot: the alert goes to the worker's log. */
export const logTransport: AlertTransport = {
  name: 'log',
  async send(alert, payload) {
    payload.logger.warn({ msg: `audit alert (${alert.kind})`, alert: alert.text })
  },
}

/** Telegram when configured, e-mail when SMTP is configured; the log when neither is. */
export function defaultTransports(): AlertTransport[] {
  const out: AlertTransport[] = []
  const token = process.env.ALERTS_BOT_TOKEN
  const chat = process.env.ALERTS_CHAT_ID
  if (token && chat) out.push(telegramTransport(token, chat))
  if (process.env.SMTP_HOST && process.env.ALERTS_EMAIL !== 'off') out.push(emailTransport)
  return out.length ? out : [logTransport]
}

// ── delivery ────────────────────────────────────────────────────────────────

type Cursor = { lastId: number }

export type DeliverOptions = {
  transports?: AlertTransport[]
  /** Key prefix of the cursors (tests use their own). */
  cursorPrefix?: string
}

const CURSOR_PREFIX = 'muomalat:audit:alerts'

async function headId(payload: Payload): Promise<number> {
  const { docs } = await payload.find({ collection: AUDIT_SLUG, sort: '-id', limit: 1, depth: 0, pagination: false, overrideAccess: true })
  return docs[0]?.id ?? 0
}

/**
 * Send the alerts of every row after each transport's cursor. A transport
 * seen for the first time starts at the current head: history is not
 * replayed. Returns the alerts sent, per transport.
 */
export async function deliverAlerts(payload: Payload, options: DeliverOptions = {}): Promise<Record<string, Alert[]>> {
  const transports = options.transports ?? defaultTransports()
  const prefix = options.cursorPrefix ?? CURSOR_PREFIX
  const cursors = new Map<AlertTransport, number>()
  for (const t of transports) {
    const saved = await payload.kv.get<Cursor>(`${prefix}:${t.name}`)
    if (saved && Number.isFinite(saved.lastId)) cursors.set(t, saved.lastId)
    else await payload.kv.set(`${prefix}:${t.name}`, { lastId: await headId(payload) } satisfies Cursor)
  }
  const sent: Record<string, Alert[]> = Object.fromEntries(transports.map((t) => [t.name, []]))
  if (!cursors.size) return sent

  const from = Math.min(...cursors.values())
  const { docs } = await payload.find({
    collection: AUDIT_SLUG,
    where: { id: { greater_than: from } },
    sort: 'id',
    limit: BATCH,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  if (!docs.length) return sent

  let settings: Promise<Settings> | undefined
  const ctx: RuleContext = {
    payload,
    settings: () =>
      (settings ??= payload
        .findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
        .then((s) => ({ officeHours: (s as { operations?: Settings | null }).operations?.officeHours ?? null }))),
  }
  const alerts = new Map<number, Alert>()
  for (const row of docs) {
    const hit = await alertFor(row, ctx)
    if (hit) alerts.set(row.id, formatAlert(row, hit.kind, hit.headline))
  }

  for (const [transport, cursor] of cursors) {
    let last = cursor
    try {
      for (const row of docs) {
        if (row.id <= cursor) continue
        const alert = alerts.get(row.id)
        if (alert) {
          await transport.send(alert, payload)
          sent[transport.name].push(alert)
        }
        last = row.id
      }
    } catch (err) {
      payload.logger.error({ err, msg: `audit alerts: ${transport.name} failed; retrying from #${last + 1} on the next run` })
    }
    if (last !== cursor) await payload.kv.set(`${prefix}:${transport.name}`, { lastId: last } satisfies Cursor)
  }
  return sent
}

/**
 * An operational alert that is not an audit row (the worker's own failures,
 * e.g. a publish event that failed every attempt). Sent at once through the
 * default transports; the caller is already outside any transaction.
 */
export async function sendOperationalAlert(payload: Payload, subject: string, text: string): Promise<void> {
  const alert: Alert = { kind: 'operations', rowId: 0, subject: `[Muomalat] ${subject}`, text: `Muomalat CMS: ${subject}\n${text}` }
  for (const transport of defaultTransports()) {
    try {
      await transport.send(alert, payload)
    } catch (err) {
      payload.logger.error({ err, msg: `operational alert via ${transport.name} failed` })
    }
  }
}
