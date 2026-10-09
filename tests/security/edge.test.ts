import { SignJWT } from 'jose'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createAccessVerifier, setAccessVerifier, TRUSTED_INTERNAL } from '@/payload/access/edge'
import { testPayload } from '../helpers/payload'
import { account, AUDIENCE, fakeAccess, ISSUER, login, rest, staffPassword, TEAM } from './rest'

/**
 * Edge identity (CMS-SPEC §12.2, PHASE0 §1.5): the Cloudflare Access JWT
 * verifier, and test A10 — with ACCESS_JWT_REQUIRED=true a REST request with
 * a valid Payload cookie but no Access JWT, or a JWT for another email, gets
 * 403 and an `auth.edge_mismatch` audit row. A local RS256 key pair and JWKS
 * server stand in for Cloudflare.
 */
let access: Awaited<ReturnType<typeof fakeAccess>>
const EMAIL = 'Editor@Muomalat.uz'

beforeAll(async () => {
  access = await fakeAccess()
})
afterAll(async () => {
  await access.close()
  await (await testPayload()).destroy()
})

const header = (token?: string) => new Headers(token ? { 'Cf-Access-Jwt-Assertion': token } : {})

describe('Access JWT verifier', () => {
  const verifier = () => createAccessVerifier({ teamDomain: TEAM, audience: AUDIENCE, issuer: ISSUER, jwksUrl: access.jwksUrl })

  it('accepts a valid token whose email matches, case-insensitively', async () => {
    const r = await verifier()(header(await access.tokenFor(EMAIL)), ' editor@muomalat.UZ ')
    expect(r).toMatchObject({ ok: true, email: 'editor@muomalat.uz', country: 'UZ' })
  })

  it('accepts a valid token without an expected email (edge identity only)', async () => {
    expect((await verifier()(header(await access.tokenFor(EMAIL)))).ok).toBe(true)
  })

  it('accepts an aud array that contains our audience', async () => {
    expect((await verifier()(header(await access.tokenFor(EMAIL, { aud: ['x', AUDIENCE] })), EMAIL)).ok).toBe(true)
  })

  const now = () => Math.floor(Date.now() / 1000)
  const rejects: [string, () => Promise<Headers>, string | undefined, RegExp][] = [
    ['email mismatch', async () => header(await access.tokenFor(EMAIL)), 'someone.else@muomalat.uz', /email_mismatch/],
    ['missing header', async () => header(), EMAIL, /missing_header/],
    ['garbage header', async () => header('not.a.jwt'), EMAIL, /ERR_JW/],
    ['wrong audience', async () => header(await access.tokenFor(EMAIL, { aud: 'other-app' })), EMAIL, /aud/],
    ['wrong issuer', async () => header(await access.tokenFor(EMAIL, { iss: 'https://evil.cloudflareaccess.com' })), EMAIL, /iss/],
    ['expired a minute ago', async () => header(await access.tokenFor(EMAIL, { exp: now() - 60 })), EMAIL, /ERR_JWT_EXPIRED/],
    ['not valid for another minute', async () => header(await access.tokenFor(EMAIL, { nbf: now() + 60 })), EMAIL, /nbf/],
    ['service token without email', async () => header(await access.sign({ type: 'app', common_name: 'svc.access' })), undefined, /email/],
    ['organization token', async () => header(await access.sign({ email: EMAIL, type: 'org' })), EMAIL, /wrong_token_type/],
    ['token without a type', async () => header(await access.sign({ email: EMAIL })), EMAIL, /wrong_token_type/],
    ['signed by an unpublished key under our kid', async () => header(await access.tokenFor(EMAIL, { key: access.keys.rogue })), EMAIL, /SIGNATURE/],
    [
      'HS256 with a shared secret (algorithm confusion)',
      async () =>
        header(
          await new SignJWT({ email: EMAIL, type: 'app' })
            .setProtectedHeader({ alg: 'HS256', kid: 'kid-1' })
            .setIssuedAt()
            .setIssuer(ISSUER)
            .setAudience(AUDIENCE)
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode('shared-secret-shared-secret-shared-secret')),
        ),
      EMAIL,
      /ERR_JOSE_ALG_NOT_ALLOWED|ALG/,
    ],
    [
      'alg none (unsigned)',
      async () => {
        const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
        return header(`${b64({ alg: 'none', kid: 'kid-1' })}.${b64({ email: EMAIL, type: 'app', iss: ISSUER, aud: [AUDIENCE], iat: now(), exp: now() + 3600 })}.`)
      },
      EMAIL,
      /ERR_JO?SE|ALG|ERR_JWS/,
    ],
  ]
  for (const [name, make, expected, reason] of rejects) {
    it(`refuses: ${name}`, async () => {
      const r = await verifier()(await make(), expected)
      expect(r.ok).toBe(false)
      expect(!r.ok && r.reason).toMatch(reason)
    })
  }

  it('accepts a rotated-in key only after the 5 s refetch cooldown, with one refetch', async () => {
    access.state.keys = [await access.pub(access.keys.k1, 'kid-1')]
    const verify = verifier()
    expect((await verify(header(await access.tokenFor(EMAIL)), EMAIL)).ok).toBe(true)
    access.state.keys = [await access.pub(access.keys.k1, 'kid-1'), await access.pub(access.keys.k2, 'kid-2')]
    const rotated = await access.tokenFor(EMAIL, { key: access.keys.k2, kid: 'kid-2' })
    expect((await verify(header(rotated), EMAIL)).ok).toBe(false)
    await new Promise((r) => setTimeout(r, 5_100))
    const before = access.state.fetches
    expect((await verify(header(rotated), EMAIL)).ok).toBe(true)
    expect(access.state.fetches - before).toBe(1)
  }, 20_000)

  it('fails closed when the JWKS cannot be fetched', async () => {
    const down = createAccessVerifier({ teamDomain: TEAM, audience: AUDIENCE, issuer: ISSUER, jwksUrl: 'http://127.0.0.1:9/cdn-cgi/access/certs' })
    const r = await down(header(await access.tokenFor(EMAIL)), EMAIL)
    expect(r.ok).toBe(false)
  })
})

