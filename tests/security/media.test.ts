import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Uploads go to a throw-away folder, never to the development media folder.
const MEDIA_DIR = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/muomalat-test-security-media-${process.pid}`
  process.env.MEDIA_DIR = dir
  return dir
})

import { testPayload } from '../helpers/payload'
import { account, rest } from './rest'

/**
 * K4 (CMS-SPEC §3.12, PHASE0 §1.8) and the media half of A1: uploads accept
 * raster images only, every stored file is re-encoded without EXIF, XMP or
 * ICC data (on a plain upload, a focal-point-only edit and a crop), and an
 * anonymous visitor can fetch an image file but not the metadata.
 */
const XMP = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="41.3111N"><dc:creator><rdf:Seq><rdf:li>secret-photographer</rdf:li></rdf:Seq></dc:creator></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`
const EXIF = {
  IFD0: { Make: 'SpyCam', Model: 'GPS-1', Artist: 'secret-photographer' },
  IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 18/1 40/1', GPSLongitudeRef: 'E', GPSLongitude: '69/1 16/1 47/1' },
}

async function photo(width = 2000, height = 1500) {
  const base = await sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 90 } } }).jpeg({ quality: 90 }).toBuffer()
  return sharp(base).withExif(EXIF).withXmp(XMP).withIccProfile('p3').jpeg({ quality: 90 }).toBuffer()
}

async function inspect(file: Buffer) {
  const meta = await sharp(file).metadata()
  const raw = file.toString('latin1')
  return {
    format: meta.format,
    exif: Boolean(meta.exif),
    xmp: Boolean(meta.xmp),
    icc: Boolean(meta.icc),
    leaks: ['SpyCam', 'secret-photographer', '41.3111'].filter((s) => raw.includes(s)),
  }
}

beforeAll(async () => {
  await fs.mkdir(MEDIA_DIR, { recursive: true })
})
afterAll(async () => {
  await (await testPayload()).destroy()
  await fs.rm(MEDIA_DIR, { recursive: true, force: true })
})

type Upload = { name: string; mimetype: string; data: Buffer; query?: Record<string, unknown> }
async function upload({ name, mimetype, data, query }: Upload) {
  const payload = await testPayload()
  const reporter = await account('reporter', 'media-reporter')
  return payload.create({
    collection: 'media',
    data: { alt: name } as never,
    file: { data, mimetype, name, size: data.length },
    user: reporter,
    overrideAccess: false,
    ...(query ? { req: { query } as never } : {}),
  })
}

describe('K4: uploads', () => {
  it('rejects SVG, XML and a JPEG renamed .svg', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    await expect(upload({ name: 'x.svg', mimetype: 'image/svg+xml', data: svg })).rejects.toBeTruthy()
    await expect(upload({ name: 'x.xml', mimetype: 'application/xml', data: Buffer.from('<?xml version="1.0"?><a/>') })).rejects.toBeTruthy()
    // A JPEG renamed .svg is recognised by its content: Payload stores it as a
    // re-encoded WebP, never under an .svg name or type, and without metadata.
    const renamed = await upload({ name: 'photo.svg', mimetype: 'image/svg+xml', data: await photo(400, 300) }).catch((e: unknown) => e)
    if (!(renamed instanceof Error)) {
      const doc = renamed as { filename: string; mimeType: string }
      expect(doc.filename).toMatch(/\.webp$/)
      expect(doc.mimeType).toBe('image/webp')
      expect(await inspect(await fs.readFile(path.join(MEDIA_DIR, doc.filename)))).toEqual({ format: 'webp', exif: false, xmp: false, icc: false, leaks: [] })
    }
  })

  const cases: [string, Record<string, unknown> | undefined][] = [
    ['a plain upload', undefined],
    ['a focal point set before the first save (crop with unchanged size)', { uploadEdits: { crop: { x: 0, y: 0, width: 100, height: 100, unit: '%' }, focalPoint: { x: 30, y: 40 }, widthInPixels: 2000, heightInPixels: 1500 } }],
    ['a crop', { uploadEdits: { crop: { x: 10, y: 10, width: 50, height: 50, unit: '%' }, widthInPixels: 1000, heightInPixels: 750 } }],
  ]
  for (const [name, query] of cases) {
    it(`stores no EXIF, XMP or ICC data in any file after ${name}`, async () => {
      const input = await photo()
      expect(await inspect(input)).toMatchObject({ exif: true, xmp: true, icc: true })
      const doc = await upload({ name: `gps-${Date.now()}.jpg`, mimetype: 'image/jpeg', data: input, query })
      const files: [string, string | null | undefined, string | null | undefined][] = [['original', doc.filename, doc.mimeType]]
      for (const [size, s] of Object.entries((doc.sizes ?? {}) as Record<string, { filename?: string | null; mimeType?: string | null }>)) {
        if (s?.filename) files.push([size, s.filename, s.mimeType])
      }
      expect(files.length).toBeGreaterThan(1)
      for (const [label, filename, mimeType] of files) {
        const stored = await inspect(await fs.readFile(path.join(MEDIA_DIR, filename!)))
        expect([label, stored]).toEqual([label, { format: expect.any(String), exif: false, xmp: false, icc: false, leaks: [] }])
        // Link previews need JPEG, so the og size is the one exception to WebP (src/payload/collections/Media.ts).
        expect([label, mimeType]).toEqual([label, label === 'og' ? 'image/jpeg' : 'image/webp'])
      }
    })
  }
})

describe('A1: media over anonymous REST', () => {
  it('serves the image file but not the metadata', async () => {
    const doc = await upload({ name: `public-${Date.now()}.jpg`, mimetype: 'image/jpeg', data: await photo(800, 600) })
    const file = await rest('GET', `/api/media/file/${doc.filename}`, { origin: null })
    expect(file.status).toBe(200)
    expect(file.headers.get('content-type')).toBe('image/webp')
    expect((await rest('GET', `/api/media/${doc.id}`, { origin: null })).status).toBe(403)
    expect((await rest('GET', '/api/media', { origin: null })).status).toBe(403)
    expect((await rest('GET', '/api/media/file/not-uploaded.webp', { origin: null })).status).toBeGreaterThanOrEqual(400)
  })
})
