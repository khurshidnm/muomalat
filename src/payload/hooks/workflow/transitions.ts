import { appendHistory } from './editing'
import { editorialHash } from './hash'
import { queueNotice } from './notify'
import { isAuthorOrSubmitter, isOwner, type Save } from './save'
import {
  badRequest,
  conflict,
  type Doc,
  fieldError,
  forbidden,
  type Id,
  idOf,
  idsOf,
  isBlank,
  MINUTE,
  nowIso,
  pendingFor,
  PRE_PUBLICATION,
  STATE_LABELS,
  time,
  type TransitionId,
  type TransitionRequest,
  TRANSLATED,
  type WorkflowState,
} from './shared'
import { requiresEic, eicAuthorException } from './tiers'

/**
 * The transition table of CMS-SPEC §5.2. Transitions are requested through
 * `POST /api/articles/:id/transition` (or by the worker) and carried out by
 * the articles beforeChange hook, which finds the request in
 * `req.context.transition`: the endpoint only chooses `draft` and `_status`.
 * The hook checks the table again, so a Local API caller cannot skip it.
 *
 * Publishing transitions (`publish`, `urgent`, `restore`) also pass the
 * two-person rule (./twoPerson), which runs on every write that publishes.
 */

/** How the endpoint writes the transition. */
export type WriteMode = 'draft' | 'publish' | 'unpublish' | 'auto'

export interface TransitionDef {
  id: TransitionId
  from: WorkflowState[]
  /** `null`: no state change (take, second read). */
  to: WorkflowState | null
  /** Button label (Uzbek). */
  label: string
  write: WriteMode
  comment?: 'required' | 'optional'
  /** Throws if this user may not perform it on this story. */
  allow(s: Save): Promise<void>
  /** Throws if the story is not ready for it. */
  guard?(s: Save, t: TransitionRequest): Promise<void>
  /** Sets the system fields. The history row is added by the caller. */
  apply?(s: Save, t: TransitionRequest): Promise<void> | void
}

// ── who ─────────────────────────────────────────────────────────────────────
/** "Editors" of §5.1: an editor on editorial stories, the editor-in-chief on all (sponsored: the editor-in-chief only). */
const desk = async (s: Save, what: string) => {
  if (s.system || s.role === 'eic') return
  if (s.role === 'editor' && !s.sponsored()) return
  throw forbidden(s.sponsored() ? `Homiylik materialida «${what}»ni faqat bosh muharrir bajaradi.` : `«${what}»ni faqat muharrir bajaradi.`)
}
const eicOnly = async (s: Save, what: string) => {
  if (s.system || s.role === 'eic') return
  throw forbidden(`«${what}»ni faqat bosh muharrir bajaradi.`)
}
/** The writers of §5.2 "Author, assignee, editor; commercial for sponsored". */
const writerOrDesk = async (s: Save, what: string) => {
  if (s.role === 'reporter' && !s.sponsored() && isOwner(s, s.actor)) return
  if (s.role === 'commercial' && s.sponsored()) return
  await desk(s, what)
}
const notAuthor = async (s: Save, message: string) => {
  if (s.system) return
  if (await isAuthorOrSubmitter(s, s.actor)) throw forbidden(message)
}

// ── guards ──────────────────────────────────────────────────────────────────
/** Submit mode (§5.2): title, lead, rubric, at least one author and one source; every gap listed at once. */
export async function presenceErrors(s: Save): Promise<{ path: string; message: string }[]> {
  const uz = await s.uz()
  const errors: { path: string; message: string }[] = []
  if (isBlank(uz.title)) errors.push({ path: 'title', message: 'Oʻzbekcha sarlavhani yozing.' })
  if (isBlank(uz.lead)) errors.push({ path: 'lead', message: 'Oʻzbekcha lidni yozing.' })
  if (idOf(s.merged.rubric) === undefined) errors.push({ path: 'rubric', message: 'Rubrikani tanlang.' })
  if (!idsOf(s.merged.authors).length) errors.push({ path: 'authors', message: 'Kamida bitta muallifni tanlang.' })
  if (!((s.merged.sources as unknown[] | undefined) ?? []).length) errors.push({ path: 'sources', message: 'Kamida bitta manba qoʻshing.' })
  return errors
}
const requirePresence = async (s: Save) => {
  const errors = await presenceErrors(s)
  if (errors.length) throw fieldError(s.req, errors)
}

