import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { testPayload } from '../helpers/payload'
import { as, go, goOk, latest, lexical, live, rejects, restError, story, team, type Doc, type Team } from './helpers'

/**
 * Acceptance group D, the sponsored-content guard (CMS-SPEC §5.9; §16 D1, D2,
 * D3, D7, and B7): SP-1, SP-2, SP-3, SP-4, SP-5, SP-6, SP-9, SP-11.
 */
let t: Team
beforeAll(async () => {
  t = await team('sp')
})
afterAll(async () => (await testPayload()).destroy())

const sponsorship = (extra: Doc = {}) => ({
  enabled: true,
  partner: 'Hamkor bank',
  disclosure: 'Material Hamkor bank buyurtmasi bilan tayyorlandi.',
  contractRef: 'SH-2026-17',
  category: 'general',
  ...extra,
})

async function sponsoredStory(extra: Doc = {}) {
  const { sponsored, ...fields } = extra
  return story(t.commercial, [t.commercialByline], { ...fields, sponsored: sponsorship(sponsored) })
}

describe('SP-1: commercial creates sponsored stories only', () => {
  it('the story is saved sponsored, with the commercial byline, whatever was sent', async () => {
    const payload = await testPayload()
    const created = await payload.create({
      collection: 'articles',
      draft: true,
      data: { title: `Tijorat yaratdi ${Date.now()}`, authors: [t.reporterByline], sponsored: { enabled: false }, _status: 'draft' } as never,
      ...as(t.commercial),
    })
    const doc = await latest(created.id as number)
    expect(doc.sponsored.enabled).toBe(true)
    expect(doc.authors).toEqual([t.commercialByline])
  })
})

describe('D1: bylines match the kind of story (SP-2)', () => {
  it('an editorial story with a commercial byline fails; so does a sponsored story with an editorial byline', async () => {
    const payload = await testPayload()
    await rejects(story(t.reporter, [t.commercialByline]), /tijorat imzosi boʻlmaydi/)
    const s = await sponsoredStory()
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { authors: [t.reporterByline], _status: 'draft' } as never, ...as(t.eic) }),
      /faqat tijorat imzosi/,
    )
  })
})

describe('B7, SP-6, SP-11: who handles a sponsored story', () => {
  it('commercial submits, the editor-in-chief approves and publishes; an editor can do neither, nor edit it', async () => {
    const payload = await testPayload()
    const s = await sponsoredStory()
    await goOk(t.commercial, s.id, { action: 'submit' })
    // SP-11: editors read sponsored stories but never change them.
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { lead: 'Muharrir', _status: 'draft' } as never, ...as(t.editorA) }),
      /SP-11/,
    )
    expect((await go(t.editorA, s.id, { action: 'approve' })).status).toBe(403)
    await goOk(t.eic, s.id, { action: 'approve' })
    // Commercial edits before approval only.
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { lead: 'Tijorat', _status: 'draft' } as never, ...as(t.commercial) }),
      /faqat bosh muharrir/,
    )
    expect((await go(t.editorA, s.id, { action: 'publish' })).status).toBe(403)
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.editorB) }), /SP-11|SP-6/)
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.commercial) }), /Faqat muharrir/)
    await goOk(t.eic, s.id, { action: 'publish' })
    const doc = await live(s.id)
    expect(doc._status).toBe('published')
    expect(doc.sponsored.approvedBy).toBe(t.eic.id)
    expect(new Date(doc.sponsored.retainUntil).getTime()).toBeGreaterThan(Date.now() + 2.9 * 365 * 24 * 3600_000)
  })
})

describe('D2: financial categories need licence, risk warning and key terms (SP-4)', () => {
  it('an investment_securities story without them cannot be published; with them it can', async () => {
    const payload = await testPayload()
    const s = await sponsoredStory({ sponsored: { category: 'investment_securities' } })
    await goOk(t.commercial, s.id, { action: 'submit' })
    await goOk(t.eic, s.id, { action: 'approve' })
    const r = await go(t.eic, s.id, { action: 'publish' })
    expect(r.status).toBe(400)
    const text = restError(r.json)
    expect(text).toMatch(/litsenziya raqami/)
    expect(text).toMatch(/Xavf haqida ogohlantirish/)
    expect(text).toMatch(/Asosiy shartlar/)
    await payload.update({
      collection: 'articles',
      id: s.id,
      draft: true,
      data: { sponsored: { ...(await latest(s.id)).sponsored, licenceNumber: 'L-123', riskWarning: 'Qimmatli qogʻozlar qiymati tushishi mumkin.', keyTerms: 'Muddat 12 oy.' }, _status: 'draft' } as never,
      ...as(t.eic),
    })
    // The approver's own edit keeps the approval (§5.2).
    expect((await latest(s.id)).workflowStatus).toBe('ready')
    await goOk(t.eic, s.id, { action: 'publish' })
    expect((await live(s.id))._status).toBe('published')
  })
})

