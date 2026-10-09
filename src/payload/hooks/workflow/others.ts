import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook, CollectionBeforeOperationHook, CollectionSlug } from 'payload'

import { hasRole, userRole } from '../../access/roles'
import { REL } from '../../fields/relations'
import { type Doc, forbidden, type Id, idOf, isolated, nowIso, wctx } from './shared'

/**
 * Workflow rules of the collections other than articles (CMS-SPEC §4.2
 * "Other collections"). Like the article rules they live in hooks, not in
 * update-access Where clauses, and they fail loudly.
 */

// ── requests: who decides ───────────────────────────────────────────────────
/** The decision is the editor-in-chief's; an editor decides an `error_report` only (§4.2, §3.15). */
const mayDecide = (role: string | undefined, kind: unknown) => role === 'eic' || (role === 'editor' && kind === 'error_report')

/**
 * Field access drops a forbidden decision silently (Requests.ts); this
 * refuses it loudly, comparing the raw incoming value with the stored one
 * (the admin form sends the unchanged value back).
 */
export const requestDecisionGuard: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if ((operation !== 'update' && operation !== 'create') || !req.user || wctx(req).workflowSync) return args
  const a = args as { id?: Id; data?: Doc }
  if (!a.data || !('decision' in a.data) || a.data.decision === undefined) return args
  const stored =
    operation === 'update' && a.id !== undefined
      ? ((await req.payload.findByID({ collection: REL.requests, id: a.id, depth: 0, overrideAccess: true, disableErrors: true, req: isolated(req) })) as Doc | null)
      : null
  if ((stored?.decision ?? null) === (a.data.decision ?? null)) return args
  const kind = a.data.kind ?? stored?.kind ?? 'error_report'
  if (!mayDecide(userRole(req), kind)) {
    throw forbidden('Raddiya, javob va olib tashlash boʻyicha qarorni faqat bosh muharrir qabul qiladi; muharrir faqat xato haqidagi xabar boʻyicha qaror qiladi.')
  }
  return args
}

/** A recorded decision stamps who made it and when; the retention clock of §13.1 starts there. */
export const stampRequestDecision: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const before = (originalDoc as Doc | undefined)?.decision ?? null
  const after = (data as Doc).decision ?? null
  if (after && after !== before) {
    data.decidedBy = req.user?.id ?? null
    data.decidedAt = nowIso()
    if (!['decided', 'closed'].includes(String((data as Doc).status ?? ''))) data.status = 'decided'
  }
  return data
}

// ── authors: own profile, commercial byline ────────────────────────────────
/** §4.2: a reporter updates their own profile only; commercial updates the commercial bylines only. */
export const authorOwnership: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !req.user || wctx(req).workflowSync || wctx(req).importing) return data
  const doc = (originalDoc ?? {}) as Doc
  if (hasRole(req, 'reporter') && String(idOf(doc.user)) !== String(req.user.id)) {
    throw forbidden('Muxbir faqat oʻz muallif profilini tahrirlaydi.')
  }
  if (hasRole(req, 'commercial') && !doc.commercial) throw forbidden('Tijorat boʻlimi faqat tijorat imzosini tahrirlaydi.')
  return data
}

// ── deleting what is still used ────────────────────────────────────────────
/** "+ delete unused" (§4.2): a byline or tag that any story carries is kept (switch it off instead). */
export const deleteUnusedOnly =
  (field: 'authors' | 'tags', message: string): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    if (wctx(req).importing) return
    const { totalDocs } = await req.payload.count({
      collection: REL.articles as CollectionSlug,
      where: { [field]: { in: [id] } },
      trash: true,
      overrideAccess: true,
      req: isolated(req),
    })
    if (totalDocs > 0) throw forbidden(message)
  }

// ── media: commercial uploads ───────────────────────────────────────────────
/**
 * An image uploaded or edited by the commercial desk is always
 * `sponsoredOnly`, so ART-15 keeps it out of editorial stories (§3.12). Only
 * the editor-in-chief may lift the mark from an image that carries it.
 */
export const forceSponsoredMedia: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!req.user) return data
  if (userRole(req) === 'commercial') return { ...data, sponsoredOnly: true }
  if ((originalDoc as Doc | undefined)?.sponsoredOnly === true && data.sponsoredOnly === false && !hasRole(req, 'eic')) {
    return { ...data, sponsoredOnly: true }
  }
  return data
}

