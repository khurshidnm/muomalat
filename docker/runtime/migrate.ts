/**
 * The one-shot migrate job of the production image (CMS-SPEC §15):
 *
 *   muomalat migrate           apply pending migrations, then re-apply the grants
 *   muomalat migrate status    list applied and pending migrations; changes nothing
 *
 * It runs as the schema owner (DB_ROLE=owner, DATABASE_URL_MIGRATE) before the
 * app and the worker start; they connect as the data-only role and never
 * change the schema. The migrations are compiled into this bundle from
 * src/migrations/index.ts (the image has no TypeScript sources), the same list
 * `npm run db:migrate` reads from disk in development.
 *
 * Grants. Tables the owner creates get the app role's grants from the
 * default privileges set when the database was made (docker/postgres/init).
 * This job repairs what those cannot cover (a table or sequence created by
 * another role, a database restored without its privileges) and re-asserts
 * the append-only rules of migration 20261009_061826_core_schema. It only
 * ever adds grants where the app role has none, so a later migration that
 * narrows a table on purpose is never undone.
 */
import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'

import { migrations } from '../../src/migrations'

const APP_ROLE = 'muomalat_app'
const command = process.argv[2] ?? 'up'

if (command !== 'up' && command !== 'status') {
  console.error('Usage: muomalat migrate [status]')
  process.exit(2)
}
if (process.env.DB_ROLE !== 'owner' || !process.env.DATABASE_URL_MIGRATE) {
  console.error('migrate: needs DB_ROLE=owner and DATABASE_URL_MIGRATE (the owner role); the app role cannot change the schema.')
  process.exit(2)
}

type Pool = { query: (text: string) => Promise<{ rows: Record<string, unknown>[] }> }

const GRANTS = `
DO $$
DECLARE r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
    RAISE NOTICE 'role ${APP_ROLE} does not exist; grants skipped';
    RETURN;
  END IF;
  GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
  FOR r IN SELECT c.oid::regclass AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             -- CASE: the privilege function must only ever see a relation of its kind.
             AND CASE WHEN c.relkind IN ('r', 'p') THEN NOT has_table_privilege('${APP_ROLE}', c.oid, 'SELECT, INSERT, UPDATE, DELETE') ELSE false END LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO ${APP_ROLE}', r.name);
  END LOOP;
  FOR r IN SELECT c.oid::regclass AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND CASE WHEN c.relkind = 'S' THEN NOT has_sequence_privilege('${APP_ROLE}', c.oid, 'USAGE, SELECT') ELSE false END LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO ${APP_ROLE}', r.name);
  END LOOP;
  -- Append-only audit log and outbox (CMS-SPEC §9.1, §8.4).
  FOR r IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'public' AND (tablename = 'audit_log' OR left(tablename, 10) = 'audit_log_') LOOP
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON public.%I FROM ${APP_ROLE}', r.tablename);
  END LOOP;
  IF to_regclass('public.publish_events') IS NOT NULL THEN
    REVOKE DELETE, TRUNCATE ON public.publish_events FROM ${APP_ROLE};
  END IF;
END
$$;`

/** Objects in the public schema the owner does not own: grants on them may fail, and they escape the default privileges. */
const FOREIGN_OWNERS = `
SELECT c.relname AS name, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S', 'v', 'm') AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = current_user)
ORDER BY 1`

async function applied(pool: Pool): Promise<Set<string>> {
  const exists = await pool.query(`SELECT to_regclass('public.payload_migrations') IS NOT NULL AS ok`)
  if (!exists.rows[0]?.ok) return new Set()
  const { rows } = await pool.query(`SELECT name FROM payload_migrations WHERE batch > 0`)
  return new Set(rows.map((r) => String(r.name)))
}

process.env.PAYLOAD_MIGRATING = 'true'
// Payload refuses to start without a secret, but this job signs nothing: it
// gets a throwaway one, and the real PAYLOAD_SECRET stays with the app and
// the worker. Set before the config is loaded, which reads it.
process.env.PAYLOAD_SECRET ||= randomBytes(48).toString('base64')
const { default: config } = await import('../../src/payload.config')
// onInit (the startup guard) is for the long-running processes; this job is meant to hold the owner role.
const payload = await getPayload({ config, disableOnInit: true })
const pool = (payload.db as unknown as { pool: Pool }).pool
let failed = false
try {
  const who = await pool.query(`SELECT current_user AS role, current_database() AS db`)
  console.log(`migrate: connected to ${who.rows[0]?.db} as ${who.rows[0]?.role}`)

  if (command === 'up') {
    await payload.db.migrate({ migrations: migrations as never })
    await pool.query(GRANTS)
    console.log(`migrate: grants for ${APP_ROLE} checked`)
  }

  const done = await applied(pool)
  const pending = migrations.filter((m) => !done.has(m.name))
  for (const m of migrations) console.log(`  ${done.has(m.name) ? 'applied' : 'PENDING'}  ${m.name}`)
  const unknown = [...done].filter((name) => !migrations.some((m) => m.name === name))
  for (const name of unknown) console.log(`  in the database but not in this image: ${name} (an image older than the database?)`)

  const foreign = (await pool.query(FOREIGN_OWNERS)).rows
  for (const row of foreign) console.warn(`migrate: warning: ${row.name} is owned by ${row.owner}, not the owner role`)

  if (command === 'status') console.log(`migrate: ${pending.length} pending`)
  else if (pending.length) {
    console.error(`migrate: ${pending.length} migration(s) still pending after the run`)
    failed = true
  } else console.log('migrate: database is up to date')
} catch (error) {
  console.error('migrate: failed', error)
  failed = true
} finally {
  await payload.destroy()
}
process.exit(failed ? 1 : 0)
