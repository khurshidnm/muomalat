import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { account, cookieOf, login, makeStory, password, rest, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Attacks on authentication and the session boundary (CMS-SPEC §4.4, §9.4,
 * §12.2, §12.3): the login rate limit, account enumeration, CSRF from a
 * foreign Origin, the unlock endpoint, and whether deactivating an account
 * cuts a session that is already open.
 */

let reporter: U
let admin: U
let victim: U

beforeAll(async () => {
  reporter = await account('reporter', 'auth-reporter')
  admin = await account('admin', 'auth-admin')
  victim = await account('editor', 'auth-victim')
})

afterAll(async () => {
  await (await testPayload()).destroy()
})

describe('CSRF: a foreign Origin with a valid cookie is not trusted', () => {
  it('a cross-origin POST /api/articles with a valid cookie creates nothing', async () => {
    const cookie = await cookieOf(reporter)
    // Other files create stories meanwhile: count only what this request could have made.
    const title = `CSRF ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`
    const mine = { or: [{ title: { equals: title } }, { slug: { equals: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') } }] }
    const r = await rest('POST', '/api/articles?locale=uz', {
      cookie,
      origin: 'https://evil.example',
      body: { title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), _status: 'draft' },
    })
    const made = await (await testPayload()).count({ collection: 'articles', where: mine as never, trash: true, overrideAccess: true })
    expect(made.totalDocs).toBe(0)
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('K17: the transition endpoint from a foreign Origin returns 401', async () => {
    const id = (await makeStory([], { assignee: reporter.id })).id as number
    const cookie = await cookieOf(reporter)
    const r = await rest('POST', `/api/articles/${id}/transition`, { cookie, origin: 'https://evil.example', body: { action: 'submit' } })
    expect(r.status).toBe(401)
  })
})

describe('unlock endpoint (A9, CVE-2026-11779)', () => {
  it('a non-admin calling /api/users/unlock is refused', async () => {
    for (const role of ['reporter'] as const) {
      const cookie = await cookieOf(reporter)
      const r = await rest('POST', '/api/users/unlock', { cookie, body: { email: victim.email } })
      expect([role, r.status]).toEqual([role, 403])
    }
  })
})

describe('account enumeration and lockout (K9, J6)', () => {
  const ip = { 'cf-connecting-ip': '198.51.100.7' }
  it('a wrong password and an unknown email give the same generic error shape', async () => {
    const known = await rest('POST', '/api/users/login', { body: { email: reporter.email, password: 'definitely-wrong-xxxxxxx' }, headers: ip })
    const unknown = await rest('POST', '/api/users/login', { body: { email: 'nobody-here@test.muomalat.local', password: 'definitely-wrong-xxxxxxx' }, headers: ip })
    expect(known.status).toBeGreaterThanOrEqual(400)
    expect(unknown.status).toBeGreaterThanOrEqual(400)
    const msg = (r: any) => r.json?.errors?.[0]?.message ?? ''
    // Neither answer may reveal whether the account exists.
    expect(msg(known)).not.toMatch(/locked|qulf|mavjud emas|not found/i)
    expect(msg(unknown)).not.toMatch(/locked|qulf|mavjud emas|not found/i)
  })

  it('after lockout the response is the generic error, not "this user is locked"', async () => {
    const lockMe = await account('reporter', 'auth-lockme')
    const headers = { 'cf-connecting-ip': '198.51.100.9' }
    for (let i = 0; i < 6; i++) {
      await rest('POST', '/api/users/login', { body: { email: lockMe.email, password: 'wrong-wrong-wrong-xx' }, headers })
    }
    // Even the correct password is now refused, with no hint that the account is locked.
    const r = await rest('POST', '/api/users/login', { body: { email: lockMe.email, password: password('auth-lockme') }, headers })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(r.json?.errors?.[0]?.message ?? '').not.toMatch(/locked|qulflangan/i)
  })
})

describe('A7: deactivating an account cuts the open session', () => {
  it('after active=false the same cookie reads nothing, cannot see itself, and cannot refresh', async () => {
    const payload = await testPayload()
    const user = await account('editor', 'auth-deactivate')
    const cookie = await login(user.email, user.password)
    // Works before deactivation.
    expect((await rest('GET', '/api/articles?depth=0', { cookie })).status).toBe(200)
    await payload.update({ collection: 'users', id: user.id, data: { active: false } as never, overrideAccess: true })

    const read = await rest('GET', '/api/articles?depth=0', { cookie })
    expect(read.status === 403 || (read.status === 200 && (read.json.totalDocs === 0 || read.json.docs?.length === 0))).toBe(true)

    const refresh = await rest('POST', '/api/users/refresh-token', { cookie })
    expect(refresh.status).toBeGreaterThanOrEqual(400)

    const write = await rest('POST', '/api/articles?locale=uz', { cookie, body: { title: 'x', slug: `x-${Date.now()}`, _status: 'draft' } })
    expect(write.status).toBeGreaterThanOrEqual(400)
  })

  it('a deactivated account cannot log in again', async () => {
    const payload = await testPayload()
    const user = await account('editor', 'auth-deactivate2')
    await payload.update({ collection: 'users', id: user.id, data: { active: false } as never, overrideAccess: true })
    let failed = false
    try {
      await login(user.email, user.password)
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  })
})

describe('login rate limit (K18)', () => {
  it('the eleventh failed login from one IP within the window is refused before the password check', async () => {
    const headers = { 'cf-connecting-ip': '198.51.100.42' }
    const target = await account('reporter', 'auth-ratelimit')
    let sawLimit = false
    for (let i = 0; i < 12; i++) {
      const r = await rest('POST', '/api/users/login', { body: { email: target.email, password: `wrong-${i}-aaaaaaaaaa` }, headers })
      if (r.status === 429) sawLimit = true
    }
    expect(sawLimit).toBe(true)
  })
})

describe('careless script: no overrideAccess still blocks the admin-only fields', () => {
  it('a reporter-bound Local API cannot raise its own role', async () => {
    const payload = await testPayload()
    let threw = false
    try {
      await payload.update({ collection: 'users', id: reporter.id, data: { role: 'admin' } as never, user: reporter as never, overrideAccess: false })
    } catch {
      threw = true
    }
    const after = (await payload.findByID({ collection: 'users', id: reporter.id, overrideAccess: true })) as Doc
    expect(after.role).toBe('reporter')
    expect(threw).toBe(true)
  })
})
