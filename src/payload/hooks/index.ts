import type { CollectionConfig, GlobalConfig } from 'payload'

import { audit } from './concerns/audit'
import { invalidate } from './concerns/invalidate'
import { personalData } from './concerns/personalData'
import { security } from './concerns/security'
import { validate } from './concerns/validate'
import { workflow } from './concerns/workflow'

/**
 * Hook registry. Each concern (workflow, validation, audit, cache
 * invalidation, personal data, security) lives in its own module under
 * ./concerns and contributes hooks per collection or global slug. Collection
 * and global configs never list concern hooks themselves; they call
 * hooksFor(slug, ownHooks) so a concern can be added or changed without
 * touching the schema files.
 *
 * Order matters: concerns run in the order listed in CONCERNS, after the
 * collection's own schema hooks (slugs, derived fields).
 */
export type CollectionHooks = NonNullable<CollectionConfig['hooks']>
export type GlobalHooks = NonNullable<GlobalConfig['hooks']>

export type Concern = {
  collections?: Record<string, CollectionHooks>
  globals?: Record<string, GlobalHooks>
}

const CONCERNS: Concern[] = [security, workflow, validate, personalData, audit, invalidate]

function merge<H extends Record<string, unknown[] | undefined>>(parts: (H | undefined)[]): H {
  const out: Record<string, unknown[]> = {}
  for (const part of parts) {
    if (!part) continue
    for (const [key, list] of Object.entries(part)) {
      if (!list?.length) continue
      ;(out[key] ??= []).push(...list)
    }
  }
  return out as H
}

export const hooksFor = (slug: string, own?: CollectionHooks): CollectionHooks =>
  merge<CollectionHooks>([own, ...CONCERNS.map((c) => c.collections?.[slug])])

export const globalHooksFor = (slug: string, own?: GlobalHooks): GlobalHooks =>
  merge<GlobalHooks>([own, ...CONCERNS.map((c) => c.globals?.[slug])])
