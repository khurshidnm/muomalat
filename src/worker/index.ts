/**
 * Background worker (CMS-SPEC §2.1): the same code as the app, run as a
 * separate process (`npm run worker`; its own container in production). It
 * runs the scheduler, the publish outbox (cache invalidation, Cloudflare
 * purge, Telegram), retention and alerts.
 *
 * Jobs live in ./jobs/*.ts, one file per job, each exporting `job`. The
 * worker loads every file in that folder, so adding a job never means editing
 * this file. A job that throws is logged and retried on its next tick; one
 * failing job never stops the others.
 */
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPayload, type Payload } from 'payload'

import config from '../payload.config'

export type Job = {
  /** Unique, kebab-case; used in logs and the audit log. */
  name: string
  /** How often to run, in milliseconds. */
  intervalMs: number
  /** Run once at start-up as well (default true). */
  runAtStart?: boolean
  run: (payload: Payload) => Promise<void>
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs')

async function loadJobs(): Promise<Job[]> {
  const files = (await readdir(dir).catch(() => [])).filter((f) => /\.(t|j)s$/.test(f) && !f.endsWith('.test.ts') && !f.startsWith('_'))
  const jobs: Job[] = []
  for (const file of files.sort()) {
    const mod = (await import(pathToFileURL(path.join(dir, file)).href)) as { job?: Job }
    if (mod.job) jobs.push(mod.job)
  }
  return jobs
}

async function main() {
  const payload = await getPayload({ config })
  const jobs = await loadJobs()
  payload.logger.info(`worker: ${jobs.length} job(s): ${jobs.map((j) => j.name).join(', ') || 'none'}`)

  const running = new Set<string>()
  const tick = async (job: Job) => {
    if (running.has(job.name)) return // never overlap a slow run
    running.add(job.name)
    try {
      await job.run(payload)
    } catch (error) {
      payload.logger.error({ err: error, msg: `worker job ${job.name} failed` })
    } finally {
      running.delete(job.name)
    }
  }

  const timers = jobs.map((job) => {
    if (job.runAtStart !== false) void tick(job)
    return setInterval(() => void tick(job), job.intervalMs)
  })

  const stop = async () => {
    timers.forEach(clearInterval)
    await payload.destroy()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
