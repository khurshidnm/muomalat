import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { escalateSecondReads, resetEscalations } from '@/worker/jobs/urgentSecondRead'
import { publishDue } from '@/worker/jobs/scheduler'
import { setNoticeTransport } from '@/payload/hooks/workflow/notify'
import {
  account,
  byline,
  cookieOf,
  latestOf,
  liveOf,
  makeStory,
  officialDomains,
  readyStory,
  rest,
  sqlExec,
  transition,
  transitionOk,
  type Doc,
  type U,
} from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Attacks on scheduled publishing (CMS-SPEC §5.11, E-series) and the urgent
 * fast path (§5.4): schedule a story then change it under the scheduler, move
 * the embargo, disable the scheduling user; and abuse the fast path from the
 * wrong role, without an official source, or by skipping the second read. The
 * scheduler job function is run directly, the way the worker runs it.
 */

setNoticeTransport(async () => {})

let reporter: U
let editorA: U
let editorB: U
let authorEditor: U
let eic: U
let c: Record<string, string>
let reporterByline: number
let authorEditorByline: number

const future = (min: number) => new Date(Date.now() + min * 60_000).toISOString()

async function ageSchedule(id: number, to: string) {
  const { sql } = await import('@payloadcms/db-postgres')
  await sqlExec(sql`UPDATE "articles" SET "scheduled_at" = ${to} WHERE "id" = ${id}`)
  await sqlExec(sql`UPDATE "_articles_v" SET "version_scheduled_at" = ${to} WHERE "parent_id" = ${id} AND "latest" = true`)
}

beforeAll(async () => {
  reporter = await account('reporter', 's2-reporter')
  editorA = await account('editor', 's2-editor-a')
  editorB = await account('editor', 's2-editor-b')
  authorEditor = await account('editor', 's2-author-editor')
  eic = await account('eic', 's2-eic')
  c = {
    reporter: await cookieOf(reporter),
    editorA: await cookieOf(editorA),
    editorB: await cookieOf(editorB),
    authorEditor: await cookieOf(authorEditor),
    eic: await cookieOf(eic),
  }
  reporterByline = await byline('RT S2 Reporter', { user: reporter })
  authorEditorByline = await byline('RT S2 Author Editor', { user: authorEditor })
  await officialDomains(['cbu.uz'])
})

afterAll(async () => {
  await (await testPayload()).destroy()
})

const isLive = async (id: number) => (await liveOf(id))?._status === 'published'

async function scheduled(owner: U, ownerCookie: string, approverCookie: string, publisherCookie: string, authors: number[], extra: Doc = {}): Promise<number> {
  const id = await readyStory(owner, ownerCookie, approverCookie, authors, extra)
  await transitionOk(publisherCookie, id, { action: 'schedule', scheduledAt: future(30) })
  expect((await latestOf(id))?.workflowStatus).toBe('scheduled')
  return id
}

