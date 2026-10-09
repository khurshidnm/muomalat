import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { Articles } from '@/payload/collections/Articles'
import { testPayload } from '../helpers/payload'
import { as, cookieOf, latest, lexical, live, publishedStory, rejects, rest, team, type Doc, type Team, type U } from './helpers'

/**
 * The workflow parts of acceptance group F, and C6 (CMS-SPEC §6.3, §3.3 tab
 * Tarjima, §5.6): translation status, approval by someone other than the
 * translator, edits after approval, machine drafts, the translator's limits,
 * the copy-from-Uzbek action, arrays across locales and payloadcms#18246.
 */
let t: Team
beforeAll(async () => {
  t = await team('tr')
})
afterAll(async () => (await testPayload()).destroy())

const ru = (u: U, id: number, data: Doc) =>
  testPayload().then((p) => p.update({ collection: 'articles', id, locale: 'ru', draft: true, data: { ...data, _status: 'draft' } as never, ...as(u) }))

/** A published story whose ru translation is assigned to the translator. */
async function assigned(): Promise<number> {
  const id = await publishedStory(t)
  await ru(t.editorA, id, { translation: { assignee: t.translator.id } })
  return id
}

async function translated(): Promise<number> {
  const id = await assigned()
  await ru(t.translator, id, { title: 'Тестовая статья', lead: 'Банк выделил 4,5 млрд сумов.', body: lexical('Русский текст.') })
  return id
}

const ruTranslation = async (id: number) => ((await latest(id, 'ru')).translation ?? {}) as Doc

describe('translator saves', () => {
  it('a translator edits only the assigned locale; the status moves to in_edit and the translator is recorded', async () => {
    const id = await translated()
    const tr = await ruTranslation(id)
    expect(tr.status).toBe('in_edit')
    expect(tr.translatedBy).toBe(t.translator.id)
    await rejects(ru(t.translator, id, { sources: [{ title: 'Boshqa', publisher: 'X', type: 'report' }] }), /Tarjimon faqat ru/)
    const payload = await testPayload()
    await rejects(
      payload.update({ collection: 'articles', id, locale: 'en', draft: true, data: { title: 'English', _status: 'draft' } as never, ...as(t.translator) }),
      /biriktirilmagan/,
    )
  })

  it('F9: a ru save, with the hooks’ nested reads, leaves every uz value unchanged', async () => {
    const id = await assigned()
    const before = await latest(id)
    await ru(t.translator, id, { title: 'Заголовок', lead: 'Лид', body: lexical('Текст.') })
    const after = await latest(id)
    for (const k of ['title', 'lead', 'kicker', 'imageCaption']) expect(after[k]).toEqual(before[k])
    expect(after.body).toEqual(before.body)
    expect((await latest(id, 'ru')).title).toBe('Заголовок')
  })
})

describe('approval (F3, F4, F7)', () => {
  it('F3: a translator cannot approve; an editor cannot approve their own translation; another editor can', async () => {
    const id = await translated()
    await rejects(ru(t.translator, id, { translation: { status: 'approved' } }), /faqat muharrir/)
    const own = await assigned()
    await ru(t.editorA, own, { title: 'Перевод редактора', lead: 'Лид', body: lexical('Текст.') })
    await rejects(ru(t.editorA, own, { translation: { status: 'approved' } }), /Oʻz tarjimangizni/)
    await ru(t.editorB, own, { translation: { status: 'approved' } })
    const tr = await ruTranslation(own)
    expect(tr.status).toBe('approved')
    expect(tr.reviewedBy).toBe(t.editorB.id)
    expect(tr.approvedAt).toBeTruthy()
    expect(tr.contentHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('F4: an edit of an approved translation sets it to in_edit, unless the reviewer makes it', async () => {
    const id = await translated()
    await ru(t.editorB, id, { translation: { status: 'approved' } })
    const hash = (await ruTranslation(id)).contentHash
    await ru(t.editorB, id, { lead: 'Рецензент поправил.' })
    const kept = await ruTranslation(id)
    expect(kept.status).toBe('approved')
    expect(kept.contentHash).not.toBe(hash)
    await ru(t.translator, id, { lead: 'Переводчик поправил.' })
    const back = await ruTranslation(id)
    expect(back.status).toBe('in_edit')
    expect(back.contentHash ?? null).toBeNull()
  })

  it('F7: a machine draft cannot be approved without passing through in_edit', async () => {
    const id = await assigned()
    await ru(t.translator, id, { title: 'Машинный', lead: 'Лид', body: lexical('Текст.'), translation: { status: 'machine_draft', machine: { used: true, engine: 'test' } } })
    expect((await ruTranslation(id)).status).toBe('machine_draft')
    await rejects(ru(t.editorB, id, { translation: { status: 'approved' } }), /Tahrirda/)
    await ru(t.translator, id, { translation: { status: 'in_edit' } })
    await ru(t.editorB, id, { translation: { status: 'approved' } })
    expect((await ruTranslation(id)).status).toBe('approved')
  })

  it('a forged approval (status and reviewer sent by a client) never passes', async () => {
    const id = await translated()
    await rejects(ru(t.translator, id, { translation: { status: 'approved', reviewedBy: t.editorB.id, contentHash: 'x' } }))
    const tr = await ruTranslation(id)
    expect(tr.status).not.toBe('approved')
    expect(tr.reviewedBy ?? null).toBeNull()
  })
})

describe('C6: corrections and updates make approved translations outdated', () => {
  it('after an update the ru translation is outdated with its hash kept; after a correction the hash is cleared', async () => {
    const payload = await testPayload()
    const id = await translated()
    await ru(t.editorB, id, { translation: { status: 'approved' } })
    await payload.update({ collection: 'articles', id, draft: true, data: { lead: 'Bank 4,5 mlrd soʻm ajratdi: yangi tafsilot.', changeNote: { kind: 'update', reason: 'Tafsilot' }, _status: 'draft' } as never, ...as(t.editorB) })
    await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(t.editorB) })
    const afterUpdate = (await live(id, 'ru')).translation
    expect(afterUpdate.status).toBe('outdated')
    expect(afterUpdate.contentHash).toMatch(/^[0-9a-f]{64}$/)
    // The ru text is intact.
    expect((await live(id, 'ru')).title).toBe('Тестовая статья')

    await payload.update({
      collection: 'articles',
      id,
      draft: true,
      data: { changeNote: { kind: 'correction' }, corrections: [{ kind: 'correction', publicText: 'Tuzatildi: lid.' }], _status: 'draft' } as never,
      ...as(t.editorB),
    })
    await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(t.editorB) })
    const afterCorrection = (await live(id, 'ru')).translation
    expect(afterCorrection.status).toBe('outdated')
    expect(afterCorrection.contentHash ?? null).toBeNull()
    expect((await live(id)).corrections).toHaveLength(1)
  })
})

