import type { Payload } from 'payload'

import { hashRow } from './hash'
import { AUDIT_SLUG, recordSystemAudit, type AuditRow } from './writer'

/**
 * Nightly verification of the hash chain (CMS-SPEC §9.1, test J3).
 *
 * Each row must satisfy two checks: its stored hash is the hash of its
 * content (`hash`), and its `prevHash` is the stored hash of the row before it
 * (`link`). An edited row fails `hash`; an edited row whose hash was also
 * recomputed fails `link` on the next row; a deleted row fails `link` on the
 * row after it. Rows removed from the end are caught by the checkpoint kept
 * from the last run (`checkpoint`), rows removed from the start by the saved
 * first row (`head`), unless they were past the five-year retention (§9.5).
 *
 * A break is reported once: an `ops.chain_break` row (which alerts) lists the
 * breaks not reported before.
 */

export type ChainBreak = { id: number; reason: 'hash' | 'link' | 'checkpoint' | 'head' }

export type ChainState = {
  head?: { id: number; hash: string | null; at: string | null }
  last?: { id: number; hash: string | null }
  reported?: string[]
}

const RETENTION_MS = 5 * 365.25 * 24 * 60 * 60 * 1000
const PAGE = 1000
const STATE_KEY = 'muomalat:audit:chain'

async function* rowsInOrder(payload: Payload, fromId = 0): AsyncGenerator<AuditRow> {
  let after = fromId
  for (;;) {
    const { docs } = await payload.find({
      collection: AUDIT_SLUG,
      where: { id: { greater_than: after } },
      sort: 'id',
      limit: PAGE,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const row of docs) yield row
    if (docs.length < PAGE) return
    after = docs[docs.length - 1].id
  }
}

/** Walk the whole chain. */
export async function verifyChain(payload: Payload): Promise<{ checked: number; breaks: ChainBreak[]; first?: AuditRow; last?: AuditRow }> {
  const breaks: ChainBreak[] = []
  let previous: AuditRow | undefined
  let first: AuditRow | undefined
  let checked = 0
  for await (const row of rowsInOrder(payload)) {
    checked++
    if (!first) first = row
    // The first row's prevHash points before the log (null at genesis, or a row purged after five years).
    if (previous && (row.prevHash ?? null) !== (previous.hash ?? null)) breaks.push({ id: row.id, reason: 'link' })
    if (hashRow(row) !== row.hash) breaks.push({ id: row.id, reason: 'hash' })
    previous = row
  }
  return { checked, breaks, first, last: previous }
}

export type CheckOptions = { stateKey?: string; now?: Date }

/** Verify, compare with the last run's checkpoints, record new breaks. */
export async function checkChain(payload: Payload, options: CheckOptions = {}) {
  const key = options.stateKey ?? STATE_KEY
  const now = options.now ?? new Date()
  const state = (await payload.kv.get<ChainState>(key)) ?? {}
  const result = await verifyChain(payload)
  const breaks = [...result.breaks]

  if (state.last) {
    const { docs } = await payload.find({ collection: AUDIT_SLUG, where: { id: { equals: state.last.id } }, limit: 1, depth: 0, pagination: false, overrideAccess: true })
    if (!docs[0] || (docs[0].hash ?? null) !== state.last.hash) breaks.push({ id: state.last.id, reason: 'checkpoint' })
  }
  if (state.head && result.first && result.first.id !== state.head.id) {
    const purgeable = state.head.at && now.getTime() - new Date(state.head.at).getTime() > RETENTION_MS
    if (!purgeable) breaks.push({ id: state.head.id, reason: 'head' })
  }

  const reported = new Set(state.reported ?? [])
  const fresh = breaks.filter((b) => !reported.has(`${b.id}:${b.reason}`))
  if (fresh.length) {
    await recordSystemAudit(payload, {
      action: 'ops.chain_break',
      collection: AUDIT_SLUG,
      docId: fresh[0].id,
      summary: `Zanjir tekshiruvi: ${fresh.length} ta buzilish (yozuvlar ${fresh
        .slice(0, 10)
        .map((b) => `#${b.id} ${b.reason}`)
        .join(', ')}${fresh.length > 10 ? ', …' : ''})`,
      after: { breaks: fresh.slice(0, 100), checked: result.checked },
    })
  }

  const next: ChainState = {
    head: result.first ? { id: result.first.id, hash: result.first.hash ?? null, at: result.first.at ?? null } : state.head,
    last: result.last ? { id: result.last.id, hash: result.last.hash ?? null } : state.last,
    reported: [...reported, ...fresh.map((b) => `${b.id}:${b.reason}`)].slice(-1000),
  }
  await payload.kv.set(key, next)
  return { checked: result.checked, breaks, fresh }
}
