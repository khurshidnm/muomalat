import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import {
  agePublication,
  as,
  go,
  goOk,
  latest,
  lexical,
  live,
  publishedStory,
  rejects,
  restError,
  story,
  team,
  type Doc,
  type Team,
  type U,
} from './helpers'

/**
 * Acceptance group C: changes after publication, the corrections log,
 * withdrawal (CMS-SPEC §5.6–§5.8; §16 C1–C4, C7, C8).
 */
let t: Team
beforeAll(async () => {
  t = await team('ch')
})
afterAll(async () => (await testPayload()).destroy())

/** A draft save of a published story, then Payload's Publish (the same write the admin's button makes). */
async function publishChange(u: U, id: number, data: Doc) {
  const payload = await testPayload()
  await payload.update({ collection: 'articles', id, draft: true, data: { ...data, _status: 'draft' } as never, ...as(u) })
  return payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(u) })
}

const correctionRow = (text: string, kind = 'correction') => ({ kind, publicText: text, location: '1-xatboshi' })

async function corrections(id: number): Promise<Doc[]> {
  return ((await latest(id)).corrections as Doc[] | undefined) ?? []
}

describe('C1: a published change needs a change kind', () => {
  it('fails without changeNote.kind and succeeds with kind and reason', async () => {
    const id = await publishedStory(t)
    const lead = 'Bank 4,5 mlrd soʻm ajratdi, deyiladi hisobotda.'
    await rejects(publishChange(t.editorB, id, { lead }), /oʻzgarish turini tanlang/)
    expect((await live(id)).lead).not.toBe(lead)
    await publishChange(t.editorB, id, { changeNote: { kind: 'minor', reason: 'Imlo' } })
    const doc = await live(id)
    expect(doc.lead).toBe(lead)
    // The note is cleared and kept in the history of the published version.
    expect(doc.changeNote?.kind ?? null).toBeNull()
    expect((doc.workflowHistory as Doc[]).at(-1)?.comment).toMatch(/Mayda tahrir: Imlo/)
  })

  it('a publish that changes nothing editorial needs no kind', async () => {
    const id = await publishedStory(t)
    await publishChange(t.editorB, id, { noindex: false })
    expect((await live(id))._status).toBe('published')
  })
})

describe('C2: a changed number is a correction (N-1)', () => {
  it('"4,5 mlrd" → "5,4 mlrd" as minor fails; as a correction with a new item it succeeds', async () => {
    const id = await publishedStory(t)
    const body = lexical('Markaziy bank 2026-yilda 5,4 mlrd soʻm ajratdi.', 'Ikkinchi xatboshi.')
    await rejects(publishChange(t.editorB, id, { body, changeNote: { kind: 'minor', reason: 'Imlo' } }), /Raqam oʻzgardi — bu tuzatish/)
    await rejects(publishChange(t.editorB, id, { body, changeNote: { kind: 'correction' } }), /yangi tuzatish yozuvini/)
    await publishChange(t.editorB, id, {
      body,
      changeNote: { kind: 'correction' },
      corrections: [correctionRow('Tuzatildi: 1-xatboshida 4,5 mlrd emas, 5,4 mlrd soʻm.')],
    })
    const doc = await live(id)
    expect(doc.corrections).toHaveLength(1)
    const row = doc.corrections[0]
    expect(row.createdBy).toBe(t.editorB.id)
    expect(row.approvedBy).toBe(t.editorB.id)
    expect(row.createdAt).toBeTruthy()
    expect(row.versionId).toBeTruthy()
    expect(doc.significantUpdateAt).toBeTruthy()
    const payload = await testPayload()
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ docId: { equals: String(id) } }, { action: { equals: 'correction.add' } }] },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
  })

  it('the editor-in-chief may override the numbers rule with a reason', async () => {
    const id = await publishedStory(t)
    const body = lexical('Markaziy bank 2026-yilda 4,5 mlrd soʻm ajratdi (https://cbu.uz/2).', 'Ikkinchi xatboshi.')
    await publishChange(t.eic, id, { body, changeNote: { kind: 'minor', reason: 'Faqat havola', numbersOverride: true } })
    expect((await live(id)).significantUpdateAt ?? null).toBeNull()
  })
})

