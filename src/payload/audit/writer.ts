import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import {
  APIError,
  createLocalReq,
  isolateObjectProperty,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type Payload,
  type PayloadRequest,
} from 'payload'

import type { AuditLog } from '../../payload-types'
import type { AuditAction } from './actions'
import { hashRow } from './hash'

/**
 * Writing the audit log (CMS-SPEC §9.1).
 *
 * Same transaction, not an outbox. A change and its audit row commit or roll
 * back together: when the insert fails the hook throws, the user's operation
 * is rolled back and the editor sees the error; when the operation fails for
 * another reason, no row claims a change that never happened. So every
 * committed change has its row (J1), and nothing is lost if the process dies
 * between commit and a later step. An outbox would only defer the same INSERT
 * to a worker that cannot see the request (actor, IP, diff). What a row
 * triggers (the alerts, §9.3) does happen after commit: the worker reads
 * committed rows only (./alerts.ts).
 *
 * Events with no change to commit with use a transaction of their own
 * (`independent`): failed logins (Payload has already rolled the login back),
 * reads of personal data, worker events.
 *
 * Hash chain. Every row is chained by the audit-log beforeChange hook below,
 * whoever inserts it (this writer, or another concern calling
 * `payload.create({ collection: 'audit-log' })` directly): it takes a
 * transaction-level advisory lock, reads the head of the chain, and sets
 * `at`, `prevHash` and `hash`. The lock is held until the inserting
 * transaction ends, so two writers never chain onto the same row, and ids
 * become visible in chain order (the alert cursor relies on that). In a hook
 * that is the rest of one request.
 */

/** pg_advisory_xact_lock key: "muom" in ASCII. */
const CHAIN_LOCK_KEY = 0x6d756f6d
/**
 * Waiting longer than this for the chain lock fails the write instead of
 * hanging. The test suite raises it (AUDIT_CHAIN_LOCK_TIMEOUT, set in
 * tests/helpers/env.ts): its files write audit rows in parallel on one
 * database, and under that load a writer can queue for longer than any real
 * newsroom would make it wait.
 */
const CHAIN_LOCK_TIMEOUT = /^\d{1,6}(ms|s)$/.test(process.env.AUDIT_CHAIN_LOCK_TIMEOUT ?? '') ? process.env.AUDIT_CHAIN_LOCK_TIMEOUT! : '15s'

export const AUDIT_SLUG = 'audit-log' as const

export type AuditActor = { id?: number | string | null; email?: string | null; role?: string | null }

export type AuditEntry = {
  action: AuditAction
  collection?: string | null
  docId?: string | number | null
  /** A snapshot of the title; leave empty for personal-data documents. */
  docTitle?: string | null
  locale?: string | null
  versionId?: string | number | null
  summary?: string | null
  /** Field paths only, never values. */
  changedPaths?: string[] | null
  /** Values, only for settings, roles, labels, corrections and workflow fields (§9.1). */
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  /** Overrides the actor taken from the request (a failed login: the attempted email). */
  actor?: AuditActor
}

export type AuditWriteOptions = {
  /**
   * Write and commit in a transaction of its own, even when the request has
   * one: for events that must stay recorded when the operation fails (failed
   * logins, an edge identity mismatch thrown from beforeLogin).
   */
  independent?: boolean
}

export type AuditRow = AuditLog

type InternalContext = {
  trustedInternal?: boolean
  /** The in-process importer (§11); the workflow concern reads the same key. */
  importing?: boolean
  /** An internal caller's name, e.g. `system:retention` (default `system:worker`). */
  auditActor?: string
}

const REQUEST_ID = 'auditRequestId'

const clip = (value: unknown, max: number): string | null => {
  if (value === null || value === undefined || value === '') return null
  const s = String(value).replace(/\u0000/g, '')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/** jsonb rejects NUL characters; strings are the only place they can hide. */
const scrub = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/\u0000/g, '')
  if (Array.isArray(value)) return value.map(scrub)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrub(v)]))
  }
  return value
}

