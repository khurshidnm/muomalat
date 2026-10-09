import type { Job } from '../index'
import { purgeExpired } from '../../payload/personalData/retention'

/**
 * Personal-data retention (CMS-SPEC §13.1): deletes or anonymises every
 * record past its `retainUntil` and writes one `pd.retention_purge` audit row
 * with the counts. Nightly; the purge is idempotent, so a restart that runs it
 * again early does no harm. The log line has counts only, never a value.
 */
export const job: Job = {
  name: 'retention',
  intervalMs: 24 * 60 * 60 * 1000,
  run: async (payload) => {
    const report = await purgeExpired(payload, new Date())
    const counts = Object.entries(report)
      .filter(([, c]) => c.deleted || c.anonymised || c.kept)
      .map(([collection, c]) => `${collection} -${c.deleted} ~${c.anonymised} =${c.kept}`)
    payload.logger.info({ msg: `retention: ${counts.join(', ') || 'nothing expired'}` })
  },
}
