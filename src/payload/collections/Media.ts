import type { CollectionConfig } from 'payload'
import path from 'node:path'

import { hasRole, isStaff } from '../access/roles'

const staticDir = path.resolve(process.env.MEDIA_DIR || './.data/media')

/**
 * Images (CMS-SPEC §3.12). Raster formats only: SVG and XML uploads were the
 * route for two 2026 Payload advisories. `pasteURL` stays off (SSRF class).
 * Rights fields, usage join and publish checks arrive with the core build.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Rasm', plural: 'Rasmlar' },
  admin: { group: 'Kontent', defaultColumns: ['filename', 'alt', 'credit', 'updatedAt'] },
  access: {
    // Anonymous visitors may fetch an image file (GET /api/media/file/<name>,
    // where Payload sets isReadingStaticFile) and nothing else: listing media
    // and reading alt/credit/rights metadata over REST needs a staff account.
    // Returning a condition (not `true`) makes Payload look the filename up in
    // the collection first, so only registered uploads are served and unknown
    // names are refused without touching the disk.
    // proxy.ts additionally lets only /api/media/file/* through on the public host.
    read: (args) => (args.isReadingStaticFile === true ? { filename: { exists: true } } : isStaff(args)),
    create: ({ req }) => hasRole(req, 'reporter', 'editor', 'eic', 'commercial'),
    update: ({ req }) => hasRole(req, 'reporter', 'editor', 'eic', 'commercial'),
    delete: ({ req }) => hasRole(req, 'eic'),
  },
  upload: {
    staticDir,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    pasteURL: false,
    focalPoint: true,
    crop: true,
    resizeOptions: { width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'thumb', width: 400 },
      { name: 'card', width: 800 },
      { name: 'wide', width: 1600 },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    { name: 'alt', label: 'Muqobil matn (alt)', type: 'text', localized: true },
    { name: 'decorative', label: 'Bezak uchun (alt boʻsh)', type: 'checkbox' },
    { name: 'caption', label: 'Izoh', type: 'text', localized: true },
    { name: 'credit', label: 'Muallif / manba', type: 'text', localized: true },
  ],
}
