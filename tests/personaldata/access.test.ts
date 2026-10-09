import { handleEndpoints } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'
import { testPayload } from '../helpers/payload'
import { staffUser, uniqueEmail } from './helpers'

/**
 * §3.14 / §13.5: nobody creates personal data through Payload, anonymous
 * REST reads nothing, and the newsroom never sees subscriber or club data.
 */
const CMS = process.env.CMS_URL || 'http://cms.localhost:3000'
const PD = ['club-applications', 'digest-subscribers', 'contact-messages', 'advertising-requests'] as const
type PdSlug = (typeof PD)[number]

async function rest(method: string, path: string, body?: unknown, cookie?: string) {
  const headers = new Headers({ Origin: CMS })
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (cookie) headers.set('Cookie', cookie)
  const res = await handleEndpoints({
    config,
    request: new Request(CMS + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
  })
  const text = await res.text()
  let json: unknown = text
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json: json as Record<string, unknown> }
}

async function login(role: Role) {
  const user = await staffUser(role)
  const res = await handleEndpoints({
    config,
    request: new Request(`${CMS}/api/users/login`, {
      method: 'POST',
      headers: { Origin: CMS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: `test-password-${role}-0123456789` }),
    }),
  })
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('muomalat-token='))
  if (!cookie) throw new Error(`login failed for ${role}: ${res.status}`)
  return { user, cookie: cookie.split(';')[0] }
}

const consent = { given: true, textVersion: 'test-v1', locale: 'uz' as const, at: new Date().toISOString() }
const ids = {} as Record<PdSlug | 'tuzatish' | 'reklama', number>

beforeAll(async () => {
  const payload = await testPayload()
  const email = uniqueEmail('access')
  ids['club-applications'] = (
    await payload.create({
      collection: 'club-applications',
      overrideAccess: true,
      data: { name: 'N', company: 'C', sector: 'savdo', size: '1-10', phone: '+998 90 000-00-00', email, status: 'new', consent },
    })
  ).id
  ids['digest-subscribers'] = (
    await payload.create({ collection: 'digest-subscribers', overrideAccess: true, data: { email, status: 'confirmed', consent } })
  ).id
  ids['contact-messages'] = (
    await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { topic: 'tahririyat', name: 'N', email, message: 'M', status: 'new', consent } })
  ).id
  ids.tuzatish = (
    await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { topic: 'tuzatish', name: 'N', email, message: 'M', status: 'new', consent } })
  ).id
  ids.reklama = (
    await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { topic: 'reklama', name: 'N', email, message: 'M', status: 'new', consent } })
  ).id
  ids['advertising-requests'] = (
    await payload.create({
      collection: 'advertising-requests',
      overrideAccess: true,
      data: { name: 'N', company: 'C', email, phone: '+998 90 000-00-00', format: 'banner', message: 'M', status: 'new', consent },
    })
  ).id
})
afterAll(async () => (await testPayload()).destroy())

describe('anonymous REST', () => {
  it.each(PD)('%s: no list, no single read, no create', async (slug) => {
    const list = await rest('GET', `/api/${slug}`)
    expect(list.status).toBe(403)
    const one = await rest('GET', `/api/${slug}/${ids[slug]}`)
    expect(one.status).toBe(403)
    const create = await rest('POST', `/api/${slug}`, { email: uniqueEmail('anon'), name: 'x', consent })
    expect(create.status).toBe(403)
    expect(JSON.stringify(list.json) + JSON.stringify(one.json)).not.toContain('@example.com')
  })

  it('anonymous Local API reads (the public site) get nothing either', async () => {
    const payload = await testPayload()
    for (const slug of PD) {
      await expect(payload.find({ collection: slug, overrideAccess: false })).rejects.toThrow()
    }
  })
})

