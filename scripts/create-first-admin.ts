/**
 * Create a CMS account through the Local API (CMS-SPEC §12.1). The admin's
 * "create first user" screen and /api/users/first-register are closed on every
 * host, so this script is how the first administrator is made — before the
 * app is reachable by anyone.
 *
 *   npm run admin:create -- --email you@muomalat.uz --name "Ism Familiya" [--role admin] [--additional]
 *
 * Prints a random password once. Without --additional it refuses to run when
 * any account exists, so it cannot be used to slip in a second admin.
 */
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { ROLES, type Role } from '../src/payload/access/roles'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', default: 'admin' },
    additional: { type: 'boolean', default: false },
  },
})

const email = values.email?.trim().toLowerCase()
const name = values.name?.trim()
const role = values.role as Role
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
  console.error('Usage: npm run admin:create -- --email you@example.uz --name "Ism Familiya" [--role admin] [--additional]')
  process.exit(1)
}
if (!ROLES.includes(role)) {
  console.error(`--role must be one of: ${ROLES.join(', ')}`)
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
  if (totalDocs > 0 && !values.additional) {
    console.error(`${totalDocs} account(s) already exist. Create further accounts in the admin, or pass --additional.`)
    process.exit(1)
  }

  // 24 characters from an unambiguous alphabet; meets the 15-character minimum.
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const password = Array.from(randomBytes(24), (b) => alphabet[b % alphabet.length]).join('')

  const user = await payload.create({
    collection: 'users',
    data: { email, name, role, active: true, password },
    overrideAccess: true,
    // A trusted in-process caller: the audit row names this script, not a public visitor (§9.1).
    context: { trustedInternal: true, auditActor: 'system:admin-create' },
  })
  console.log(`Created ${role} account ${user.email} (id ${user.id}).`)
  console.log(`Password (shown once, store it in a password manager): ${password}`)
} finally {
  await payload.destroy()
}
process.exit(0)
