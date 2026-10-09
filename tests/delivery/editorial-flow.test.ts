import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Article } from '@/payload-types'
import { TAG } from '@/payload/delivery/tags'
import { staff, testPayload } from '../helpers/payload'
import { author, body, eventsFor, rubric, RUN } from './fixtures'

/**
 * The same pipeline through the real editorial workflow (CMS-SPEC §5.2): a
 * reporter's story is submitted, approved by an editor, published, then
 * withdrawn by the editor-in-chief. Only the two writes that change the live
 * row produce publish-events rows; the draft-only transitions produce none.
 */
let payload: Awaited<ReturnType<typeof testPayload>>
let a: Article

type Step = { id: string; from: string; to: string; comment?: string }
const transition = async (user: unknown, step: Step, publish: boolean, data: Record<string, unknown> = {}) =>
  payload.update({
    collection: 'articles',
    id: a.id,
    data: { ...data, _status: publish ? 'published' : 'draft' },
    draft: !publish,
    user,
    context: { transition: step },
    overrideAccess: true,
  })

beforeAll(async () => {
  payload = await testPayload()
  const reporter = await staff('reporter')
  const title = `Tahririyat oqimi ${RUN}`
  a = await payload.create({
    collection: 'articles',
    data: {
      title,
      lead: 'Markaziy bank yangi hisobot eʼlon qildi.',
      body: body('Hisobotda islomiy moliya xizmatlari haqida maʼlumot berilgan.'),
      rubric: (await rubric('dunyo', 5)).id,
      authors: [(await author('flow')).id],
      sources: [{ title: 'Hisobot', publisher: 'Markaziy bank' }],
      assignee: reporter.id,
      _status: 'draft',
    } as never,
    draft: true,
    user: reporter,
    overrideAccess: true,
  })
})
afterAll(async () => (await testPayload()).destroy())

describe('through the workflow', () => {
  it('start, submit and approve are draft saves: no row', async () => {
    await transition(await staff('editor'), { id: 'start', from: 'idea', to: 'draft' }, false)
    await transition(await staff('reporter'), { id: 'submit', from: 'draft', to: 'in_edit' }, false)
    await transition(await staff('editor'), { id: 'approve', from: 'in_edit', to: 'ready' }, false)
    expect(await eventsFor(payload, 'articles', a.id)).toHaveLength(0)
  })

  it('publish writes publish_first with the editor as actor', async () => {
    const editor = await staff('editor')
    await transition(editor, { id: 'publish', from: 'ready', to: 'published' }, true)
    const rows = await eventsFor(payload, 'articles', a.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'publish_first', actorId: editor.id, status: 'pending' })
    expect((rows[0]!.targets as { expire: string[] }).expire).toContain(TAG.article(a.id))
  })

  it('withdraw writes withdraw', async () => {
    await transition(
      await staff('eic'),
      { id: 'withdraw', from: 'published', to: 'withdrawn', comment: 'Sud qarori' },
      true,
      { withdrawal: { publicNotice: 'Maqola tahririyat qarori bilan olib tashlandi.', internalReason: 'Sud qarori' } },
    )
    const rows = await eventsFor(payload, 'articles', a.id)
    expect(rows.map((r) => r.kind)).toEqual(['publish_first', 'withdraw'])
    expect((rows[1]!.targets as { expire: string[] }).expire).toEqual(expect.arrayContaining([TAG.articles, TAG.home]))
  })
})
