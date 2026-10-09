import { createLocalReq, initTransaction, killTransaction } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { alertFor, deliverAlerts, telegramTransport, type AlertTransport } from '@/payload/audit/alerts'
import { recordAudit } from '@/payload/audit/writer'
import type { AuditLog } from '@/payload-types'
import { testPayload } from '../helpers/payload'
import { account, drainAlerts, login, mockTransport, tag } from './helpers'

/**
 * Alerts (CMS-SPEC §9.3): J4 with a mocked transport, the other rules, and
 * the delivery guarantees (after commit, once per transport, retried).
 */
type User = Awaited<ReturnType<typeof account>>
let admin: User
let eic: User
let editor: User

const ip = () => `198.18.0.${Math.floor(Math.random() * 250) + 1}`

afterAll(async () => (await testPayload()).destroy())

beforeAll(async () => {
  admin = await account('admin', 'alerts-admin')
  eic = await account('eic', 'alerts-eic')
  editor = await account('editor', 'alerts-editor')
})

describe('J4: alerts reach the alerts group', () => {
  it('a role change, a new user, a login from a new country and a withdrawal each send an alert', async () => {
    const payload = await testPayload()
    const mock = mockTransport()
    const cursorPrefix = `test:${tag('j4')}`
    await deliverAlerts(payload, { transports: [mock], cursorPrefix })

    // A new user, then a role change, by an admin.
    const user = await payload.create({
      collection: 'users',
      data: { email: `${tag('j4')}@test.muomalat.local`, name: 'J4 xodim', role: 'reporter', password: 'j4-password-0123456789' },
      user: admin,
      overrideAccess: false,
    })
    await payload.update({ collection: 'users', id: user.id, data: { role: 'commercial' }, user: admin, overrideAccess: false })
    // Logins: the first country is new, the same country again is not, another one is.
    await login(user.email, { 'cf-connecting-ip': ip(), 'cf-ipcountry': 'UZ' }, 'j4-password-0123456789')
    await login(user.email, { 'cf-connecting-ip': ip(), 'cf-ipcountry': 'UZ' }, 'j4-password-0123456789')
    await login(user.email, { 'cf-connecting-ip': ip(), 'cf-ipcountry': 'DE' }, 'j4-password-0123456789')
    // The withdrawal row as the workflow concern writes it with the withdraw transition.
    const req = await createLocalReq({ user: eic }, payload)
    await recordAudit(req, { action: 'article.withdraw', collection: 'articles', docId: 999001, docTitle: 'Olib tashlangan maqola', summary: 'published → withdrawn' })

    const { mock: sent } = await drainAlerts(payload, { transports: [mock], cursorPrefix })
    const kinds = sent.map((a) => a.kind)
    expect(kinds).toEqual(expect.arrayContaining(['user_create', 'role_change', 'new_country', 'withdraw']))
    // Other files log in at the same time: count this account's logins only.
    expect(sent.filter((a) => a.kind === 'new_country' && a.text.includes(user.email))).toHaveLength(2)
    const role = sent.find((a) => a.kind === 'role_change')!
    expect(role.text).toContain('Foydalanuvchi roli oʻzgartirildi')
    expect(role.text).toContain('reporter → commercial')
    expect(role.text).toContain(`Kim: ${admin.email} (admin)`)
    expect(sent.find((a) => a.kind === 'new_country' && a.text.includes('DE'))!.text).toContain('Yangi mamlakatdan kirish: DE')
    // Delivered once: a second run does not send these rows again (other files may add new ones).
    const again = (await drainAlerts(payload, { transports: [mock], cursorPrefix })).mock
    const first = new Set(sent.map((a) => a.rowId))
    expect(again.filter((a) => first.has(a.rowId))).toEqual([])
  })
})

