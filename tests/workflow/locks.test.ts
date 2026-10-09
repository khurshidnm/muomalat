import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { testPayload } from '../helpers/payload'
import {
  agePublication,
  as,
  cookieOf,
  go,
  goOk,
  latest,
  live,
  publishedStory,
  rejects,
  rest,
  restError,
  story,
  team,
  type Team,
  type U,
} from './helpers'

/**
 * The three publish locks of PHASE0 §1.2 and the unpublish, restore, trash
 * and per-locale rules around them (CMS-SPEC §4.3, §5.8, §5.12, §6.1; §16 B1,
 * B11, B14, B15, C9, C10, C11, K17).
 */
let t: Team
beforeAll(async () => {
  t = await team('lk')
})
afterAll(async () => (await testPayload()).destroy())

const patch = async (u: U, id: number, query: string, body: Record<string, unknown>) =>
  rest('PATCH', `/api/articles/${id}${query}`, { cookie: await cookieOf(u), body })

async function pendingDraft(id: number, by: U, lead: string) {
  const r = await patch(by, id, '?draft=true', { lead, _status: 'draft' })
  expect(r.status, JSON.stringify(r.json)).toBe(200)
}

describe('B1: a reporter can never publish or unpublish', () => {
  it('REST publish, create-published, publish with ?draft=true and publish in one locale are refused', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    for (const [query, body] of [
      ['', { _status: 'published' }],
      ['?draft=true', { _status: 'published' }],
      ['?publishSpecificLocale=ru', { _status: 'published' }],
    ] as const) {
      const r = await patch(t.reporter, s.id, query, body)
      expect(r.status, `${query} ${JSON.stringify(r.json)}`).toBe(403)
    }
    const created = await rest('POST', '/api/articles', { cookie: await cookieOf(t.reporter), body: { title: 'Toʻgʻridan-toʻgʻri', _status: 'published' } })
    expect(created.status).toBe(403)
    expect((await live(s.id))._status).toBe('draft')
  })

  it('the four unpublish calls on a live story are refused; the story stays live', async () => {
    const id = await publishedStory(t)
    const liveLead = (await live(id)).lead
    await pendingDraft(id, t.reporter, 'Muxbirning qoralamasi')
    for (const [query, body] of [
      ['?unpublishAllLocales=true', { _status: 'draft' }],
      ['', { _status: 'draft' }],
      ['?draft=false', { lead: 'x' }],
      ['', { lead: 'y' }],
    ] as const) {
      const r = await patch(t.reporter, id, query, body)
      expect(r.status, `${query} ${JSON.stringify(body)}`).toBe(403)
    }
    const main = await live(id)
    expect(main._status).toBe('published')
    expect(main.lead).toBe(liveLead)
  })

  it('draft saves and autosave on the published story still succeed and leave the live row alone', async () => {
    const id = await publishedStory(t)
    const liveLead = (await live(id)).lead
    const save = await patch(t.reporter, id, '?draft=true', { lead: 'Qoralama 1', _status: 'draft' })
    expect(save.status).toBe(200)
    const auto = await patch(t.reporter, id, '?draft=true&autosave=true', { lead: 'Avtosaqlash', _status: 'draft' })
    expect(auto.status).toBe(200)
    expect((await live(id)).lead).toBe(liveLead)
    expect((await latest(id)).lead).toBe('Avtosaqlash')
  })

  it('restoring a version without draft, the transition endpoint and the Local API with a user are refused', async () => {
    const payload = await testPayload()
    const id = await publishedStory(t)
    const { docs } = await payload.findVersions({ collection: 'articles', where: { parent: { equals: id } }, sort: '-createdAt', limit: 1, overrideAccess: true })
    const restore = await rest('POST', `/api/articles/versions/${docs[0].id}`, { cookie: await cookieOf(t.reporter) })
    expect(restore.status).toBe(403)
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    expect((await go(t.reporter, s.id, { action: 'publish' })).status).toBe(403)
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.reporter) }), /Faqat muharrir/)
    await rejects(payload.update({ collection: 'articles', id, data: { _status: 'draft' } as never, ...as(t.reporter) }), /Faqat muharrir/)
    expect((await live(s.id))._status).toBe('draft')
    expect((await live(id))._status).toBe('published')
  })

  it('commercial is locked the same way', async () => {
    const payload = await testPayload()
    const s = await story(t.commercial, [t.commercialByline])
    await rejects(payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, ...as(t.commercial) }), /Faqat muharrir/)
  })
})

