import type { Field, FieldAccess, FieldHook } from 'payload'

import { staffField } from '../access/editorial'
import { REL } from './relations'

/** Nobody writes the field through the API; only hooks and overrideAccess callers (importer, worker) do. */
const deny: FieldAccess = () => false

/**
 * Marks a field as system-written (CMS-SPEC §3.1): field-level create and
 * update access are denied, so a value sent by a client is dropped silently,
 * while a value set in a hook still persists (confirmed in Phase 0). The admin
 * shows the field read-only. Rules that must fail loudly live in hooks.
 */
export function system<F extends Field>(field: F): F {
  const f = field as F & { access?: Record<string, FieldAccess>; admin?: Record<string, unknown>; hooks?: Record<string, unknown[]> }
  return {
    ...f,
    access: { ...f.access, create: deny, update: deny },
    admin: { ...f.admin, readOnly: true },
    // A duplicate is a new document: system state is never copied into it.
    hooks: { ...f.hooks, beforeDuplicate: [...(f.hooks?.beforeDuplicate ?? []), () => undefined] },
  } as F
}

/** Who saved the document last, set from req.user on every change (copied into each version). */
const setLastEditedBy: FieldHook = ({ req, value }) => req.user?.id ?? value

/**
 * The `system` group of CMS-SPEC §3.2, used by every content collection.
 * `legacyId` keeps the mock id (`th-05`) for the import and for redirects; a
 * re-run of the import upserts by it.
 */
export const systemFields = (): Field[] => [
  system({
    name: 'lastEditedBy',
    label: 'Oxirgi tahrirlagan',
    type: 'relationship',
    relationTo: REL.users,
    access: { read: staffField },
    admin: { position: 'sidebar' },
    hooks: { beforeChange: [setLastEditedBy] },
  }),
  system({ name: 'legacyId', label: 'Eski ID', type: 'text', unique: true, index: true, admin: { hidden: true } }),
]
