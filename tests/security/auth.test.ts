import { randomBytes } from 'node:crypto'

import { afterAll, afterEach, describe, expect, it } from 'vitest'

import { MAX_SESSION_AGE_MS } from '@/payload/collections/Users'
import { LOGIN_LIMIT } from '@/payload/hooks/security/auth'
import { PASSWORD_MESSAGES, rangeKey, setBreachedRangeLookup } from '@/payload/security/password'
import { testPayload } from '../helpers/payload'
import { account, login, rest, staffPassword } from './rest'

/**
 * Login, sessions and passwords (CMS-SPEC §12.2, §12.3; tests K1, K2, K3,
 * K9, K10, K15, the login part of K18, A7, A9) and the logout fix for PHASE0
 * risk 23.
 */
afterAll(async () => (await testPayload()).destroy())
afterEach(() => setBreachedRangeLookup(undefined))

/**
 * A client address no other test uses: the limiter counts per address for
 * 15 minutes, so two tests drawing the same address (random addresses did,
 * now and then) share a bucket and one gets an early 429. IPv6 documentation
 * range, a block of its own for this file, numbered within the run.
 */
let ipCounter = 0
const ip = () => `2001:db8:a11::${(++ipCounter).toString(16)}`
const unknownEmail = () => `nobody-${randomBytes(4).toString('hex')}@test.muomalat.local`

async function reporterAccount(tag: string) {
  const payload = await testPayload()
  const user = await account('reporter', tag)
  // Reruns against the same database start from a clean account.
  await payload.update({ collection: 'users', id: user.id, data: { active: true, password: staffPassword(tag) }, overrideAccess: true })
  await payload.db.updateOne({ collection: 'users', id: user.id, data: { loginAttempts: 0, lockUntil: null }, returning: false })
  const row = async () =>
    (await payload.db.findOne({ collection: 'users', where: { id: { equals: user.id } } })) as {
      loginAttempts?: number
      lockUntil?: string | null
      sessions?: { id: string; createdAt: string; expiresAt: string }[]
    }
  return { user, email: user.email, password: staffPassword(tag), row }
}

describe('K1: the session cookie', () => {
  it('is Secure, HttpOnly, SameSite=Strict and host-only', async () => {
    const { email, password } = await reporterAccount('cookie-flags')
    const r = await rest('POST', '/api/users/login', { body: { email, password } })
    const cookie = r.setCookie.find((c) => c.startsWith('muomalat-token='))!
    expect(cookie).toMatch(/;\s*Secure/i)
    expect(cookie).toMatch(/;\s*HttpOnly/i)
    expect(cookie).toMatch(/;\s*SameSite=Strict/i)
    expect(cookie).not.toMatch(/;\s*Domain=/i)
  })
})

describe('K2: CSRF allow-list', () => {
  it('a cross-origin POST with a valid cookie is not authenticated and creates nothing', async () => {
    const payload = await testPayload()
    const editor = await account('editor', 'csrf-editor')
    const cookie = await login(editor.email, staffPassword('csrf-editor'))
    const title = `CSRF ${randomBytes(3).toString('hex')}`
    const r = await rest('POST', '/api/articles?draft=true', { cookie, origin: 'https://evil.example', body: { title } })
    expect(r.status).toBe(403)
    const { totalDocs } = await payload.count({ collection: 'articles', where: { title: { equals: title } }, overrideAccess: true })
    expect(totalDocs).toBe(0)
  })
})

describe('K3: closed endpoints', () => {
  it('GraphQL and its playground are not served', async () => {
    expect((await rest('POST', '/api/graphql', { body: { query: '{ __typename }' } })).status).toBe(404)
    expect((await rest('GET', '/api/graphql-playground')).status).toBe(404)
  })
})

