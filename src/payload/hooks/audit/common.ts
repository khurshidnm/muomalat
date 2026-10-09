import { isolateObjectProperty, type CollectionSlug, type GlobalSlug, type PayloadRequest } from 'payload'

import { titleAllowed } from './policy'

/** Nested Local API calls share the transaction but never the locale (payloadcms#18246). */
export const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])

type TitledConfig = { slug: string; admin?: { useAsTitle?: string }; upload?: unknown }

/** The document title snapshot (§9.1): the `useAsTitle` field, the file name for uploads; none for personal data. */
export function titleOf(config: TitledConfig, doc: unknown): string | null {
  if (!titleAllowed(config.slug) || !doc || typeof doc !== 'object') return null
  const d = doc as Record<string, unknown>
  const field = config.admin?.useAsTitle && config.admin.useAsTitle !== 'id' ? config.admin.useAsTitle : config.upload ? 'filename' : undefined
  if (!field) return null
  let value = d[field]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // locale 'all': prefer Uzbek, else the first locale with a value.
    const byLocale = value as Record<string, unknown>
    value = byLocale.uz ?? Object.values(byLocale).find((v) => typeof v === 'string' && v)
  }
  return typeof value === 'string' && value ? value : typeof value === 'number' ? String(value) : null
}

/** The id of the newest version of a document, for drafts and versioned collections. */
export async function latestVersionId(req: PayloadRequest, collection: string, id: number | string): Promise<string | null> {
  const { docs } = await req.payload.db.findVersions({
    collection: collection as CollectionSlug,
    where: { parent: { equals: id } },
    sort: '-updatedAt',
    limit: 1,
    pagination: false,
    req,
  })
  return docs[0]?.id !== undefined ? String(docs[0].id) : null
}

export async function latestGlobalVersionId(req: PayloadRequest, global: string): Promise<string | null> {
  const { docs } = await req.payload.db.findGlobalVersions({ global: global as GlobalSlug, sort: '-updatedAt', limit: 1, pagination: false, req })
  return docs[0]?.id !== undefined ? String(docs[0].id) : null
}

/** The request's locale as the row records it; null without localization. */
export const localeOf = (req: PayloadRequest) => (req.payload.config.localization ? (req.locale ?? null) : null)

export const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v))
