import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { escalateSecondReads, resetEscalations } from '@/worker/jobs/urgentSecondRead'
import { testPayload } from '../helpers/payload'
import {
  account,
  as,
  go,
  goOk,
  latest,
  lexical,
  live,
  notices,
  officialDomains,
  publishedStory,
  rejects,
  restError,
  rubric,
  story,
  team,
  type Team,
} from './helpers'

/**
 * Acceptance group B, the two-person rule (CMS-SPEC §5.2–§5.5, §16 B2–B10,
 * B12, B13): who may approve and publish, approval following the content,
 * the editor-in-chief tiers, the urgent fast path and its second read.
 */
let t: Team
beforeAll(async () => {
  t = await team('tp')
  await officialDomains(['cbu.uz', 'gov.uz'])
})
afterAll(async () => (await testPayload()).destroy())

describe('the ordinary path', () => {
  it('reporter submits, editor A approves, editor B publishes; every transition is in the history and the audit log (B12)', async () => {
    const payload = await testPayload()
    const id = await publishedStory(t)
    const doc = await live(id)
    expect(doc._status).toBe('published')
    expect(doc.workflowStatus).toBe('published')
    expect(doc.firstPublishedAt).toBeTruthy()
    expect(doc.publishedBy).toBe(t.editorB.id)
    expect(doc.approvedBy).toBe(t.editorA.id)
    expect(doc.submittedBy).toBe(t.reporter.id)
    const hops = (doc.workflowHistory as { from: string; to: string }[]).map((h) => `${h.from}>${h.to}`)
    expect(hops).toEqual(['idea>draft', 'draft>in_edit', 'in_edit>ready', 'ready>published'])
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(id) } }, { action: { equals: 'workflow.transition' } }] },
      overrideAccess: true,
      limit: 10,
    })
    expect(docs.map((d) => d.summary).sort()).toEqual(['draft → in_edit', 'idea → draft', 'in_edit → ready', 'ready → published'])
  })
})

describe('B2, B3: authors and submitters never approve or first-publish', () => {
  it('an editor who is an author cannot approve, or publish an approved story', async () => {
    const s = await story(t.authorEditor, [t.authorEditorByline])
    await goOk(t.authorEditor, s.id, { action: 'submit' })
    const r = await go(t.authorEditor, s.id, { action: 'approve' })
    expect(r.status).toBe(403)
    expect(restError(r.json)).toMatch(/Oʻz maqolangizni tasdiqlay olmaysiz/)
    await goOk(t.editorA, s.id, { action: 'approve' })
    const p = await go(t.authorEditor, s.id, { action: 'publish' })
    expect(p.status).toBe(403)
    expect((await live(s.id))._status).not.toBe('published')
    // Payload's own Publish button is the same write.
    const payload = await testPayload()
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.authorEditor) }), /Oʻz maqolangizni/)
  })

  it('a byline linked to the editor in an unpublished draft already makes them an author', async () => {
    const payload = await testPayload()
    const name = `WF tp Qoralama imzo ${Date.now()}`
    const a = await payload.create({
      collection: 'authors',
      data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), role: 'muxbir', bio: 'Sinov.', active: true, _status: 'published' } as never,
      overrideAccess: true,
    })
    // The admin links the byline to the editor and saves, without publishing the byline.
    const editorC = await account('editor', 'tp-editor-c')
    await payload.update({ collection: 'authors', id: a.id, draft: true, data: { user: editorC.id, _status: 'draft' } as never, overrideAccess: true })
    const s = await story(t.reporter, [a.id as number])
    expect((await latest(s.id))._authorUsers).toContain(editorC.id)
    await goOk(t.reporter, s.id, { action: 'submit' })
    const r = await go(editorC, s.id, { action: 'approve' })
    expect(r.status).toBe(403)
    expect(restError(r.json)).toMatch(/Oʻz maqolangizni tasdiqlay olmaysiz/)
  })

  it('the editor who submitted cannot approve, even when not an author', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.editorA, s.id, { action: 'submit' })
    const r = await go(t.editorA, s.id, { action: 'approve' })
    expect(r.status).toBe(403)
    expect((await latest(s.id)).workflowStatus).toBe('in_edit')
    await goOk(t.editorB, s.id, { action: 'approve' })
    expect((await latest(s.id)).approvedBy).toBe(t.editorB.id)
  })
})

