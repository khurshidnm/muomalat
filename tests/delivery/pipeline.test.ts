import { createLocalReq, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Article } from '@/payload-types'
import { TAG } from '@/payload/delivery/tags'
import { articleHooks } from '@/payload/hooks/invalidate/articles'
import { staff, testPayload } from '../helpers/payload'
import { AS_IMPORT, author, events, eventsFor, rubric, RUN, story, topic } from './fixtures'

/**
 * Group H, publish pipeline (CMS-SPEC §8.4, §8.5): each change of a live story
 * writes one publish-events row in the change's transaction, with the tags,
 * route paths and URLs of all four editions. Run outside a Next request, as
 * here, after() is unavailable and nothing is revalidated in-process: the row
 * stays pending for the worker (H13; the worker side is outbox.test.ts).
 */
const T = 'pipe'
let payload: Awaited<ReturnType<typeof testPayload>>
let rubricId: number
let otherRubricId: number
let authorDoc: { id: number; slug: string }
let tagDoc: { id: number; slug: string }

const latest = async (id: number) => (await eventsFor(payload, 'articles', id)).at(-1)!

beforeAll(async () => {
  payload = await testPayload()
  rubricId = (await rubric('tahlil', 2)).id
  otherRubricId = (await rubric('dunyo', 5)).id
  authorDoc = (await author(T)) as typeof authorDoc
  tagDoc = (await topic(T)) as typeof tagDoc
})
afterAll(async () => (await testPayload()).destroy())

describe('article first publication', () => {
  let a: Article
  beforeAll(async () => {
    a = await story({ tag: `${T}-first`, rubric: rubricId, authors: [authorDoc.id], tags: [tagDoc.id] })
  })

  it('writes one pending publish_first row in the same transaction', async () => {
    const rows = await eventsFor(payload, 'articles', a.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'publish_first', status: 'pending', attempts: 0 })
  })

  it('expires the story and marks its lists stale', async () => {
    const t = (await latest(a.id)).targets as Record<string, string[]>
    expect(t.expire).toEqual(expect.arrayContaining([TAG.article(a.id), TAG.shortlinks]))
    expect(t.tags).toEqual(
      expect.arrayContaining([TAG.articles, TAG.home, TAG.rubric('tahlil'), TAG.tag(tagDoc.slug), TAG.author(authorDoc.slug)]),
    )
    expect((t as unknown as { first?: boolean }).first).toBe(true)
  })

  it('revalidates the four editions at their internal paths, OG in both uz forms, RSS and the sitemap', async () => {
    const p = `/tahlil/${a.slug}`
    const t = (await latest(a.id)).targets as Record<string, string[]>
    expect(t.paths).toEqual(
      expect.arrayContaining([
        `/uz${p}`,
        `/kr${p}`,
        `/ru${p}`,
        `/en${p}`,
        `/uz${p}/opengraph-image`,
        `${p}/opengraph-image`,
        `/kr${p}/opengraph-image`,
        `/ru${p}/opengraph-image`,
        `/en${p}/opengraph-image`,
        '/uz',
        '/kr',
        '/ru',
        '/en',
        '/uz/tahlil',
        '/en/tahlil',
        '/uz/rss.xml',
        '/rss.xml',
        '/kr/rss.xml',
        '/ru/rss.xml',
        '/en/rss.xml',
        '/sitemap.xml',
      ]),
    )
    // The public uz page path does nothing for a page (PHASE0 item 9); it is never sent.
    expect(t.paths).not.toContain(p)
  })

  it('purges and warms the public URLs of all four editions', async () => {
    const p = `/tahlil/${a.slug}`
    const t = (await latest(a.id)).targets as Record<string, string[]>
    expect(t.urls).toEqual(
      expect.arrayContaining([
        p,
        `/kr${p}`,
        `/ru${p}`,
        `/en${p}`,
        `${p}/opengraph-image`,
        `/uz${p}/opengraph-image`,
        `/en${p}/opengraph-image`,
        '/',
        '/kr',
        '/ru',
        '/en',
        '/tahlil',
        '/kr/tahlil',
        '/rss.xml',
        '/en/rss.xml',
        '/sitemap.xml',
        `${p}?utm_source=telegram&utm_medium=channel&utm_campaign=muomalatuz&utm_content=${a.shortCode}`,
      ]),
    )
    expect(t.urls.some((u) => u.startsWith('/uz/') && !u.endsWith('/opengraph-image'))).toBe(false)
    expect(t.warm).toEqual(expect.arrayContaining([p, `/kr${p}`, `/ru${p}`, `/en${p}`, '/', '/kr', '/tahlil']))
    expect(t.prefixes).toEqual([])
  })
})

