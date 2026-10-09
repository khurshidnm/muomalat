import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { config, proxy } from '@/proxy'

/**
 * Host rules in src/proxy.ts (CMS-SPEC §2.3; A2, K3) and the proxy's login
 * limit (§12.3). Cloudflare repeats the rules at the edge; these tests cover
 * the app's copy.
 */
const SITE = process.env.SITE_HOST || 'localhost:3000'
const CMS = process.env.CMS_HOST || 'cms.localhost:3000'

function request(host: string, path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new NextRequest(`http://${host}${path}`, {
    method: init.method ?? 'GET',
    headers: { host, ...init.headers },
    body: init.body,
  })
}

const passes = (res: Response) => res.headers.get('x-middleware-next') === '1'
const rewrittenTo = (res: Response) => res.headers.get('x-middleware-rewrite')

describe('A2: the public host', () => {
  it('404s the admin and the REST API, but serves media files', async () => {
    for (const path of ['/admin', '/admin/collections/articles', '/api/articles', '/api/users/login', '/api/media', '/api/globals/site-settings']) {
      expect([path, (await proxy(request(SITE, path))).status]).toEqual([path, 404])
    }
    expect(passes(await proxy(request(SITE, '/api/media/file/photo.webp')))).toBe(true)
    expect(passes(await proxy(request(SITE, '/api/media/file/photo.webp', { method: 'HEAD' })))).toBe(true)
    expect((await proxy(request(SITE, '/api/media/file/photo.webp', { method: 'POST' }))).status).toBe(404)
  })

  it('treats any other host (a forged or internal name) as public for the admin', async () => {
    expect((await proxy(request('app:3000', '/admin'))).status).toBe(404)
    expect((await proxy(request('evil.example', '/api/articles'))).status).toBe(404)
  })

  it('404s /preview and /exit-preview', async () => {
    expect((await proxy(request(SITE, '/preview?c=articles&id=1'))).status).toBe(404)
    expect((await proxy(request(SITE, '/exit-preview'))).status).toBe(404)
  })

  it('serves its own robots.txt and passes /t/<code> through unchanged', async () => {
    expect(passes(await proxy(request(SITE, '/robots.txt')))).toBe(true)
    const short = await proxy(request(SITE, '/t/ab12'))
    expect(passes(short)).toBe(true)
    expect(rewrittenTo(short)).toBeNull()
  })
})

describe('the CMS host', () => {
  it('serves the admin and the API, presenting the Uzbek admin language until one is chosen', async () => {
    const res = await proxy(request(CMS, '/admin'))
    expect(passes(res)).toBe(true)
    expect(res.headers.get('x-middleware-request-cookie') ?? res.headers.get('x-middleware-override-headers')).toBeTruthy()
    expect(passes(await proxy(request(CMS, '/api/articles')))).toBe(true)
  })

  it('serves the preview routes, out of the index', async () => {
    const res = await proxy(request(CMS, '/preview?c=articles&id=1'))
    expect(passes(res)).toBe(true)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('answers robots.txt with Disallow: /', async () => {
    const res = await proxy(request(CMS, '/robots.txt'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('User-agent: *\nDisallow: /\n')
  })

  it('keeps site pages out of search', async () => {
    const res = await proxy(request(CMS, '/tahlil'))
    expect(rewrittenTo(res)).toContain('/uz/tahlil')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })
})

describe('K3: first-user registration is closed on every host', () => {
  it('404s /api/users/first-register and /admin/create-first-user', async () => {
    for (const host of [SITE, CMS]) {
      expect((await proxy(request(host, '/api/users/first-register', { method: 'POST' }))).status).toBe(404)
      expect((await proxy(request(host, '/admin/create-first-user'))).status).toBe(404)
    }
  })
})

describe('/internal/*', () => {
  it('is 404 on both public hosts and for anything that came through Cloudflare', async () => {
    expect((await proxy(request(SITE, '/internal/revalidate', { method: 'POST' }))).status).toBe(404)
    expect((await proxy(request(CMS, '/internal/revalidate', { method: 'POST' }))).status).toBe(404)
    expect((await proxy(request('app:3000', '/internal/revalidate', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' } }))).status).toBe(404)
  })

  it('passes a call from inside the Docker network to the route, unrewritten', async () => {
    const res = await proxy(request('app:3000', '/internal/revalidate', { method: 'POST' }))
    expect(passes(res)).toBe(true)
    expect(rewrittenTo(res)).toBeNull()
  })

  it('cannot be skipped by an extension: the matcher lists the prefix', () => {
    expect(config.matcher).toEqual(expect.arrayContaining(['/admin/:path*', '/api/:path*', '/internal/:path*', '/preview/:path*', '/robots.txt']))
  })
})

describe('login limit at the proxy (§12.3)', () => {
  const loginFrom = (ip: string, email: string, json = true) =>
    request(CMS, '/api/users/login', {
      method: 'POST',
      headers: { 'cf-connecting-ip': ip, 'content-type': json ? 'application/json' : 'application/x-www-form-urlencoded' },
      body: json ? JSON.stringify({ email, password: 'x' }) : new URLSearchParams({ _payload: JSON.stringify({ email, password: 'x' }) }).toString(),
    })

  it('counts per submitted email across addresses', async () => {
    const email = `target-${Date.now()}@muomalat.uz`
    for (let i = 0; i < 10; i++) expect(passes(await proxy(loginFrom(`203.0.113.${i + 1}`, i % 2 ? email : email.toUpperCase(), i % 2 === 0)))).toBe(true)
    const limited = await proxy(loginFrom('203.0.113.200', email))
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await limited.json()).errors[0].message).toBe('Elektron pochta yoki parol notoʻgʻri.')
  })

  it('counts per IP, whatever the email', async () => {
    const ip = `198.18.0.${Math.floor(Math.random() * 250) + 1}`
    for (let i = 0; i < 30; i++) expect(passes(await proxy(loginFrom(ip, `u${i}-${Date.now()}@x.uz`)))).toBe(true)
    expect((await proxy(loginFrom(ip, `last-${Date.now()}@x.uz`))).status).toBe(429)
  })

  it('does not count requests that did not come through Cloudflare (one shared bucket)', async () => {
    const local = () => request(CMS, '/api/users/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'dev@muomalat.local', password: 'x' }) })
    for (let i = 0; i < 40; i++) expect(passes(await proxy(local()))).toBe(true)
  })

  it('leaves other API calls alone', async () => {
    for (let i = 0; i < 40; i++) expect(passes(await proxy(request(CMS, '/api/users/me', { headers: { 'cf-connecting-ip': '198.18.1.1' } })))).toBe(true)
  })
})
