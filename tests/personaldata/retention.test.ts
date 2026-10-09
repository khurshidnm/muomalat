import { afterAll, describe, expect, it } from 'vitest'

import { purgeExpired, suppressionAddress } from '@/payload/personalData/retention'
import { sha256 } from '@/payload/personalData/tokens'
import { job } from '@/worker/jobs/retention'
import { testPayload } from '../helpers/payload'
import { backdate, captureLogs, staffUser, uniqueEmail } from './helpers'

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()
const consent = { given: true, textVersion: 'test-v1', locale: 'uz' as const, at: new Date().toISOString() }

afterAll(async () => (await testPayload()).destroy())

async function exists(collection: Parameters<Awaited<ReturnType<typeof testPayload>>['findByID']>[0]['collection'], id: number) {
  const payload = await testPayload()
  return Boolean(await payload.findByID({ collection, id, overrideAccess: true, disableErrors: true }))
}

describe('retainUntil follows §13.1', () => {
  it('is set from status, contract and decision on every change', async () => {
    const payload = await testPayload()
    const months = (iso: string | null | undefined) => Math.round((new Date(iso as string).getTime() - Date.now()) / (30.44 * DAY))

    const club = await payload.create({
      collection: 'club-applications',
      overrideAccess: true,
      data: { name: 'N', company: 'C', sector: 'savdo', size: '1-10', phone: '+998 90 000-00-00', status: 'new', consent },
    })
    expect(months(club.retainUntil)).toBe(24)
    const declined = await payload.update({ collection: 'club-applications', id: club.id, overrideAccess: true, data: { status: 'declined' } })
    expect(months(declined.retainUntil)).toBe(6)

    const ad = await payload.create({
      collection: 'advertising-requests',
      overrideAccess: true,
      data: { name: 'N', company: 'C', email: uniqueEmail('ad'), phone: '+998 90 000-00-00', format: 'banner', message: 'M', status: 'new', consent },
    })
    expect(months(ad.retainUntil)).toBe(12)
    const won = await payload.update({ collection: 'advertising-requests', id: ad.id, overrideAccess: true, data: { contract: true } })
    expect(months(won.retainUntil)).toBe(36)

    const contact = await payload.create({
      collection: 'contact-messages',
      overrideAccess: true,
      data: { topic: 'boshqa', name: 'N', email: uniqueEmail('c'), message: 'M', status: 'new', consent },
    })
    expect(months(contact.retainUntil)).toBe(24)

    // A client cannot set it: system field (field access drops the value, the hook writes its own).
    const admin = await staffUser('admin')
    const tried = await payload.update({
      collection: 'club-applications',
      id: club.id,
      overrideAccess: false,
      user: admin,
      data: { retainUntil: '2099-01-01T00:00:00.000Z', internalNotes: 'x' },
    })
    expect(months(tried.retainUntil)).toBe(6)

    // Requests: three years after the decision; undecided items have none.
    const request = await payload.create({
      collection: 'requests',
      overrideAccess: true,
      data: { kind: 'other', summary: 'S', receivedAt: new Date().toISOString(), receivedAt_tz: 'Asia/Tashkent', status: 'new' },
    })
    expect(request.retainUntil).toBeNull()
  })
})

