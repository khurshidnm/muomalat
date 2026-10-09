import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'
import sharp from 'sharp'

import type { ImageRef } from '../../content/types'
import { slugify } from '../fields/slug'
import { IMPORT_CONTEXT, type Counter, type Doc, type Id, type ImportLog, TRANSLATED, type Translated } from './shared'
import { CREDIT, images, mock, type MockCorpus } from './source'

/**
 * Step 1 of CMS-SPEC §11.2: the illustration library (src/content/data/images.ts)
 * becomes Media items. The library files are trusted local SVGs; Media accepts
 * raster images only, so each is rasterized with sharp to a PNG and uploaded
 * through the Local API, where the Media `beforeOperation` hook re-encodes it
 * to WebP (and drops all metadata) like any upload.
 *
 * One Media item per library image, plus one per image the mock data uses with
 * its own alt text: a portrait carries the person's name as its alt in every
 * edition (`img('portrait05', { alt: 'Shuhrat Mirzayev' })`), and alt text is
 * a property of the Media item, not of the place that uses it. Captions stay
 * with the place that uses the image (article `imageCaption`, figure caption,
 * club `imageCaption`).
 *
 * The item's filename is its key: `<library file>` or `<library file>-<alt>`,
 * e.g. `portrait-05-shuhrat-mirzayev.webp`. A re-run finds it by filename and
 * updates only the texts that changed; the file is uploaded once.
 */

/** Smallest stored width: the largest rendition the site and Media sizes use (`wide`, 1600 px; CMS-SPEC §11.2). */
export const MIN_WIDTH = 1600

const PUBLIC_DIR = fileURLToPath(new URL('../../../public', import.meta.url))

/** '/images/bank-hall.svg' → 'bank-hall'. */
export const srcStem = (src: string) => src.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '')

const libraryBySrc = new Map<string, ImageRef>(Object.values(images).map((ref) => [ref.src, ref]))

/** The Media key (filename without extension) of the item an ImageRef is imported as. */
export function mediaKey(ref: Pick<ImageRef, 'src' | 'alt'>): string {
  const stem = srcStem(ref.src)
  const base = libraryBySrc.get(ref.src)
  return !base || ref.alt === base.alt ? stem : `${stem}-${slugify(ref.alt)}`
}

export interface MediaEntry {
  key: string
  src: string
  width: number
  height: number
  alt: Record<'uz' | Translated, string>
  credit: Record<'uz' | Translated, string>
}

const entryOf = (ref: ImageRef): MediaEntry => ({
  key: mediaKey(ref),
  src: ref.src,
  width: ref.width,
  height: ref.height,
  alt: { uz: ref.alt, ru: ref.translations?.ru?.alt ?? ref.alt, en: ref.translations?.en?.alt ?? ref.alt },
  credit: {
    uz: ref.credit ?? CREDIT.uz,
    ru: ref.translations?.ru?.credit ?? ref.credit ?? CREDIT.ru,
    en: ref.translations?.en?.credit ?? ref.credit ?? CREDIT.en,
  },
})

/** Every ImageRef in the corpus: heroes, body figures (every edition), interviewee, author and speaker portraits, club images. */
export function imageRefs(corpus: MockCorpus = mock): ImageRef[] {
  const out: ImageRef[] = []
  const add = (ref?: ImageRef) => ref && out.push(ref)
  for (const a of corpus.articles) {
    add(a.image)
    add(a.interviewee?.portrait)
    for (const body of [a.body, a.translations?.ru?.body, a.translations?.en?.body]) for (const b of body ?? []) if (b.type === 'figure') add(b.image)
  }
  for (const au of corpus.authors) add(au.portrait)
  for (const e of corpus.clubEvents) {
    add(e.image)
    for (const s of e.speakers) add(s.portrait)
  }
  return out
}

/** The Media items to import: the whole library first, then the variants with their own alt. */
export function mediaEntries(corpus: MockCorpus = mock): MediaEntry[] {
  const byKey = new Map<string, MediaEntry>()
  for (const ref of [...Object.values(images), ...imageRefs(corpus)]) {
    const entry = entryOf(ref)
    if (!byKey.has(entry.key)) byKey.set(entry.key, entry)
  }
  return [...byKey.values()]
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** The raster size: the mock ratio kept exactly, at least MIN_WIDTH wide (1200 × 800 → 1602 × 1068). */
export function rasterSize(width: number, height: number): { width: number; height: number } {
  const g = gcd(width, height)
  const [w, h] = [width / g, height / g]
  const k = Math.max(1, Math.ceil(Math.max(MIN_WIDTH, width) / w))
  return { width: w * k, height: h * k }
}

export async function rasterize(entry: MediaEntry): Promise<Buffer> {
  const svg = await readFile(path.join(PUBLIC_DIR, entry.src))
  const size = rasterSize(entry.width, entry.height)
  // SVG renders at 72 dpi by default; scale the density so the vector is drawn at the target size, not upscaled.
  return sharp(svg, { density: (72 * size.width) / entry.width })
    .resize(size.width, size.height, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const RIGHTS = { rightsCategory: 'staff', creator: 'Muomalat' } as const

type MediaDoc = Doc & { filename?: string; alt?: Record<string, string | null>; credit?: Record<string, string | null>; rightsCategory?: string; creator?: string | null }

async function findMedia(payload: Payload, key: string): Promise<MediaDoc | undefined> {
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: `${key}.webp` } },
    limit: 1,
    depth: 0,
    locale: 'all',
    pagination: false,
    overrideAccess: true,
  })
  return docs[0] as unknown as MediaDoc | undefined
}

/** Uploads or updates every Media item; returns key → Media id. */
export async function importMedia(payload: Payload, counter: Counter, log: ImportLog, corpus: MockCorpus = mock): Promise<Map<string, Id>> {
  const ids = new Map<string, Id>()
  const base = { collection: 'media', depth: 0, overrideAccess: true, context: IMPORT_CONTEXT } as const
  for (const entry of mediaEntries(corpus)) {
    const found = await findMedia(payload, entry.key)
    if (!found) {
      const data = await rasterize(entry)
      const doc = (await payload.create({
        ...base,
        locale: 'uz',
        data: { alt: entry.alt.uz, credit: entry.credit.uz, ...RIGHTS } as never,
        file: { data, mimetype: 'image/png', name: `${entry.key}.png`, size: data.length },
      })) as unknown as MediaDoc
      if (doc.filename !== `${entry.key}.webp`) log.warn(`media ${entry.key}: stored as ${String(doc.filename)}; a re-run will not find it by name`)
      for (const l of TRANSLATED) await payload.update({ ...base, id: doc.id, locale: l, data: { alt: entry.alt[l], credit: entry.credit[l] } as never })
      ids.set(entry.key, doc.id)
      counter.created++
      continue
    }
    ids.set(entry.key, found.id)
    let changed = false
    for (const l of ['uz', ...TRANSLATED] as const) {
      const data: Record<string, unknown> = {}
      if ((found.alt?.[l] ?? null) !== entry.alt[l]) data.alt = entry.alt[l]
      if ((found.credit?.[l] ?? null) !== entry.credit[l]) data.credit = entry.credit[l]
      if (l === 'uz' && (found.rightsCategory !== RIGHTS.rightsCategory || found.creator !== RIGHTS.creator)) Object.assign(data, RIGHTS)
      if (!Object.keys(data).length) continue
      await payload.update({ ...base, id: found.id, locale: l, data: data as never })
      changed = true
    }
    if (changed) counter.updated++
    else counter.unchanged++
  }
  return ids
}