describe('B4, B5: the approval follows the content', () => {
  it('an edit by someone other than the approver sends the story back to in_edit; publishing then fails (B4)', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    // The reporter is read-only in `ready` (§4.2): the edit is refused and the approval stands.
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { lead: 'Muxbir oʻzgartirdi.', _status: 'draft' } as never, ...as(t.reporter) }),
      /muxbir oʻzgartira olmaydi/,
    )
    expect((await latest(s.id)).workflowStatus).toBe('ready')
    notices.length = 0
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { lead: 'Muharrir B oʻzgartirdi.', _status: 'draft' } as never, ...as(t.editorB) })
    const after = await latest(s.id)
    expect(after.workflowStatus).toBe('in_edit')
    expect(after.approvedBy).toBeFalsy()
    expect(after.approvedContentHash).toBeFalsy()
    const r = await go(t.editorB, s.id, { action: 'publish' })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ docId: { equals: String(s.id) } }, { action: { equals: 'workflow.approval_voided' } }] },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
  })

  it('an edit by the approver keeps the approval with a fresh hash, and the approver can publish (B5)', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    const before = (await latest(s.id)).approvedContentHash
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { lead: 'Tasdiqlovchi tuzatdi.', _status: 'draft' } as never, ...as(t.editorA) })
    const after = await latest(s.id)
    expect(after.workflowStatus).toBe('ready')
    expect(after.approvedBy).toBe(t.editorA.id)
    expect(after.approvedContentHash).not.toBe(before)
    await goOk(t.editorA, s.id, { action: 'publish' })
    expect((await live(s.id)).lead).toBe('Tasdiqlovchi tuzatdi.')
  })

  it('a cosmetic Lexical change the site does not render keeps the approval', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    const body = structuredClone(s.body)
    body.root.children[0].indent = 0
    body.root.children[0].direction = 'rtl'
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { body, _status: 'draft' } as never, ...as(t.editorB) })
    expect((await latest(s.id)).workflowStatus).toBe('ready')
  })
})

describe('B6: legal review', () => {
  it('needsLegal = required blocks approval; complete is set by the editor-in-chief only, who then publishes', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline], { needsLegal: 'required' })
    await goOk(t.reporter, s.id, { action: 'submit' })
    const r = await go(t.editorA, s.id, { action: 'approve' })
    expect(r.status).toBe(400)
    expect(restError(r.json)).toMatch(/Yuridik koʻrik/)
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { needsLegal: 'complete', _status: 'draft' } as never, ...as(t.editorA) }),
      /faqat bosh muharrir/,
    )
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { needsLegal: 'complete', _status: 'draft' } as never, ...as(t.eic) })
    const signed = await latest(s.id)
    expect(signed.legalSignOff?.by).toBe(t.eic.id)
    // The story is now in an editor-in-chief tier: an editor can neither approve nor publish it.
    expect((await go(t.editorA, s.id, { action: 'approve' })).status).toBe(403)
    await goOk(t.eic, s.id, { action: 'approve' })
    expect((await go(t.editorB, s.id, { action: 'publish' })).status).toBe(403)
    await goOk(t.eic, s.id, { action: 'publish' })
    expect((await live(s.id))._status).toBe('published')
  })

  it('a picture still marked required blocks publishing', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline], { needsPicture: 'required' })
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    const r = await go(t.editorB, s.id, { action: 'publish' })
    expect(r.status).toBe(400)
    expect(restError(r.json)).toMatch(/Rasm tayyor emas/)
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { needsPicture: 'complete', _status: 'draft' } as never, ...as(t.reporter) }),
    )
  })
})

