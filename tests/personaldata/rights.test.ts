import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import { captureMail, form, fromPage, staffUser, tokenIn, uniqueEmail, type SentMail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { requestDataRights, confirmRightsRequest } = await import('@/lib/actions/privacy')
const { personalData } = await import('@/payload/personalData')
const { suppressionAddress } = await import('@/payload/personalData/retention')
const { readRightsToken, rightsToken } = await import('@/payload/personalData/tokens')
const { personalDataEndpoints } = await import('@/payload/personalData/endpoints')
const { createLocalReq } = await import('payload')

const idle = { status: 'idle' as const, errors: {}, values: {}, n: 0 }
const tokenIdle = { status: 'idle' as const, n: 0 }
const consent = { given: true, textVersion: 'test-v1', locale: 'uz' as const, at: new Date().toISOString() }

let sent: SentMail[]
beforeAll(async () => {
  sent = captureMail(await testPayload()).sent
})
beforeEach(() => {
  sent.length = 0
})
afterAll(async () => (await testPayload()).destroy())

/** One record per collection for an address, mixed case as people type it. */
async function seed(email: string) {
  const payload = await testPayload()
  const Typed = email.replace(/^./, (c) => c.toUpperCase())
  const club = await payload.create({
    collection: 'club-applications',
    overrideAccess: true,
    data: { name: 'N', company: 'C', sector: 'savdo', size: '1-10', phone: '+998 90 000-00-00', email: Typed, status: 'new', consent },
  })
  const digest = await payload.create({ collection: 'digest-subscribers', overrideAccess: true, data: { email, status: 'confirmed', consent } })
  const contact = await payload.create({
    collection: 'contact-messages',
    overrideAccess: true,
    data: { topic: 'boshqa', name: 'N', email: Typed, message: 'M', status: 'new', consent },
  })
  const ad = await payload.create({
    collection: 'advertising-requests',
    overrideAccess: true,
    data: { name: 'N', company: 'C', email, phone: '+998 90 000-00-00', format: 'banner', message: 'M', status: 'new', consent },
  })
  const contract = await payload.create({
    collection: 'advertising-requests',
    overrideAccess: true,
    data: { name: 'N', company: 'C', email, phone: '+998 90 000-00-00', format: 'banner', message: 'M', status: 'won', contract: true, consent },
  })
  // A look-alike address that must not match.
  await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { topic: 'boshqa', name: 'N', email: `x${email}`, message: 'M', status: 'new', consent } })
  return { club, digest, contact, ad, contract }
}

describe('L5: admin export and deletion by e-mail cover all four collections and are audited', () => {
  it('finds, exports and erases; non-admins are refused', async () => {
    const payload = await testPayload()
    const email = uniqueEmail('subject')
    const seeded = await seed(email)
    const store = personalData()

    const hits = await store.findPersonalData(email.toUpperCase())
    expect(hits.map((h) => `${h.collection}:${h.id}`).sort()).toEqual(
      [
        `club-applications:${seeded.club.id}`,
        `digest-subscribers:${seeded.digest.id}`,
        `contact-messages:${seeded.contact.id}`,
        `advertising-requests:${seeded.ad.id}`,
        `advertising-requests:${seeded.contract.id}`,
      ].sort(),
    )

    for (const role of ['editor', 'eic', 'commercial'] as const) {
      const user = await staffUser(role)
      await expect(store.exportPersonalData(email, { actor: user })).rejects.toThrow()
      await expect(store.erasePersonalData(email, { actor: user })).rejects.toThrow()
    }

    const admin = await staffUser('admin')
    const exported = await store.exportPersonalData(email, { actor: admin, requestId: 7 })
    expect(exported.records['club-applications']).toHaveLength(1)
    expect(exported.records['digest-subscribers']).toHaveLength(1)
    expect(exported.records['contact-messages']).toHaveLength(1)
    expect(exported.records['advertising-requests']).toHaveLength(2)

    const report = await store.erasePersonalData(email, { actor: admin })
    expect(report).toEqual({ deleted: 3, suppressed: 1, keptUnderContract: 1 })
    expect(await store.findPersonalData(email)).toEqual([
      { collection: 'digest-subscribers', id: seeded.digest.id },
      { collection: 'advertising-requests', id: seeded.contract.id },
    ])
    const digest = await payload.findByID({ collection: 'digest-subscribers', id: seeded.digest.id, overrideAccess: true })
    expect(digest).toMatchObject({ email: suppressionAddress(email), status: 'unsubscribed' })

    const rows = await payload.find({
      collection: 'audit-log',
      where: { action: { in: ['pd.export', 'pd.delete'] } },
      sort: '-id',
      limit: 2,
      overrideAccess: true,
    })
    expect(rows.docs.map((r) => r.action)).toEqual(['pd.delete', 'pd.export'])
    for (const row of rows.docs) {
      expect(row).toMatchObject({ actorId: admin.id, actorRole: 'admin', docTitle: null })
      expect(row.summary).toMatch(/club-applications 1, digest-subscribers 1, contact-messages 1, advertising-requests 2/)
      expect(JSON.stringify(row)).not.toContain(email)
    }
    expect(rows.docs[1]).toMatchObject({ collection: 'requests', docId: '7' })
  })
})

