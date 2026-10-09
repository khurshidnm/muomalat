import type { FieldHook, PayloadRequest, TextField, TextFieldSingleValidation } from 'payload'
import { isolateObjectProperty } from 'payload'

/** CMS-SPEC §3.1: lower-case Latin letters and digits in hyphen-separated runs. */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Uzbek text → slug: lower-case it, strip ʻ and ʼ (and the apostrophes typed
 * in their place), turn every other character that is not a-z or 0-9 into a
 * hyphen, then collapse and trim the hyphens.
 *   "Oʻzbekistonda islom oynalari: 2026-yil" → "ozbekistonda-islom-oynalari-2026-yil"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ʻʼ'‘’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const validateSlug: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && SLUG_RE.test(value) ? true : 'Faqat kichik lotin harflari, raqamlar va chiziqcha: masalan «islom-oynasi-litsenziya».'

type LiveCheck = (args: { originalDoc?: Record<string, unknown>; req: PayloadRequest; collectionSlug?: string }) => boolean | Promise<boolean>

/** Default live check: the document's main row is published (drafts do not touch the main row). */
const mainRowPublished: LiveCheck = async ({ originalDoc, req, collectionSlug }) => {
  if (!originalDoc?.id || !collectionSlug) return false
  const main = await req.payload.findByID({
    collection: collectionSlug as never,
    id: originalDoc.id as number,
    depth: 0,
    draft: false,
    trash: true,
    disableErrors: true,
    overrideAccess: true,
    // Same transaction; locale isolated so this read cannot change the outer save's locale (payloadcms#18246).
    req: isolateObjectProperty(req, ['locale', 'fallbackLocale']),
    select: { _status: true } as never,
  })
  return (main as { _status?: string } | null)?._status === 'published'
}

export interface SlugOptions {
  /** The field the slug is made from (`title`, `name`, `label`, `term`). */
  from: string
  /** The source field is localized: only a save in the default (uz) locale may set the slug. */
  localizedSource?: boolean
  /** Once this is true the slug is never regenerated. Default: the main row is published. */
  isLive?: LiveCheck
  description?: string
}

/**
 * A unique slug made from the Uzbek source text (CMS-SPEC §3.1).
 *
 * While a document is not live, the slug follows its source as long as nobody
 * has edited it by hand (it still equals the slug of the previous source
 * text). This matters with autosave: the first autosave happens while the
 * title is still being typed. A hand-written slug is kept. Once the document
 * is live the slug is left alone; changing it after publication, with its
 * slugHistory entry and redirect, belongs to the workflow concern (ART-1).
 *
 * The regex check runs at publish only, like every Payload validation on a
 * drafts collection.
 */
export function slugField({ from, localizedSource = false, isLive = mainRowPublished, description }: SlugOptions): TextField {
  const follow: FieldHook = async ({ value, siblingData, originalDoc, req, collection }) => {
    const defaultLocale = req.payload.config.localization ? req.payload.config.localization.defaultLocale : undefined
    if (localizedSource && req.locale && req.locale !== defaultLocale) return value
    const source = siblingData?.[from]
    if (typeof source !== 'string' || source.trim() === '') return value
    const next = slugify(source)
    if (!next) return value
    if (typeof value !== 'string' || value === '') return next
    const previousSource = (originalDoc as Record<string, unknown> | undefined)?.[from]
    const untouched = typeof previousSource === 'string' && value === slugify(previousSource)
    if (untouched && value !== next && !(await isLive({ originalDoc, req, collectionSlug: collection?.slug }))) return next
    return value
  }
  return {
    name: 'slug',
    label: 'URL qismi (slug)',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    validate: validateSlug,
    admin: {
      position: 'sidebar',
      description: description ?? 'Oʻzbekcha nomdan avtomatik yasaladi. Qoʻlda oʻzgartirsangiz, shu qiymat saqlanadi.',
    },
    hooks: { beforeValidate: [follow] },
  }
}
