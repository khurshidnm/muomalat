import { loadEnvFile } from 'node:process'
import path from 'node:path'

// .env supplies secrets and hosts; a test's own DATABASE_URL (from
// scripts/test-db.sh) wins. Refuse to run against the dev database.
const own = process.env.DATABASE_URL
try {
  loadEnvFile('.env')
} catch {}
if (own) process.env.DATABASE_URL = own
if (/\/muomalat(\?|$)/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('Tests must not run against the dev database "muomalat". Use scripts/test-db.sh.')
}
process.env.SITE_ENV = 'test'
// Uploads made by tests stay out of the dev media folder the running app serves.
process.env.MEDIA_DIR = path.resolve('.data/test-media')
