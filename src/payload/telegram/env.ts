/**
 * Telegram settings from the environment (CMS-SPEC §2.5, §10.5, §10.8), read
 * on each call so tests and the worker see the current values.
 *
 * - `TELEGRAM_BOT_TOKEN`: the publishing bot. It comes only from the
 *   environment; no field in the database holds it, and it is never logged.
 * - `TELEGRAM_CHANNEL`: `@muomalatuz` in production; a private test channel
 *   (its `@name` or numeric `-100…` id) in staging and development.
 * - `TELEGRAM_API_BASE`: the Bot API origin, `https://api.telegram.org` unless
 *   set. Tests point it at a local mock server; nothing else should set it.
 *
 * Without a token every Telegram step is a logged no-op: the outbox creates
 * no posts and the worker jobs do nothing.
 */

/** The production channel (§10.8); the startup guard refuses any other in production. */
export const PRODUCTION_CHANNEL = '@muomalatuz'

/**
 * The production bot's numeric id: the digits before the colon in its token,
 * also `getMe().id`. It is public (every message the bot sends carries it);
 * the token never is. Outside production a token for this bot is refused
 * (§10.8). Fill it in once the production bot exists (docs/TELEGRAM.md);
 * while it is null that one check cannot run and the job says so at start.
 */
export const PRODUCTION_BOT_ID: number | null = null

export const DEFAULT_API_BASE = 'https://api.telegram.org'

export type TelegramEnv = {
  token: string
  channel: string
  apiBase: string
  siteEnv: string
}

export function telegramEnv(env: Record<string, string | undefined> = process.env): TelegramEnv {
  return {
    token: env.TELEGRAM_BOT_TOKEN?.trim() ?? '',
    channel: env.TELEGRAM_CHANNEL?.trim() ?? '',
    apiBase: (env.TELEGRAM_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/+$/, ''),
    siteEnv: env.SITE_ENV?.trim() || 'development',
  }
}

/** Both the token and the channel are set: the integration is on. */
export const telegramConfigured = (e: TelegramEnv = telegramEnv()) => Boolean(e.token && e.channel)

/** The bot id a token belongs to (`123456:AA…` → 123456), without contacting Telegram. */
export function botIdOf(token: string): number | undefined {
  const m = /^(\d{1,20}):[A-Za-z0-9_-]{20,}$/.exec(token.trim())
  if (!m) return undefined
  const id = Number(m[1])
  return Number.isSafeInteger(id) ? id : undefined
}

const sameChannel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Why the Telegram worker must refuse to start (§10.8, test I9). Each finding
 * names the setting, never its value when that value is a secret.
 *
 * - production: the channel is `@muomalatuz`, and the token is the production
 *   bot's when its id is known;
 * - everywhere else: neither the production channel nor the production bot.
 *   Staging and development use their own bot and a private test channel.
 */
export function telegramStartupFindings(e: TelegramEnv = telegramEnv(), productionBotId: number | null = PRODUCTION_BOT_ID): string[] {
  const findings: string[] = []
  if (!e.token && !e.channel) return findings
  if (e.token && !e.channel) findings.push('TELEGRAM_BOT_TOKEN is set without TELEGRAM_CHANNEL')
  if (e.channel && !e.token) findings.push('TELEGRAM_CHANNEL is set without TELEGRAM_BOT_TOKEN')
  const botId = e.token ? botIdOf(e.token) : undefined
  if (e.token && botId === undefined) findings.push('TELEGRAM_BOT_TOKEN is not a bot token (expected <digits>:<secret>)')
  if (e.siteEnv === 'production') {
    if (e.channel && !sameChannel(e.channel, PRODUCTION_CHANNEL)) findings.push(`TELEGRAM_CHANNEL is ${e.channel}, not ${PRODUCTION_CHANNEL}`)
    if (productionBotId !== null && botId !== undefined && botId !== productionBotId) {
      findings.push(`TELEGRAM_BOT_TOKEN belongs to bot ${botId}, not the production bot ${productionBotId}`)
    }
    if (e.apiBase !== DEFAULT_API_BASE) findings.push('TELEGRAM_API_BASE is set in production')
  } else {
    if (e.channel && sameChannel(e.channel, PRODUCTION_CHANNEL)) {
      findings.push(`TELEGRAM_CHANNEL is the production channel ${PRODUCTION_CHANNEL} outside production (SITE_ENV=${e.siteEnv})`)
    }
    if (productionBotId !== null && botId === productionBotId) {
      findings.push(`TELEGRAM_BOT_TOKEN is the production bot's token outside production (SITE_ENV=${e.siteEnv})`)
    }
  }
  return findings
}

/** Removes a bot token from any text before it is logged or stored (error messages, URLs). */
export function redact(text: string, token = telegramEnv().token): string {
  let out = text
  if (token) out = out.split(token).join('<token>')
  // Any other token-shaped string (a token passed explicitly, a URL path): /bot<digits>:<secret>
  return out.replace(/bot\d{3,20}:[A-Za-z0-9_-]{20,}/g, 'bot<token>').replace(/\b\d{3,20}:[A-Za-z0-9_-]{30,}\b/g, '<token>')
}