describe('B8, B9: the urgent fast path', () => {
  const urgentData = async () => ({
    rubric: await rubric('yangiliklar'),
    urgent: true,
    body: lexical('Markaziy bank asosiy stavkani 14 foizda qoldirdi.'),
    sources: [{ title: 'Press-reliz', publisher: 'Markaziy bank', url: 'https://cbu.uz/press/1', type: 'press' }],
  })

  it('an editor-author publishes a short official-source news item at once; a second read is required and the desk is alerted (B8)', async () => {
    const s = await story(t.authorEditor, [t.authorEditorByline], await urgentData())
    notices.length = 0
    await goOk(t.authorEditor, s.id, { action: 'urgent' })
    const doc = await live(s.id)
    expect(doc._status).toBe('published')
    expect(doc.approvedBy).toBe(t.authorEditor.id)
    expect(doc.secondRead.required).toBe(true)
    expect(new Date(doc.secondRead.dueAt).getTime() - Date.now()).toBeGreaterThan(25 * 60_000)
    expect(notices.some((n) => n.kind === 'second_read_due' && n.audience === 'desk' && String(n.articleId) === String(s.id))).toBe(true)
  })

  it('without an official source the same attempt fails, and so does a reporter', async () => {
    const data = { ...(await urgentData()), sources: [{ title: 'Blog', publisher: 'Kimdir', url: 'https://example.com/x', type: 'press' }] }
    const s = await story(t.authorEditor, [t.authorEditorByline], data)
    const r = await go(t.authorEditor, s.id, { action: 'urgent' })
    expect(r.status).toBe(400)
    expect(restError(r.json)).toMatch(/Rasmiy manba kerak/)

    const mine = await story(t.reporter, [t.reporterByline], await urgentData())
    const byReporter = await go(t.reporter, mine.id, { action: 'urgent' })
    expect(byReporter.status).toBe(403)
    expect((await live(mine.id))._status).not.toBe('published')
  })

  it('an item over 400 words cannot take the fast path', async () => {
    const long = Array.from({ length: 410 }, (_, i) => `soʻz${i}`).join(' ')
    const s = await story(t.editorA, [t.authorEditorByline], { ...(await urgentData()), body: lexical(long) })
    const r = await go(t.editorA, s.id, { action: 'urgent' })
    expect(restError(r.json)).toMatch(/400 soʻzgacha/)
  })

  it('an overdue second read escalates to the editor-in-chief (B9); a non-author editor closes it', async () => {
    const s = await story(t.authorEditor, [t.authorEditorByline], await urgentData())
    await goOk(t.authorEditor, s.id, { action: 'urgent' })
    resetEscalations()
    notices.length = 0
    const payload = await testPayload()
    expect(await escalateSecondReads(payload)).not.toContain(s.id)
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(Date.now() + 31 * 60_000)
      expect(await escalateSecondReads(payload)).toContain(s.id)
      // Once: a restarted worker (nothing remembered in memory) finds the stamp and stays quiet.
      resetEscalations()
      expect(await escalateSecondReads(payload)).not.toContain(s.id)
    } finally {
      vi.useRealTimers()
    }
    expect(notices.some((n) => n.kind === 'second_read_overdue' && n.audience === 'eic' && String(n.articleId) === String(s.id))).toBe(true)
    // The author cannot do the second read; another editor can.
    expect((await go(t.authorEditor, s.id, { action: 'secondRead', outcome: 'ok' })).status).toBe(403)
    await goOk(t.editorB, s.id, { action: 'secondRead', outcome: 'ok' })
    const doc = await live(s.id)
    expect(doc.secondRead.escalatedAt).toBeTruthy()
    expect(doc.secondRead.doneBy).toBe(t.editorB.id)
    expect(doc.secondRead.outcome).toBe('ok')
    expect(doc._status).toBe('published')
  })
})

describe('B10: back for rework', () => {
  it('needs a comment; with one, the story returns to draft and the author is told', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'take' })
    expect((await latest(s.id)).deskEditor).toBe(t.editorA.id)
    const bare = await go(t.editorA, s.id, { action: 'rework' })
    expect(bare.status).toBe(400)
    notices.length = 0
    await goOk(t.editorA, s.id, { action: 'rework', comment: 'Manbani aniqlang.' })
    const doc = await latest(s.id)
    expect(doc.workflowStatus).toBe('draft')
    expect(doc.deskEditor).toBeFalsy()
    const n = notices.find((x) => x.kind === 'sent_back')
    expect(n?.audience).toBe('users')
    expect(n?.userIds?.map(String)).toContain(String(t.reporter.id))
    expect(n?.text).toMatch(/Manbani aniqlang/)
  })
})

describe('B13: a transition that does not publish leaves the live story alone', () => {
  it('the second-read mark on a published story with a pending draft keeps the live content', async () => {
    const payload = await testPayload()
    const s = await story(t.authorEditor, [t.authorEditorByline], {
      rubric: await rubric('yangiliklar'),
      urgent: true,
      body: lexical('Qisqa xabar.'),
      sources: [{ title: 'Hujjat', publisher: 'Hukumat', url: 'https://www.gov.uz/doc', type: 'document' }],
    })
    await goOk(t.authorEditor, s.id, { action: 'urgent' })
    const liveTitle = (await live(s.id)).title
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { title: 'Kutilayotgan oʻzgarish', _status: 'draft' } as never, ...as(t.editorB) })
    await goOk(t.editorB, s.id, { action: 'secondRead', outcome: 'minor_fix' })
    const main = await live(s.id)
    expect(main._status).toBe('published')
    expect(main.title).toBe(liveTitle)
    const draft = await latest(s.id)
    expect(draft.title).toBe('Kutilayotgan oʻzgarish')
    expect(draft.secondRead.doneBy).toBe(t.editorB.id)
    // "Tahrirga olish" has no meaning on a published story and changes nothing.
    expect((await go(t.editorB, s.id, { action: 'take' })).status).toBe(409)
    expect((await live(s.id)).title).toBe(liveTitle)
  })
})
