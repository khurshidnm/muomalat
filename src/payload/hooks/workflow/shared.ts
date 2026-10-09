import type { CollectionSlug, PayloadRequest } from 'payload'
import { APIError, isolateObjectProperty, ValidationError } from 'payload'

import { type Role, userRole } from '../../access/roles'
import { fieldLabel } from '../validate/shared'

/**
 * Shared vocabulary of the workflow concern (CMS-SPEC §5): states, the keys
 * it keeps in `req.context`, error helpers and small document utilities.
 *
 * `req.context` cannot be set over HTTP (PHASE0 item 3), so every key read
 * from it here was written by server code: the transition endpoint, the
 * worker, the importer or the workflow hooks themselves.
 */

export type Id = string | number
export type Doc = Record<string, unknown>

export const STATES = ['idea', 'draft', 'in_edit', 'ready', 'scheduled', 'published', 'hold', 'withdrawn'] as const
export type WorkflowState = (typeof STATES)[number]

export const STATE_LABELS: Record<WorkflowState, string> = {
  idea: 'Gʻoya',
  draft: 'Qoralama',
  in_edit: 'Tahrirda',
  ready: 'Tayyor',
  scheduled: 'Rejalashtirilgan',
  published: 'Chop etilgan',
  hold: 'Toʻxtatilgan',
  withdrawn: 'Olib tashlangan',
}

/** States before first publication; `hold` is reachable only from these (§5.1). */
export const PRE_PUBLICATION: WorkflowState[] = ['idea', 'draft', 'in_edit', 'ready', 'scheduled']

export const TRANSITION_IDS = [
  'start',
  'submit',
  'take',
  'rework',
  'approve',
  'schedule',
  'unschedule',
  'publish',
  'urgent',
  'hold',
  'release',
  'withdraw',
  'restore',
  'unpublish',
  'secondRead',
] as const
export type TransitionId = (typeof TRANSITION_IDS)[number]

/** What the transition endpoint (or the worker) asks for; read by the hooks from `req.context.transition`. */
export interface TransitionRequest {
  id: TransitionId
  from: WorkflowState
  to: WorkflowState
  comment?: string
  scheduledAt?: string
  outcome?: 'ok' | 'minor_fix' | 'correction'
}

export type Locale = 'uz' | 'ru' | 'en'
export const LOCALES: Locale[] = ['uz', 'ru', 'en']
export const TRANSLATED: Exclude<Locale, 'uz'>[] = ['ru', 'en']

/** A workflow notification for the staff group (§10.9). Delivered after commit by ./notify. */
export interface StaffNotice {
  kind: 'submitted' | 'sent_back' | 'approved' | 'approval_voided' | 'second_read_due' | 'second_read_overdue' | 'schedule_failed' | 'held'
  /** `desk` = editors and the editor-in-chief; `users` = the listed accounts. */
  audience: 'desk' | 'eic' | 'users'
  userIds?: Id[]
  articleId?: Id
  title?: string
  text: string
  /** Sent only if the article is still in this state after commit (a rolled-back save notifies nobody). */
  expectState?: WorkflowState
}

/** One audit row the workflow writes for a save (§9.2 "Workflow" and "Scheduling"). */
export interface WorkflowEvent {
  action: string
  summary?: string
  before?: unknown
  after?: unknown
  locale?: string
}

/** Work that beforeChange decides and afterChange carries out, once the write has happened. */
export interface PendingWork {
  events: WorkflowEvent[]
  notices: StaffNotice[]
  /** Mark these translations `outdated` (§5.6); `hidden` after a correction (the read gate hides them, §6.3). */
  outdate?: { hidden: boolean }
  /** Correction rows published in this save: fill `versionId` and close linked requests (§5.7). */
  publishedCorrections?: { id: string; request?: Id }[]
}

/** The keys this concern reads from and writes to `req.context`. */
export interface WorkflowContext {
  /** `args.draft` of the current create/update/restoreVersion, copied in beforeOperation (beforeChange never receives it). */
  draftArg?: boolean
  /** The transition being performed (endpoint or worker). */
  transition?: TransitionRequest
  /** Urgent fast path requested (§5.4). */
  urgent?: boolean
  /** The scheduler's run (§5.11). */
  scheduledRun?: boolean
  /** In-process importer (§11): workflow rules do not apply to imported history. */
  importing?: boolean
  /** A nested write made by the workflow itself (translation status sync, request link); every workflow hook skips it. */
  workflowSync?: string
  /** Copy-from-Uzbek action (§3.3 "Tarjima"): the translation hook records the translator. */
  copyFromUz?: { machine: boolean }
  /** Set by Payload's restoreVersion on req.context (and kept for the rest of the request). */
  isRestoringVersion?: boolean
  /** Notices waiting for the transaction to commit. */
  workflowNotices?: StaffNotice[]
  /** Set by a caller that flushes notices itself after commit (endpoint, worker). */
  noticesFlushedBy?: 'endpoint' | 'worker'
  /** Per-document work handed from beforeChange to afterChange. */
  workflowPending?: Record<string, PendingWork>
  /** Non-blocking findings of the workflow (embargo at midnight…), for the checks panel of the validation concern. */
  workflowWarnings?: { rule: string; path: string; message: string }[]
  /** The change kind of the publish being written (§5.6), for the audit and delivery concerns: the note itself is cleared in the same write. */
  workflowChange?: { kind: string; reason: string; numbersOverride: boolean }
}