describe('A10: edge identity on login and on every request (ACCESS_JWT_REQUIRED=true)', () => {
  let editor: Awaited<ReturnType<typeof account>>
  let cookie: string
  const previous = process.env.ACCESS_JWT_REQUIRED

  beforeAll(async () => {
    editor = await account('editor', 'edge-editor')
    cookie = await login(editor.email, staffPassword('edge-editor'))
    setAccessVerifier(createAccessVerifier({ teamDomain: TEAM, audience: AUDIENCE, issuer: ISSUER, jwksUrl: access.jwksUrl }))
    process.env.ACCESS_JWT_REQUIRED = 'true'
  })
  afterEach(() => {
    process.env.ACCESS_JWT_REQUIRED = 'true'
  })
  afterAll(() => {
    process.env.ACCESS_JWT_REQUIRED = previous
    setAccessVerifier(undefined)
  })

  const mismatchRows = async () => {
    const payload = await testPayload()
    return (
      await payload.find({
        collection: 'audit-log',
        where: { and: [{ action: { equals: 'auth.edge_mismatch' } }, { actorId: { equals: editor.id } }] },
        sort: 'id',
        overrideAccess: true,
        pagination: false,
      })
    ).docs
  }

  it('a valid cookie without Cf-Access-Jwt-Assertion → 403 and an auth.edge_mismatch row', async () => {
    const before = (await mismatchRows()).length
    const r = await rest('GET', '/api/articles', { cookie, headers: { 'cf-connecting-ip': '203.0.113.10' } })
    expect(r.status).toBe(403)
    const rows = await mismatchRows()
    expect(rows.length).toBe(before + 1)
    expect(rows.at(-1)).toMatchObject({ actorEmail: editor.email, actorRole: 'editor', summary: 'missing_header', ip: '203.0.113.10' })
  })

  it('a valid cookie with an Access JWT for another email → 403', async () => {
    const jwt = await access.tokenFor('intruder@muomalat.uz')
    const r = await rest('GET', '/api/articles', { cookie, headers: { 'Cf-Access-Jwt-Assertion': jwt } })
    expect(r.status).toBe(403)
    const last = (await mismatchRows()).at(-1)
    expect(last?.summary).toBe('email_mismatch: Access intruder@muomalat.uz')
  })

  it('the matching Access JWT → the request goes through', async () => {
    const jwt = await access.tokenFor(editor.email.toUpperCase())
    const r = await rest('GET', '/api/articles?limit=1', { cookie, headers: { 'Cf-Access-Jwt-Assertion': jwt } })
    expect(r.status).toBe(200)
    expect((await rest('GET', '/api/users/me', { cookie, headers: { 'Cf-Access-Jwt-Assertion': jwt } })).json.user?.id).toBe(editor.id)
  })

  it('/api/users/me and the token refresh refuse a missing JWT too', async () => {
    expect((await rest('GET', '/api/users/me', { cookie })).status).toBe(403)
    expect((await rest('POST', '/api/users/refresh-token', { cookie })).status).toBe(403)
  })

  it('login: no JWT or another email → 403, no session, no failed-login count; the matching JWT logs in', async () => {
    const payload = await testPayload()
    const user = await account('reporter', 'edge-login')
    const state = async () => {
      const row = (await payload.db.findOne({ collection: 'users', where: { id: { equals: user.id } } })) as {
        sessions?: unknown[]
        loginAttempts?: number
      }
      return { sessions: row.sessions?.length ?? 0, attempts: row.loginAttempts ?? 0 }
    }
    const body = { email: user.email, password: staffPassword('edge-login') }
    const start = await state()

    const none = await rest('POST', '/api/users/login', { body })
    expect(none.status).toBe(403)
    expect(none.setCookie.some((c) => c.startsWith('muomalat-token=ey'))).toBe(false)

    const other = await rest('POST', '/api/users/login', { body, headers: { 'Cf-Access-Jwt-Assertion': await access.tokenFor('intruder@muomalat.uz') } })
    expect(other.status).toBe(403)
    expect(await state()).toEqual(start)

    const ok = await rest('POST', '/api/users/login', { body, headers: { 'Cf-Access-Jwt-Assertion': await access.tokenFor(user.email) } })
    expect(ok.status).toBe(200)
    expect((await state()).sessions).toBe(start.sessions + 1)
  })

  it('with ACCESS_JWT_REQUIRED=false the cookie alone is enough (development)', async () => {
    process.env.ACCESS_JWT_REQUIRED = 'false'
    expect((await rest('GET', '/api/articles?limit=1', { cookie })).status).toBe(200)
  })

  it('Local API: a user without an HTTP request is refused; trusted internal callers pass', async () => {
    const payload = await testPayload()
    await expect(payload.find({ collection: 'articles', user: editor, overrideAccess: false, limit: 1 })).rejects.toMatchObject({ status: 403 })
    const found = await payload.find({ collection: 'articles', user: editor, overrideAccess: false, limit: 1, context: { ...TRUSTED_INTERNAL } })
    expect(found.docs).toBeDefined()
    // The anonymous public read never needs an Access JWT.
    expect((await payload.find({ collection: 'articles', overrideAccess: false, limit: 1 })).docs).toBeDefined()
  })
})
