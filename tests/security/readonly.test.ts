import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { collectionReadOnlyGuard, globalReadOnlyGuard, READ_ONLY_MESSAGE } from '@/payload/hooks/security/readOnly'
import { forgetReadOnlySetting, isReadOnly } from '@/payload/security/readOnly'
import { testPayload } from '../helpers/payload'
import { account, login, rest, staffPassword } from './rest'

/**
 * K8 (CMS-SPEC §12.10): read-only mode rejects every staff write and keeps
 * reads, logins and the public site working. The environment switch is set
 * per test process; the settings switch is simulated with a spy so other test
 * files sharing this database are never put into read-only mode.
 */
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
let editor: string
let admin: string
let editorId: number | string

beforeAll(async () => {
  const e = await account('editor', 'ro-editor')
  editorId = e.id
  await account('admin', 'ro-admin')
  editor = await login(e.email, staffPassword('ro-editor'))
  admin = await login('ro-admin@test.muomalat.local', staffPassword('ro-admin'))
})
afterEach(() => {
  delete process.env.CMS_READ_ONLY
  vi.restoreAllMocks()
  forgetReadOnlySetting()
})
afterAll(async () => (await testPayload()).destroy())

const refused = (r: { status: number; json: any }) => {
  expect(r.status).toBe(403)
  expect(r.json.errors?.[0]?.message).toBe(READ_ONLY_MESSAGE)
}

describe('K8: coverage', () => {
  it('every collection and global of ours carries the read-only guard', async () => {
    const payload = await testPayload()
    for (const c of payload.config.collections.filter((c) => !c.slug.startsWith('payload-'))) {
      expect([c.slug, c.hooks.beforeOperation?.includes(collectionReadOnlyGuard)]).toEqual([c.slug, true])
    }
    for (const g of payload.config.globals) {
      expect([g.slug, g.hooks.beforeOperation?.includes(globalReadOnlyGuard)]).toEqual([g.slug, true])
    }
  })
})

describe('K8: CMS_READ_ONLY=1', () => {
  it('refuses create, update, delete and global updates over REST', async () => {
    const payload = await testPayload()
    const tag = await payload.create({
      collection: 'tags',
      data: { label: `Faqat oʻqish ${RUN}`, slug: `faqat-oqish-${RUN}` },
      draft: true,
      overrideAccess: true,
    })
    process.env.CMS_READ_ONLY = '1'
    refused(await rest('POST', '/api/tags?draft=true', { cookie: editor, body: { label: `Yangi ${RUN}`, slug: `yangi-${RUN}` } }))
    refused(await rest('PATCH', `/api/tags/${tag.id}?draft=true`, { cookie: editor, body: { label: 'Oʻzgargan' } }))
    refused(await rest('DELETE', `/api/tags/${tag.id}`, { cookie: editor }))
    refused(await rest('POST', '/api/globals/home-page?draft=true', { cookie: editor, body: {} }))
    refused(await rest('PATCH', `/api/users/${editorId}`, { cookie: editor, body: { name: 'Boshqa ism' } }))
    refused(await rest('POST', '/api/users/forgot-password', { body: { email: 'ro-editor@test.muomalat.local' } }))
    // Nothing changed.
    const stored = await payload.findByID({ collection: 'tags', id: tag.id, draft: true, overrideAccess: true })
    expect(stored.label).toBe(`Faqat oʻqish ${RUN}`)
  })

  it('keeps reads, login and the anonymous public read working', async () => {
    process.env.CMS_READ_ONLY = '1'
    expect((await rest('GET', '/api/tags?limit=1', { cookie: editor })).status).toBe(200)
    expect((await rest('GET', '/api/globals/home-page', { cookie: editor })).status).toBe(200)
    expect((await rest('GET', '/api/users/me', { cookie: editor })).json.user?.id).toBe(editorId)
    expect(await login('ro-editor@test.muomalat.local', staffPassword('ro-editor'))).toMatch(/^muomalat-token=/)
    const payload = await testPayload()
    const site = await payload.find({ collection: 'articles', overrideAccess: false, limit: 5 })
    expect(site.docs.every((d) => d._status === 'published')).toBe(true)
  })

  it('lets system writes with overrideAccess through (audit rows, sessions, outbox)', async () => {
    process.env.CMS_READ_ONLY = '1'
    const payload = await testPayload()
    const row = await payload.create({ collection: 'audit-log', data: { action: 'ops.backup_ok', summary: `read-only test ${RUN}` }, overrideAccess: true })
    expect(row.id).toBeDefined()
  })

  it('the same writes succeed once the switch is off', async () => {
    const r = await rest('POST', '/api/tags?draft=true', { cookie: editor, body: { label: `Keyin ${RUN}`, slug: `keyin-${RUN}` } })
    expect(r.status).toBe(201)
  })

  it('an admin may still change site-settings.operations, and nothing else', async () => {
    const payload = await testPayload()
    const before = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
    process.env.CMS_READ_ONLY = '1'
    const r = await rest('POST', '/api/globals/site-settings', {
      cookie: admin,
      body: { name: `Buzilgan ${RUN}`, operations: { officeHours: { start: '08:30', end: '19:00' } } },
    })
    expect(r.status).toBe(200)
    const after = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
    expect(after.name).toBe(before.name)
    expect(after.operations?.officeHours?.start).toBe('08:30')
    // Not even an admin changes anything else, and other roles nothing at all.
    refused(await rest('POST', '/api/globals/site-settings', { cookie: editor, body: { emergency: { enabled: false } } }))
    delete process.env.CMS_READ_ONLY
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { operations: { officeHours: { start: before.operations?.officeHours?.start ?? '09:00', end: before.operations?.officeHours?.end ?? '19:00' } } },
      overrideAccess: true,
    })
  })

  it('isReadOnly() tells the worker to pause', async () => {
    const payload = await testPayload()
    expect(await isReadOnly({ payload })).toBe(false)
    process.env.CMS_READ_ONLY = '1'
    expect(await isReadOnly({ payload })).toBe(true)
  })
})

describe('K8: site-settings.operations.readOnly', () => {
  /** Answer site-settings reads as if the flag were set, in this process only. */
  async function flag(value: boolean) {
    const payload = await testPayload()
    const real = payload.findGlobal.bind(payload)
    vi.spyOn(payload, 'findGlobal').mockImplementation((async (args: Parameters<typeof real>[0]) => {
      const doc = await real(args)
      return args.slug === 'site-settings' ? { ...doc, operations: { ...(doc as any).operations, readOnly: value } } : doc
    }) as typeof payload.findGlobal)
    forgetReadOnlySetting()
  }

  it('refuses writes while the flag is on and allows them after site-settings changes', async () => {
    await flag(true)
    refused(await rest('POST', '/api/tags?draft=true', { cookie: editor, body: { label: `Bayroq ${RUN}`, slug: `bayroq-${RUN}` } }))
    expect((await rest('GET', '/api/tags?limit=1', { cookie: editor })).status).toBe(200)
    vi.restoreAllMocks()
    // The cached flag (5 s) is dropped by the site-settings afterChange hook.
    const payload = await testPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: {}, overrideAccess: true })
    expect((await rest('POST', '/api/tags?draft=true', { cookie: editor, body: { label: `Bayroqsiz ${RUN}`, slug: `bayroqsiz-${RUN}` } })).status).toBe(201)
  })
})
