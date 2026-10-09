import {
  isolateObjectProperty,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionSlug,
  type PayloadRequest,
} from 'payload'

import type { PublishEventKind } from '../../collections/PublishEvents'
import { recordPublishEvent, type ChangeKind } from '../../delivery/outbox'
import type { Targets } from '../../delivery/tags'
import type { CollectionHooks } from '../index'

/**
 * Shared machinery of the invalidate concern: which saves change the public
 * site, and what the live row looked like before and after.
 *
 * Only the live (main) row is public. On a drafts collection a draft save
 * writes a version and leaves the main row alone, and `originalDoc` is the
 * latest version, not the live row (PHASE0 item 2). So:
 * - beforeOperation stores whether the operation writes the main row
 *   (`draft` is not passed to later hooks);
 * - beforeChange reads the live row before the change;
 * - afterChange reads it again inside the same transaction and compares.
 * Draft saves and autosaves stop at the first step and cost no query.
 */
export type Doc = Record<string, unknown> & { id?: string | number }
type Id = string | number

/** Same transaction, never a different locale (payloadcms#18246). */
export const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])

export const idOf = (v: unknown): Id | undefined =>
  v && typeof v === 'object' ? (v as { id?: Id }).id : v === null || v === undefined || v === '' ? undefined : (v as Id)
export const idsOf = (v: unknown): Id[] => (Array.isArray(v) ? v.map(idOf).filter((x): x is Id => x !== undefined) : [])

export const hasDrafts = (entity: { versions?: unknown }) =>
  Boolean(entity.versions && typeof entity.versions === 'object' && (entity.versions as { drafts?: unknown }).drafts)

// ── req.context bookkeeping ────────────────────────────────────────────────
/**
 * One frame per write operation, on a stack per document: a hook of another
 * concern may update the same document inside this save (the corrections log
 * fills `versionId` in afterChange), and that nested save must not take this
 * one's live row. Bulk updates (no id) share one frame under `<slug>:*`.
 */
export type Frame = { writesMain: boolean; changeKind?: unknown; before: Map<string, Doc | null> }
const FRAMES = 'invalidate.frames'
const key = (slug: string, id?: Id) => `${slug}:${id ?? '*'}`
const frames = (req: PayloadRequest) => ((req.context[FRAMES] ??= {}) as Record<string, Frame[]>)

export function pushFrame(req: PayloadRequest, slug: string, id: Id | undefined, frame: Omit<Frame, 'before'>): Frame {
  const f: Frame = { ...frame, before: new Map() }
  ;(frames(req)[key(slug, id)] ??= []).push(f)
  return f
}

export const currentFrame = (req: PayloadRequest, slug: string, id?: Id): Frame | undefined =>
  frames(req)[key(slug, id)]?.at(-1) ?? frames(req)[key(slug)]?.at(-1)

/** afterChange: the live row this save started from, and the end of a by-id frame. */
function finishFrame(req: PayloadRequest, slug: string, id: Id): { frame?: Frame; before: Doc | null | undefined } {
  const frame = currentFrame(req, slug, id)
  const before = frame?.before.has(String(id)) ? frame.before.get(String(id)) : undefined
  frame?.before.delete(String(id))
  const own = frames(req)[key(slug, id)]
  if (own?.length && own.at(-1) === frame) own.pop()
  return { frame, before }
}

/**
 * beforeOperation: does this operation write the live row? A save with
 * `draft: true` that does not publish writes a version only (payload
 * collections/operations/utilities/update.js, `isSavingDraft`); a restore
 * writes the live row unless it is restored as a draft.
 */
export const stashOperation: CollectionBeforeOperationHook = async ({ args, operation, collection, req }) => {
  if (operation !== 'update' && operation !== 'restoreVersion') return args
  const a = args as { id?: Id; draft?: boolean; data?: Doc }
  let id = a.id
  let writesMain: boolean
  if (operation === 'restoreVersion') {
    writesMain = !a.draft
    if (id !== undefined) {
      const version = await req.payload.findVersionByID({
        collection: collection.slug as CollectionSlug,
        id: String(id),
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
        req: isolated(req),
      })
      id = idOf((version as { parent?: unknown } | null)?.parent)
    }
  } else {
    writesMain = !hasDrafts(collection) || !(a.draft && a.data?._status !== 'published')
  }
  pushFrame(req, collection.slug, id, { writesMain, changeKind: (a.data?.changeNote as Doc | undefined)?.kind })
  return args
}

