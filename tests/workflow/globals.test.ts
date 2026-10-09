import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { testPayload } from '../helpers/payload'
import { as, goOk, publishedStory, rejects, story, team, type Doc, type Team } from './helpers'

/**
 * B16: global version restore (CMS-SPEC §3.16, PHASE0 item 12). Payload's
 * restore runs no beforeChange hook and republishes at once, so the
 * workflow's beforeOperation guard limits it to the roles that publish the
 * global, refuses changes to fields the user may not write, and re-runs
 * HOME-1, HOME-2, SP-7 and SET-1 on the version being restored.
 */
let t: Team
beforeAll(async () => {
  t = await team('gl')
})
afterAll(async () => (await testPayload()).destroy())

async function lastVersion(slug: 'home-page' | 'site-settings'): Promise<Doc> {
  const payload = await testPayload()
  const { docs } = await payload.findGlobalVersions({ slug, sort: '-createdAt', limit: 1, overrideAccess: true, depth: 0 })
  return docs[0] as Doc
}

describe('B16: home-page restore', () => {
  it('a version with an unpublished or sponsored story fails; a role that may not publish fails; a permitted restore is audited', async () => {
    const payload = await testPayload()
    const good = await publishedStory(t)
    await payload.updateGlobal({ slug: 'home-page', data: { lead: good, _status: 'published' } as never, ...as(t.editorA) })
    const v1 = await lastVersion('home-page')

    // A draft version that points at a story that was never published (drafts skip validation).
    const draftStory = await story(t.reporter, [t.reporterByline])
    await payload.updateGlobal({ slug: 'home-page', draft: true, data: { secondary: [draftStory.id], _status: 'draft' } as never, ...as(t.editorA) })
    const v2 = await lastVersion('home-page')
    await rejects(payload.restoreGlobalVersion({ slug: 'home-page', id: String(v2.id), ...as(t.editorA) }), /HOME-2/)

    // A version that puts a sponsored story in the lead.
    const sponsored = await story(t.commercial, [t.commercialByline], {
      sponsored: { enabled: true, partner: 'Hamkor', disclosure: 'Buyurtma asosida.', contractRef: 'SH-1', category: 'general' },
    })
    await goOk(t.commercial, sponsored.id, { action: 'submit' })
    await goOk(t.eic, sponsored.id, { action: 'approve' })
    await goOk(t.eic, sponsored.id, { action: 'publish' })
    await payload.updateGlobal({ slug: 'home-page', draft: true, data: { lead: sponsored.id, secondary: [], _status: 'draft' } as never, ...as(t.editorA) })
    const v3 = await lastVersion('home-page')
    await rejects(payload.restoreGlobalVersion({ slug: 'home-page', id: String(v3.id), ...as(t.editorA) }), /HOME-1/)

    // Roles that do not publish the home page.
    for (const u of [t.admin, t.commercial, t.reporter]) {
      await rejects(payload.restoreGlobalVersion({ slug: 'home-page', id: String(v1.id), ...as(u) }), /ruxsatingiz yoʻq/)
    }

    const before = await payload.count({ collection: 'audit-log', where: { and: [{ collection: { equals: 'home-page' } }, { action: { equals: 'doc.version_restore' } }] }, overrideAccess: true })
    await payload.restoreGlobalVersion({ slug: 'home-page', id: String(v1.id), ...as(t.editorB) })
    const home = (await payload.findGlobal({ slug: 'home-page', depth: 0, overrideAccess: true })) as Doc
    expect(home.lead).toBe(good)
    expect(home._status).toBe('published')
    const after = await payload.count({ collection: 'audit-log', where: { and: [{ collection: { equals: 'home-page' } }, { action: { equals: 'doc.version_restore' } }] }, overrideAccess: true })
    expect(after.totalDocs).toBe(before.totalDocs + 1)
  })
})

describe('B16: site-settings restore follows field ownership', () => {
  it('admin cannot restore a version that changes the editor-in-chief’s labels; the editor-in-chief can', async () => {
    const payload = await testPayload()
    const label = (uz: string) => ({ labels: { sponsored: uz } })
    await payload.updateGlobal({ slug: 'site-settings', locale: 'uz', data: label('Reklama · Eski belgi') as never, ...as(t.eic) })
    const old = await lastVersion('site-settings')
    await payload.updateGlobal({ slug: 'site-settings', locale: 'uz', data: label('Reklama · Yangi belgi') as never, ...as(t.eic) })
    await rejects(payload.restoreGlobalVersion({ slug: 'site-settings', id: String(old.id), ...as(t.admin) }), /labels/)
    await payload.restoreGlobalVersion({ slug: 'site-settings', id: String(old.id), ...as(t.eic) })
    const s = (await payload.findGlobal({ slug: 'site-settings', locale: 'uz', depth: 0, overrideAccess: true })) as Doc
    expect(s.labels.sponsored).toBe('Reklama · Eski belgi')
  })

  it('a version whose sponsored label lacks "Reklama" cannot be restored (SP-7)', async () => {
    const payload = await testPayload()
    const current = (await payload.findGlobal({ slug: 'site-settings', locale: 'all', depth: 0, overrideAccess: true })) as Doc
    const bad: Doc = { ...current, labels: { ...current.labels, sponsored: { ...(current.labels?.sponsored ?? {}), uz: 'Hamkorlik materiali' } } }
    delete bad.id
    const now = new Date().toISOString()
    const created = await payload.db.createGlobalVersion({ globalSlug: 'site-settings', versionData: bad as never, autosave: false, createdAt: now, updatedAt: now } as never)
    await rejects(payload.restoreGlobalVersion({ slug: 'site-settings', id: String((created as Doc).id), ...as(t.eic) }), /SP-7/)
  })
})
