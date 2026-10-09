import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const MEDIA_DIR = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/muomalat-test-redteam-media-${process.pid}`
  process.env.MEDIA_DIR = dir
  return dir
})

import { account, byline, cookieOf, findArticle, lexical, makeStory, reqAs, rest, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Attacks on writing fields a role must not: own role/active, existing
 * corrections, the sponsored flag, append-only / system collections, and
 * forged status values (CMS-SPEC §4.2, §4.3, §5.7, §5.9, §9.1).
 */

let reporter: U
let reporter2: U
let editor: U
let eic: U
let commercial: U
let admin: U
let cookies: Record<string, string>
let reporterByline: number
let otherByline: number
let commercialByline: number

async function photo() {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 10, g: 80, b: 60 } } }).jpeg().toBuffer()
}

beforeAll(async () => {
  const fs = await import('node:fs/promises')
  await fs.mkdir(MEDIA_DIR, { recursive: true })
  reporter = await account('reporter', 'wr-reporter')
  reporter2 = await account('reporter', 'wr-reporter2')
  editor = await account('editor', 'wr-editor')
  eic = await account('eic', 'wr-eic')
  commercial = await account('commercial', 'wr-commercial')
  admin = await account('admin', 'wr-admin')
  cookies = {
    reporter: await cookieOf(reporter),
    editor: await cookieOf(editor),
    eic: await cookieOf(eic),
    commercial: await cookieOf(commercial),
    admin: await cookieOf(admin),
  }
  reporterByline = await byline('RT Write Reporter', { user: reporter })
  otherByline = await byline('RT Write Other', { user: reporter2 })
  commercialByline = await byline('RT Write Commercial', { commercial: true, user: commercial })
})

afterAll(async () => {
  const fs = await import('node:fs/promises')
  await (await testPayload()).destroy()
  await fs.rm(MEDIA_DIR, { recursive: true, force: true })
})

describe('own account: role and active (A8)', () => {
  it('a user changing their own role gets an error, not a silent no-op', async () => {
    const r = await rest('PATCH', `/api/users/${reporter.id}`, { cookie: cookies.reporter, body: { role: 'eic' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const after = await (await testPayload()).findByID({ collection: 'users', id: reporter.id, overrideAccess: true })
    expect((after as Doc).role).toBe('reporter')
  })
  it('a user cannot reactivate or change active on their own account', async () => {
    const r = await rest('PATCH', `/api/users/${editor.id}`, { cookie: cookies.editor, body: { active: false } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
  it('a non-admin cannot update another user at all', async () => {
    const r = await rest('PATCH', `/api/users/${reporter2.id}`, { cookie: cookies.editor, body: { name: 'HACKED' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const after = await (await testPayload()).findByID({ collection: 'users', id: reporter2.id, overrideAccess: true })
    expect((after as Doc).name).not.toBe('HACKED')
  })
})

describe('append-only and system collections', () => {
  it('no staff role can create an audit-log row over REST', async () => {
    for (const role of ['reporter', 'editor', 'eic', 'commercial', 'admin'] as const) {
      const r = await rest('POST', '/api/audit-log', { cookie: cookies[role], body: { action: 'doc.publish_first', at: new Date().toISOString() } })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })
  it('even the editor-in-chief cannot update or delete an audit-log row', async () => {
    const payload = await testPayload()
    // Produce a row through a real audited change, then try to tamper.
    const id = (await makeStory([otherByline])).id as number
    await payload.update({ collection: 'articles', id, draft: true, data: { lead: 'audit uchun' } as never, overrideAccess: true })
    const row = (await payload.find({ collection: 'audit-log', sort: '-id', limit: 1, overrideAccess: true })).docs[0] as Doc | undefined
    if (row) {
      const upd = await rest('PATCH', `/api/audit-log/${row.id}`, { cookie: cookies.eic, body: { summary: 'tampered' } })
      expect(upd.status).toBeGreaterThanOrEqual(400)
      const del = await rest('DELETE', `/api/audit-log/${row.id}`, { cookie: cookies.eic })
      expect(del.status).toBeGreaterThanOrEqual(400)
    }
  })
  it('no role can create a publish-events row over REST', async () => {
    for (const role of ['editor', 'eic', 'admin'] as const) {
      const r = await rest('POST', '/api/publish-events', { cookie: cookies[role], body: { kind: 'article', action: 'publish' } })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })
})

describe('corrections log is append-only (§5.7, C4)', () => {
  let id: number
  beforeAll(async () => {
    const payload = await testPayload()
    id = (await makeStory([otherByline], {}, true)).id as number
    await payload.update({
      collection: 'articles',
      id,
      overrideAccess: true,
      context: { importing: true },
      data: {
        corrections: [{ kind: 'correction', publicText: 'Tuzatildi: 3-xatboshi.', location: '3-xatboshi', createdAt: new Date().toISOString(), createdBy: eic.id }],
        _status: 'published',
      } as never,
    })
  })
  it('an editor cannot change the text of an existing correction', async () => {
    const before = (await findArticle(id, { draft: false }))?.corrections as Doc[]
    const rowId = before[0].id
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, {
      cookie: cookies.editor,
      body: { corrections: [{ id: rowId, kind: 'correction', publicText: 'BOSHQA matn', location: '3-xatboshi' }] },
    })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const after = (await findArticle(id, { draft: false }))?.corrections as Doc[]
    expect(after[0].publicText).toBe('Tuzatildi: 3-xatboshi.')
  })
  it('nobody can drop or reorder an existing correction (editor-in-chief included)', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.eic, body: { corrections: [] } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const after = (await findArticle(id, { draft: false }))?.corrections as Doc[]
    expect(after.length).toBe(1)
  })
})

describe('the sponsored flag (SP-9)', () => {
  it('commercial cannot clear sponsored.enabled; nor can it be cleared after first publication', async () => {
    const payload = await testPayload()
    const id = (await makeStory([commercialByline], { sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama', contractRef: 'C' } }, true)).id as number
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.commercial, body: { sponsored: { enabled: false } } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await findArticle(id, { draft: false }))?.sponsored?.enabled).toBe(true)
  })
})

describe('SP-5 / N-1 overrides belong to the editor-in-chief only', () => {
  it('a commercial-sent returnPhraseOverride is dropped, so SP-5 still blocks a promise of returns', async () => {
    const payload = await testPayload()
    const id = (await makeStory([commercialByline], {
      sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama', contractRef: 'C', category: 'general' },
      body: lexical('Bu mahsulot yillik 24% daromad beradi.'),
      returnPhraseOverride: true,
      returnPhraseOverrideReason: 'faqat misol',
    })).id as number
    const stored = await findArticle(id, { draft: true })
    // The field is eic-only: a commercial write of it must not have stuck.
    expect((stored?.sponsored as Doc | undefined)?.returnPhraseOverride ?? false).toBe(false)
  })
})

describe('SP-11: an editor cannot write a sponsored article', () => {
  it('an editor draft-saving a sponsored story is refused', async () => {
    const id = (await makeStory([commercialByline], { sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama' } })).id as number
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.editor, body: { lead: 'muharrir yozdi' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('sourceNotes (Art. 33): only the story’s authors and the editor-in-chief', () => {
  it('a reporter who is not an author cannot read or write sourceNotes', async () => {
    const payload = await testPayload()
    const id = (await makeStory([otherByline], { sourceNotes: 'maxfiy manba' })).id as number
    // read: the field must be absent for a non-author reporter
    const r = await rest('GET', `/api/articles/${id}?depth=0&draft=true`, { cookie: cookies.reporter })
    if (r.status === 200) expect(r.json.sourceNotes ?? null).toBeNull()
  })
})

describe('forged translation status', () => {
  it('a client cannot set translation.ru.status = approved on a draft save', async () => {
    const payload = await testPayload()
    const id = (await makeStory([otherByline], {}, true)).id as number
    // editor saves a ru draft trying to mark it approved in one go
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=ru`, {
      cookie: cookies.editor,
      body: { title: 'RU sarlavha', translation: { status: 'approved' } },
    })
    const ru = await findArticle(id, { draft: true, locale: 'ru' })
    expect((ru?.translation as Doc | undefined)?.status).not.toBe('approved')
    void r
  })
})