/** The live row, whatever its status, trashed included. */
export async function readLive(req: PayloadRequest, collection: string, id: Id): Promise<Doc | null> {
  const doc = await req.payload.findByID({
    collection: collection as CollectionSlug,
    id,
    depth: 0,
    draft: false,
    trash: true,
    disableErrors: true,
    overrideAccess: true,
    req: isolated(req),
  })
  return (doc as Doc | null) ?? null
}

/**
 * beforeChange: keep the live row as it was, when this save writes it. The
 * change note may sit in the latest draft rather than in this request's data;
 * take it from there before the workflow clears it.
 */
export const rememberLive: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req, collection }) => {
  const id = idOf(originalDoc)
  if (operation !== 'update' || id === undefined) return data
  const frame = currentFrame(req, collection.slug, id) ?? pushFrame(req, collection.slug, id, { writesMain: true })
  if (!frame.writesMain) return data
  frame.changeKind ??= ((originalDoc as Doc | undefined)?.changeNote as Doc | undefined)?.kind
  frame.before.set(String(id), await readLive(req, collection.slug, id))
  return data
}

export const isLive = (doc: Doc | null | undefined, drafts: boolean) =>
  Boolean(doc) && !doc!.deletedAt && (!drafts || doc!._status === 'published')

export type LiveChange = {
  req: PayloadRequest
  collection: string
  id: Id
  /** The live row before; null when there was none, undefined when unknown. */
  before: Doc | null | undefined
  /** The live row after; null after a delete. */
  after: Doc | null
  wasLive: boolean
  isLive: boolean
  operation: 'create' | 'update' | 'delete'
  changeKind?: unknown
}

export type Recorder = (change: LiveChange) => Promise<{ kind: PublishEventKind; targets: Targets; changeKind?: ChangeKind } | undefined>

/**
 * afterChange and afterDelete for a collection whose live rows feed the site.
 * `decide` turns a change of a live row into a publish event (or nothing).
 */
export function liveHooks(decide: Recorder): CollectionHooks {
  const record = async (change: LiveChange) => {
    const event = await decide(change)
    if (event) await recordPublishEvent(change.req, { collection: change.collection, docId: change.id, ...event })
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, operation, req, collection }) => {
    const slug = collection.slug
    const drafts = hasDrafts(collection)
    const id = idOf(doc)
    if (id === undefined) return doc
    const { frame, before } = operation === 'update' ? finishFrame(req, slug, id) : { frame: undefined, before: null }
    if (frame?.writesMain === false) return doc
    if (operation === 'create' && drafts && doc._status !== 'published') return doc
    const after = await readLive(req, slug, id)
    // The live row is untouched: a draft save that slipped past the stash.
    if (operation === 'update' && before && after && before.updatedAt === after.updatedAt) return doc
    const wasLive = before === undefined ? isLive(after, drafts) : isLive(before, drafts)
    const nowLive = isLive(after, drafts)
    if (!wasLive && !nowLive) return doc
    await record({ req, collection: slug, id, before, after, wasLive, isLive: nowLive, operation, changeKind: frame?.changeKind })
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, id, req, collection }) => {
    const live = doc as Doc
    if (!isLive(live, hasDrafts(collection))) return doc
    await record({ req, collection: collection.slug, id: idOf(live) ?? id, before: live, after: null, wasLive: true, isLive: false, operation: 'delete' })
    return doc
  }

  return {
    beforeOperation: [stashOperation],
    beforeChange: [rememberLive],
    afterChange: [afterChange],
    afterDelete: [afterDelete],
  }
}

/** The kind of a change to a live row, for collections without a publication history. */
export function plainKind(c: Pick<LiveChange, 'wasLive' | 'isLive' | 'after'>): PublishEventKind {
  if (!c.wasLive) return 'publish_first'
  if (!c.isLive) return c.after ? (c.after.deletedAt ? 'delete' : 'unpublish') : 'delete'
  return 'publish_change'
}

/** Slugs of related documents, read from their live rows. */
export async function slugsOf(req: PayloadRequest, collection: string, ids: Id[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map(String))]
  if (!unique.length) return new Map()
  const { docs } = await req.payload.find({
    collection: collection as CollectionSlug,
    where: { id: { in: unique } },
    depth: 0,
    pagination: false,
    trash: true,
    overrideAccess: true,
    req: isolated(req),
    select: { slug: true } as never,
  })
  return new Map(docs.map((d): [string, string] => [String((d as Doc).id), String((d as Doc).slug ?? '')]).filter(([, s]) => s !== ''))
}

export const slugOf = (doc: Doc | null | undefined) => (typeof doc?.slug === 'string' && doc.slug !== '' ? doc.slug : undefined)