describe('C3: corrections are made by non-authors', () => {
  it('an author-editor cannot add or publish a correction; another editor can', async () => {
    const payload = await testPayload()
    const s = await story(t.authorEditor, [t.authorEditorByline])
    await goOk(t.authorEditor, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    await goOk(t.editorB, s.id, { action: 'publish' })
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { corrections: [correctionRow('Tuzatildi.')], _status: 'draft' } as never, ...as(t.authorEditor) }),
      /Muallif oʻz maqolasiga tuzatish/,
    )
    await payload.update({
      collection: 'articles',
      id: s.id,
      draft: true,
      data: { corrections: [correctionRow('Tuzatildi: sana 8-oktabr.')], changeNote: { kind: 'correction' }, _status: 'draft' } as never,
      ...as(t.editorB),
    })
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.authorEditor) }), /muallif boʻlmagan muharrir/)
    await payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.editorA) })
    expect((await live(s.id)).corrections).toHaveLength(1)
  })
})

describe('C4: the corrections log is append-only', () => {
  async function storyWithCorrection() {
    const id = await publishedStory(t)
    await publishChange(t.editorB, id, { changeNote: { kind: 'correction' }, corrections: [correctionRow('Tuzatildi: birinchi.')] })
    await publishChange(t.eic, id, { changeNote: { kind: 'clarification' }, corrections: [...(await corrections(id)), correctionRow('Aniqlik: ikkinchi.', 'clarification')] })
    return id
  }

  it('removing or reordering a correction fails for every role', async () => {
    const payload = await testPayload()
    const id = await storyWithCorrection()
    const rows = await corrections(id)
    expect(rows).toHaveLength(2)
    for (const u of [t.editorB, t.eic]) {
      await rejects(payload.update({ collection: 'articles', id, draft: true, data: { corrections: [rows[0]], _status: 'draft' } as never, ...as(u) }), /oʻchirilmaydi/)
      await rejects(payload.update({ collection: 'articles', id, draft: true, data: { corrections: [rows[1], rows[0]], _status: 'draft' } as never, ...as(u) }), /tartibi/)
    }
    expect(await corrections(id)).toHaveLength(2)
  })

  it('its text: never by an editor; by the editor-in-chief within 30 minutes (audited), not after', async () => {
    const payload = await testPayload()
    const id = await storyWithCorrection()
    const rows = await corrections(id)
    const edited = (text: string) => [{ ...rows[0], publicText: text }, rows[1]]
    await rejects(payload.update({ collection: 'articles', id, draft: true, data: { corrections: edited('Muharrir'), _status: 'draft' } as never, ...as(t.editorB) }), /oʻzgartirilmaydi/)
    await payload.update({ collection: 'articles', id, draft: true, data: { corrections: edited('Tuzatildi: birinchi (aniqroq).'), _status: 'draft' } as never, ...as(t.eic) })
    expect((await corrections(id))[0].publicText).toBe('Tuzatildi: birinchi (aniqroq).')
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ docId: { equals: String(id) } }, { action: { equals: 'correction.amend' } }] },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect((docs[0].before as Doc).publicText).toBe('Tuzatildi: birinchi.')
    expect((docs[0].after as Doc).publicText).toBe('Tuzatildi: birinchi (aniqroq).')
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(Date.now() + 31 * 60_000)
      const now = await corrections(id)
      await rejects(
        payload.update({ collection: 'articles', id, draft: true, data: { corrections: [{ ...now[0], publicText: 'Kech' }, now[1]], _status: 'draft' } as never, ...as(t.eic) }),
        /30 daqiqa/,
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('a correction cannot be added to a story that was never published, or by a reporter', async () => {
    const payload = await testPayload()
    const s = await story(t.editorA, [t.reporterByline])
    await rejects(
      payload.update({ collection: 'articles', id: s.id, draft: true, data: { corrections: [correctionRow('Erta')], _status: 'draft' } as never, ...as(t.editorA) }),
      /faqat chop etilgan/,
    )
    const id = await publishedStory(t)
    await rejects(
      payload.update({ collection: 'articles', id, draft: true, data: { corrections: [correctionRow('Muxbir')], _status: 'draft' } as never, ...as(t.reporter) }),
      /Murojaatlar/,
    )
  })
})