/** Can this user publish the story once it is approved (used at approve and schedule time, re-checked at publish). */
export async function assertPublisherFor(s: Save, user: Id | undefined, role: string | undefined) {
  if (await isAuthorOrSubmitter(s, user)) throw forbidden('Oʻz maqolangizni chop eta olmaysiz: tasdiqlash va chop etish muallif boʻlmagan muharrirning ishi.')
  if ((await requiresEic(s)) && role !== 'eic' && !(await eicAuthorException(s))) {
    throw forbidden('Bu maqolani bosh muharrir tasdiqlaydi va chop etadi (yuridik koʻrik, anonim manba, homiylik yoki manfaatlar toʻqnashuvi).')
  }
}

const needsComment = (t: TransitionRequest, what: string) => {
  if (isBlank(t.comment)) throw badRequest(`«${what}» uchun izoh yozing.`)
}

// ── the table ───────────────────────────────────────────────────────────────
const LABEL = {
  start: 'Qoralamaga oʻtkazish',
  submit: 'Tahrirga yuborish',
  take: 'Tahrirga olish',
  rework: 'Qayta ishlashga',
  approve: 'Tasdiqlash',
  schedule: 'Rejalashtirish',
  unschedule: 'Rejani bekor qilish',
  publish: 'Chop etish',
  urgent: 'Shoshilinch chop etish',
  hold: 'Toʻxtatish',
  release: 'Qoralamaga qaytarish',
  withdraw: 'Olib tashlash',
  restore: 'Qayta tiklash',
  unpublish: 'Nashrdan olish (xato chop etilgan)',
  secondRead: 'Ikkinchi oʻqish bajarildi',
} satisfies Record<TransitionId, string>