describe('F10: arrays across locales', () => {
  it('a ru save that drops a correction row, or sends it without its id, is rejected; the uz text stays', async () => {
    const payload = await testPayload()
    const id = await translated()
    await payload.update({
      collection: 'articles',
      id,
      draft: true,
      data: { changeNote: { kind: 'correction' }, corrections: [{ kind: 'correction', publicText: 'Tuzatildi: sana.' }], _status: 'draft' } as never,
      ...as(t.editorB),
    })
    await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(t.editorB) })
    const row = (await latest(id, 'ru')).corrections[0]
    await rejects(ru(t.editorB, id, { corrections: [] }), /oʻchirilmaydi/)
    await rejects(ru(t.editorB, id, { corrections: [{ ...row, id: undefined, publicText: 'Исправлено.' }] }))
    await ru(t.editorB, id, { corrections: [{ ...row, publicText: 'Исправлено: дата.' }] })
    expect((await latest(id)).corrections[0].publicText).toBe('Tuzatildi: sana.')
    expect((await latest(id, 'ru')).corrections[0].publicText).toBe('Исправлено: дата.')
  })
})

describe('F11: copy from Uzbek', () => {
  it('the built-in Copy to locale is off', () => {
    expect(Articles.admin?.disableCopyToLocale).toBe(true)
  })

  it('fills only empty fields (an empty Lexical body counts), saves a draft, sets in_edit, never copies translation.*', async () => {
    const id = await assigned()
    const empty = { root: { type: 'root', children: [{ type: 'paragraph', children: [], direction: null, format: '', indent: 0, version: 1 }], direction: null, format: '', indent: 0, version: 1 } }
    await ru(t.editorA, id, { title: 'Свой заголовок', body: empty })
    const liveBefore = await live(id, 'ru')
    const r = await rest('POST', `/api/articles/${id}/copy-from-uz`, { cookie: await cookieOf(t.translator), body: { locale: 'ru' } })
    expect(r.status, JSON.stringify(r.json)).toBe(200)
    expect(r.json.copied).toEqual(expect.arrayContaining(['lead', 'body']))
    expect(r.json.copied).not.toContain('title')
    const doc = await latest(id, 'ru')
    const uz = await latest(id)
    expect(doc.title).toBe('Свой заголовок')
    expect(doc.lead).toBe(uz.lead)
    expect(doc.body).toEqual(uz.body)
    expect(doc._status).toBe('draft')
    expect(doc.translation.status).toBe('in_edit')
    expect(doc.translation.translatedBy).toBe(t.translator.id)
    expect(doc.translation.assignee).toBe(t.translator.id)
    expect(doc.translation.reviewedBy ?? null).toBeNull()
    // Drafts only: the live ru text did not change.
    expect((await live(id, 'ru')).lead ?? null).toEqual(liveBefore.lead ?? null)

    const machine = await rest('POST', `/api/articles/${id}/copy-from-uz`, { cookie: await cookieOf(t.translator), body: { locale: 'ru', overwrite: ['title'], machine: true } })
    expect(machine.json.copied).toEqual(['title'])
    expect((await latest(id, 'ru')).translation.status).toBe('machine_draft')
  })

  it('refuses someone who may not edit that locale', async () => {
    const id = await publishedStory(t)
    const r = await rest('POST', `/api/articles/${id}/copy-from-uz`, { cookie: await cookieOf(t.translator), body: { locale: 'en' } })
    expect(r.status).toBe(403)
  })
})
