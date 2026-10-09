import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { tashkentDay, tashkentDayStart } from '@/payload/audit/time'
import { recordSystemAudit } from '@/payload/audit/writer'
import { checkBackups, job as alertsJob } from '@/worker/jobs/auditAlerts'
import { job as exportJob, runNightly } from '@/worker/jobs/auditExport'
import { testPayload } from '../helpers/payload'
import { rows } from './helpers'

/** The worker jobs (src/worker/jobs/auditAlerts.ts, auditExport.ts) as the worker runs them. */
afterAll(async () => (await testPayload()).destroy())

describe('audit worker jobs', () => {
  it('the nightly run checks the chain, exports and reports each step', async () => {
    const payload = await testPayload()
    process.env.AUDIT_EXPORT_TARGET = await mkdtemp(path.join(tmpdir(), 'audit-nightly-'))
    await recordSystemAudit(payload, { action: 'ops.backup_ok', summary: 'nightly test' })
    const result = await runNightly(payload)
    expect(result.ok).toBe(true)
    expect(result.chain?.checked).toBeGreaterThan(0)
    expect(result.exported).toEqual([])
    expect(typeof result.truncated).toBe('number')
    expect(exportJob).toMatchObject({ name: 'audit-export', intervalMs: 60 * 60 * 1000 })
  })

  it('a missing backup by 06:00 writes ops.backup_fail once that day', async () => {
    const payload = await testPayload()
    // A day in the future: rows written by this run (other files write ops.backup_ok too) are older than its window.
    const day = tashkentDay(Date.now() + (10 + Math.floor(Math.random() * 1000)) * 24 * 60 * 60 * 1000)
    const morning = new Date(tashkentDayStart(day).getTime() + 7 * 60 * 60 * 1000)
    const early = new Date(morning.getTime() - 2 * 60 * 60 * 1000)
    expect(await checkBackups(payload, early)).toBe(false)
    expect(await checkBackups(payload, morning)).toBe(true)
    expect(await checkBackups(payload, morning)).toBe(false)
    const fails = await rows({ and: [{ action: { equals: 'ops.backup_fail' } }, { summary: { like: '06:00' } }] })
    expect(fails.length).toBeGreaterThanOrEqual(1)
    expect(fails[0]).toMatchObject({ actorEmail: 'system:worker', actorRole: 'system' })
  })

  it('the alerts job runs without a bot (alerts go to the log or e-mail)', async () => {
    const payload = await testPayload()
    await expect(alertsJob.run(payload)).resolves.toBeUndefined()
    await expect(alertsJob.run(payload)).resolves.toBeUndefined()
  })
})
