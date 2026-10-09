/**
 * What the audit log may say about each collection and global (CMS-SPEC §9.1,
 * §13.1): field paths for every change; values only for settings, roles,
 * labels, corrections, workflow and sponsorship fields; nothing that
 * identifies the person behind a personal-data document.
 */

/**
 * Personal-data documents: the four form collections (§3.14) and the
 * requests register, whose requester name and contact are personal data
 * (§3.15). Rows carry field paths only: no title, no values (J5).
 */
export const PERSONAL_DATA_COLLECTIONS = new Set([
  'club-applications',
  'digest-subscribers',
  'contact-messages',
  'advertising-requests',
  'requests',
])

/** Collections the audit concern never hooks: the log itself, and the outbox the worker updates. */
export const UNAUDITED_COLLECTIONS = new Set(['audit-log', 'publish-events'])

/** Paths that change on every save or are bookkeeping; never listed. */
const IGNORED_PATHS = new Set(['id', 'createdAt', 'updatedAt', 'lastEditedBy', 'approvedContentHash', 'validationWarnings'])

/** Auth bookkeeping on users: written by Payload's auth operations, never through a user's edit. */
export const AUTH_INTERNAL_PATHS = new Set([
  'sessions',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'resetPasswordRequestedAt',
  'salt',
  'hash',
  'enableAPIKey',
  'apiKey',
  'apiKeyIndex',
  '_verified',
  '_verificationToken',
  'lastLoginAt',
  'lastLoginCountry',
  'knownCountries',
])

const top = (path: string) => path.split('.')[0]

export function isIgnoredPath(slug: string, path: string): boolean {
  const head = top(path)
  if (IGNORED_PATHS.has(head)) return true
  return slug === 'users' && AUTH_INTERNAL_PATHS.has(head)
}

/** Articles: workflow, legal, scheduling, corrections and sponsorship (the Art. 15 record). */
const ARTICLE_VALUE_PATHS = new Set([
  '_status',
  'workflowStatus',
  'assignee',
  'deskEditor',
  'submittedBy',
  'approvedBy',
  'publishedBy',
  'scheduledAt',
  'scheduledBy',
  'scheduleError',
  'firstPublishedAt',
  'publishedAt',
  'significantUpdateAt',
  'urgent',
  'priority',
  'needsLegal',
  'legalHold',
  'legalSignOff',
  'legallySensitive',
  'singleAnonymousSource',
  'withdrawal',
  'changeNote',
  'secondRead',
  'embargo',
  'corrections',
  'sponsored',
  'noindex',
  'deletedAt',
])

const USER_VALUE_PATHS = new Set(['role', 'active', 'offboardedAt'])

/** Globals are settings: their values are recorded. */
const SETTINGS = new Set(['site-settings', 'editorial-rules', 'navigation', 'ad-slots', 'home-page'])

/** Whether the before/after values of `path` may be stored. */
export function valuesAllowed(slug: string, path: string): boolean {
  if (PERSONAL_DATA_COLLECTIONS.has(slug)) return false
  if (SETTINGS.has(slug)) return true
  if (slug === 'users') return USER_VALUE_PATHS.has(top(path))
  if (slug === 'articles') return ARTICLE_VALUE_PATHS.has(top(path))
  // Other drafts collections: only the publication status.
  return path === '_status' || path === 'deletedAt'
}

/** Whether the document's title may be stored with the row. */
export const titleAllowed = (slug: string) => !PERSONAL_DATA_COLLECTIONS.has(slug)

/** A stored value larger than this is replaced by its size. */
export const MAX_VALUE_CHARS = 4000
