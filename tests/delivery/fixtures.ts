import type { Payload, Where } from 'payload'

import type { Article, PublishEvent } from '@/payload-types'
import { slugify } from '@/payload/fields/slug'
import { testPayload } from '../helpers/payload'

/**
 * Fixtures for the delivery tests. Test files run in parallel against one
 * database, so each file passes its own `tag` (unique slugs) and rubric.
 * Writes use overrideAccess: true: these tests are about what a change
 * invalidates, not who may make it (the access and workflow tests cover that).
 */

/** Makes names unique per run, so a file can run twice against the same database. */
export const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * Story writes run as the in-process importer (§11), which the workflow
 * concern lets through: these tests set up and change live stories directly,
 * and the importer's publications must reach the outbox like any other.
 */
export const AS_IMPORT = { importing: true } as const

type RubricSlug = 'yangiliklar' | 'tahlil' | 'intervyu' | 'izoh' | 'dunyo'

export async function rubric(slug: RubricSlug, order = 1) {
  const payload = await testPayload()
  const find = () => payload.find({ collection: 'rubrics', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
  const found = (await find()).docs[0]
  if (found) return found
  try {
    return await payload.create({ collection: 'rubrics', data: { slug, order, name: slug, _status: 'published' }, depth: 0, overrideAccess: true })
  } catch {
    // Another file created it meanwhile (unique slug).
    return (await find()).docs[0]!
  }
}

export async function author(tag: string) {
  const payload = await testPayload()
  const name = `Muallif ${tag} ${RUN}`
  return payload.create({
    collection: 'authors',
    data: { name, slug: slugify(name), role: 'muxbir', bio: 'Islomiy moliya boʻyicha yozadi.', _status: 'published' },
    depth: 0,
    overrideAccess: true,
  })
}

export async function topic(tag: string) {
  const payload = await testPayload()
  const label = `Mavzu ${tag} ${RUN}`
  return payload.create({ collection: 'tags', data: { label, slug: slugify(label), _status: 'published' }, depth: 0, overrideAccess: true })
}

/** A one-paragraph Lexical body. */
export const body = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 }],
      },
    ],
  },
})

export type StoryInput = { tag: string; rubric: number; authors: number[]; tags?: number[]; publish?: boolean }

/** A story with what Payload requires at publication; published unless `publish: false`. */
export async function story({ tag, rubric, authors, tags = [], publish = true }: StoryInput): Promise<Article> {
  const payload = await testPayload()
  const title = `Sinov maqolasi ${tag} ${RUN}`
  return payload.create({
    collection: 'articles',
    data: {
      title,
      slug: slugify(title),
      workflowStatus: publish ? 'published' : 'draft',
      lead: 'Markaziy bank yangi hisobot eʼlon qildi.',
      body: body('Hisobotda islomiy moliya xizmatlari haqida maʼlumot berilgan.'),
      rubric,
      authors,
      tags,
      sources: [{ title: 'Hisobot', publisher: 'Markaziy bank' }],
      _status: publish ? 'published' : 'draft',
    },
    depth: 0,
    context: AS_IMPORT, overrideAccess: true,
    ...(publish ? {} : { draft: true as const }),
  })
}

/** Outbox rows, oldest first. */
export async function events(payload: Payload, where: Where): Promise<PublishEvent[]> {
  const { docs } = await payload.find({ collection: 'publish-events', where, sort: 'id', depth: 0, pagination: false, overrideAccess: true })
  return docs
}

export const eventsFor = async (payload: Payload, collection: string, docId: string | number) =>
  events(payload, { and: [{ collection: { equals: collection } }, { docId: { equals: String(docId) } }] })