export const wctx = (req: PayloadRequest) => req.context as WorkflowContext & Record<string, unknown>

/**
 * Nested Local API calls share the transaction but never the locale (open bug
 * payloadcms#18246): a nested call that passes `req` together with another
 * locale overwrites `req.locale`, and the outer save writes into the wrong
 * locale. Every nested call in this concern goes through one of these.
 */
export const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])

/** Also isolates `context`: for nested writes whose own context must not leak into the outer request. */
export const isolatedWrite = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale', 'context'])

export const ARTICLES = 'articles' as CollectionSlug

// ── errors (Uzbek; a rule that must fail loudly throws) ─────────────────────
export const forbidden = (message: string) => new APIError(message, 403)
export const conflict = (message: string) => new APIError(message, 409)
export const badRequest = (message: string) => new APIError(message, 400)

/**
 * A field-level error: Payload shows it next to the field in the admin, and
 * the toast names the field by its Uzbek label («Oʻzgarish turi»), not by its
 * path (`changeNote.kind`).
 */
export const fieldError = (req: PayloadRequest, errors: { path: string; message: string }[] | string, message?: string) => {
  const list = typeof errors === 'string' ? [{ path: errors, message: message ?? '' }] : errors
  const fields = req.payload.collections[ARTICLES]?.config.fields ?? []
  return new ValidationError(
    { collection: 'articles', errors: list.map((e) => ({ ...e, label: fieldLabel(fields, e.path) || undefined })), req },
    req.t,
  )
}

// ── roles ───────────────────────────────────────────────────────────────────
export const actorRole = (req: PayloadRequest): Role | undefined => userRole(req)
export const actorId = (req: PayloadRequest): Id | undefined => (req.user ? (req.user.id as Id) : undefined)
export const isPublisher = (role: Role | undefined) => role === 'editor' || role === 'eic'

// ── documents ───────────────────────────────────────────────────────────────
export const idOf = (v: unknown): Id | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'object') {
    const o = v as { id?: Id; value?: unknown }
    if (o.id !== undefined) return o.id
    if ('value' in o) return idOf(o.value)
    return undefined
  }
  return v as Id
}
export const idsOf = (v: unknown): Id[] => (Array.isArray(v) ? v.map(idOf).filter((x): x is Id => x !== undefined) : [])
export const sameId = (a: unknown, b: unknown) => {
  const x = idOf(a)
  const y = idOf(b)
  return x !== undefined && y !== undefined && String(x) === String(y)
}
export const hasId = (list: Id[], id: unknown) => list.some((x) => sameId(x, id))

export const isPlainObject = (v: unknown): v is Doc => Boolean(v) && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)

/**
 * The document as it will be after this save: the stored version overlaid by
 * the incoming data. Groups merge key by key; arrays, rich text (`{ root }`)
 * and relationships are replaced whole. A key that is `undefined` in the data
 * was not sent and keeps its stored value.
 */
export function overlay(base: unknown, data: unknown): Doc {
  const out: Doc = isPlainObject(base) ? { ...base } : {}
  if (!isPlainObject(data)) return out
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    const prev = out[k]
    out[k] = isPlainObject(v) && isPlainObject(prev) && !('root' in v) && !('relationTo' in v) ? overlay(prev, v) : v
  }
  return out
}

/** Stable JSON: keys sorted, so equal content gives equal strings and hashes. */
export function canonical(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (v === undefined) return null
    if (v instanceof Date) return v.toISOString()
    if (Array.isArray(v)) return v.map(norm)
    if (isPlainObject(v)) {
      const out: Doc = {}
      for (const k of Object.keys(v).sort()) if (v[k] !== undefined) out[k] = norm(v[k])
      return out
    }
    return v
  }
  return JSON.stringify(norm(value))
}

/** An ISO date string normalised to milliseconds UTC, or null. */
export const isoOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null
  const t = new Date(v as string).getTime()
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}
export const time = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  const t = new Date(v as string).getTime()
  return Number.isNaN(t) ? undefined : t
}

export const MINUTE = 60 * 1000
export const nowIso = () => new Date().toISOString()

export const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

export const stateOf = (doc: Doc | undefined): WorkflowState => ((doc?.workflowStatus as WorkflowState | undefined) ?? 'idea')

export function pendingFor(req: PayloadRequest, key: Id | undefined): PendingWork {
  const ctx = wctx(req)
  const map = (ctx.workflowPending ??= {})
  return (map[String(key ?? 'new')] ??= { events: [], notices: [] })
}

export function takePending(req: PayloadRequest, key: Id | undefined): PendingWork | undefined {
  const map = wctx(req).workflowPending
  if (!map) return undefined
  const k = String(key ?? 'new')
  const work = map[k] ?? map.new
  delete map[k]
  delete map.new
  return work
}
