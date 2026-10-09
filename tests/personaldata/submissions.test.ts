import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import { captureMail, form, fromPage, request, uniqueEmail, type SentMail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { subscribeDigest } = await import('@/app/actions')
const { applyToClub } = await import('@/lib/actions/club')
const { sendAdvertisingEnquiry, sendContactMessage } = await import('@/lib/actions/contact')

const idle = { status: 'idle' as const, errors: {}, values: {}, n: 0 }

let sent: SentMail[]

beforeAll(async () => {
  const payload = await testPayload()
  sent = captureMail(payload).sent
})
beforeEach(() => {
  sent.length = 0
})
afterAll(async () => (await testPayload()).destroy())

const one = async (collection: 'club-applications' | 'contact-messages' | 'advertising-requests' | 'digest-subscribers', email: string) => {
  const payload = await testPayload()
  const { docs } = await payload.find({ collection, where: { email: { equals: email } }, overrideAccess: true, depth: 0 })
  return docs
}

describe('L1: each form stores a record with its consent record; the response echoes nothing', () => {
  it('club application (/klub, Russian edition)', async () => {
    fromPage('/ru/klub')
    const email = uniqueEmail('club')
    const state = await applyToClub(
      idle,
      form({
        name: 'Aziz Karimov',
        company: 'Test MChJ',
        sector: 'savdo',
        size: '11-50',
        phone: '+998 90 123-45-67',
        email,
        interest: ['ijora', 'murobaha', 'not-an-option'],
        message: 'Salom',
        attend: 'on',
        consent: 'on',
      }),
    )
    expect(state).toEqual({ status: 'success', errors: {}, values: {}, n: 1 })
    const [doc] = await one('club-applications', email)
    expect(doc).toMatchObject({
      name: 'Aziz Karimov',
      sector: 'savdo',
      interests: ['ijora', 'murobaha'],
      attend: true,
      status: 'new',
      source: { path: '/klub', locale: 'ru' },
      consent: { given: true, textVersion: 'club-2026-10-v1', locale: 'ru' },
    })
    expect(Date.now() - new Date(doc.consent.at).getTime()).toBeLessThan(60_000)
    expect(doc.retainUntil).toBeTruthy()
    // Acknowledged in Russian, with none of the submitted text.
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(email)
    expect(sent[0].subject).toMatch(/клуб/)
    expect(sent[0].text + sent[0].html).not.toMatch(/Aziz|Karimov|Test MChJ|Salom/)
  })

  it('club application without an e-mail is stored and sends nothing', async () => {
    fromPage('/klub')
    const phone = '+998 91 555-12-34'
    const state = await applyToClub(
      idle,
      form({ name: 'Nodira', company: 'Ikkinchi MChJ', sector: 'it', size: '1-10', phone, interest: 'takaful', consent: 'on' }),
    )
    expect(state.status).toBe('success')
    const payload = await testPayload()
    const { docs } = await payload.find({ collection: 'club-applications', where: { phone: { equals: phone } }, overrideAccess: true })
    expect(docs[0]).toMatchObject({ email: null, consent: { textVersion: 'club-2026-10-v1', locale: 'uz' }, source: { path: '/klub' } })
    expect(sent).toHaveLength(0)
  })

  it('contact message (/aloqa, Cyrillic edition)', async () => {
    fromPage('/kr/aloqa')
    const email = uniqueEmail('contact')
    const state = await sendContactMessage(
      idle,
      form({ topic: 'tahririyat', name: 'Bekzod', email, url: '', message: 'Maslahat bor', consent: 'on' }),
    )
    expect(state).toEqual({ status: 'success', errors: {}, values: {}, n: 1 })
    const [doc] = await one('contact-messages', email)
    expect(doc).toMatchObject({
      topic: 'tahririyat',
      status: 'new',
      source: { path: '/aloqa', locale: 'kr' },
      consent: { given: true, textVersion: 'contact-2026-10-v1', locale: 'kr' },
    })
    expect(sent[0].subject).toMatch(/[А-Яа-яЎўҚқҒғҲҳ]/)
    expect(sent[0].text).not.toMatch(/Bekzod|Maslahat/)
  })

  it('advertising enquiry (/reklama, English edition)', async () => {
    fromPage('/en/reklama')
    const email = uniqueEmail('ad')
    const state = await sendAdvertisingEnquiry(
      idle,
      form({ name: 'Jane', company: 'Bank', email, phone: '+998 71 200-00-00', format: 'banner', budget: 'upTo30', message: 'Campaign', consent: 'on' }),
    )
    expect(state.status).toBe('success')
    expect(state.values).toEqual({})
    const [doc] = await one('advertising-requests', email)
    expect(doc).toMatchObject({
      format: 'banner',
      budget: 'upTo30',
      status: 'new',
      source: { path: '/reklama', locale: 'en' },
      consent: { given: true, textVersion: 'advertising-2026-10-v1', locale: 'en' },
    })
    expect(sent[0].subject).toMatch(/advertising/i)
  })

  it('digest signup (home page)', async () => {
    fromPage('/')
    const email = uniqueEmail('Digest').replace('digest', 'DiGeSt')
    const state = await subscribeDigest({ status: 'idle', errors: {}, values: {} }, form({ email: `  ${email}  ` }))
    expect(state).toEqual({ status: 'success', errors: {}, values: {} })
    const [doc] = await one('digest-subscribers', email.toLowerCase())
    expect(doc).toMatchObject({
      email: email.toLowerCase(),
      status: 'pending',
      locale: 'uz',
      placement: 'home',
      consent: { given: true, textVersion: 'digest-2026-10-v1', locale: 'uz' },
    })
    expect(sent[0].text).toMatch(/\/dayjest\/tasdiqlash\?t=/)
  })
})

describe('L2: a submission without consent is rejected with the existing error code', () => {
  it('club, contact and advertising', async () => {
    fromPage('/klub')
    const email = uniqueEmail('noconsent')
    const club = await applyToClub(
      idle,
      form({ name: 'A', company: 'B', sector: 'savdo', size: '1-10', phone: '+998 90 000-00-00', email, interest: 'ijora' }),
    )
    expect(club.status).toBe('error')
    expect(club.errors).toEqual({ consent: 'consent' })
    const contact = await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email, message: 'x' }))
    expect(contact.errors).toEqual({ consent: 'consent' })
    const ad = await sendAdvertisingEnquiry(
      idle,
      form({ name: 'A', company: 'B', email, phone: '+998 90 000-00-00', format: 'banner', message: 'x' }),
    )
    expect(ad.errors).toEqual({ consent: 'consent' })
    for (const c of ['club-applications', 'contact-messages', 'advertising-requests'] as const) expect(await one(c, email)).toHaveLength(0)
    expect(sent).toHaveLength(0)
  })

  it('the store refuses a record without consent even if an action forgot to check', async () => {
    const { personalData } = await import('@/payload/personalData')
    const result = await personalData().createSubmission(
      'contact',
      { topic: 'boshqa', name: 'A', email: uniqueEmail('store'), message: 'x', consent: false },
      { locale: 'uz', path: '/aloqa' },
    )
    expect(result).toEqual({ ok: false, reason: 'consent' })
  })
})

