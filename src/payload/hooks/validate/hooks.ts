import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  CollectionBeforeValidateHook,
  Field,
  GlobalBeforeChangeHook,
  GlobalBeforeOperationHook,
  PayloadRequest,
} from 'payload'
import { ValidationError } from 'payload'

import type { Finding } from '../../../content/rules'
import { checkArticleDoc } from './article'
import { checkCollectionDoc } from './collections'
import { checkGlobalDoc, homeRules, labelRules, launchGate } from './globals'
import { isLexical, nodeName, unregisteredNodes } from './lexical'
import { isDuplicateSlug, recordSlugChange } from './slug'
import { dedupe, isolated, LOCALES, toStored, validationError, type Doc, type Gate, type Id, type StoredChecks, type StoredFinding } from './shared'

/**
 * The hooks the validation concern registers (CMS-SPEC §7.3):
 *
 * - beforeOperation copies the `draft` argument into req.context, because
 *   beforeChange never receives it (PHASE0 item 2);
 * - beforeValidate rejects rich text the admin editor cannot load, on every
 *   save, drafts included;
 * - beforeChange runs the rules on the document as it will be stored. Errors
 *   block publish, approval and the submit transition (only its presence
 *   rules); a draft save stores errors and warnings in `validationWarnings`
 *   and is never blocked. Warnings never block and are kept in the version.
 */

const DRAFT_KEY = 'validate:draft'
/** ChecksPanel's acknowledge and fix actions, passed by the check endpoint (src/payload/endpoints/check.ts). */
export const ACK_KEY = 'validate:ack'
export const FIX_KEY = 'validate:fix'

export interface AckRequest {
  id: Id
  keys: string[]
  undo?: boolean
  by?: Id
  byName?: string
}
export interface FixRecord {
  id: Id
  entries: { rule: string; field: string }[]
  by?: Id
}

const draftArg = (req: PayloadRequest) => req.context?.[DRAFT_KEY] as boolean | undefined

/** beforeOperation: keep `args.draft` for the change hooks. */
export const rememberDraftArg: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update' || operation === 'restoreVersion') req.context[DRAFT_KEY] = Boolean((args as { draft?: boolean }).draft)
  return args
}

/** Rich-text fields per collection and the editor each uses. */
const RICH_TEXT: Record<string, { path: string; editor: 'article' | 'inline' }[]> = {
  articles: [{ path: 'body', editor: 'article' }],
  'glossary-terms': [
    { path: 'definition', editor: 'inline' },
    { path: 'origin', editor: 'inline' },
    { path: 'practice', editor: 'inline' },
    { path: 'example.text', editor: 'inline' },
  ],
  'club-events': [{ path: 'report', editor: 'inline' }],
}

const at = (doc: unknown, path: string) => path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Doc)[k] : undefined), doc)

/**
 * beforeValidate: rich text with node types the editor does not register
 * (quote, upload, horizontal rule, unknown blocks) is rejected on every save.
 * The admin editor cannot load such a tree, so even a draft must not hold one.
 */
export const rejectUnknownNodes: CollectionBeforeValidateHook = ({ collection, data, req }) => {
  const errors: { path: string; message: string }[] = []
  for (const { path, editor } of RICH_TEXT[collection.slug] ?? []) {
    let value = at(data, path)
    if (value && typeof value === 'object' && !isLexical(value) && LOCALES.some((l) => l in (value as Doc))) value = Object.values(value as Doc).find(isLexical) // locale: 'all'
    if (!isLexical(value)) continue
    const bad = unregisteredNodes(value, editor, path)
    if (bad.length) {
      const names = [...new Set(bad.map((b) => nodeName(b.type.replace(/^(block|inlineBlock):/, ''))))]
      errors.push({ path, message: `Matnda bu muharrirda yoʻq element bor: ${names.join(', ')}. Uni olib tashlang yoki muharrirdagi blok bilan almashtiring (masalan, iqtibos uchun «Iqtibos» bloki, rasm uchun «Rasm» bloki).` })
    }
  }
  if (errors.length) throw new ValidationError({ collection: collection.slug, errors, req }, req.t)
  return data
}

