import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

import type { Finding } from '../../../content/rules'
import { REL } from '../../fields/relations'
import { idOf, isolated, type Doc, type Id } from './shared'

/**
 * ART-1 (CMS-SPEC §3.1, §7.2): the slug is unique across all articles, and
 * once a story is live its address is frozen. A later change, published by an
 * editor, records the old address in `slugHistory` and creates a permanent
 * redirect from it, so links and search results keep working. The site
 * answers the old address with that redirect (§8.8).
 */

/** Editions and their path prefixes (src/i18n/config.ts: uz has none). */
const EDITION_PREFIXES = ['', '/kr', '/ru', '/en']

const DUPLICATE = 'slugi boshqa maqolada ishlatilgan'

/** The ART-1 finding that the database would also refuse (a unique slug), as opposed to a malformed one. */
export const isDuplicateSlug = (f: Finding) => f.rule === 'ART-1' && f.message.includes(DUPLICATE)

/** ART-1: another article (trashed ones too: they keep their row) already has this slug. */
export async function slugFindings(req: PayloadRequest, id: Id | undefined, slug: unknown): Promise<Finding[]> {
  if (typeof slug !== 'string' || !slug) return []
  const { totalDocs } = await req.payload.count({
    collection: REL.articles,
    where: id === undefined ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, { id: { not_equals: id } }] },
    trash: true,
    overrideAccess: true,
    req: isolated(req),
  })
  return totalDocs ? [{ rule: 'ART-1', level: 'error', path: 'slug', message: `«${slug}» ${DUPLICATE}: boshqa slug yozing` }] : []
}

const pendingKey = (id: Id) => `validate:slugChange:${String(id)}`

async function rubricSlug(req: PayloadRequest, rubric: unknown): Promise<string | undefined> {
  const id = idOf(rubric)
  if (id === undefined) return undefined
  const doc = (await req.payload.findByID({ collection: REL.rubrics, id, depth: 0, draft: false, disableErrors: true, overrideAccess: true, req: isolated(req) })) as Doc | null
  return typeof doc?.slug === 'string' ? doc.slug : undefined
}

/**
 * Called by the articles beforeChange hook on a publish. When the live story's
 * rubric or slug changes, appends the old address to `slugHistory` (unless
 * the workflow concern already did) and remembers the redirect for
 * afterChange. Returns the new `slugHistory`, or undefined for no change.
 */
export async function recordSlugChange(req: PayloadRequest, id: Id, data: Doc, originalDoc: Doc | undefined): Promise<Doc[] | undefined> {
  const live = (await req.payload.findByID({ collection: REL.articles, id, depth: 0, draft: false, disableErrors: true, overrideAccess: true, req: isolated(req), select: { slug: true, rubric: true, _status: true } as never })) as Doc | null
  if (!live || live._status !== 'published' || typeof live.slug !== 'string') return undefined
  const nextSlug = (data.slug ?? originalDoc?.slug) as string | undefined
  const nextRubric = data.rubric ?? originalDoc?.rubric
  const oldRubric = await rubricSlug(req, live.rubric)
  const newRubric = await rubricSlug(req, nextRubric)
  if (!nextSlug || !oldRubric || (nextSlug === live.slug && oldRubric === newRubric)) return undefined
  const history = ((data.slugHistory ?? originalDoc?.slugHistory ?? []) as Doc[]).map((r) => ({ ...r }))
  if (!history.some((r) => r.slug === live.slug && r.rubric === oldRubric)) history.push({ slug: live.slug, rubric: oldRubric, changedAt: new Date().toISOString() })
  req.context[pendingKey(id)] = { from: `/${oldRubric}/${live.slug}` }
  return history
}

/** afterChange: the permanent redirects for a published slug or rubric change, in the same transaction. */
export const createSlugRedirects: CollectionAfterChangeHook = async ({ doc, req }) => {
  const pending = req.context?.[pendingKey(doc.id)] as { from: string } | undefined
  if (!pending || doc._status !== 'published') return doc
  delete req.context[pendingKey(doc.id)]
  for (const prefix of EDITION_PREFIXES) {
    const from = `${prefix}${pending.from}`
    const { totalDocs } = await req.payload.count({ collection: 'redirects' as never, where: { from: { equals: from } }, overrideAccess: true, req: isolated(req) })
    if (totalDocs) continue
    await req.payload.create({
      collection: 'redirects' as never,
      data: { from, to: { type: 'reference', reference: { relationTo: REL.articles, value: doc.id } }, type: '301' } as never,
      overrideAccess: true,
      req: isolated(req),
    })
  }
  return doc
}
