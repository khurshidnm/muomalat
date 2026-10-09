import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { deliverAlerts } from '@/payload/audit/alerts'
import { testPayload } from '../helpers/payload'
import { account, actions, drainAlerts, forDoc, headId, login, mockTransport, PASSWORD, rest, rows, tag } from './helpers'

/**
 * Accounts and authentication (CMS-SPEC §9.2 "Auth", "Users", §9.4; PHASE0
 * §1.4): J1 for those actions, and J6.
 */
type User = Awaited<ReturnType<typeof account>>
let admin: User

const ip = () => `192.0.2.${Math.floor(Math.random() * 250) + 1}`

afterAll(async () => (await testPayload()).destroy())

describe('J6: failed logins', () => {
  it('writes auth.login_failed at once with the attempted email and IP; the fifth also auth.locked; the locked answer is generic', async () => {
    const payload = await testPayload()
    const victim = await account('reporter', 'locked')
    const from = await headId()
    const address = ip()
    const headers = { 'cf-connecting-ip': address, 'cf-ipcountry': 'UZ', 'user-agent': 'audit-test' }
    const answers = []
    for (let i = 1; i <= 5; i++) {
      answers.push(await rest('POST', '/api/users/login', { body: { email: victim.email, password: `wrong-${i}` }, headers }))
      // Recorded at once, not by a polling job.
      const failed = await rows({ and: [{ id: { greater_than: from } }, { action: { equals: 'auth.login_failed' } }, { docId: { equals: String(victim.id) } }] })
      expect(failed).toHaveLength(i)
    }
    // The correct password on a locked account: LockedAuth inside Payload, the ordinary answer outside.
    const locked = await rest('POST', '/api/users/login', { body: { email: victim.email, password: PASSWORD }, headers })
    expect(answers.every((a) => a.status === 401)).toBe(true)
    expect(locked.status).toBe(401)
    expect(locked.json).toEqual(answers[0].json)
    expect(JSON.stringify(locked.json)).not.toMatch(/lock|blok/i)

    const list = (await forDoc('users', victim.id)).filter((r) => r.id > from)
    expect(actions(list)).toEqual([
      'auth.login_failed',
      'auth.login_failed',
      'auth.login_failed',
      'auth.login_failed',
      'auth.login_failed',
      'auth.locked',
      'auth.login_failed',
    ])
    for (const row of list) {
      expect(row).toMatchObject({ actorId: null, actorEmail: victim.email, actorRole: 'anonymous', ip: address, country: 'UZ', userAgent: 'audit-test', collection: 'users' })
    }
    expect(list[5].after).toMatchObject({ loginAttempts: 5 })
    expect(list[6].summary).toContain('Bloklangan')
  })

  it('an unknown email is recorded the same way, without a document', async () => {
    const email = `${tag('nobody')}@test.muomalat.local`
    const from = await headId()
    const res = await rest('POST', '/api/users/login', { body: { email, password: 'whatever-password' }, headers: { 'cf-connecting-ip': ip() } })
    expect(res.status).toBe(401)
    const [row] = await rows({ and: [{ id: { greater_than: from } }, { actorEmail: { equals: email } }] })
    expect(row).toMatchObject({ action: 'auth.login_failed', docId: null, docTitle: null })
  })

  it('five failed logins in 10 minutes raise one alert', async () => {
    const payload = await testPayload()
    const mock = mockTransport()
    const cursorPrefix = `test:${tag('failed')}`
    await deliverAlerts(payload, { transports: [mock], cursorPrefix })
    const email = `${tag('spray')}@test.muomalat.local`
    // The rule alerts at 5, 10, 20, 40… failures in the window; earlier tests (and earlier runs on
    // this database) have already used some, so send enough to reach the next threshold.
    const { totalDocs: before } = await payload.count({
      collection: 'audit-log',
      where: { and: [{ action: { equals: 'auth.login_failed' } }, { at: { greater_than: new Date(Date.now() - 9 * 60 * 1000).toISOString() } }] },
      overrideAccess: true,
    })
    let threshold = 5
    while (threshold <= before) threshold *= 2
    for (let i = before; i < threshold; i++) {
      await rest('POST', '/api/users/login', { body: { email, password: 'x-password-wrong' }, headers: { 'cf-connecting-ip': ip() } })
    }
    await drainAlerts(payload, { transports: [mock], cursorPrefix })
    const alerts = mock.sent.filter((a) => a.kind === 'failed_logins')
    expect(alerts.length).toBeGreaterThanOrEqual(1)
    expect(alerts[0].text).toMatch(/Soʻnggi 10 daqiqada \d+ ta muvaffaqiyatsiz kirish urinishi/)
  })
})

