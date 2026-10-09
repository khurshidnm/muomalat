import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { account, byline, cookieOf, findArticle, lexical, makeStory, reqAs, rest, restError, rubric, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Attacks on the publish / unpublish / withdraw / restore boundary, from every
 * role and every path a client controls (CMS-SPEC §4.2, §4.3, §5.2, §5.3,
 * §5.8, §5.11, §5.12). The three publish locks (access, the operation guard,
 * the two-person rule) and the trash/retention rules should hold on each one.
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

beforeAll(async () => {
  reporter = await account('reporter', 'pub-reporter')
  reporter2 = await account('reporter', 'pub-reporter2')
  editor = await account('editor', 'pub-editor')
  eic = await account('eic', 'pub-eic')
  commercial = await account('commercial', 'pub-commercial')
  admin = await account('admin', 'pub-admin')
  cookies = {
    reporter: await cookieOf(reporter),
    editor: await cookieOf(editor),
    eic: await cookieOf(eic),
    commercial: await cookieOf(commercial),
    admin: await cookieOf(admin),
  }
  reporterByline = await byline('RT Pub Reporter', { user: reporter })
  otherByline = await byline('RT Pub Other', { user: reporter2 })
  commercialByline = await byline('RT Pub Commercial', { commercial: true, user: commercial })
})

afterAll(async () => {
  const payload = await testPayload()
  await payload.destroy()
})

const liveStatus = async (id: number) => (await findArticle(id, { draft: false }))?._status

describe('reporter: every publish path on a draft', () => {
  let id: number
  beforeAll(async () => {
    id = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
  })

  it('REST create with _status: published is refused', async () => {
    const r = await rest('POST', '/api/articles?locale=uz', {
      cookie: cookies.reporter,
      body: { title: 'Zararli', slug: `rt-pub-create-${Date.now()}`, rubric: await rubric('tahlil'), authors: [reporterByline], _status: 'published', workflowStatus: 'published' },
    })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('REST update {_status: published} is refused', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: cookies.reporter, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).not.toBe('published')
  })

  it('REST update with ?draft=true but _status: published is refused', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.reporter, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).not.toBe('published')
  })

  it('the transition endpoint cannot publish', async () => {
    const r = await rest('POST', `/api/articles/${id}/transition`, { cookie: cookies.reporter, body: { action: 'urgent' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('a plain draft save still works', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.reporter, body: { lead: 'Yangilangan lid.' } })
    expect(r.status).toBe(200)
  })
})

describe('reporter: the four unpublish calls on a live story', () => {
  let id: number
  beforeAll(async () => {
    id = (await makeStory([reporterByline], { assignee: reporter.id }, true)).id as number
  })

  it('a plain PATCH {_status: draft} is refused and the story stays live', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: cookies.reporter, body: { _status: 'draft' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).toBe('published')
  })

  it('a PATCH ?draft=false is refused and the story stays live', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?draft=false&locale=uz`, { cookie: cookies.reporter, body: { lead: 'x' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).toBe('published')
  })

  it('the admin Unpublish (?unpublishAllLocales=true {_status:draft}) is refused', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?unpublishAllLocales=true&locale=uz`, { cookie: cookies.reporter, body: { _status: 'draft' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).toBe('published')
  })

  it('a PATCH with neither draft nor _status is refused', async () => {
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: cookies.reporter, body: { lead: 'boshqa' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).toBe('published')
  })
})

describe('commercial: cannot publish editorial or its own sponsored story', () => {
  it('commercial REST publish of an editorial story is refused', async () => {
    const id = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: cookies.commercial, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).not.toBe('published')
  })

  it('commercial cannot publish a sponsored story (SP-6: eic only)', async () => {
    const id = (await makeStory([commercialByline], { sponsored: { enabled: true, partner: 'X', disclosure: 'Reklama', contractRef: 'C-1' } })).id as number
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: cookies.commercial, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).not.toBe('published')
  })
})