describe('B11: workflowStatus changes only through transitions', () => {
  it('a PATCH that sets workflowStatus is rejected, for an editor too', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    for (const u of [t.reporter, t.editorA]) {
      const r = await patch(u, s.id, '?draft=true', { workflowStatus: 'ready', _status: 'draft' })
      expect(r.status).toBe(403)
      expect(restError(r.json)).toMatch(/tugmalari orqali/)
    }
    expect((await latest(s.id)).workflowStatus).toBe('draft')
    // Sending the current value back, as the admin form does, is fine.
    expect((await patch(t.reporter, s.id, '?draft=true', { workflowStatus: 'draft', lead: 'Yangi lid', _status: 'draft' })).status).toBe(200)
  })
})

describe('B14: version restore on a published story', () => {
  it('a restore without "as draft" is refused for every role; "Restore as draft" keeps the live content', async () => {
    const payload = await testPayload()
    const id = await publishedStory(t)
    const liveLead = (await live(id)).lead
    const { docs } = await payload.findVersions({
      collection: 'articles',
      where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
      sort: '-createdAt',
      limit: 1,
      overrideAccess: true,
    })
    const v = docs[0].id
    await pendingDraft(id, t.editorA, 'Keyingi qoralama')
    for (const u of [t.editorA, t.eic]) {
      const r = await rest('POST', `/api/articles/versions/${v}`, { cookie: await cookieOf(u) })
      expect(r.status, JSON.stringify(r.json)).toBe(403)
      expect(restError(r.json)).toMatch(/Qoralama sifatida tiklash/)
    }
    const ok = await rest('POST', `/api/articles/versions/${v}?draft=true`, { cookie: await cookieOf(t.editorA) })
    expect(ok.status, JSON.stringify(ok.json)).toBe(200)
    const main = await live(id)
    expect(main._status).toBe('published')
    expect(main.lead).toBe(liveLead)
    const draft = await latest(id)
    expect(draft._status).toBe('draft')
    expect(draft.lead).toBe(liveLead)
    // The workflow record belongs to the story, not to the version.
    expect(draft.workflowStatus).toBe('published')
    expect(draft.firstPublishedAt).toBe(main.firstPublishedAt)
  })
})

describe('B15: "Publish in <locale>" is refused for every role', () => {
  it('over REST and the Local API', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    for (const u of [t.editorB, t.eic]) {
      const r = await patch(u, s.id, '?publishSpecificLocale=ru', { _status: 'published' })
      expect(r.status).toBe(403)
      await rejects(
        payload.update({ collection: 'articles', id: s.id, data: { _status: 'published' } as never, publishSpecificLocale: 'ru', ...as(u) }),
        /Bitta tilda chop etish/,
      )
    }
    expect((await live(s.id))._status).toBe('draft')
  })
})

describe('C9, C11: unpublishing', () => {
  it('within 15 minutes the editor-in-chief may unpublish with a reason; an editor may not', async () => {
    const id = await publishedStory(t)
    expect((await go(t.editorA, id, { action: 'unpublish', comment: 'Xato' })).status).toBe(403)
    const viaButton = await patch(t.editorA, id, '?unpublishAllLocales=true', { _status: 'draft' })
    expect(viaButton.status).toBe(403)
    const noReason = await patch(t.eic, id, '?unpublishAllLocales=true', { _status: 'draft' })
    expect(noReason.status).toBe(400)
    expect(restError(noReason.json)).toMatch(/sababini/)
    const withReason = await patch(t.eic, id, '?unpublishAllLocales=true', { _status: 'draft', changeNote: { reason: 'Xato chop etildi' } })
    expect(withReason.status, JSON.stringify(withReason.json)).toBe(200)
    const doc = await live(id)
    expect(doc._status).toBe('draft')
    expect(doc.workflowStatus).toBe('draft')
    expect(doc.approvedBy).toBeFalsy()

    const other = await publishedStory(t)
    const bare = await go(t.eic, other, { action: 'unpublish' })
    expect(bare.status).toBe(400)
    await goOk(t.eic, other, { action: 'unpublish', comment: 'Notoʻgʻri maqola' })
    expect((await live(other))._status).toBe('draft')
  })

  it('more than 15 minutes after first publication every unpublish call fails for every role', async () => {
    const id = await publishedStory(t)
    await agePublication(id, 20)
    await pendingDraft(id, t.editorA, 'Kutilayotgan qoralama')
    for (const u of [t.editorA, t.eic]) {
      for (const [query, body] of [
        ['?unpublishAllLocales=true', { _status: 'draft', changeNote: { reason: 'Sabab' } }],
        ['', { _status: 'draft' }],
        ['?draft=false', { lead: 'x' }],
        ['', { lead: 'y' }],
      ] as const) {
        const r = await patch(u, id, query, body)
        expect(r.status, `${u.tag} ${query} ${JSON.stringify(r.json)}`).toBe(403)
      }
      expect((await go(u, id, { action: 'unpublish', comment: 'Sabab' })).status).toBe(403)
    }
    expect((await live(id))._status).toBe('published')
  })
})