describe('existing guards still hold', () => {
  it('a filled honeypot is a silent success and stores nothing', async () => {
    fromPage('/aloqa')
    const email = uniqueEmail('bot')
    const state = await sendContactMessage(idle, form({ topic: 'boshqa', name: 'Bot', email, message: 'spam', consent: 'on', website: 'http://spam' }))
    expect(state.status).toBe('success')
    expect(await one('contact-messages', email)).toHaveLength(0)
    const digest = await subscribeDigest({ status: 'idle', errors: {}, values: {} }, form({ email, website: 'x' }))
    expect(digest.status).toBe('success')
    expect(await one('digest-subscribers', email)).toHaveLength(0)
    expect(sent).toHaveLength(0)
  })

  it('invalid input is echoed back clamped, and nothing is stored', async () => {
    fromPage('/aloqa')
    const long = 'x'.repeat(10_000)
    const state = await sendContactMessage(idle, form({ topic: 'nope', name: long, email: 'not-an-email', message: long, consent: 'on' }))
    expect(state.status).toBe('error')
    expect(state.errors).toMatchObject({ topic: 'choose', email: 'email' })
    expect(state.values.name.length).toBe(160)
    expect(state.values.message.length).toBe(4000)
  })

  it('an address the form accepts but the CMS cannot store is an e-mail error, not a crash', async () => {
    fromPage('/dayjest')
    const state = await subscribeDigest({ status: 'idle', errors: {}, values: {} }, form({ email: 'a@b.c1' }))
    expect(state).toMatchObject({ status: 'error', errors: { email: 'email' } })
  })

  it('no Referer: stored as the Uzbek edition with no page', async () => {
    request.headers = new Headers({ host: 'localhost:3000', 'cf-connecting-ip': '198.51.100.250' })
    const email = uniqueEmail('noref')
    await sendContactMessage(idle, form({ topic: 'boshqa', name: 'A', email, message: 'x', consent: 'on' }))
    const [doc] = await one('contact-messages', email)
    expect(doc.source).toMatchObject({ path: null, locale: 'uz' })
  })
})