describe('C7, N-2, N-3: change kinds', () => {
  it('update sets significantUpdateAt; minor does not', async () => {
    const a = await publishedStory(t)
    await publishChange(t.editorB, a, { lead: 'Bank 4,5 mlrd soʻm ajratdi!', changeNote: { kind: 'minor', reason: 'Uslub' } })
    expect((await live(a)).significantUpdateAt ?? null).toBeNull()
    await publishChange(t.editorB, a, { lead: 'Yangilandi: yangi maʼlumot.', changeNote: { kind: 'update', reason: 'Yangi maʼlumot' } })
    expect((await live(a)).significantUpdateAt).toBeTruthy()
  })

  it('an author-editor may publish an update, which asks for a second read', async () => {
    const s = await story(t.authorEditor, [t.authorEditorByline])
    await goOk(t.authorEditor, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    await goOk(t.editorB, s.id, { action: 'publish' })
    await publishChange(t.authorEditor, s.id, { lead: 'Muallif yangiladi.', changeNote: { kind: 'update', reason: 'Yangi raqamsiz maʼlumot' } })
    expect((await live(s.id)).secondRead.required).toBe(true)
  })

  it('a headline changed more than two hours after publication is not minor (N-2)', async () => {
    const id = await publishedStory(t)
    await agePublication(id, 130)
    const title = `${(await live(id)).title} (aniqlandi)`
    await rejects(publishChange(t.editorB, id, { title, changeNote: { kind: 'minor', reason: 'Sarlavha' } }), /2 soat/)
    await publishChange(t.editorB, id, { title, changeNote: { kind: 'update', reason: 'Sarlavha aniqlandi' } })
    expect((await live(id)).title).toBe(title)
  })

  it('a changed institution tag is not minor (N-3)', async () => {
    const payload = await testPayload()
    const inst = await payload.create({ collection: 'institutions', draft: true, data: { name: 'Sinov banki', type: 'bank', city: 'Toshkent' } as never, overrideAccess: true })
    const id = await publishedStory(t)
    await rejects(publishChange(t.editorB, id, { about: inst.id, changeNote: { kind: 'minor', reason: 'Teg' } }), /tashkilot/)
  })

  it('clarification and editor’s note are the editor-in-chief’s', async () => {
    const id = await publishedStory(t)
    await rejects(
      publishChange(t.editorB, id, { changeNote: { kind: 'editors_note' }, corrections: [correctionRow('Tahririyat izohi.', 'editors_note')] }),
      /faqat bosh muharrir/,
    )
    // The editor's row is still in the draft; the editor-in-chief publishes it.
    await publishChange(t.eic, id, { changeNote: { kind: 'editors_note' } })
    expect((await live(id)).corrections[0].kind).toBe('editors_note')
  })
})

describe('C8: withdrawal', () => {
  it('fails for an editor and without a notice; with one the story stays published as withdrawn, and can be restored', async () => {
    const payload = await testPayload()
    const id = await publishedStory(t)
    expect((await go(t.editorA, id, { action: 'withdraw', withdrawal: { publicNotice: 'Izoh', internalReason: 'Sabab' } })).status).toBe(403)
    const noNotice = await go(t.eic, id, { action: 'withdraw', withdrawal: { internalReason: 'Sabab' } })
    expect(noNotice.status).toBe(400)
    expect(restError(noNotice.json)).toMatch(/izohni oʻzbekcha/)
    await goOk(t.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Maqola sud qarori bilan olib tashlandi.', internalReason: 'Sud qarori' } })
    const doc = await live(id)
    expect(doc._status).toBe('published')
    expect(doc.workflowStatus).toBe('withdrawn')
    expect(doc.noindex).toBe(true)
    expect(doc.withdrawal.at).toBeTruthy()
    expect(doc.withdrawal.publicNotice).toBe('Maqola sud qarori bilan olib tashlandi.')
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ docId: { equals: String(id) } }, { action: { equals: 'article.withdraw' } }] },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    // Editors cannot touch a withdrawn story.
    await rejects(payload.update({ collection: 'articles', id, draft: true, data: { lead: 'x', _status: 'draft' } as never, ...as(t.editorA) }), /bosh muharrir/)
    expect((await go(t.eic, id, { action: 'restore' })).status).toBe(400)
    await goOk(t.eic, id, { action: 'restore', comment: 'Sud qarori bekor qilindi' })
    const back = await live(id)
    expect(back.workflowStatus).toBe('published')
    expect(back.withdrawal.at).toBeFalsy()
  })

  it('a story with unpublished edits cannot be withdrawn until they are published or reverted', async () => {
    const payload = await testPayload()
    const id = await publishedStory(t)
    await payload.update({ collection: 'articles', id, draft: true, data: { title: 'Kutilayotgan sarlavha', _status: 'draft' } as never, ...as(t.editorB) })
    const r = await go(t.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Izoh', internalReason: 'Sabab' } })
    expect(r.status).toBe(409)
    expect((await live(id)).workflowStatus).toBe('published')
  })
})
