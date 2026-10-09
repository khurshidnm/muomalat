import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import { captureMail, form, fromPage, uniqueEmail, type SentMail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { subscribeDigest } = await import('@/app/actions')
const { sendContactMessage } = await import('@/lib/actions/contact')
const { requestDataRights, confirmSubscription } = await import('@/lib/actions/privacy')
const { FORM_LIMITS } = await import('@/lib/actions/context')

const idle = { status: 'idle' as const, errors: {}, values: {}, n: 0 }

let sent: SentMail[]
beforeAll(async () => {
  sent = captureMail(await testPayload()).sent
})
afterAll(async () => (await testPayload()).destroy())

const count = async (email: string) =>
  (await (await testPayload()).count({ collection: 'contact-messages', where: { email: { equals: email } }, overrideAccess: true })).totalDocs

describe('§12.3: app-level rate limits on the public forms', () => {
  it('per e-mail: the sixth message within an hour is refused and not stored', async () => {
    const email = uniqueEmail('flood')
    for (let i = 0; i < FORM_LIMITS.identity.max; i++) {
      fromPage('/aloqa') // a new address each time: only the e-mail limit applies
      expect((await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email, message: `m${i}`, consent: 'on' }))).status).toBe('success')
    }
    fromPage('/aloqa')
    const refused = await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email, message: 'one more', consent: 'on' }))
    expect(refused).toMatchObject({ status: 'error', formError: 'rate', errors: {} })
    // What the person typed is kept in the form, nothing is stored.
    expect(refused.values.message).toBe('one more')
    expect(await count(email)).toBe(FORM_LIMITS.identity.max)
  })

  it('per IP: the 21st valid submission from one address in 10 minutes is refused', async () => {
    const ip = '203.0.113.77'
    let last
    for (let i = 0; i <= FORM_LIMITS.ip.max; i++) {
      fromPage('/aloqa', ip)
      last = await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email: uniqueEmail(`ip${i}`), message: 'm', consent: 'on' }))
      if (i < FORM_LIMITS.ip.max) expect(last.status).toBe('success')
    }
    expect(last).toMatchObject({ status: 'error', formError: 'rate' })
    // Other people are not affected.
    fromPage('/aloqa', '203.0.113.78')
    expect((await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email: uniqueEmail('other'), message: 'm', consent: 'on' }))).status).toBe('success')
    // Invalid attempts do not count: they store and send nothing.
    fromPage('/aloqa', '203.0.113.79')
    for (let i = 0; i < 30; i++) await sendContactMessage(idle, form({ topic: 'boshqa', name: '', email: 'x', message: '', consent: 'on' }))
    expect((await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email: uniqueEmail('after'), message: 'm', consent: 'on' }))).status).toBe('success')
  })

  it('digest: one address asked for too often gets the usual answer and no more mail', async () => {
    const email = uniqueEmail('bomb')
    sent.length = 0
    for (let i = 0; i < FORM_LIMITS.mailIdentity.max + 3; i++) {
      fromPage('/dayjest')
      expect(await subscribeDigest({ status: 'idle', errors: {}, values: {} }, form({ email }))).toEqual({ status: 'success', errors: {}, values: {} })
    }
    expect(sent.filter((m) => m.to === email)).toHaveLength(FORM_LIMITS.mailIdentity.max)
  })

  it('rights requests and link buttons are limited too', async () => {
    const email = uniqueEmail('rights')
    for (let i = 0; i < FORM_LIMITS.mailIdentity.max; i++) {
      fromPage('/maxfiylik')
      expect((await requestDataRights(idle, form({ email, kind: 'access' }))).status).toBe('success')
    }
    fromPage('/maxfiylik')
    expect(await requestDataRights(idle, form({ email, kind: 'access' }))).toMatchObject({ status: 'error', formError: 'rate' })

    const ip = '203.0.113.90'
    let last
    for (let i = 0; i <= FORM_LIMITS.token.max; i++) {
      fromPage('/dayjest/tasdiqlash', ip)
      last = await confirmSubscription({ status: 'idle', n: 0 }, form({ t: 'x'.repeat(43) }))
    }
    expect(last).toMatchObject({ status: 'busy' })
  })
})