describe('changes after publication', () => {
  let a: Article
  beforeAll(async () => {
    a = await story({ tag: `${T}-change`, rubric: rubricId, authors: [authorDoc.id] })
  })

  it('a draft save and an autosave of a live story write nothing', async () => {
    const before = (await eventsFor(payload, 'articles', a.id)).length
    await payload.update({ collection: 'articles', id: a.id, data: { lead: 'Qoralama.' }, draft: true, context: AS_IMPORT, overrideAccess: true })
    await payload.update({ collection: 'articles', id: a.id, data: { lead: 'Avto.' }, draft: true, autosave: true, context: AS_IMPORT, overrideAccess: true })
    expect(await eventsFor(payload, 'articles', a.id)).toHaveLength(before)
  })

  it('a correction writes publish_change with changeKind correction and refreshes the corrections list', async () => {
    await payload.update({
      collection: 'articles',
      id: a.id,
      data: {
        _status: 'published',
        changeNote: { kind: 'correction', reason: 'Raqam xato edi' },
        corrections: [{ kind: 'correction', publicText: 'Tuzatildi: 4,5 mlrd emas, 5,4 mlrd soʻm.' }],
      },
      draft: false,
      context: AS_IMPORT, overrideAccess: true,
    })
    const row = await latest(a.id)
    expect(row).toMatchObject({ kind: 'publish_change', changeKind: 'correction', status: 'pending' })
    const t = row.targets as Record<string, string[]>
    expect(t.expire).toContain(TAG.article(a.id))
    expect(t.tags).toEqual(expect.arrayContaining([TAG.corrections, TAG.articles, TAG.home]))
    expect(t.paths).toEqual(expect.arrayContaining(['/uz/biz-haqimizda', '/ru/biz-haqimizda', `/kr/tahlil/${a.slug}`]))
    // Not a removal and not a move: lists go stale and the short link stays. A correction reaches
    // every cached variant of the address (H3), so the story's own prefix is purged as well.
    expect(t.expire).not.toContain(TAG.articles)
    expect(t.expire).not.toContain(TAG.shortlinks)
    const p = `/tahlil/${a.slug}`
    expect(t.prefixes).toEqual([p, `/kr${p}`, `/ru${p}`, `/en${p}`])
  })

  it('a change that publishes a pending draft takes the change note from the draft; an update purges exact URLs only', async () => {
    await payload.update({ collection: 'articles', id: a.id, data: { lead: 'Yangilangan lid.', changeNote: { kind: 'update', reason: 'Yangi maʼlumot' } }, draft: true, context: AS_IMPORT, overrideAccess: true })
    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    const row = await latest(a.id)
    expect(row).toMatchObject({ kind: 'publish_change', changeKind: 'update' })
    expect((row.targets as Record<string, string[]>).prefixes).toEqual([])
  })

  it('a slug or rubric change invalidates the old address too, by exact URL and by prefix', async () => {
    const old = `/tahlil/${a.slug}`
    await payload.update({ collection: 'articles', id: a.id, data: { rubric: otherRubricId, slug: `${a.slug}-yangi`, _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    const t = (await latest(a.id)).targets as Record<string, string[]>
    const now = `/dunyo/${a.slug}-yangi`
    expect(t.paths).toEqual(expect.arrayContaining([`/uz${old}`, `/en${old}`, `/uz${now}`, `/en${now}`, '/uz/tahlil', '/uz/dunyo']))
    expect(t.tags).toEqual(expect.arrayContaining([TAG.rubric('tahlil'), TAG.rubric('dunyo')]))
    expect(t.prefixes).toEqual([old, `/kr${old}`, `/ru${old}`, `/en${old}`])
    expect(t.expire).toContain(TAG.shortlinks)
    expect(t.urls).toEqual(expect.arrayContaining([`/t/${a.shortCode}`, `/t/${a.shortCode}?l=kr`, `/t/${a.shortCode}?l=en`]))
    expect(t.warm).toContain(now)
    expect(t.warm).not.toContain(old)
  })

  it('a withdrawal writes withdraw and expires the lists, so no reader gets a stale list with the story', async () => {
    await payload.update({
      collection: 'articles',
      id: a.id,
      data: { _status: 'published', workflowStatus: 'withdrawn', noindex: true, withdrawal: { at: new Date().toISOString(), publicNotice: 'Olib tashlandi.' } },
      draft: false,
      context: AS_IMPORT, overrideAccess: true,
    })
    const row = await latest(a.id)
    expect(row.kind).toBe('withdraw')
    const t = row.targets as Record<string, string[]>
    expect(t.expire).toEqual(expect.arrayContaining([TAG.article(a.id), TAG.articles, TAG.home, TAG.rubric('dunyo'), TAG.author(authorDoc.slug)]))
    expect(t.tags).toEqual([])
    // The page stays (a notice), so it is purged at the same address, every cached variant included.
    expect(t.urls).toEqual(expect.arrayContaining([`/dunyo/${a.slug}-yangi`, `/ru/dunyo/${a.slug}-yangi`]))
    expect(t.prefixes).toEqual(expect.arrayContaining([`/dunyo/${a.slug}-yangi`, `/en/dunyo/${a.slug}-yangi`]))
  })

  it('an unpublish writes unpublish; republishing writes restore', async () => {
    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'draft' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    const off = await latest(a.id)
    expect(off.kind).toBe('unpublish')
    const t = off.targets as Record<string, string[]>
    expect(t.expire).toEqual(expect.arrayContaining([TAG.article(a.id), TAG.articles, TAG.shortlinks]))
    expect(t.urls).toContain(`/t/${a.shortCode}`)
    expect(t.warm).not.toContain(`/dunyo/${a.slug}-yangi`)

    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'published', firstPublishedAt: new Date().toISOString() }, draft: false, context: AS_IMPORT, overrideAccess: true })
    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'draft' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    expect((await latest(a.id)).kind).toBe('restore')
  })

  it('a scheduled run is recorded as schedule_run and keeps whether it was the first publication', async () => {
    const draft = await story({ tag: `${T}-sched`, rubric: rubricId, authors: [authorDoc.id], publish: false })
    expect(await eventsFor(payload, 'articles', draft.id)).toHaveLength(0)
    await payload.update({
      collection: 'articles',
      id: draft.id,
      data: { _status: 'published' },
      draft: false,
      overrideAccess: true,
      context: { ...AS_IMPORT, scheduledRun: true },
    })
    const row = await latest(draft.id)
    expect(row.kind).toBe('schedule_run')
    expect((row.targets as { first?: boolean }).first).toBe(true)
  })

  it('a nested save of the same story inside a save does not take the outer save\'s live row', async () => {
    // Another concern may update the story again from its own afterChange (corrections log, §5.7).
    // Run the outer save's hooks by hand around a real nested save on the same request.
    const draft = await story({ tag: `${T}-nested`, rubric: rubricId, authors: [authorDoc.id], publish: false })
    const req = await createLocalReq({ context: { ...AS_IMPORT } }, payload)
    const collection = payload.collections.articles.config
    const before = articleHooks.beforeOperation![0] as CollectionBeforeOperationHook
    const change = articleHooks.beforeChange![0] as CollectionBeforeChangeHook
    const after = articleHooks.afterChange![0] as CollectionAfterChangeHook
    const common = { collection, req, context: req.context }
    await before({ ...common, args: { id: draft.id, draft: false, data: { _status: 'published' } }, operation: 'update' } as never)
    await change({ ...common, data: {}, operation: 'update', originalDoc: { id: draft.id } } as never)
    await payload.update({ collection: 'articles', id: draft.id, data: { _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true, req })
    await after({ ...common, doc: { id: draft.id }, data: {}, operation: 'update', previousDoc: {} } as never)
    expect((await eventsFor(payload, 'articles', draft.id)).map((e) => e.kind)).toEqual(['publish_first', 'publish_first'])
  })

  it('deleting a live story writes delete', async () => {
    const doomed = await story({ tag: `${T}-del`, rubric: rubricId, authors: [authorDoc.id] })
    await payload.delete({ collection: 'articles', id: doomed.id, context: AS_IMPORT, overrideAccess: true })
    const row = await latest(doomed.id)
    expect(row.kind).toBe('delete')
    expect((row.targets as Record<string, string[]>).expire).toEqual(expect.arrayContaining([TAG.article(doomed.id), TAG.articles]))
  })

  it('a story that never went live leaves no row, whatever happens to it', async () => {
    const draft = await story({ tag: `${T}-never`, rubric: rubricId, authors: [authorDoc.id], publish: false })
    await payload.update({ collection: 'articles', id: draft.id, data: { lead: 'x' }, draft: true, context: AS_IMPORT, overrideAccess: true })
    await payload.delete({ collection: 'articles', id: draft.id, context: AS_IMPORT, overrideAccess: true })
    expect(await eventsFor(payload, 'articles', draft.id)).toHaveLength(0)
  })
})

describe('other collections and globals (§8.5)', () => {
  it('H4: publishing an author bio invalidates author:<slug> and articles, and their page in four editions', async () => {
    const someone = await author(`${T}-bio`)
    const editor = await staff('editor')
    await payload.update({ collection: 'authors', id: someone.id, data: { bio: 'Yangi maʼlumot.', _status: 'published' }, draft: false, user: editor, overrideAccess: true })
    const rows = await eventsFor(payload, 'authors', someone.id)
    expect(rows.at(-1)).toMatchObject({ kind: 'publish_change', actorId: editor.id, status: 'pending' })
    const t = rows.at(-1)!.targets as Record<string, string[]>
    expect(t.tags).toEqual(expect.arrayContaining([TAG.author(someone.slug!), TAG.articles]))
    expect(t.paths).toEqual(expect.arrayContaining([`/uz/muallif/${someone.slug}`, `/kr/muallif/${someone.slug}`, `/ru/muallif/${someone.slug}`, `/en/muallif/${someone.slug}`]))
    expect(t.urls).toEqual(expect.arrayContaining([`/muallif/${someone.slug}`, `/en/muallif/${someone.slug}`]))
  })

  it('an author draft save writes nothing', async () => {
    const someone = await author(`${T}-draft`)
    const before = (await eventsFor(payload, 'authors', someone.id)).length
    await payload.update({ collection: 'authors', id: someone.id, data: { bio: 'Qoralama.' }, draft: true, overrideAccess: true })
    expect(await eventsFor(payload, 'authors', someone.id)).toHaveLength(before)
  })

  it('a tag change invalidates tag:<slug> and its page', async () => {
    const t0 = await topic(`${T}-tagchange`)
    await payload.update({ collection: 'tags', id: t0.id, data: { label: `Mavzu ${T}-tagchange ${RUN}`, _status: 'published' }, draft: false, overrideAccess: true })
    const t = (await eventsFor(payload, 'tags', t0.id)).at(-1)!.targets as Record<string, string[]>
    expect(t.tags).toEqual(expect.arrayContaining([TAG.tag(t0.slug!), TAG.articles]))
    expect(t.paths).toContain(`/ru/mavzu/${t0.slug}`)
  })

  it('a redirect invalidates the lookup and the cached 404 at its old address', async () => {
    const r = await payload.create({
      collection: 'redirects',
      data: { from: `/tahlil/${T}-eski-${RUN}`, to: { type: 'custom', url: '/tahlil' }, type: '301' },
      depth: 0,
      overrideAccess: true,
    })
    const t = (await eventsFor(payload, 'redirects', r.id)).at(-1)!.targets as Record<string, string[]>
    expect(t.expire).toContain(TAG.redirects)
    expect(t.paths).toContain(`/uz/tahlil/${T}-eski-${RUN}`)
    expect(t.urls).toContain(`/tahlil/${T}-eski-${RUN}`)
  })

  it('publishing home-page writes global_change with the home tag; a draft save writes nothing', async () => {
    // Other files publish home-page too: count only this editor's rows (publish-events keeps the actor).
    const editor = await staff('editor', 'delivery-home')
    const mine = async () => events(payload, { and: [{ collection: { equals: 'home-page' } }, { actorId: { equals: editor.id } }] })
    const before = (await mine()).length
    await payload.updateGlobal({ slug: 'home-page', data: { _status: 'draft' }, draft: true, user: editor, overrideAccess: true })
    expect((await mine()).length).toBe(before)
    await payload.updateGlobal({ slug: 'home-page', data: { _status: 'published' }, draft: false, user: editor, overrideAccess: true })
    const rows = await mine()
    expect(rows).toHaveLength(before + 1)
    const row = rows.at(-1)!
    expect(row.kind).toBe('global_change')
    const t = row.targets as Record<string, string[]>
    expect(t.tags).toEqual([TAG.home])
    expect(t.paths).toEqual(['/uz', '/kr', '/ru', '/en'])
  })
})
