import ObjectID from 'bson-objectid'
import sharp from 'sharp'

import { isolatedPayload as testPayload } from './isolate'

/**
 * Fixtures for the validation tests: a published rubric, author, tag and
 * media item, and Lexical JSON helpers. Writes use overrideAccess: true with
 * no user, so these tests exercise the validation concern on its own.
 */

type Node = Record<string, unknown> & { type: string }

export const text = (t: string, format = 0): Node => ({ type: 'text', text: t, format, detail: 0, mode: 'normal', style: '', version: 1 })
export const p = (...children: (string | Node)[]): Node => ({
  type: 'paragraph',
  children: children.map((c) => (typeof c === 'string' ? text(c) : c)),
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  version: 1,
})
export const link = (url: string, label: string): Node => ({
  type: 'link',
  children: [text(label)],
  fields: { linkType: 'custom', url, newTab: false },
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 3,
  id: new ObjectID().toHexString(),
})
export const list = (items: (Node | string)[], listType: 'bullet' | 'number' | 'check' = 'bullet'): Node => ({
  type: 'list',
  listType,
  tag: listType === 'number' ? 'ol' : 'ul',
  start: 1,
  children: items.map((it, i) => ({
    type: 'listitem',
    value: i + 1,
    children: typeof it === 'string' ? [text(it)] : [it],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  })),
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
export const block = (blockType: string, fields: Record<string, unknown>): Node => ({
  type: 'block',
  fields: { id: new ObjectID().toHexString(), blockName: '', blockType, ...fields },
  format: '',
  version: 2,
})
export const root = (...children: Node[]) => ({ root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 } })

export interface Base {
  rubric: number
  tahlil: number
  intervyu: number
  author: number
  tag: number
  media: number
}

let base: Promise<Base> | undefined

/** A JPEG of the given size (rights, alt and credit set as for a publishable image unless overridden). */
export async function media(data: Record<string, unknown> = {}, size: [number, number] = [1600, 900]): Promise<number> {
  const payload = await testPayload()
  const buf = await sharp({ create: { width: size[0], height: size[1], channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg().toBuffer()
  const doc = await payload.create({
    collection: 'media',
    data: { alt: 'Toshkentdagi bank binosi', credit: 'Foto: Muomalat', rightsCategory: 'staff', ...data } as never,
    file: { data: buf, mimetype: 'image/jpeg', name: `test-${Math.random().toString(36).slice(2)}.jpg`, size: buf.length },
    overrideAccess: true,
  })
  return doc.id as number
}

export function fixtures(): Promise<Base> {
  return (base ??= (async () => {
    const payload = await testPayload()
    /** Find by slug or create published: fixtures survive a re-run against the same database. */
    const ensure = async (collection: 'rubrics' | 'authors' | 'tags', slug: string, data: Record<string, unknown>) => {
      const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: false, overrideAccess: true })
      if (found.docs[0]) return found.docs[0].id as number
      return (await payload.create({ collection, data: { slug, ...data, _status: 'published' } as never, overrideAccess: true })).id as number
    }
    return {
      rubric: await ensure('rubrics', 'yangiliklar', { order: 1, name: 'Yangiliklar' }),
      tahlil: await ensure('rubrics', 'tahlil', { order: 2, name: 'Tahlil' }),
      intervyu: await ensure('rubrics', 'intervyu', { order: 3, name: 'Intervyu' }),
      author: await ensure('authors', 'aziza-rahimova', { name: 'Aziza Rahimova', role: 'muxbir', bio: 'Islom moliyasi boʻyicha muxbir.' }),
      tag: await ensure('tags', 'islom-oynasi', { label: 'Islom oynasi' }),
      media: await media(),
    }
  })())
}

/** Distinct titles and slugs across test runs on the same database. */
export const run = Math.random().toString(36).slice(2, 7)
let n = 0
/** Data for an article that passes every error rule. */
export async function goodArticle(over: Record<string, unknown> = {}) {
  const b = await fixtures()
  n += 1
  return {
    title: `Regulyator yangi talablarni eʼlon qildi ${run} ${n}`,
    lead: 'Regulyator islom oynalari uchun hisobot shaklini oʻzgartirdi.',
    body: root(p('Yangi talablar 2026-yil 1-noyabrdan kuchga kiradi.')),
    rubric: b.rubric,
    authors: [b.author],
    tags: [b.tag],
    image: b.media,
    sources: [{ title: 'Regulyator xabari', publisher: 'Regulyator', url: 'https://example.uz/xabar', type: 'press' }],
    meta: { title: 'Yangi talablar', description: 'Regulyator hisobot shaklini oʻzgartirdi.' },
    ...over,
  }
}

/** Creates a draft and returns its id. */
export async function draft(data: Record<string, unknown>) {
  const payload = await testPayload()
  n += 1
  const slug = data.slug ?? `t-${run}-${n}`
  const doc = await payload.create({ collection: 'articles', data: { ...data, slug, _status: 'draft' } as never, draft: true, overrideAccess: true })
  return doc.id as number
}

/** Publishes the latest draft with extra data; resolves to the doc or rejects with the ValidationError. */
export async function publish(id: number, data: Record<string, unknown> = {}) {
  const payload = await testPayload()
  return payload.update({ collection: 'articles', id, data: { ...data, _status: 'published' } as never, draft: false, overrideAccess: true })
}
