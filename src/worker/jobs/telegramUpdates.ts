import { createBotClient } from '../../payload/telegram/client'
import { pollUpdates } from '../../payload/telegram/monitor'
import { telegramMayRun } from '../../payload/telegram/startup'
import type { Job } from '../index'

/**
 * Listening to the channel (CMS-SPEC §10.6): one long poll of getUpdates at a
 * time (25 s), with `allowed_updates` for channel posts, their edits,
 * `chat_member` and `my_chat_member`. Admin changes alert at once; manual
 * posts are recorded. No webhook: nothing public behind Cloudflare. After an
 * error the job waits before polling again, so an outage does not fill the log.
 */
const BACKOFF_MS = 15_000
const CONFLICT_BACKOFF_MS = 60_000
let pausedUntil = 0

export const job: Job = {
  name: 'telegram-updates',
  intervalMs: 1_000,
  run: async (payload) => {
    if (Date.now() < pausedUntil) return
    if (!(await telegramMayRun(payload))) return
    try {
      const result = await pollUpdates(payload, createBotClient())
      if (result.conflict) pausedUntil = Date.now() + CONFLICT_BACKOFF_MS
    } catch (error) {
      pausedUntil = Date.now() + BACKOFF_MS
      throw error
    }
  },
}
