import { createLocalReq } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { testPayload } from '../helpers/payload'
import { account, actions, forDoc, login, rest, tag } from './helpers'

/**
 * J5 (CMS-SPEC §9.1, §13): audit rows about personal-data documents carry
 * field paths, never values, no title, and no visitor IP.
 */
type User = Awaited<ReturnType<typeof account>>
let admin: User
let editor: User

const consent = () => ({ given: true, textVersion: 'contact-2026-10-v1', locale: 'uz' as const, at: new Date().toISOString() })

afterAll(async () => (await testPayload()).destroy())

beforeAll(async () => {
  admin = await account('admin', 'pd-admin')
  editor = await account('editor', 'pd-editor')
})

describe('J5: personal-data rows have paths but no values', () => {
  it('a public submission, a staff update, a read and a delete', async () => {
    const payload = await testPayload()
    const name = `Shaxsiy ${tag('Ism')}`
    const email = `${tag('pd')}@example.com`
    const message = `Maxfiy xabar ${tag('matn')} +998901234567`
    const visitor = await createLocalReq({}, payload)
    ;(visitor as { headers: Headers }).headers = new Headers({ 'cf-connecting-ip': '203.0.113.99', 'user-agent': 'visitor-browser' })
    const doc = await payload.create({
      collection: 'contact-messages',
      data: { topic: 'boshqa', name, email, message, consent: consent() } as never,
      req: visitor,
      overrideAccess: true,
    })
    await payload.update({ collection: 'contact-messages', id: doc.id, data: { status: 'in_progress', internalNotes: `Eslatma ${name}` }, user: admin, overrideAccess: false })
    const { cookie } = await login(admin.email, { 'cf-connecting-ip': '198.51.100.5' })
    const read = await rest('GET', `/api/contact-messages/${doc.id}`, { cookie, headers: { 'cf-connecting-ip': '198.51.100.5' } })
    expect(read.status).toBe(200)
    // Internal reads (overrideAccess) and lists are not recorded.
    await payload.findByID({ collection: 'contact-messages', id: doc.id, overrideAccess: true })
    await payload.find({ collection: 'contact-messages', user: admin, overrideAccess: false })

    const list = await forDoc('contact-messages', doc.id)
    expect(actions(list)).toEqual(['doc.create', 'doc.update', 'pd.read'])
    const [created, updated, viewed] = list
    expect(created).toMatchObject({ actorRole: 'public', actorId: null, docTitle: null, before: null, after: null, ip: null, userAgent: null })
    expect(created.changedPaths).toEqual(expect.arrayContaining(['topic', 'name', 'email', 'message', 'consent.given']))
    expect(updated).toMatchObject({ actorId: admin.id, actorRole: 'admin', docTitle: null, before: null, after: null })
    expect(updated.changedPaths).toEqual(expect.arrayContaining(['status', 'internalNotes']))
    expect(viewed).toMatchObject({ actorId: admin.id, docTitle: null, ip: '198.51.100.5' })
    const text = JSON.stringify(list)
    for (const value of [name, email, message, '+998901234567', 'Eslatma', '203.0.113.99']) expect(text).not.toContain(value)
  })

  it('a deletion names the document but not the person', async () => {
    const payload = await testPayload()
    const email = `${tag('digest')}@example.com`
    const doc = await payload.create({ collection: 'digest-subscribers', data: { email, consent: consent() } as never, overrideAccess: true })
    await payload.delete({ collection: 'digest-subscribers', id: doc.id, user: admin, overrideAccess: false })
    const list = await forDoc('digest-subscribers', doc.id)
    expect(actions(list)).toEqual(['doc.create', 'doc.delete'])
    expect(list[1]).toMatchObject({ actorId: admin.id, docTitle: null })
    expect(JSON.stringify(list)).not.toContain(email)
  })

  it('the requests register is personal data too (requester name and contact)', async () => {
    const payload = await testPayload()
    const requester = `Murojaatchi ${tag('R')}`
    const doc = await payload.create({
      collection: 'requests',
      data: { kind: 'refutation', requesterName: requester, requesterContact: '+998 90 000 00 00', receivedAt: new Date().toISOString(), channel: 'email', summary: `${requester} raddiya soʻradi` } as never,
      user: editor,
      overrideAccess: false,
    })
    const [row] = await forDoc('requests', doc.id)
    expect(row).toMatchObject({ action: 'doc.create', actorRole: 'editor', docTitle: null, before: null, after: null })
    expect(row.changedPaths).toEqual(expect.arrayContaining(['requesterName', 'requesterContact', 'summary']))
    expect(JSON.stringify(row)).not.toContain(requester)
  })
})
