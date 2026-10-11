import type { Payload, Where } from 'payload'

import { sendOperationalAlert } from '../../payload/audit/alerts'
import { purge, type PurgeResult } from '../../payload/delivery/cloudflare'
import { deliveryEnv } from '../../payload/delivery/env'
import { backoffMs, MAX_ATTEMPTS } from '../../payload/delivery/outbox'
import { secretUsable, signedRequest } from '../../payload/delivery/signature'
import { mergeTargets, parseTargets, type Targets } from '../../payload/delivery/tags'
import { warmUp, type WarmResult } from '../../payload/delivery/warm'
import { telegramForEvent } from '../../payload/telegram/outbox'
import type { PublishEvent } from '../../payload-types'
import type { Job } from '../index'

/**
 * Publish outbox (CMS-SPEC §8.4 step 3), every 5 s over `publish-events` rows
 * with status `pending` that are due:
 *   0. re-post the invalidations to /internal/revalidate (Next keeps tag
 *      invalidations in memory, so an app restart forgets the ones it has not
 *      acted on; repeating them is harmless). Changes made outside a request
 *      (scheduler, scripts) are invalidated only here;
 *   1. warm the pages, twice, 2 s apart;
 *   2. purge Cloudflare (exact URLs; prefixes and everything when the targets
 *      say so);
 *   3. Telegram: prepare the posts the change calls for (queueTelegram);
 *   4. mark the rows done. On failure: attempts + 1 and lastError, retried with
 *      backoff (5 s doubling, at most 15 min), and after 10 attempts marked
 *      failed with an alert.
 * Due rows are handled together, so a burst (an import, a rubric of updates)
 * costs one revalidation post and one purge batch rather than one each.
 */
export const BATCH = 20

export type OutboxDeps = {
  /** Step 0. */
  revalidate: (targets: Targets) => Promise<void>
  /** Step 1. */
  warm: (paths: string[]) => Promise<WarmResult[]>
  /** Step 2. */
  purge: (targets: Targets) => Promise<PurgeResult>
  /** Step 3. */
  telegram: (payload: Payload, event: PublishEvent, targets: Targets) => Promise<void>
  /** After MAX_ATTEMPTS. */
  alert: (payload: Payload, event: PublishEvent, error: string) => Promise<void>
  now: () => number
}

