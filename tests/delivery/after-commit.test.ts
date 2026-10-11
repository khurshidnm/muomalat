import { createLocalReq, initTransaction, killTransaction } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { TAG } from '@/payload/delivery/tags'
import { testPayload } from '../helpers/payload'
import { AS_IMPORT, author, eventsFor, rubric, story } from './fixtures'

/**
 * Side effects happen only after the commit (CMS-SPEC §8.4 step 1). Here
 * `after` and the Next cache functions are stand-ins: `after` queues its
 * callback, as Next does until the response has been sent, and the test runs
 * the queue once the operation has returned (and so committed, or not).
 */
const nextCache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))
const queue = vi.hoisted(() => [] as (() => unknown)[])

vi.mock('next/cache', async (importOriginal) => ({ ...(await importOriginal<object>()), ...nextCache }))
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<object>()), after: (cb: () => unknown) => void queue.push(cb) }))

const flushAfter = async () => {
  while (queue.length) await queue.shift()!()
}

let payload: Awaited<ReturnType<typeof testPayload>>
let rubricId: number
let authorId: number

beforeAll(async () => {
  payload = await testPayload()
  rubricId = (await rubric('yangiliklar', 1)).id
  authorId = (await author('commit')).id
})
beforeEach(() => {
  queue.length = 0
  nextCache.revalidateTag.mockClear()
  nextCache.revalidatePath.mockClear()
})
afterAll(async () => (await testPayload()).destroy())

describe('after commit', () => {
  it('a committed publication revalidates only after the operation returns', async () => {
    const a = await story({ tag: 'commit-ok', rubric: rubricId, authors: [authorId], publish: false })
    queue.length = 0
    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true })

    // Inside the operation nothing touched the caches; the work is queued.
    expect(nextCache.revalidateTag).not.toHaveBeenCalled()
    expect(nextCache.revalidatePath).not.toHaveBeenCalled()
    expect(queue.length).toBeGreaterThan(0)
    expect(await eventsFor(payload, 'articles', a.id)).toHaveLength(1)

    await flushAfter()
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.article(a.id), { expire: 0 })
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.articles, 'max')
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.rubric('yangiliklar'), 'max')
    expect(nextCache.revalidatePath).toHaveBeenCalledWith(`/uz/yangiliklar/${a.slug}`)
    expect(nextCache.revalidatePath).toHaveBeenCalledWith(`/kr/yangiliklar/${a.slug}`)
    expect(nextCache.revalidatePath).toHaveBeenCalledWith(`/yangiliklar/${a.slug}/opengraph-image`)
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/rss.xml')
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/uz/rss.xml')
  })

  it('a rolled-back transaction leaves no outbox row and revalidates nothing', async () => {
    const a = await story({ tag: 'commit-rollback', rubric: rubricId, authors: [authorId], publish: false })
    queue.length = 0
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    await payload.update({ collection: 'articles', id: a.id, data: { _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true, req })
    // Inside the transaction the row exists…
    expect(await payload.count({ collection: 'publish-events', where: { and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(a.id) } }] }, overrideAccess: true, req })).toEqual({ totalDocs: 1 })
    await killTransaction(req)

    // …and after the rollback it does not, and the story is still a draft.
    expect(await eventsFor(payload, 'articles', a.id)).toHaveLength(0)
    const live = await payload.findByID({ collection: 'articles', id: a.id, draft: false, depth: 0, overrideAccess: true })
    expect(live._status).toBe('draft')

    // The queued after() callback finds no committed row and does nothing.
    expect(queue.length).toBeGreaterThan(0)
    await flushAfter()
    expect(nextCache.revalidateTag).not.toHaveBeenCalled()
    expect(nextCache.revalidatePath).not.toHaveBeenCalled()
  })

  it('a draft save schedules nothing', async () => {
    const a = await story({ tag: 'commit-draft', rubric: rubricId, authors: [authorId] })
    queue.length = 0
    await payload.update({ collection: 'articles', id: a.id, data: { lead: 'Faqat qoralama.' }, draft: true, context: AS_IMPORT, overrideAccess: true })
    await flushAfter()
    expect(nextCache.revalidateTag).not.toHaveBeenCalled()
  })
})
