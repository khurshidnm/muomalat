import type { Endpoint, PayloadRequest } from 'payload'

import { isAdmin, withEdge } from '../access/roles'
import { ReadOnlyError, assertWritable } from '../hooks/security/readOnly'
import { erasePersonalData, exportPersonalData, isStorableEmail } from './store'

/**
 * Admin-only endpoints for rights requests (CMS-SPEC §13.3, test L5): find a
 * person by e-mail across the four collections and export or erase what is
 * held. Each call is audited (`pd.export` / `pd.delete`) with counts only.
 *
 *   POST /api/personal-data/export  { email, requestId? }  → JSON copy
 *   POST /api/personal-data/erase   { email, requestId? }  → counts
 *
 * `requestId` is the requests-register item the action answers. Responses are
 * never cached. Register in the root config: `endpoints: personalDataEndpoints`.
 */
const noStore = { 'Cache-Control': 'no-store' }

async function readBody(req: PayloadRequest): Promise<{ email?: unknown; requestId?: unknown }> {
  try {
    return (typeof req.json === 'function' ? await req.json() : req.data) ?? {}
  } catch {
    return {}
  }
}

const handler =
  (action: 'export' | 'erase'): Endpoint['handler'] =>
  async (req) => {
    // Same gate as every access function: active admin, edge identity checked.
    if (!req.user || !(await withEdge(isAdmin)({ req } as Parameters<typeof isAdmin>[0]))) {
      return Response.json({ message: 'Bu amal faqat administrator uchun.' }, { status: 403, headers: noStore })
    }
    // Erasure writes with overrideAccess, which the read-only guard lets through: refuse it here (§12.10).
    if (action === 'erase') {
      try {
        await assertWritable(req)
      } catch (error) {
        if (error instanceof ReadOnlyError) return Response.json({ message: error.message }, { status: 403, headers: noStore })
        throw error
      }
    }
    const body = await readBody(req)
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!isStorableEmail(email)) {
      return Response.json({ message: 'Elektron pochta manzilini toʻgʻri kiriting.' }, { status: 400, headers: noStore })
    }
    const requestId = typeof body.requestId === 'number' || typeof body.requestId === 'string' ? body.requestId : undefined
    const opts = { actor: req.user as { id: number; email?: string; role?: string; active?: boolean }, requestId }
    const result = action === 'export' ? await exportPersonalData(req.payload, email, opts) : await erasePersonalData(req.payload, email, opts)
    return Response.json(result, { headers: noStore })
  }

export const personalDataEndpoints: Endpoint[] = [
  { path: '/personal-data/export', method: 'post', handler: handler('export') },
  { path: '/personal-data/erase', method: 'post', handler: handler('erase') },
]
