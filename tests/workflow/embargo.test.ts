import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { publishDue } from '@/worker/jobs/scheduler'
import { testPayload } from '../helpers/payload'
import { account, as, cookieOf, go, goOk, latest, live, notices, publishedStory, rejects, rest, restError, story, team, type Team, type U } from './helpers'

/**
 * Acceptance group E: embargo and scheduling (CMS-SPEC §5.10, §5.11; §16 E1–E5).
 * The scheduler is the worker job's own function, run with the clock moved.
 */
let t: Team
let scheduler: U
beforeAll(async () => {
  t = await team('em')
  scheduler = await account('editor', 'em-scheduler')
})
afterAll(async () => (await testPayload()).destroy())

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString()

async function approved(extra: Record<string, unknown> = {}) {
  const s = await story(t.reporter, [t.reporterByline], extra)
  await goOk(t.reporter, s.id, { action: 'submit' })
  await goOk(t.editorA, s.id, { action: 'approve' })
  return s.id as number
}

/** Runs the scheduler `minutes` from now. */
async function runSchedulerAt(minutes: number) {
  const payload = await testPayload()
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    vi.setSystemTime(Date.now() + minutes * 60_000)
    return await publishDue(payload)
  } finally {
    vi.useRealTimers()
  }
}

describe('E1: an active embargo blocks publishing and early scheduling', () => {
  it('publish fails; a schedule before `until` fails; at `until` it succeeds', async () => {
    const until = inMinutes(120)
    const id = await approved({ embargo: { until, source: 'Moliya vazirligi' } })
    const r = await go(t.editorB, id, { action: 'publish' })
    expect(r.status).toBe(403)
    expect(restError(r.json)).toMatch(/Embargo amalda/)
    const early = await go(t.editorB, id, { action: 'schedule', scheduledAt: inMinutes(60) })
    expect(early.status).toBe(400)
    expect(restError(early.json)).toMatch(/embargo tugashidan oldin/)
    await goOk(t.editorB, id, { action: 'schedule', scheduledAt: until })
    const doc = await latest(id)
    expect(doc.workflowStatus).toBe('scheduled')
    expect(doc.scheduledBy).toBe(t.editorB.id)
  })

  it('the workflow panel offers no «Chop etish» while the embargo is active, and offers it again after `until`', async () => {
    const id = await approved({ embargo: { until: inMinutes(10), source: 'Moliya vazirligi' } })
    const cookie = await cookieOf(t.editorB)
    const offered = async () => {
      const r = await rest('GET', `/api/articles/${id}/transitions`, { cookie })
      expect(r.status).toBe(200)
      return (r.json.transitions as { id: string }[]).map((x) => x.id)
    }
    const during = await offered()
    expect(during).not.toContain('publish')
    expect(during).toContain('schedule')
    // The hook refuses it all the same.
    expect((await go(t.editorB, id, { action: 'publish' })).status).toBe(403)
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(Date.now() + 11 * 60_000)
      expect(await offered()).toContain('publish')
    } finally {
      vi.useRealTimers()
    }
  })

  it('an indefinite embargo cannot be scheduled at all', async () => {
    const id = await approved({ embargo: { indefinite: true, source: 'Sud' } })
    expect((await go(t.editorB, id, { action: 'schedule', scheduledAt: inMinutes(30) })).status).toBe(400)
  })

  it('a schedule less than a minute ahead is refused', async () => {
    const id = await approved()
    expect((await go(t.editorB, id, { action: 'schedule', scheduledAt: new Date().toISOString() })).status).toBe(400)
  })
})

describe('E2: embargo field rules', () => {
  it('a past date fails; an embargo on a published story fails; until with indefinite fails; a source is required', async () => {
    const payload = await testPayload()
    const s = await story(t.reporter, [t.reporterByline])
    const save = (embargo: Record<string, unknown>, u = t.reporter, id = s.id) =>
      payload.update({ collection: 'articles', id, draft: true, data: { embargo, _status: 'draft' } as never, ...as(u) })
    await rejects(save({ until: inMinutes(-60), source: 'X' }), /kelajakda/)
    await rejects(save({ until: inMinutes(60) }), /manbasini/)
    await rejects(save({ until: inMinutes(60), indefinite: true, source: 'X' }), /birga belgilanmaydi/)
    await save({ until: inMinutes(60), source: 'Vazirlik' })
    const id = await publishedStory(t)
    await rejects(save({ until: inMinutes(60), source: 'Vazirlik' }, t.editorB, id), /Chop etilgan maqolaga embargo/)
  })
})

