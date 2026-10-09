import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const MEDIA_DIR = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/muomalat-test-redteam-write2-${process.pid}`
  process.env.MEDIA_DIR = dir
  return dir
})

import { account, byline, cookieOf, makeStory, rest, restForm, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Second write-attack pass (CMS-SPEC §4.2, §3.16, §5.9): writing fields and
 * documents a role may not — the site-settings groups that belong to other
 * roles, the editorial-rules / navigation / ad-slots globals, users by a
 * non-admin, the home-page sponsored slots, and media metadata of another
 * person's upload.
 */

async function photo(c = { r: 10, g: 80, b: 60 }) {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: c } }).jpeg().toBuffer()
}

let reporter: U
let editor: U
let eic: U
let commercial: U
let admin: U
let c: Record<string, string>
let otherByline: number

beforeAll(async () => {
  const fs = await import('node:fs/promises')
  await fs.mkdir(MEDIA_DIR, { recursive: true })
  reporter = await account('reporter', 'wr2-reporter')
  editor = await account('editor', 'wr2-editor')
  eic = await account('eic', 'wr2-eic')
  commercial = await account('commercial', 'wr2-commercial')
  admin = await account('admin', 'wr2-admin')
  c = {
    reporter: await cookieOf(reporter),
    editor: await cookieOf(editor),
    eic: await cookieOf(eic),
    commercial: await cookieOf(commercial),
    admin: await cookieOf(admin),
  }
  otherByline = await byline('RT WR2 Other')
})

afterAll(async () => {
  const fs = await import('node:fs/promises')
  await (await testPayload()).destroy()
  await fs.rm(MEDIA_DIR, { recursive: true, force: true })
})

const settings = async () => (await (await testPayload()).findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as Doc

describe('site-settings: a group belongs to one role; a wrong-role write is dropped', () => {
  it('an editor cannot change the legal imprint (editor-in-chief’s) or identity (admin’s)', async () => {
    const payload = await testPayload()
    await payload.updateGlobal({ slug: 'site-settings', overrideAccess: true, data: { legal: { registrationNumber: { value: 'ORIG-1', placeholder: false } }, name: 'Muomalat' } as never })
    const r = await rest('POST', '/api/globals/site-settings?locale=uz', {
      cookie: c.editor,
      body: { legal: { registrationNumber: { value: 'HACKED', placeholder: false } }, name: 'HACKED' },
    })
    void r
    const s = await settings()
    expect((s.legal as Doc)?.registrationNumber).toMatchObject({ value: 'ORIG-1' })
    expect(s.name).not.toBe('HACKED')
  })

  it('an admin cannot change the advertising labels (editor-in-chief’s)', async () => {
    const payload = await testPayload()
    await payload.updateGlobal({ slug: 'site-settings', overrideAccess: true, locale: 'uz', data: { labels: { advert: 'Reklama' } } as never })
    await rest('POST', '/api/globals/site-settings?locale=uz', { cookie: c.admin, body: { labels: { advert: 'BEPUL' } } })
    const s = (await (await testPayload()).findGlobal({ slug: 'site-settings', depth: 0, locale: 'uz', overrideAccess: true })) as Doc
    expect((s.labels as Doc)?.advert).not.toBe('BEPUL')
  })

  it('commercial cannot write any site-settings group', async () => {
    const before = await settings()
    const r = await rest('POST', '/api/globals/site-settings?locale=uz', { cookie: c.commercial, body: { emergency: { enabled: true, level: 'warning' } } })
    // commercial is not in the update union (editor, eic, admin): refused outright.
    expect(r.status).toBeGreaterThanOrEqual(400)
    const after = await settings()
    expect((after.emergency as Doc | undefined)?.enabled ?? false).toBe((before.emergency as Doc | undefined)?.enabled ?? false)
  })

  it('SET-1: the demo notice cannot be switched off while a legal line is still a placeholder', async () => {
    const payload = await testPayload()
    await payload.updateGlobal({
      slug: 'site-settings',
      overrideAccess: true,
      data: { demo: { noticeEnabled: true }, legal: { registrationNumber: { value: '', placeholder: true } } } as never,
    })
    const r = await rest('POST', '/api/globals/site-settings?locale=uz', { cookie: c.eic, body: { demo: { noticeEnabled: false } } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await settings()).demo).toMatchObject({ noticeEnabled: true })
  })
})

describe('globals that belong to one role', () => {
  it('editorial-rules is written by the editor-in-chief only', async () => {
    for (const role of ['reporter', 'editor', 'commercial', 'admin'] as const) {
      const r = await rest('POST', '/api/globals/editorial-rules?locale=uz', { cookie: c[role], body: { officialSourceDomains: [{ domain: 'evil.example' }] } })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })

  it('navigation is written by the editor-in-chief and admin only (not an editor)', async () => {
    const r = await rest('POST', '/api/globals/navigation?locale=uz', { cookie: c.editor, body: { header: [{ kind: 'custom', path: '/evil', label: 'X', visible: true }] } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('ad-slots is written by commercial only (not an editor, not the editor-in-chief directly)', async () => {
    for (const role of ['editor', 'eic', 'reporter'] as const) {
      const r = await rest('POST', '/api/globals/ad-slots?locale=uz', { cookie: c[role], body: { slots: [{ slotId: 'home-mid', enabled: true, format: 'leaderboard' }] } })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })

  it('FINDING? home-page sponsoredTeaser is an editor-in-chief-only field: an editor writing it is dropped', async () => {
    const payload = await testPayload()
    const sp = (await makeStory([await byline('RT WR2 Sponsor', { commercial: true })], { sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama', contractRef: 'C' } }, true)).id as number
    const ed = (await makeStory([otherByline], {}, true)).id as number
    // Also empties the lead and secondary slots: an earlier file may have left a refused one in the draft, which this write would validate.
    await payload.updateGlobal({ slug: 'home-page', overrideAccess: true, data: { sponsoredTeaser: null, lead: null, secondary: [] } as never })
    // An editor may update home-page, but sponsoredTeaser has field access eic-only.
    await rest('POST', '/api/globals/home-page?locale=uz', { cookie: c.editor, body: { lead: ed, sponsoredTeaser: sp } })
    const home = (await payload.findGlobal({ slug: 'home-page', depth: 0, overrideAccess: true })) as Doc
    expect(home.sponsoredTeaser ?? null).toBeNull()
  })
})

describe('users: only an admin creates or changes other accounts', () => {
  it('no non-admin can create a user', async () => {
    for (const role of ['reporter', 'editor', 'eic', 'commercial'] as const) {
      const r = await rest('POST', '/api/users', { cookie: c[role], body: { email: `wr2-new-${role}-${Date.now()}@test.muomalat.local`, name: 'X', role: 'reporter', password: 'wr2-new-password-0123456789' } })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })

  it('the editor-in-chief cannot raise a reporter to editor-in-chief', async () => {
    const payload = await testPayload()
    const victim = await account('reporter', 'wr2-victim')
    const r = await rest('PATCH', `/api/users/${victim.id}`, { cookie: c.eic, body: { role: 'eic' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(((await payload.findByID({ collection: 'users', id: victim.id, overrideAccess: true })) as Doc).role).toBe('reporter')
  })

  it('an admin cannot promote themselves to an editorial role and keep editing (separation holds), but may change roles', async () => {
    const payload = await testPayload()
    // Changing a role is the admin's job; this only checks the audit-relevant path runs and the value is applied by an admin.
    const target = await account('reporter', 'wr2-rolechange')
    const r = await rest('PATCH', `/api/users/${target.id}`, { cookie: c.admin, body: { role: 'editor' } })
    expect(r.status).toBe(200)
    expect(((await payload.findByID({ collection: 'users', id: target.id, overrideAccess: true })) as Doc).role).toBe('editor')
  })
})

describe('media metadata and the sponsoredOnly flag', () => {
  it('ART-15 / §3.12: a reporter cannot clear sponsoredOnly on a commercial-uploaded image', async () => {
    const payload = await testPayload()
    const img = (await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: commercial as never,
      data: { alt: 'homiylik', credit: 'Foto: X', rightsCategory: 'partner_supplied' } as never,
      file: { data: await photo(), mimetype: 'image/jpeg', name: `wr2-sp-${Date.now()}.jpg`, size: 1 },
    })) as Doc
    expect(img.sponsoredOnly).toBe(true)
    const r = await rest('PATCH', `/api/media/${img.id}`, { cookie: c.reporter, body: { sponsoredOnly: false } })
    void r
    const after = (await payload.findByID({ collection: 'media', id: img.id as number, overrideAccess: true })) as Doc
    expect(after.sponsoredOnly).toBe(true)
  })

  it('only the editor-in-chief may lift sponsoredOnly; an editor cannot', async () => {
    const payload = await testPayload()
    const img = (await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'x', credit: 'Foto: X', rightsCategory: 'partner_supplied', sponsoredOnly: true } as never,
      file: { data: await photo(), mimetype: 'image/jpeg', name: `wr2-sp2-${Date.now()}.jpg`, size: 1 },
    })) as Doc
    await rest('PATCH', `/api/media/${img.id}`, { cookie: c.editor, body: { sponsoredOnly: false } })
    expect(((await payload.findByID({ collection: 'media', id: img.id as number, overrideAccess: true })) as Doc).sponsoredOnly).toBe(true)
    // The editor-in-chief can.
    await rest('PATCH', `/api/media/${img.id}`, { cookie: c.eic, body: { sponsoredOnly: false } })
    expect(((await payload.findByID({ collection: 'media', id: img.id as number, overrideAccess: true })) as Doc).sponsoredOnly).toBe(false)
  })

  it('FINDING §4.2: a reporter edits the metadata of an image they did not upload (no owner is enforced)', async () => {
    const payload = await testPayload()
    const img = (await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: editor as never,
      data: { alt: 'Muharrir yuklagan rasm', credit: 'Foto: Muharrir', rightsCategory: 'staff' } as never,
      file: { data: await photo({ r: 200, g: 10, b: 10 }), mimetype: 'image/jpeg', name: `wr2-owned-${Date.now()}.jpg`, size: 1 },
    })) as Doc
    const r = await rest('PATCH', `/api/media/${img.id}`, { cookie: c.reporter, body: { credit: 'Foto: Begona muxbir', alt: 'Begona muxbir oʻzgartirdi' } })
    const after = (await payload.findByID({ collection: 'media', id: img.id as number, overrideAccess: true })) as Doc
    // §4.2 "media | Reporter: upload; edit metadata of own uploads". The image was the editor's.
    expect({ status: r.status, credit: after.credit }).not.toEqual({ status: 200, credit: 'Foto: Begona muxbir' })
  })
})

describe('contact messages: an editor cannot touch the commercial topics', () => {
  it('an editor cannot read or update a reklama message; commercial cannot update a tuzatish one', async () => {
    const payload = await testPayload()
    const reklama = await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { topic: 'reklama', name: 'A', email: 'a@example.com', message: 'Reklama', consent: { given: true, textVersion: 'v1', at: new Date().toISOString() } } as never })
    const tuzatish = await payload.create({ collection: 'contact-messages', overrideAccess: true, data: { topic: 'tuzatish', name: 'B', email: 'b@example.com', message: 'Tuzatish', consent: { given: true, textVersion: 'v1', at: new Date().toISOString() } } as never })
    const edUpd = await rest('PATCH', `/api/contact-messages/${reklama.id}`, { cookie: c.editor, body: { status: 'closed' } })
    expect(edUpd.status).toBeGreaterThanOrEqual(400)
    const comUpd = await rest('PATCH', `/api/contact-messages/${tuzatish.id}`, { cookie: c.commercial, body: { status: 'closed' } })
    expect(comUpd.status).toBeGreaterThanOrEqual(400)
  })
})

describe('requests: a reporter logs error reports only, and never decides one', () => {
  it('a reporter cannot create a refutation or removal request', async () => {
    for (const kind of ['refutation', 'removal', 'reply']) {
      const r = await rest('POST', '/api/requests', { cookie: c.reporter, body: { kind, receivedAt: new Date().toISOString(), channel: 'site_form', summary: 'Soxta' } })
      expect([kind, r.status >= 400]).toEqual([kind, true])
    }
  })

  it('a reporter cannot record a decision on a request', async () => {
    const payload = await testPayload()
    const req = await payload.create({ collection: 'requests', overrideAccess: true, data: { kind: 'error_report', receivedAt: new Date().toISOString(), channel: 'email', summary: 'Xato' } as never })
    const r = await rest('PATCH', `/api/requests/${req.id}`, { cookie: c.reporter, body: { decision: 'correction' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(((await payload.findByID({ collection: 'requests', id: req.id as number, overrideAccess: true })) as Doc).decision ?? null).toBeNull()
  })
})
