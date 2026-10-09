/**
 * The audit log's public API (CMS-SPEC §9), for every concern, job and script.
 *
 * - `recordAudit(req, entry, { independent? })`: write one row as part of a
 *   request (in its transaction unless `independent`). Actor, role, IP,
 *   country, user agent and request id come from `req`.
 * - `recordSystemAudit(payload, entry, actor?)`: a row from the worker or a
 *   script (`system:worker` by default).
 * - A direct `payload.create({ collection: 'audit-log' })` is chained too,
 *   but the writer fills the request snapshot consistently; prefer it.
 * - `context: { audit: { action?, summary?, skip? } }` on a Local API call
 *   renames or suppresses the content row of that one operation.
 * - `sendOperationalAlert(payload, subject, text)`: an alert that is not an
 *   audit row (the worker's own failures).
 */
export { ACTION_LABELS, AUDIT_ACTIONS, isAuditAction, type AuditAction } from './actions'
export { deliverAlerts, sendOperationalAlert, type Alert, type AlertTransport } from './alerts'
export { checkChain, verifyChain } from './chain'
export { recordAudit, recordSystemAudit, type AuditEntry, type AuditWriteOptions } from './writer'
