import { afterAll, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import { captureMail, form, fromPage, uniqueEmail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { sendContactMessage } = await import('@/lib/actions/contact')
const { storySlugFromUrl } = await import('@/payload/hooks/personalData/contactMessages')

const idle = { status: 'idle' as const, errors: {}, values: {}, n: 0 }
const HOUR = 3_600_000

afterAll(async () => (await testPayload()).destroy())

describe('L6: requests deadlines', () => {
  it('a tuzatish contact message creates an error_report with dueAt = receivedAt + 3 days', async () => {
    const payload = await testPayload()
    captureMail(payload)
    fromPage('/aloqa')
    const email = uniqueEmail('tuzatish')
    const state = await sendContactMessage(
      idle,
      form({ topic: 'tuzatish', name: 'Dilshod', email, url: 'https://muomalat.uz/ru/yangiliklar/no-such-story', message: 'Raqam xato', consent: 'on' }),
    )
    expect(state.status).toBe('success')
    const [message] = (await payload.find({ collection: 'contact-messages', where: { email: { equals: email } }, overrideAccess: true })).docs
    const { docs } = await payload.find({
      collection: 'requests',
      where: { documents: { equals: `contact-messages:${message.id}` } },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    const item = docs[0]
    expect(item).toMatchObject({ kind: 'error_report', channel: 'site_form', status: 'new', requesterName: 'Dilshod', requesterContact: email })
    expect(item.summary).toMatch(/Raqam xato/)
    expect(new Date(item.dueAt as string).getTime() - new Date(item.receivedAt).getTime()).toBe(72 * HOUR)
    expect(new Date(item.receivedAt).getTime()).toBe(new Date(message.createdAt).getTime())
  })

  it('other topics open no request', async () => {
    const payload = await testPayload()
    captureMail(payload)
    fromPage('/aloqa')
    const email = uniqueEmail('tahririyat')
    await sendContactMessage(idle, form({ topic: 'tahririyat', name: 'A', email, message: 'Maslahat', consent: 'on' }))
    expect((await payload.find({ collection: 'requests', where: { requesterContact: { equals: email } }, overrideAccess: true })).docs).toHaveLength(0)
  })

  it('a message moved to tuzatish later gets its item once', async () => {
    const payload = await testPayload()
    const doc = await payload.create({
      collection: 'contact-messages',
      overrideAccess: true,
      data: { topic: 'boshqa', name: 'A', email: uniqueEmail('moved'), message: 'M', status: 'new', consent: { given: true, textVersion: 'v', locale: 'uz', at: new Date().toISOString() } },
    })
    await payload.update({ collection: 'contact-messages', id: doc.id, overrideAccess: true, data: { topic: 'tuzatish' } })
    await payload.update({ collection: 'contact-messages', id: doc.id, overrideAccess: true, data: { status: 'in_progress' } })
    const count = await payload.count({ collection: 'requests', where: { documents: { equals: `contact-messages:${doc.id}` } }, overrideAccess: true })
    expect(count.totalDocs).toBe(1)
  })

  it('a refutation request gets + 1 month', async () => {
    const payload = await testPayload()
    const receivedAt = '2026-10-31T10:00:00.000Z'
    const item = await payload.create({
      collection: 'requests',
      overrideAccess: true,
      data: { kind: 'refutation', summary: 'Raddiya', receivedAt, receivedAt_tz: 'Asia/Tashkent', status: 'new', requesterName: 'X', requesterContact: 'x@example.com' },
    })
    expect(item.dueAt).toBe('2026-12-01T10:00:00.000Z')
  })

  it('links to our stories are recognised in every edition', () => {
    expect(storySlugFromUrl('muomalat.uz/tahlil/islom-oynasi')).toBe('islom-oynasi')
    expect(storySlugFromUrl('https://www.muomalat.uz/kr/tahlil/islom-oynasi?utm=x')).toBe('islom-oynasi')
    expect(storySlugFromUrl('https://example.com/tahlil/islom-oynasi')).toBeNull()
    expect(storySlugFromUrl('https://muomalat.uz/lugat')).toBeNull()
  })
})
