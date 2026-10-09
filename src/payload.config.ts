import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'node:path'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './payload/collections/Media'
import { Users } from './payload/collections/Users'

const root = process.cwd()
const cmsUrl = process.env.CMS_URL || 'http://cms.localhost:3000'

/**
 * The app connects as the data-only role (DATABASE_URL). Only the migration
 * scripts (`npm run db:migrate`, `db:migrate:create`) set DB_ROLE=owner and
 * connect as the schema owner (DATABASE_URL_MIGRATE). The app never changes
 * the schema itself (`push: false`), in development too.
 */
const connectionString =
  process.env.DB_ROLE === 'owner' ? process.env.DATABASE_URL_MIGRATE : process.env.DATABASE_URL

export default buildConfig({
  serverURL: cmsUrl,
  secret: process.env.PAYLOAD_SECRET || '',
  csrf: [cmsUrl],
  cors: [cmsUrl],
  graphQL: { disable: true },
  maxDepth: 4,
  defaultDepth: 1,
  telemetry: false,
  upload: { limits: { fileSize: 15_000_000 } },
  cookiePrefix: 'muomalat',
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' · Muomalat CMS', robots: 'noindex, nofollow' },
    importMap: { baseDir: path.resolve(root, 'src') },
    dateFormat: 'dd.MM.yyyy HH:mm',
  },
  // The admin interface has no Uzbek pack yet (CMS-SPEC §6.6); labels and
  // help text are written in Uzbek, Payload's own buttons are Russian/English.
  i18n: { supportedLanguages: { ru, en }, fallbackLanguage: 'ru' },
  localization: {
    locales: [
      { code: 'uz', label: 'Oʻzbekcha' },
      { code: 'ru', label: 'Русский' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'uz',
    fallback: false,
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  typescript: { outputFile: path.resolve(root, 'src/payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString },
    push: false,
    migrationDir: path.resolve(root, 'src/migrations'),
  }),
  sharp,
})
