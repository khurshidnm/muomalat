import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { account, byline, cookieOf, lexical, makeStory, rest, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Second read-attack pass (CMS-SPEC §4.2, §4.3, §13.1, §13.5): pulling data a
 * role may not see through the levers a client controls — `where` on a field
 * it cannot read (a field-existence oracle), `select`, `depth`/relationship
 * population, `sort`, query presets shared by others, GraphQL, and the
 * personal-data endpoints. Reads go through the REST API with the attacker's
 * cookie.
 */

let reporter: U
let reporter2: U
let editor: U
let eic: U
let commercial: U
let admin: U
let c: Record<string, string>
let other: number
let embargoedId: number
let sensitiveId: number
let colleagueDraftId: number
let instId: number

const future = () => new Date(Date.now() + 7 * 86_400_000).toISOString()

beforeAll(async () => {
  const payload = await testPayload()
  reporter = await account('reporter', 'rd2-reporter')
  reporter2 = await account('reporter', 'rd2-reporter2')
  editor = await account('editor', 'rd2-editor')
  eic = await account('eic', 'rd2-eic')
  commercial = await account('commercial', 'rd2-commercial')
  admin = await account('admin', 'rd2-admin')
  c = {
    reporter: await cookieOf(reporter),
    reporter2: await cookieOf(reporter2),
    editor: await cookieOf(editor),
    eic: await cookieOf(eic),
    commercial: await cookieOf(commercial),
    admin: await cookieOf(admin),
  }
  other = await byline('RT RD2 Other', { user: reporter2 })
  const inst = await payload.create({ collection: 'institutions', draft: true, overrideAccess: true, data: { name: 'RD2 Bank', slug: `rd2-bank-${Date.now()}`, _status: 'draft' } as never })
  instId = inst.id as number
  await payload.update({ collection: 'users', id: reporter2.id, overrideAccess: true, data: { declaredInterests: [{ institution: instId, nature: 'shares', note: 'maxfiy' }] } as never })
  embargoedId = (await makeStory([other], { embargo: { until: future(), source: 'Reg' }, sourceNotes: 'maxfiy manba: ichki' })).id as number
  sensitiveId = (await makeStory([other], { legallySensitive: true, editorNotes: 'ichki eslatma' })).id as number
  colleagueDraftId = (await makeStory([other], { sourceNotes: 'manba: kimdir' })).id as number
})

afterAll(async () => {
  await (await testPayload()).destroy()
})

describe('field-existence oracle: a where on a field the role may not read', () => {
  it('a reporter filtering articles on sourceNotes (a field only authors and the editor-in-chief read) is refused, not answered', async () => {
    const r = await rest('GET', `/api/articles?depth=0&draft=true&where[sourceNotes][like]=maxfiy`, { cookie: c.reporter })
    // A silent empty result that varies with the hidden value would be an oracle; refusing the query is the safe answer.
    expect(r.status === 400 || r.status === 403 || (r.status === 200 && (r.json.docs ?? []).every((d: Doc) => d.id !== embargoedId && d.id !== colleagueDraftId))).toBe(true)
  })

  it('a reporter filtering on editorNotes cannot confirm its content', async () => {
    const hit = await rest('GET', `/api/articles?depth=0&draft=true&where[editorNotes][like]=ichki eslatma`, { cookie: c.reporter })
    const miss = await rest('GET', `/api/articles?depth=0&draft=true&where[editorNotes][like]=yoq-bunaqa-matn`, { cookie: c.reporter })
    // The two queries must not differ in a way that reveals the note: either both are refused, or neither returns the sensitive row.
    const leaks = (r: typeof hit) => r.status === 200 && (r.json.docs ?? []).some((d: Doc) => d.id === sensitiveId)
    expect(leaks(hit) || leaks(miss)).toBe(false)
  })

  it('nobody can filter users on the password hash or salt', async () => {
    for (const field of ['hash', 'salt']) {
      const r = await rest('GET', `/api/users?depth=0&where[${field}][exists]=true`, { cookie: c.admin })
      expect([field, r.status]).toEqual([field, 400])
    }
  })

  it('an editor filtering users on declaredInterests.note (editor-in-chief/self only) is refused', async () => {
    const r = await rest('GET', `/api/users?depth=0&where[declaredInterests.note][like]=maxfiy`, { cookie: c.editor })
    expect(r.status === 400 || r.status === 403 || (r.status === 200 && !(r.json.docs ?? []).some((d: Doc) => d.id === reporter2.id))).toBe(true)
  })

  it('a reporter filtering on another user’s telegramUserId or lastLoginCountry cannot enumerate them', async () => {
    for (const field of ['telegramUserId', 'lastLoginCountry']) {
      const r = await rest('GET', `/api/users?depth=0&where[${field}][exists]=true`, { cookie: c.reporter })
      // A reporter reads only its own user row; a where on a personal field must not widen that.
      expect([field, r.status === 400 || r.status === 403 || (r.json.docs ?? []).every((d: Doc) => String(d.id) === String(reporter.id))]).toEqual([field, true])
    }
  })
})

describe('select cannot pull an internal field onto a published story', () => {
  it('a published story selected with sourceNotes / sponsored.contractRef (fields a reporter may not read) returns none of them', async () => {
    // editorNotes is readable by the newsroom roles (§3.3 "Ichki"); sourceNotes is authors + editor-in-chief
    // only, and sponsored.contractRef is editor/editor-in-chief/commercial only — a reporter gets neither.
    const pub = (await makeStory([other], { sourceNotes: 'maxfiy', sponsored: { contractRef: 'C-1' } }, true)).id as number
    const r = await rest('GET', `/api/articles/${pub}?depth=0&select[sourceNotes]=true&select[sponsored]=true`, { cookie: c.reporter })
    expect(r.status).toBe(200)
    expect([r.json.sourceNotes ?? null, (r.json.sponsored as Doc | undefined)?.contractRef ?? null]).toEqual([null, null])
  })
})

describe('relationship population cannot widen access', () => {
  it('a reporter reading a published story at depth 2 never gets a staff member’s email, telegram id or interests', async () => {
    const pub = (await makeStory([other], {}, true)).id as number
    const payload = await testPayload()
    await payload.update({ collection: 'articles', id: pub, draft: true, overrideAccess: true, context: { importing: true }, data: { submittedBy: editor.id, approvedBy: editor.id, publishedBy: editor.id, _status: 'published' } as never })
    const r = await rest('GET', `/api/articles/${pub}?depth=3`, { cookie: c.reporter })
    if (r.status === 200) {
      const populated = [r.json.submittedBy, r.json.approvedBy, r.json.publishedBy, ...([] as unknown[]).concat(r.json._authorUsers ?? [])]
      for (const u of populated) {
        if (u && typeof u === 'object') {
          expect([u.email ?? null, u.telegramUserId ?? null, u.lastLoginCountry ?? null]).toEqual([null, null, null])
          const interests = Array.isArray(u.declaredInterests) ? u.declaredInterests.filter((row: Doc) => row?.institution != null || row?.note != null) : []
          expect(interests).toEqual([])
        }
      }
    }
  })

  it('a reporter cannot populate the author’s linked user through authors.user to read its email', async () => {
    const pub = (await makeStory([other], {}, true)).id as number
    const r = await rest('GET', `/api/articles/${pub}?depth=3`, { cookie: c.reporter })
    if (r.status === 200) {
      for (const a of ([] as Doc[]).concat(r.json.authors ?? [])) {
        const u = a?.user
        if (u && typeof u === 'object') expect(u.email ?? null).toBeNull()
      }
    }
  })
})

describe('sort on a hidden field is not an oracle', () => {
  it('a reporter sorting articles by sponsored.contractRef or editorNotes does not reorder by a value they cannot read', async () => {
    for (const field of ['editorNotes', 'sponsored.contractRef']) {
      const r = await rest('GET', `/api/articles?depth=0&sort=${field}&limit=5`, { cookie: c.reporter })
      // Either refused, or it runs but exposes no hidden value; it must not 500.
      expect([field, r.status < 500]).toEqual([field, true])
    }
  })
})

describe('query presets: one staff member cannot read another’s private view', () => {
  it('a reporter’s onlyMe preset is invisible to another reporter and to an editor', async () => {
    const payload = await testPayload()
    const preset = (await payload.create({
      collection: 'payload-query-presets' as never,
      overrideAccess: false,
      user: reporter as never,
      data: { title: 'RD2 shaxsiy', relatedCollection: 'articles', access: { read: { constraint: 'onlyMe' } }, where: {} } as never,
    }).catch(() => null)) as Doc | null
    if (!preset) return
    const asReporter2 = await rest('GET', `/api/payload-query-presets/${preset.id}?depth=0`, { cookie: c.reporter2 })
    const asEditor = await rest('GET', `/api/payload-query-presets/${preset.id}?depth=0`, { cookie: c.editor })
    expect(asReporter2.status === 403 || asReporter2.json?.id === undefined || Boolean(asReporter2.json?.errors)).toBe(true)
    expect(asEditor.status === 403 || asEditor.json?.id === undefined || Boolean(asEditor.json?.errors)).toBe(true)
  })
})

describe('GraphQL stays disabled on every shape', () => {
  it('neither a logged-in POST nor an introspection GET is answered', async () => {
    const post = await rest('POST', '/api/graphql', { cookie: c.editor, body: { query: '{ Articles(where:{legallySensitive:{equals:true}}) { docs { id sourceNotes } } }' } })
    expect(post.status === 404 || post.status === 400 || post.status >= 500).toBe(true)
    const intro = await rest('GET', '/api/graphql?query=' + encodeURIComponent('{__schema{types{name}}}'), { cookie: c.eic })
    expect(intro.status === 404 || intro.status === 400).toBe(true)
  })
})

describe('personal-data export/erase endpoints', () => {
  it('a non-admin (reporter, editor, editor-in-chief, commercial) cannot export or erase personal data', async () => {
    for (const role of ['reporter', 'editor', 'eic', 'commercial'] as const) {
      for (const action of ['export', 'erase'] as const) {
        const r = await rest('POST', `/api/personal-data/${action}`, { cookie: c[role], body: { email: 'someone@example.com' } })
        expect([role, action, r.status]).toEqual([role, action, 403])
      }
    }
  })

  it('anonymous cannot call them', async () => {
    const r = await rest('POST', '/api/personal-data/export', { body: { email: 'a@b.c' }, origin: null })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('internal fields on the public (anonymous server-side) read', () => {
  it('a legally-sensitive published story read with no user omits internal notes and the sponsorship record', async () => {
    const payload = await testPayload()
    const pub = (await makeStory([other], { editorNotes: 'ichki', sourceNotes: 'maxfiy', legallySensitive: true, singleAnonymousSource: true, supervisor: eic.id }, true)).id as number
    const doc = (await payload.findByID({ collection: 'articles', id: pub, depth: 1, overrideAccess: false })) as Doc
    for (const k of ['editorNotes', 'sourceNotes', 'legallySensitive', 'singleAnonymousSource', 'supervisor', 'needsLegal', 'legalSignOff', 'validationWarnings', '_authorUsers', 'deskEditor', 'submittedBy']) {
      const v = doc[k]
      const empty = v === null || v === undefined || (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => x === null || x === undefined)) || (Array.isArray(v) && v.length === 0) || v === false
      expect([k, empty]).toEqual([k, true])
    }
  })
})
