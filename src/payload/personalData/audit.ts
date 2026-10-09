import type { Payload } from 'payload'

import { recordSystemAudit } from '../audit/writer'

/**
 * Audit rows for the personal-data actions that are not a hook on a record
 * (CMS-SPEC §9.2): `pd.export`, `pd.delete` (admin, by e-mail) and
 * `pd.retention_purge` (the worker). They go through the audit concern's one
 * chained writer, each in a transaction of its own after the work is done.
 * `pd.read` and the per-record `doc.*` rows are written by the audit concern's
 * hooks (src/payload/hooks/concerns/audit.ts).
 *
 * Audit-safe by construction: a row names collections, ids, the staff member
 * and counts, never a value from a record. `docTitle` stays empty and
 * `summary` carries counts only, so neither an e-mail nor a name reaches the log.
 */
export type PdAuditAction = 'pd.export' | 'pd.delete' | 'pd.retention_purge'

/** The staff member behind an admin action; the worker passes none. */
export type PdActor = { id: number | string; email?: string | null; role?: string | null }

export type PdAuditEntry = {
  action: PdAuditAction
  collection?: string
  docId?: number | string
  /** Counts and outcomes only, e.g. "club-applications 2, contact-messages 1". */
  summary?: string
  changedPaths?: string[]
  actor?: PdActor
}

export async function auditPd(payload: Payload, entry: PdAuditEntry): Promise<void> {
  const { actor, ...row } = entry
  await recordSystemAudit(
    payload,
    {
      ...row,
      docTitle: null,
      actor: actor ? { id: actor.id, email: actor.email ?? null, role: actor.role ?? null } : undefined,
    },
    actor ? undefined : 'system:retention',
  )
}
