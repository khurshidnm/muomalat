import type { FlattenedField, Payload, Where } from 'payload'

import { isEmptyTree } from '../../payload/hooks/validate/lexical'
import { ARTICLES, type Doc, type Id, idOf, idsOf } from '../../payload/hooks/workflow/shared'
import { isReadOnly } from '../../payload/security/readOnly'
import type { Job } from '../index'

/**
 * Empty idea drafts. Payload's create view saves the document the moment
 * "Yangi yaratish" is clicked (autosave), so every click that goes no further
 * leaves an empty «Gʻoya» in the lists. Once an hour this job deletes the ones
 * that have sat untouched for 24 hours, and nothing else.
 *
 * A story is deleted only when every one of these holds; anything doubtful is
 * kept:
 * - never published: `workflowStatus` is `idea`, the main row and the latest
 *   version are drafts, no version was ever published, `firstPublishedAt` and
 *   `publishedAt` are empty; not in the trash;
 * - untouched since it was created, at least 24 hours ago: it has one version,
 *   saved within a minute of the creation, and its only audit row is
 *   `doc.create`;
 * - empty in every locale: each field is empty (null, '', false, no rows, an
 *   empty rich text) or holds the value the create view fills in by itself,
 *   that is the field's static default, the creator as assignee, and, for a
 *   commercial account, the sponsored flag with the one commercial byline SP-1
 *   puts on it. Bookkeeping fields (ids, timestamps, the short code, stored
 *   check results, derived lists) are not content.
 *
 * Each deletion is a permanent delete through the Local API, so the delete
 * guards run and the audit concern writes one `doc.delete` row, by
 * `system:empty-drafts`, with the reason as its summary.
 */

export const EMPTY_DRAFT_AGE_MS = 24 * 60 * 60 * 1000
/** The create view's own write and its first version land within this of the creation time. */
const CREATION_WINDOW_MS = 60_000
const BATCH = 100
const ACTOR = 'system:empty-drafts'
export const EMPTY_DRAFT_SUMMARY = 'Boʻsh «Gʻoya» qoralamasi: yaratilganidan beri 24 soat davomida tegilmagan, avtomatik oʻchirildi'

/** Not content: identity, timestamps, generated or derived values, stored check results. */
const BOOKKEEPING = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  '_status',
  'workflowStatus',
  'lastEditedBy',
  'shortCode',
  'validationWarnings',
  '_authorUsers',
  'mediaRefs',
])

const time = (v: unknown) => (typeof v === 'string' || v instanceof Date ? new Date(v).getTime() : NaN)

