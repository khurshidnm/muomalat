import type { Role } from '../../access/roles'
import { type Doc, type Id, idOf, idsOf, STATE_LABELS, TRANSLATED, type WorkflowState } from './shared'

/**
 * Who may change an article's content in which state (CMS-SPEC §4.2, §5.1,
 * SP-11), as one pure decision shared by the save hook (./editing, which
 * throws the message) and the articles update access (src/payload/access/
 * articles.ts, which turns the admin form read-only when the answer is no).
 *
 * - Reporter: own stories (author or assignee) in `idea`, `draft` and, as
 *   draft saves, `published` (test B1); a translator only in the locale they
 *   are assigned (the translation hook limits them to that locale's fields).
 * - Editor: every editorial story except withdrawn ones; never a sponsored
 *   story (SP-11).
 * - Editor-in-chief: everything.
 * - Commercial: sponsored stories in `idea`, `draft` and `in_edit`, before
 *   approval only.
 * - Legal hold: nobody but the editor-in-chief.
 *
 * Returns the Uzbek refusal, or null when the edit is allowed.
 */
export interface EditQuestion {
  role: Role | undefined
  actor: Id | undefined
  /** The stored workflow state. */
  state: WorkflowState
  /** The latest version as stored (assignee, `_authorUsers`, translation, legal hold, sponsorship). */
  doc: Doc
  locale: string
  /** Sponsored before or after this save. */
  sponsored: boolean
  /** A new story belongs to whoever creates it. */
  creating?: boolean
}

/** "own" of §4.2: an author (through the stored `_authorUsers`) or the assignee. */
export function ownsStory(doc: Doc, user: unknown, creating = false): boolean {
  const uid = idOf(user)
  if (uid === undefined) return false
  if (creating) return true
  if (String(idOf(doc.assignee)) === String(uid)) return true
  return idsOf(doc._authorUsers).some((x) => String(x) === String(uid))
}

export function editRefusal({ role, actor, state, doc, locale, sponsored, creating }: EditQuestion): string | null {
  if (role === 'eic') return null
  if (doc.legalHold) return 'Maqola yuridik saqlovda: uni faqat bosh muharrir oʻzgartira oladi.'
  if (state === 'withdrawn') return 'Olib tashlangan maqolani faqat bosh muharrir oʻzgartira oladi.'
  switch (role) {
    case 'editor':
      return sponsored ? 'Homiylik materialini faqat tijorat boʻlimi va bosh muharrir tahrirlaydi (SP-11).' : null
    case 'commercial':
      if (!sponsored) return 'Tijorat boʻlimi faqat homiylik materiallarini tahrirlaydi.'
      if (!['idea', 'draft', 'in_edit'].includes(state)) return `«${STATE_LABELS[state]}» holatidagi homiylik materialini faqat bosh muharrir oʻzgartiradi.`
      return null
    case 'reporter': {
      if (sponsored) return 'Homiylik materialini muxbir tahrirlay olmaydi.'
      if ((TRANSLATED as string[]).includes(locale)) {
        const tr = (doc.translation ?? {}) as Doc
        return String(idOf(tr.assignee)) === String(actor) ? null : `Bu maqolaning ${locale} tarjimasi sizga biriktirilmagan.`
      }
      if (!ownsStory(doc, actor, creating)) return 'Muxbir faqat oʻz maqolasini tahrirlaydi.'
      if (!['idea', 'draft', 'published'].includes(state)) return `«${STATE_LABELS[state]}» holatidagi maqolani muxbir oʻzgartira olmaydi: u muharrirda.`
      return null
    }
    default:
      return 'Bu maqolani tahrirlashga ruxsatingiz yoʻq.'
  }
}
