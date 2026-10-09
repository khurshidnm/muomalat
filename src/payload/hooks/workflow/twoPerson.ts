import { changeRules } from './changeKind'
import { correctionsPublishedNow } from './corrections'
import { appendHistory } from './editing'
import { embargoActive } from './embargo'
import { editorialHash } from './hash'
import { queueNotice } from './notify'
import { isAuthorOrSubmitter, type Save } from './save'
import { type Doc, fieldError, forbidden, type Id, idOf, isBlank, MINUTE, nowIso, pendingFor, TRANSLATED, wctx } from './shared'
import { sponsoredPublishRules } from './sponsored'
import { eicAuthorException, requiresEic } from './tiers'
import { checkUrgent } from './urgent'

/**
 * Lock 3 of PHASE0 §1.2, the two-person rule (CMS-SPEC §5.3). Runs on every
 * write that publishes (`data._status === 'published'`, except a version
 * restored as a draft), whatever path it came from: the transition endpoint,
 * Payload's Publish button, REST, the Local API or the scheduler.
 *
 * Whether the story is public now comes from the main row, not from
 * `originalDoc` (the latest version). A story that is not public goes through
 * the first-publication rules, including one taken down by the accidental
 * unpublish; a public one through the change rules of §5.6.
 */
export async function publishRules(s: Save): Promise<void> {
  if (!s.system && s.role !== 'editor' && s.role !== 'eic') throw forbidden('Faqat muharrir chop eta oladi.')
  // Withdrawing, or marking the second read, rewrites the live row without new content: it must stay possible
  // whatever the flags say (a legal threat is a reason to withdraw). Only the no-pending-edits check applies.
  if (s.transition?.id === 'withdraw' || s.transition?.id === 'secondRead') {
    if (await s.mainPublished()) await changeRules(s)
    return
  }
  // Rules that hold for every publish.
  const errors: { path: string; message: string }[] = []
  if (s.merged.needsLegal === 'required') errors.push({ path: 'needsLegal', message: 'Yuridik koʻrik tugallanmagan: bosh muharrir «Bajarildi»ni belgilashi kerak.' })
  if (s.merged.needsLegal === 'complete' && idOf(((s.merged.legalSignOff ?? {}) as Doc).by) === undefined) {
    errors.push({ path: 'needsLegal', message: 'Yuridik koʻrik «Bajarildi», lekin bosh muharrir imzosi yoʻq.' })
  }
  if (s.merged.needsPicture === 'required') errors.push({ path: 'needsPicture', message: 'Rasm tayyor emas: «Rasm tayyorlash» hali «Kerak» holatida.' })
  if (errors.length) throw fieldError(s.req, errors)

  await sponsoredPublishRules(s)
  await translationWarnings(s)
  if (await s.mainPublished()) {
    await changeRules(s)
    return
  }
  await firstPublication(s)
}

/**
 * §6.3 "Publishing": a translation that is not approved is not shown, so
 * publishing is harmless, but the editor is told: «ru tarjima chop etilmaydi
 * (holati: in_edit)». Non-blocking; collected for the checks panel.
 */
async function translationWarnings(s: Save): Promise<void> {
  const all = await s.allLocales()
  const tr = (all.translation ?? {}) as Record<string, Doc | undefined>
  const titles = (all.title ?? {}) as Record<string, unknown>
  for (const l of TRANSLATED) {
    const status = (s.locale === l ? ((s.merged.translation ?? {}) as Doc).status : tr[l]?.status) ?? 'missing'
    const hasText = s.locale === l ? !isBlank(s.merged.title) : !isBlank(titles[l])
    if (hasText && status !== 'approved') {
      ;(wctx(s.req).workflowWarnings ??= []).push({ rule: 'TR-1', path: 'translation.status', message: `${l} tarjima chop etilmaydi (holati: ${String(status)})` })
    }
  }
}