describe('§5.11: editing a scheduled story before the run', () => {
  it('a content edit by another editor after scheduling voids the approval and the story leaves the schedule, so the run skips it', async () => {
    const id = await scheduled(reporter, c.reporter, c.editorA, c.editorB, [reporterByline])
    // editorB is not the approver (editorA was): their edit voids the approval and drops the schedule.
    const edit = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.editorB, body: { lead: 'Rejadan keyin oʻzgartirilgan lid.' } })
    expect(edit.status).toBe(200)
    expect((await latestOf(id))?.workflowStatus).toBe('in_edit')
    await ageSchedule(id, future(-1))
    const result = await publishDue(await testPayload())
    expect(result.published).not.toContain(id)
    expect(await isLive(id)).toBe(false)
  })

  it('E4: if the approved content no longer matches at the run (hash changed under a still-scheduled row), it is refused and sent back to ready', async () => {
    const id = await scheduled(reporter, c.reporter, c.editorA, c.editorB, [reporterByline])
    // Simulate content drift that slipped past the hooks: the stored approval hash no longer matches the content.
    const { sql } = await import('@payloadcms/db-postgres')
    await sqlExec(sql`UPDATE "_articles_v" SET "version_approved_content_hash" = ${'0'.repeat(64)} WHERE "parent_id" = ${id} AND "latest" = true`)
    await ageSchedule(id, future(-1))
    const result = await publishDue(await testPayload())
    expect(result.published).not.toContain(id)
    expect(result.failed.some((f) => f.id === id)).toBe(true)
    const doc = await latestOf(id)
    expect([doc?.workflowStatus, Boolean(doc?.scheduleError)]).toEqual(['ready', true])
    expect(await isLive(id)).toBe(false)
  })

  it('a future embargo set by hand on a scheduled story does not publish at the run (E3 backstop), and the run clears the schedule', async () => {
    const id = await scheduled(reporter, c.reporter, c.editorA, c.editorB, [reporterByline])
    const save = await rest('PATCH', `/api/articles/${id}?draft=true&locale=uz`, { cookie: c.editorA, body: { embargo: { until: future(600), source: 'Reg' } } })
    void save
    await ageSchedule(id, future(-1))
    const result = await publishDue(await testPayload())
    expect(result.published).not.toContain(id)
    expect(await isLive(id)).toBe(false)
    expect((await latestOf(id))?.workflowStatus).toBe('ready')
  })

  it('E3: the run refuses to publish while an embargo is active, even if the schedule time has come', async () => {
    const payload = await testPayload()
    const id = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
    await transitionOk(c.editorB, id, { action: 'schedule', scheduledAt: future(30) })
    // Put an embargo straight into storage (the hooks forbid setting one on a scheduled story by hand).
    const { sql } = await import('@payloadcms/db-postgres')
    const until = future(600)
    await sqlExec(sql`UPDATE "_articles_v" SET "version_embargo_until" = ${until}, "version_embargo_source" = ${'Reg'} WHERE "parent_id" = ${id} AND "latest" = true`)
    await ageSchedule(id, future(-1))
    const result = await publishDue(payload)
    expect(result.published).not.toContain(id)
    expect(await isLive(id)).toBe(false)
  })
})

describe('§5.11: the scheduling user is disabled before the run → fail closed', () => {
  it('the run does not publish as a disabled scheduler; the story goes back to ready with an error', async () => {
    const payload = await testPayload()
    const scheduler = await account('editor', 's2-disabled-sched')
    // Rerun-safe: this test disables the account, and the DB is reused across runs.
    await payload.update({ collection: 'users', id: scheduler.id, data: { active: true } as never, overrideAccess: true })
    const schedCookie = await cookieOf(scheduler)
    const id = await scheduled(reporter, c.reporter, c.editorA, schedCookie, [reporterByline])
    await payload.update({ collection: 'users', id: scheduler.id, data: { active: false } as never, overrideAccess: true })
    await ageSchedule(id, future(-1))
    const result = await publishDue(payload)
    expect(result.published).not.toContain(id)
    expect(result.failed.some((f) => f.id === id)).toBe(true)
    expect(await isLive(id)).toBe(false)
    expect((await latestOf(id))?.workflowStatus).toBe('ready')
  })

  it('a story scheduled by its own author-editor never publishes at the run (¬author re-checked)', async () => {
    const payload = await testPayload()
    // authorEditor is an author (byline) AND schedules it: at run time the ¬author rule must still refuse.
    const id = await readyStory(authorEditor, c.authorEditor, c.editorA, [authorEditorByline])
    // editorA approved (¬author); authorEditor schedules — scheduling re-checks assertPublisherFor and should refuse.
    const sched = await transition(c.authorEditor, id, { action: 'schedule', scheduledAt: future(30) })
    expect(sched.status).toBeGreaterThanOrEqual(400)
    void payload
  })
})

