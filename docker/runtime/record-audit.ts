/**
 * Records the result of a backup run in the audit log (CMS-SPEC §12.7):
 *
 *   muomalat record-backup ok   "<summary>"
 *   muomalat record-backup fail "<summary>"
 *
 * docker/backup/backup.sh calls it after each run. `ops.backup_ok` is what the
 * worker's audit-alerts job looks for by 06:00 (BACKUP_EXPECTED=true); a
 * missing one becomes `ops.backup_fail`, which alerts the staff group. A
 * failed run writes `ops.backup_fail` at once. The row goes through the
 * audit writer, so it joins the hash chain like every other row. pg_dump
 * uses the read-only backup role, which cannot insert; this one connection
 * uses the data role of the app (DATABASE_URL).
 */
import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'

import { recordSystemAudit } from '../../src/payload/audit/writer'

const [outcome, summary = ''] = process.argv.slice(2)
if (outcome !== 'ok' && outcome !== 'fail') {
  console.error('Usage: muomalat record-backup ok|fail "<summary>"')
  process.exit(2)
}

// The audit chain does not use the secret, and this writer signs nothing: a
// throwaway one keeps PAYLOAD_SECRET out of the backup container. Set before
// the config is loaded, which reads it.
process.env.PAYLOAD_SECRET ||= randomBytes(48).toString('base64')
const { default: config } = await import('../../src/payload.config')
// A short-lived writer, not a server: the startup guard (onInit) is for the app and the worker.
const payload = await getPayload({ config, disableOnInit: true })
let failed = false
try {
  await recordSystemAudit(payload, { action: outcome === 'ok' ? 'ops.backup_ok' : 'ops.backup_fail', summary: summary.slice(0, 500) }, 'system:backup')
  console.log(`audit: ops.backup_${outcome} recorded`)
} catch (error) {
  console.error('audit: could not record the backup result', error)
  failed = true
} finally {
  await payload.destroy()
}
process.exit(failed ? 1 : 0)