describe('J1: accounts and sessions', () => {
  beforeAll(async () => {
    admin = await account('admin', 'auth-admin')
  })

  it('login records the country; a new country is on the row; logout is recorded', async () => {
    const payload = await testPayload()
    const user = await account('editor', 'traveller')
    const first = await login(user.email, { 'cf-connecting-ip': ip(), 'cf-ipcountry': 'UZ' })
    expect(first.status).toBe(200)
    await login(user.email, { 'cf-connecting-ip': ip(), 'cf-ipcountry': 'UZ' })
    const abroad = await login(user.email, { 'cf-connecting-ip': ip(), 'cf-ipcountry': 'TR' })
    const out = await rest('POST', '/api/users/logout', { cookie: abroad.cookie, headers: { 'cf-connecting-ip': ip() } })
    expect(out.status).toBeLessThan(500)

    const list = await forDoc('users', user.id)
    const logins = list.filter((r) => r.action === 'auth.login')
    expect(logins).toHaveLength(3)
    expect(logins.map((r) => r.country)).toEqual(['UZ', 'UZ', 'TR'])
    expect(logins[0]).toMatchObject({ actorId: user.id, actorRole: 'editor', before: { knownCountries: [] }, after: { knownCountries: ['UZ'] } })
    expect(logins[1].after).toBeNull()
    expect(logins[2]).toMatchObject({ before: { knownCountries: ['UZ'] }, after: { knownCountries: ['UZ', 'TR'] }, summary: 'Yangi mamlakatdan kirish: TR' })
    expect(actions(list.filter((r) => r.action === 'auth.logout'))).toEqual(['auth.logout'])

    const stored = (await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true, showHiddenFields: true })) as {
      lastLoginCountry?: string
      knownCountries?: string[]
      lastLoginAt?: string
    }
    expect(stored).toMatchObject({ lastLoginCountry: 'TR', knownCountries: ['UZ', 'TR'] })
    expect(stored.lastLoginAt).toBeTruthy()
    // The login bookkeeping is not a user edit.
    expect(list.filter((r) => r.action === 'user.update')).toHaveLength(0)
  })

  it('user create, update, role change, disable, enable, password change', async () => {
    const payload = await testPayload()
    const email = `${tag('new')}@test.muomalat.local`
    const user = await payload.create({
      collection: 'users',
      data: { email, name: 'Yangi xodim', role: 'reporter', password: PASSWORD },
      user: admin,
      overrideAccess: false,
    })
    await payload.update({ collection: 'users', id: user.id, data: { name: 'Yangi xodim 2' }, user: admin, overrideAccess: false })
    await payload.update({ collection: 'users', id: user.id, data: { role: 'editor' }, user: admin, overrideAccess: false })
    await payload.update({ collection: 'users', id: user.id, data: { active: false }, user: admin, overrideAccess: false })
    await payload.update({ collection: 'users', id: user.id, data: { active: true }, user: admin, overrideAccess: false })
    const self = { ...user, role: 'editor' as const, active: true }
    await payload.update({ collection: 'users', id: user.id, data: { password: `${PASSWORD}-new-${tag('p')}` }, user: self, overrideAccess: false })

    const list = await forDoc('users', user.id)
    expect(actions(list)).toEqual(['user.create', 'user.update', 'user.role_change', 'user.disable', 'user.enable', 'auth.password_changed'])
    for (const row of list.slice(0, 5)) expect(row).toMatchObject({ actorId: admin.id, actorRole: 'admin', docTitle: expect.stringContaining('Yangi xodim') })
    expect(list[0].after).toEqual({ role: 'reporter', active: true })
    expect(list[0].changedPaths).toEqual(expect.arrayContaining(['email', 'role']))
    expect(list[2]).toMatchObject({ summary: 'reporter → editor', before: { role: 'reporter' }, after: { role: 'editor' } })
    expect(list[1].changedPaths).toEqual(['name'])
    // Auth fields: paths, never values.
    expect(JSON.stringify(list)).not.toContain(PASSWORD)
    expect(JSON.stringify(list[0].after)).not.toContain(email)
    expect(list[5]).toMatchObject({ actorId: user.id })
  })

  it('password reset request, reset (which logs in), and unlock', async () => {
    const payload = await testPayload()
    const user = await account('reporter', 'resetter')
    const token = await payload.forgotPassword({ collection: 'users', data: { email: user.email }, disableEmail: true })
    const fresh = `${PASSWORD}-reset-${tag('p')}`
    await payload.resetPassword({ collection: 'users', data: { token: String(token), password: fresh }, overrideAccess: true })

    const { cookie } = await login(admin.email, { 'cf-connecting-ip': ip() })
    const sendEmail = vi.spyOn(payload.email, 'sendEmail').mockResolvedValue(undefined)
    const unlocked = await rest('POST', '/api/users/unlock', { body: { email: user.email }, cookie })
    sendEmail.mockRestore()
    expect(unlocked.status).toBe(200)

    const list = await forDoc('users', user.id)
    expect(actions(list)).toEqual(['user.create', 'auth.password_reset_requested', 'auth.password_changed', 'auth.login', 'auth.unlock'])
    expect(list[1]).toMatchObject({ actorEmail: user.email, actorRole: 'anonymous' })
    expect(list[4]).toMatchObject({ actorId: admin.id, actorRole: 'admin' })
  })
})
