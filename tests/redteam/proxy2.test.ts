import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { proxy } from '@/proxy'

/**
 * Second host-rule pass (CMS-SPEC §2.3). The public host must answer 404 to
 * everything under /api and /admin except image files, however the path is
 * dressed up: percent-encoded separators, a leading double slash, a different
 * case, a trailing dot. Cloudflare repeats these rules at the edge; this
 * covers the app's own copy (proxy.ts is never the only check). First-user
 * registration is closed on every host, and /preview is public-host 404.
 */

const SITE = process.env.SITE_HOST || 'localhost:3000'
const CMS = process.env.CMS_HOST || 'cms.localhost:3000'

function request(host: string, path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://${host}${path}`, { method: init.method ?? 'GET', headers: { host, ...init.headers } })
}

/** A clean pass-through to the origin: Next forwards the request untouched. */
const passes = (res: Response) => res.headers.get('x-middleware-next') === '1'
const rewrittenTo = (res: Response) => res.headers.get('x-middleware-rewrite')
/** The public host must never forward an admin/API path to the origin unchanged. */
const reachesOrigin = (res: Response) => passes(res) && !rewrittenTo(res)

describe('the public host does not forward admin/API paths to the origin, however the path is encoded', () => {
  const variants = [
    '/api%2Fusers/login',
    '/api%2fusers',
    '//api/users/login',
    '/API/users/login',
    '/Admin',
    '/admin.',
    '/admin/',
    '/api/./users/login',
    '/api/users/../users/login',
    '/api/articles%00',
    '/%2fapi/users/login',
    '/api//users//login',
  ]
  it('each variant is either a 404 or a rewrite into the /uz/ site namespace — never a clean pass-through to the Payload /api or /admin route', async () => {
    for (const path of variants) {
      const res = await proxy(request(SITE, path))
      const rewrite = rewrittenTo(res)
      // Safe: a hard 404, or pulled into the public-site locale tree (/uz/…), where the Payload REST and admin
      // route groups (which match only a bare /api/* or /admin/* request path) can never be reached.
      const okShape = res.status === 404 || (rewrite !== null && new URL(rewrite).pathname.startsWith('/uz/'))
      expect([path, 'status', res.status, 'rewrite', rewrite, 'safe', okShape, 'reachesOrigin', reachesOrigin(res)]).toEqual([
        path,
        'status',
        res.status,
        'rewrite',
        rewrite,
        'safe',
        true,
        'reachesOrigin',
        false,
      ])
    }
  })

  it('a real /admin and /api path is a hard 404, and the admin is never reachable on the public host', async () => {
    for (const path of ['/admin', '/admin/collections/users', '/api/users', '/api/globals/home-page', '/api/articles/1/transition']) {
      expect([path, (await proxy(request(SITE, path))).status]).toEqual([path, 404])
    }
  })
})

describe('media files are the only /api path the public host serves', () => {
  it('GET and HEAD of a file pass through; a POST, a PUT, and the metadata list do not', async () => {
    expect(passes(await proxy(request(SITE, '/api/media/file/a.webp')))).toBe(true)
    expect(passes(await proxy(request(SITE, '/api/media/file/a.webp', { method: 'HEAD' })))).toBe(true)
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect([method, (await proxy(request(SITE, '/api/media/file/a.webp', { method }))).status]).toEqual([method, 404])
    }
    expect((await proxy(request(SITE, '/api/media'))).status).toBe(404)
    // A path that only looks like a file route but carries another segment is not served.
    expect(reachesOrigin(await proxy(request(SITE, '/api/media/file/a.webp/../../users')))).toBe(false)
  })
})

describe('first-user registration is closed on every host (K3, GHSA-97rh-rhh2-7vjv)', () => {
  it('both hosts 404 /api/users/first-register and /admin/create-first-user', async () => {
    for (const host of [SITE, CMS]) {
      for (const path of ['/api/users/first-register', '/admin/create-first-user', '/api/users/first-register/']) {
        expect([host, path, (await proxy(request(host, path, { method: 'POST' }))).status]).toEqual([host, path, 404])
      }
    }
  })
})

describe('/preview and /exit-preview are public-host 404 and CMS-host noindex (§5.13)', () => {
  it('the public host refuses them; the CMS host serves them out of the index', async () => {
    expect((await proxy(request(SITE, '/preview?c=articles&id=1&l=uz'))).status).toBe(404)
    expect((await proxy(request(SITE, '/exit-preview'))).status).toBe(404)
    const cms = await proxy(request(CMS, '/preview?c=articles&id=1&l=uz'))
    expect(cms.headers.get('X-Robots-Tag')).toMatch(/noindex/i)
  })
})

describe('/internal/* is reachable only from inside the Docker network (§8.4)', () => {
  it('404 on both public hosts and for anything carrying cf-connecting-ip; a bare internal call passes through to the route', async () => {
    expect((await proxy(request(SITE, '/internal/revalidate', { method: 'POST' }))).status).toBe(404)
    expect((await proxy(request(CMS, '/internal/revalidate', { method: 'POST' }))).status).toBe(404)
    // Came through Cloudflare (cf-connecting-ip) but to an internal path: refused even on an unknown host.
    expect((await proxy(request('app:3000', '/internal/revalidate', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.5' } }))).status).toBe(404)
    // Inside the Docker network (no cf-connecting-ip, internal host): the route itself then checks the HMAC.
    expect(passes(await proxy(request('app:3000', '/internal/revalidate', { method: 'POST' })))).toBe(true)
  })
})

describe('the CMS host keeps itself out of the search index', () => {
  it('robots.txt disallows everything and site pages carry X-Robots-Tag noindex', async () => {
    const robots = await proxy(request(CMS, '/robots.txt'))
    expect(await robots.text()).toMatch(/Disallow: \/\s*$/m)
    const page = await proxy(request(CMS, '/tahlil/some-slug'))
    expect(page.headers.get('X-Robots-Tag')).toMatch(/noindex/i)
  })
})
