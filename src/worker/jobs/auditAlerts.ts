import type { Payload } from 'payload'

import { deliverAlerts } from '../../payload/audit/alerts'
import { tashkentDay, tashkentDayStart, tashkentTime } from '../../payload/audit/time'
import { recordSystemAudit } from '../../payload/audit/writer'
import type { Job } from '../index'

/**
 * Audit alerts (CMS-SPEC §9.3): every few seconds, send the alerts of the
 * audit rows committed since the last run to the private alerts group
 * (ALERTS_BOT_TOKEN, ALERTS_CHAT_ID) and the alert e-mail recipients. Without
 * either, alerts go to the worker log. See src/payload/audit/alerts.ts.
 *
 * With BACKUP_EXPECTED=true (production, staging) it also watches the
 * backups (§12.7): when no `ops.backup_ok` row has arrived by 06:00 Tashkent
 * for the last 24 hours, it writes `ops.backup_fail` once that day, which
 * alerts like any other row.
 */
const BACKUP_DEADLINE = '06:00'
const BACKUP_CHECK_KEY = 'muomalat:audit:backup-check'

export async function checkBackups(payload: Payload, now = new Date()): Promise<boolean> {
  if (tashkentTime(now) < BACKUP_DEADLINE) return false
  const today = tashkentDay(now)
  if ((await payload.kv.get<{ day: string }>(BACKUP_CHECK_KEY))?.day === today) return false
  const since = new Date(tashkentDayStart(today).getTime() - 18 * 60 * 60 * 1000).toISOString()
  const { totalDocs } = await payload.count({
    collection: 'audit-log',
    where: { and: [{ action: { equals: 'ops.backup_ok' } }, { at: { greater_than: since } }] },
    overrideAccess: true,
  })
  if (!totalDocs) {
    await recordSystemAudit(payload, { action: 'ops.backup_fail', summary: `${BACKUP_DEADLINE} gacha muvaffaqiyatli zaxira nusxa haqida yozuv yoʻq` })
  }
  await payload.kv.set(BACKUP_CHECK_KEY, { day: today })
  return !totalDocs
}

export const job: Job = {
  name: 'audit-alerts',
  intervalMs: Number(process.env.AUDIT_ALERTS_INTERVAL_MS) || 10_000,
  run: async (payload) => {
    if (process.env.BACKUP_EXPECTED === 'true') await checkBackups(payload)
    const sent = await deliverAlerts(payload)
    const count = Object.values(sent).reduce((n, list) => n + list.length, 0)
    if (count) payload.logger.info({ msg: `audit-alerts: ${count} alert(s) sent` })
  },
}
