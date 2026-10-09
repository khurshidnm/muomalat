import type { CollectionHooks, Concern, GlobalHooks } from '../index'
import {
  edgeIdentityAtLogin,
  idempotentLogout,
  loginRateLimit,
  passwordPolicy,
  refreshGuard,
  refundSuccessfulLogin,
} from '../security/auth'
import { collectionDefaultLocale, globalDefaultLocale } from '../security/locale'
import { collectionReadOnlyGuard, forgetReadOnlyAfterChange, globalReadOnlyGuard, operationsOnlyWhileReadOnly } from '../security/readOnly'

/**
 * Edge identity (Cloudflare Access), read-only mode, login limits, password
 * policy and session hygiene (CMS-SPEC §12). The per-request Access check
 * itself is in `withEdge` (src/payload/access/roles.ts); these hooks cover
 * the paths no access function sees: login, refresh, password changes.
 *
 * Every collection and global gets the read-only guard, so a new one must be
 * added to the lists below. Before it, a request without a locale is given
 * the default one (../security/locale.ts).
 */
const COLLECTIONS = [
  'articles',
  'authors',
  'rubrics',
  'tags',
  'media',
  'glossary-terms',
  'institutions',
  'milestones',
  'club-events',
  'requests',
  'telegram-posts',
  'club-applications',
  'digest-subscribers',
  'contact-messages',
  'advertising-requests',
  'users',
  'audit-log',
  'publish-events',
  'redirects',
] as const

const GLOBALS = ['home-page', 'navigation', 'ad-slots', 'site-settings', 'editorial-rules'] as const

const collections: Record<string, CollectionHooks> = Object.fromEntries(
  COLLECTIONS.map((slug) => [slug, { beforeOperation: [collectionDefaultLocale, collectionReadOnlyGuard] }]),
)

collections.users = {
  // Read-only first: a refused write needs no rate-limit count or breach lookup.
  beforeOperation: [collectionDefaultLocale, collectionReadOnlyGuard, loginRateLimit, refreshGuard, passwordPolicy],
  beforeLogin: [edgeIdentityAtLogin],
  afterLogin: [refundSuccessfulLogin],
  afterError: [idempotentLogout],
}

const globals: Record<string, GlobalHooks> = Object.fromEntries(GLOBALS.map((slug) => [slug, { beforeOperation: [globalDefaultLocale, globalReadOnlyGuard] }]))

globals['site-settings'] = {
  beforeOperation: [globalDefaultLocale, globalReadOnlyGuard],
  beforeChange: [operationsOnlyWhileReadOnly],
  afterChange: [forgetReadOnlyAfterChange],
}

export const security: Concern = { collections, globals }
