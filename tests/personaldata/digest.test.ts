import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { testPayload } from '../helpers/payload'
import { captureMail, form, fromPage, tokenIn, uniqueEmail, type SentMail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { subscribeDigest } = await import('@/app/actions')
const { confirmSubscription, unsubscribeFromDigest } = await import('@/lib/actions/privacy')
const { listUnsubscribeHeaders, unsubscribeToken } = await import('@/payload/personalData/tokens')
const { suppressionAddress } = await import('@/payload/personalData/retention')
const oneClick = await import('@/app/[lang]/dayjest/bekor-qilish/bir-bosish/route')

const idle = { status: 'idle' as const, errors: {}, values: {} }
const tokenIdle = { status: 'idle' as const, n: 0 }

let sent: SentMail[]
beforeAll(async () => {
  sent = captureMail(await testPayload()).sent
})
beforeEach(() => {
  sent.length = 0
})
afterAll(async () => (await testPayload()).destroy())

async function subscriber(email: string) {
  const payload = await testPayload()
  const { docs } = await payload.find({
    collection: 'digest-subscribers',
    where: { email: { equals: email } },
    overrideAccess: true,
    showHiddenFields: true,
    depth: 0,
  })
  return docs[0]
}

describe('L3: digest double opt-in', () => {
  it('stays pending until the e-mailed link is used; the unsubscribe link sets unsubscribed', async () => {
    fromPage('/dayjest')
    const email = uniqueEmail('optin')
    await subscribeDigest(idle, form({ email }))
    const pending = await subscriber(email)
    expect(pending).toMatchObject({ status: 'pending', confirmedAt: null, placement: 'dayjest' })
    expect(pending.confirmTokenHash).toMatch(/^[0-9a-f]{64}$/)

    // The mail holds the token; only its hash is stored.
    expect(sent).toHaveLength(1)
    const token = tokenIn(sent[0])
    expect(pending.confirmTokenHash).not.toContain(token)

    // Opening the link changes nothing: only the button's POST confirms.
    expect((await subscriber(email)).status).toBe('pending')
    expect(await confirmSubscription(tokenIdle, form({ t: 'x'.repeat(43) }))).toMatchObject({ status: 'invalid' })
    expect(await confirmSubscription(tokenIdle, form({ t: token }))).toMatchObject({ status: 'done' })
    const confirmed = await subscriber(email)
    expect(confirmed).toMatchObject({ status: 'confirmed', confirmTokenHash: null, retainUntil: null })
    expect(confirmed.confirmedAt).toBeTruthy()
    // Single use.
    expect(await confirmSubscription(tokenIdle, form({ t: token }))).toMatchObject({ status: 'invalid' })

    // Already confirmed: the same answer, no new mail, no change.
    expect(await subscribeDigest(idle, form({ email }))).toEqual({ status: 'success', errors: {}, values: {} })
    expect(sent).toHaveLength(1)
    expect((await subscriber(email)).status).toBe('confirmed')

    // Unsubscribe link from a digest e-mail.
    const unsub = unsubscribeToken(confirmed.id)
    expect(await unsubscribeFromDigest(tokenIdle, form({ t: `${confirmed.id}.forged` }))).toMatchObject({ status: 'invalid' })
    expect(await unsubscribeFromDigest(tokenIdle, form({ t: unsub }))).toMatchObject({ status: 'done' })
    const gone = await subscriber(email)
    expect(gone).toMatchObject({ status: 'unsubscribed' })
    expect(gone.unsubscribedAt).toBeTruthy()
    // 30 days from unsubscribing (§13.1).
    const days = (new Date(gone.retainUntil as string).getTime() - new Date(gone.unsubscribedAt as string).getTime()) / 86_400_000
    expect(Math.round(days)).toBe(30)
    // Idempotent.
    expect(await unsubscribeFromDigest(tokenIdle, form({ t: unsub }))).toMatchObject({ status: 'done' })
  })

  it('a pending subscription expires after 7 days; a re-subscription starts a fresh opt-in', async () => {
    fromPage('/ru/dayjest')
    const email = uniqueEmail('again')
    await subscribeDigest(idle, form({ email }))
    const first = await subscriber(email)
    const days = (new Date(first.retainUntil as string).getTime() - Date.now()) / 86_400_000
    expect(Math.round(days)).toBe(7)
    const firstToken = tokenIn(sent[0])

    await subscribeDigest(idle, form({ email }))
    const second = await subscriber(email)
    expect(second.id).toBe(first.id)
    expect(second.confirmTokenHash).not.toBe(first.confirmTokenHash)
    expect(sent).toHaveLength(2)
    expect(sent[1].subject).toMatch(/дайджест/)
    // The older link no longer works.
    expect(await confirmSubscription(tokenIdle, form({ t: firstToken }))).toMatchObject({ status: 'invalid' })
    expect(await confirmSubscription(tokenIdle, form({ t: tokenIn(sent[1]) }))).toMatchObject({ status: 'done' })

    // After unsubscribing, the form starts a new opt-in with a new consent record.
    const sub = await subscriber(email)
    await unsubscribeFromDigest(tokenIdle, form({ t: unsubscribeToken(sub.id) }))
    await subscribeDigest(idle, form({ email }))
    expect(await subscriber(email)).toMatchObject({ status: 'pending', unsubscribedAt: null, consent: { locale: 'ru' } })
  })

  it('confirming removes an earlier suppression hash for the address', async () => {
    const payload = await testPayload()
    fromPage('/dayjest')
    const email = uniqueEmail('suppressed')
    await payload.create({
      collection: 'digest-subscribers',
      overrideAccess: true,
      data: {
        email: suppressionAddress(email),
        status: 'unsubscribed',
        consent: { given: true, textVersion: 'digest-2026-10-v1', locale: 'uz', at: new Date().toISOString() },
      },
    })
    await subscribeDigest(idle, form({ email }))
    await confirmSubscription(tokenIdle, form({ t: tokenIn(sent[0]) }))
    expect(await subscriber(suppressionAddress(email))).toBeUndefined()
  })

  it('RFC 8058 one-click unsubscribe from the List-Unsubscribe header', async () => {
    const payload = await testPayload()
    const doc = await payload.create({
      collection: 'digest-subscribers',
      overrideAccess: true,
      data: {
        email: uniqueEmail('oneclick'),
        status: 'confirmed',
        consent: { given: true, textVersion: 'digest-2026-10-v1', locale: 'en', at: new Date().toISOString() },
      },
    })
    const headers = listUnsubscribeHeaders(doc.id, 'en')
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    const url = headers['List-Unsubscribe'].slice(1, -1)
    expect(url).toContain('/en/dayjest/bekor-qilish/bir-bosish?t=')

    const params = Promise.resolve({ lang: 'en' })
    const bad = await oneClick.POST(new NextRequest(url.replace(/t=[^&]+/, 't=1.bad'), { method: 'POST', body: 'List-Unsubscribe=One-Click' }), { params })
    expect(bad.status).toBe(400)
    const res = await oneClick.POST(new NextRequest(url, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), { params })
    expect(res.status).toBe(200)
    const after = await payload.findByID({ collection: 'digest-subscribers', id: doc.id, overrideAccess: true })
    expect(after.status).toBe('unsubscribed')
    // Opening the header link in a browser asks for the click instead.
    const get = await oneClick.GET(new NextRequest(url), { params })
    expect(get.status).toBe(303)
    expect(get.headers.get('location')).toMatch(/\/en\/dayjest\/bekor-qilish\?t=/)
  })
})
