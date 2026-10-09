import { auditChange, auditDelete, auditPersonalRead, captureBefore, stashOperation } from '../audit/collections'
import { auditGlobalChange, captureGlobalBefore, stashGlobalOperation } from '../audit/globals'
import { PERSONAL_DATA_COLLECTIONS } from '../audit/policy'
import { auditFailedLogin, auditForgotPassword, auditLogin, auditLogout, authOperations, finishUnlock } from '../audit/users'
import { chainAuditRow, refuseAuditChanges } from '../../audit/writer'
import type { CollectionHooks, Concern, GlobalHooks } from '../index'

/**
 * Audit log entries (CMS-SPEC §9). Every audited collection and global gets
 * the same content hooks; users add the auth events, the personal-data
 * collections the read event. Alerts and the nightly export run in the worker
 * (src/worker/jobs/auditAlerts.ts, auditExport.ts) from committed rows.
 *
 * `audit-log` itself gets the hash chain: every inserted row is chained,
 * whether it comes from the audit writer or from another concern's direct
 * `payload.create`, and updates and deletes are refused.
 *
 * Not audited: the `publish-events` outbox (its rows are the worker's
 * bookkeeping; the publish they describe is audited on the document).
 *
 * The slugs are listed here rather than read from the configs: the
 * collection modules import this registry.
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
  'redirects',
  'club-applications',
  'digest-subscribers',
  'contact-messages',
  'advertising-requests',
  'users',
] as const

const GLOBALS = ['home-page', 'navigation', 'ad-slots', 'site-settings', 'editorial-rules'] as const

const content: CollectionHooks = {
  beforeOperation: [stashOperation],
  beforeChange: [captureBefore],
  afterChange: [auditChange],
  afterDelete: [auditDelete],
}

function collectionHooks(slug: string): CollectionHooks {
  if (slug === 'users') {
    return {
      ...content,
      beforeOperation: [stashOperation, authOperations],
      afterLogin: [auditLogin],
      afterLogout: [auditLogout],
      afterError: [auditFailedLogin],
      afterForgotPassword: [auditForgotPassword],
      afterOperation: [finishUnlock],
    }
  }
  if (PERSONAL_DATA_COLLECTIONS.has(slug)) return { ...content, afterOperation: [auditPersonalRead] }
  return content
}

const globalHooks: GlobalHooks = {
  beforeOperation: [stashGlobalOperation],
  beforeChange: [captureGlobalBefore],
  afterChange: [auditGlobalChange],
}

export const audit: Concern = {
  collections: {
    ...Object.fromEntries(COLLECTIONS.map((slug) => [slug, collectionHooks(slug)])),
    'audit-log': { beforeOperation: [refuseAuditChanges], beforeChange: [chainAuditRow] },
  },
  globals: Object.fromEntries(GLOBALS.map((slug) => [slug, globalHooks])),
}
