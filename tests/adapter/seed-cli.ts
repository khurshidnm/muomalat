/**
 * Seeds a scratch database with the adapter tests' slice of the mock corpus,
 * to look at the site in payload mode:
 *
 *   DATABASE_URL=$(scripts/test-db.sh adapterqa | cut -d= -f2-) \
 *     npx tsx --env-file=.env tests/adapter/seed-cli.ts [all]
 *
 * `all` seeds every mock story instead of the slice. Never against the dev
 * database: the full importer (scripts/import-mock.ts) is for that.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { ALL_ARTICLES, seedMock, SEED_ARTICLES } from './seed'

if (/\/muomalat(\?|$)/.test(process.env.DATABASE_URL ?? '')) throw new Error('Refusing to seed the dev database "muomalat".')

const payload = await getPayload({ config })
const t0 = Date.now()
const seeded = await seedMock(payload, process.argv[2] === 'all' ? ALL_ARTICLES.map((a) => a.id) : SEED_ARTICLES)
console.log(
  'seeded',
  Object.fromEntries(Object.entries(seeded).map(([k, v]) => [k, (v as Map<string, unknown>).size])),
  `${Date.now() - t0} ms`,
)
process.exit(0)