export const TRANSITIONS: Record<TransitionId, TransitionDef> = {
  start: {
    id: 'start',
    from: ['idea'],
    to: 'draft',
    label: LABEL.start,
    write: 'draft',
    allow: (s) => writerOrDesk(s, LABEL.start),
    guard: async (s) => {
      if (idOf(s.merged.assignee) === undefined) throw fieldError(s.req, 'assignee', 'Avval masʼul muxbirni tanlang.')
    },
  },
  submit: {
    id: 'submit',
    from: ['draft'],
    to: 'in_edit',
    label: LABEL.submit,
    write: 'draft',
    allow: (s) => writerOrDesk(s, LABEL.submit),
    guard: requirePresence,
    apply: (s) => {
      s.data.submittedBy = s.actor ?? null
      s.data.submittedAt = nowIso()
      queueNotice(s.req, {
        kind: 'submitted',
        audience: s.sponsored() ? 'eic' : 'desk',
        articleId: s.id,
        title: (s.merged.title as string | undefined) ?? undefined,
        text: s.sponsored() ? 'Homiylik materiali bosh muharrir navbatida.' : 'Tahrirga yuborildi: «Tahrir navbati».',
        expectState: 'in_edit',
      })
    },
  },
  take: {
    id: 'take',
    from: ['in_edit'],
    to: null,
    label: LABEL.take,
    write: 'draft',
    allow: async (s) => {
      await desk(s, LABEL.take)
      await notAuthor(s, 'Oʻz maqolangizni tahrirga ololmaysiz.')
    },
    guard: async (s) => {
      const current = idOf(s.original.deskEditor)
      if (current !== undefined && String(current) !== String(s.actor) && s.role !== 'eic') {
        throw conflict('Maqolani boshqa muharrir tahrirga olgan. Uni faqat bosh muharrir qayta biriktira oladi.')
      }
    },
    apply: (s) => {
      s.data.deskEditor = s.actor ?? null
    },
  },
  rework: {
    id: 'rework',
    from: ['in_edit'],
    to: 'draft',
    label: LABEL.rework,
    write: 'draft',
    comment: 'required',
    allow: (s) => desk(s, LABEL.rework),
    guard: async (_s, t) => needsComment(t, LABEL.rework),
    apply: async (s, t) => {
      s.data.deskEditor = null
      const users = [...(await s.authorUsers()), idOf(s.merged.assignee)].filter((x): x is Id => x !== undefined)
      queueNotice(s.req, {
        kind: 'sent_back',
        audience: 'users',
        userIds: [...new Set(users.map(String))],
        articleId: s.id,
        title: (s.merged.title as string | undefined) ?? undefined,
        text: `Qayta ishlashga qaytarildi: ${t.comment}`,
        expectState: 'draft',
      })
    },
  },
  approve: {
    id: 'approve',
    from: ['in_edit'],
    to: 'ready',
    label: LABEL.approve,
    write: 'draft',
    allow: async (s) => {
      await desk(s, LABEL.approve)
      await notAuthor(s, 'Oʻz maqolangizni tasdiqlay olmaysiz: tasdiqlovchi muallif yoki yuboruvchi boʻlmasligi kerak.')
    },
    guard: async (s) => {
      await requirePresence(s)
      if (s.merged.needsLegal === 'required') throw fieldError(s.req, 'needsLegal', 'Yuridik koʻrik tugallanmagan: bosh muharrir «Bajarildi»ni belgilashi kerak.')
      await assertPublisherFor(s, s.actor, s.role)
    },
    apply: async (s) => {
      s.data.approvedBy = s.actor ?? null
      s.data.approvedAt = nowIso()
      s.data.approvedContentHash = s.locale === 'uz' ? editorialHash(s.merged) : editorialHash(await s.storedUz(), s.merged)
      queueNotice(s.req, {
        kind: 'approved',
        audience: 'users',
        userIds: (await s.authorUsers()).map(String),
        articleId: s.id,
        title: (s.merged.title as string | undefined) ?? undefined,
        text: 'Tasdiqlandi: chop etishga tayyor.',
        expectState: 'ready',
      })
    },
  },
  schedule: {
    id: 'schedule',
    from: ['ready'],
    to: 'scheduled',
    label: LABEL.schedule,
    write: 'draft',
    allow: (s) => desk(s, LABEL.schedule),
    guard: async (s, t) => {
      const at = time(t.scheduledAt)
      if (at === undefined) throw fieldError(s.req, 'scheduledAt', 'Chop etish vaqtini kiriting.')
      if (at < s.now + MINUTE) throw fieldError(s.req, 'scheduledAt', 'Rejalashtirilgan vaqt kamida 1 daqiqa keyin boʻlishi kerak.')
      const e = (s.merged.embargo ?? {}) as Doc
      if (e.indefinite) throw fieldError(s.req, 'scheduledAt', 'Muddatsiz embargo amalda: maqolani rejalashtirib boʻlmaydi.')
      const until = time(e.until)
      if (until !== undefined && at < until) throw fieldError(s.req, 'scheduledAt', 'Rejalashtirilgan vaqt embargo tugashidan oldin boʻlmasligi kerak.')
      // The worker publishes as the scheduling user: refuse now what the run would refuse.
      await assertPublisherFor(s, s.actor, s.role)
    },
    apply: (s, t) => {
      s.data.scheduledAt = new Date(time(t.scheduledAt)!).toISOString()
      s.data.scheduledBy = s.actor ?? null
      s.data.scheduleError = null
    },
  },
  unschedule: {
    id: 'unschedule',
    from: ['scheduled'],
    to: 'ready',
    label: LABEL.unschedule,
    write: 'draft',
    allow: (s) => desk(s, LABEL.unschedule),
    apply: (s) => {
      s.data.scheduledBy = null
      s.data.scheduleError = null
    },
  },
  publish: {
    id: 'publish',
    from: ['ready', 'scheduled'],
    to: 'published',
    label: LABEL.publish,
    write: 'publish',
    // The two-person rule decides (./twoPerson); this only keeps non-publishers out early.
    allow: (s) => desk(s, LABEL.publish),
  },
  urgent: {
    id: 'urgent',
    from: ['draft'],
    to: 'published',
    label: LABEL.urgent,
    write: 'publish',
    allow: (s) => desk(s, LABEL.urgent),
  },
  hold: {
    id: 'hold',
    from: PRE_PUBLICATION,
    to: 'hold',
    label: LABEL.hold,
    write: 'draft',
    comment: 'required',
    allow: (s) => desk(s, LABEL.hold),
    guard: async (_s, t) => needsComment(t, LABEL.hold),
    apply: (s) => {
      if (s.state === 'ready' || s.state === 'scheduled') {
        s.data.approvedBy = null
        s.data.approvedAt = null
        s.data.approvedContentHash = null
        s.data.scheduledBy = null
      }
    },
  },
  release: {
    id: 'release',
    from: ['hold'],
    to: 'draft',
    label: LABEL.release,
    write: 'draft',
    allow: (s) => desk(s, LABEL.release),
  },
  withdraw: {
    id: 'withdraw',
    from: ['published'],
    to: 'withdrawn',
    label: LABEL.withdraw,
    write: 'publish',
    allow: (s) => eicOnly(s, LABEL.withdraw),
    guard: async (s) => {
      const errors: { path: string; message: string }[] = []
      const w = (s.merged.withdrawal ?? {}) as Doc
      const all = await s.allLocales()
      const notice = ((all.withdrawal as Doc | undefined)?.publicNotice ?? {}) as Record<string, unknown>
      const noticeIn = (l: string) => (s.locale === l ? w.publicNotice : notice[l])
      if (isBlank(noticeIn('uz'))) errors.push({ path: 'withdrawal.publicNotice', message: 'Oʻquvchilar uchun izohni oʻzbekcha yozing.' })
      const tr = (all.translation ?? {}) as Record<string, Doc | undefined>
      for (const l of TRANSLATED) {
        if (tr[l]?.status === 'approved' && isBlank(noticeIn(l))) {
          errors.push({ path: 'withdrawal.publicNotice', message: `${l} tarjimasi tasdiqlangan: izohni ${l} tilida ham yozing.` })
        }
      }
      if (isBlank(w.internalReason)) errors.push({ path: 'withdrawal.internalReason', message: 'Ichki sababni yozing.' })
      if (w.hideTitle && s.merged.legalHold) errors.push({ path: 'withdrawal.hideTitle', message: 'Yuridik saqlovdagi maqolaning sarlavhasi yashirilmaydi.' })
      if (errors.length) throw fieldError(s.req, errors)
    },
    apply: (s) => {
      const w = (s.data.withdrawal ?? {}) as Doc
      s.data.withdrawal = { ...w, at: nowIso(), by: s.actor ?? null }
      s.data.noindex = true
      pendingFor(s.req, s.id).events.push({ action: 'article.withdraw', summary: 'published → withdrawn' })
    },
  },
  restore: {
    id: 'restore',
    from: ['withdrawn'],
    to: 'published',
    label: LABEL.restore,
    write: 'publish',
    comment: 'required',
    allow: (s) => eicOnly(s, LABEL.restore),
    guard: async (_s, t) => needsComment(t, LABEL.restore),
    apply: (s) => {
      const w = (s.data.withdrawal ?? {}) as Doc
      s.data.withdrawal = { ...w, at: null, by: null, hideTitle: false }
      s.data.noindex = false
      pendingFor(s.req, s.id).events.push({ action: 'article.restore', summary: 'withdrawn → published' })
    },
  },
  unpublish: {
    id: 'unpublish',
    from: ['published'],
    to: 'draft',
    label: LABEL.unpublish,
    write: 'unpublish',
    comment: 'required',
    allow: (s) => eicOnly(s, LABEL.unpublish),
    guard: async (s, t) => {
      needsComment(t, LABEL.unpublish)
      assertUnpublishWindow(s)
    },
    apply: (s) => {
      s.data.approvedBy = null
      s.data.approvedAt = null
      s.data.approvedContentHash = null
    },
  },
  secondRead: {
    id: 'secondRead',
    from: ['published', 'withdrawn'],
    to: null,
    label: LABEL.secondRead,
    write: 'auto',
    allow: async (s) => {
      await desk(s, LABEL.secondRead)
      await notAuthor(s, 'Ikkinchi oʻqishni muallif boʻlmagan muharrir bajaradi.')
    },
    guard: async (s, t) => {
      const sr = (s.original.secondRead ?? {}) as Doc
      if (!sr.required) throw conflict('Bu maqola uchun ikkinchi oʻqish talab qilinmagan.')
      if (sr.doneAt) throw conflict('Ikkinchi oʻqish allaqachon bajarilgan.')
      if (!t.outcome || !['ok', 'minor_fix', 'correction'].includes(t.outcome)) throw badRequest('Ikkinchi oʻqish natijasini tanlang.')
    },
    apply: (s, t) => {
      const sr = (s.data.secondRead ?? {}) as Doc
      s.data.secondRead = { ...sr, doneBy: s.actor ?? null, doneAt: nowIso(), outcome: t.outcome }
    },
  },
}

