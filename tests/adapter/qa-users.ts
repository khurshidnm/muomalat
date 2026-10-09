/**
 * Staff accounts for looking at draft preview on a scratch database seeded
 * with tests/adapter/seed-cli.ts (development only):
 *
 *   DATABASE_URL=… npx tsx --env-file=.env tests/adapter/qa-users.ts
 */
import config from '@payload-config'
import { getPayload } from 'payload'

if (/\/muomalat(\?|$)/.test(process.env.DATABASE_URL ?? '')) throw new Error('Refusing to write to the dev database "muomalat".')

const payload = await getPayload({ config })
for (const role of ['editor', 'reporter'] as const) {
  const email = `qa-${role}@test.muomalat.local`
  const found = (await payload.find({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true })).docs[0]
  if (!found) await payload.create({ collection: 'users', data: { email, name: `QA ${role}`, role, active: true, password: `qa-password-${role}-0123456789` }, overrideAccess: true })
  console.log(email, `qa-password-${role}-0123456789`)
}
process.exit(0)
