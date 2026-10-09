import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setNoticeTransport } from '@/payload/hooks/workflow/notify'
import {
  account,
  byline,
  cookieOf,
  latestOf,
  lexical,
  liveOf,
  makeStory,
  readyStory,
  rest,
  restError,
  rubric,
  transition,
  transitionOk,
  type Doc,
  type U,
} from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Second red-team pass on the publish boundary (CMS-SPEC §4.2, §4.3, §5.2,
 * §5.3, §5.8, §5.12): ways to get a story public, or off the site, without
 * the two-person rule — REST create/update with every combination of
 * `draft` and `_status`, the transition endpoint with forged, skipped and
 * replayed states, autosave, bulk writes, and the trash path.
 */

setNoticeTransport(async () => {})

let reporter: U
let reporter2: U
let editorA: U
let editorB: U
let authorEditor: U
let eic: U
let commercial: U
let admin: U
let c: Record<string, string>
let reporterByline: number
let otherByline: number
let authorEditorByline: number
let commercialByline: number

beforeAll(async () => {
  reporter = await account('reporter', 'p2-reporter')
  reporter2 = await account('reporter', 'p2-reporter2')
  editorA = await account('editor', 'p2-editor-a')
  editorB = await account('editor', 'p2-editor-b')
  authorEditor = await account('editor', 'p2-author-editor')
  eic = await account('eic', 'p2-eic')
  commercial = await account('commercial', 'p2-commercial')
  admin = await account('admin', 'p2-admin')
  c = {
    reporter: await cookieOf(reporter),
    reporter2: await cookieOf(reporter2),
    editorA: await cookieOf(editorA),
    editorB: await cookieOf(editorB),
    authorEditor: await cookieOf(authorEditor),
    eic: await cookieOf(eic),
    commercial: await cookieOf(commercial),
    admin: await cookieOf(admin),
  }
  reporterByline = await byline('RT P2 Reporter', { user: reporter })
  otherByline = await byline('RT P2 Other', { user: reporter2 })
  authorEditorByline = await byline('RT P2 Author Editor', { user: authorEditor })
  commercialByline = await byline('RT P2 Commercial', { commercial: true, user: commercial })
})

afterAll(async () => {
  await (await testPayload()).destroy()
})

const isLive = async (id: number) => (await liveOf(id))?._status === 'published'

