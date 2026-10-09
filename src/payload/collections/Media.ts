import type { CollectionConfig } from 'payload'
import path from 'node:path'
import sharp from 'sharp'

import { hasRole, isStaff, withEdge } from '../access/roles'
import { REL } from '../fields/relations'
import { displayFields, rightsFields } from '../fields/rights'
import { hooksFor } from '../hooks'

const staticDir = path.resolve(process.env.MEDIA_DIR || './.data/media')
const webp = { format: 'webp' as const, options: { quality: 82 } }
// Link previews (Telegram, Facebook) do not all accept WebP.
const jpeg = { format: 'jpeg' as const, options: { quality: 85, mozjpeg: true } }

/**
 * Images (CMS-SPEC §3.12). Raster formats only: SVG and XML uploads were the
 * route for two 2026 Payload advisories. `pasteURL` stays off (SSRF class).
 * Alt text, credit and rights (§3.12) are checked when a story that uses the
 * image is published (ART-13/14/15, validation concern).
 *
 * Metadata: Payload's formatOptions strips EXIF only on a plain upload. When an
 * editor sets just a focal point before the first save, Payload stores the raw
 * upload, GPS included (PHASE0-FINDINGS §1.8). So every incoming file is
 * re-encoded here first: sharp drops EXIF, XMP and ICC, and rotate() bakes the
 * camera orientation into the pixels. Each size also gets its own format,
 * because the collection-level formatOptions does not apply to sizes.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Rasm', plural: 'Rasmlar' },
  admin: {
    group: 'Kontent',
    defaultColumns: ['filename', 'alt', 'credit', 'rightsCategory', 'updatedAt'],
    // The built-in Copy to locale publishes and overwrites without review (PHASE0 item 16).
    disableCopyToLocale: true,
  },
  access: {
    // Anonymous visitors may fetch an image file (GET /api/media/file/<name>,
    // where Payload sets isReadingStaticFile) and nothing else: listing media
    // and reading alt/credit/rights metadata over REST needs a staff account.
    // Returning a condition (not `true`) makes Payload look the filename up in
    // the collection first, so only registered uploads are served and unknown
    // names are refused without touching the disk.
    // proxy.ts additionally lets only /api/media/file/* through on the public host.
    read: withEdge((args) => (args.isReadingStaticFile === true ? { filename: { exists: true } } : isStaff(args))),
    create: withEdge(({ req }) => hasRole(req, 'reporter', 'editor', 'eic', 'commercial')),
    update: withEdge(({ req }) => hasRole(req, 'reporter', 'editor', 'eic', 'commercial')),
    delete: withEdge(({ req }) => hasRole(req, 'eic')),
  },
  upload: {
    staticDir,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    pasteURL: false,
    focalPoint: true,
    crop: true,
    resizeOptions: { width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true },
    formatOptions: webp,
    imageSizes: [
      { name: 'thumb', width: 400, formatOptions: webp },
      { name: 'card', width: 800, formatOptions: webp },
      { name: 'wide', width: 1600, formatOptions: webp },
      { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: jpeg },
    ],
    adminThumbnail: 'thumb',
  },
  hooks: hooksFor('media', {
    beforeOperation: [
      async ({ args, operation }) => {
        const file = args.req?.file
        if ((operation === 'create' || operation === 'update') && file?.data?.length && /^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)) {
          const out = await sharp(file.data).rotate().webp({ quality: 95 }).toBuffer()
          file.data = out
          file.size = out.length
          file.mimetype = 'image/webp'
        }
        return args
      },
    ],
  }),
  fields: [
    {
      name: 'alt',
      label: 'Muqobil matn (alt)',
      type: 'text',
      localized: true,
      admin: { description: 'Rasmda nima muhimligini yozing. Diagramma rasmi uchun raqamlar jadvalda boʻladi. Oʻzbekchasi shart, agar rasm bezak uchun boʻlmasa.' },
    },
    ...displayFields(),
    { type: 'collapsible', label: 'Foydalanish huquqlari', fields: rightsFields() },
    {
      name: 'usedIn',
      label: 'Qayerda ishlatilgan (qoralamalar ham)',
      type: 'join',
      collection: REL.articles,
      on: 'mediaRefs',
      // Trashed stories are left out; drafts and published stories are listed.
      where: { deletedAt: { exists: false } },
      defaultLimit: 20,
      admin: {
        description: 'Bu rasm ishlatilgan maqolalar, chop etilmagan qoralamalar bilan birga. Rasmni oʻchirishdan oldin tekshiring.',
        defaultColumns: ['title', 'workflowStatus', 'updatedAt'],
        allowCreate: false,
      },
    },
  ],
}