describe('C10: trash and delete', () => {
  it('a published story cannot be trashed or deleted by anyone, admin included', async () => {
    const id = await publishedStory(t)
    for (const u of [t.reporter, t.editorA, t.eic]) {
      const r = await patch(u, id, '', { deletedAt: new Date().toISOString() })
      expect(r.status, u.tag).toBe(403)
    }
    for (const u of [t.eic, t.admin]) {
      const r = await rest('DELETE', `/api/articles/${id}`, { cookie: await cookieOf(u) })
      expect(r.status, u.tag).toBe(403)
    }
    const main = await live(id)
    expect(main._status).toBe('published')
    expect(main.deletedAt).toBeFalsy()
  })

  it('a never-published draft goes to the trash by its reporter and is deleted by the editor-in-chief only', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    expect((await patch(t.editorA, s.id, '', { deletedAt: new Date().toISOString() })).status).toBe(200)
    const back = await rest('PATCH', `/api/articles/${s.id}?trash=true`, { cookie: await cookieOf(t.reporter), body: { deletedAt: null, _status: 'draft' } })
    expect(back.status, JSON.stringify(back.json)).toBe(200)
    expect((await patch(t.reporter, s.id, '', { deletedAt: new Date().toISOString() })).status).toBe(200)
    expect((await rest('DELETE', `/api/articles/${s.id}?trash=true`, { cookie: await cookieOf(t.editorA) })).status).toBe(403)
    const del = await rest('DELETE', `/api/articles/${s.id}?trash=true`, { cookie: await cookieOf(t.eic) })
    expect(del.status, JSON.stringify(del.json)).toBe(200)
  })

  it('a reporter cannot trash a colleague’s draft or a submitted story', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    await goOk(t.reporter, s.id, { action: 'submit' })
    expect((await patch(t.reporter, s.id, '', { deletedAt: new Date().toISOString() })).status).toBe(403)
  })
})

describe('K17: the transition endpoint and a foreign origin', () => {
  it('a valid cookie from https://evil.example gets 401 and nothing changes', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    const r = await rest('POST', `/api/articles/${s.id}/transition`, { cookie: await cookieOf(t.reporter), origin: 'https://evil.example', body: { action: 'submit' } })
    expect(r.status).toBe(401)
    expect((await latest(s.id)).workflowStatus).toBe('draft')
    const anon = await rest('POST', `/api/articles/${s.id}/transition`, { body: { action: 'submit' } })
    expect(anon.status).toBe(401)
  })
})

describe('the admin form follows the edit rule (§4.3)', () => {
  const canUpdate = async (u: U, id: number) => {
    const r = await rest('POST', `/api/articles/access/${id}`, { cookie: await cookieOf(u), body: {} })
    expect(r.status, JSON.stringify(r.json)).toBe(200)
    // Sanitised permissions: `update: true` when allowed, no key when not.
    return Boolean(r.json.update?.permission ?? r.json.update)
  }

  it('is editable for the reporter on their draft, read-only once it is in edit, and stays editable for editors', async () => {
    const s = await story(t.reporter, [t.reporterByline])
    expect(await canUpdate(t.reporter, s.id)).toBe(true)
    await goOk(t.reporter, s.id, { action: 'submit' })
    expect(await canUpdate(t.reporter, s.id)).toBe(false)
    expect(await canUpdate(t.editorA, s.id)).toBe(true)
    // A real write is still refused by the hook, with its own message.
    const r = await patch(t.reporter, s.id, '?draft=true', { lead: 'Muxbir tahriri.', _status: 'draft' })
    expect(r.status).toBe(403)
    expect(restError(r.json)).toMatch(/muxbir oʻzgartira olmaydi/)
  })

  it('an editor gets a read-only form on a sponsored story; the editor-in-chief does not', async () => {
    const payload = await testPayload()
    const s = await payload.create({
      collection: 'articles',
      draft: true,
      data: { title: `Homiylik formasi ${Date.now()}`, authors: [t.commercialByline], _status: 'draft' } as never,
      ...as(t.commercial),
    })
    expect(await canUpdate(t.editorA, s.id as number)).toBe(false)
    expect(await canUpdate(t.eic, s.id as number)).toBe(true)
    expect(await canUpdate(t.commercial, s.id as number)).toBe(true)
  })
})