describe('§5.3: publishers cannot skip the approval on any REST path', () => {
  it('an editor POST /api/articles with _status: published (create-and-publish) is refused', async () => {
    const r = await rest('POST', '/api/articles?locale=uz', {
      cookie: c.editorA,
      body: {
        title: `RT P2 create ${Date.now()}`,
        lead: 'Lid.',
        body: lexical('Matn.'),
        rubric: await rubric('tahlil'),
        authors: [otherByline],
        sources: [{ title: 'Hisobot', publisher: 'Markaziy bank', url: 'https://cbu.uz/x', type: 'document' }],
        _status: 'published',
      },
    })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('the editor-in-chief cannot publish a draft that was never approved (PATCH _status: published)', async () => {
    const id = (await makeStory([otherByline], { assignee: reporter2.id })).id as number
    for (const q of ['?locale=uz', '?draft=true&locale=uz', '?draft=false&locale=uz']) {
      const r = await rest('PATCH', `/api/articles/${id}${q}`, { cookie: c.eic, body: { _status: 'published' } })
      expect([q, r.status >= 400]).toEqual([q, true])
    }
    expect(await isLive(id)).toBe(false)
  })

  it('an approved story cannot be published by its own author-editor (¬author) over REST', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline, authorEditorByline])
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: c.authorEditor, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(id)).toBe(false)
  })

  it('an approved story whose content is changed in the same PATCH that publishes is refused (hash)', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: c.editorB, body: { _status: 'published', lead: 'Tasdiqdan keyin yozilgan lid.' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(id)).toBe(false)
  })

  it('autosave (?autosave=true&draft=true) carrying _status: published publishes nothing', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    const r = await rest('PATCH', `/api/articles/${id}?autosave=true&draft=true&locale=uz`, { cookie: c.reporter, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(id)).toBe(false)
  })

  it('autosave by a reporter on a story in edit is refused (read-only to the reporter)', async () => {
    const id = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    await transitionOk(c.reporter, id, { action: 'submit' })
    const r = await rest('PATCH', `/api/articles/${id}?autosave=true&draft=true&locale=uz`, { cookie: c.reporter, body: { lead: 'Muharrirdagi matnni oʻzgartirdim.' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await latestOf(id))?.lead).not.toBe('Muharrirdagi matnni oʻzgartirdim.')
  })

  it('a bulk PATCH by an editor cannot publish several unapproved drafts at once', async () => {
    const a = (await makeStory([otherByline])).id as number
    const b = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles?where[id][in]=${a},${b}&locale=uz`, { cookie: c.editorA, body: { _status: 'published' } })
    if (r.status === 200) expect(r.json.errors?.length ?? 0).toBe(2)
    expect(await isLive(a)).toBe(false)
    expect(await isLive(b)).toBe(false)
  })

  it('a bulk PATCH cannot move workflowStatus to published either', async () => {
    const a = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles?where[id][equals]=${a}&draft=true&locale=uz`, { cookie: c.eic, body: { workflowStatus: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await latestOf(a))?.workflowStatus).toBe('draft')
  })

  it('system fields sent by a client (approvedBy, approvedContentHash, firstPublishedAt) do not stick', async () => {
    const id = (await makeStory([otherByline])).id as number
    await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, {
      cookie: c.editorA,
      body: { approvedBy: editorB.id, approvedContentHash: 'x'.repeat(64), firstPublishedAt: new Date().toISOString(), publishedBy: editorB.id },
    })
    const doc = await latestOf(id)
    expect([doc?.approvedBy ?? null, doc?.approvedContentHash ?? null, doc?.firstPublishedAt ?? null]).toEqual([null, null, null])
  })
})

