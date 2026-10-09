import type { PayloadRequest } from 'payload'

import { type AuditAction, isAuditAction } from '../../audit/actions'
import { recordAudit as writeAudit } from '../../audit/writer'
import type { Id, WorkflowEvent } from './shared'

/**
 * The workflow's own audit rows (CMS-SPEC §9.2): `workflow.transition`,
 * `workflow.approval_voided`, `workflow.urgent_publish`, `article.withdraw`,
 * `article.restore`, `correction.add`, `correction.amend` and
 * `schedule.run`. The audit concern records everything else about the save
 * (content, publish with its change kind, legal hold and sign-off, schedule
 * set or failed). Rows are written in the save's transaction through the
 * audit writer, which adds the actor, the request snapshot and the hash chain.
 */
export async function recordWorkflowEvent(
  req: PayloadRequest,
  event: WorkflowEvent & { collection: string; docId?: Id; docTitle?: string | null; versionId?: Id },
): Promise<void> {
  if (!isAuditAction(event.action)) throw new Error(`workflow: unknown audit action ${event.action}`)
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : v === undefined ? null : { value: v })
  await writeAudit(req, {
    action: event.action as AuditAction,
    collection: event.collection,
    docId: event.docId ?? null,
    docTitle: event.docTitle ?? null,
    locale: event.locale ?? null,
    versionId: event.versionId ?? null,
    summary: event.summary ?? null,
    before: obj(event.before),
    after: obj(event.after),
  })
}
