import type { Payload, Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { slugify } from '@/payload/fields/slug'
import { workflow } from '@/payload/hooks/concerns/workflow'
import { testPayload } from '../helpers/payload'
import { account, login, rest, staffPassword } from './rest'

/**
 * Group A (CMS-SPEC §16): anonymous REST, the public Local API read, and the
 * role matrix of §4.2 as access decides it. A2 is in proxy.test.ts, A7 and A9
 * in auth.test.ts, A10 in edge.test.ts, A12 in lint.test.ts.
 *
 * Rules enforced by the workflow concern's hooks (a reporter editing a
 * colleague's draft, commercial's forced sponsored fields) run when that
 * concern registers article hooks.
 */
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const workflowWired = Boolean(workflow.collections?.articles)

let payload: Payload
type Doc = { id: number | string; [k: string]: unknown }
const users: Record<string, Doc> = {}
const cookies: Record<string, string> = {}
const docs: Record<string, Doc> = {}

const body = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 }],
      },
    ],
  },
})

async function article(tag: string, author: Doc, extra: Record<string, unknown> = {}, publish = false) {
  const title = `Kirish sinovi ${tag} ${RUN}`
  return (await payload.create({
    collection: 'articles',
    data: {
      title,
      slug: slugify(title),
      workflowStatus: publish ? 'published' : 'draft',
      lead: 'Markaziy bank yangi hisobot eʼlon qildi.',
      body: body('Hisobotda islomiy moliya xizmatlari haqida maʼlumot berilgan.'),
      rubric: docs.rubric.id,
      authors: [author.id],
      sources: [{ title: 'Hisobot', publisher: 'Markaziy bank' }],
      _status: publish ? 'published' : 'draft',
      ...extra,
    } as never,
    depth: 0,
    overrideAccess: true,
    // Fixtures arrive the way the importer writes them (§11): the workflow
    // rules are what other tests check; these check who may read the result.
    context: { importing: true },
    ...(publish ? {} : { draft: true as const }),
  })) as unknown as Doc
}

beforeAll(async () => {
  payload = await testPayload()
  for (const role of ['reporter', 'editor', 'eic', 'commercial', 'admin'] as const) {
    users[role] = (await account(role, `acl-${role}`)) as unknown as Doc
    cookies[role] = await login(String(users[role].email), staffPassword(`acl-${role}`))
  }
  users.reporter2 = (await account('reporter', 'acl-reporter2')) as unknown as Doc
  const rubric = await payload.find({ collection: 'rubrics', where: { slug: { equals: 'tahlil' } }, limit: 1, overrideAccess: true })
  docs.rubric = (rubric.docs[0] ??
    (await payload.create({ collection: 'rubrics', data: { slug: 'tahlil', order: 2, name: 'Tahlil', _status: 'published' } as never, overrideAccess: true }))) as unknown as Doc
  const byline = async (tag: string, user: Doc, extra: Record<string, unknown> = {}) =>
    ((await payload.find({ collection: 'authors', where: { user: { equals: user.id } }, limit: 1, overrideAccess: true })).docs[0] as unknown as Doc) ??
    (await payload.create({
      collection: 'authors',
      data: { name: `Muallif ${tag} ${RUN}`, slug: slugify(`muallif-${tag}-${RUN}`), role: 'muxbir', bio: 'Islomiy moliya boʻyicha yozadi.', _status: 'published', user: user.id, ...extra } as never,
      overrideAccess: true,
    })) as unknown as Doc
  docs.ownAuthor = await byline('own', users.reporter)
  docs.otherAuthor = await byline('other', users.reporter2)
  docs.commercialAuthor = await byline('tijorat', users.commercial, { commercial: true })

  const future = new Date(Date.now() + 7 * 86_400_000).toISOString()
  docs.published = await article(
    'chop',
    docs.otherAuthor,
    { editorNotes: 'ichki eslatma', sourceNotes: 'maxfiy manba', changeNote: { kind: 'minor', publicText: 'x' } },
    true,
  )
  docs.colleagueDraft = await article('hamkasb', docs.otherAuthor)
  docs.embargoed = await article('embargo', docs.otherAuthor, { embargo: { until: future } })
  docs.sensitive = await article('nozik', docs.otherAuthor, { legallySensitive: true })
  docs.ownEmbargoed = await article('oz-embargo', docs.ownAuthor, { embargo: { until: future } })
})
afterAll(async () => payload.destroy())

