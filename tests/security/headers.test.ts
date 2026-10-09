import { describe, expect, it } from 'vitest'

import nextConfig from '../../next.config'

/**
 * K5 (CMS-SPEC §12.4): the headers next.config.ts sends, per host. The
 * browser check (admin and site with no CSP errors) is done by hand with
 * puppeteer; this test pins the policy itself.
 */
type Rule = { source: string; has?: { type: string; value?: string }[]; missing?: { type: string; value?: string }[]; headers: { key: string; value: string }[] }

async function rules(): Promise<Rule[]> {
  return (await nextConfig.headers!()) as Rule[]
}
const header = (rule: Rule | undefined, key: string) => rule?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value
const directives = (csp = '') => Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...values]) => [name, values]))

describe('K5: security headers', () => {
  it('the public host gets HSTS, the site CSP, nosniff, Referrer-Policy and Permissions-Policy', async () => {
    const site = (await rules()).find((r) => r.source === '/:path*' && r.missing?.some((m) => m.type === 'host'))
    expect(header(site, 'Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
    expect(header(site, 'X-Content-Type-Options')).toBe('nosniff')
    expect(header(site, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(header(site, 'Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(), payment=()')
    expect(header(site, 'X-Frame-Options')).toBe('DENY')
    const csp = directives(header(site, 'Content-Security-Policy'))
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['script-src']).toEqual(expect.arrayContaining(["'self'", "'unsafe-inline'"]))
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['form-action']).toEqual(["'self'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['connect-src']).toEqual(["'self'"])
    expect(csp['upgrade-insecure-requests']).toEqual([])
    // No third-party origin anywhere in the site policy.
    expect(header(site, 'Content-Security-Policy')).not.toMatch(/https?:\/\//)
  })

  it('the CMS host gets its own CSP, noindex, and no-store on /admin', async () => {
    const all = await rules()
    const cms = all.find((r) => r.source === '/:path*' && r.has?.some((h) => h.type === 'host'))
    expect(header(cms, 'X-Robots-Tag')).toBe('noindex, nofollow')
    expect(header(cms, 'Strict-Transport-Security')).toBeTruthy()
    expect(header(cms, 'X-Content-Type-Options')).toBe('nosniff')
    const csp = directives(header(cms, 'Content-Security-Policy'))
    expect(csp['frame-ancestors']).toEqual(["'self'"])
    expect(csp['frame-src']).toEqual(["'self'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['worker-src']).toEqual(["'self'", 'blob:'])
    // The one third-party source: the pinned Monaco build, by path.
    const foreign = Object.values(csp).flat().filter((v) => /^https?:/.test(v))
    expect(new Set(foreign)).toEqual(new Set([expect.stringMatching(/^https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@\d+\.\d+\.\d+\/$/)]))
    const admin = all.find((r) => r.source === '/admin/:path*')
    expect(header(admin, 'Cache-Control')).toBe('no-store')
  })

  it('tells the hosts apart by name, as Next matches them (port removed, anchored)', async () => {
    const cms = (await rules()).find((r) => r.source === '/:path*' && r.has)!
    const pattern = new RegExp(`^${cms.has![0].value}$`)
    for (const host of ['cms.muomalat.uz', 'cms-staging.muomalat.uz', 'cms.localhost']) expect([host, pattern.test(host)]).toEqual([host, true])
    for (const host of ['muomalat.uz', 'staging.muomalat.uz', 'localhost', 'www.muomalat.uz']) expect([host, pattern.test(host)]).toEqual([host, false])
  })
})