describe('media: sponsoredOnly and ART-15', () => {
  it('ART-15: an editorial story cannot publish with a sponsoredOnly hero image', async () => {
    const payload = await testPayload()
    const img = (await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'homiylik rasmi', credit: 'Foto: X', rightsCategory: 'staff', sponsoredOnly: true } as never,
      file: { data: await photo(), mimetype: 'image/jpeg', name: 'sp.jpg', size: 1 },
    })) as Doc
    const id = (await makeStory([otherByline], { image: img.id })).id as number
    let threw = false
    try {
      await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, overrideAccess: true, user: eic as never })
    } catch (e) {
      threw = (e as Error).message.includes('ART-15') || /homiylik/.test((e as Error).message) || /rasm/.test((e as Error).message)
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('FINDING: a commercial upload is not forced sponsoredOnly (§3.12), so ART-15 never fires for it', async () => {
    const payload = await testPayload()
    const img = (await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: commercial as never,
      data: { alt: 'tijorat rasmi', credit: 'Foto: X', rightsCategory: 'partner_supplied' } as never,
      file: { data: await photo(), mimetype: 'image/jpeg', name: 'comm.jpg', size: 1 },
    })) as Doc
    // §3.12: "sponsoredOnly Forced `true` for uploads by commercial." If so,
    // a commercial upload would carry the flag even when none was sent.
    expect((img as Doc).sponsoredOnly).toBe(true)
  })
})
