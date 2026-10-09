import type { PayloadRequest } from 'payload'

import { REL } from '../../fields/relations'
import { checkArticleDoc } from './article'
import { articleGate } from './hooks'
import { validationError, type Doc, type Gate, type Id } from './shared'

/**
 * The validation concern's API for the other concerns and the endpoints
 * (CMS-SPEC §7). The concern's own hooks already enforce the rules on every
 * save (see ./hooks.ts), so the workflow's two-person hook and the transition
 * endpoint do not have to call these; they may, to check before they write.
 */
export { checkArticleDoc } from './article'
export { checkCollectionDoc } from './collections'
export { checkGlobalDoc, homeRules, labelRules, launchGate } from './globals'
export { applyFixes } from './fixes'
export { articleGate, storeChecks, ACK_KEY, FIX_KEY, type AckRequest, type FixRecord } from './hooks'
export type { Gate, StoredChecks, StoredFinding } from './shared'

/**
 * Throws the field-level ValidationError when an article in this state could
 * not pass `gate` ('publish' by default; 'approve' skips the embargo, 'submit'
 * checks only title, lead, rubric, authors and sources).
 */
export async function runPublishValidation(data: Doc, req: PayloadRequest, opts: { id?: Id; originalDoc?: Doc; gate?: Gate } = {}): Promise<void> {
  const fields = req.payload.collections[REL.articles].config.fields
  const gate = opts.gate ?? 'publish'
  const { findings, presence } = await checkArticleDoc({ req, id: opts.id, fields, data, originalDoc: opts.originalDoc, gate })
  const blocking = gate === 'submit' ? presence : findings.filter((f) => f.level === 'error')
  if (blocking.length) throw validationError(blocking, fields, req, { collection: REL.articles, id: opts.id })
}

export { articleGate as gateOf }