/** What an article save does: publish, approve (→ ready / scheduled), submit (→ in_edit) or a plain draft save. */
export function articleGate(data: Doc, originalDoc: Doc | undefined, req: PayloadRequest): Gate {
  const restoringAsDraft = req.context?.isRestoringVersion === true && draftArg(req) === true
  const from = originalDoc?.workflowStatus as string | undefined
  const to = data.workflowStatus as string | undefined
  // A withdrawal (§5.8) keeps `_status: published` but takes the story off the site: no rule may stop it.
  if ((to ?? from) === 'withdrawn') return 'draft'
  if (data._status === 'published' && !restoringAsDraft) return 'publish'
  if (to && to !== from) {
    if ((to === 'ready' || to === 'scheduled') && from !== 'ready' && from !== 'scheduled') return 'approve'
    if (to === 'in_edit' && (from === undefined || from === 'idea' || from === 'draft')) return 'submit'
  }
  return 'draft'
}

/** Findings to store: acknowledgements carried over by key, then the ones this request adds or removes. */
export function storeChecks(findings: Finding[], fields: Field[], gate: Gate, previous: unknown, req: PayloadRequest, id: Id | undefined): StoredChecks {
  const prev = (previous && typeof previous === 'object' ? previous : undefined) as StoredChecks | undefined
  const acks = new Map((prev?.findings ?? []).filter((f) => f.acknowledged).map((f) => [f.key, f.acknowledged]))
  const ack = req.context?.[ACK_KEY] as AckRequest | undefined
  const now = new Date().toISOString()
  const stored: StoredFinding[] = toStored(findings, fields).map((f) => {
    let acknowledged = f.level === 'warning' ? acks.get(f.key) : undefined
    if (ack && id !== undefined && String(ack.id) === String(id) && ack.keys.includes(f.key) && f.level === 'warning')
      acknowledged = ack.undo ? undefined : { by: ack.by, byName: ack.byName, at: now }
    return acknowledged ? { ...f, acknowledged } : f
  })
  const fix = req.context?.[FIX_KEY] as FixRecord | undefined
  const fixes = [...(prev?.fixes ?? [])]
  if (fix && id !== undefined && String(fix.id) === String(id)) for (const e of fix.entries) fixes.push({ at: now, by: fix.by, rule: e.rule, field: e.field })
  return {
    version: 1,
    checkedAt: now,
    gate,
    errors: stored.filter((f) => f.level === 'error').length,
    warnings: stored.filter((f) => f.level === 'warning').length,
    findings: stored,
    ...(fixes.length ? { fixes: fixes.slice(-50) } : {}),
  }
}

/** beforeChange on articles: the full §7.2 set; see the module comment for what blocks. */
export const validateArticle: CollectionBeforeChangeHook = async ({ collection, data, originalDoc, operation, req }) => {
  // The workflow's own follow-up writes (translation status after a correction, a failed schedule) change no
  // content: the save they follow was checked, and running publish mode again in another locale only costs.
  if (req.context?.workflowSync) return data
  const id = (originalDoc as Doc | undefined)?.id as Id | undefined
  const gate = articleGate(data as Doc, originalDoc as Doc | undefined, req)
  const fields = collection.fields
  const { findings, presence } = await checkArticleDoc({ req, id, fields, data: data as Doc, originalDoc: originalDoc as Doc | undefined, gate })
  const errors = findings.filter((f) => f.level === 'error')
  // A create writes the main row whatever the gate, so a duplicate slug would fail there as a raw unique error.
  // Only that one: the admin creates an empty draft (no title, no slug) the moment an editor opens "new story".
  const blocking = dedupe([...(gate === 'publish' || gate === 'approve' ? errors : gate === 'submit' ? presence : []), ...(operation === 'create' ? errors.filter(isDuplicateSlug) : [])])
  if (blocking.length) throw validationError(blocking, fields, req, { collection: collection.slug, id })
  if (gate === 'publish' && id !== undefined) {
    const history = await recordSlugChange(req, id, data as Doc, originalDoc as Doc | undefined)
    if (history) (data as Doc).slugHistory = history
  }
  // Non-blocking findings of the workflow concern, which runs first (embargo at midnight, a translation that will
  // not be shown): stored with ours so the checks panel lists them too.
  const workflow = ((req.context?.workflowWarnings ?? []) as { rule: string; path: string; message: string }[])
    .filter((w) => !findings.some((f) => f.message === w.message))
    .map((w): Finding => ({ ...w, level: 'warning' }))
  ;(data as Doc).validationWarnings = storeChecks([...findings, ...workflow], fields, gate, (originalDoc as Doc | undefined)?.validationWarnings, req, id)
  return data
}

