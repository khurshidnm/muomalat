import { afterAll, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import { captureLogs, form, fromPage, uniqueEmail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { subscribeDigest } = await import('@/app/actions')
const { applyToClub } = await import('@/lib/actions/club')
const { sendContactMessage } = await import('@/lib/actions/contact')

const idle = { status: 'idle' as const, errors: {}, values: {}, n: 0 }

afterAll(async () => (await testPayload()).destroy())

/** No personal value may reach a log line or an audit row (§9.1, §13.5). */
describe('audit-safe', () => {
  it('a mail failure whose error quotes the address is logged without it', async () => {
    const payload = await testPayload()
    const email = uniqueEmail('bounce')
    const name = 'Sardor Rahimov'
    const phone = '+998 93 777-66-55'
    const send = vi.spyOn(payload, 'sendEmail').mockRejectedValue(
      Object.assign(new Error(`Can't send mail - all recipients were rejected: 550 5.1.1 <${email}>: user unknown`), { code: 'EENVELOPE' }),
    )
    const logs = captureLogs(payload)
    try {
      fromPage('/klub')
      const state = await applyToClub(
        idle,
        form({ name, company: 'Uchinchi MChJ', sector: 'it', size: '1-10', phone, email, interest: 'ijora', message: 'Maxfiy matn', consent: 'on' }),
      )
      // The application is stored even though the acknowledgement bounced.
      expect(state.status).toBe('success')
      fromPage('/aloqa')
      await sendContactMessage(idle, form({ topic: 'tuzatish', name, email, message: 'Maxfiy matn', consent: 'on' }))
      fromPage('/dayjest')
      await subscribeDigest({ status: 'idle', errors: {}, values: {} }, form({ email }))
    } finally {
      logs.restore()
      send.mockRestore()
    }
    const text = logs.lines.join('\n')
    expect(text).toMatch(/personal-data: club mail failed/)
    expect(text).toMatch(/EENVELOPE/)
    for (const value of [email, name, phone, 'Maxfiy matn', 'Uchinchi']) expect(text).not.toContain(value)

    // And the audit rows the submissions produced carry paths, never values.
    const { docs } = await payload.find({ collection: 'audit-log', sort: '-id', limit: 50, overrideAccess: true })
    expect(docs.length).toBeGreaterThan(0)
    const rows = JSON.stringify(docs)
    for (const value of [email, name, phone, 'Maxfiy matn', 'Uchinchi']) expect(rows).not.toContain(value)
  })

  it('a store failure answers "unavailable" and logs only the error class', async () => {
    const payload = await testPayload()
    const email = uniqueEmail('dbdown')
    const create = vi.spyOn(payload, 'create').mockRejectedValueOnce(
      Object.assign(new Error(`duplicate key value violates unique constraint: Key (email)=(${email}) already exists`), { code: '23505' }),
    )
    const logs = captureLogs(payload)
    let state
    try {
      fromPage('/aloqa')
      state = await sendContactMessage(idle, form({ topic: 'boshqa', name: 'Zarina', email, message: 'Salom', consent: 'on' }))
    } finally {
      logs.restore()
      create.mockRestore()
    }
    expect(state).toMatchObject({ status: 'error', formError: 'unavailable', errors: {} })
    const text = logs.lines.join('\n')
    expect(text).toMatch(/contact-messages create failed/)
    expect(text).not.toContain(email)
    expect(text).not.toContain('Zarina')
  })
})
