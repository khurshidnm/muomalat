/**
 * Images for the public views (CMS-SPEC §3.12, §6.5).
 *
 * Media metadata is read in a separate query for the ids that the published
 * documents reference. Media read access refuses anonymous metadata reads
 * (src/payload/collections/Media.ts), so a public read of a story leaves its
 * uploads as bare ids; §6.5 loads them with `overrideAccess: true`. That is
 * the one place this adapter overrides access, and it is held to the ids the
 * public read returned and to the fields a reader sees (no rights notes,
 * restrictions or evidence).
 *
 * Files are served at /api/media/file/<filename> (allowed on the public
 * host, optimised by next/image). The `wide` size (1600 px) is used when
 * Payload made one; smaller originals are used as they are.
 */
import type { Payload } from 'payload'

import type { ImageRef } from '../../types'
import type { MediaDoc } from '@/payload/lexical/serialize'
import { at, clean, text, type Loc } from './locale'

type Id = string | number

export interface MediaRow {
  id: Id
  alt?: unknown
  caption?: unknown
  credit?: unknown
  decorative?: boolean | null
  creator?: string | null
  copyrightNotice?: string | null
  licenceUrl?: string | null
  filename?: string | null
  width?: number | null
  height?: number | null
  sizes?: { wide?: { filename?: string | null; width?: number | null; height?: number | null } | null } | null
}

export const MEDIA_FILE_PATH = '/api/media/file/'

export const idOf = (v: unknown): Id | undefined => {
  if (v && typeof v === 'object') return (v as { id?: Id }).id ?? undefined
  return v === null || v === undefined || v === '' ? undefined : (v as Id)
}

/** Public file and its pixel size: the 1600 px `wide` rendition when there is one. */
export function mediaFile(m: MediaRow): { src: string; width: number; height: number } | undefined {
  const wide = m.sizes?.wide
  if (wide?.filename && wide.width && wide.height) {
    return { src: `${MEDIA_FILE_PATH}${encodeURIComponent(wide.filename)}`, width: wide.width, height: wide.height }
  }
  if (!m.filename) return undefined
  return { src: `${MEDIA_FILE_PATH}${encodeURIComponent(m.filename)}`, width: m.width ?? 0, height: m.height ?? 0 }
}

/**
 * The image as the text around it needs it. Alt and credit are in `locale`,
 * falling back to Uzbek (today's translateImage rule); `translations` carries
 * the ru/en alt and credit, as the mock images do. `altOverride` is a
 * language-neutral alt (a person's name on a portrait).
 */
export function imageRef(m: MediaRow, locale: Loc, opts: { caption?: string; altOverride?: string } = {}): ImageRef | undefined {
  const file = mediaFile(m)
  if (!file) return undefined
  const decorative = Boolean(m.decorative)
  const altIn = (l: Loc) => (decorative ? '' : (opts.altOverride ?? text(at(m.alt, l))))
  const translations: NonNullable<ImageRef['translations']> = {}
  for (const l of ['ru', 'en'] as const) {
    const alt = altIn(l)
    if (alt) translations[l] = clean({ alt, credit: text(at(m.credit, l)) })
  }
  const ref: ImageRef = clean({
    src: file.src,
    alt: '',
    width: file.width,
    height: file.height,
    caption: opts.caption,
    credit: text(at(m.credit, locale)) ?? text(at(m.credit, 'uz')),
    translations: Object.keys(translations).length ? translations : undefined,
    creator: text(m.creator),
    copyrightNotice: text(m.copyrightNotice),
    licenseUrl: text(m.licenceUrl),
    decorative: decorative || undefined,
  })
  // clean() drops the empty alt; a decorative image keeps alt="".
  ref.alt = altIn(locale) ?? altIn('uz') ?? ''
  return ref
}

/** Media rows for the given ids (see the module comment on access). */
export async function loadMedia(payload: Payload, ids: Iterable<Id>): Promise<Map<string, MediaRow>> {
  const list = [...new Set([...ids].map(String))]
  const out = new Map<string, MediaRow>()
  if (!list.length) return out
  const { docs } = await payload.find({
    collection: 'media',
    where: { id: { in: list } },
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: {
      alt: true,
      caption: true,
      credit: true,
      decorative: true,
      creator: true,
      copyrightNotice: true,
      licenceUrl: true,
      filename: true,
      width: true,
      height: true,
      sizes: { wide: { filename: true, width: true, height: true } },
    },
  })
  for (const d of docs as unknown as MediaRow[]) out.set(String(d.id), d)
  return out
}

/** The serializer's view of the media rows (CMS-SPEC §3.4 `mediaById`), keyed by id; figures are rebuilt with imageRef afterwards. */
export function serializerMedia(rows: Map<string, MediaRow>): Map<Id, MediaDoc> {
  const out = new Map<Id, MediaDoc>()
  for (const m of rows.values()) {
    const file = mediaFile(m)
    const doc: MediaDoc = { id: m.id, url: file?.src ?? null, width: file?.width, height: file?.height, alt: m.alt as never, credit: m.credit as never, caption: m.caption as never }
    out.set(m.id, doc)
    out.set(String(m.id), doc)
    if (typeof m.id === 'string' && /^\d+$/.test(m.id)) out.set(Number(m.id), doc)
  }
  return out
}
