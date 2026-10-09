import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ensureWorkflowPresets, SHARED_PRESETS } from '@/payload/hooks/workflow/presets'
import { testPayload } from '../helpers/payload'
import { as, byline, cookieOf, go, goOk, latest, live, publishedStory, rejects, rest, story, team, type Doc, type Team } from './helpers'

/**
 * The rest of §5 and §4.2: legal hold (§5.8), linked requests (§5.7), the
 * request decision, author profiles and unused deletion (§4.2 "Other
 * collections"), the list views (§5.14) and the transitions list the admin
 * panel shows.
 */
let t: Team
beforeAll(async () => {
  t = await team('ot')
})
afterAll(async () => (await testPayload()).destroy())

describe('legal hold (§5.8)', () => {
  it('only the editor-in-chief sets it, loudly; while set nobody else edits, nothing is trashed and the title is never hidden', async () => {
    const payload = await testPayload()
    const r = await rest('PATCH', `/api/articles/${(await story(t.reporter, [t.reporterByline])).id}?draft=true`, {
      cookie: await cookieOf(t.editorA),
      body: { legalHold: true, _status: 'draft' },
    })
    expect(r.status).toBe(403)

    const id = await publishedStory(t)
    await payload.update({ collection: 'articles', id, draft: true, data: { legalHold: true, _status: 'draft' } as never, ...as(t.eic) })
    await rejects(payload.update({ collection: 'articles', id, draft: true, data: { lead: 'x', _status: 'draft' } as never, ...as(t.editorA) }), /yuridik saqlovda/)
    const w = await go(t.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Izoh', internalReason: 'Sabab', hideTitle: true } })
    expect(w.status).toBe(400)
    await goOk(t.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Izoh', internalReason: 'Sabab' } })
    expect((await live(id)).workflowStatus).toBe('withdrawn')
  })

  it('withdrawal stays possible when the story is flagged for legal review', async () => {
    const payload = await testPayload()
    const id = await publishedStory(t)
    await payload.update({ collection: 'articles', id, draft: true, data: { needsLegal: 'required', _status: 'draft' } as never, ...as(t.editorA) })
    await goOk(t.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Yuridik sabab bilan olib tashlandi.', internalReason: 'Daʼvo' } })
    expect((await live(id)).workflowStatus).toBe('withdrawn')
  })

  it('a never-published story on hold is not trashed or deleted', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline])
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { legalHold: true, _status: 'draft' } as never, ...as(t.eic) })
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { deletedAt: new Date().toISOString() } as never, ...as(t.eic) }), /saqlovdagi/)
    await rejects(payload.delete({ collection: 'articles', id: s.id, ...as(t.eic) }), /saqlovdagi/)
  })
})

describe('linked requests and decisions (§5.7, §4.2)', () => {
  async function request(kind = 'error_report') {
    const payload = await testPayload()
    return (await payload.create({
      collection: 'requests',
      data: { kind, summary: 'Raqam xato', receivedAt: new Date().toISOString(), channel: 'email' } as never,
      overrideAccess: true,
    })) as Doc
  }

  it('a correction made from a request closes it with decision = correction', async () => {
    const payload = await testPayload()
    const req = await request()
    const id = await publishedStory(t)
    await payload.update({
      collection: 'articles',
      id,
      draft: true,
      data: { changeNote: { kind: 'correction' }, corrections: [{ kind: 'correction', publicText: 'Tuzatildi.', request: req.id }], _status: 'draft' } as never,
      ...as(t.editorB),
    })
    await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(t.editorB) })
    const after = (await payload.findByID({ collection: 'requests', id: req.id, depth: 0, overrideAccess: true })) as Doc
    expect(after.decision).toBe('correction')
    expect(after.decidedBy).toBe(t.editorB.id)
    expect(after.decidedAt).toBeTruthy()
  })

  it('an editor decides an error report only; a refutation is the editor-in-chief’s, and the refusal is loud', async () => {
    const payload = await testPayload()
    const err = await request('error_report')
    await payload.update({ collection: 'requests', id: err.id, data: { decision: 'no_change' } as never, ...as(t.editorA) })
    expect(((await payload.findByID({ collection: 'requests', id: err.id, depth: 0, overrideAccess: true })) as Doc).decidedBy).toBe(t.editorA.id)
    const refutation = await request('refutation')
    await rejects(payload.update({ collection: 'requests', id: refutation.id, data: { decision: 'refutation_published' } as never, ...as(t.editorA) }), /faqat bosh muharrir/)
    await payload.update({ collection: 'requests', id: refutation.id, data: { decision: 'refutation_published' } as never, ...as(t.eic) })
  })
})