describe('E3: the scheduler publishes at scheduledAt as scheduledBy, with every §5.3 check', () => {
  it('nothing happens before the time; at the time the story is published by the scheduling editor', async () => {
    const payload = await testPayload()
    const id = await approved()
    await goOk(t.editorB, id, { action: 'schedule', scheduledAt: inMinutes(10) })
    const before = await runSchedulerAt(0)
    expect(before.published).not.toContain(id)
    const at = await runSchedulerAt(11)
    expect(at.published).toContain(id)
    const doc = await live(id)
    expect(doc._status).toBe('published')
    expect(doc.workflowStatus).toBe('published')
    expect(doc.publishedBy).toBe(t.editorB.id)
    const { docs } = await payload.find({
      collection: 'audit-log',
      where: { and: [{ docId: { equals: String(id) } }, { action: { equals: 'schedule.run' } }] },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
  })

  it('an editor who wrote the story cannot schedule it (the run would publish their own story)', async () => {
    const s = await story(t.authorEditor, [t.authorEditorByline])
    await goOk(t.authorEditor, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    expect((await go(t.authorEditor, s.id, { action: 'schedule', scheduledAt: inMinutes(10) })).status).toBe(403)
  })

  it('an embargo still active at run time stops the run (the schedule was moved by hand past the checks)', async () => {
    const payload = await testPayload()
    const id = await approved({ embargo: { until: inMinutes(30), source: 'Vazirlik' } })
    await goOk(t.editorB, id, { action: 'schedule', scheduledAt: inMinutes(40) })
    // A path that skips the workflow hooks moves the schedule before the embargo ends.
    await payload.update({ collection: 'articles', id, draft: true, data: { scheduledAt: inMinutes(5), _status: 'draft' } as never, overrideAccess: true, context: { workflowSync: 'test' } })
    const r = await runSchedulerAt(6)
    expect(r.failed.map((f) => f.id)).toContain(id)
    expect((await live(id))._status).not.toBe('published')
  })
})

describe('E4: an edit after scheduling', () => {
  it('by someone other than the approver drops the story back to in_edit', async () => {
    const payload = await testPayload()
    const id = await approved()
    await goOk(t.editorB, id, { action: 'schedule', scheduledAt: inMinutes(10) })
    await payload.update({ collection: 'articles', id, draft: true, data: { lead: 'B oʻzgartirdi.', _status: 'draft' } as never, ...as(t.editorB) })
    const doc = await latest(id)
    expect(doc.workflowStatus).toBe('in_edit')
    expect(doc.scheduledBy).toBeFalsy()
    expect((await runSchedulerAt(11)).published).not.toContain(id)
  })

  it('through a path that skipped the hook, the run fails on the hash, the story returns to ready and the desk is alerted', async () => {
    const payload = await testPayload()
    const id = await approved()
    // The approver schedules: even then the scheduler never refreshes the approval hash.
    await goOk(t.editorA, id, { action: 'schedule', scheduledAt: inMinutes(10) })
    await payload.update({ collection: 'articles', id, draft: true, data: { lead: 'Yashirin oʻzgarish.', _status: 'draft' } as never, overrideAccess: true, context: { workflowSync: 'test' } })
    notices.length = 0
    const r = await runSchedulerAt(11)
    expect(r.failed.find((f) => f.id === id)?.error).toMatch(/Tasdiqdan keyin oʻzgartirilgan/)
    const doc = await latest(id)
    expect(doc.workflowStatus).toBe('ready')
    expect(doc.scheduleError).toMatch(/Tasdiqdan keyin/)
    expect((await live(id))._status).not.toBe('published')
    const sent = notices.filter((n) => n.kind === 'schedule_failed' && String(n.articleId) === String(id)).map((n) => n.audience)
    expect(sent.sort()).toEqual(['desk', 'eic'])
  })
})

describe('E5: the scheduler fails closed', () => {
  it('when the scheduling user has been disabled since', async () => {
    const payload = await testPayload()
    const id = await approved()
    await goOk(scheduler, id, { action: 'schedule', scheduledAt: inMinutes(10) })
    await payload.update({ collection: 'users', id: scheduler.id, data: { active: false } as never, overrideAccess: true })
    try {
      const r = await runSchedulerAt(11)
      expect(r.failed.find((f) => f.id === id)?.error).toMatch(/faol emas/)
      expect((await live(id))._status).not.toBe('published')
      expect((await latest(id)).workflowStatus).toBe('ready')
    } finally {
      await payload.update({ collection: 'users', id: scheduler.id, data: { active: true } as never, overrideAccess: true })
    }
  })
})