/** Who acts: the logged-in user, else the internal caller, else an anonymous visitor (a public form). */
export function actorOf(req: PayloadRequest | undefined): { actorId: number | null; actorEmail: string | null; actorRole: string } {
  const user = req?.user as { id?: number | string; email?: string; role?: string } | null | undefined
  if (user?.id !== undefined) {
    const id = Number(user.id)
    return { actorId: Number.isFinite(id) ? id : null, actorEmail: user.email ?? null, actorRole: user.role ?? 'unknown' }
  }
  const ctx = (req?.context ?? {}) as InternalContext
  if (ctx.trustedInternal) {
    return { actorId: null, actorEmail: ctx.auditActor ?? (ctx.importing ? 'system:import' : 'system:worker'), actorRole: 'system' }
  }
  return { actorId: null, actorEmail: null, actorRole: 'public' }
}

/** IP, country and user agent from the Cloudflare headers (§9.1); a request id shared by every row of one request. */
export function requestMeta(req: PayloadRequest | undefined) {
  const headers = req?.headers as Headers | undefined
  const get = (name: string) => headers?.get?.(name)?.trim() || null
  const context = (req?.context ?? {}) as Record<string, unknown>
  let requestId = get('cf-ray') ?? get('x-request-id')
  if (!requestId && req?.context) {
    requestId = typeof context[REQUEST_ID] === 'string' ? (context[REQUEST_ID] as string) : randomUUID()
    req.context[REQUEST_ID] = requestId
  }
  return {
    ip: clip(get('cf-connecting-ip'), 64),
    country: clip(get('cf-ipcountry')?.toUpperCase(), 8),
    userAgent: clip(get('user-agent'), 400),
    requestId: clip(requestId, 100),
  }
}

type Drizzle = { execute: (query: unknown) => Promise<{ rows: Record<string, unknown>[] }> }

/** The drizzle handle of a Payload transaction (or the pool outside one). */
export function drizzleFor(payload: Payload, transactionID: number | string | undefined | null): Drizzle {
  const db = payload.db as unknown as { drizzle: Drizzle; sessions?: Record<string, { db: Drizzle } | undefined> }
  return (transactionID !== undefined && transactionID !== null && db.sessions?.[String(transactionID)]?.db) || db.drizzle
}

function buildRow(req: PayloadRequest | undefined, entry: AuditEntry) {
  const actor = actorOf(req)
  if (entry.actor) {
    if (entry.actor.id !== undefined) {
      const id = entry.actor.id === null ? null : Number(entry.actor.id)
      actor.actorId = id !== null && Number.isFinite(id) ? id : null
    }
    if (entry.actor.email !== undefined) actor.actorEmail = entry.actor.email
    if (entry.actor.role !== undefined && entry.actor.role !== null) actor.actorRole = entry.actor.role
  }
  const meta = requestMeta(req)
  // A visitor's address is recorded only for authentication events (§9.4);
  // a public form submission keeps no IP anywhere (§3.14).
  const visitor = actor.actorRole === 'public' && !entry.action.startsWith('auth.')
  return {
    ...actor,
    actorEmail: clip(actor.actorEmail, 320),
    action: entry.action,
    collection: clip(entry.collection, 100),
    docId: clip(entry.docId, 100),
    docTitle: clip(entry.docTitle, 300),
    locale: clip(entry.locale, 16),
    versionId: clip(entry.versionId, 100),
    summary: clip(entry.summary, 1000),
    changedPaths: entry.changedPaths?.length ? [...new Set(entry.changedPaths)] : null,
    before: entry.before && Object.keys(entry.before).length ? scrub(entry.before) : null,
    after: entry.after && Object.keys(entry.after).length ? scrub(entry.after) : null,
    ...meta,
    ...(visitor ? { ip: null, country: null, userAgent: null } : {}),
  }
}

