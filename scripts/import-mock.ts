/**
 * Import the mock content (src/content/data) into Payload (CMS-SPEC §11).
 *
 *   npm run seed:dev                         everything, translations approved (development)
 *   tsx --env-file=.env scripts/import-mock.ts --only=rubrics,tags,glossary,institutions --translations=unapproved
 *
 * Options:
 *   --all                         every step: media, rubrics, tags, authors, glossary, articles,
 *                                 institutions, milestones, club, globals
 *   --only=<step,step…>           selected steps (ids an earlier run imported are reused)
 *   --translations=approved       ru/en go live as on the mock site (default outside production)
 *   --translations=unapproved     ru/en go in as «in_edit» for a person to approve (required in production)
 *   --skip-validate               skip the preflight (`npm run validate` on the mock data)
 *
 * Idempotent: a re-run updates what an earlier run imported (by legacyId or
 * slug, media by filename) and never duplicates (M2). With SITE_ENV=production
 * it refuses everything but the vocabulary (rubrics, tags, glossary terms and
 * institutions, the last two with needsReview and left drafts) before writing
 * anything (M1). Never point it at the development database from a test.
 */
import { parseArgs } from 'node:util'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { checkOptions, ImportRefused, preflight, runImport, type Scope, SCOPES } from '../src/payload/import'

const { values } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    only: { type: 'string' },
    translations: { type: 'string' },
    'skip-validate': { type: 'boolean', default: false },
  },
})

const siteEnv = process.env.SITE_ENV
const usage = () => {
  console.error('Usage: tsx --env-file=.env scripts/import-mock.ts (--all | --only=<steps>) [--translations=approved|unapproved] [--skip-validate]')
  console.error(`Steps: ${SCOPES.join(', ')}`)
  process.exit(1)
}

if (values.all === Boolean(values.only)) usage()
const scopes = (values.all ? [...SCOPES] : values.only!.split(',').map((s) => s.trim()).filter(Boolean)) as Scope[]
const unknown = scopes.filter((s) => !SCOPES.includes(s))
if (unknown.length) {
  console.error(`Unknown step: ${unknown.join(', ')}`)
  usage()
}
const translations = values.translations ?? (siteEnv === 'production' ? 'unapproved' : 'approved')
if (translations !== 'approved' && translations !== 'unapproved') usage()

const options = { scopes, translations: translations as 'approved' | 'unapproved', siteEnv }
try {
  checkOptions(options)
} catch (error) {
  if (error instanceof ImportRefused) {
    console.error(`Refused: ${error.message}`)
    process.exit(1)
  }
  throw error
}

if (!values['skip-validate']) {
  const check = preflight()
  if (!check.ok) {
    console.error('Preflight failed: `npm run validate` reports errors on the mock data. Fix them first.\n')
    console.error(check.output)
    process.exit(1)
  }
  console.log(`Preflight: ${check.output.split('\n').at(-1)}`)
}

const db = (process.env.DATABASE_URL ?? '').replace(/:\/\/[^@]*@/, '://…@')
console.log(`Importing ${scopes.join(', ')} into ${db} (SITE_ENV=${siteEnv ?? 'unset'}, translations ${translations})`)

const payload = await getPayload({ config })
let failed = false
try {
  const started = Date.now()
  const report = await runImport(payload, {
    ...options,
    log: { info: (line) => console.log(`  ${line}`), warn: (line) => console.warn(`  ! ${line}`) },
  })
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s${report.warnings.length ? `, ${report.warnings.length} warnings` : ''}.`)
  console.log('Invalidations are queued in publish-events: the worker (npm run worker) delivers them to a running site.')
} catch (error) {
  failed = true
  console.error(error)
} finally {
  await payload.destroy()
}
process.exit(failed ? 1 : 0)