/** Collections whose every save makes the change public (no drafts). */
const NO_DRAFTS = new Set(['media', 'telegram-posts'])

/** beforeChange on the other collections: errors block a publish (every save, without drafts). */
export const validateDoc: CollectionBeforeChangeHook = async ({ collection, data, originalDoc, req }) => {
  const id = (originalDoc as Doc | undefined)?.id as Id | undefined
  const restoringAsDraft = req.context?.isRestoringVersion === true && draftArg(req) === true
  const publishing = NO_DRAFTS.has(collection.slug) || ((data as Doc)._status === 'published' && !restoringAsDraft)
  if (!publishing) return data
  const findings = await checkCollectionDoc({ req, slug: collection.slug, id, fields: collection.fields, data: data as Doc, originalDoc: originalDoc as Doc | undefined, gate: 'publish' })
  const errors = dedupe(findings.filter((f) => f.level === 'error'))
  if (errors.length) throw validationError(errors, collection.fields, req, { collection: collection.slug, id })
  return data
}

/** Globals with drafts: a save publishes when `_status` is published, or when it is a non-draft save without a status. */
const GLOBAL_DRAFTS = new Set(['home-page', 'navigation', 'ad-slots'])

export const rememberGlobalDraftArg: GlobalBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'update' || operation === 'restoreVersion') req.context[DRAFT_KEY] = Boolean((args as { draft?: boolean }).draft)
  return args
}

/** beforeChange on globals: SET-1, SP-7, HOME-1/2 and the text rules. */
export const validateGlobal: GlobalBeforeChangeHook = async ({ data, global, originalDoc, req }) => {
  const status = (data as Doc)._status
  const publishing = !GLOBAL_DRAFTS.has(global.slug) || status === 'published' || (status === undefined && draftArg(req) === false)
  const errors = dedupe(await checkGlobalDoc({ req, slug: global.slug, fields: global.fields, data: data as Doc, originalDoc: originalDoc as Doc | undefined, publishing }))
  if (errors.length) throw validationError(errors, global.fields, req, { global: global.slug })
  return data
}

/**
 * beforeOperation on globals, for version restore: Payload restores a global
 * version without running any hook or field validation and publishes it at
 * once (PHASE0 item 12), so SET-1, SP-7 and HOME-1/2 are re-run here on the
 * version being restored. Who may restore is the security concern's.
 */
export const guardGlobalRestore: GlobalBeforeOperationHook = async ({ args, global, operation, req }) => {
  if (operation !== 'restoreVersion') return args
  const { id, draft } = args as { id?: Id; draft?: boolean }
  if (id === undefined || (draft && GLOBAL_DRAFTS.has(global.slug))) return args
  const version = (await req.payload
    .findGlobalVersionByID({ slug: global.slug as never, id: String(id), depth: 0, locale: 'all', overrideAccess: true, disableErrors: true, req: isolated(req) })
    .catch(() => null)) as { version?: Doc } | null
  const doc = version?.version
  if (!doc) return args
  let findings: Finding[] = []
  if (global.slug === 'site-settings') findings = [...launchGate(doc), ...labelRules(doc.labels, 'all')]
  if (global.slug === 'home-page') findings = await homeRules(req, doc)
  if (findings.length) throw validationError(findings, global.fields, req, { global: global.slug })
  return args
}
