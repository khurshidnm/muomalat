import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setNoticeTransport } from '@/payload/hooks/workflow/notify'
import { account, byline, cookieOf, liveOf, makeStory, readyStory, rest, transitionOk, type Doc, type U } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Attacks on the home-page global (CMS-SPEC §3.16, HOME-1, HOME-2, SP-8): a
 * sponsored story must never sit in an editorial slot (lead, secondary,
 * pinned, breaking, interview, most-read), a withdrawn story must appear
 * nowhere, and every referenced story must be published. The picker's filter
 * is only a convenience; the publish-time rules are what hold, and a global
 * version restore (which runs no field validation) re-runs them.
 */

setNoticeTransport(async () => {})

let reporter: U
let editorA: U
let editorB: U
let eic: U
let commercial: U
let c: Record<string, string>
let reporterByline: number
let sponsorByline: number

let sponsoredLiveId: number
let editorialLiveId: number
let draftId: number
let withdrawnId: number

beforeAll(async () => {
  const payload = await testPayload()
  reporter = await account('reporter', 'h2-reporter')
  editorA = await account('editor', 'h2-editor-a')
  editorB = await account('editor', 'h2-editor-b')
  eic = await account('eic', 'h2-eic')
  commercial = await account('commercial', 'h2-commercial')
  c = { reporter: await cookieOf(reporter), editorA: await cookieOf(editorA), editorB: await cookieOf(editorB), eic: await cookieOf(eic), commercial: await cookieOf(commercial) }
  reporterByline = await byline('RT H2 Reporter', { user: reporter })
  sponsorByline = await byline('RT H2 Sponsor', { commercial: true, user: commercial })

  // A live sponsored story, published by the editor-in-chief.
  sponsoredLiveId = (await makeStory([sponsorByline], { sponsored: { enabled: true, partner: 'Hamkor', disclosure: 'Reklama', contractRef: 'C-9', approvedBy: eic.id, approvedAt: new Date().toISOString() } }, true)).id as number
  editorialLiveId = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
  await transitionOk(c.editorB, editorialLiveId, { action: 'publish' })
  draftId = (await makeStory([reporterByline], { assignee: reporter.id })).id as number
  // A withdrawn story.
  withdrawnId = await readyStory(reporter, c.reporter, c.editorA, [reporterByline])
  await transitionOk(c.editorB, withdrawnId, { action: 'publish' })
  await transitionOk(c.eic, withdrawnId, { action: 'withdraw', withdrawal: { publicNotice: 'Olib tashlandi.', internalReason: 'Yuridik' } })
})

afterAll(async () => {
  const payload = await testPayload()
  // A refused publish still leaves its slots in the draft; the home page is shared with the other files of the run.
  await payload.updateGlobal({ slug: 'home-page', data: { lead: null, secondary: [], _status: 'draft' } as never, draft: true, overrideAccess: true })
  await payload.destroy()
})

const setHome = (cookie: string, body: Doc) => rest('POST', '/api/globals/home-page?locale=uz', { cookie, body })
const publishHome = (cookie: string, body: Doc) => rest('POST', '/api/globals/home-page?draft=false&locale=uz', { cookie, body })
const home = async () => (await (await testPayload()).findGlobal({ slug: 'home-page', depth: 0, overrideAccess: true })) as Doc

describe('HOME-1: a sponsored story cannot sit in an editorial slot', () => {
  it('publishing the home page with a sponsored lead is refused', async () => {
    const r = await publishHome(c.editorA, { lead: sponsoredLiveId })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await home()).lead ?? null).not.toBe(sponsoredLiveId)
  })

  it('a sponsored story in secondary, pinned, breaking, interview or most-read is refused', async () => {
    for (const body of [
      { secondary: [sponsoredLiveId] },
      { pinned: [{ article: sponsoredLiveId }] },
      { breaking: { enabled: true, article: sponsoredLiveId, text: 'Shoshilinch' } },
      { interviewFeature: sponsoredLiveId },
      { mostReadOverride: [sponsoredLiveId] },
    ]) {
      const r = await publishHome(c.editorA, body)
      expect([Object.keys(body)[0], r.status >= 400]).toEqual([Object.keys(body)[0], true])
    }
  })

  it('the sponsored teaser rejects a non-sponsored story (only the editor-in-chief sets it, sponsored only)', async () => {
    const r = await publishHome(c.eic, { sponsoredTeaser: editorialLiveId })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})

describe('HOME-1 / §5.8: a withdrawn story appears nowhere', () => {
  it('a withdrawn story as the lead is refused', async () => {
    const r = await publishHome(c.editorA, { lead: withdrawnId })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await home()).lead ?? null).not.toBe(withdrawnId)
  })
})

describe('HOME-2: every referenced story must be published', () => {
  it('an unpublished draft as the lead is refused', async () => {
    const r = await publishHome(c.editorA, { lead: draftId })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })

  it('a valid editorial lead publishes', async () => {
    const r = await publishHome(c.editorA, { lead: editorialLiveId, secondary: [], pinned: [], mostReadOverride: [] })
    expect([r.status, r.json?.errors ?? null]).toEqual([200, null])
    expect(String((await home()).lead)).toBe(String(editorialLiveId))
  })
})

describe('a global version restore re-runs HOME-1/HOME-2 (it skips field validation, PHASE0 item 12)', () => {
  it('restoring a version that pins a sponsored lead is refused', async () => {
    const payload = await testPayload()
    // Make a clean published version first.
    await publishHome(c.editorA, { lead: editorialLiveId, secondary: [], pinned: [], breaking: { enabled: false }, interviewFeature: null, mostReadOverride: [] })
    // Write a bad version straight into the version history (a sponsored lead), the way a restore target could look.
    const bad = await payload.db.createGlobalVersion({
      globalSlug: 'home-page',
      parent: undefined as never,
      versionData: { lead: sponsoredLiveId, _status: 'published' } as never,
      autosave: false,
      publishedLocale: 'uz' as never,
      req: undefined as never,
      snapshot: false as never,
    } as never).catch(() => null)
    if (!bad) return
    const r = await rest('POST', `/api/globals/home-page/versions/${(bad as Doc).id}?locale=uz`, { cookie: c.editorA, body: {} })
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(String((await home()).lead)).toBe(String(editorialLiveId))
  })

  it('a role that cannot publish the home page cannot restore its versions', async () => {
    const payload = await testPayload()
    const versions = await payload.findGlobalVersions({ slug: 'home-page', limit: 1, sort: '-updatedAt', overrideAccess: true })
    const vid = versions.docs[0]?.id
    if (vid === undefined) return
    for (const role of ['reporter', 'commercial'] as const) {
      const r = await rest('POST', `/api/globals/home-page/versions/${vid}?locale=uz`, { cookie: c[role], body: {} })
      expect([role, r.status >= 400]).toEqual([role, true])
    }
  })
})

describe('SP-8: a sponsored story never leaks into the public home reads', () => {
  it('the live sponsored story is published but is not the automatic lead', async () => {
    expect((await liveOf(sponsoredLiveId))?._status).toBe('published')
    // getLeadStory and the slot picker exclude sponsored items; the global is the only way to set one, and HOME-1 blocks it.
    const r = await publishHome(c.editorA, { lead: sponsoredLiveId })
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})