describe('L4: the retention job', () => {
  it('deletes pending subscribers after 7 days and unsubscribed ones after 30, keeping the suppression hash; writes pd.retention_purge', async () => {
    const payload = await testPayload()
    const mk = async (email: string, status: 'pending' | 'confirmed' | 'unsubscribed', extra: Record<string, unknown> = {}) =>
      payload.create({ collection: 'digest-subscribers', overrideAccess: true, data: { email, status, consent, ...extra } })

    const pendingOld = await mk(uniqueEmail('p-old'), 'pending')
    const pendingNew = await mk(uniqueEmail('p-new'), 'pending')
    const unsubEmail = uniqueEmail('u-old')
    const unsubOld = await mk(unsubEmail, 'unsubscribed', { unsubscribedAt: ago(31), placement: 'home', source: { path: '/', locale: 'uz' } })
    const unsubNew = await mk(uniqueEmail('u-new'), 'unsubscribed', { unsubscribedAt: ago(29) })
    const confirmed = await mk(uniqueEmail('c'), 'confirmed', { confirmedAt: ago(400) })
    // The hooks set the deadlines; age the pending one past its 7 days in the database.
    await backdate(payload, 'digest-subscribers', pendingOld.id, { retainUntil: ago(1), updatedAt: ago(8) })
    expect(new Date(pendingNew.retainUntil as string).getTime()).toBeGreaterThan(Date.now() + 6 * DAY)
    expect(new Date(unsubOld.retainUntil as string).getTime()).toBeLessThan(Date.now())

    const before = await payload.count({ collection: 'audit-log', where: { action: { equals: 'pd.retention_purge' } }, overrideAccess: true })
    const logs = captureLogs(payload)
    await job.run(payload)
    logs.restore()

    expect(await exists('digest-subscribers', pendingOld.id)).toBe(false)
    expect(await exists('digest-subscribers', pendingNew.id)).toBe(true)
    expect(await exists('digest-subscribers', unsubNew.id)).toBe(true)
    expect(await exists('digest-subscribers', confirmed.id)).toBe(true)

    // The unsubscribed address is gone; only its SHA-256 remains, in the same row.
    const hashed = await payload.findByID({ collection: 'digest-subscribers', id: unsubOld.id, overrideAccess: true, showHiddenFields: true })
    expect(hashed).toMatchObject({
      email: `${sha256(unsubEmail)}@suppressed.invalid`,
      status: 'unsubscribed',
      placement: null,
      confirmTokenHash: null,
      source: { path: null, locale: null },
      retainUntil: null,
    })
    expect(hashed.email).toBe(suppressionAddress(unsubEmail))

    const after = await payload.find({
      collection: 'audit-log',
      where: { action: { equals: 'pd.retention_purge' } },
      sort: '-id',
      limit: 1,
      overrideAccess: true,
    })
    expect(after.totalDocs).toBe(before.totalDocs + 1)
    const row = after.docs[0]
    expect(row.summary).toMatch(/digest-subscribers: 1 oʻchirildi, 1 anonimlashtirildi/)
    expect(row.actorEmail).toBe('system:retention')
    expect(JSON.stringify(row)).not.toMatch(/@example\.com/)
    expect(logs.lines.join('\n')).not.toMatch(/@example\.com/)
    expect(logs.lines.join('\n')).toMatch(/retention: /)

    // Idempotent: a second run finds nothing and writes no row.
    const report = await purgeExpired(payload)
    for (const counts of Object.values(report)) expect(counts).toEqual({ deleted: 0, anonymised: 0, kept: expect.any(Number) })
    expect(await payload.count({ collection: 'audit-log', where: { action: { equals: 'pd.retention_purge' } }, overrideAccess: true })).toMatchObject({
      totalDocs: before.totalDocs + 1,
    })
  })

  it('deletes expired club, contact and advertising records; keeps a correction while its request is kept; strips requesters after 3 years', async () => {
    const payload = await testPayload()
    const club = await payload.create({
      collection: 'club-applications',
      overrideAccess: true,
      data: { name: 'N', company: 'C', sector: 'savdo', size: '1-10', phone: '+998 90 000-00-00', status: 'declined', consent },
    })
    const clubFresh = await payload.create({
      collection: 'club-applications',
      overrideAccess: true,
      data: { name: 'N', company: 'C', sector: 'savdo', size: '1-10', phone: '+998 90 000-00-01', status: 'new', consent },
    })
    const ad = await payload.create({
      collection: 'advertising-requests',
      overrideAccess: true,
      data: { name: 'N', company: 'C', email: uniqueEmail('ad'), phone: '+998 90 000-00-00', format: 'banner', message: 'M', status: 'lost', consent },
    })
    const plain = await payload.create({
      collection: 'contact-messages',
      overrideAccess: true,
      data: { topic: 'boshqa', name: 'N', email: uniqueEmail('m'), message: 'M', status: 'closed', consent },
    })
    const correction = await payload.create({
      collection: 'contact-messages',
      overrideAccess: true,
      data: { topic: 'tuzatish', name: 'N', email: uniqueEmail('t'), message: 'M', status: 'closed', consent },
    })
    for (const [collection, id] of [
      ['club-applications', club.id],
      ['advertising-requests', ad.id],
      ['contact-messages', plain.id],
      ['contact-messages', correction.id],
    ] as const) {
      await backdate(payload, collection, id, { retainUntil: ago(1) })
    }

    await purgeExpired(payload)
    expect(await exists('club-applications', club.id)).toBe(false)
    expect(await exists('club-applications', clubFresh.id)).toBe(true)
    expect(await exists('advertising-requests', ad.id)).toBe(false)
    expect(await exists('contact-messages', plain.id)).toBe(false)
    // Its requests item (opened by the hook) is undecided, so the message stays.
    expect(await exists('contact-messages', correction.id)).toBe(true)

    // Decided more than 3 years ago: the request loses the requester, then the message can go.
    const { docs } = await payload.find({
      collection: 'requests',
      where: { documents: { equals: `contact-messages:${correction.id}` } },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    await backdate(payload, 'requests', docs[0].id, { decidedAt: ago(3 * 366), retainUntil: ago(1) })
    await purgeExpired(payload)
    const request = await payload.findByID({ collection: 'requests', id: docs[0].id, overrideAccess: true })
    expect(request).toMatchObject({ requesterName: null, requesterContact: null, kind: 'error_report' })
    expect(request.summary).toBeTruthy()
    expect(await exists('contact-messages', correction.id)).toBe(false)
  })

  it('anonymises a staff account one year after offboarding, keeping the name', async () => {
    const payload = await testPayload()
    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: uniqueEmail('leaver'),
        name: 'Former Reporter',
        role: 'reporter',
        active: false,
        password: 'test-password-leaver-0123456789',
        telegramUserId: '12345',
      },
    })
    await backdate(payload, 'users', user.id, { offboardedAt: ago(400) })
    const report = await purgeExpired(payload)
    expect(report.users.anonymised).toBeGreaterThanOrEqual(1)
    const after = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true })
    expect(after).toMatchObject({ name: 'Former Reporter', email: `user-${user.id}@anonymised.invalid`, telegramUserId: null })
  })
})