describe('admin: no editorial writing or publishing (separation of duties, A6)', () => {
  it('admin cannot publish an article over REST', async () => {
    const id = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz`, { cookie: cookies.admin, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(id)).not.toBe('published')
  })

  it('admin cannot save a draft of an article either', async () => {
    const id = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.admin, body: { lead: 'admin yozdi' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('"Publish in <locale>" (publishSpecificLocale) is refused for every role (B15)', () => {
  it('reporter and editor are both refused', async () => {
    const id = (await makeStory([otherByline], {}, true)).id as number
    for (const role of ['reporter', 'editor'] as const) {
      const r = await rest('PATCH', `/api/articles/${id}?publishSpecificLocale=ru&locale=ru`, { cookie: cookies[role], body: { _status: 'published', title: 'RU' } })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })
})

describe('direct workflowStatus change without the transition endpoint is refused (B11)', () => {
  it('a reporter PATCH that sets workflowStatus is rejected', async () => {
    const id = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.reporter, body: { workflowStatus: 'ready' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await findArticle(id))?.workflowStatus).toBe('draft')
  })

  it('an editor PATCH that sets workflowStatus is rejected too', async () => {
    const id = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: cookies.editor, body: { workflowStatus: 'ready' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('bulk update endpoint (PATCH /api/articles?where=…)', () => {
  it('a reporter cannot bulk-publish, and no row is published', async () => {
    const a = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    const b = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    const r = await rest('PATCH', `/api/articles?where[id][in]=${a},${b}&locale=uz`, { cookie: cookies.reporter, body: { _status: 'published' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await liveStatus(a)).not.toBe('published')
    expect(await liveStatus(b)).not.toBe('published')
  })

  it('a reporter cannot bulk-unpublish live stories', async () => {
    const a = (await makeStory([reporterByline], {}, true)).id as number
    const b = (await makeStory([otherByline], {}, true)).id as number
    const r = await rest('PATCH', `/api/articles?where[id][in]=${a},${b}&locale=uz`, { cookie: cookies.reporter, body: { _status: 'draft' } })
    // either refused outright or reported per-doc as errors; neither row may leave 'published'
    if (r.status === 200) expect(r.json.errors?.length ?? 0).toBeGreaterThan(0)
    expect(await liveStatus(a)).toBe('published')
    expect(await liveStatus(b)).toBe('published')
  })

  it('an editor cannot bulk-unpublish live stories (only the accidental-unpublish transition, eic, ≤15 min)', async () => {
    const a = (await makeStory([otherByline], {}, true)).id as number
    const r = await rest('PATCH', `/api/articles?where[id][equals]=${a}&locale=uz`, { cookie: cookies.editor, body: { _status: 'draft' } })
    if (r.status === 200) expect(r.json.errors?.length ?? 0).toBeGreaterThan(0)
    expect(await liveStatus(a)).toBe('published')
  })
})

describe('bulk delete endpoint (DELETE /api/articles?where=…)', () => {
  it('a reporter cannot bulk-delete, and the rows survive', async () => {
    const a = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    const r = await rest('DELETE', `/api/articles?where[id][equals]=${a}`, { cookie: cookies.reporter })
    if (r.status === 200) expect(r.json.errors?.length ?? 0).toBeGreaterThan(0)
    expect(await findArticle(a, { draft: true })).not.toBeNull()
  })

  it('a bulk delete cannot remove a published story, for anyone including the editor-in-chief (C10)', async () => {
    const a = (await makeStory([otherByline], {}, true)).id as number
    for (const role of ['editor', 'eic', 'admin'] as const) {
      const r = await rest('DELETE', `/api/articles?where[id][equals]=${a}`, { cookie: cookies[role] })
      if (r.status === 200) expect([role, r.json.errors?.length ?? 0]).toEqual([role, expect.any(Number)])
      expect([role, (await findArticle(a, { draft: false }))?._status]).toEqual([role, 'published'])
    }
  })
})

describe('duplicate is disabled on articles', () => {
  it('POST /api/articles/:id/duplicate is refused for every role', async () => {
    const id = (await makeStory([otherByline], {}, true)).id as number
    for (const role of ['reporter', 'editor', 'eic', 'commercial', 'admin'] as const) {
      const r = await rest('POST', `/api/articles/${id}/duplicate?locale=uz`, { cookie: cookies[role], body: {} })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })
})

describe('trash and restore-from-trash', () => {
  it('a published story cannot be trashed by a bulk update with deletedAt, for anyone', async () => {
    const id = (await makeStory([otherByline], {}, true)).id as number
    for (const role of ['editor', 'eic'] as const) {
      const r = await rest('PATCH', `/api/articles/${id}?locale=uz&draft=true`, { cookie: cookies[role], body: { deletedAt: new Date().toISOString() } })
      expect([role, r.status >= 400]).toEqual([role, true])
      expect([role, Boolean((await findArticle(id, { draft: false }))?.deletedAt)]).toEqual([role, false])
    }
  })

  it('a reporter cannot trash a colleague’s draft', async () => {
    const id = (await makeStory([otherByline])).id as number
    const r = await rest('PATCH', `/api/articles/${id}?locale=uz&draft=true`, { cookie: cookies.reporter, body: { deletedAt: new Date().toISOString() } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('version restore (B14, §5.12): a published story restores only as a draft', () => {
  let id: number
  let versionId: string
  beforeAll(async () => {
    const payload = await testPayload()
    id = (await makeStory([otherByline], {}, true)).id as number
    // a later draft, so there is a prior version to restore
    await payload.update({ collection: 'articles', id, draft: true, data: { lead: 'Keyingi qoralama.', _status: 'draft' } as never, overrideAccess: true, context: { importing: true } })
    const versions = await payload.findVersions({ collection: 'articles', where: { parent: { equals: id } }, sort: '-createdAt', limit: 5, overrideAccess: true })
    versionId = String(versions.docs[versions.docs.length - 1].id)
  })

  it('restore without ?draft=true is refused for every role (would republish)', async () => {
    for (const role of ['reporter', 'editor', 'eic', 'commercial', 'admin'] as const) {
      const r = await rest('POST', `/api/articles/${id}/versions/${versionId}?locale=uz`, { cookie: cookies[role], body: {} })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })
})

describe('copy-from-uz cannot be used to publish or to approve a translation', () => {
  it('a reporter who is not the assigned translator is refused', async () => {
    const id = (await makeStory([otherByline], {}, true)).id as number
    const r = await rest('POST', `/api/articles/${id}/copy-from-uz`, { cookie: cookies.reporter, body: { locale: 'ru' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('copy-from-uz never publishes: the live row stays as it was', async () => {
    const id = (await makeStory([otherByline], {}, true)).id as number
    const before = await liveStatus(id)
    const r = await rest('POST', `/api/articles/${id}/copy-from-uz`, { cookie: cookies.editor, body: { locale: 'ru' } })
    expect(r.status).toBe(200)
    expect(await liveStatus(id)).toBe(before)
    // The copied ru draft is never auto-approved.
    const ru = await findArticle(id, { draft: true, locale: 'ru' })
    expect((ru?.translation as Doc | undefined)?.status).not.toBe('approved')
  })
})

describe('anonymous cannot write anything', () => {
  it('an anonymous REST create and publish are refused', async () => {
    const create = await rest('POST', '/api/articles?locale=uz', { body: { title: 'anon', slug: `anon-${Date.now()}`, _status: 'published' }, origin: null })
    expect(create.status).toBeGreaterThanOrEqual(400)
  })
})

describe('careless in-process script: the Local API as a user still enforces publish rules', () => {
  it('a reporter-bound Local API update that publishes is refused by the two-person rule', async () => {
    const payload = await testPayload()
    const id = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
    let threw = false
    try {
      await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...reqAs(reporter, payload) })
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
    expect(await liveStatus(id)).not.toBe('published')
  })
})