const ids = (list: { docs: { id: unknown }[] }) => list.docs.map((d) => d.id)
const mine: Where = { title: { contains: RUN } }

describe('A1: anonymous REST on the CMS host', () => {
  it('every collection denies anonymous reads (403 or an empty result), never drafts', async () => {
    for (const { slug } of payload.config.collections) {
      for (const path of [`/api/${slug}`, `/api/${slug}?draft=true`, `/api/${slug}/versions`]) {
        const r = await rest('GET', path, { origin: null })
        // payload-preferences answers every key with `value: null` for a caller without a user.
        const ok = r.status >= 400 || (r.status === 200 && (r.json.totalDocs === 0 || (r.json.value === null && !r.json.docs)))
        expect([path, r.status, ok]).toEqual([path, r.status, true])
      }
    }
    expect((await rest('GET', `/api/articles/${docs.colleagueDraft.id}?draft=true`, { origin: null })).status).toBe(403)
    expect((await rest('GET', `/api/articles/${docs.published.id}`, { origin: null })).status).toBe(403)
  })

  it('every global denies anonymous reads', async () => {
    for (const { slug } of payload.config.globals) {
      expect([slug, (await rest('GET', `/api/globals/${slug}`, { origin: null })).status]).toEqual([slug, 403])
    }
  })

  it('the access endpoint grants an anonymous caller nothing', async () => {
    const r = await rest('GET', '/api/access', { origin: null })
    for (const [slug, perms] of Object.entries((r.json.collections ?? {}) as Record<string, Record<string, { permission: boolean }>>)) {
      for (const op of ['read', 'create', 'update', 'delete'] as const) expect([slug, op, perms[op]?.permission ?? false]).toEqual([slug, op, false])
    }
  })
})

describe('A3: the public Local API read', () => {
  it('returns published articles only and none of the internal fields', async () => {
    const found = await payload.find({ collection: 'articles', where: mine, overrideAccess: false, pagination: false, depth: 0 })
    expect(ids(found)).toEqual([docs.published.id])
    const drafts = await payload.find({ collection: 'articles', where: mine, overrideAccess: false, draft: true, pagination: false, depth: 0 })
    expect(ids(drafts)).toEqual([docs.published.id])
    const doc = found.docs[0] as unknown as Record<string, unknown>
    for (const field of ['editorNotes', 'sourceNotes', 'changeNote', 'approvedBy', 'validationWarnings', 'legalSignOff']) {
      expect([field, doc[field]]).toEqual([field, undefined])
    }
    expect((doc.sponsored as Record<string, unknown> | undefined)?.contractRef).toBeUndefined()
    await expect(payload.findByID({ collection: 'articles', id: docs.colleagueDraft.id, overrideAccess: false, draft: true })).rejects.toBeTruthy()
  })
})

describe('A4: reporters and other people’s drafts', () => {
  it('reads a colleague’s ordinary draft but not an embargoed or legally sensitive one (draft: true)', async () => {
    const seen = ids(await payload.find({ collection: 'articles', where: mine, user: users.reporter, overrideAccess: false, draft: true, pagination: false, depth: 0 }))
    expect(seen).toEqual(expect.arrayContaining([docs.published.id, docs.colleagueDraft.id, docs.ownEmbargoed.id]))
    expect(seen).not.toContain(docs.embargoed.id)
    expect(seen).not.toContain(docs.sensitive.id)
    for (const hidden of [docs.embargoed, docs.sensitive]) {
      expect((await rest('GET', `/api/articles/${hidden.id}?draft=true`, { cookie: cookies.reporter })).status).not.toBe(200)
    }
    expect((await rest('GET', `/api/articles/${docs.colleagueDraft.id}?draft=true`, { cookie: cookies.reporter })).status).toBe(200)
  })

  it.runIf(workflowWired)('cannot update a colleague’s draft', async () => {
    const r = await rest('PATCH', `/api/articles/${docs.colleagueDraft.id}?draft=true`, { cookie: cookies.reporter, body: { lead: 'Begona tahrir.' } })
    expect(r.status).toBeGreaterThanOrEqual(400)
    const stored = await payload.findByID({ collection: 'articles', id: docs.colleagueDraft.id, draft: true, overrideAccess: true })
    expect(stored.lead).not.toBe('Begona tahrir.')
  })
})

