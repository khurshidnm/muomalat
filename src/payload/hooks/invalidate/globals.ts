import type { GlobalAfterChangeHook, GlobalBeforeChangeHook, GlobalBeforeOperationHook, GlobalSlug, PayloadRequest } from 'payload'

import { recordPublishEvent } from '../../delivery/outbox'
import { globalTargets } from '../../delivery/tags'
import type { GlobalHooks } from '../index'
import { hasDrafts, isolated, type Doc } from './common'

/**
 * Globals (CMS-SPEC §8.5): home page, navigation, ad slots, site settings,
 * editorial rules. As with collections, only a save that writes the live
 * global counts; a draft save of home-page, navigation or ad-slots does not.
 * A global restore runs no beforeChange hook (PHASE0 item 12), so its "before"
 * is unknown and the ad slots count as all changed.
 */
type Frame = { writesMain: boolean; before?: Doc | null }
/** A stack per global, like the collections' frames (./common.ts), so a nested save cannot take this one's state. */
const stack = (req: PayloadRequest, slug: string) => ((req.context[`invalidate.global:${slug}`] ??= []) as Frame[])

const readLiveGlobal = async (req: PayloadRequest, slug: string) =>
  (await req.payload.findGlobal({ slug: slug as GlobalSlug, depth: 0, draft: false, overrideAccess: true, req: isolated(req) })) as unknown as Doc

const stashOperation: GlobalBeforeOperationHook = ({ args, operation, global, req }) => {
  if (operation !== 'update' && operation !== 'restoreVersion') return args
  const a = args as { draft?: boolean; data?: Doc }
  const writesMain = operation === 'restoreVersion' ? !a.draft : !hasDrafts(global) || !(a.draft && a.data?._status !== 'published')
  stack(req, global.slug).push({ writesMain })
  return args
}

const rememberLive: GlobalBeforeChangeHook = async ({ data, global, req }) => {
  const frame = stack(req, global.slug).at(-1)
  if (frame?.writesMain) frame.before = await readLiveGlobal(req, global.slug)
  return data
}

/** Ad slot ids whose content differs between two live versions of ad-slots. */
function changedSlots(before: Doc, after: Doc): string[] {
  type Slot = Doc & { slotId?: string }
  const index = (doc: Doc) => {
    const out = new Map<string, string>()
    for (const slot of (Array.isArray(doc.slots) ? doc.slots : []) as Slot[]) {
      if (!slot.slotId) continue
      const { id: _id, ...content } = slot
      out.set(slot.slotId, (out.get(slot.slotId) ?? '') + JSON.stringify(content))
    }
    return out
  }
  const a = index(before)
  const b = index(after)
  return [...new Set([...a.keys(), ...b.keys()])].filter((id) => a.get(id) !== b.get(id))
}

const isLiveGlobal = (doc: Doc | null | undefined, drafts: boolean) => Boolean(doc) && (!drafts || doc!._status === 'published')

const afterChange: GlobalAfterChangeHook = async ({ doc, global, req }) => {
  const frame = stack(req, global.slug).pop()
  const before = frame?.before
  if (frame?.writesMain === false) return doc
  const drafts = hasDrafts(global)
  const after = await readLiveGlobal(req, global.slug)
  if (before && after && before.updatedAt === after.updatedAt) return doc
  const wasLive = before === undefined ? isLiveGlobal(after, drafts) : isLiveGlobal(before, drafts)
  if (!wasLive && !isLiveGlobal(after, drafts)) return doc
  const slots = global.slug === 'ad-slots' && before && after ? changedSlots(before, after) : undefined
  await recordPublishEvent(req, { collection: global.slug, kind: 'global_change', targets: globalTargets(global.slug, slots) })
  return doc
}

export const globalHooks: GlobalHooks = {
  beforeOperation: [stashOperation],
  beforeChange: [rememberLive],
  afterChange: [afterChange],
}
