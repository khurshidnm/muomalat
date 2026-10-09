import type { PayloadRequest } from 'payload'

import type { AuditAction } from '../../audit/actions'

/**
 * What the audit hooks remember between the hooks of one operation, on
 * `req.context` (CMS-SPEC §9.1).
 *
 * - beforeOperation sees the operation's arguments (`draft`, `autosave`) and
 *   the raw request data; beforeChange and afterChange never receive them
 *   (PHASE0 item 2).
 * - beforeChange reads the live row before it is overwritten, so a publish is
 *   diffed against what readers saw before, not against the last autosave.
 *
 * Entries are keyed by collection (or `global:<slug>`) and document id; an
 * operation on many documents (a bulk update or delete) is stored under `*`.
 */

/**
 * A caller's instructions for the rows of one operation, passed as
 * `context: { audit: {...} }`. The audit beforeOperation hook takes it off
 * `req.context` (where Payload would otherwise keep it for every later call
 * on the same request) and applies it to that operation only.
 */
export type AuditOverride = {
  /** Record this action instead of the derived one, e.g. `pd.retention_purge` for a retention delete. */
  action?: AuditAction
  summary?: string
  /** Write no row: bookkeeping writes another hook makes and audits itself. */
  skip?: boolean
}

export type OperationState = {
  operation: string
  draft: boolean
  autosave: boolean
  override?: AuditOverride
  /** `changeNote` as sent, before any hook clears it (§5.6). */
  changeNote?: unknown
}

export type DocState = {
  /** The main (live) row before this write; set for publishes and possible unpublishes. */
  live?: Record<string, unknown> | null
  wasLive?: boolean
  everPublished?: boolean
  passwordChanged?: boolean
}

/**
 * One frame per write operation, on a stack per key: another concern's hook
 * may write the same document again inside this operation (the workflow
 * marks translations outdated in afterChange, before the audit afterChange
 * runs), and that nested write must neither take this operation's state nor
 * leave its own behind. The frame is removed when its document is recorded.
 */
type Frame = OperationState & { docs: Record<string, DocState> }
type Store = { ops: Record<string, Frame[]>; once: Record<string, true> }

const KEY = 'auditState'

function store(req: PayloadRequest): Store {
  const context = req.context as Record<string, unknown>
  if (!context[KEY]) context[KEY] = { ops: {}, once: {} } satisfies Store
  return context[KEY] as Store
}

const key = (scope: string, id?: number | string | null) => `${scope}:${id === undefined || id === null ? '*' : String(id)}`

export function rememberOperation(req: PayloadRequest, scope: string, id: number | string | null | undefined, state: Omit<OperationState, 'override'>) {
  const context = req.context as Record<string, unknown>
  const override = context.audit as AuditOverride | undefined
  if (override !== undefined) delete context.audit
  ;(store(req).ops[key(scope, id)] ??= []).push({ ...state, override, docs: {} })
}

/** The innermost operation on this document, else the innermost one on the whole scope (create, restore, bulk). */
function frameFor(req: PayloadRequest, scope: string, id?: number | string | null): { frame: Frame; stack: Frame[]; byId: boolean } | undefined {
  const ops = store(req).ops
  const own = id === undefined || id === null ? undefined : ops[key(scope, id)]
  if (own?.length) return { frame: own[own.length - 1], stack: own, byId: true }
  const all = ops[key(scope)]
  if (all?.length) return { frame: all[all.length - 1], stack: all, byId: false }
  return undefined
}

export function operationFor(req: PayloadRequest, scope: string, id?: number | string | null): OperationState | undefined {
  return frameFor(req, scope, id)?.frame
}

export function rememberDoc(req: PayloadRequest, scope: string, id: number | string, patch: DocState) {
  const found = frameFor(req, scope, id)
  if (!found) return
  const docs = found.frame.docs
  docs[String(id)] = { ...docs[String(id)], ...patch }
}

/**
 * The document's state, removed so a later write of the same document in the
 * request starts afresh. Ends the operation's frame, except a bulk update's
 * or delete's, which the other documents of the call still need.
 */
export function takeDoc(req: PayloadRequest, scope: string, id: number | string): DocState {
  const found = frameFor(req, scope, id)
  if (!found) return {}
  const { frame, stack, byId } = found
  const state = frame.docs[String(id)] ?? {}
  delete frame.docs[String(id)]
  const bulk = !byId && (frame.operation === 'update' || frame.operation === 'delete')
  if (!bulk && stack[stack.length - 1] === frame) stack.pop()
  return state
}

/** True the first time `name` is seen in this request. */
export function once(req: PayloadRequest, name: string): boolean {
  const seen = store(req).once
  if (seen[name]) return false
  seen[name] = true
  return true
}
