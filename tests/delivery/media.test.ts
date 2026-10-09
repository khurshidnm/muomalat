import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { TAG } from '@/payload/delivery/tags'
import { testPayload } from '../helpers/payload'
import { AS_IMPORT, author, eventsFor, rubric, story } from './fixtures'

/**
 * Media metadata (§8.5): changing an image's alt, credit or caption
 * invalidates the live stories that use it (`mediaRefs`), and nothing else.
 * Uploads go to a temporary folder, not the development media volume.
 */
vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  process.env.MEDIA_DIR = mkdtempSync(join(tmpdir(), 'muomalat-delivery-media-'))
})

let payload: Awaited<ReturnType<typeof testPayload>>

beforeAll(async () => {
  payload = await testPayload()
})
afterAll(async () => {
  const { rm } = await import('node:fs/promises')
  if (process.env.MEDIA_DIR?.includes('muomalat-delivery-media-')) await rm(process.env.MEDIA_DIR, { recursive: true, force: true })
  await (await testPayload()).destroy()
})

describe('media metadata', () => {
  it('a new alt text invalidates the live stories that use the image', async () => {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#2a6' } }).png().toBuffer()
    const image = await payload.create({
      collection: 'media',
      data: { alt: 'Bank binosi', credit: 'Muomalat', rightsCategory: 'staff' },
      file: { data: png, mimetype: 'image/png', name: 'bank.png', size: png.length },
      depth: 0,
      overrideAccess: true,
    })
    // A new upload is used nowhere yet.
    expect(await eventsFor(payload, 'media', image.id)).toHaveLength(0)

    const r = (await rubric('tahlil', 2)).id
    const by = (await author('media')).id
    const live = await story({ tag: 'media-live', rubric: r, authors: [by] })
    await payload.update({ collection: 'articles', id: live.id, data: { image: image.id, _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    const draft = await story({ tag: 'media-draft', rubric: r, authors: [by], publish: false })
    await payload.update({ collection: 'articles', id: draft.id, data: { image: image.id }, draft: true, context: AS_IMPORT, overrideAccess: true })

    await payload.update({ collection: 'media', id: image.id, data: { alt: 'Markaziy bank binosi' }, depth: 0, overrideAccess: true })
    const rows = await eventsFor(payload, 'media', image.id)
    expect(rows).toHaveLength(1)
    const t = rows[0]!.targets as Record<string, string[]>
    expect(t.tags).toEqual([TAG.articles])
    expect(t.expire).toEqual([TAG.article(live.id)])
    expect(t.paths).toEqual([`/uz/tahlil/${live.slug}`, `/kr/tahlil/${live.slug}`, `/ru/tahlil/${live.slug}`, `/en/tahlil/${live.slug}`])
    expect(t.warm).toEqual([`/tahlil/${live.slug}`, `/kr/tahlil/${live.slug}`, `/ru/tahlil/${live.slug}`, `/en/tahlil/${live.slug}`])
  })
})
