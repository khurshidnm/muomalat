import type { FlattenedField } from 'payload'

import type { AuditEntry } from '../../audit/writer'
import { str } from './common'
import { normalize } from './diff'

/**
 * Article rows beyond the content row (CMS-SPEC §9.2 "Workflow",
 * "Scheduling"), derived from the saved data.
 *
 * Division of work with the workflow concern, which writes its own rows from
 * the transition it performs (src/payload/hooks/workflow/audit.ts):
 * `workflow.transition`, `workflow.approval_voided`, `workflow.urgent_publish`,
 * `article.withdraw`, `article.restore`, `correction.add`, `correction.amend`
 * and `schedule.run` are the workflow's. This module adds what no transition
 * records: legal hold and sign-off, and the schedule being set, moved,
 * cancelled or failing.
 *
 * A withdraw or restore save is recorded by the workflow's `article.withdraw`
 * / `article.restore` row alone, so the content row is not written for it
 * (one row per action, J1).
 */

type Doc = Record<string, unknown>

/** Withdraw (published → withdrawn) or restore (withdrawn → published): the workflow concern records the save. */
export function isWithdrawOrRestore(previous: Doc, doc: Doc): boolean {
  const from = previous.workflowStatus
  const to = doc.workflowStatus
  return (to === 'withdrawn' && from !== 'withdrawn') || (from === 'withdrawn' && to === 'published')
}

const fieldNamed = (fields: FlattenedField[], name: string) => fields.find((f) => 'name' in f && f.name === name)

/** Legal and scheduling rows for one article save, compared with the latest version before it. */
export function articleEvents(fields: FlattenedField[], previous: Doc, doc: Doc): AuditEntry[] {
  const out: AuditEntry[] = []
  const value = (name: string, from: Doc) => {
    const field = fieldNamed(fields, name)
    return field ? normalize(field, from[name]) : (from[name] ?? null)
  }

  // Scheduling (§5.11): set, moved or cleared; a failed run leaves scheduleError.
  if (doc.scheduledAt !== undefined) {
    const before = value('scheduledAt', previous)
    const after = value('scheduledAt', doc)
    if (before !== after) {
      out.push({
        action: after ? 'schedule.set' : 'schedule.cancel',
        summary: after ? `Nashr vaqti: ${String(after)}` : null,
        changedPaths: ['scheduledAt'],
        before: { scheduledAt: before },
        after: { scheduledAt: after },
      })
    }
  }
  if (doc.scheduleError !== undefined && !str(previous.scheduleError) && str(doc.scheduleError)) {
    out.push({ action: 'schedule.fail', summary: String(doc.scheduleError).slice(0, 300), changedPaths: ['scheduleError'] })
  }

  // Legal (§5.8): hold set or cleared; the editor-in-chief's sign-off.
  if (doc.legalHold !== undefined && Boolean(previous.legalHold) !== Boolean(doc.legalHold)) {
    out.push({
      action: doc.legalHold ? 'legal.hold_set' : 'legal.hold_cleared',
      changedPaths: ['legalHold'],
      before: { legalHold: Boolean(previous.legalHold) },
      after: { legalHold: Boolean(doc.legalHold) },
    })
  }
  if (doc.legalSignOff !== undefined) {
    const before = (value('legalSignOff', previous) ?? {}) as Doc
    const after = (value('legalSignOff', doc) ?? {}) as Doc
    if (after.by && after.by !== before.by) {
      out.push({ action: 'legal.signoff', changedPaths: ['legalSignOff'], after: { legalSignOff: after } })
    }
  }
  return out
}

/** What the publish row carries about the change (§5.6: "the hook copies changeNote into the audit event"). */
export function publishFacts(changeNoteSent: unknown, previous: Doc, doc: Doc, first: boolean) {
  const asDoc = (v: unknown): Doc => (v && typeof v === 'object' ? (v as Doc) : {})
  const note = asDoc(changeNoteSent ?? previous.changeNote ?? doc.changeNote)
  const kind = str(note.kind)
  const after: Doc = {}
  if (!first && (kind || note.reason)) after.changeNote = { kind, reason: str(note.reason) }
  return { kind, after }
}
