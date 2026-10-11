import { createBotClient } from '../../payload/telegram/client'
import { runChannelChecks } from '../../payload/telegram/monitor'
import { processDuePosts } from '../../payload/telegram/sender'
import { telegramMayRun } from '../../payload/telegram/startup'
import type { Job } from '../index'

/**
 * Telegram posting (CMS-SPEC §10.3–10.5): every 5 s, the approved posts whose
 * delay is over, approved caption edits and retractions go out
 * (src/payload/telegram/sender.ts). At start and every hour: getMe, getChat,
 * the bot's rights against the allow-list, and the channel's admin list
 * against the stored snapshot (src/payload/telegram/monitor.ts). Without
 * TELEGRAM_BOT_TOKEN it does nothing; with an unsafe setting it refuses to
 * start (src/payload/telegram/startup.ts, §10.8).
 */
const HOUR = 60 * 60 * 1000
const RETRY_CHECK_MS = 5 * 60 * 1000
let nextCheck = 0

export const job: Job = {
  name: 'telegram',
  intervalMs: 5_000,
  run: async (payload) => {
    if (!(await telegramMayRun(payload))) return
    const client = createBotClient()
    if (Date.now() >= nextCheck) {
      nextCheck = Date.now() + HOUR
      try {
        const check = await runChannelChecks(payload, client)
        payload.logger.info(`telegram: hourly check: @${check.botUsername ?? '?'} in ${check.chatId}; rights ${check.rights.ok ? 'ok' : 'NOT ok'}`)
      } catch (error) {
        nextCheck = Date.now() + RETRY_CHECK_MS
        payload.logger.error({ err: error, msg: 'telegram: hourly check failed; trying again in 5 minutes' })
      }
    }
    const result = await processDuePosts(payload, { client })
    const done = result.sent.length + result.edited.length + result.retracted.length + result.failed.length
    if (done) {
      payload.logger.info(
        `telegram: ${result.sent.length} sent, ${result.edited.length} edited, ${result.retracted.length} retracted, ${result.failed.length} failed` +
          (result.paused ? ` (paused: ${result.paused})` : ''),
      )
    }
  },
}
