import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose'
import { handleEndpoints } from 'payload'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'
import { staff, testPayload } from '../helpers/payload'

/**
 * REST harness for the security tests: requests go through handleEndpoints,
 * the same code the Next route /api/[...slug] runs, so CSRF, cookie auth,
 * access and error handling are the real ones. No server is started.
 */
export const CMS = process.env.CMS_URL || 'http://cms.localhost:3000'

export type RestOptions = {
  body?: unknown
  cookie?: string
  /** `null` sends no Origin header. */
  origin?: string | null
  headers?: Record<string, string>
}

export async function rest(method: string, path: string, opts: RestOptions = {}) {
  await testPayload()
  const headers = new Headers(opts.headers ?? {})
  const origin = opts.origin === undefined ? CMS : opts.origin
  if (origin) headers.set('Origin', origin)
  if (opts.cookie) headers.set('Cookie', opts.cookie)
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json')
  const request = new Request(CMS + path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const res = await handleEndpoints({ config, request })
  const text = await res.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json, headers: res.headers, setCookie: res.headers.getSetCookie?.() ?? [] }
}

/** Log in over REST and return the `muomalat-token=…` cookie pair. */
export async function login(email: string, password: string, headers: Record<string, string> = {}) {
  const r = await rest('POST', '/api/users/login', { body: { email, password }, headers })
  const cookie = r.setCookie.find((s) => s.startsWith('muomalat-token='))
  if (!cookie) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.json)}`)
  return cookie.split(';')[0]
}

/**
 * A staff account with its own tag (its email and password derive from the
 * tag). tests/helpers/payload.ts types `tag` as a role because of its default.
 */
export const account = (role: Role, tag: string) => staff(role, tag as Role)

/** The password tests/helpers/payload.ts gives each staff account. */
export const staffPassword = (tag: string) => `test-password-${tag}-0123456789`

// ---------------------------------------------------------------------------
// A fake Cloudflare Access: a local RS256 key pair and a JWKS endpoint
// (the approach of .spike/auth/run-access-jwt.ts).
// ---------------------------------------------------------------------------

export const TEAM = 'muomalat-test.cloudflareaccess.com'
export const ISSUER = `https://${TEAM}`
export const AUDIENCE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9'

type Key = Awaited<ReturnType<typeof generateKeyPair>>

export async function fakeAccess() {
  const k1 = await generateKeyPair('RS256', { extractable: true })
  const k2 = await generateKeyPair('RS256', { extractable: true })
  const rogue = await generateKeyPair('RS256', { extractable: true })
  const pub = async (k: Key, kid: string) => ({ ...(await exportJWK(k.publicKey)), kid, alg: 'RS256', use: 'sig' }) as JWK

  const state = { keys: [await pub(k1, 'kid-1')], fetches: 0 }
  const server = http.createServer((req, res) => {
    if (req.url === '/cdn-cgi/access/certs') {
      state.fetches++
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ keys: state.keys }))
    } else res.writeHead(404).end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const jwksUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/cdn-cgi/access/certs`

  type SignOptions = { key?: Key; kid?: string; alg?: string; iss?: string; aud?: string | string[]; exp?: number; nbf?: number }
  const now = () => Math.floor(Date.now() / 1000)

  async function sign(claims: Record<string, unknown>, o: SignOptions = {}) {
    const jwt = new SignJWT(claims)
      .setProtectedHeader({ alg: o.alg ?? 'RS256', kid: o.kid ?? 'kid-1' })
      .setIssuedAt()
      .setIssuer(o.iss ?? ISSUER)
      .setAudience(o.aud ?? [AUDIENCE])
      .setExpirationTime(o.exp ?? now() + 3600)
    if (o.nbf) jwt.setNotBefore(o.nbf)
    return jwt.sign((o.key ?? k1).privateKey)
  }

  /** An Access application token for `email`, as Cloudflare sends it. */
  const tokenFor = (email: string, o: SignOptions = {}) =>
    sign({ email, type: 'app', identity_nonce: 'nonce', sub: '7335d417-61da-459d-899c-0a01c76a2f94', country: 'UZ' }, o)

  return {
    jwksUrl,
    state,
    keys: { k1, k2, rogue },
    pub,
    sign,
    tokenFor,
    now,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
