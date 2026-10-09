import type { GlobalAfterChangeHook, GlobalBeforeChangeHook, GlobalBeforeOperationHook, SanitizedGlobalConfig } from 'payload'

import type { AuditAction } from '../../audit/actions'
import { recordAudit, type AuditEntry } from '../../audit/writer'
import { isolated, latestGlobalVersionId, localeOf } from './common'
import { diffDocs } from './diff'
import { operationFor, rememberDoc, rememberOperation, takeDoc } from './state'

/**
 * Globals (CMS-SPEC §9.2 "Globals"): one row per save, `global.publish` for a
 * publish of a drafts global, `global.update` otherwise; `doc.unpublish` when
 * a live global is taken down (the editor-in-chief's ad-slots veto) and
 * `doc.version_restore` for a restore. Global values are settings, so the row
 * keeps before/after values for every changed path.
 *
 * Version restore on a global runs no beforeChange hook (PHASE0 item 12) but
 * does run afterChange, with `isRestoringVersion` on the context, so it is
 * recorded here (test B16 expects the row).
 *
 * site-settings extras: `legal.meta.lastChangedAt` is stamped on any change
 * of the imprint (Media Law Art. 20: the registrar is told within a month),
 * and switching read-only mode writes `ops.read_only_on` / `ops.read_only_off`.
 */

type Doc = Record<string, unknown>
const scope = (slug: string) => `global:${slug}`
const hasDrafts = (config: SanitizedGlobalConfig) => Boolean(config.versions && typeof config.versions === 'object' && config.versions.drafts)

export const stashGlobalOperation: GlobalBeforeOperationHook = ({ args, global, operation, req }) => {
  if (operation !== 'update' && operation !== 'restoreVersion') return
  const a = args as { draft?: boolean; autosave?: boolean }
  rememberOperation(req, scope(global.slug), undefined, { operation, draft: Boolean(a.draft), autosave: Boolean(a.autosave) })
}

const isObj = (v: unknown): v is Doc => Boolean(v) && typeof v === 'object' && !Array.isArray(v)

export const captureGlobalBefore: GlobalBeforeChangeHook = async ({ data, global, originalDoc, req }) => {
  const slug = global.slug
  if (slug === 'site-settings' && isObj(data.legal)) {
    const legalField = global.flattenedFields.find((f) => 'name' in f && f.name === 'legal')
    if (legalField && 'flattenedFields' in legalField) {
      const before = isObj(originalDoc?.legal) ? originalDoc.legal : {}
      const changed = diffDocs(legalField.flattenedFields, before, data.legal, { slug, values: false }).paths.filter((p) => p !== 'meta' && !p.startsWith('meta.'))
      if (changed.length) data.legal = { ...data.legal, meta: { ...(isObj(data.legal.meta) ? data.legal.meta : {}), lastChangedAt: new Date().toISOString() } }
    }
  }
  if (!hasDrafts(global)) return data
  const op = operationFor(req, scope(slug))
  if (data._status !== 'published' && op?.draft) return data
  const live = (await req.payload.findGlobal({ slug, draft: false, depth: 0, overrideAccess: true, showHiddenFields: true, req: isolated(req) })) as unknown as Doc
  rememberDoc(req, scope(slug), 'main', { live, wasLive: live?._status === 'published' })
  return data
}

export const auditGlobalChange: GlobalAfterChangeHook = async ({ doc, global, previousDoc, req }) => {
  const slug = global.slug
  const op = operationFor(req, scope(slug))
  const state = takeDoc(req, scope(slug), 'main')
  if (op?.override?.skip) return doc
  const prev = (previousDoc ?? {}) as Doc
  const next = doc as Doc
  const drafts = hasDrafts(global)
  const restoring = Boolean((req.context as { isRestoringVersion?: boolean }).isRestoringVersion) && op?.operation === 'restoreVersion'

  let action: AuditAction = 'global.update'
  let base = prev
  if (restoring) action = 'doc.version_restore'
  else if (drafts && next._status === 'published') {
    action = 'global.publish'
    if (state.live) base = state.live
  } else if (drafts && state.wasLive && !op?.draft) {
    action = 'doc.unpublish'
    if (state.live) base = state.live
  }
  const diff = diffDocs(global.flattenedFields, base, next, { slug, localeAll: req.locale === 'all' })
  const entries: AuditEntry[] = [
    {
      action: op?.override?.action ?? action,
      summary:
        op?.override?.summary ??
        (restoring ? (next._status === 'draft' ? 'Versiya qoralama sifatida tiklandi' : 'Versiya tiklandi va kuchga kirdi') : null),
      changedPaths: diff.paths,
      before: diff.before,
      after: diff.after,
    },
  ]
  if (slug === 'site-settings') {
    const was = Boolean((base.operations as Doc | undefined)?.readOnly)
    const now = (next.operations as Doc | undefined)?.readOnly
    if (now !== undefined && Boolean(now) !== was) entries.push({ action: now ? 'ops.read_only_on' : 'ops.read_only_off', changedPaths: ['operations.readOnly'] })
  }
  const versionId = global.versions ? await latestGlobalVersionId(req, slug) : null
  for (const entry of entries) {
    await recordAudit(req, { collection: slug, docId: null, docTitle: typeof global.label === 'string' ? global.label : slug, locale: localeOf(req), versionId, ...entry })
  }
  return doc
}
