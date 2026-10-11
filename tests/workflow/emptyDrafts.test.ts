import type { Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { deleteEmptyDrafts, EMPTY_DRAFT_SUMMARY, job } from '@/worker/jobs/emptyDrafts'
import { staff, testPayload } from '../helpers/payload'
import { author, rubric, story } from '../delivery/fixtures'

/**
 * The empty-drafts job (src/worker/jobs/emptyDrafts.ts): each "Yangi yaratish"
 * click saves an empty «Gʻoya» at once; the job deletes those left untouched
 * for 24 hours, and nothing else. Stories are created the way the admin's
 * create view does it (`payload.create({ data: {}, draft: true,
 * overrideAccess: false })`), the clock is moved instead of waiting, and every
 * pass is scoped to this file's stories (test files share one database).
 */
type Doc = Record<string, any>
const HOUR = 60 * 60 * 1000
const later = () => Date.now() + 25 * HOUR

let reporter: Doc
let editor: Doc
let commercial: Doc
const mine: (number | string)[] = []
const scope = (): Where => ({ id: { in: mine } })

async function createAs(user: Doc, data: Doc = {}) {
  const payload = await testPayload()
  const doc = (await payload.create({ collection: 'articles', data: data as never, depth: 0, draft: true, fallbackLocale: false, locale: 'uz', overrideAccess: false, user: user as never })) as Doc
  mine.push(doc.id)
  return doc
}

const exists = async (id: number | string) =>
  Boolean(await (await testPayload()).findByID({ collection: 'articles', id, draft: true, trash: true, depth: 0, overrideAccess: true, disableErrors: true }))

beforeAll(async () => {
  const payload = await testPayload()
  reporter = await staff('reporter', 'empty-drafts-reporter')
  editor = await staff('editor', 'empty-drafts-editor')
  commercial = await staff('commercial', 'empty-drafts-commercial')
  const slug = 'empty-drafts-commercial-byline'
  const found = await payload.find({ collection: 'authors', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  if (!found.docs[0]) {
    await payload.create({
      collection: 'authors',
      data: { name: 'Empty Drafts Hamkorlik', slug, role: 'hamkor', bio: 'Sinov uchun tijorat imzosi.', commercial: true, active: true, user: commercial.id, _status: 'published' } as never,
      overrideAccess: true,
    })
  }
})

afterAll(async () => (await testPayload()).destroy())

describe('what the job deletes', () => {
  it('an empty idea left untouched for 24 hours, whoever clicked «Yangi yaratish» (commercial included)', async () => {
    const empties = [await createAs(reporter), await createAs(editor), await createAs(commercial)]
    expect(empties[2].sponsored?.enabled).toBe(true)
    expect(empties[2].authors).toHaveLength(1)
    // Within 24 hours nothing goes.
    const young = await deleteEmptyDrafts(await testPayload(), { now: Date.now() + 23 * HOUR, scope: { id: { in: empties.map((d) => d.id) } } })
    expect(young.deleted).toEqual([])
    const r = await deleteEmptyDrafts(await testPayload(), { now: later(), scope: { id: { in: empties.map((d) => d.id) } } })
    expect([...r.deleted].sort()).toEqual(empties.map((d) => d.id).sort())
    for (const d of empties) expect(await exists(d.id)).toBe(false)
  })

  it('records each deletion in the audit log as the job, with the reason', async () => {
    const payload = await testPayload()
    const empty = await createAs(reporter)
    await deleteEmptyDrafts(payload, { now: later(), scope: { id: { equals: empty.id } } })
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(empty.id) } }] },
      sort: 'id',
      overrideAccess: true,
    })
    expect(docs.map((d) => d.action)).toEqual(['doc.create', 'doc.delete'])
    expect(docs[1]).toMatchObject({ actorId: null, actorEmail: 'system:empty-drafts', actorRole: 'system', summary: EMPTY_DRAFT_SUMMARY })
    // Its versions go with it.
    expect((await payload.findVersions({ collection: 'articles', where: { parent: { equals: empty.id } }, overrideAccess: true })).totalDocs).toBe(0)
  })
})

describe('what the job never touches', () => {
  let kept: Record<string, Doc>

  beforeAll(async () => {
    const payload = await testPayload()
    kept = {
      titled: await createAs(reporter, { title: 'Sukuk boʻyicha gʻoya' }),
      notes: await createAs(reporter, { editorNotes: 'Bank bilan gaplashish kerak.' }),
      tagged: await createAs(editor, { priority: 'high' }),
      assigned: await createAs(editor, { assignee: reporter.id }),
      edited: await createAs(reporter),
      trashed: await createAs(reporter),
      noPerson: (await payload.create({ collection: 'articles', data: {}, draft: true, depth: 0, overrideAccess: true })) as Doc,
      draftState: (await payload.create({ collection: 'articles', data: { workflowStatus: 'draft' } as never, draft: true, depth: 0, overrideAccess: true, context: { importing: true } })) as Doc,
    }
    mine.push(kept.noPerson.id, kept.draftState.id)
    // Typed into, then emptied again: no longer untouched.
    await payload.update({ collection: 'articles', id: kept.edited.id, data: { title: 'Vaqtincha', _status: 'draft' } as never, draft: true, locale: 'uz', overrideAccess: false, user: reporter as never })
    await payload.update({ collection: 'articles', id: kept.edited.id, data: { title: '', _status: 'draft' } as never, draft: true, locale: 'uz', overrideAccess: false, user: reporter as never })
    // In the trash: the trash has its own rules.
    await payload.update({ collection: 'articles', id: kept.trashed.id, data: { deletedAt: new Date().toISOString(), _status: 'draft' } as never, draft: true, overrideAccess: false, user: reporter as never })
  })

  it('a story with any content, a changed default or a different assignee; one edited after creation; one not made by a person; one past «Gʻoya»; one in the trash', async () => {
    const r = await deleteEmptyDrafts(await testPayload(), { now: later(), scope: scope() })
    expect(r.deleted).toEqual([])
    const reasons = Object.fromEntries(Object.entries(kept).map(([k, d]) => [k, r.kept.find((x) => String(x.id) === String(d.id))?.reason]))
    expect(reasons).toMatchObject({
      // The slug is made from the title, and comes first.
      titled: expect.stringMatching(/^content in (slug|title)$/),
      notes: expect.stringContaining('content in editorNotes'),
      tagged: expect.stringContaining('content in priority'),
      assigned: expect.stringContaining('content in assignee'),
      edited: expect.any(String),
      noPerson: 'not created by a person',
    })
    // Not even a candidate: past «Gʻoya», or in the trash.
    expect(reasons.draftState).toBeUndefined()
    expect(reasons.trashed).toBeUndefined()
    for (const d of Object.values(kept)) expect(await exists(d.id)).toBe(true)
  })

  it('a published story', async () => {
    const payload = await testPayload()
    const live = await story({ tag: 'empty-drafts-live', rubric: (await rubric('yangiliklar')).id, authors: [(await author('empty-drafts')).id] })
    mine.push(live.id)
    const r = await deleteEmptyDrafts(payload, { now: later(), scope: { id: { equals: live.id } } })
    expect(r).toMatchObject({ checked: 0, deleted: [] })
    expect(await exists(live.id)).toBe(true)
  })
})

describe('the worker job', () => {
  it('is the hourly «empty-drafts» job', () => {
    expect(job).toMatchObject({ name: 'empty-drafts', intervalMs: HOUR })
  })
})
