import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Role } from '@/payload/access/roles'
import { testPayload } from '../helpers/payload'
import { account, byline, cookieOf, makeStory, rest, type Doc, type U } from '../redteam/harness'

/**
 * The staff directory (CMS-SPEC §4.2 `users`): every active staff member reads
 * the other staff members' name and role, so a story's desk editor, approver
 * and assignee show by name instead of «Nomsiz - ID: n». Nothing else about a
 * colleague is widened: personal fields stay with the person, the
 * editor-in-chief and admin; status, preferences and `updatedAt` (every login
 * writes it) with the person and the desk.
 */

const ROLES: Role[] = ['reporter', 'editor', 'eic', 'commercial', 'admin']
const PERSONAL = ['email', 'telegramUserId', 'lastLoginAt', 'lastLoginCountry', 'knownCountries', 'updatedAt'] as const
const ACCOUNT = ['active', 'offboardedAt', 'preferredContentLocale'] as const

const staff: Partial<Record<Role, U>> = {}
const cookies: Partial<Record<Role, string>> = {}
let colleague: U
let deskEditor: U
let disabled: U
let storyId: number

const interestRows = (v: unknown) => (Array.isArray(v) ? v : []).filter((row) => row && typeof row === 'object' && ((row as Doc).institution != null || (row as Doc).note != null))

beforeAll(async () => {
  const payload = await testPayload()
  for (const role of ROLES) {
    staff[role] = await account(role, `dir-${role}`)
    cookies[role] = await cookieOf(staff[role]!)
  }
  colleague = await account('reporter', 'dir-colleague')
  deskEditor = await account('editor', 'dir-desk')
  disabled = await account('reporter', 'dir-disabled')
  const inst = await payload.create({ collection: 'institutions', draft: true, overrideAccess: true, data: { name: 'Dir Bank', slug: `dir-bank-${Date.now()}`, _status: 'draft' } as never })
  await payload.update({
    collection: 'users',
    id: colleague.id,
    overrideAccess: true,
    data: { telegramUserId: '123456789', lastLoginCountry: 'UZ', declaredInterests: [{ institution: inst.id, nature: 'family', note: 'maxfiy' }] } as never,
  })
  // A colleague logs in, so lastLoginAt and updatedAt hold a login time.
  await cookieOf(colleague)
  // The reporter's own story, taken by a desk editor and approved by them.
  const own = await byline('Dir Reporter Byline', { user: staff.reporter })
  storyId = (await makeStory([own], { assignee: staff.reporter!.id, deskEditor: deskEditor.id, approvedBy: deskEditor.id, submittedBy: staff.reporter!.id })).id as number
})

afterAll(async () => {
  const payload = await testPayload()
  await payload.update({ collection: 'users', id: disabled.id, data: { active: true }, overrideAccess: true })
  await payload.destroy()
})

describe('every active staff member reads colleagues’ name and role', () => {
  it('by id and in the list, for each role', async () => {
    for (const role of ROLES) {
      const one = await rest('GET', `/api/users/${colleague.id}?depth=0`, { cookie: cookies[role] })
      expect([role, one.status]).toEqual([role, 200])
      expect([role, one.json.name, one.json.role]).toEqual([role, colleague.name, 'reporter'])
      const list = await rest('GET', `/api/users?depth=0&limit=200&where[id][equals]=${deskEditor.id}`, { cookie: cookies[role] })
      expect([role, list.status, list.json.docs?.map((d: Doc) => [d.name, d.role])]).toEqual([role, 200, [[deskEditor.name, 'editor']]])
    }
  })

  it('a reporter sees their desk editor and approver by name on their own story', async () => {
    const r = await rest('GET', `/api/articles/${storyId}?depth=1&draft=true`, { cookie: cookies.reporter })
    expect(r.status).toBe(200)
    for (const field of ['deskEditor', 'approvedBy'] as const) {
      expect([field, r.json[field]?.name, r.json[field]?.role]).toEqual([field, deskEditor.name, 'editor'])
      expect([field, r.json[field]?.email ?? null]).toEqual([field, null])
    }
  })

  it('a disabled account and an anonymous visitor read nobody', async () => {
    const payload = await testPayload()
    const cookie = await cookieOf(disabled)
    await payload.update({ collection: 'users', id: disabled.id, data: { active: false }, overrideAccess: true })
    const r = await rest('GET', `/api/users/${colleague.id}?depth=0`, { cookie })
    expect(r.json?.name ?? null).toBeNull()
    const anonymous = await rest('GET', `/api/users?depth=0`)
    expect(anonymous.status === 403 || (anonymous.json.docs ?? []).length === 0).toBe(true)
    await expect(payload.find({ collection: 'users', overrideAccess: false })).rejects.toMatchObject({ status: 403 })
  })
})

describe('nothing else about a colleague is widened', () => {
  it('reporter and commercial get no personal, status or preference field', async () => {
    for (const role of ['reporter', 'commercial'] as const) {
      const r = await rest('GET', `/api/users/${colleague.id}?depth=0`, { cookie: cookies[role] })
      for (const field of [...PERSONAL, ...ACCOUNT]) expect([role, field, r.json[field] ?? null]).toEqual([role, field, null])
      expect([role, interestRows(r.json.declaredInterests)]).toEqual([role, []])
    }
  })

  it('an editor keeps what the desk saw before (status and preferences), not the personal fields', async () => {
    const r = await rest('GET', `/api/users/${colleague.id}?depth=0`, { cookie: cookies.editor })
    for (const field of PERSONAL) expect([field, r.json[field] ?? null]).toEqual([field, null])
    expect(interestRows(r.json.declaredInterests)).toEqual([])
    expect(r.json.active).toBe(true)
    expect(r.json.preferredContentLocale).toBe('uz')
  })

  it('the editor-in-chief and admin still read the personal fields; everyone reads their own', async () => {
    for (const role of ['eic', 'admin'] as const) {
      const r = await rest('GET', `/api/users/${colleague.id}?depth=0`, { cookie: cookies[role] })
      expect([role, r.json.email, r.json.telegramUserId, Boolean(r.json.updatedAt)]).toEqual([role, colleague.email, '123456789', true])
    }
    for (const role of ROLES) {
      const r = await rest('GET', `/api/users/${staff[role]!.id}?depth=0`, { cookie: cookies[role] })
      expect([role, r.json.email, r.json.active, Boolean(r.json.lastLoginAt)]).toEqual([role, staff[role]!.email, true, true])
    }
  })

  it('a reporter cannot find colleagues by a hidden field (no enumeration through where)', async () => {
    for (const where of [
      `where[email][like]=${encodeURIComponent('dir-colleague')}`,
      `where[telegramUserId][exists]=true`,
      `where[lastLoginCountry][equals]=UZ`,
      `where[active][equals]=true`,
      `where[updatedAt][greater_than]=2000-01-01`,
      `where[declaredInterests.note][like]=maxfiy`,
    ]) {
      const r = await rest('GET', `/api/users?depth=0&limit=200&${where}`, { cookie: cookies.reporter })
      const others = (r.json.docs ?? []).filter((d: Doc) => String(d.id) !== String(staff.reporter!.id))
      expect([where, r.status === 400 || r.status === 403 || others.length === 0]).toEqual([where, true])
    }
  })

  it('writes are unchanged: a reporter cannot change a colleague', async () => {
    const r = await rest('PATCH', `/api/users/${colleague.id}`, { cookie: cookies.reporter, body: { name: 'Boshqa ism' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const payload = await testPayload()
    expect((await payload.findByID({ collection: 'users', id: colleague.id, overrideAccess: true })).name).toBe(colleague.name)
  })
})