describe('K9, A9: lockout and unlock', () => {
  it('locks after 5 wrong passwords; the right one is refused; only an admin unlocks', async () => {
    const { email, password, row } = await reporterAccount('lockout')
    const from = { 'cf-connecting-ip': ip() }
    for (let i = 0; i < 5; i++) {
      const r = await rest('POST', '/api/users/login', { body: { email, password: 'wrong-password-123456' }, headers: from })
      expect(r.status).toBe(401)
    }
    const locked = await row()
    expect(new Date(locked.lockUntil!).getTime() - Date.now()).toBeGreaterThan(14 * 60_000)

    const right = await rest('POST', '/api/users/login', { body: { email, password }, headers: from })
    expect(right.status).toBe(401)
    expect(right.setCookie.some((c) => c.startsWith('muomalat-token=ey'))).toBe(false)
    // The locked response does not reveal that the account exists.
    const unknown = await rest('POST', '/api/users/login', { body: { email: unknownEmail(), password }, headers: from })
    expect(right.json.errors[0].message).toBe(unknown.json.errors[0].message)

    for (const role of ['reporter', 'editor', 'eic'] as const) {
      const other = await account(role, `unlocker-${role}`)
      const cookie = await login(other.email, staffPassword(`unlocker-${role}`))
      expect((await rest('POST', '/api/users/unlock', { cookie, body: { email } })).status).toBe(403)
    }
    expect((await row()).lockUntil).toBeTruthy()

    const admin = await account('admin', 'unlocker-admin')
    const adminCookie = await login(admin.email, staffPassword('unlocker-admin'))
    expect((await rest('POST', '/api/users/unlock', { cookie: adminCookie, body: { email } })).status).toBe(200)
    expect(await login(email, password)).toMatch(/^muomalat-token=/)
  })
})