/** Accidental unpublish (§5.2): at most 15 minutes after first publication. */
export function assertUnpublishWindow(s: Save) {
  const first = time(s.original.firstPublishedAt)
  if (first === undefined || s.now - first > 15 * MINUTE) {
    throw forbidden('Chop etilgan maqola oʻchirilmaydi — «Olib tashlash»dan foydalaning. Nashrdan olish faqat birinchi chop etishdan keyin 15 daqiqa ichida mumkin.')
  }
}

/**
 * Carries out `req.context.transition` inside the articles beforeChange hook:
 * checks the table, the role and the guards, sets the system fields, appends
 * the history row and queues the audit event.
 */
export async function applyTransition(s: Save): Promise<void> {
  const t = s.transition!
  const def = TRANSITIONS[t.id]
  if (!def) throw badRequest('Nomaʼlum ish jarayoni amali.')
  if (!def.from.includes(s.state)) {
    throw conflict(`«${def.label}» «${STATE_LABELS[s.state]}» holatida mumkin emas.`)
  }
  await def.allow(s)
  await def.guard?.(s, t)
  await def.apply?.(s, t)
  // Publishing transitions get their state, history and event from the two-person rule.
  if (def.id === 'publish' || def.id === 'urgent') return
  const to = def.to ?? s.state
  if (def.to) s.data.workflowStatus = def.to
  const comment = t.comment || (def.id === 'secondRead' ? `Ikkinchi oʻqish: ${t.outcome}` : def.id === 'take' ? LABEL.take : undefined)
  appendHistory(s, s.state, to, comment)
  // Withdraw and restore have their own audit actions (article.withdraw, article.restore): one row per action.
  if (def.id !== 'withdraw' && def.id !== 'restore') {
    pendingFor(s.req, s.id).events.push({ action: 'workflow.transition', summary: `${s.state} → ${to}`, after: { transition: def.id, comment: comment ?? null } })
  }
}

