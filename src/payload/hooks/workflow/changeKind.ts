import { correctionsPublishedNow } from './corrections'
import { appendHistory } from './editing'
import { editorialHash, numberMultiset } from './hash'
import { queueNotice } from './notify'
import { isAuthorOrSubmitter, type Save } from './save'
import { canonical, conflict, type Doc, fieldError, forbidden, type Id, idOf, idsOf, isBlank, MINUTE, nowIso, pendingFor, time } from './shared'

/**
 * Publishing a change to a public story (CMS-SPEC §5.6). Saving a draft of a
 * published story is free; publishing it needs `changeNote.kind` whenever the
 * editorial content (the §5.3.1 hash fields) changed or a correction is
 * added. A publish that changes nothing editorial (a translation, tags, SEO,
 * the second-read mark, a withdrawal notice) needs no kind.
 *
 * The note is written to the workflow history of this version and to the
 * audit log, then cleared in the same write, so the next change starts empty.
 */

export const KIND_LABELS: Record<string, string> = {
  minor: 'Mayda tahrir',
  update: 'Yangilanish',
  correction: 'Tuzatish',
  clarification: 'Aniqlik kiritish',
  editors_note: 'Tahririyat izohi',
}

const TWO_HOURS = 120 * MINUTE

export async function changeRules(s: Save): Promise<void> {
  const live = (await s.mainRow()) ?? {}
  const next = await s.uz()
  const nextHash = s.locale === 'uz' ? editorialHash(s.merged) : editorialHash(await s.storedUz(), s.merged)
  const liveHash = editorialHash(live)
  const added = await correctionsPublishedNow(s)
  const work = pendingFor(s.req, s.id)
  const t = s.transition

  if (t?.id === 'withdraw' && nextHash !== liveHash) {
    throw conflict('Bu maqolada chop etilmagan matn oʻzgarishlari bor. Olib tashlashdan oldin ularni chop eting yoki chop etilgan versiyani qoralama sifatida tiklang.')
  }

  const note = (s.merged.changeNote ?? {}) as Doc
  const clearNote = () => {
    s.data.changeNote = { kind: null, reason: null, numbersOverride: false }
  }
  if (nextHash === liveHash && !added.length) {
    clearNote()
    return
  }

  const kind = note.kind as string | undefined
  const reason = typeof note.reason === 'string' ? note.reason.trim() : ''
  if (!kind) {
    throw fieldError(s.req, 'changeNote.kind', 'Chop etilgan maqoladagi oʻzgarish turini tanlang («Nashr» → «Oʻzgarish izohi»).')
  }
  const actorIsAuthor = !s.system && (await isAuthorOrSubmitter(s, s.actor))
  const isEic = s.role === 'eic' || s.system
  const addedKinds = new Set(added.map((r) => String(r.kind ?? 'correction')))

  switch (kind) {
    case 'minor':
    case 'update':
      if (isBlank(reason)) throw fieldError(s.req, 'changeNote.reason', `«${KIND_LABELS[kind]}» uchun sababni yozing.`)
      if (added.length) throw fieldError(s.req, 'changeNote.kind', 'Tuzatish qoʻshilgan: oʻzgarish turi «Tuzatish», «Aniqlik kiritish» yoki «Tahririyat izohi» boʻlishi kerak.')
      if (kind === 'minor' && s.sponsored() && !isEic) throw forbidden('Homiylik materialidagi mayda tahrirni faqat bosh muharrir chop etadi.')
      break
    case 'correction':
      if (!isEic && actorIsAuthor) throw forbidden('Tuzatishni muallif boʻlmagan muharrir chop etadi.')
      if (!addedKinds.has('correction')) {
        throw fieldError(s.req, 'corrections', '«Tuzatish» turi uchun «Tuzatishlar» boʻlimiga yangi tuzatish yozuvini qoʻshing.')
      }
      break
    case 'clarification':
    case 'editors_note':
      if (!isEic) throw forbidden(`«${KIND_LABELS[kind]}»ni faqat bosh muharrir chop etadi.`)
      if (!addedKinds.has(kind)) throw fieldError(s.req, 'corrections', `«${KIND_LABELS[kind]}» turidagi yangi yozuvni «Tuzatishlar» boʻlimiga qoʻshing.`)
      break
    default:
      throw fieldError(s.req, 'changeNote.kind', 'Nomaʼlum oʻzgarish turi.')
  }

  // N-1: a changed number is a correction (Reuters).
  if (kind === 'minor') {
    const overridden = Boolean(note.numbersOverride) && s.role === 'eic' && !isBlank(reason)
    if (!overridden && canonical(numberMultiset(live)) !== canonical(numberMultiset(next))) {
      throw fieldError(s.req, 'changeNote.kind', 'Raqam oʻzgardi — bu tuzatish. Oʻzgarish turini «Tuzatish» qiling.')
    }
  }
  // N-2: a headline changed more than two hours after first publication.
  const first = time(s.original.firstPublishedAt ?? live.firstPublishedAt)
  const titleChanged = String(live.title ?? '').trim() !== String(next.title ?? '').trim()
  if (titleChanged && first !== undefined && s.now - first > TWO_HOURS) {
    if (kind === 'minor') throw fieldError(s.req, 'changeNote.kind', 'Sarlavha chop etilgandan 2 soat keyin oʻzgardi: bu mayda tahrir emas.')
    if (actorIsAuthor) throw forbidden('Chop etilgandan 2 soat keyin sarlavhani muallif boʻlmagan muharrir oʻzgartiradi.')
  }
  // N-3: a changed entity tag is a correction.
  const entities = (d: Doc) => canonical({ about: idOf(d.about) ?? null, mentions: idsOf(d.mentions).map(String).sort() })
  if (kind === 'minor' && entities(live) !== entities(s.merged)) {
    throw fieldError(s.req, 'changeNote.kind', '«Asosiy tashkilot» yoki «Tilga olingan tashkilotlar» oʻzgardi: bu mayda tahrir emas.')
  }

  // Effects.
  if (kind !== 'minor') {
    s.data.significantUpdateAt = nowIso()
    work.outdate = { hidden: kind !== 'update' }
  }
  if (kind === 'update' && actorIsAuthor && !isEic) {
    s.data.secondRead = { required: true, dueAt: new Date(s.now + 30 * MINUTE).toISOString(), doneBy: null, doneAt: null, outcome: null, escalatedAt: null }
    queueNotice(s.req, {
      kind: 'second_read_due',
      audience: 'desk',
      articleId: s.id,
      title: (next.title as string | undefined) ?? undefined,
      text: 'Ikkinchi oʻqish kerak: muallif-muharrir yangilanishni chop etdi.',
      expectState: s.state,
    })
  }
  if (added.length) work.publishedCorrections = added.map((r) => ({ id: String(r.id), request: idOf(r.request) as Id | undefined }))
  s.ctx.workflowChange = { kind, reason, numbersOverride: Boolean(note.numbersOverride) }
  appendHistory(s, s.state, String(s.data.workflowStatus ?? s.state), `${KIND_LABELS[kind]}: ${reason || '—'}`)
  clearNote()
}