describe('§5.2: the transition endpoint with forged, skipped and replayed states', () => {
  it('a state that has no transition from here is refused (draft → ready, draft → scheduled, idea → published)', async () => {
    const id = (await makeStory([otherByline], { assignee: reporter2.id })).id as number
    for (const to of ['ready', 'scheduled', 'withdrawn', 'in_edit']) {
      const r = await transition(c.eic, id, to === 'in_edit' ? { to } : { to })
      if (to === 'in_edit') continue // draft → in_edit is "submit", which eic may do
      expect([to, r.status >= 400]).toEqual([to, true])
    }
    const idea = (await makeStory([otherByline], { workflowStatus: 'idea' })).id as number
    const r = await transition(c.eic, idea, { to: 'published' })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(idea)).toBe(false)
  })

  it('an action that belongs to another state (action: publish on a draft) is refused', async () => {
    const id = (await makeStory([otherByline])).id as number
    for (const action of ['publish', 'approve', 'schedule', 'restore', 'secondRead', 'unpublish']) {
      const r = await transition(c.eic, id, { action })
      expect([action, r.status >= 400]).toEqual([action, true])
    }
    expect(await isLive(id)).toBe(false)
  })

  it('a client cannot smuggle extra fields through the transition body (workflowStatus, approvedBy, _status)', async () => {
    const id = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    const r = await transition(c.reporter, id, { action: 'submit', workflowStatus: 'published', _status: 'published', approvedBy: reporter.id, data: { _status: 'published' } })
    expect(r.status).toBe(200)
    const doc = await latestOf(id)
    expect([doc?.workflowStatus, doc?.approvedBy ?? null]).toEqual(['in_edit', null])
    expect(await isLive(id)).toBe(false)
  })

  it('wrong roles: a reporter cannot approve, commercial cannot take an editorial story, admin cannot submit', async () => {
    const id = (await makeStory([otherByline], { assignee: reporter2.id })).id as number
    expect((await transition(c.admin, id, { action: 'submit' })).status).toBeGreaterThanOrEqual(400)
    await transitionOk(c.reporter2, id, { action: 'submit' })
    expect((await transition(c.reporter, id, { action: 'approve' })).status).toBeGreaterThanOrEqual(400)
    expect((await transition(c.commercial, id, { action: 'take' })).status).toBeGreaterThanOrEqual(400)
    expect((await transition(c.admin, id, { action: 'approve' })).status).toBeGreaterThanOrEqual(400)
    expect((await latestOf(id))?.workflowStatus).toBe('in_edit')
  })

  it('a reporter who submitted cannot approve their own submission, even after an admin makes them an editor', async () => {
    const payload = await testPayload()
    const promoted = await account('reporter', 'p2-promoted')
    const promotedByline = await byline('RT P2 Promoted', { user: promoted })
    const id = (await makeStory([promotedByline], { assignee: promoted.id })).id as number
    await transitionOk(await cookieOf(promoted), id, { action: 'submit' })
    await payload.update({ collection: 'users', id: promoted.id, data: { role: 'editor' } as never, overrideAccess: true })
    const r = await transition(await cookieOf(promoted), id, { action: 'approve' })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('a replayed publish of a story that is already live does nothing and is refused', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    await transitionOk(c.editorB, id, { action: 'publish' })
    const before = await liveOf(id)
    const again = await transition(c.editorB, id, { action: 'publish' })
    expect(again.status).toBeGreaterThanOrEqual(400)
    const after = await liveOf(id)
    expect(after?.publishedAt).toBe(before?.publishedAt)
  })

  it('a replayed approve after the approval was voided does not re-approve a changed story silently', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    // editor B changes the text: the approval is voided, the story goes back to in_edit
    const edit = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.editorB, body: { lead: 'Boshqa muharrir oʻzgartirdi.' } })
    expect(edit.status).toBe(200)
    expect((await latestOf(id))?.workflowStatus).toBe('in_edit')
    // the original approver re-sends the approve: that is a fresh approval of the new text (allowed), recorded again
    const r = await transition(c.editorA, id, { action: 'approve' })
    expect(r.status).toBe(200)
    expect((await latestOf(id))?.approvedBy).toBe(editorA.id)
  })

  it('an editor cannot withdraw, restore or unpublish (editor-in-chief only)', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    await transitionOk(c.editorB, id, { action: 'publish' })
    for (const body of [
      { action: 'withdraw', withdrawal: { publicNotice: 'Olib tashlandi.', internalReason: 'sinov' } },
      { action: 'unpublish', comment: 'xato' },
      { to: 'draft', comment: 'xato' },
      { to: 'withdrawn', withdrawal: { publicNotice: 'Olib tashlandi.', internalReason: 'sinov' } },
    ]) {
      const r = await transition(c.editorA, id, body)
      expect([JSON.stringify(body), r.status >= 400]).toEqual([JSON.stringify(body), true])
    }
    expect(await isLive(id)).toBe(true)
    expect((await latestOf(id))?.workflowStatus).toBe('published')
  })

  it('the accidental unpublish is refused after 15 minutes even for the editor-in-chief', async () => {
    const { sql } = await import('@payloadcms/db-postgres')
    const { sqlExec } = await import('./harness')
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    await transitionOk(c.editorB, id, { action: 'publish' })
    const at = new Date(Date.now() - 16 * 60_000).toISOString()
    await sqlExec(sql`UPDATE "articles" SET "first_published_at" = ${at} WHERE "id" = ${id}`)
    await sqlExec(sql`UPDATE "_articles_v" SET "version_first_published_at" = ${at} WHERE "parent_id" = ${id} AND "version_first_published_at" IS NOT NULL`)
    const r = await transition(c.eic, id, { action: 'unpublish', comment: 'xato chop etildi' })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const viaPatch = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: c.eic, body: { _status: 'draft', changeNote: { reason: 'xato' } } })
    expect(viaPatch.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(id)).toBe(true)
  })

  it('a withdrawn story cannot be republished by an editor through a plain PATCH', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    await transitionOk(c.editorB, id, { action: 'publish' })
    await transitionOk(c.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Maqola olib tashlandi.', internalReason: 'Yuridik talab' } })
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, {
      cookie: c.editorA,
      body: { _status: 'published', workflowStatus: 'published', noindex: false, changeNote: { kind: 'minor', reason: 'qaytarish' } },
    })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await latestOf(id))?.workflowStatus).toBe('withdrawn')
  })

  it('FINDING §5.2: a prototype key as the transition action (constructor, __proto__) is a 500 with an internal error message, not a 4xx', async () => {
    const id = (await makeStory([otherByline])).id as number
    for (const action of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const r = await transition(c.eic, id, { action })
      // A forged action is a client error (409/400), not a server fault with a stack-derived message.
      expect([action, r.status < 500]).toEqual([action, true])
    }
  })
})

