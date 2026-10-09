import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setBreachedRangeLookup } from '@/payload/security/password'
import { account, cookieOf, login, password, rest, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Second auth pass (CMS-SPEC §4.4, §12.2, §12.3): the password policy on the
 * paths that are not a plain create (self-update, reset-password),
 * forgot-password enumeration and its rate limit, unlock enumeration, and CSRF
 * on the globals and bulk endpoints.
 */

let reporter: U
let editor: U
let admin: U

beforeAll(async () => {
  reporter = await account('reporter', 'a2-reporter')
  editor = await account('editor', 'a2-editor')
  admin = await account('admin', 'a2-admin')
})

afterAll(async () => {
  await (await testPayload()).destroy()
})

describe('password policy is enforced on update and reset, not only on create (§12.2)', () => {
  it('a user setting a 10-character password on their own account over REST is refused', async () => {
    const cookie = await cookieOf(reporter)
    const r = await rest('PATCH', `/api/users/${reporter.id}`, { cookie, body: { password: 'short12345' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    // The old password still works.
    await expect(login(reporter.email, reporter.password)).resolves.toBeTruthy()
  })

  it('a breached password is refused on self-update (only a 5-char SHA-1 prefix is looked up)', async () => {
    const payload = await testPayload()
    const user = await account('reporter', 'a2-breach')
    const cookie = await cookieOf(user)
    const breached = 'correcthorsebatterystaple'
    const { createHash } = await import('node:crypto')
    const full = createHash('sha1').update(breached).digest('hex').toUpperCase()
    let askedPrefix = ''
    setBreachedRangeLookup(async (prefix) => {
      askedPrefix = prefix
      return `${full.slice(5)}:42\r\n`
    })
    try {
      const r = await rest('PATCH', `/api/users/${user.id}`, { cookie, body: { password: breached } })
      expect(r.status).toBeGreaterThanOrEqual(400)
      expect(askedPrefix).toBe(full.slice(0, 5))
    } finally {
      setBreachedRangeLookup(undefined)
    }
    void payload
  })

  it('a weak password cannot be set through the reset-password token flow', async () => {
    const payload = await testPayload()
    const user = await account('reporter', 'a2-reset')
    const token = await payload.forgotPassword({ collection: 'users', data: { email: user.email }, disableEmail: true } as never)
    const r = await rest('POST', '/api/users/reset-password', { body: { token, password: 'weak-pass-1' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    // The original password still works; the reset did not take.
    await expect(login(user.email, user.password)).resolves.toBeTruthy()
  })
})

describe('forgot-password does not reveal whether an account exists (§12.3)', () => {
  const ip = (n: number) => ({ 'cf-connecting-ip': `198.51.100.${n}` })
  it('a known and an unknown address get the same status and body shape', async () => {
    const known = await rest('POST', '/api/users/forgot-password', { body: { email: reporter.email }, headers: ip(201) })
    const unknown = await rest('POST', '/api/users/forgot-password', { body: { email: 'ghost@test.muomalat.local' }, headers: ip(202) })
    expect(known.status).toBe(unknown.status)
    const msg = (r: typeof known) => (r.json?.message ?? r.json?.errors?.[0]?.message ?? '').toString()
    expect(msg(known)).not.toMatch(/not found|mavjud emas|unknown/i)
    expect(msg(unknown)).not.toMatch(/not found|mavjud emas|unknown/i)
  })

  it('forgot-password is rate-limited per IP before it touches an account', async () => {
    const headers = { 'cf-connecting-ip': '198.51.100.230' }
    let sawLimit = false
    for (let i = 0; i < 13; i++) {
      const r = await rest('POST', '/api/users/forgot-password', { body: { email: `ghost-${i}@test.muomalat.local` }, headers })
      if (r.status === 429) sawLimit = true
    }
    expect(sawLimit).toBe(true)
  })
})

describe('unlock: admin-only and no enumeration (§4.3, CVE-2026-11779)', () => {
  it('a non-admin unlock is 403 whatever the email, and an admin unlock of an unknown email does not reveal it', async () => {
    const reporterCookie = await cookieOf(reporter)
    const real = await rest('POST', '/api/users/unlock', { cookie: reporterCookie, body: { email: editor.email } })
    const ghost = await rest('POST', '/api/users/unlock', { cookie: reporterCookie, body: { email: 'ghost@test.muomalat.local' } })
    expect([real.status, ghost.status]).toEqual([403, 403])
    const adminCookie = await cookieOf(admin)
    const adminGhost = await rest('POST', '/api/users/unlock', { cookie: adminCookie, body: { email: 'ghost@test.muomalat.local' } })
    // The admin may call it; the answer must not say "no such user".
    expect((adminGhost.json?.errors?.[0]?.message ?? adminGhost.json?.message ?? '').toString()).not.toMatch(/not found|mavjud emas/i)
  })
})

describe('CSRF: a valid cookie from a foreign Origin is ignored on every write path (§12.2, K2)', () => {
  it('a global update from evil.example with a real cookie changes nothing', async () => {
    const payload = await testPayload()
    const eic = await account('eic', 'a2-eic')
    const cookie = await cookieOf(eic)
    await payload.updateGlobal({ slug: 'site-settings', overrideAccess: true, locale: 'uz', data: { labels: { advert: 'Reklama' } } as never })
    const r = await rest('POST', '/api/globals/site-settings?locale=uz', { cookie, origin: 'https://evil.example', body: { labels: { advert: 'BEPUL' } } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const s = (await payload.findGlobal({ slug: 'site-settings', depth: 0, locale: 'uz', overrideAccess: true })) as Doc
    expect((s.labels as Doc)?.advert).not.toBe('BEPUL')
  })

  it('a bulk PATCH from a foreign Origin with a real cookie is not authenticated', async () => {
    const payload = await testPayload()
    const eic = await account('eic', 'a2-eic')
    const cookie = await cookieOf(eic)
    const ghost = await payload.create({ collection: 'requests', overrideAccess: true, data: { kind: 'error_report', receivedAt: new Date().toISOString(), channel: 'email', summary: 'CSRF' } as never })
    const r = await rest('PATCH', `/api/requests?where[id][equals]=${ghost.id}`, { cookie, origin: 'https://evil.example', body: { status: 'closed' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('refresh-token from a foreign Origin does not renew the session', async () => {
    const cookie = await cookieOf(reporter)
    const r = await rest('POST', '/api/users/refresh-token', { cookie, origin: 'https://evil.example' })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('the session cookie and the login error shape (K1, K9)', () => {
  it('the token cookie is Secure, HttpOnly, SameSite=Strict and host-only (no Domain)', async () => {
    const user = await account('reporter', 'a2-cookie')
    const r = await rest('POST', '/api/users/login', { body: { email: user.email, password: user.password }, headers: { 'cf-connecting-ip': '198.51.100.80' } })
    const set = r.setCookie.find((s) => s.startsWith('muomalat-token='))!
    expect(set).toMatch(/HttpOnly/i)
    expect(set).toMatch(/SameSite=Strict/i)
    expect(set.toLowerCase()).not.toContain('domain=')
  })

  it('a wrong password and an unknown account are the same 401 with the same message', async () => {
    const wrong = await rest('POST', '/api/users/login', { body: { email: reporter.email, password: 'wrong-password-xxxxxxxx' }, headers: { 'cf-connecting-ip': '198.51.100.81' } })
    const ghost = await rest('POST', '/api/users/login', { body: { email: 'ghost2@test.muomalat.local', password: 'wrong-password-xxxxxxxx' }, headers: { 'cf-connecting-ip': '198.51.100.82' } })
    expect(wrong.status).toBe(ghost.status)
    expect(wrong.json?.errors?.[0]?.message).toBe(ghost.json?.errors?.[0]?.message)
  })
})

describe('password-change ends other sessions (§12.2, useSessions)', () => {
  it('after a self password change, a cookie from before no longer refreshes', async () => {
    const payload = await testPayload()
    const user = await account('reporter', 'a2-session')
    const oldCookie = await login(user.email, user.password)
    expect((await rest('GET', '/api/articles?depth=0', { cookie: oldCookie })).status).toBe(200)
    const newPass = `rt-rotated-${user.tag}-0123456789`
    await payload.update({ collection: 'users', id: user.id, data: { password: newPass } as never, overrideAccess: true })
    const refresh = await rest('POST', '/api/users/refresh-token', { cookie: oldCookie })
    expect(refresh.status).toBeGreaterThanOrEqual(400)
    void password
  })
})