describe('other alert rules', () => {
  it('unpublish, watched settings, one person changing more than 10 documents', async () => {
    const payload = await testPayload()
    const mock = mockTransport()
    const cursorPrefix = `test:${tag('rules')}`
    await deliverAlerts(payload, { transports: [mock], cursorPrefix })

    const tagDoc = await payload.create({ collection: 'tags', data: { label: tag('Mavzu') }, user: editor, overrideAccess: false, draft: true })
    await payload.update({ collection: 'tags', id: tagDoc.id, data: { _status: 'published' }, user: editor, overrideAccess: false })
    await payload.update({ collection: 'tags', id: tagDoc.id, data: { _status: 'draft' }, user: editor, overrideAccess: false })
    await payload.updateGlobal({ slug: 'site-settings', data: { labels: { advert: `Reklama ${tag('a')}` } }, user: eic, overrideAccess: false })
    const busy = await account('editor', 'busy')
    for (let i = 0; i < 11; i++) await payload.create({ collection: 'tags', data: { label: tag(`Koʻp ${i}`) }, user: busy, overrideAccess: false, draft: true })

    const { mock: sent } = await drainAlerts(payload, { transports: [mock], cursorPrefix })
    const kinds = sent.map((a) => a.kind)
    expect(kinds).toEqual(expect.arrayContaining(['unpublish', 'settings', 'mass_change']))
    // Other files' busy accounts may trip the rule too: this one's must trip it exactly once.
    const mine = sent.filter((a) => a.kind === 'mass_change' && a.text.includes(busy.email))
    expect(mine).toHaveLength(1)
    expect(sent.find((a) => a.kind === 'settings')!.text).toContain('labels')
    expect(mine[0].text).toContain('11 ta hujjat')
  })

  it('first publication outside office hours, and backup failures', async () => {
    const payload = await testPayload()
    const settings = async () => ({ officeHours: { start: '09:00', end: '19:00' } })
    const row = (action: string, at: string, extra: Partial<AuditLog> = {}) =>
      ({ id: 1, action, at, createdAt: at, updatedAt: at, collection: 'articles', docId: '1', actorId: null, ...extra }) as AuditLog
    // 01:00 and 12:00 Tashkent.
    expect(await alertFor(row('doc.publish_first', '2026-10-09T20:00:00.000Z'), { payload, settings })).toMatchObject({ kind: 'off_hours_publish' })
    expect(await alertFor(row('doc.publish_first', '2026-10-09T07:00:00.000Z'), { payload, settings })).toBeNull()
    expect(await alertFor(row('doc.publish_change', '2026-10-09T20:00:00.000Z'), { payload, settings })).toBeNull()
    expect(await alertFor(row('workflow.urgent_publish', '2026-10-09T07:00:00.000Z'), { payload, settings })).toMatchObject({ kind: 'urgent' })
    expect(await alertFor(row('ops.backup_fail', '2026-10-09T07:00:00.000Z', { collection: null }), { payload, settings })).toMatchObject({ kind: 'backup_fail' })
    expect(await alertFor(row('global.update', '2026-10-09T07:00:00.000Z', { collection: 'ad-slots', changedPaths: ['slots.0.linkUrl'] }), { payload, settings })).toMatchObject({
      kind: 'ad_link',
    })
    expect(await alertFor(row('global.update', '2026-10-09T07:00:00.000Z', { collection: 'site-settings', changedPaths: ['emergency.text'] }), { payload, settings })).toBeNull()
  })
})

describe('delivery', () => {
  it('a failing transport is retried from where it stopped; the others are not held up', async () => {
    const payload = await testPayload()
    const good = mockTransport('good')
    let failing = true
    const flaky: AlertTransport & { sent: number[] } = {
      name: 'flaky',
      sent: [],
      async send(alert) {
        if (failing) throw new Error('down')
        this.sent.push(alert.rowId)
      },
    }
    const cursorPrefix = `test:${tag('delivery')}`
    await deliverAlerts(payload, { transports: [good, flaky], cursorPrefix })
    const req = await createLocalReq({ user: admin }, payload)
    const row = await recordAudit(req, { action: 'ops.backup_fail', summary: tag('backup') })
    await drainAlerts(payload, { transports: [good, flaky], cursorPrefix })
    expect(good.sent.map((a) => a.rowId)).toContain(row.id)
    expect(flaky.sent).toEqual([])
    failing = false
    await drainAlerts(payload, { transports: [good, flaky], cursorPrefix })
    expect(flaky.sent).toContain(row.id)
    expect(good.sent.filter((a) => a.rowId === row.id)).toHaveLength(1)
  })

  it('a rolled-back change alerts nobody', async () => {
    const payload = await testPayload()
    const mock = mockTransport()
    const cursorPrefix = `test:${tag('rollback')}`
    await deliverAlerts(payload, { transports: [mock], cursorPrefix })
    // A user create whose transaction is rolled back after the audit row was written in it.
    const email = `${tag('rolled')}@test.muomalat.local`
    const req = await createLocalReq({ user: admin }, payload)
    await initTransaction(req)
    const name = tag('Bekor')
    const created = await payload.create({ collection: 'users', data: { email, name, role: 'reporter', password: 'rolled-back-password-0123' }, req, overrideAccess: false })
    expect(created.id).toBeTruthy()
    await killTransaction(req)
    const left = await payload.find({
      collection: 'audit-log',
      where: { and: [{ collection: { equals: 'users' } }, { docId: { equals: String(created.id) } }] },
      overrideAccess: true,
    })
    expect(left.docs).toEqual([])
    const { mock: sent } = await drainAlerts(payload, { transports: [mock], cursorPrefix })
    // Other files create users meanwhile; none of the alerts is about this one.
    expect(sent.filter((a) => a.text.includes(name) || a.text.includes(`users #${created.id}`))).toEqual([])
  })

  it('the Telegram transport posts plain text to the alerts chat and fails loudly', async () => {
    const payload = await testPayload()
    const calls: { url: string; body: Record<string, unknown> }[] = []
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) })
      return new Response(JSON.stringify(calls.length === 1 ? { ok: true } : { ok: false, description: 'Forbidden: bot was kicked' }), {
        status: calls.length === 1 ? 200 : 403,
      })
    })
    try {
      const t = telegramTransport('123:secret', '-1001234')
      const alert = { kind: 'locked' as const, rowId: 7, subject: 's', text: 'Muomalat CMS: Hisob vaqtincha bloklandi' }
      await t.send(alert, payload)
      expect(calls[0].url).toBe('https://api.telegram.org/bot123:secret/sendMessage')
      expect(calls[0].body).toMatchObject({ chat_id: '-1001234', text: alert.text, disable_web_page_preview: true })
      await expect(t.send(alert, payload)).rejects.toThrow(/bot was kicked/)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
