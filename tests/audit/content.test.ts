import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { AuditLog } from '@/payload-types'
import { addOfficialDomains, testPayload } from '../helpers/payload'
import { account, actions, forDoc, headId, rows, tag } from './helpers'

/**
 * J1 for content (CMS-SPEC §9.2 "Content", "Workflow" legal and scheduling
 * rows, "Globals"): every action writes exactly one row with actor, role,
 * action and document. Tags stand in for every drafts collection (their only
 * publish rule is a Uzbek label); article-specific rows run with the
 * workflow's import context, which leaves the workflow's own rows out.
 */
type User = Awaited<ReturnType<typeof account>>
let editor: User
let eic: User

const only = (list: AuditLog[], action: string) => {
  const hits = list.filter((r) => r.action === action)
  expect(hits, `${action} rows`).toHaveLength(1)
  return hits[0]
}

describe('J1: content actions', () => {
  beforeAll(async () => {
    editor = await account('editor', 'content-editor')
    eic = await account('eic', 'content-eic')
  })
  afterAll(async () => (await testPayload()).destroy())

  it('a drafts document: create, draft save, first publish, change, unpublish, restore, delete', async () => {
    const payload = await testPayload()
    const label = tag('Mavzu')
    const created = await payload.create({ collection: 'tags', data: { label }, draft: true, user: editor, overrideAccess: false })
    await payload.update({ collection: 'tags', id: created.id, data: { label: `${label} 2` }, draft: true, user: editor, overrideAccess: false })
    await payload.update({ collection: 'tags', id: created.id, data: { _status: 'published' }, user: editor, overrideAccess: false })
    await payload.update({ collection: 'tags', id: created.id, data: { label: `${label} 3` }, draft: true, user: editor, overrideAccess: false })
    await payload.update({ collection: 'tags', id: created.id, data: { _status: 'published' }, user: editor, overrideAccess: false })
    await payload.update({ collection: 'tags', id: created.id, data: { _status: 'draft' }, user: editor, overrideAccess: false })
    const { docs: versions } = await payload.findVersions({ collection: 'tags', where: { parent: { equals: created.id } }, sort: 'createdAt', overrideAccess: true })
    await payload.restoreVersion({ collection: 'tags', id: versions[0].id, draft: true, user: editor, overrideAccess: false })
    await payload.delete({ collection: 'tags', id: created.id, user: eic, overrideAccess: false })

    const list = await forDoc('tags', created.id)
    expect(actions(list)).toEqual([
      'doc.create',
      'doc.update',
      'doc.publish_first',
      'doc.update',
      'doc.publish_change',
      'doc.unpublish',
      'doc.version_restore',
      'doc.delete',
    ])
    for (const row of list.slice(0, -1)) {
      expect(row).toMatchObject({ actorId: editor.id, actorEmail: editor.email, actorRole: 'editor', collection: 'tags', docId: String(created.id), locale: 'uz' })
      expect(row.hash).toMatch(/^[0-9a-f]{64}$/)
    }
    expect(list.at(-1)).toMatchObject({ actorId: eic.id, actorRole: 'eic' })
    expect(list[0].docTitle).toBe(label)
    expect(list[1].changedPaths).toEqual(expect.arrayContaining(['label']))
    // A publish is compared with the live row, whatever drafts came before: the label went live
    // only now, although the draft before this publish already had it.
    expect(list[4].changedPaths).toEqual(expect.arrayContaining(['label']))
    expect(list[2]).toMatchObject({ before: { _status: 'draft' }, after: { _status: 'published' } })
    expect(list[5]).toMatchObject({ before: { _status: 'published' }, after: { _status: 'draft' } })
    expect(list[2].versionId).toBeTruthy()
    expect(list[6].summary).toContain('qoralama')
    // Content values are never stored for an editorial collection: paths only.
    expect(JSON.stringify(list[1].after ?? {})).not.toContain(label)
  })

  it('autosave writes a row only for paths not already recorded in the last five minutes', async () => {
    const payload = await testPayload()
    const created = await payload.create({ collection: 'tags', data: { label: tag('Avto') }, draft: true, user: editor, overrideAccess: false })
    for (const n of [1, 2, 3]) {
      await payload.update({ collection: 'tags', id: created.id, data: { label: `Avto ${n}` }, draft: true, autosave: true, user: editor, overrideAccess: false })
    }
    // Another locale is another row.
    await payload.update({ collection: 'tags', id: created.id, data: { label: 'Auto' }, locale: 'ru', draft: true, autosave: true, user: editor, overrideAccess: false })
    const list = await forDoc('tags', created.id)
    expect(actions(list)).toEqual(['doc.create', 'doc.update', 'doc.update'])
    expect(list[1]).toMatchObject({ locale: 'uz', summary: 'Avtomatik saqlash' })
    expect(list[1].changedPaths).toEqual(expect.arrayContaining(['label']))
    expect(list[2]).toMatchObject({ locale: 'ru', changedPaths: ['label'] })
  })

  it('articles: trash, restore from trash, legal hold, schedule', async () => {
    const payload = await testPayload()
    const context = { importing: true }
    const article = await payload.create({ collection: 'articles', data: { title: tag('Maqola') }, draft: true, user: eic, overrideAccess: false, context })
    const at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    await payload.update({ collection: 'articles', id: article.id, data: { legalHold: true }, draft: true, user: eic, overrideAccess: false, context })
    await payload.update({ collection: 'articles', id: article.id, data: { scheduledAt: at }, draft: true, user: eic, overrideAccess: false, context })
    await payload.update({ collection: 'articles', id: article.id, data: { scheduledAt: null, legalHold: false }, draft: true, user: eic, overrideAccess: false, context })
    // System fields the workflow sets: the sign-off and a failed scheduled run (written with overrideAccess, as hooks do).
    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { legalSignOff: { by: eic.id, at: new Date().toISOString() }, scheduleError: 'Embargo amalda' },
      draft: true,
      user: eic,
      overrideAccess: true,
      context,
    })
    await payload.update({ collection: 'articles', id: article.id, data: { deletedAt: new Date().toISOString() }, user: eic, overrideAccess: false, context })
    await payload.update({ collection: 'articles', id: article.id, data: { deletedAt: null }, trash: true, user: eic, overrideAccess: false, context })

    const list = await forDoc('articles', article.id)
    const set = only(list, 'legal.hold_set')
    expect(set).toMatchObject({ actorRole: 'eic', before: { legalHold: false }, after: { legalHold: true } })
    expect(only(list, 'schedule.set').after).toEqual({ scheduledAt: at })
    only(list, 'schedule.cancel')
    only(list, 'legal.hold_cleared')
    expect(only(list, 'legal.signoff').after).toMatchObject({ legalSignOff: { by: String(eic.id) } })
    expect(only(list, 'schedule.fail').summary).toBe('Embargo amalda')
    expect(only(list, 'doc.trash').changedPaths).toContain('deletedAt')
    only(list, 'doc.restore_from_trash')
    only(list, 'doc.create')
    // Values of workflow fields are kept; content values are not.
    const update = list.find((r) => r.action === 'doc.update' && (r.changedPaths as string[]).includes('scheduledAt'))!
    expect(update.after).toMatchObject({ scheduledAt: at })
  })

  it('globals: settings saves keep values; the imprint stamp follows legal changes', async () => {
    const payload = await testPayload()
    const from = await headId()
    const label = `Reklama · Hamkorlik materiali ${tag('t')}`
    await payload.updateGlobal({ slug: 'site-settings', data: { labels: { sponsored: label } }, user: eic, overrideAccess: false })
    const before = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { legal: { email: { value: `${tag('tahririyat')}@muomalat.uz`, placeholder: false } } },
      user: eic,
      overrideAccess: false,
    })
    const after = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    expect(after.legal?.meta?.lastChangedAt).toBeTruthy()
    expect(after.legal?.meta?.lastChangedAt).not.toBe(before.legal?.meta?.lastChangedAt)

    const list = await rows({ and: [{ id: { greater_than: from } }, { collection: { equals: 'site-settings' } }, { actorId: { equals: eic.id } }] })
    expect(actions(list)).toEqual(['global.update', 'global.update'])
    expect(list[0]).toMatchObject({ actorRole: 'eic', changedPaths: ['labels.sponsored'], after: { 'labels.sponsored': label } })
    expect(list[1].changedPaths).toEqual(expect.arrayContaining(['legal.email.value', 'legal.meta.lastChangedAt']))

    // Added to what is there: other files (the urgent fast path) rely on the list while this runs.
    await addOfficialDomains([`${tag('d')}.uz`], eic)
    const rules = await rows({ and: [{ id: { greater_than: from } }, { collection: { equals: 'editorial-rules' } }, { actorId: { equals: eic.id } }] })
    expect(actions(rules)).toEqual(['global.update'])
  })

  it('globals with drafts: draft save, publish, version restore', async () => {
    const payload = await testPayload()
    const from = await headId()
    await payload.updateGlobal({ slug: 'navigation', data: {}, draft: true, user: eic, overrideAccess: false })
    await payload.updateGlobal({ slug: 'navigation', data: { _status: 'published' }, user: eic, overrideAccess: false })
    const { docs } = await payload.findGlobalVersions({ slug: 'navigation', sort: '-updatedAt', limit: 1, overrideAccess: true })
    await payload.restoreGlobalVersion({ slug: 'navigation', id: docs[0].id, user: eic, overrideAccess: false })
    const list = await rows({ and: [{ id: { greater_than: from } }, { collection: { equals: 'navigation' } }] })
    expect(actions(list)).toEqual(['global.update', 'global.publish', 'doc.version_restore'])
    for (const row of list) expect(row).toMatchObject({ actorId: eic.id, actorRole: 'eic' })
    expect(list[1].versionId).toBeTruthy()
  })

  it('a caller may name the action of one operation, and only that one', async () => {
    const payload = await testPayload()
    const doc = await payload.create({ collection: 'tags', data: { label: tag('Nom') }, draft: true, user: editor, overrideAccess: false })
    await payload.delete({ collection: 'tags', id: doc.id, user: eic, overrideAccess: false, context: { audit: { action: 'pd.delete', summary: 'test' } } })
    const later = await payload.create({ collection: 'tags', data: { label: tag('Keyin') }, draft: true, user: editor, overrideAccess: false })
    expect(actions(await forDoc('tags', doc.id))).toEqual(['doc.create', 'pd.delete'])
    expect(actions(await forDoc('tags', later.id))).toEqual(['doc.create'])
  })
})
