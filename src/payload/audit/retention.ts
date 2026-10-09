import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { drizzleFor } from './writer'

/**
 * Retention of the audit log (CMS-SPEC §9.5): rows are kept five years and
 * IP addresses are cut to their network (/24, /48) after 90 days.
 *
 * The app role has no UPDATE on audit_log, by design (§9.1). Truncation runs
 * through one SECURITY DEFINER function owned by the schema owner,
 * `public.audit_truncate_ips(days integer)`, which can do nothing else: it
 * rewrites `ip` to `network(set_masklen(ip, 24|48))` on rows older than
 * max(days, 90). The hash chain covers the IP as that same network
 * (./hash.ts), so truncated rows still verify. Until a migration creates the
 * function, the job logs a warning and does nothing.
 *
 * Deleting rows after five years would need a second owner function; the
 * chain check already accepts a start of the log that moved past rows older
 * than five years (./chain.ts).
 */
export const IP_RETENTION_DAYS = 90

let warned = false

/** Truncate old addresses; returns the number of rows changed, or null when the function is missing. */
export async function truncateOldIps(payload: Payload, days = IP_RETENTION_DAYS): Promise<number | null> {
  const db = drizzleFor(payload, undefined)
  const found = await db.execute(sql`SELECT to_regprocedure('public.audit_truncate_ips(integer)') IS NOT NULL AS present`)
  if (!found.rows[0]?.present) {
    if (!warned) payload.logger.warn('audit retention: public.audit_truncate_ips(integer) is missing; IP addresses are not truncated yet')
    warned = true
    return null
  }
  const res = await db.execute(sql`SELECT public.audit_truncate_ips(${Math.max(days, IP_RETENTION_DAYS)}::integer) AS n`)
  return Number(res.rows[0]?.n ?? 0)
}
