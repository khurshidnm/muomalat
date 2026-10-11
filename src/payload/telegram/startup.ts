import type { Payload } from 'payload'

import { sendOperationalAlert } from '../audit/alerts'
import { PRODUCTION_BOT_ID, telegramConfigured, telegramEnv, telegramStartupFindings } from './env'

/**
 * Whether the Telegram worker jobs may run in this process (CMS-SPEC §10.8,
 * test I9). Decided once per process:
 * - no token or no channel: a logged no-op;
 * - a finding of `telegramStartupFindings` (the production channel or bot
 *   outside production, another channel in production, …): the jobs refuse
 *   to start, log it as fatal and send one operational alert. The rest of
 *   the worker (scheduler, outbox, alerts) keeps running; posting is the
 *   only thing that cannot happen.
 */
let decided: { run: boolean } | undefined

export async function telegramMayRun(payload: Payload): Promise<boolean> {
  if (decided) return decided.run
  const env = telegramEnv()
  if (!telegramConfigured(env)) {
    const findings = telegramStartupFindings(env)
    payload.logger.info(`telegram: not configured (TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL); posting is manual${findings.length ? `: ${findings.join('; ')}` : ''}`)
    decided = { run: false }
    return false
  }
  const findings = telegramStartupFindings(env)
  if (findings.length) {
    for (const f of findings) payload.logger.fatal(`telegram: refusing to start: ${f}`)
    decided = { run: false }
    await sendOperationalAlert(payload, 'Telegram boti ishga tushirilmadi', `Sozlamalar xavfsiz emas, bot hech narsa yubormaydi: ${findings.join('; ')}.`)
    return false
  }
  if (PRODUCTION_BOT_ID === null) {
    payload.logger.warn('telegram: PRODUCTION_BOT_ID is not set (src/payload/telegram/env.ts): the check that keeps the production bot out of staging cannot run')
  }
  payload.logger.info(`telegram: posting to ${env.channel} (SITE_ENV=${env.siteEnv})`)
  decided = { run: true }
  return true
}

/** Tests: decide again on the next call. */
export function resetTelegramStartup() {
  decided = undefined
}
