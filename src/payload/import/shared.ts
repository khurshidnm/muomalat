import type { CollectionSlug, Payload, Where } from 'payload'

/**
 * Shared machinery of the mock importer (CMS-SPEC §11).
 *
 * Every write goes through the Local API with `overrideAccess: true` and
 * `context: { trustedInternal: true, importing: true }` (the spec's
 * `{ trustedInternal, import }`): the workflow concern then skips the
 * two-person rule and the transition table for imported history, the audit
 * concern records the rows as `system:import` (it names an internal caller
 * only when `trustedInternal` is set), the validation concern still
 * blocks a publish that breaks a rule, and the invalidation concern queues its
 * targets in the outbox (`after()` throws outside a request, §8.4).
 *
 * Phase 0 rules followed here (§11.1):
 * - `_status: 'published'` is passed explicitly to publish; every other write
 *   passes `draft: true`, which writes a version and leaves the live row alone;
 * - each locale is written in its own call (`locale: 'all'` writes nothing localized);
 * - array rows written in uz are re-sent with their ids in ru and en;
 * - dates are written as ISO strings with `Z`.
 * No call passes `req`, so nothing can write into another call's locale (payloadcms#18246).
 */

export const IMPORT_CONTEXT = { trustedInternal: true, importing: true } as const

export type Id = number | string
export type Doc = Record<string, unknown> & { id: Id }
export type Data = Record<string, unknown>
export type Translated = 'ru' | 'en'
export const TRANSLATED: Translated[] = ['ru', 'en']

export interface Counter {
  created: number
  updated: number
  unchanged: number
}

export interface ImportLog {
  info(line: string): void
  warn(line: string): void
}

/** Mock dates carry +05:00; Payload is given UTC with `Z`. */
export const isoZ = (value: string | undefined | null): string | null => (value ? new Date(value).toISOString() : null)

/** A UTC string from Payload in the mock format: Tashkent time with `+05:00` and seconds (PHASE0 §1.8). */
export function toTashkent(value: string): string {
  const shifted = new Date(new Date(value).getTime() + 5 * 3600_000)
  return shifted.toISOString().replace(/\.\d{3}Z$/, '+05:00')
}

export const idOf = (v: unknown): Id | undefined =>
  v === null || v === undefined || v === '' ? undefined : typeof v === 'object' ? ((v as { id?: Id }).id ?? undefined) : (v as Id)

const TRASH = new Set(['articles'])

/**
 * The document this record was imported as: by `legacyId`, else by the
 * natural key (a slug an editor may have created by hand before the first
 * import), so a re-run updates instead of duplicating (M2). Trashed stories
 * count too: a re-run restores them.
 */
export async function findExisting(payload: Payload, collection: string, legacyId: string, natural?: Where): Promise<Doc | undefined> {
  for (const where of [{ legacyId: { equals: legacyId } } as Where, natural]) {
    if (!where) continue
    const { docs } = await payload.find({
      collection: collection as CollectionSlug,
      where,
      limit: 1,
      depth: 0,
      draft: false,
      pagination: false,
      overrideAccess: true,
      ...(TRASH.has(collection) ? { trash: true } : {}),
    })
    if (docs[0]) return docs[0] as unknown as Doc
  }
  return undefined
}

/** The latest version (draft or published) in one locale, or every locale. */
export async function latest(payload: Payload, collection: string, id: Id, locale: 'uz' | Translated | 'all' = 'uz'): Promise<Doc> {
  return (await payload.findByID({
    collection: collection as CollectionSlug,
    id,
    locale: locale as never,
    fallbackLocale: false as never,
    draft: true,
    depth: 0,
    overrideAccess: true,
    ...(TRASH.has(collection) ? { trash: true } : {}),
  })) as unknown as Doc
}

export interface WriteSpec {
  collection: string
  existing?: Doc
  /** uz values of localized fields plus every non-localized field. */
  uz: Data
  /** Values of the localized fields in ru and en, written after uz. */
  locales?: Partial<Record<Translated, Data | undefined>>
  /**
   * Publish after the locales are written, with these extra values (system
   * fields of the publication). `false` leaves the record a draft; a record
   * that is already live then keeps its live version and gets a pending draft.
   */
  publish: false | Data
}

/**
 * Writes one record of a drafts collection: the uz draft (create or update),
 * the ru and en drafts, then the publish. Payload's publish copies the latest
 * version, every locale included, into the live row (PHASE0 item 22; checked
 * again in tests/import).
 */
export async function writeDoc(payload: Payload, spec: WriteSpec): Promise<{ doc: Doc; created: boolean }> {
  const collection = spec.collection as CollectionSlug
  const base = { collection, depth: 0, overrideAccess: true, context: IMPORT_CONTEXT } as const
  const restore = spec.existing?.deletedAt ? { deletedAt: null } : {}
  const doc = (
    spec.existing
      ? await payload.update({ ...base, id: spec.existing.id, locale: 'uz', draft: true, data: { ...spec.uz, ...restore } as never, ...(TRASH.has(collection) ? { trash: true } : {}) })
      : await payload.create({ ...base, locale: 'uz', draft: true, data: { ...spec.uz, _status: 'draft' } as never })
  ) as unknown as Doc
  for (const l of TRANSLATED) {
    const data = spec.locales?.[l]
    if (!data || !Object.keys(data).length) continue
    await payload.update({ ...base, id: doc.id, locale: l, draft: true, data: data as never, ...(TRASH.has(collection) ? { trash: true } : {}) })
  }
  if (spec.publish) {
    await payload.update({ ...base, id: doc.id, locale: 'uz', draft: false, data: { ...spec.publish, _status: 'published' } as never, ...(TRASH.has(collection) ? { trash: true } : {}) })
  }
  return { doc, created: !spec.existing }
}

export const count = (c: Counter, created: boolean) => (created ? c.created++ : c.updated++)
export const newCounter = (): Counter => ({ created: 0, updated: 0, unchanged: 0 })
