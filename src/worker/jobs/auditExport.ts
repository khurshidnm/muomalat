import type { Payload } from 'payload'

import { checkChain } from '../../payload/audit/chain'
import { exportAuditDays, exportTargetFromEnv } from '../../payload/audit/export'
import { truncateOldIps } from '../../payload/audit/retention'
import { tashkentDay, tashkentTime } from '../../payload/audit/time'
import type { Job } from '../index'

/**
 * The audit log's nightly work (CMS-SPEC §9.1, §9.3, §9.5), once per Tashkent
 * day after AUDIT_NIGHTLY_AT (default 01:00):
 * 1. verify the hash chain; new breaks become an `ops.chain_break` row, which
 *    the alerts job sends;
 * 2. export every completed day as JSONL to AUDIT_EXPORT_TARGET (a local
 *    folder in development, the object-lock bucket in production);
 * 3. cut IP addresses older than 90 days to their network.
 *
 * The job wakes hourly; a worker that was down at night catches up at its
 * next start. Each step runs even when an earlier one failed, and the day is
 * marked done only when all succeeded, so a failure is retried an hour later.
 */
const RUN_KEY = 'muomalat:audit:nightly'

export async function runNightly(payload: Payload, now = new Date()) {
  const errors: unknown[] = []
  const step = async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn()
    } catch (err) {
      errors.push(err)
      payload.logger.error({ err, msg: `audit nightly: ${name} failed` })
      return undefined
    }
  }
  const chain = await step('chain check', () => checkChain(payload, { now }))
  const target = await step('export target', async () => exportTargetFromEnv())
  const exported = target ? await step('export', () => exportAuditDays(payload, target, { now })) : undefined
  const truncated = await step('IP truncation', () => truncateOldIps(payload))
  payload.logger.info({
    msg: `audit nightly: chain ${chain ? `${chain.checked} rows, ${chain.fresh.length} new break(s)` : 'not checked'}; export ${
      exported ? `${exported.map((d) => `${d.day} (${d.rows})`).join(', ') || 'nothing new'} → ${target?.describe}` : 'failed'
    }; IPs truncated: ${truncated ?? 'n/a'}`,
  })
  return { ok: errors.length === 0, chain, exported, truncated }
}

export const job: Job = {
  name: 'audit-export',
  intervalMs: 60 * 60 * 1000,
  run: async (payload) => {
    const now = new Date()
    const today = tashkentDay(now)
    if (tashkentTime(now) < (process.env.AUDIT_NIGHTLY_AT || '01:00')) return
    if ((await payload.kv.get<{ day: string }>(RUN_KEY))?.day === today) return
    const { ok } = await runNightly(payload, now)
    if (ok) await payload.kv.set(RUN_KEY, { day: today })
  },
}