describe('authors and tags (§4.2)', () => {
  it('a reporter edits only their own profile; a byline in use is not deleted', async () => {
    const payload = await testPayload()
    const other = await byline('WF ot Boshqa muallif')
    await payload.update({ collection: 'authors', id: t.reporterByline, draft: true, data: { bio: 'Yangi bio.', _status: 'draft' } as never, ...as(t.reporter) })
    await rejects(payload.update({ collection: 'authors', id: other, draft: true, data: { bio: 'Begona.', _status: 'draft' } as never, ...as(t.reporter) }), /oʻz muallif profilini/)
    await publishedStory(t)
    await rejects(payload.delete({ collection: 'authors', id: t.reporterByline, ...as(t.eic) }), /ishlatilgan/)
  })
})

describe('list views (§5.14)', () => {
  it('the shared presets and a private "Mening ishlarim" per staff member are created once', async () => {
    const payload = await testPayload()
    await ensureWorkflowPresets(payload)
    // A second run adds nothing for what exists (other files may add staff in between: they get theirs).
    await ensureWorkflowPresets(payload)
    const { docs } = await payload.find({ collection: 'payload-query-presets', where: { relatedCollection: { equals: 'articles' } }, limit: 1000, overrideAccess: true })
    const titles = new Set(docs.map((d) => (d as Doc).title))
    for (const p of SHARED_PRESETS) {
      expect(titles.has(p.title)).toBe(true)
      expect(docs.filter((d) => (d as Doc).title === p.title)).toHaveLength(1)
    }
    const mine = docs.filter((d) => (d as Doc).title === 'Mening ishlarim')
    const owners = mine.map((d) => String(((d as Doc).access?.read?.users ?? []).map((u: unknown) => (typeof u === 'object' ? (u as Doc).id : u))[0]))
    expect(new Set(owners).size).toBe(owners.length)
    expect(mine.some((d) => ((d as Doc).access?.read?.users ?? []).map((u: unknown) => (typeof u === 'object' ? (u as Doc).id : u)).includes(t.reporter.id))).toBe(true)
  })
})

describe('the admin panel’s transitions list', () => {
  it('offers each user the transitions they may perform now', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    const forReporter = await rest('GET', `/api/articles/${s.id}/transitions`, { cookie: await cookieOf(t.reporter) })
    expect(forReporter.status).toBe(200)
    expect(forReporter.json.state).toBe('draft')
    expect(forReporter.json.transitions.map((x: Doc) => x.id)).toEqual(['submit'])
    await goOk(t.reporter, s.id, { action: 'submit' })
    const forEditor = await rest('GET', `/api/articles/${s.id}/transitions`, { cookie: await cookieOf(t.editorA) })
    expect(forEditor.json.transitions.map((x: Doc) => x.id)).toEqual(expect.arrayContaining(['take', 'rework', 'approve', 'hold']))
    const again = await rest('GET', `/api/articles/${s.id}/transitions`, { cookie: await cookieOf(t.reporter) })
    expect(again.json.transitions).toEqual([])
    expect((await latest(s.id)).workflowStatus).toBe('in_edit')
  })
})
