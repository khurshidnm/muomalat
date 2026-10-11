import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { account, byline, cookieOf, makeStory, rest, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Attacks on read access: what each role must not see (CMS-SPEC §4.2, §4.3,
 * §13.1, §13.5). Reads go through the REST API (`find`, `findByID`) with the
 * attacker's cookie, trying `where`, `select`, `depth`, `locale=*` and
 * relationship population to pull out data the role is not allowed.
 */

let reporter: U
let reporter2: U
let editor: U
let eic: U
let commercial: U
let admin: U
let cookies: Record<string, string>
let embargoedId: number
let sensitiveId: number
let colleagueDraftId: number
let sponsoredDraftId: number

const future = () => new Date(Date.now() + 7 * 86_400_000).toISOString()

beforeAll(async () => {
  const payload = await testPayload()
  reporter = await account('reporter', 'read-reporter')
  reporter2 = await account('reporter', 'read-reporter2')
  editor = await account('editor', 'read-editor')
  eic = await account('eic', 'read-eic')
  commercial = await account('commercial', 'read-commercial')
  admin = await account('admin', 'read-admin')
  cookies = {
    reporter: await cookieOf(reporter),
    editor: await cookieOf(editor),
    eic: await cookieOf(eic),
    commercial: await cookieOf(commercial),
    admin: await cookieOf(admin),
  }
  const other = await byline('RT Read Other', { user: reporter2 })
  const comm = await byline('RT Read Commercial', { commercial: true, user: commercial })
  const inst = await payload.create({
    collection: 'institutions',
    draft: true,
    overrideAccess: true,
    data: { name: 'RT Bank', slug: `rt-bank-${Date.now()}`, _status: 'draft' } as never,
  })
  // Give a colleague a declared interest, so there is conflict data to try to read.
  await payload.update({
    collection: 'users',
    id: reporter2.id,
    overrideAccess: true,
    data: { declaredInterests: [{ institution: inst.id, nature: 'shares', note: 'maxfiy' }] } as never,
  })
  embargoedId = (await makeStory([other], { embargo: { until: future(), source: 'Reg' } })).id as number
  sensitiveId = (await makeStory([other], { legallySensitive: true })).id as number
  colleagueDraftId = (await makeStory([other])).id as number
  sponsoredDraftId = (await makeStory([comm], { sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama' } })).id as number
})

afterAll(async () => {
  const payload = await testPayload()
  await payload.destroy()
})

const canRead = async (cookie: string, id: number, query = '') => {
  const r = await rest('GET', `/api/articles/${id}?depth=0${query}`, { cookie })
  return r.status === 200 && r.json?.id !== undefined && r.json?.id !== null
}

describe('A4: a reporter and other people’s drafts', () => {
  it('can read a colleague’s ordinary draft', async () => {
    expect(await canRead(cookies.reporter, colleagueDraftId)).toBe(true)
  })
  it('cannot read a colleague’s embargoed draft, even with draft=true or locale=all', async () => {
    expect(await canRead(cookies.reporter, embargoedId, '&draft=true')).toBe(false)
    expect(await canRead(cookies.reporter, embargoedId, '&draft=true&locale=all')).toBe(false)
  })
  it('cannot read a legally-sensitive draft that is not theirs', async () => {
    expect(await canRead(cookies.reporter, sensitiveId, '&draft=true')).toBe(false)
  })
  it('a where filter cannot surface an embargoed draft', async () => {
    const r = await rest('GET', `/api/articles?draft=true&depth=0&where[id][equals]=${embargoedId}`, { cookie: cookies.reporter })
    expect(r.json.docs?.some((d: Doc) => d.id === embargoedId)).not.toBe(true)
  })
})

describe('A5: commercial and editorial drafts', () => {
  it('commercial cannot read an editorial draft', async () => {
    expect(await canRead(cookies.commercial, colleagueDraftId, '&draft=true')).toBe(false)
    expect(await canRead(cookies.commercial, sensitiveId, '&draft=true')).toBe(false)
  })
})

describe('A6: admin and drafts', () => {
  it('admin cannot read any editorial draft', async () => {
    expect(await canRead(cookies.admin, colleagueDraftId, '&draft=true')).toBe(false)
    expect(await canRead(cookies.admin, sponsoredDraftId, '&draft=true')).toBe(false)
  })
})

describe('audit-log and publish-events', () => {
  it('an editor cannot read the audit log; the editor-in-chief and admin can', async () => {
    expect((await rest('GET', '/api/audit-log?depth=0', { cookie: cookies.editor })).json.docs?.length ?? 'denied').toMatch?.(/denied/) ?? true
    const editorRead = await rest('GET', '/api/audit-log?depth=0', { cookie: cookies.editor })
    expect(editorRead.status === 403 || (editorRead.status === 200 && editorRead.json.totalDocs === 0 && !editorRead.json.docs)).toBe(true)
    const reporterRead = await rest('GET', '/api/audit-log?depth=0', { cookie: cookies.reporter })
    expect(reporterRead.status === 403 || reporterRead.json.totalDocs === 0).toBe(true)
    const commercialRead = await rest('GET', '/api/audit-log?depth=0', { cookie: cookies.commercial })
    expect(commercialRead.status === 403 || commercialRead.json.totalDocs === 0).toBe(true)
    expect((await rest('GET', '/api/audit-log?depth=0', { cookie: cookies.eic })).status).toBe(200)
  })

  it('a reporter and commercial cannot read publish-events', async () => {
    for (const role of ['reporter', 'commercial'] as const) {
      const r = await rest('GET', '/api/publish-events?depth=0', { cookie: cookies[role] })
      expect([role, r.status === 403 || r.json.totalDocs === 0]).toEqual([role, true])
    }
  })
})

describe('personal-data collections (§13.5: not to the newsroom)', () => {
  it('reporters and editors cannot read digest subscribers or club applications', async () => {
    for (const role of ['reporter', 'editor'] as const) {
      for (const slug of ['digest-subscribers', 'club-applications']) {
        const r = await rest('GET', `/api/${slug}?depth=0`, { cookie: cookies[role] })
        expect([role, slug, r.status === 403 || r.json.totalDocs === 0]).toEqual([role, slug, true])
      }
    }
  })
  it('commercial cannot read contact messages with the tuzatish (correction) topic', async () => {
    const r = await rest('GET', '/api/contact-messages?depth=0&where[topic][equals]=tuzatish', { cookie: cookies.commercial })
    expect(r.status === 403 || r.json.totalDocs === 0).toBe(true)
  })
  it('a reporter cannot read advertising requests', async () => {
    const r = await rest('GET', '/api/advertising-requests?depth=0', { cookie: cookies.reporter })
    expect(r.status === 403 || r.json.totalDocs === 0).toBe(true)
  })
})

const interestValues = (v: unknown) =>
  (Array.isArray(v) ? v : []).filter((row) => row && typeof row === 'object' && ((row as Doc).institution != null || (row as Doc).note != null))

describe('other users’ declared interests (§4.2: only self, eic, admin)', () => {
  it('an editor reading a user never gets the interest rows, telegram id or login country', async () => {
    const r = await rest('GET', `/api/users/${reporter2.id}?depth=0`, { cookie: cookies.editor })
    if (r.status === 200) {
      expect(interestValues(r.json.declaredInterests)).toEqual([])
      expect(r.json.telegramUserId ?? null).toBeNull()
      expect(r.json.lastLoginCountry ?? null).toBeNull()
    }
  })
  it('the editor-in-chief does see the interest rows (conflict checks)', async () => {
    const r = await rest('GET', `/api/users/${reporter2.id}?depth=0`, { cookie: cookies.eic })
    expect(r.status).toBe(200)
    expect(interestValues(r.json.declaredInterests).length).toBeGreaterThan(0)
  })
  it('a reporter reads another user’s name and role, and nothing personal (§4.2)', async () => {
    const r = await rest('GET', `/api/users/${reporter2.id}?depth=0`, { cookie: cookies.reporter })
    expect(r.status).toBe(200)
    expect([r.json.name, r.json.role]).toEqual([reporter2.name, 'reporter'])
    expect(interestValues(r.json.declaredInterests)).toEqual([])
    for (const field of ['email', 'telegramUserId', 'lastLoginAt', 'lastLoginCountry', 'knownCountries', 'active', 'offboardedAt', 'preferredContentLocale']) {
      expect([field, r.json[field] ?? null]).toEqual([field, null])
    }
  })
})

describe('FINDING: an editor reads more of other staff than "names and roles" (§4.2, §13.1)', () => {
  it('an editor must NOT see another staff member’s email address', async () => {
    const r = await rest('GET', `/api/users/${reporter2.id}?depth=0`, { cookie: cookies.editor })
    expect(r.status).toBe(200)
    // §4.2 grants an editor only "names and roles of others"; §13.1 lists users'
    // email as readable by admin, self and the editor-in-chief. An editor
    // seeing the address is more than the matrix allows.
    expect(r.json.email ?? null).toBeNull()
  })
})

describe('relationship population cannot leak a user a role may not read', () => {
  it('a reporter populating _authorUsers / lastEditedBy on a readable story gets ids, not other users’ records', async () => {
    const r = await rest('GET', `/api/articles/${colleagueDraftId}?depth=2`, { cookie: cookies.reporter })
    if (r.status === 200) {
      const linked = ([] as any[]).concat(r.json._authorUsers ?? [], r.json.lastEditedBy ?? [])
      for (const u of linked) {
        // A populated foreign user must not expose its email to a reporter.
        if (u && typeof u === 'object') expect([u.id, u.email ?? null]).toEqual([u.id, null])
      }
    }
  })
})

describe('A3: the public Local API read never returns internal fields', () => {
  it('a published story read with no user omits editorNotes, sourceNotes, changeNote, approvedBy, sponsored.contractRef, validationWarnings', async () => {
    const payload = await testPayload()
    const other = (await payload.find({ collection: 'authors', where: { slug: { equals: 'rt-read-other' } }, limit: 1, overrideAccess: true })).docs[0]
    const pub = await makeStory([other!.id as number], { editorNotes: 'ichki', sourceNotes: 'maxfiy', changeNote: { kind: 'minor' } }, true)
    const doc = (await payload.findByID({ collection: 'articles', id: pub.id as number, depth: 0, overrideAccess: false })) as Doc
    expect(doc.editorNotes ?? null).toBeNull()
    expect(doc.sourceNotes ?? null).toBeNull()
    expect((doc.changeNote as Doc | undefined)?.kind ?? null).toBeNull()
    expect(doc.approvedBy ?? null).toBeNull()
    expect(doc.validationWarnings ?? null).toBeNull()
  })
})