describe('A5: commercial', () => {
  it('cannot read any editorial draft', async () => {
    const seen = ids(await payload.find({ collection: 'articles', where: mine, user: users.commercial, overrideAccess: false, draft: true, pagination: false, depth: 0 }))
    expect(seen).toEqual([docs.published.id])
  })

  it.runIf(workflowWired)('creates articles as sponsored with the commercial byline, whatever was sent', async () => {
    const r = await rest('POST', '/api/articles?draft=true', {
      cookie: cookies.commercial,
      body: { title: `Homiylik ${RUN}`, rubric: docs.rubric.id, authors: [docs.otherAuthor.id], sponsored: { enabled: false } },
    })
    expect(r.status).toBe(201)
    expect(r.json.doc.sponsored?.enabled).toBe(true)
    expect(r.json.doc.authors.map((a: Doc | number) => (typeof a === 'object' ? a.id : a))).toEqual([docs.commercialAuthor.id])
  })
})

describe('A6: admin and articles', () => {
  it('cannot read drafts, update or publish', async () => {
    const seen = ids(await payload.find({ collection: 'articles', where: mine, user: users.admin, overrideAccess: false, draft: true, pagination: false, depth: 0 }))
    expect(seen).toEqual([docs.published.id])
    expect((await rest('PATCH', `/api/articles/${docs.published.id}?draft=true`, { cookie: cookies.admin, body: { lead: 'Admin tahriri.' } })).status).toBe(403)
    expect((await rest('PATCH', `/api/articles/${docs.colleagueDraft.id}`, { cookie: cookies.admin, body: { _status: 'published' } })).status).not.toBe(200)
    expect((await rest('POST', '/api/articles', { cookie: cookies.admin, body: { title: `Admin ${RUN}`, _status: 'published' } })).status).toBe(403)
    const stored = await payload.findByID({ collection: 'articles', id: docs.colleagueDraft.id, draft: true, overrideAccess: true })
    expect(stored._status).toBe('draft')
  })
})

describe('A8: role and active', () => {
  it('a user changing their own role gets an error; an admin may change it', async () => {
    const r = await rest('PATCH', `/api/users/${users.reporter2.id}`, { cookie: await login(String(users.reporter2.email), staffPassword('acl-reporter2')), body: { role: 'eic' } })
    expect(r.status).toBe(403)
    expect((await payload.findByID({ collection: 'users', id: users.reporter2.id, overrideAccess: true })).role).toBe('reporter')
    expect((await rest('PATCH', `/api/users/${users.reporter2.id}`, { cookie: cookies.eic, body: { active: false } })).status).toBeGreaterThanOrEqual(400)
    expect((await rest('PATCH', `/api/users/${users.reporter2.id}`, { cookie: cookies.admin, body: { role: 'editor' } })).status).toBe(200)
    expect((await payload.findByID({ collection: 'users', id: users.reporter2.id, overrideAccess: true })).role).toBe('editor')
    await payload.update({ collection: 'users', id: users.reporter2.id, data: { role: 'reporter' }, overrideAccess: true })
  })
})

describe('A11: personal-data collections', () => {
  it('reporters and editors cannot read digest subscribers or club applications; commercial never sees tuzatish messages', async () => {
    const consent = { given: true, textVersion: 'contact-2026-10-v1', locale: 'uz', at: new Date().toISOString() }
    for (const topic of ['tuzatish', 'reklama'] as const) {
      await payload.create({
        collection: 'contact-messages',
        data: { topic, name: 'Sinov', email: `pd-${topic}-${RUN}@example.com`, message: 'Xabar matni.', consent } as never,
        overrideAccess: true,
      })
    }
    for (const role of ['reporter', 'editor'] as const) {
      for (const slug of ['digest-subscribers', 'club-applications']) {
        expect([role, slug, (await rest('GET', `/api/${slug}`, { cookie: cookies[role] })).status]).toEqual([role, slug, 403])
      }
    }
    const asCommercial = await rest('GET', `/api/contact-messages?limit=100&where[email][contains]=${RUN}`, { cookie: cookies.commercial })
    expect(asCommercial.status).toBe(200)
    expect(asCommercial.json.docs.map((d: { topic: string }) => d.topic)).toEqual(['reklama'])
    const asEic = await rest('GET', `/api/contact-messages?limit=100&where[email][contains]=${RUN}`, { cookie: cookies.eic })
    expect(asEic.json.docs.map((d: { topic: string }) => d.topic).sort()).toEqual(['reklama', 'tuzatish'])
    expect((await rest('GET', '/api/contact-messages', { cookie: cookies.reporter })).status).toBe(403)
  })
})
