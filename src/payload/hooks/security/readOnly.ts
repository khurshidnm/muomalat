import type { CollectionBeforeOperationHook, GlobalAfterChangeHook, GlobalBeforeChangeHook, GlobalBeforeOperationHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { hasRole } from '../../access/roles'
import { forgetReadOnlySetting, isReadOnly } from '../../security/readOnly'

/**
 * Read-only mode guards (CMS-SPEC §12.10). A `beforeOperation` hook on every
 * collection and global refuses each write with a 403 that names the mode,
 * before access runs. Calls with `overrideAccess: true` pass: they are the
 * system's own writes (audit rows, the publish outbox, form submissions), the
 * same calls access control never sees. Login, logout and token refresh are
 * not writes here, so staff can still sign in and read.
 */

export const READ_ONLY_MESSAGE =
  'CMS hozir faqat oʻqish rejimida: oʻzgartirishlar vaqtincha saqlanmaydi. Rejim oʻchirilgach qayta urinib koʻring.'

export class ReadOnlyError extends APIError {
  constructor() {
    super(READ_ONLY_MESSAGE, 403, { readOnly: true }, true)
  }
}

/** Hook operations that write. `unlock` stays open: it only clears a lockout. */
const COLLECTION_WRITES = new Set(['create', 'update', 'delete', 'restoreVersion', 'forgotPassword', 'resetPassword'])
const GLOBAL_WRITES = new Set(['update', 'restoreVersion'])

export const collectionReadOnlyGuard: CollectionBeforeOperationHook = async ({ operation, overrideAccess, req }) => {
  if (overrideAccess || !COLLECTION_WRITES.has(operation)) return
  if (await isReadOnly({ req })) throw new ReadOnlyError()
}

/** Set on a request whose site-settings save may change `operations` only. */
const OPERATIONS_ONLY = Symbol.for('muomalat.readOnly.operationsOnly')
type Flags = Record<symbol, boolean | undefined>

export const globalReadOnlyGuard: GlobalBeforeOperationHook = async ({ global, operation, overrideAccess, req }) => {
  if (overrideAccess || !GLOBAL_WRITES.has(operation)) return
  if (!(await isReadOnly({ req }))) return
  // The way back: an admin may still change site-settings.operations (§12.10).
  if (global.slug === 'site-settings' && operation === 'update' && hasRole(req, 'admin')) {
    ;(req.context as unknown as Flags)[OPERATIONS_ONLY] = true
    return
  }
  throw new ReadOnlyError()
}

/** Fields Payload manages on a global; everything else outside `operations` is reset to the stored value. */
const KEEP = new Set(['operations', 'globalType', 'createdAt', 'updatedAt', 'id', '_status'])

/**
 * site-settings `beforeChange`: during read-only mode an admin's save keeps
 * only the `operations` group. The admin form sends the whole document, so
 * every other value is put back to what is stored rather than refused.
 */
export const operationsOnlyWhileReadOnly: GlobalBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!(req.context as unknown as Flags)?.[OPERATIONS_ONLY] || !data || !originalDoc) return data
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(data)) out[key] = KEEP.has(key) ? data[key] : originalDoc[key]
  return out
}

/** site-settings `afterChange`: the next write reads the flag again. */
export const forgetReadOnlyAfterChange: GlobalAfterChangeHook = ({ doc }) => {
  forgetReadOnlySetting()
  return doc
}

/** For custom endpoints that write with `overrideAccess: true` on a user's behalf. */
export async function assertWritable(req: PayloadRequest) {
  if (await isReadOnly({ req })) throw new ReadOnlyError()
}
