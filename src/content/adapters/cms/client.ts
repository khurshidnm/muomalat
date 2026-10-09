/**
 * The Payload Local API as the public site uses it.
 *
 * Published reads pass no user and `overrideAccess: false`: the collections'
 * read access then returns published documents only (src/payload/access,
 * `anonymousRead`). Preview reads (draft mode on the CMS host, CMS-SPEC
 * §5.13) pass the signed-in staff member and `draft: true`, still with
 * `overrideAccess: false`, so a reporter previews only what they may read.
 *
 * Every call gets a fresh request object (or none): never a shared `req`
 * with a different locale (payloadcms#18246).
 */
import config from '@payload-config'
import { getPayload, type Payload, type PayloadRequest, type TypedUser } from 'payload'

export const payloadClient = (): Promise<Payload> => getPayload({ config })

/** Who a read is for: the public (published only) or a staff member previewing a draft. */
export type Reader = { kind: 'public' } | { kind: 'preview'; user: TypedUser; headers: Headers }

export const PUBLIC: Reader = { kind: 'public' }

/**
 * Local API options for a reader. A preview read carries the browser's
 * headers in its own request object, so the Cloudflare Access check of
 * `withEdge` (src/payload/access/roles.ts) sees the same JWT as the admin.
 */
export function readAs(reader: Reader, { draft = true }: { draft?: boolean } = {}) {
  if (reader.kind === 'public') return { overrideAccess: false as const, draft: false }
  return {
    overrideAccess: false as const,
    draft,
    user: reader.user,
    req: { headers: reader.headers } as Partial<PayloadRequest>,
  }
}
