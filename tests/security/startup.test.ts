import pg from 'pg'
import type { Payload, SanitizedConfig } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { startupGuard, unsafeDatabase, unsafeSettings } from '@/payload/security/startupGuard'
import { testPayload } from '../helpers/payload'

/**
 * K7 (CMS-SPEC §12.1, PHASE0 S62): in SITE_ENV=production the process exits
 * on each unsafe setting; outside production nothing is enforced.
 */
const SAFE_ENV = {
  SITE_ENV: 'production',
  PAYLOAD_SECRET: 'x'.repeat(88),
  ACCESS_JWT_REQUIRED: 'true',
  CF_ACCESS_TEAM_DOMAIN: 'muomalat.cloudflareaccess.com',
  CF_ACCESS_AUD: 'aud-tag',
  DATABASE_URL: 'postgres://muomalat_app:secret@postgres:5432/muomalat',
  CONTENT_SOURCE: 'payload',
  TELEGRAM_CHANNEL: '@muomalatuz',
  TELEGRAM_BOT_TOKEN: '123:abc',
}

let payload: Payload
let config: SanitizedConfig

beforeAll(async () => {
  payload = await testPayload()
  config = payload.config
})
afterAll(async () => payload.destroy())

/** The config with the users collection's auth changed. */
const withUsersAuth = (auth: Record<string, unknown>): SanitizedConfig =>
  ({
    ...config,
    collections: config.collections.map((c) => (c.slug === 'users' ? { ...c, auth: { ...c.auth, ...auth } } : c)),
  }) as SanitizedConfig
const usersCookies = () => config.collections.find((c) => c.slug === 'users')!.auth.cookies

describe('K7: startup guard', () => {
  it('finds nothing in the shipped configuration with production settings', () => {
    expect(unsafeSettings(withUsersAuth({ cookies: { ...usersCookies(), secure: true } }), SAFE_ENV)).toEqual([])
  })

  const envCases: [string, Record<string, string | undefined>, RegExp][] = [
    ['PAYLOAD_SECRET shorter than 64 bytes', { PAYLOAD_SECRET: 'x'.repeat(63) }, /PAYLOAD_SECRET/],
    ['ACCESS_JWT_REQUIRED not true', { ACCESS_JWT_REQUIRED: 'false' }, /ACCESS_JWT_REQUIRED/],
    ['ACCESS_JWT_REQUIRED unset', { ACCESS_JWT_REQUIRED: undefined }, /ACCESS_JWT_REQUIRED/],
    ['Access required but not configured', { CF_ACCESS_AUD: '' }, /CF_ACCESS_AUD/],
    ['DATABASE_URL as the owner role', { DATABASE_URL: 'postgres://muomalat_owner:x@postgres:5432/muomalat' }, /owner role/],
    ['DB_ROLE=owner', { DB_ROLE: 'owner' }, /DB_ROLE/],
    ['owner credentials in the app environment', { DATABASE_URL_MIGRATE: 'postgres://muomalat_owner:x@postgres/muomalat' }, /DATABASE_URL_MIGRATE/],
    ['a Telegram channel other than @muomalatuz', { TELEGRAM_CHANNEL: '@muomalat_test' }, /TELEGRAM_CHANNEL/],
    ['a bot token without a channel', { TELEGRAM_CHANNEL: undefined }, /TELEGRAM_CHANNEL/],
    ['CONTENT_SOURCE=mock', { CONTENT_SOURCE: 'mock' }, /CONTENT_SOURCE/],
  ]
  for (const [name, change, finding] of envCases) {
    it(`refuses: ${name}`, () => {
      const findings = unsafeSettings(withUsersAuth({ cookies: { ...usersCookies(), secure: true } }), { ...SAFE_ENV, ...change })
      expect(findings).toHaveLength(1)
      expect(findings[0]).toMatch(finding)
    })
  }

  const configCases: [string, () => SanitizedConfig, RegExp][] = [
    ['cookies.secure not true', () => withUsersAuth({ cookies: { ...usersCookies(), secure: false } }), /cookies\.secure/],
    ['cookies.domain set', () => withUsersAuth({ cookies: { ...usersCookies(), secure: true, domain: '.muomalat.uz' } }), /cookies\.domain/],
    ['GraphQL (and its playground) enabled', () => ({ ...withUsersAuth({ cookies: { ...usersCookies(), secure: true } }), graphQL: { ...config.graphQL, disable: false, disablePlaygroundInProduction: false } }) as SanitizedConfig, /GraphQL/],
    ['admin.autoRefresh true', () => ({ ...withUsersAuth({ cookies: { ...usersCookies(), secure: true } }), admin: { ...config.admin, autoRefresh: true } }) as SanitizedConfig, /autoRefresh/],
    ['jobs.autoRun configured', () => ({ ...withUsersAuth({ cookies: { ...usersCookies(), secure: true } }), jobs: { ...config.jobs, autoRun: [{ cron: '* * * * *' }] } }) as SanitizedConfig, /jobs\.autoRun/],
    ["cors '*'", () => ({ ...withUsersAuth({ cookies: { ...usersCookies(), secure: true } }), cors: '*' }) as SanitizedConfig, /cors/],
  ]
  for (const [name, make, finding] of configCases) {
    it(`refuses: ${name}`, () => {
      const findings = unsafeSettings(make(), SAFE_ENV)
      expect(findings.length).toBeGreaterThan(0)
      expect(findings.every((f) => finding.test(f))).toBe(true)
    })
  }

  it('the app role passes the database check; the owner role does not', async () => {
    expect(await unsafeDatabase(payload)).toEqual([])
    const db = new URL(process.env.DATABASE_URL!)
    const owner = new pg.Pool({ connectionString: `postgres://muomalat_owner:dev-owner-password@${db.host}${db.pathname}`, max: 1 })
    try {
      const findings = await unsafeDatabase({ db: { pool: owner } } as unknown as Payload)
      expect(findings.join(' ')).toMatch(/can change the schema/)
    } finally {
      await owner.end()
    }
  })

  it('exits with code 1 in production and logs every finding', async () => {
    const exit = vi.fn()
    const fatal = vi.spyOn(payload.logger, 'fatal').mockImplementation(() => undefined as never)
    await startupGuard(payload, { env: { ...SAFE_ENV, ACCESS_JWT_REQUIRED: 'false', CONTENT_SOURCE: 'mock' }, exit })
    expect(exit).toHaveBeenCalledWith(1)
    expect(fatal.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/ACCESS_JWT_REQUIRED[\s\S]*CONTENT_SOURCE/)
    fatal.mockRestore()
  })

  it('does nothing outside production, during next build, or when every setting is safe', async () => {
    const exit = vi.fn()
    const unsafe = { ...SAFE_ENV, ACCESS_JWT_REQUIRED: 'false' }
    await startupGuard(payload, { env: { ...unsafe, SITE_ENV: 'development' }, exit })
    await startupGuard(payload, { env: { ...unsafe, SITE_ENV: 'test' }, exit })
    await startupGuard(payload, { env: { ...unsafe, NEXT_PHASE: 'phase-production-build' }, exit })
    const warn = vi.spyOn(payload.logger, 'warn').mockImplementation(() => undefined as never)
    await startupGuard(payload, { env: { ...unsafe, SITE_ENV: 'staging' }, exit })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
    expect(exit).not.toHaveBeenCalled()
  })
})
