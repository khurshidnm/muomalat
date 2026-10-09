import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'

let instance: Promise<Payload> | undefined

/** One Payload instance per test file (each file runs in its own process). */
export const testPayload = () => (instance ??= getPayload({ config }))

/**
 * Create (or reuse) an active staff account for a role; returns the user doc.
 * Test files run in parallel against one database: when another file creates
 * the same address between the lookup and the create, that account is used.
 */
export async function staff(role: Role, tag: string = role) {
  const payload = await testPayload()
  const email = `${tag}@test.muomalat.local`
  const find = async () => (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })).docs[0]
  const found = await find()
  if (found) return found
  try {
    return await payload.create({
      collection: 'users',
      data: { email, name: `Test ${tag}`, role, active: true, password: `test-password-${tag}-0123456789` },
      overrideAccess: true,
    })
  } catch (error) {
    const raced = await find()
    if (raced) return raced
    throw error
  }
}
