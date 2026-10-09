import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import path from 'node:path'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { hasRole, isStaff, withEdge } from './payload/access/roles'
import { AdvertisingRequests } from './payload/collections/AdvertisingRequests'
import { Articles } from './payload/collections/Articles'
import { AuditLog } from './payload/collections/AuditLog'
import { Authors } from './payload/collections/Authors'
import { ClubApplications } from './payload/collections/ClubApplications'
import { ClubEvents } from './payload/collections/ClubEvents'
import { ContactMessages } from './payload/collections/ContactMessages'
import { DigestSubscribers } from './payload/collections/DigestSubscribers'
import { GlossaryTerms } from './payload/collections/GlossaryTerms'
import { Institutions } from './payload/collections/Institutions'
import { Media } from './payload/collections/Media'
import { Milestones } from './payload/collections/Milestones'
import { PublishEvents } from './payload/collections/PublishEvents'
import { redirects } from './payload/collections/Redirects'
import { Requests } from './payload/collections/Requests'
import { Rubrics } from './payload/collections/Rubrics'
import { Tags } from './payload/collections/Tags'
import { TelegramPosts } from './payload/collections/TelegramPosts'
import { Users } from './payload/collections/Users'
import { tashkentTimezone } from './payload/fields/dates'
import { AdSlots } from './payload/globals/AdSlots'
import { EditorialRules } from './payload/globals/EditorialRules'
import { HomePage } from './payload/globals/HomePage'
import { Navigation } from './payload/globals/Navigation'
import { SiteSettings } from './payload/globals/SiteSettings'
import { i18n } from './payload/i18n'
import { inlineEditor } from './payload/lexical/editors'
import { personalDataEndpoints } from './payload/personalData/endpoints'
import { startupGuard } from './payload/security/startupGuard'

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

/**
 * Outgoing mail (password reset; later the alert and form mails) over SMTP:
 * Mailpit at 127.0.0.1:1025 in development, the EU provider in production
 * (CMS-SPEC §2.5). Without SMTP_HOST no adapter is configured and Payload
 * only logs the messages: the nodemailer adapter would otherwise fall back to
 * a test account on ethereal.email and send the mail there.
 */
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpTransport = {
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  // STARTTLS is mandatory outside development; Mailpit speaks plain SMTP.
  requireTLS: process.env.SITE_ENV === 'production' || process.env.SITE_ENV === 'staging',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
}
type TransportOptions = NonNullable<Parameters<typeof nodemailerAdapter>[0]>['transportOptions']
const email = process.env.SMTP_HOST
  ? nodemailerAdapter({
      defaultFromAddress: process.env.MAIL_FROM || 'noreply@muomalat.uz',
      defaultFromName: 'Muomalat',
      // The adapter types these as connection options, which lack `auth`; it
      // passes them to nodemailer.createTransport, which takes `auth`.
      transportOptions: smtpTransport as TransportOptions,
    })
  : undefined

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
    // One zone: every date-time with `timezone: true` is shown and entered in
    // Tashkent time and the zone picker is read-only (CMS-SPEC §3.1).
    timezones: tashkentTimezone,
    // Gravatar would send a hash of every staff address to a third party, and the CMS CSP blocks it (§12.4).
    avatar: 'default',
    components: {
      // Overdue and open second reads of urgent stories (§5.4).
      beforeDashboard: ['/payload/admin/SecondReads#SecondReads'],
      // The red read-only banner (§12.10); renders nothing in normal operation.
      header: ['/payload/admin/ReadOnlyBanner#ReadOnlyBanner'],
    },
  },
  // Uzbek admin interface, Russian base for keys Payload adds later (§6.6).
  i18n,
  localization: {
    locales: [
      { code: 'uz', label: 'Oʻzbekcha (lotin)' },
      { code: 'ru', label: 'Русский' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'uz',
    // A missing translation stays empty; the content layer decides fallback (§6.1).
    fallback: false,
  },
  collections: [
    // Editorial content
    Articles,
    Authors,
    Rubrics,
    Tags,
    Media,
    // Reference
    GlossaryTerms,
    Institutions,
    Milestones,
    ClubEvents,
    // Newsroom and distribution
    Requests,
    TelegramPosts,
    // Personal data (§3.14)
    ClubApplications,
    DigestSubscribers,
    ContactMessages,
    AdvertisingRequests,
    // System
    Users,
    AuditLog,
    PublishEvents,
  ],
  globals: [HomePage, Navigation, AdSlots, SiteSettings, EditorialRules],
  // Admin-only export and erasure by e-mail for rights requests (§13.3).
  endpoints: personalDataEndpoints,
  plugins: [redirects],
  /**
   * Saved list views (articles `enableQueryPresets`, §4.2): every staff
   * member keeps their own; only editors and the editor-in-chief may share
   * one with others.
   */
  queryPresets: {
    access: {
      create: withEdge(isStaff),
      read: withEdge(isStaff),
      update: withEdge(isStaff),
      delete: withEdge(isStaff),
    },
    constraints: {},
    filterConstraints: ({ options, req }) =>
      hasRole(req, 'editor', 'eic') ? options : options.filter((o) => (typeof o === 'string' ? o : o.value) === 'onlyMe'),
    labels: { singular: 'Saqlangan koʻrinish', plural: 'Saqlangan koʻrinishlar' },
  },
  // Every rich-text field names its own editor (§3.4); a field that does not
  // gets the narrow inline one.
  editor: inlineEditor,
  email,
  typescript: { outputFile: path.resolve(root, 'src/payload-types.ts') },
  db: postgresAdapter({
    // The session time zone is UTC whatever the server's TZ: offset-less date
    // strings are read in the session zone, and the dev container runs
    // TZ=Asia/Tashkent (CMS-SPEC §3.1, §12.2).
    pool: { connectionString, options: '-c TimeZone=UTC' },
    push: false,
    migrationDir: path.resolve(root, 'src/migrations'),
  }),
  sharp,
  // Expected refusals are not server faults: no stack trace at error level. Keys are `error.name`, which for
  // our APIError subclasses is the class name; Payload's type lists only its own error names.
  loggingLevels: { ReadOnlyError: 'info', EdgeIdentityError: 'warn' } as Partial<Record<'APIError', 'info' | 'warn'>>,
  // Exits in SITE_ENV=production on any unsafe setting (CMS-SPEC §12.1).
  onInit: (payload) => startupGuard(payload),
})
