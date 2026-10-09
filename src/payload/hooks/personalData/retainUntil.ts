import type { CollectionBeforeChangeHook } from 'payload'

import { retainUntilFor, type RetainedCollection } from '../../personalData/retention'

/**
 * Sets `retainUntil` on every create and update (CMS-SPEC §13.1), from the
 * record as it will be after the change: the deadline follows the last
 * activity, the status (declined, unsubscribed), the contract flag and, for
 * requests, the decision date. `retainUntil` is a system field: field access
 * has already dropped any value a client sent, and this hook always writes it.
 */
export const setRetainUntil =
  (collection: RetainedCollection): CollectionBeforeChangeHook =>
  ({ data, originalDoc }) => {
    const merged = { ...(originalDoc ?? {}), ...data }
    data.retainUntil = retainUntilFor(collection, merged, new Date())
    return data
  }
