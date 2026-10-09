import type { PayloadHandler, PayloadRequest } from 'payload'
import { addDataAndFileToRequest, APIError, commitTransaction, initTransaction, killTransaction, ValidationError } from 'payload'

import { embargoLabel } from '../hooks/workflow/embargo'
import { flushNotices, takeNotices } from '../hooks/workflow/notify'
import { buildSave } from '../hooks/workflow/save'
import { ARTICLES, conflict, type Doc, type Id, isolated, STATE_LABELS, stateOf, type TransitionRequest, wctx } from '../hooks/workflow/shared'
import { availableTransitions, resolveTransition } from '../hooks/workflow/transitions'

/**
 * `POST /api/articles/:id/transition` with `{ to | action, comment?, scheduledAt?, outcome?, withdrawal? }`
 * (CMS-SPEC §5.2), and `GET /api/articles/:id/transitions`, the buttons
 * WorkflowActions shows.
 *
 * The endpoint chooses how to write and leaves the rules to the articles
 * hooks, which read the request from `req.context.transition`:
 * - custom endpoints get no access control, so a request without a user is
 *   401 (a cookie from a foreign origin fails Payload's CSRF check and
 *   arrives here as anonymous, PHASE0 item 14), and the story is read with
 *   the caller's access;
 * - the body is parsed with addDataAndFileToRequest;
 * - `draft` is passed explicitly: `draft: true` for every transition that does
 *   not publish, so a live story keeps its live content (test B13);
 * - the update and its audit rows commit together (initTransaction, then
 *   commitTransaction or killTransaction); notifications go out after commit.
 */