describe('K10: password policy', () => {
  it('rejects a 14-character password and accepts 15 characters, with no composition rules', async () => {
    const payload = await testPayload()
    const base = { name: 'Parol', role: 'reporter' as const, active: true }
    await expect(
      payload.create({ collection: 'users', data: { ...base, email: unknownEmail(), password: 'abcdefghijklmn' }, overrideAccess: true }),
    ).rejects.toMatchObject({ data: { errors: [{ path: 'password', message: PASSWORD_MESSAGES.tooShort }] } })
    const ok = await payload.create({ collection: 'users', data: { ...base, email: unknownEmail(), password: 'abcdefghijklmno' }, overrideAccess: true })
    expect(ok.id).toBeDefined()
    // Code points, not UTF-16 units: 14 emoji are 28 units but 14 characters.
    await expect(
      payload.create({ collection: 'users', data: { ...base, email: unknownEmail(), password: '😀'.repeat(14) }, overrideAccess: true }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects a breached password; only a 5-character SHA-1 prefix is looked up', async () => {
    const payload = await testPayload()
    const { user, password } = await reporterAccount('breached')
    const breached = 'correct horse battery staple'
    const asked: string[] = []
    setBreachedRangeLookup(async (prefix) => {
      asked.push(prefix)
      const { prefix: p, suffix } = rangeKey(breached)
      return prefix === p ? `0000000000000000000000000000000000A:0\r\n${suffix}:3861493\r\n` : 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:2\r\n'
    })
    const cookie = await login(user.email, password)
    const r = await rest('PATCH', `/api/users/${user.id}`, { cookie, body: { password: breached } })
    expect(r.status).toBe(400)
    expect(JSON.stringify(r.json)).toContain(PASSWORD_MESSAGES.breached)
    expect(asked).toEqual([rangeKey(breached).prefix])
    expect(asked[0]).toHaveLength(5)
    // A password the corpus does not list is accepted.
    expect((await rest('PATCH', `/api/users/${user.id}`, { cookie, body: { password: 'a long passphrase nobody has used' } })).status).toBe(200)
    // Reset-password hashes before any validate hook; the policy still applies.
    const token = await payload.forgotPassword({ collection: 'users', data: { email: user.email }, disableEmail: true })
    const reset = await rest('POST', '/api/users/reset-password', { body: { token, password: breached } })
    expect(reset.status).toBe(400)
  })

  it('accepts the password and logs when the range API is unreachable', async () => {
    const payload = await testPayload()
    setBreachedRangeLookup(async () => {
      throw new Error('ECONNREFUSED')
    })
    const user = await payload.create({
      collection: 'users',
      data: { name: 'Tarmoqsiz', role: 'reporter', active: true, email: unknownEmail(), password: 'correct horse battery staple' },
      overrideAccess: true,
    })
    expect(user.id).toBeDefined()
  })
})

describe('K18: login rate limit', () => {
  it('the eleventh attempt from one IP within 15 minutes gets 429 before the password is checked', async () => {
    const { email, password, row } = await reporterAccount('rate-limited')
    const from = { 'cf-connecting-ip': ip() }
    for (let i = 0; i < LOGIN_LIMIT.max; i++) {
      expect((await rest('POST', '/api/users/login', { body: { email: unknownEmail(), password: 'wrong-password-123456' }, headers: from })).status).toBe(401)
    }
    const before = await row()
    const r = await rest('POST', '/api/users/login', { body: { email, password }, headers: from })
    expect(r.status).toBe(429)
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0)
    const after = await row()
    expect(after.loginAttempts ?? 0).toBe(before.loginAttempts ?? 0)
    expect(after.sessions?.length ?? 0).toBe(before.sessions?.length ?? 0)
    // Another address is not affected.
    expect((await rest('POST', '/api/users/login', { body: { email, password }, headers: { 'cf-connecting-ip': ip() } })).status).toBe(200)
  })

  it('correct logins are not counted, so one office address does not lock itself out', async () => {
    const { email, password } = await reporterAccount('office')
    const from = { 'cf-connecting-ip': '192.0.2.77' }
    for (let i = 0; i < LOGIN_LIMIT.max + 3; i++) {
      expect((await rest('POST', '/api/users/login', { body: { email, password }, headers: from })).status).toBe(200)
    }
  })

  it('forgot-password has its own limit per IP', async () => {
    const from = { 'cf-connecting-ip': ip() }
    for (let i = 0; i < LOGIN_LIMIT.max; i++) {
      expect((await rest('POST', '/api/users/forgot-password', { body: { email: unknownEmail() }, headers: from })).status).toBe(200)
    }
    expect((await rest('POST', '/api/users/forgot-password', { body: { email: unknownEmail() }, headers: from })).status).toBe(429)
  })
})

describe('K15: absolute session lifetime', () => {
  it('a token refresh for a session older than 8 h returns 401', async () => {
    const payload = await testPayload()
    const { user, email, password, row } = await reporterAccount('old-session')
    const cookie = await login(email, password)
    expect((await rest('POST', '/api/users/refresh-token', { cookie })).status).toBe(200)
    const sessions = (await row()).sessions ?? []
    const old = new Date(Date.now() - MAX_SESSION_AGE_MS - 60_000).toISOString()
    await payload.db.updateOne({
      collection: 'users',
      id: user.id,
      data: { sessions: sessions.map((s) => ({ ...s, createdAt: old })) },
      returning: false,
    })
    expect((await rest('POST', '/api/users/refresh-token', { cookie })).status).toBe(401)
  })
})

describe('A7: a disabled account with a valid session', () => {
  it('gets 403 on every data request and cannot refresh', async () => {
    const payload = await testPayload()
    const { user, email, password } = await reporterAccount('disabled')
    const cookie = await login(email, password)
    expect((await rest('GET', '/api/tags?limit=1', { cookie })).status).toBe(200)
    await payload.update({ collection: 'users', id: user.id, data: { active: false }, overrideAccess: true })
    for (const [method, path] of [
      ['GET', '/api/articles'],
      ['GET', '/api/tags'],
      ['GET', '/api/media'],
      ['GET', '/api/users/me'],
      ['GET', `/api/users/${user.id}`],
      ['GET', '/api/globals/site-settings'],
      ['GET', '/api/globals/home-page'],
      ['POST', '/api/users/refresh-token'],
    ] as const) {
      expect([method, path, (await rest(method, path, { cookie })).status]).toEqual([method, path, 403])
    }
    expect((await rest('PATCH', `/api/users/${user.id}`, { cookie, body: { name: 'Qaytdim' } })).status).toBe(403)
    expect((await rest('POST', '/api/users/login', { body: { email, password } })).status).toBe(403)
  })
})

describe('logout (PHASE0 risk 23)', () => {
  it('a second logout with the same, already ended session answers 200 and expires the cookie', async () => {
    const { email, password } = await reporterAccount('double-logout')
    const cookie = await login(email, password)
    const first = await rest('POST', '/api/users/logout', { cookie })
    expect(first.status).toBe(200)
    const second = await rest('POST', '/api/users/logout', { cookie })
    expect(second.status).toBe(200)
    const expired = second.setCookie.find((c) => c.startsWith('muomalat-token='))
    expect(expired).toMatch(/^muomalat-token=;/)
    expect(new Date(/Expires=([^;]+)/i.exec(expired!)![1]).getTime()).toBeLessThan(Date.now())
    // Without any cookie Payload's own answer stands.
    expect((await rest('POST', '/api/users/logout')).status).toBe(200)
  })
})
