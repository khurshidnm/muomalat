import config from '@payload-config'

import type { Concern } from '@/payload/hooks'
import { audit } from '@/payload/hooks/concerns/audit'
import { invalidate } from '@/payload/hooks/concerns/invalidate'
import { personalData } from '@/payload/hooks/concerns/personalData'
import { security } from '@/payload/hooks/concerns/security'
import { workflow } from '@/payload/hooks/concerns/workflow'
import { testPayload } from '../helpers/payload'

/**
 * The validation concern on its own: every hook the other concerns register
 * is removed from the sanitized config before Payload boots, so these tests
 * publish without the two-person rule, the audit log or cache invalidation.
 * The collections' own schema hooks (slugs, derived fields) and the
 * validation concern's hooks stay. Each test file runs in its own process,
 * so the change never reaches another suite. tests/validate/combined.test.ts
 * runs with every concern.
 */
let ready: ReturnType<typeof testPayload> | undefined

export function isolatedPayload(): ReturnType<typeof testPayload> {
  return (ready ??= (async () => {
    const foreign = new Set<unknown>()
    for (const concern of [security, workflow, personalData, audit, invalidate] as Concern[])
      for (const group of [concern.collections, concern.globals])
        for (const hooks of Object.values(group ?? {})) for (const list of Object.values(hooks ?? {})) for (const fn of (list as unknown[]) ?? []) foreign.add(fn)
    const sanitized = await config
    for (const entity of [...sanitized.collections, ...sanitized.globals]) {
      const hooks = entity.hooks as Record<string, unknown[] | undefined> | undefined
      if (!hooks) continue
      for (const [key, list] of Object.entries(hooks)) if (Array.isArray(list)) hooks[key] = list.filter((fn) => !foreign.has(fn))
    }
    return testPayload()
  })())
}