type Body = {
  to?: string
  action?: string
  comment?: string
  scheduledAt?: string
  outcome?: TransitionRequest['outcome']
  withdrawal?: { publicNotice?: string; internalReason?: string; hideTitle?: boolean }
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

export function errorResponse(error: unknown): Response {
  if (error instanceof ValidationError) {
    const errors = (error.data as { errors?: { path: string; message: string }[] } | undefined)?.errors ?? []
    return json({ errors: [{ name: 'ValidationError', message: errors.map((e) => e.message).join(' ') || error.message, data: { errors } }] }, 400)
  }
  if (error instanceof APIError) return json({ errors: [{ name: error.name, message: error.message }] }, error.status || 400)
  const status = (error as { status?: number }).status
  return json({ errors: [{ message: (error as Error)?.message || 'Xatolik' }] }, typeof status === 'number' ? status : 500)
}

const idParam = (req: PayloadRequest): Id | undefined => {
  const raw = req.routeParams?.id
  if (typeof raw !== 'string' || raw === '') return undefined
  return /^\d+$/.test(raw) ? Number(raw) : raw
}

/** The latest version, read with the caller's access: who cannot read the story cannot move it. */
async function readAsCaller(req: PayloadRequest, id: Id, draft = true): Promise<Doc> {
  return (await req.payload.findByID({
    collection: ARTICLES,
    id,
    draft,
    depth: 0,
    locale: 'uz',
    overrideAccess: false,
    req: isolated(req),
  })) as unknown as Doc
}

export const transitionHandler: PayloadHandler = async (req) => {
  if (!req.user) return json({ errors: [{ message: 'Tizimga kiring.' }] }, 401)
  const id = idParam(req)
  if (id === undefined) return json({ errors: [{ message: 'Maqola koʻrsatilmagan.' }] }, 400)
  if (req.data === undefined) await addDataAndFileToRequest(req)
  const body = (req.data ?? {}) as Body

  let committed = false
  try {
    await initTransaction(req)
    const doc = await readAsCaller(req, id)
    const state = stateOf(doc)
    const def = resolveTransition(state, body)
    if (!def) throw conflict(`«${STATE_LABELS[state]}» holatidan bunday oʻtish yoʻq.`)

    let mode = def.write
    if (mode === 'auto') {
      // The second-read mark: on a story with unpublished changes it is saved with them, as a draft;
      // otherwise it is written to the live story without touching its content.
      mode = doc._status === 'published' ? 'publish' : 'draft'
    }
    const transition: TransitionRequest = {
      id: def.id,
      from: state,
      to: def.to ?? state,
      comment: typeof body.comment === 'string' ? body.comment.trim() : undefined,
      scheduledAt: body.scheduledAt,
      outcome: body.outcome,
    }
    const data: Doc = { _status: mode === 'publish' ? 'published' : 'draft' }
    if (def.id === 'schedule' && body.scheduledAt) data.scheduledAt = body.scheduledAt
    if (def.id === 'withdraw' && body.withdrawal) {
      const w = body.withdrawal
      data.withdrawal = Object.fromEntries(Object.entries({ publicNotice: w.publicNotice, internalReason: w.internalReason, hideTitle: w.hideTitle }).filter(([, v]) => v !== undefined))
    }

    const updated = (await req.payload.update({
      collection: ARTICLES,
      id,
      data: data as never,
      draft: mode === 'draft',
      depth: 0,
      req,
      overrideAccess: false,
      context: { transition, urgent: def.id === 'urgent' ? true : undefined, noticesFlushedBy: 'endpoint' },
    })) as unknown as Doc

    await commitTransaction(req)
    committed = true
    await flushNotices(req.payload, takeNotices(req))
    return json({
      message: `«${def.label}» bajarildi.`,
      doc: { id: updated.id, workflowStatus: updated.workflowStatus, _status: updated._status },
    })
  } catch (error) {
    if (!committed) await killTransaction(req)
    wctx(req).workflowNotices = []
    return errorResponse(error)
  }
}

/** Why the panel offers this user nothing, so nobody is left guessing (shown under «Siz uchun hozir amal yoʻq»). */
function idleHint(role: string | undefined, state: string, sponsored: boolean): string | null {
  if (role === 'reporter') {
    if (['in_edit', 'ready', 'scheduled', 'hold'].includes(state)) return 'Maqola muharrirda: bu bosqichda uni muharrir oʻzgartiradi va keyingi bosqichga oʻtkazadi.'
    if (state === 'published') return 'Oʻzgarishni qoralama sifatida saqlang; uni muharrir chop etadi.'
    if (state === 'idea' || state === 'draft') return 'Bu maqola sizga biriktirilmagan: amallarni muallif yoki masʼul muxbir bajaradi.'
  }
  if (role === 'commercial' && ['ready', 'scheduled', 'published'].includes(state)) return 'Homiylik materiali bosh muharrirda: u chop etadi yoki qaytaradi.'
  if (role === 'editor' && state === 'published' && !sponsored) {
    return 'Oʻzgarish yoki tuzatish uchun matnni tahrirlang, «Nashr» → «Oʻzgarish izohi»da turini tanlang va «Oʻzgarishlarni chop etish»ni bosing. Olib tashlash — bosh muharrir ishi.'
  }
  if (role === 'editor' && sponsored) return 'Homiylik materialini bosh muharrir yuritadi; muharrir uni faqat koʻradi.'
  if (role === 'admin') return 'Administrator tahririyat materiallarini oʻzgartirmaydi.'
  return null
}

export const transitionsListHandler: PayloadHandler = async (req) => {
  if (!req.user) return json({ errors: [{ message: 'Tizimga kiring.' }] }, 401)
  const id = idParam(req)
  if (id === undefined) return json({ errors: [{ message: 'Maqola koʻrsatilmagan.' }] }, 400)
  try {
    const doc = await readAsCaller(req, id)
    const main = (await req.payload.findByID({
      collection: ARTICLES,
      id,
      draft: false,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      req: isolated(req),
      select: { _status: true } as never,
    })) as Doc | null
    const s = buildSave({ req: isolated(req), data: {}, originalDoc: doc, operation: 'update' })
    const state = stateOf(doc)
    const sr = (doc.secondRead ?? {}) as Doc
    const transitions = await availableTransitions(s)
    return json({
      state,
      stateLabel: STATE_LABELS[state],
      live: main?._status === 'published',
      pendingChanges: main?._status === 'published' && doc._status === 'draft',
      embargo: embargoLabel(doc) ?? null,
      deskEditor: doc.deskEditor ?? null,
      approvedBy: doc.approvedBy ?? null,
      scheduledAt: doc.scheduledAt ?? null,
      scheduleError: doc.scheduleError ?? null,
      secondRead: sr.required && !sr.doneAt ? { dueAt: sr.dueAt ?? null } : null,
      transitions,
      hint: transitions.length ? null : idleHint(s.role, state, Boolean((doc.sponsored as Doc | undefined)?.enabled)),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
