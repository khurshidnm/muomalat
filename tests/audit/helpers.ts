import { randomBytes } from 'node:crypto'

import config from '@payload-config'
import pg from 'pg'
import { handleEndpoints, type Payload, type Where } from 'payload'

import type { Role } from '@/payload/access/roles'
import { deliverAlerts, type Alert, type AlertTransport } from '@/payload/audit/alerts'
import type { AuditLog } from '@/payload-types'
import { testPayload } from '../helpers/payload'

/** A short random tag: test files share one database and run in parallel. */
export const tag = (prefix: string) => `${prefix}-${randomBytes(3).toString('hex')}`

export const CMS = process.env.CMS_URL || 'http://cms.localhost:3000'

/** A REST call through Payload's own handler, the code the Next route runs (no server needed). */
export async function rest(method: string, path: string, opts: { body?: unknown; cookie?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(opts.headers ?? {})
  headers.set('Origin', CMS)
  if (opts.cookie) headers.set('Cookie', opts.cookie)
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json')
  const request = new Request(CMS + path, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined })
  const res = await handleEndpoints({ config, request })
  const text = await res.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json: json as Record<string, unknown>, setCookie: res.headers.getSetCookie?.() ?? [] }
}

export const PASSWORD = 'audit-test-password-0123456789'

/** A fresh active staff account (unique email per call). */
export async function account(role: Role, prefix: string = role) {
  const payload = await testPayload()
  const email = `${tag(prefix)}@test.muomalat.local`
  return payload.create({
    collection: 'users',
    data: { email, name: `Audit ${prefix}`, role, active: true, password: PASSWORD },
    overrideAccess: true,
  })
}

export async function login(email: string, headers: Record<string, string> = {}, password = PASSWORD) {
  const res = await rest('POST', '/api/users/login', { body: { email, password }, headers })
  const cookie = res.setCookie.find((c) => c.startsWith('muomalat-token='))?.split(';')[0]
  return { ...res, cookie }
}

/** Audit rows matching `where`, oldest first. */
export async function rows(where: Where): Promise<AuditLog[]> {
  const payload = await testPayload()
  const { docs } = await payload.find({ collection: 'audit-log', where, sort: 'id', limit: 500, depth: 0, pagination: false, overrideAccess: true })
  return docs
}

export const forDoc = (collection: string, docId: number | string) =>
  rows({ and: [{ collection: { equals: collection } }, { docId: { equals: String(docId) } }] })

/** The actions of a list of rows, in order. */
export const actions = (list: AuditLog[]) => list.map((r) => r.action)

/** The newest row id, to look only at rows written after a point. */
export async function headId(): Promise<number> {
  const payload = await testPayload()
  const { docs } = await payload.find({ collection: 'audit-log', sort: '-id', limit: 1, depth: 0, pagination: false, overrideAccess: true })
  return docs[0]?.id ?? 0
}

/**
 * deliverAlerts handles 100 rows per run; while other test files write rows
 * in parallel, one run may stop before this test's rows. Run it until every
 * transport's cursor has passed the head as it was when called (or a pass
 * moves no cursor: a transport that keeps failing).
 */
export async function drainAlerts(payload: Payload, options: { transports: AlertTransport[]; cursorPrefix: string }) {
  const head = await headId()
  const cursors = async () =>
    Promise.all(options.transports.map(async (t) => ((await payload.kv.get<{ lastId: number }>(`${options.cursorPrefix}:${t.name}`))?.lastId ?? 0)))
  const out: Record<string, Alert[]> = Object.fromEntries(options.transports.map((t) => [t.name, []]))
  for (let pass = 0; pass < 500; pass++) {
    const before = await cursors()
    const sent = await deliverAlerts(payload, options)
    for (const [name, list] of Object.entries(sent)) out[name].push(...list)
    const after = await cursors()
    if (after.every((c) => c >= head) || after.every((c, i) => c === before[i])) break
  }
  return out
}

/** A transport that keeps what it was given. */
export function mockTransport(name = 'mock'): AlertTransport & { sent: Alert[] } {
  const sent: Alert[] = []
  return {
    name,
    sent,
    async send(alert) {
      sent.push(alert)
    },
  }
}

/** The test database as its owner (DDL and the tampering an attacker with the owner role could do). */
export async function asOwner<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const url = new URL(process.env.DATABASE_URL!)
  url.username = 'muomalat_owner'
  url.password = 'dev-owner-password'
  const client = new pg.Client({ connectionString: url.toString() })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/** The test database as the app role, outside Payload. */
export async function asApp<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}
