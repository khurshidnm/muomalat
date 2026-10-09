import type { Payload, SanitizedConfig } from 'payload'

/**
 * Startup guard (CMS-SPEC §12.1, PHASE0-FINDINGS S62). In SITE_ENV=production
 * the process refuses to run with an unsafe setting: it logs every finding and
 * exits, so the container restarts and an operator sees why. Called from the
 * Payload `onInit` hook, which runs once per process in the app, the worker
 * and the scripts; `payload migrate` skips onInit.
 *
 * Outside production nothing is enforced: development runs with
 * ACCESS_JWT_REQUIRED=false and the mock content on purpose. Staging gets the
 * findings as warnings.
 */

/** The production channel (§10.8): startup refuses any other. */
export const PRODUCTION_TELEGRAM_CHANNEL = '@muomalatuz'
/** Owner role of the schema (docker/postgres/init); the app and worker must never connect as it. */
const OWNER_ROLE = 'muomalat_owner'
const MIN_SECRET_BYTES = 64

type Env = Record<string, string | undefined>

const dbUser = (url: string | undefined) => {
  if (!url) return undefined
  try {
    return decodeURIComponent(new URL(url).username) || undefined
  } catch {
    return undefined
  }
}

/** The configuration checks that need no database. Each finding names the setting. */
export function unsafeSettings(config: SanitizedConfig, env: Env = process.env): string[] {
  const findings: string[] = []

  if (Buffer.byteLength(env.PAYLOAD_SECRET ?? '', 'utf8') < MIN_SECRET_BYTES) {
    findings.push(`PAYLOAD_SECRET is shorter than ${MIN_SECRET_BYTES} bytes`)
  }

  if (env.ACCESS_JWT_REQUIRED !== 'true') findings.push('ACCESS_JWT_REQUIRED is not "true"')
  else if (!env.CF_ACCESS_TEAM_DOMAIN?.trim() || !env.CF_ACCESS_AUD?.trim()) {
    // Not unsafe, but every login would be refused: fail at startup instead.
    findings.push('ACCESS_JWT_REQUIRED=true but CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD is empty')
  }

  for (const collection of config.collections) {
    const auth = collection.auth
    if (!auth || auth.disableLocalStrategy === true) continue
    if (auth.cookies?.secure !== true) findings.push(`${collection.slug}: auth.cookies.secure is not true`)
    if (auth.cookies?.domain) findings.push(`${collection.slug}: auth.cookies.domain is set (the token cookie must stay host-only)`)
    if (auth.useAPIKey) findings.push(`${collection.slug}: auth.useAPIKey is on`)
  }

  if (config.graphQL?.disable !== true) {
    findings.push('GraphQL is enabled')
    if (config.graphQL?.disablePlaygroundInProduction === false) findings.push('the GraphQL playground is enabled')
  }

  if (config.cors === '*') findings.push("cors is '*'")
  if (Array.isArray(config.csrf) && config.csrf.length === 0) findings.push('the csrf allow-list is empty')

  const appUser = dbUser(env.DATABASE_URL)
  const ownerUser = dbUser(env.DATABASE_URL_MIGRATE) ?? OWNER_ROLE
  if (env.DB_ROLE === 'owner') findings.push('DB_ROLE=owner: the app must connect as the data-only role')
  if (!appUser) findings.push('DATABASE_URL has no user')
  else if (appUser === ownerUser || appUser === OWNER_ROLE) findings.push(`DATABASE_URL uses the owner role (${appUser})`)
  if (env.DATABASE_URL_MIGRATE) findings.push('DATABASE_URL_MIGRATE is set: the owner credentials belong to the migrate job only')

  const channel = env.TELEGRAM_CHANNEL?.trim()
  if (channel && channel !== PRODUCTION_TELEGRAM_CHANNEL) {
    findings.push(`TELEGRAM_CHANNEL is ${channel}, not ${PRODUCTION_TELEGRAM_CHANNEL}`)
  }
  if (env.TELEGRAM_BOT_TOKEN && !channel) findings.push('TELEGRAM_BOT_TOKEN is set without TELEGRAM_CHANNEL')

  if (env.CONTENT_SOURCE !== 'payload') findings.push(`CONTENT_SOURCE is ${env.CONTENT_SOURCE ?? 'unset'}, not payload`)

  // An idle admin tab would stay logged in for ever (§12.2).
  if (config.admin?.autoRefresh === true) findings.push('admin.autoRefresh is true')

  // Jobs would run in the app process, outside any request (§8.4).
  if (config.jobs?.autoRun) findings.push('jobs.autoRun is configured')

  return findings
}

/** Checks against the live connection: the app role must not own or be able to change the schema. */
export async function unsafeDatabase(payload: Payload): Promise<string[]> {
  const pool = (payload.db as unknown as { pool?: { query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
  if (!pool) return []
  const { rows } = await pool.query(
    `SELECT current_user AS role,
            (SELECT rolsuper OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname = current_user) AS privileged,
            has_schema_privilege(current_user, 'public', 'CREATE') AS can_create,
            (SELECT nspowner::regrole::text FROM pg_namespace WHERE nspname = 'public') = current_user AS owns_schema`,
  )
  const row = rows[0] ?? {}
  const findings: string[] = []
  if (row.privileged) findings.push(`database role ${row.role} is a superuser or may create roles or databases`)
  if (row.can_create || row.owns_schema) findings.push(`database role ${row.role} can change the schema (owner role?)`)
  return findings
}

type GuardOptions = { env?: Env; exit?: (code: number) => never | void }

/**
 * Run the guard. In production, any finding is fatal; on staging they are
 * logged as warnings; elsewhere the guard does nothing. `next build` is
 * skipped: it runs without the production secrets and serves nothing.
 */
export async function startupGuard(payload: Payload, { env = process.env, exit = (code) => process.exit(code) }: GuardOptions = {}) {
  const siteEnv = env.SITE_ENV
  if (siteEnv !== 'production' && siteEnv !== 'staging') return
  if (env.NEXT_PHASE === 'phase-production-build') return

  const findings = unsafeSettings(payload.config, env)
  if (siteEnv === 'production') {
    try {
      findings.push(...(await unsafeDatabase(payload)))
    } catch (err) {
      findings.push(`database role check failed: ${(err as Error).message}`)
    }
  }
  if (!findings.length) return

  if (siteEnv === 'staging') {
    for (const finding of findings) payload.logger.warn(`startup guard (staging, not enforced): ${finding}`)
    return
  }
  for (const finding of findings) payload.logger.fatal(`startup guard: ${finding}`)
  payload.logger.fatal(`startup guard: refusing to run with ${findings.length} unsafe setting(s) in production (CMS-SPEC §12.1)`)
  exit(1)
}
