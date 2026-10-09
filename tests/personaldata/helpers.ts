import { randomBytes } from 'node:crypto'
import type { CollectionSlug, Payload } from 'payload'
import { vi } from 'vitest'

import type { Role } from '@/payload/access/roles'
import { staff } from '../helpers/payload'

/**
 * Shared helpers for the personal-data tests. Each test file mocks
 * next/headers itself (vi.mock is hoisted per file) and points it at
 * `request`, which the tests change per case.
 */
export const request = { headers: new Headers() }

/** Pretend the next server action comes from this page and address. */
export function fromPage(path: string, ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`) {
  request.headers = new Headers({
    host: 'localhost:3000',
    referer: `http://localhost:3000${path}`,
    'cf-connecting-ip': ip,
  })
  return ip
}

export function form(fields: Record<string, string | string[] | undefined>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  }
  return data
}

/** A fresh address per test, so rate limits and unique e-mails never collide. */
export const uniqueEmail = (tag: string) => `${tag}-${randomBytes(4).toString('hex')}@example.com`

export type SentMail = { to: string; subject: string; html: string; text: string }

/** Capture outgoing mail instead of sending it. */
export function captureMail(payload: Payload) {
  const sent: SentMail[] = []
  const spy = vi.spyOn(payload, 'sendEmail').mockImplementation(async (message: unknown) => {
    sent.push(message as SentMail)
    return undefined
  })
  return { sent, spy }
}

/** Everything written to the Payload logger and the console while a test runs. */
export function captureLogs(payload: Payload) {
  const lines: string[] = []
  const record = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, (_k, v) => (v instanceof Error ? { name: v.name, message: v.message } : v)))).join(' '))
  }
  const spies = [
    ...(['info', 'warn', 'error', 'debug', 'trace', 'fatal'] as const).map((level) =>
      vi.spyOn(payload.logger, level).mockImplementation(((...args: unknown[]) => record(level, ...args)) as never),
    ),
    ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => record(level, ...args)),
    ),
  ]
  return { lines, restore: () => spies.forEach((s) => s.mockRestore()) }
}

/** The token at the end of a link in a captured mail. */
export function tokenIn(mail: SentMail): string {
  const m = mail.text.match(/[?&]t=([\w.-]+)/)
  if (!m) throw new Error('no token link in mail')
  return m[1]
}

/** Set a stored date directly in the database, bypassing hooks (retention tests). */
export async function backdate(payload: Payload, collection: CollectionSlug, id: number, data: Record<string, unknown>) {
  await payload.db.updateOne({ collection, id, data, returning: false })
}

/**
 * staff() with one retry: test files run in parallel processes, and two of
 * them creating the same account at once lose the unique-email race.
 */
export async function staffUser(role: Role) {
  try {
    return await staff(role)
  } catch {
    return staff(role)
  }
}
