import type { Payload, Where } from 'payload'

import { auditPd } from './audit'
import { sha256 } from './tokens'

/**
 * Retention (CMS-SPEC §13.1; the periods are proposals for counsel).
 *
 * Hooks set `retainUntil` on every change (src/payload/hooks/personalData),
 * so a record's deadline moves with its last activity; the worker's nightly
 * `retention` job then deletes or anonymises whatever has passed it and
 * writes one `pd.retention_purge` audit row with the counts.
 */
export const RETENTION = {
  digestPendingDays: 7,
  digestUnsubscribedDays: 30,
  clubMonths: 24,
  clubDeclinedMonths: 6,
  contactMonths: 24,
  advertisingMonths: 12,
  advertisingContractMonths: 36,
  requestsAfterDecisionMonths: 36,
  usersAfterOffboardingMonths: 12,
} as const

const DAY = 24 * 60 * 60 * 1000

const addDays = (from: Date, days: number) => new Date(from.getTime() + days * DAY)

function addMonths(from: Date, months: number): Date {
  const out = new Date(from)
  out.setUTCMonth(out.getUTCMonth() + months)
  return out
}

const asDate = (value: unknown): Date | null => {
  if (!value) return null
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// Digest suppression list
// ---------------------------------------------------------------------------

/**
 * After an unsubscribed address is purged only its SHA-256 is kept, so the
 * address is never mailed or imported again (§13.1). The hash lives in the
 * subscriber row itself, as `<sha256>@suppressed.invalid` (RFC 2606: the
 * domain can never receive mail), with every other value cleared. Re-subscribing
 * through double opt-in is still possible; confirming removes the hash row.
 */
export const SUPPRESSED_DOMAIN = 'suppressed.invalid'

export const normaliseEmail = (email: string) => email.trim().toLowerCase()

export const suppressionAddress = (email: string) => `${sha256(normaliseEmail(email))}@${SUPPRESSED_DOMAIN}`

export const isSuppressionAddress = (email: unknown) => typeof email === 'string' && email.endsWith(`@${SUPPRESSED_DOMAIN}`)

// ---------------------------------------------------------------------------
// retainUntil
// ---------------------------------------------------------------------------

export const RETAINED_COLLECTIONS = [
  'club-applications',
  'digest-subscribers',
  'contact-messages',
  'advertising-requests',
  'requests',
] as const
export type RetainedCollection = (typeof RETAINED_COLLECTIONS)[number]

/**
 * The deadline for a record as it will be after this change. `doc` is the
 * merged record (incoming data over the stored one); `now` is the change.
 * Null means "keep": a confirmed subscriber, an undecided request.
 */
export function retainUntilFor(collection: RetainedCollection, doc: Record<string, unknown>, now = new Date()): string | null {
  switch (collection) {
    case 'club-applications':
      return addMonths(now, doc.status === 'declined' ? RETENTION.clubDeclinedMonths : RETENTION.clubMonths).toISOString()
    case 'contact-messages':
      return addMonths(now, RETENTION.contactMonths).toISOString()
    case 'advertising-requests':
      return addMonths(now, doc.contract ? RETENTION.advertisingContractMonths : RETENTION.advertisingMonths).toISOString()
    case 'digest-subscribers': {
      if (isSuppressionAddress(doc.email)) return null
      if (doc.status === 'pending') return addDays(now, RETENTION.digestPendingDays).toISOString()
      if (doc.status === 'unsubscribed') return addDays(asDate(doc.unsubscribedAt) ?? now, RETENTION.digestUnsubscribedDays).toISOString()
      return null
    }
    case 'requests': {
      const decided = asDate(doc.decidedAt)
      return decided ? addMonths(decided, RETENTION.requestsAfterDecisionMonths).toISOString() : null
    }
  }
}

// ---------------------------------------------------------------------------
// The purge
// ---------------------------------------------------------------------------

export type PurgeCounts = { deleted: number; anonymised: number; kept: number }
export type PurgeReport = Record<RetainedCollection | 'users', PurgeCounts>

const BATCH = 200
/** Context for the job's own writes: hooks can tell a system purge from a person; audit rows name the job. */
const CONTEXT = { trustedInternal: true, personalDataRetention: true, auditActor: 'system:retention' }

/** Reference a `tuzatish` contact message leaves in its requests item (`documents`). */
export const contactMessageRef = (id: number | string) => `contact-messages:${id}`

async function expired(payload: Payload, collection: RetainedCollection, now: Date, extra?: Where) {
  const where: Where = { retainUntil: { less_than: now.toISOString() } }
  const { docs } = await payload.find({
    collection,
    where: extra ? { and: [where, extra] } : where,
    limit: BATCH,
    depth: 0,
    sort: 'retainUntil',
    overrideAccess: true,
    context: CONTEXT,
  })
  return docs as unknown as Record<string, unknown>[]
}

async function remove(payload: Payload, collection: RetainedCollection, id: unknown) {
  await payload.delete({ collection, id: id as number, overrideAccess: true, context: CONTEXT })
}

/** Deletes or anonymises every record past its deadline. Idempotent; safe to run at any time. */
export async function purgeExpired(payload: Payload, now = new Date()): Promise<PurgeReport> {
  const zero = (): PurgeCounts => ({ deleted: 0, anonymised: 0, kept: 0 })
  const report: PurgeReport = {
    'club-applications': zero(),
    'digest-subscribers': zero(),
    'contact-messages': zero(),
    'advertising-requests': zero(),
    requests: zero(),
    users: zero(),
  }

  // Digest: pending rows go; unsubscribed rows become their suppression hash.
  for (;;) {
    const rows = await expired(payload, 'digest-subscribers', now)
    if (!rows.length) break
    for (const row of rows) {
      const count = report['digest-subscribers']
      if (row.status !== 'unsubscribed' || isSuppressionAddress(row.email)) {
        await remove(payload, 'digest-subscribers', row.id)
        count.deleted += 1
        continue
      }
      const hashed = suppressionAddress(String(row.email))
      const existing = await payload.find({
        collection: 'digest-subscribers',
        where: { email: { equals: hashed } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existing.docs.length) {
        await remove(payload, 'digest-subscribers', row.id)
        count.deleted += 1
        continue
      }
      await payload.update({
        collection: 'digest-subscribers',
        id: row.id as number,
        overrideAccess: true,
        context: CONTEXT,
        data: {
          email: hashed,
          placement: null,
          confirmTokenHash: null,
          internalNotes: null,
          assignedTo: null,
          source: { path: null, locale: null },
        },
      })
      count.anonymised += 1
    }
    if (rows.length < BATCH) break
  }

  for (const collection of ['club-applications', 'advertising-requests'] as const) {
    for (;;) {
      const rows = await expired(payload, collection, now)
      for (const row of rows) await remove(payload, collection, row.id)
      report[collection].deleted += rows.length
      if (rows.length < BATCH) break
    }
  }

  // Contact messages: a correction request stays while its requests item is kept (§13.1).
  {
    const kept: number[] = []
    for (;;) {
      // Kept rows stay expired; page past them.
      const rows = await expired(payload, 'contact-messages', now, kept.length ? { id: { not_in: kept } } : undefined)
      for (const row of rows) {
        if (row.topic === 'tuzatish' && (await requestStillKept(payload, row.id, now))) {
          kept.push(row.id as number)
          continue
        }
        await remove(payload, 'contact-messages', row.id)
        report['contact-messages'].deleted += 1
      }
      if (rows.length < BATCH) break
    }
    report['contact-messages'].kept = kept.length
  }

  // Requests register: the entry stays, the requester's details go (§3.15).
  for (;;) {
    const rows = await expired(payload, 'requests', now, {
      or: [{ requesterName: { exists: true } }, { requesterContact: { exists: true } }],
    })
    for (const row of rows) {
      await payload.update({
        collection: 'requests',
        id: row.id as number,
        overrideAccess: true,
        context: CONTEXT,
        data: { requesterName: null, requesterContact: null },
      })
    }
    report.requests.anonymised += rows.length
    if (rows.length < BATCH) break
  }

  report.users.anonymised += await anonymiseOffboardedUsers(payload, now)

  const parts = Object.entries(report)
    .filter(([, c]) => c.deleted || c.anonymised)
    .map(([collection, c]) => `${collection}: ${c.deleted} oʻchirildi, ${c.anonymised} anonimlashtirildi`)
  if (parts.length) {
    await auditPd(payload, {
      action: 'pd.retention_purge',
      summary: parts.join('; '),
      changedPaths: Object.entries(report)
        .filter(([, c]) => c.deleted || c.anonymised)
        .map(([collection]) => collection),
    })
  }
  return report
}

async function requestStillKept(payload: Payload, messageId: unknown, now: Date): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'requests',
    where: { documents: { equals: contactMessageRef(messageId as number) } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const request = docs[0]
  if (!request) return false
  const until = asDate(request.retainUntil)
  return !until || until > now
}

/** Users: one year after offboarding the account keeps only its name (§13.1); audit snapshots keep theirs. */
export const ANONYMISED_USER_DOMAIN = 'anonymised.invalid'

async function anonymiseOffboardedUsers(payload: Payload, now: Date): Promise<number> {
  const cutoff = addMonths(now, -RETENTION.usersAfterOffboardingMonths).toISOString()
  const { docs } = await payload.find({
    collection: 'users',
    where: {
      and: [
        { offboardedAt: { less_than: cutoff } },
        { active: { equals: false } },
        // not_like takes the pattern as given (no implicit wildcards, unlike `like`).
        { email: { not_like: `%@${ANONYMISED_USER_DOMAIN}` } },
      ],
    },
    limit: BATCH,
    depth: 0,
    overrideAccess: true,
  })
  for (const user of docs) {
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      context: CONTEXT,
      data: {
        email: `user-${user.id}@${ANONYMISED_USER_DOMAIN}`,
        declaredInterests: [],
        telegramUserId: null,
        lastLoginCountry: null,
        knownCountries: null,
      },
    })
  }
  return docs.length
}
