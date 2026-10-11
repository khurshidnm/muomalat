import { sql } from '@payloadcms/db-postgres'
import { commitTransaction, createLocalReq, getPayload, initTransaction, killTransaction, type Payload } from 'payload'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'
import { drizzleFor } from '@/payload/audit/writer'

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

/** pg_advisory_xact_lock key for the shared list of official source domains: "doms" in ASCII. */
const OFFICIAL_DOMAINS_LOCK = 0x646f6d73

/**
 * Adds official source domains (the urgent fast path's list in the
 * editorial-rules global), never removing one. Test files run in parallel and
 * share the global: a plain read, merge and write lets two files overwrite
 * each other's additions, and the urgent publish of the file that lost its
 * domain is then refused. So the read and the write run in one transaction
 * under an advisory lock that every caller takes. With `user`, the change is
 * made (and audited) as that staff member.
 */
export async function addOfficialDomains(domains: string[], user?: { id: number | string }): Promise<void> {
  const payload = await testPayload()
  const req = await createLocalReq(user ? { user: { ...user, collection: 'users' } as never } : {}, payload)
  await initTransaction(req)
  try {
    await drizzleFor(payload, await req.transactionID).execute(sql`SELECT pg_advisory_xact_lock(${OFFICIAL_DOMAINS_LOCK})`)
    const current = ((await payload.findGlobal({ slug: 'editorial-rules', depth: 0, overrideAccess: true, req })) as { officialSourceDomains?: { domain: string }[] | null }).officialSourceDomains ?? []
    const all = [...new Set([...current.map((d) => d.domain), ...domains])]
    await payload.updateGlobal({ slug: 'editorial-rules', data: { officialSourceDomains: all.map((domain) => ({ domain })) } as never, overrideAccess: !user, req })
    await commitTransaction(req)
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
