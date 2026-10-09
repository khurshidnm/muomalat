/**
 * Draft preview (CMS-SPEC §5.13). /preview turns on Next's draft mode on the
 * CMS host for a signed-in staff member; while it is on, single documents
 * are read as that member with `draft: true` and no cache.
 *
 * Draft mode alone is not trusted: the request must also come to the CMS
 * host and carry a valid Payload session for an active account. Anything
 * else reads published content, as the public does. Called once per
 * request (React cache); outside a request (build-time params, scripts) it
 * answers "public".
 */
import { draftMode, headers } from 'next/headers'
import { cache } from 'react'
import type { TypedUser } from 'payload'

import { payloadClient, PUBLIC, type Reader } from './client'

/** CMS_HOST, e.g. cms.muomalat.uz or cms.localhost:3000. */
export const cmsHost = () => process.env.CMS_HOST?.trim().toLowerCase() || undefined

export const isCmsHost = (host: string | null | undefined) => {
  const cms = cmsHost()
  return Boolean(cms && host && host.trim().toLowerCase() === cms)
}

async function draftEnabled(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled
  } catch {
    // No request scope (generateStaticParams, scripts, tests).
    return false
  }
}

/** The staff member behind a request's Payload session, if the account is active. */
export async function staffUser(requestHeaders: Headers): Promise<TypedUser | undefined> {
  const payload = await payloadClient()
  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user || (user as { active?: boolean | null }).active === false) return undefined
  return user as TypedUser
}

export const currentReader = cache(async (): Promise<Reader> => {
  if (!(await draftEnabled())) return PUBLIC
  const h = await headers()
  if (!isCmsHost(h.get('host'))) return PUBLIC
  try {
    const user = await staffUser(h)
    return user ? { kind: 'preview', user, headers: new Headers(h) } : PUBLIC
  } catch {
    return PUBLIC
  }
})

/** True while a staff member previews drafts: pages render the preview banner. */
export async function isPreviewing(): Promise<boolean> {
  return (await currentReader()).kind === 'preview'
}