/** Transitions offered to this user in this state (the admin's WorkflowActions; the hook still decides). */
export async function availableTransitions(s: Save): Promise<{ id: TransitionId; label: string; to: WorkflowState | null; comment: boolean; write: WriteMode }[]> {
  const out: { id: TransitionId; label: string; to: WorkflowState | null; comment: boolean; write: WriteMode }[] = []
  for (const def of Object.values(TRANSITIONS)) {
    if (!def.from.includes(s.state)) continue
    if (def.id === 'urgent' && !s.merged.urgent) continue
    if (def.id === 'secondRead') {
      const sr = (s.original.secondRead ?? {}) as Doc
      if (!sr.required || sr.doneAt) continue
    }
    if (def.id === 'unpublish') {
      const first = time(s.original.firstPublishedAt)
      if (first === undefined || s.now - first > 15 * MINUTE) continue
    }
    try {
      await def.allow(s)
      if (def.id === 'take' && idOf(s.original.deskEditor) !== undefined && String(idOf(s.original.deskEditor)) === String(s.actor)) continue
      out.push({ id: def.id, label: def.label, to: def.to, comment: def.comment === 'required', write: def.write })
    } catch {
      // not for this user
    }
  }
  return out
}

/** Resolve the request body's `to` (or `action`) to a transition for the current state. */
export function resolveTransition(state: WorkflowState, body: { to?: string; action?: string }): TransitionDef | undefined {
  if (body.action && Object.hasOwn(TRANSITIONS, body.action)) {
    const def = TRANSITIONS[body.action as TransitionId]
    return def.from.includes(state) ? def : undefined
  }
  const to = body.to as WorkflowState | undefined
  if (!to) return undefined
  if (state === 'in_edit' && to === 'in_edit') return TRANSITIONS.take
  if (state === 'draft' && to === 'published') return TRANSITIONS.urgent
  if (state === 'published' && to === 'draft') return TRANSITIONS.unpublish
  if (state === 'withdrawn' && to === 'published') return TRANSITIONS.restore
  return Object.values(TRANSITIONS).find((d) => d.to === to && d.from.includes(state) && d.id !== 'urgent' && d.id !== 'unpublish')
}