/** Step 0: one signed POST to the app. Throws unless the app answers 2xx. */
export async function postRevalidate(targets: Targets, { fetch: doFetch = fetch, env = deliveryEnv() } = {}) {
  if (!secretUsable(env.revalidateSecret)) throw new Error('INTERNAL_REVALIDATE_SECRET is missing or shorter than 32 bytes')
  const { body, headers } = signedRequest(targets, env.revalidateSecret)
  const res = await doFetch(`${env.internalAppUrl}/internal/revalidate`, { method: 'POST', headers, body, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`/internal/revalidate answered HTTP ${res.status}`)
}

/**
 * TELEGRAM hook point (CMS-SPEC §10.3). Called once per event after the
 * purge; src/payload/telegram/outbox.ts prepares rows only (a `draft` on
 * first publication, `edit_pending` and a `correction_reply` on a
 * correction, a `retraction` on withdrawal), and nothing reaches Telegram
 * before a person approves it. Idempotent, because a failed batch runs again.
 * Without TELEGRAM_BOT_TOKEN it does nothing.
 */
async function queueTelegram(payload: Payload, event: PublishEvent, targets: Targets) {
  await telegramForEvent(payload, event, targets)
}

/** After the last attempt: the staff alerts group (CMS-SPEC §9.3), through the audit concern's transports. */
async function alertFailure(payload: Payload, event: PublishEvent, error: string) {
  payload.logger.error(`publish-events ${event.id} (${event.kind} ${event.collection} ${event.docId ?? ''}) failed for good: ${error}`)
  await sendOperationalAlert(
    payload,
    'Nashrdan keyingi ish bajarilmadi',
    `Nashr hodisasi #${event.id} (${event.kind}, ${event.collection} ${event.docId ?? ''}): ${MAX_ATTEMPTS} urinishdan keyin ham sayt keshi yangilanmadi. ` +
      `Sahifa eski holda koʻrinishi mumkin. Oxirgi xato: ${error}`,
  )
}

export const isDue = (event: Pick<PublishEvent, 'attempts' | 'updatedAt'>, now: number) => {
  const attempts = event.attempts ?? 0
  return attempts === 0 || Date.parse(event.updatedAt) + backoffMs(attempts) <= now
}

type Result = { done: number; retried: number; failed: number }

/**
 * One pass over the due rows. New rows go together; a row that has failed
 * before goes alone, one per pass, so a row the app or Cloudflare keeps
 * refusing cannot hold the others back. `scope` narrows the rows (tests share
 * one database).
 */
export async function processOutbox(payload: Payload, overrides: Partial<OutboxDeps> = {}, scope?: Where): Promise<Result> {
  const deps: OutboxDeps = {
    revalidate: (t) => postRevalidate(t),
    warm: (paths) => warmUp(paths),
    purge: (t) => purge(t, { log: { info: (m) => payload.logger.info(m) } }),
    telegram: queueTelegram,
    alert: alertFailure,
    now: Date.now,
    ...overrides,
  }
  const now = deps.now()
  const { docs } = await payload.find({
    collection: 'publish-events',
    where: scope ? { and: [{ status: { equals: 'pending' } }, scope] } : { status: { equals: 'pending' } },
    sort: 'id',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  const due = docs.filter((e) => isDue(e, now))
  const fresh = due.filter((e) => !e.attempts).slice(0, BATCH)
  const retry = due.find((e) => (e.attempts ?? 0) > 0)
  const result: Result = { done: 0, retried: 0, failed: 0 }
  for (const batch of [fresh, retry ? [retry] : []]) {
    if (!batch.length) continue
    const r = await processBatch(payload, deps, batch)
    result.done += r.done
    result.retried += r.retried
    result.failed += r.failed
  }
  return result
}

async function processBatch(payload: Payload, deps: OutboxDeps, events: PublishEvent[]): Promise<Result> {
  const result: Result = { done: 0, retried: 0, failed: 0 }
  const valid: { event: PublishEvent; targets: Targets }[] = []
  for (const event of events) {
    const targets = parseTargets(event.targets)
    if (targets) valid.push({ event, targets })
    else {
      await fail(payload, deps, event, 'targets are not valid JSON targets', true)
      result.failed++
    }
  }
  if (!valid.length) return result

  const merged = mergeTargets(...valid.map((v) => v.targets))
  try {
    await deps.revalidate(merged)
    const warmed = await deps.warm(merged.warm)
    const purged = await deps.purge(merged)
    for (const { event, targets } of valid) await deps.telegram(payload, event, targets)
    const processedAt = new Date(deps.now()).toISOString()
    for (const { event } of valid) {
      await payload.update({
        collection: 'publish-events',
        id: event.id,
        data: { status: 'done', attempts: (event.attempts ?? 0) + 1, lastError: null, processedAt },
        depth: 0,
        overrideAccess: true,
      })
      result.done++
    }
    const broken = warmed.filter((w) => w.round === 2 && (w.status === 'error' || w.status >= 500))
    payload.logger.info(
      `outbox: ${valid.length} event(s) done; ${merged.warm.length} page(s) warmed${broken.length ? ` (${broken.length} failing)` : ''}; ` +
        (purged.skipped ? 'purge skipped' : purged.everything ? 'zone purged' : `${purged.urls} url(s), ${purged.prefixes} prefix(es) purged`),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    for (const { event } of valid) {
      const final = await fail(payload, deps, event, message)
      if (final) result.failed++
      else result.retried++
    }
    payload.logger.warn(`outbox: pass failed (${result.retried} event(s) to retry, ${result.failed} given up): ${message}`)
  }
  return result
}

/** Records a failed attempt; returns true when the row is now `failed` for good. */
async function fail(payload: Payload, deps: OutboxDeps, event: PublishEvent, message: string, final = false) {
  const attempts = (event.attempts ?? 0) + 1
  const failed = final || attempts >= MAX_ATTEMPTS
  await payload.update({
    collection: 'publish-events',
    id: event.id,
    data: { status: failed ? 'failed' : 'pending', attempts, lastError: message.slice(0, 2000), ...(failed ? { processedAt: new Date(deps.now()).toISOString() } : {}) },
    depth: 0,
    overrideAccess: true,
  })
  if (failed) await deps.alert(payload, event, message)
  return failed
}

export const job: Job = {
  name: 'publish-outbox',
  intervalMs: 5_000,
  run: async (payload) => {
    await processOutbox(payload)
  },
}
