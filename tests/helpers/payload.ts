import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'

let instance: Promise<Payload> | undefined

/** One Payload instance per test file (each file runs in its own process). */
export const testPayload = () => (instance ??= getPayload({ config }))

/** Create (or reuse) an active staff account for a role; returns the user doc. */
export async function staff(role: Role, tag = role) {
  const payload = await testPayload()
  const email = `${tag}@test.muomalat.local`
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) return found.docs[0]
  return payload.create({
    collection: 'users',
    data: { email, name: `Test ${tag}`, role, active: true, password: `test-password-${tag}-0123456789` },
    overrideAccess: true,
  })
}