describe('D3: no promise of returns (SP-5)', () => {
  it('a body with "yillik 24% daromad" cannot be published', async () => {
    const s = await sponsoredStory({ body: lexical('Omonatga yillik 24% daromad beramiz.') })
    await goOk(t.commercial, s.id, { action: 'submit' })
    await goOk(t.eic, s.id, { action: 'approve' })
    const r = await go(t.eic, s.id, { action: 'publish' })
    expect(r.status).toBe(400)
    expect(restError(r.json)).toMatch(/SP-5/)
  })
})

describe('SP-5 override: the editor-in-chief, with a reason', () => {
  it('commercial cannot set it; the editor-in-chief must give a reason, and the publish is audited', async () => {
    const payload = await testPayload()
    const s = await sponsoredStory({ body: lexical('Eslatma: bu yerda «yillik 24% daromad» kafolatlanmaydi.') })
    // Field access drops the flag for commercial: the save goes through, the override does not.
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { sponsored: { returnPhraseOverride: true }, _status: 'draft' } as never, ...as(t.commercial) })
    expect((await latest(s.id)).sponsored.returnPhraseOverride).not.toBe(true)
    await goOk(t.commercial, s.id, { action: 'submit' })
    await goOk(t.eic, s.id, { action: 'approve' })
    await payload.update({ collection: 'articles', id: s.id, draft: true, data: { sponsored: { returnPhraseOverride: true }, _status: 'draft' } as never, ...as(t.eic) })
    const noReason = await go(t.eic, s.id, { action: 'publish' })
    expect(noReason.status).toBe(400)
    expect(restError(noReason.json)).toMatch(/sababini yozing/)
    await payload.update({
      collection: 'articles',
      id: s.id,
      draft: true,
      data: { sponsored: { returnPhraseOverride: true, returnPhraseOverrideReason: 'Ibora ogohlantirish ichida: vaʼda emas.' }, _status: 'draft' } as never,
      ...as(t.eic),
    })
    await goOk(t.eic, s.id, { action: 'publish' })
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ action: { equals: 'sponsored.return_phrase_override' } }, { docId: { equals: String(s.id) } }] },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].summary).toMatch(/24% daromad/)
  })
})

describe('D7: retention and the sponsored flag (SP-9)', () => {
  it('a published sponsored story cannot be deleted, and its flag cannot be cleared', async () => {
    const payload = await testPayload()
    const s = await sponsoredStory()
    await goOk(t.commercial, s.id, { action: 'submit' })
    await goOk(t.eic, s.id, { action: 'approve' })
    await goOk(t.eic, s.id, { action: 'publish' })
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { sponsored: { ...(await latest(s.id)).sponsored, enabled: false }, _status: 'draft' } as never, ...as(t.eic) }),
      /SP-9/,
    )
    await rejects(payload.delete({ collection: 'articles', id: s.id, ...as(t.eic) }), /oʻchirilmaydi/)
    expect((await live(s.id)).sponsored.enabled).toBe(true)
  })

  it('commercial cannot clear the flag even before publication; the editor-in-chief can on a never-published item', async () => {
    const payload = await testPayload()
    const s = await sponsoredStory()
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { sponsored: { enabled: false }, _status: 'draft' } as never, ...as(t.commercial) }),
      /faqat bosh muharrir|faqat homiylik/,
    )
    await payload.update({
      collection: 'articles',
      id: s.id,
      draft: true,
      data: { sponsored: { ...(await latest(s.id)).sponsored, enabled: false }, authors: [t.reporterByline], _status: 'draft' } as never,
      ...as(t.eic),
    })
    expect((await latest(s.id)).sponsored.enabled).toBe(false)
  })
})