/** Who may read which collection (§4.2, §13.5). */
const READ: Record<Role, Record<PdSlug, boolean>> = {
  reporter: { 'club-applications': false, 'digest-subscribers': false, 'contact-messages': false, 'advertising-requests': false },
  editor: { 'club-applications': false, 'digest-subscribers': false, 'contact-messages': true, 'advertising-requests': false },
  eic: { 'club-applications': true, 'digest-subscribers': false, 'contact-messages': true, 'advertising-requests': true },
  commercial: { 'club-applications': true, 'digest-subscribers': false, 'contact-messages': true, 'advertising-requests': true },
  admin: { 'club-applications': true, 'digest-subscribers': true, 'contact-messages': true, 'advertising-requests': true },
}

describe('staff roles (§13.5: not to the newsroom)', () => {
  it.each(Object.keys(READ) as Role[])('%s reads only what the matrix allows (Local API, as the user)', async (role) => {
    const payload = await testPayload()
    const user = await staffUser(role)
    for (const slug of PD) {
      const read = payload.find({ collection: slug, overrideAccess: false, user, depth: 0 })
      if (READ[role][slug]) await expect(read).resolves.toBeTruthy()
      else await expect(read, `${role} must not read ${slug}`).rejects.toThrow()
    }
  })

  it('reporters and editors cannot read subscriber or club data over REST', async () => {
    for (const role of ['reporter', 'editor'] as const) {
      const { cookie } = await login(role)
      for (const slug of ['digest-subscribers', 'club-applications', 'advertising-requests'] as const) {
        expect((await rest('GET', `/api/${slug}`, undefined, cookie)).status, `${role} ${slug}`).toBe(403)
        expect((await rest('GET', `/api/${slug}/${ids[slug]}`, undefined, cookie)).status, `${role} ${slug} one`).toBe(403)
      }
    }
  })

  it('contact messages by topic: editors the newsroom topics, commercial reklama and klub', async () => {
    const payload = await testPayload()
    const topics = async (role: Role) => {
      const user = await staffUser(role)
      const { docs } = await payload.find({ collection: 'contact-messages', overrideAccess: false, user, depth: 0, limit: 1000 })
      return new Set(docs.map((d) => d.topic))
    }
    const editor = await topics('editor')
    expect([...editor].every((t) => t === 'tahririyat' || t === 'tuzatish')).toBe(true)
    expect(editor.has('tuzatish')).toBe(true)
    const commercial = await topics('commercial')
    expect([...commercial].every((t) => t === 'reklama' || t === 'klub')).toBe(true)
    expect(commercial.has('reklama')).toBe(true)
  })

  it('nobody creates personal data through Payload, not even an admin', async () => {
    const payload = await testPayload()
    const admin = await staffUser('admin')
    for (const slug of PD) {
      await expect(
        payload.create({ collection: slug, overrideAccess: false, user: admin, data: { email: uniqueEmail('admin'), consent } as never }),
      ).rejects.toThrow()
    }
  })

  it('pd.read is logged for a single-document read by staff, with no value from the record', async () => {
    const payload = await testPayload()
    const { user, cookie } = await login('admin')
    const before = await payload.count({ collection: 'audit-log', where: { action: { equals: 'pd.read' } }, overrideAccess: true })
    const res = await rest('GET', `/api/digest-subscribers/${ids['digest-subscribers']}`, undefined, cookie)
    expect(res.status).toBe(200)
    await payload.findByID({ collection: 'club-applications', id: ids['club-applications'], overrideAccess: false, user })
    // Lists and internal reads are not logged.
    await payload.find({ collection: 'club-applications', overrideAccess: false, user })
    await payload.findByID({ collection: 'club-applications', id: ids['club-applications'], overrideAccess: true })
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { action: { equals: 'pd.read' } },
      sort: '-id',
      limit: 10,
      overrideAccess: true,
    })
    const fresh = docs.slice(0, 2)
    const after = await payload.count({ collection: 'audit-log', where: { action: { equals: 'pd.read' } }, overrideAccess: true })
    expect(after.totalDocs - before.totalDocs).toBe(2)
    expect(fresh.map((d) => d.collection).sort()).toEqual(['club-applications', 'digest-subscribers'])
    for (const row of fresh) {
      expect(row).toMatchObject({ actorId: user.id, actorRole: 'admin', docTitle: null })
      expect(JSON.stringify(row)).not.toMatch(/@example\.com|"N"|\+998/)
    }
  })
})