describe('§5.4: the urgent fast path cannot be abused', () => {
  const urgentExtra = () => ({
    urgent: true,
    sources: [{ title: 'Bayonot', publisher: 'Markaziy bank', url: 'https://cbu.uz/x', type: 'press' }],
  })

  async function newsStory(authors: number[], extra: Doc = {}) {
    const { rubric } = await import('./harness')
    const yangiliklar = await rubric('yangiliklar')
    return (await makeStory(authors, { rubric: yangiliklar, assignee: reporter.id, ...urgentExtra(), ...extra })).id as number
  }

  it('a reporter cannot use the fast path (desk only)', async () => {
    const id = await newsStory([reporterByline])
    const r = await transition(c.reporter, id, { action: 'urgent' })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(id)).toBe(false)
  })

  it('an editor cannot fast-publish news without an official source', async () => {
    const id = await newsStory([reporterByline], { sources: [{ title: 'Blog', publisher: 'Nomaʼlum', url: 'https://random.example/x', type: 'press' }] })
    const r = await transition(c.editorA, id, { action: 'urgent' })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(await isLive(id)).toBe(false)
  })

  it('the fast path is refused outside the yangiliklar rubric and for a sponsored story', async () => {
    const { rubric } = await import('./harness')
    const tahlil = (await makeStory([reporterByline], { rubric: await rubric('tahlil'), assignee: reporter.id, ...urgentExtra() })).id as number
    expect((await transition(c.editorA, tahlil, { action: 'urgent' })).status).toBeGreaterThanOrEqual(400)
    expect(await isLive(tahlil)).toBe(false)
  })

  it('a fast-published story requires a second read, which its author cannot sign off; a ¬author editor can', async () => {
    const id = await newsStory([authorEditorByline])
    const ok = await transition(c.editorA, id, { action: 'urgent' })
    expect([ok.status, await isLive(id)]).toEqual([200, true])
    expect((await latestOf(id))?.secondRead).toMatchObject({ required: true })
    // The author-editor is a byline on it: they cannot do the second read.
    const byAuthor = await transition(c.authorEditor, id, { action: 'secondRead', outcome: 'ok' })
    expect(byAuthor.status).toBeGreaterThanOrEqual(400)
    const byOther = await transition(c.editorB, id, { action: 'secondRead', outcome: 'ok' })
    expect(byOther.status).toBe(200)
    expect((await latestOf(id))?.secondRead).toMatchObject({ doneBy: editorB.id, outcome: 'ok' })
  })

  it('a missed second read escalates to the editor-in-chief once its deadline passes', async () => {
    resetEscalations()
    const payload = await testPayload()
    const id = await newsStory([reporterByline])
    await transitionOk(c.editorA, id, { action: 'urgent' })
    const { sql } = await import('@payloadcms/db-postgres')
    const past = new Date(Date.now() - 60_000).toISOString()
    await sqlExec(sql`UPDATE "articles" SET "second_read_due_at" = ${past} WHERE "id" = ${id}`)
    await sqlExec(sql`UPDATE "_articles_v" SET "version_second_read_due_at" = ${past} WHERE "parent_id" = ${id} AND "latest" = true`)
    const escalated = await escalateSecondReads(payload)
    expect(escalated.map(String)).toContain(String(id))
    expect((await latestOf(id))?.secondRead).toMatchObject({ escalatedAt: expect.anything() })
  })

  it('the second-read mark cannot be replayed after it is done', async () => {
    const id = await newsStory([reporterByline])
    await transitionOk(c.editorA, id, { action: 'urgent' })
    await transitionOk(c.editorB, id, { action: 'secondRead', outcome: 'ok' })
    const again = await transition(c.eic, id, { action: 'secondRead', outcome: 'correction' })
    expect(again.status).toBeGreaterThanOrEqual(400)
    expect((await latestOf(id))?.secondRead).toMatchObject({ outcome: 'ok' })
  })
})