describe('L5: the admin endpoints', () => {
  const call = async (path: string, user: unknown, body: unknown) => {
    const payload = await testPayload()
    const req = await createLocalReq({ user: user as never }, payload)
    Object.assign(req, { json: async () => body })
    const endpoint = personalDataEndpoints.find((e) => e.path === path)!
    const res = (await endpoint.handler(req)) as Response
    return { status: res.status, json: await res.json(), cache: res.headers.get('cache-control') }
  }

  it('export and erase answer admins only, and erase removes the records', async () => {
    const email = uniqueEmail('endpoint')
    await seed(email)
    const editor = await staffUser('editor')
    expect((await call('/personal-data/export', editor, { email })).status).toBe(403)
    expect((await call('/personal-data/erase', null, { email })).status).toBe(403)
    const admin = await staffUser('admin')
    expect((await call('/personal-data/export', admin, { email: 'nope' })).status).toBe(400)
    const exported = await call('/personal-data/export', admin, { email, requestId: 3 })
    expect(exported).toMatchObject({ status: 200, cache: 'no-store' })
    expect(exported.json.records['contact-messages']).toHaveLength(1)
    const erased = await call('/personal-data/erase', admin, { email })
    expect(erased.json).toEqual({ deleted: 3, suppressed: 1, keptUnderContract: 1 })
  })
})

describe('§13.3: rights request through the site, verified by an e-mailed link', () => {
  it('stores nothing until the link is used, then registers one requests item', async () => {
    const payload = await testPayload()
    fromPage('/en/maxfiylik')
    const email = uniqueEmail('rights')
    const before = await payload.count({ collection: 'requests', overrideAccess: true })

    const bad = await requestDataRights(idle, form({ email, kind: 'everything' }))
    expect(bad).toMatchObject({ status: 'error', errors: { kind: 'choose' } })
    const state = await requestDataRights(idle, form({ email, kind: 'delete' }))
    expect(state).toEqual({ status: 'success', errors: {}, values: {}, n: 1 })
    expect((await payload.count({ collection: 'requests', overrideAccess: true })).totalDocs).toBe(before.totalDocs)

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(email)
    expect(sent[0].subject).toMatch(/Confirm your request/)
    const token = tokenIn(sent[0])
    // The address is encrypted in the link, not merely encoded.
    expect(Buffer.from(token, 'base64url').toString('latin1')).not.toContain(email)
    expect(sent[0].text).not.toContain(email)

    const peek = personalData().peekRightsRequest(token)
    expect(peek).toMatchObject({ kind: 'delete', locale: 'en' })
    expect(peek?.maskedEmail).not.toBe(email)

    expect(await confirmRightsRequest(tokenIdle, form({ t: token.slice(0, -2) + 'AA' }))).toMatchObject({ status: 'invalid' })
    expect(await confirmRightsRequest(tokenIdle, form({ t: token }))).toMatchObject({ status: 'done' })
    expect(await confirmRightsRequest(tokenIdle, form({ t: token }))).toMatchObject({ status: 'already' })

    const { docs } = await payload.find({ collection: 'requests', where: { requesterContact: { equals: email } }, overrideAccess: true })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ kind: 'personal_data', channel: 'site_form', status: 'new' })
    // §13.3: ten working days, as 14 calendar days from receipt.
    expect(new Date(String(docs[0].dueAt)).getTime() - new Date(String(docs[0].receivedAt)).getTime()).toBe(14 * 86_400_000)
    expect(docs[0].summary).toMatch(/Shaxsga doir maʼlumotlar boʻyicha soʻrov: oʻchirish/)
    // The requester is told it was registered.
    expect(sent.at(-1)?.subject).toMatch(/registered/)
  })

  it('a link expires after 48 hours and cannot be forged', async () => {
    const old = rightsToken({ email: 'a@example.com', kind: 'access', locale: 'uz' }, Date.now() - 49 * 3_600_000)
    expect(readRightsToken(old)).toBe('expired')
    expect(await confirmRightsRequest(tokenIdle, form({ t: old }))).toMatchObject({ status: 'invalid' })
    const forged = Buffer.from(JSON.stringify({ e: 'a@example.com', k: 'delete', l: 'uz', t: Date.now() / 1000, n: 'x' })).toString('base64url')
    expect(readRightsToken(forged)).toBeNull()
  })
})