describe('§5.8 / §4.2: the trash path is not a way around the save rules', () => {
  it('FINDING §5.9 SP-1/SP-2/SP-11: commercial turns its sponsored draft into an editorial one by restoring it from the trash with new values', async () => {
    const id = (await makeStory([commercialByline], { sponsored: { enabled: true, partner: 'Hamkor', disclosure: 'Reklama', contractRef: 'C-7' } })).id as number
    const trash = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.commercial, body: { deletedAt: new Date().toISOString() } })
    expect(trash.status).toBe(200)
    // Restore from the trash and, in the same save, drop the sponsored flag and put an editorial byline on it.
    const restore = await rest('PATCH', `/api/articles/${id}?draft=true&trash=true&locale=uz`, {
      cookie: c.commercial,
      body: { deletedAt: null, sponsored: { enabled: false }, authors: [otherByline], title: 'Mustaqil tahlil: bank mahsuloti eng yaxshisi' },
    })
    const doc = await latestOf(id)
    // §5.9: only the editor-in-chief clears the flag (SP-9 path) and an editorial byline never sits on a commercial item (SP-2).
    expect({ status: restore.status >= 400, sponsored: (doc?.sponsored as Doc | undefined)?.enabled }).toEqual({ status: true, sponsored: true })
  })

  it('FINDING §5.2: an editor changes an approved story through the trash without voiding the approval', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    const hashBefore = (await latestOf(id))?.approvedContentHash
    await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.editorB, body: { deletedAt: new Date().toISOString(), lead: 'Tasdiqdan keyin trash orqali yozildi.' } })
    await rest('PATCH', `/api/articles/${id}?draft=true&trash=true&locale=uz`, { cookie: c.editorB, body: { deletedAt: null } })
    const doc = await latestOf(id)
    // §5.2: "When content changes in ready or scheduled ... the story goes back to in_edit, the approval is cleared."
    const changed = doc?.lead === 'Tasdiqdan keyin trash orqali yozildi.'
    expect({ changed, state: doc?.workflowStatus, approvalKept: doc?.approvedContentHash === hashBefore && doc?.approvedBy === editorA.id }).not.toEqual({
      changed: true,
      state: 'ready',
      approvalKept: true,
    })
  })

  it('FINDING §5.2/§5.3: after that trash edit the approver publishes text they never approved (the hash is refreshed for the approver)', async () => {
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.editorB, body: { deletedAt: new Date().toISOString(), lead: 'Boshqa muharrir trash orqali yozdi.' } })
    await rest('PATCH', `/api/articles/${id}?draft=true&trash=true&locale=uz`, { cookie: c.editorB, body: { deletedAt: null } })
    // The approver presses Publish (here over REST, the admin button's call).
    await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: c.editorA, body: { _status: 'published' } })
    const live = await liveOf(id)
    expect(live?._status === 'published' && live?.lead === 'Boshqa muharrir trash orqali yozdi.').toBe(false)
  })

  it('FINDING §4.2/§5.8: a reporter clears the legal-review requirement on their own draft through the trash (flag rules skipped)', async () => {
    const id = (await makeStory([reporterByline], { assignee: reporter.id, needsLegal: 'required' })).id as number
    const direct = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.reporter, body: { needsLegal: 'complete' } })
    expect(direct.status).toBeGreaterThanOrEqual(400)
    await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.reporter, body: { deletedAt: new Date().toISOString(), needsLegal: 'na' } })
    await rest('PATCH', `/api/articles/${id}?draft=true&trash=true&locale=uz`, { cookie: c.reporter, body: { deletedAt: null } })
    // flagRules: clearing a legal requirement is the desk's (editor or editor-in-chief), never the reporter's.
    expect((await latestOf(id))?.needsLegal).toBe('required')
  })

  it('a reporter cannot restore a colleague’s story from the trash, nor permanently delete their own', async () => {
    const payload = await testPayload()
    const id = (await makeStory([otherByline], { assignee: reporter2.id })).id as number
    await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.reporter2, body: { deletedAt: new Date().toISOString() } })
    const restore = await rest('PATCH', `/api/articles/${id}?draft=true&trash=true&locale=uz`, { cookie: c.reporter, body: { deletedAt: null } })
    expect(restore.status).toBeGreaterThanOrEqual(400)
    const del = await rest('DELETE', `/api/articles/${id}?trash=true`, { cookie: c.reporter2 })
    expect(del.status).toBeGreaterThanOrEqual(400)
    const still = await payload.findByID({ collection: 'articles', id, trash: true, draft: true, overrideAccess: true, disableErrors: true })
    expect(still).not.toBeNull()
  })

  it('an editor cannot permanently delete a trashed story (editor-in-chief only), nor a sponsored one retained by contract', async () => {
    const payload = await testPayload()
    const id = (await makeStory([otherByline])).id as number
    await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.editorA, body: { deletedAt: new Date().toISOString() } })
    expect((await rest('DELETE', `/api/articles/${id}?trash=true`, { cookie: c.editorA })).status).toBeGreaterThanOrEqual(400)
    const sp = (await makeStory([commercialByline], { sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama', contractRef: 'C', retainUntil: new Date(Date.now() + 365 * 86_400_000).toISOString() } })).id as number
    await rest('PATCH', `/api/articles/${sp}?draft=true&locale=uz`, { cookie: c.eic, body: { deletedAt: new Date().toISOString() } })
    await rest('DELETE', `/api/articles/${sp}?trash=true`, { cookie: c.eic })
    expect(await payload.findByID({ collection: 'articles', id: sp, trash: true, draft: true, overrideAccess: true, disableErrors: true })).not.toBeNull()
  })

  it('a bulk DELETE ?where on the trash by the editor-in-chief spares stories on legal hold', async () => {
    const payload = await testPayload()
    const held = (await makeStory([otherByline], { legalHold: true })).id as number
    await payload.update({ collection: 'articles', id: held, draft: true, data: { deletedAt: new Date().toISOString() } as never, overrideAccess: true, context: { importing: true } })
    await rest('DELETE', `/api/articles?where[id][equals]=${held}&trash=true`, { cookie: c.eic })
    expect(await payload.findByID({ collection: 'articles', id: held, trash: true, draft: true, overrideAccess: true, disableErrors: true })).not.toBeNull()
  })
})

describe('duplicate and copy actions on the other collections', () => {
  it('requests cannot be duplicated (a copy would carry the requester’s personal data)', async () => {
    const payload = await testPayload()
    const req = await payload.create({
      collection: 'requests',
      overrideAccess: true,
      data: { kind: 'error_report', receivedAt: new Date().toISOString(), channel: 'email', summary: 'Xato', requesterName: 'Ali', requesterContact: 'ali@example.com' } as never,
    })
    for (const role of ['editorA', 'eic', 'admin'] as const) {
      const r = await rest('POST', `/api/requests/${req.id}/duplicate`, { cookie: c[role], body: {} })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })

  it('an admin cannot duplicate a staff account (it would copy role and interests to a new login)', async () => {
    const r = await rest('POST', `/api/users/${reporter.id}/duplicate`, { cookie: c.admin, body: { email: `rt-dup-${Date.now()}@test.muomalat.local`, password: 'rt-dup-password-0123456789' } })
    // Users are created by an admin with an explicit role; a duplicate is not a creation path the spec knows (§4.4).
    if (r.status < 400) expect(r.json?.doc?.declaredInterests ?? []).toEqual([])
  })
})