async function firstPublication(s: Save): Promise<void> {
  const { data, original, merged } = s
  const work = pendingFor(s.req, s.id)
  const urgent = Boolean(s.ctx.urgent || s.transition?.id === 'urgent' || (merged.urgent && s.state === 'draft'))
  const actor = s.actor

  if (urgent && s.state === 'draft') {
    await checkUrgent(s)
    data.approvedBy = actor ?? null
    data.approvedAt = nowIso()
    data.approvedContentHash = s.locale === 'uz' ? editorialHash(merged) : editorialHash(await s.storedUz(), merged)
    data.secondRead = { required: true, dueAt: new Date(s.now + 30 * MINUTE).toISOString(), doneBy: null, doneAt: null, outcome: null, escalatedAt: null }
    queueNotice(s.req, {
      kind: 'second_read_due',
      audience: 'desk',
      articleId: s.id,
      title: (merged.title as string | undefined) ?? undefined,
      text: 'Ikkinchi oʻqish kerak: shoshilinch chop etildi, 30 daqiqa ichida muallif boʻlmagan muharrir oʻqib chiqsin.',
      expectState: 'published',
    })
    work.events.push({ action: 'workflow.urgent_publish', summary: `${s.state} → published (shoshilinch)` })
  } else {
    if (s.state !== 'ready' && s.state !== 'scheduled') {
      throw forbidden('Avval tasdiqlang: maqola «Tayyor» yoki «Rejalashtirilgan» holatida boʻlishi kerak.')
    }
    const approver = idOf(original.approvedBy)
    if (approver === undefined) throw forbidden('Tasdiq yoʻq: maqolani muallif boʻlmagan muharrir tasdiqlashi kerak.')
    if (await isAuthorOrSubmitter(s, approver)) throw forbidden('Tasdiqlovchi muallif yoki yuboruvchi boʻlmasligi kerak.')
    if (await isAuthorOrSubmitter(s, actor)) throw forbidden('Oʻz maqolangizni chop eta olmaysiz.')
    const hash = s.locale === 'uz' ? editorialHash(merged) : editorialHash(await s.storedUz(), merged)
    if (hash !== original.approvedContentHash) {
      // The approver may still polish their own approval (§5.2); anyone else's change cancels it. The
      // scheduler never refreshes: an edit that reached a scheduled story past the hooks must fail the run (E4).
      if (approver !== undefined && String(approver) === String(actor) && !s.ctx.scheduledRun) data.approvedContentHash = hash
      else throw forbidden('Tasdiqdan keyin oʻzgartirilgan: maqolani qayta tasdiqlash kerak.')
    }
    if ((await requiresEic(s)) && s.role !== 'eic' && !(await eicAuthorException(s))) {
      throw forbidden('Bosh muharrir tasdigʻi kerak: bu maqolani bosh muharrir chop etadi.')
    }
    if (embargoActive(merged, s.now)) throw forbidden('Embargo amalda: maqola embargo tugagach chop etiladi.')
    if (s.ctx.scheduledRun && s.state !== 'scheduled') throw forbidden('Rejalashtirish bekor qilingan.')
  }

  const now = nowIso()
  if (!original.firstPublishedAt) data.firstPublishedAt = now
  if (!original.publishedAt && !data.publishedAt) data.publishedAt = now
  data.publishedBy = actor ?? null
  data.workflowStatus = 'published'
  data.scheduleError = null
  appendHistory(s, s.state, 'published', s.transition?.comment || (urgent ? 'Shoshilinch chop etildi' : s.ctx.scheduledRun ? 'Rejaga koʻra chop etildi' : undefined))
  work.events.push({ action: 'workflow.transition', summary: `${s.state} → published`, after: { urgent, scheduled: Boolean(s.ctx.scheduledRun) } })
  if (s.ctx.scheduledRun) work.events.push({ action: 'schedule.run', summary: `scheduledAt ${String(original.scheduledAt ?? '')}` })
  const corrections = await correctionsPublishedNow(s)
  if (corrections.length) work.publishedCorrections = corrections.map((r) => ({ id: String(r.id), request: idOf(r.request) as Id | undefined }))
}