const isBlankValue = (v: unknown): boolean => {
  if (v === null || v === undefined || v === '' || v === false) return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.values(v as Doc).every(isBlankValue)
  return false
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

type Allowed = { assignee?: Id; commercialByline?: Id }

/**
 * The first path in `data` that holds content, or undefined when there is
 * none. Walks the collection's fields so localized values (one entry per
 * locale), groups and defaults are read the way the field defines them.
 */
export function firstContent(fields: FlattenedField[], data: Doc | null | undefined, allowed: Allowed, prefix = ''): string | undefined {
  if (!data) return undefined
  const known = new Set<string>()
  for (const field of fields) {
    if (!('name' in field)) continue
    known.add(field.name)
    if (!prefix && BOOKKEEPING.has(field.name)) continue
    const path = prefix ? `${prefix}.${field.name}` : field.name
    const value = data[field.name]
    const localized = 'localized' in field && field.localized && value && typeof value === 'object' && !Array.isArray(value)
    const values = localized ? Object.values(value as Doc) : [value]
    for (const v of values) {
      const found = contentIn(field, v, path, allowed)
      if (found) return found
    }
  }
  // A key no field declares (Payload's own columns such as `<date>_tz` are fields): content unless blank.
  for (const [key, v] of Object.entries(data)) {
    if (known.has(key) || (!prefix && BOOKKEEPING.has(key))) continue
    if (!isBlankValue(v)) return prefix ? `${prefix}.${key}` : key
  }
  return undefined
}

function contentIn(field: FlattenedField, value: unknown, path: string, allowed: Allowed): string | undefined {
  if (isBlankValue(value)) return undefined
  if (field.type === 'group' && value && typeof value === 'object' && !Array.isArray(value)) {
    return firstContent(field.flattenedFields, value as Doc, allowed, path)
  }
  if (field.type === 'richText') return isEmptyTree(value) ? undefined : path
  const fallback = 'defaultValue' in field ? field.defaultValue : undefined
  if (fallback !== undefined && typeof fallback !== 'function' && sameValue(value, fallback)) return undefined
  // Function defaults the create view applies: the creator as assignee; SP-1's sponsored flag and byline.
  if (path === 'assignee' && allowed.assignee !== undefined && String(idOf(value)) === String(allowed.assignee)) return undefined
  if (path === 'sponsored.enabled' && allowed.commercialByline !== undefined && value === true) return undefined
  if (path === 'authors' && allowed.commercialByline !== undefined && sameValue(idsOf(value).map(String), [String(allowed.commercialByline)])) return undefined
  return path
}

/** Why a story is kept, or undefined when it is an empty, untouched, never-published idea draft past the age limit. */
export async function keepReason(payload: Payload, id: Id, now: number): Promise<string | undefined> {
  const read = (draft: boolean) =>
    payload.findByID({ collection: ARTICLES, id, draft, locale: 'all', fallbackLocale: false, depth: 0, overrideAccess: true, disableErrors: true }) as Promise<Doc | null>
  const [latest, main] = [await read(true), await read(false)]
  if (!latest || !main) return 'not found'
  if (latest.deletedAt || main.deletedAt) return 'in the trash'
  if (latest.workflowStatus !== 'idea' || main.workflowStatus !== 'idea') return 'not an idea'
  if (latest._status !== 'draft' || main._status !== 'draft') return 'published'
  if (latest.firstPublishedAt || latest.publishedAt || main.firstPublishedAt || main.publishedAt) return 'published before'

  const created = time(main.createdAt)
  if (!(created <= now - EMPTY_DRAFT_AGE_MS)) return 'younger than 24 h'
  const versions = await payload.findVersions({ collection: ARTICLES, where: { parent: { equals: id } }, limit: 2, depth: 0, overrideAccess: true })
  if (versions.docs.length !== 1) return 'saved more than once'
  const version = versions.docs[0] as unknown as Doc & { version?: Doc }
  if (version.version?._status !== 'draft') return 'published version'
  for (const stamp of [main.updatedAt, latest.updatedAt, version.updatedAt]) {
    if (!(time(stamp) - created <= CREATION_WINDOW_MS)) return 'edited after creation'
  }
  const audit = await payload.find({
    collection: 'audit-log',
    where: { and: [{ collection: { equals: ARTICLES } }, { docId: { equals: String(id) } }] },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  })
  const rows = audit.docs as unknown as Doc[]
  if (rows.length !== 1 || rows[0]!.action !== 'doc.create') return 'audit shows activity'
  const creator = rows[0]!.actorId as Id | null | undefined
  if (creator === null || creator === undefined) return 'not created by a person'

  const allowed: Allowed = { assignee: creator }
  const sponsored = ((latest.sponsored ?? {}) as Doc).enabled === true
  if (sponsored) {
    const user = (await payload.findByID({ collection: 'users', id: creator, depth: 0, overrideAccess: true, disableErrors: true })) as Doc | null
    const authors = idsOf(latest.authors)
    if (user?.role === 'commercial' && authors.length === 1) {
      const byline = (await payload.findByID({ collection: 'authors', id: authors[0]!, depth: 0, overrideAccess: true, disableErrors: true })) as Doc | null
      if (byline?.commercial === true) allowed.commercialByline = authors[0]
    }
  }
  const fields = payload.collections[ARTICLES].config.flattenedFields
  for (const doc of [latest, main]) {
    const found = firstContent(fields, doc, allowed)
    if (found) return `content in ${found}`
  }
  return undefined
}

export type EmptyDraftsResult = { checked: number; deleted: Id[]; kept: { id: Id; reason: string }[] }

/**
 * One pass. `now` and `scope` are for tests: the clock, and a narrower set of
 * stories (test files share one database).
 */
export async function deleteEmptyDrafts(payload: Payload, opts: { now?: number; scope?: Where } = {}): Promise<EmptyDraftsResult> {
  const now = opts.now ?? Date.now()
  const cutoff = new Date(now - EMPTY_DRAFT_AGE_MS).toISOString()
  const where: Where = {
    and: [
      { workflowStatus: { equals: 'idea' } },
      { createdAt: { less_than_equal: cutoff } },
      { firstPublishedAt: { exists: false } },
      ...(opts.scope ? [opts.scope] : []),
    ],
  }
  const { docs } = await payload.find({ collection: ARTICLES, where, draft: true, sort: 'createdAt', limit: BATCH, depth: 0, overrideAccess: true, select: { id: true } as never })
  const result: EmptyDraftsResult = { checked: docs.length, deleted: [], kept: [] }
  for (const { id } of docs as unknown as { id: Id }[]) {
    const reason = await keepReason(payload, id, now)
    if (reason) {
      result.kept.push({ id, reason })
      continue
    }
    await payload.delete({
      collection: ARTICLES,
      id,
      depth: 0,
      overrideAccess: true,
      context: { trustedInternal: true, auditActor: ACTOR, audit: { summary: EMPTY_DRAFT_SUMMARY } },
    })
    result.deleted.push(id)
  }
  return result
}

export const job: Job = {
  name: 'empty-drafts',
  intervalMs: 60 * 60 * 1000,
  run: async (payload) => {
    // Read-only mode refuses every write (§12.10); the drafts wait for the next pass.
    if (await isReadOnly({ payload })) return
    const r = await deleteEmptyDrafts(payload)
    if (r.deleted.length) payload.logger.info({ msg: `empty-drafts: ${r.deleted.length} empty idea draft(s) deleted (${r.deleted.join(', ')}); ${r.kept.length} kept` })
  },
}
