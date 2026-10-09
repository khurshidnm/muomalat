import { revalidatePath, revalidateTag } from 'next/cache'

import type { Targets } from './tags'

const usableTag = (t: string) => t.length > 0 && t.length <= 256
const usablePath = (p: string) => p.startsWith('/') && !p.startsWith('//') && p.length <= 1024

/**
 * Applies targets to the Next caches (CMS-SPEC §8.4 step 2). Only for code
 * running inside a request: the after() callback scheduled by the outbox
 * writer, and /internal/revalidate. Outside a request revalidateTag throws;
 * there the outbox row is the way in.
 */
export function revalidateTargets(t: Targets) {
  for (const tag of t.expire) if (usableTag(tag)) revalidateTag(tag, { expire: 0 })
  for (const tag of t.tags) if (usableTag(tag)) revalidateTag(tag, 'max')
  for (const path of t.paths) if (usablePath(path)) revalidatePath(path)
  for (const layout of t.layouts) if (usablePath(layout)) revalidatePath(layout, 'layout')
}
