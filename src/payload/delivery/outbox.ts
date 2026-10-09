import { after } from 'next/server'
import { isolateObjectProperty, type Payload, type PayloadRequest } from 'payload'

import type { PublishEventKind } from '../collections/PublishEvents'
import type { PublishEvent } from '../../payload-types'
import { revalidateTargets } from './revalidate'
import { isEmptyTargets, type Targets } from './tags'

/**
 * The publish-events outbox (CMS-SPEC §8.4, "Monolog-lite").
 *
 * 1. A hook calls recordPublishEvent inside the change's transaction, so the
 *    row exists exactly when the change commits.
 * 2. Inside a request, after() revalidates once the response has gone out,
 *    which is after the commit. The callback first reads the row on its own
 *    connection: if the transaction rolled back there is no row and nothing is
 *    revalidated.
 * 3. Outside a request (worker, scheduler, import and break-glass scripts)
 *    after() throws. Nothing else is tried in-process: the worker posts the
 *    row's targets to /internal/revalidate, warms the pages, purges
 *    Cloudflare and marks the row done (src/worker/jobs/outbox.ts).
 */
export type ChangeKind = NonNullable<PublishEvent['changeKind']>
export const CHANGE_KINDS: readonly ChangeKind[] = ['minor', 'update', 'correction', 'clarification', 'editors_note']
export const asChangeKind = (v: unknown): ChangeKind | undefined => (CHANGE_KINDS.includes(v as ChangeKind) ? (v as ChangeKind) : undefined)

export type PublishEventInput = {
  collection: string
  docId?: string | number
  kind: PublishEventKind
  changeKind?: ChangeKind
  targets: Targets
}

/** After this many failed attempts the row is marked failed and an alert goes out. */
export const MAX_ATTEMPTS = 10

/** Wait before retry number `attempts + 1`: 5 s, 10 s, 20 s … capped at 15 minutes. */
export const backoffMs = (attempts: number) => Math.min(5_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000)

/** Same transaction, never a different locale (payloadcms#18246). */
const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])

export async function recordPublishEvent(req: PayloadRequest, input: PublishEventInput) {
  if (isEmptyTargets(input.targets)) return undefined
  const actor = req.user?.collection === 'users' && typeof req.user.id === 'number' ? req.user.id : undefined
  const row = await req.payload.create({
    collection: 'publish-events',
    data: {
      at: new Date().toISOString(),
      collection: input.collection,
      docId: input.docId === undefined ? undefined : String(input.docId),
      kind: input.kind,
      changeKind: input.changeKind,
      actorId: actor,
      targets: input.targets,
      status: 'pending',
      attempts: 0,
    },
    depth: 0,
    overrideAccess: true,
    req: isolated(req),
  })
  revalidateAfterCommit(req.payload, row.id, input.targets)
  return row
}

/** In-process revalidation once the change is committed; a no-op outside a request (the worker takes over). */
export function revalidateAfterCommit(payload: Payload, eventId: number, targets: Targets) {
  try {
    after(async () => {
      try {
        // No req: a separate connection, which sees committed rows only.
        const committed = await payload.findByID({ collection: 'publish-events', id: eventId, depth: 0, overrideAccess: true, disableErrors: true })
        if (!committed) {
          payload.logger.info(`publish-events ${eventId}: transaction rolled back; nothing revalidated`)
          return
        }
        revalidateTargets(targets)
      } catch (error) {
        payload.logger.error({ err: error, msg: `publish-events ${eventId}: revalidation after commit failed; the worker retries` })
      }
    })
  } catch {
    payload.logger.debug(`publish-events ${eventId}: no request scope; left to the outbox worker`)
  }
}