/**
 * audit-log beforeOperation: rows are never changed or removed through
 * Payload (the database role cannot either, §9.1).
 */
export const refuseAuditChanges: CollectionBeforeOperationHook = ({ operation }) => {
  if (operation === 'update' || operation === 'delete' || operation === 'restoreVersion') {
    throw new APIError('Audit jurnali yozuvlari oʻzgartirilmaydi va oʻchirilmaydi.', 403)
  }
}

/**
 * audit-log beforeChange: chain the new row (see the module comment). Runs in
 * the inserting transaction; Payload's create opens one when the caller did
 * not pass a request that has one.
 */
export const chainAuditRow: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') throw new APIError('Audit jurnali yozuvlari oʻzgartirilmaydi.', 403)
  const db = drizzleFor(req.payload, req.transactionID ? await req.transactionID : undefined)
  const previous = await db.execute(sql`SELECT current_setting('lock_timeout') AS t`)
  await db.execute(sql`SELECT set_config('lock_timeout', ${CHAIN_LOCK_TIMEOUT}, true)`)
  await db.execute(sql.raw(`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`))
  await db.execute(sql`SELECT set_config('lock_timeout', ${String(previous.rows[0]?.t ?? '0')}, true)`)
  const head = await db.execute(sql`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`)
  // `at` is taken under the lock, so it never goes backwards along the chain.
  data.at = new Date().toISOString()
  data.prevHash = (head.rows[0]?.hash as string | null | undefined) ?? null
  data.hash = hashRow(data)
  return data
}

async function create(req: PayloadRequest, data: ReturnType<typeof buildRow>): Promise<AuditRow> {
  return req.payload.create({
    collection: AUDIT_SLUG,
    data: data as Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>,
    req,
    overrideAccess: true,
    depth: 0,
  })
}

/**
 * Write one audit row as part of `req`: inside its transaction when it has one
 * (the default), or in a transaction of its own (`independent`, or when the
 * request has none).
 */
export async function recordAudit(req: PayloadRequest, entry: AuditEntry, options: AuditWriteOptions = {}): Promise<AuditRow> {
  const data = buildRow(req, entry)
  const current = req.transactionID ? await req.transactionID : undefined
  if (current && !options.independent) return create(req, data)

  const { payload } = req
  const own = isolateObjectProperty(req, 'transactionID')
  const id = await payload.db.beginTransaction()
  own.transactionID = id ?? undefined
  if (!id) return create(own, data)
  try {
    const row = await create(own, data)
    await payload.db.commitTransaction(id)
    return row
  } catch (error) {
    await payload.db.rollbackTransaction(id).catch(() => undefined)
    throw error
  }
}

/**
 * Write a row for an internal caller with no request (worker jobs, scripts):
 * actor `system:worker` unless another name is given.
 */
export async function recordSystemAudit(payload: Payload, entry: AuditEntry, actor = 'system:worker'): Promise<AuditRow> {
  const req = await createLocalReq({ context: { trustedInternal: true, auditActor: actor } }, payload)
  return recordAudit(req, entry, { independent: true })
}

/** The newest row for a document, optionally limited to one actor and action (autosave coalescing). */
export async function latestRowFor(
  req: PayloadRequest,
  where: { collection: string; docId: string; actorId?: number | null; action?: AuditAction },
): Promise<AuditRow | undefined> {
  const and: Record<string, unknown>[] = [{ collection: { equals: where.collection } }, { docId: { equals: where.docId } }]
  if (where.actorId !== undefined) and.push(where.actorId === null ? { actorId: { exists: false } } : { actorId: { equals: where.actorId } })
  if (where.action) and.push({ action: { equals: where.action } })
  const { docs } = await req.payload.find({
    collection: AUDIT_SLUG,
    where: { and } as never,
    sort: '-id',
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0]
}
