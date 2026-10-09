/**
 * What relationships resolve to on the public site: id → slug maps of the
 * published rubrics, authors, tags, glossary terms and stories. Stored
 * documents keep relationships as ids (reads run at depth 0); an id missing
 * from these maps points at something that is not public (a draft, an
 * unpublished or deleted document), and the reference is left out, as the
 * serializer's resolveDoc contract asks (CMS-SPEC §3.4, §6.5).
 */
import type { Payload, Where } from 'payload'

import type { SerializeCtx } from '@/payload/lexical/serialize'
import type { RubricSlug } from '../../types'
import { isRubric } from '../../shared'
import { PUBLIC, readAs } from './client'
import { idOf, serializerMedia, type MediaRow } from './media'
import type { Loc } from './locale'

type Id = string | number

export interface Refs {
  rubric: Map<string, RubricSlug>
  author: Map<string, string>
  tag: Map<string, string>
  term: Map<string, string>
  /** Published stories (withdrawn included: their address still exists). */
  article: Map<string, { rubric: RubricSlug; slug: string }>
}

async function slugs(payload: Payload, collection: 'authors' | 'tags' | 'glossary-terms', where?: Where): Promise<Map<string, string>> {
  const { docs } = await payload.find({
    collection,
    depth: 0,
    pagination: false,
    select: { slug: true },
    ...(where ? { where } : {}),
    ...readAs(PUBLIC),
  })
  return new Map((docs as { id: Id; slug?: string | null }[]).filter((d) => d.slug).map((d) => [String(d.id), d.slug as string]))
}

export async function rubricSlugsById(payload: Payload): Promise<Map<string, RubricSlug>> {
  const { docs } = await payload.find({ collection: 'rubrics', depth: 0, pagination: false, select: { slug: true }, ...readAs(PUBLIC) })
  const out = new Map<string, RubricSlug>()
  for (const d of docs as { id: Id; slug?: string | null }[]) if (d.slug && isRubric(d.slug)) out.set(String(d.id), d.slug)
  return out
}

/** Paths of the published stories, from a cheap read of their slug and rubric. */
export async function articlePaths(payload: Payload, rubric: Map<string, RubricSlug>): Promise<Refs['article']> {
  const { docs } = await payload.find({
    collection: 'articles',
    depth: 0,
    pagination: false,
    select: { slug: true, rubric: true },
    ...readAs(PUBLIC),
  })
  const out: Refs['article'] = new Map()
  for (const d of docs as { id: Id; slug?: string | null; rubric?: unknown }[]) {
    const r = rubric.get(String(idOf(d.rubric)))
    if (d.slug && r) out.set(String(d.id), { rubric: r, slug: d.slug })
  }
  return out
}

/** Every map; `article` is given when the caller already holds the published stories. */
export async function loadRefs(payload: Payload, article?: Refs['article']): Promise<Refs> {
  const rubric = await rubricSlugsById(payload)
  const [author, tag, term, paths] = await Promise.all([
    slugs(payload, 'authors'),
    slugs(payload, 'tags'),
    slugs(payload, 'glossary-terms'),
    article ? Promise.resolve(article) : articlePaths(payload, rubric),
  ])
  return { rubric, author, tag, term, article: paths }
}

/** Slugs of the related ids that are public, in their order. */
export const slugList = (map: Map<string, string>, value: unknown): string[] =>
  (Array.isArray(value) ? value : [])
    .map((v) => map.get(String(idOf(v))))
    .filter((s): s is string => Boolean(s))

/** The serializer context for one locale (CMS-SPEC §3.4): links and term cards through `refs`, figures through `media`. */
export function serializeContext(locale: Loc, refs: Refs, media: Map<string, MediaRow>): SerializeCtx {
  return {
    locale,
    resolveDoc: ({ relationTo, value }) => {
      const id = String(idOf(value))
      if (relationTo === 'articles') {
        const a = refs.article.get(id)
        return a ? { path: `/${a.rubric}/${a.slug}`, slug: a.slug, published: true } : undefined
      }
      if (relationTo === 'glossary-terms') {
        const slug = refs.term.get(id)
        return slug ? { path: `/lugat/${slug}`, slug, published: true } : undefined
      }
      return undefined
    },
    mediaById: serializerMedia(media),
    // Editorial findings are shown in the admin (ChecksPanel); the public read only drops what is not visible.
    warn: () => {},
  }
}
