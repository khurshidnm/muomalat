import { editorialHash } from './hash'
import { queueNotice } from './notify'
import { editRefusal } from './editRules'
import type { Save } from './save'
import { type Doc, forbidden, idOf, nowIso, pendingFor } from './shared'

/** Who may change the content in this state (./editRules); a refused save fails loudly. */
export async function assertMayEdit(s: Save): Promise<void> {
  if (s.system) return
  const refusal = editRefusal({
    role: s.role,
    actor: s.actor,
    state: s.state,
    doc: s.original,
    locale: s.locale,
    sponsored: s.sponsored() || Boolean((s.original.sponsored as Doc | undefined)?.enabled),
    creating: s.operation === 'create',
  })
  if (refusal) throw forbidden(refusal)
}

/**
 * Approval follows the content (§5.2 automatic transitions). A change in
 * `ready` or `scheduled` that alters the editorial hash sends the story back
 * to `in_edit`, clears the approval and the schedule, and tells the
 * approver. When the approver makes the change, the hash is refreshed and
 * the approval stands.
 */
export async function approvalFollowsContent(s: Save): Promise<void> {
  if (s.state !== 'ready' && s.state !== 'scheduled') return
  const stored = s.original.approvedContentHash as string | undefined
  const hash = s.locale === 'uz' ? editorialHash(s.merged) : editorialHash(await s.storedUz(), s.merged)
  if (stored && hash === stored) return
  const approver = idOf(s.original.approvedBy)
  if (approver !== undefined && String(approver) === String(s.actor)) {
    s.data.approvedContentHash = hash
    return
  }
  voidApproval(s, 'Tasdiq bekor qilindi: tasdiqdan keyin oʻzgartirildi')
  const work = pendingFor(s.req, s.id)
  work.events.push({ action: 'workflow.approval_voided', summary: `${s.state} → in_edit`, before: { approvedBy: approver ?? null } })
  if (approver !== undefined) {
    queueNotice(s.req, {
      kind: 'approval_voided',
      audience: 'users',
      userIds: [approver],
      articleId: s.id,
      title: (s.merged.title as string | undefined) ?? undefined,
      text: 'Tasdiq bekor qilindi: tasdiqdan keyin oʻzgartirildi.',
      expectState: 'in_edit',
    })
  }
}

/** Back to `in_edit` with no approval and no schedule; one history row. */
export function voidApproval(s: Save, comment: string, to: 'in_edit' | 'hold' | 'draft' = 'in_edit') {
  const { data } = s
  data.workflowStatus = to
  data.approvedBy = null
  data.approvedAt = null
  data.approvedContentHash = null
  data.scheduledBy = null
  appendHistory(s, s.state, to, comment)
}

export function appendHistory(s: Save, from: string, to: string, comment?: string) {
  const rows = ((s.data.workflowHistory as Doc[] | undefined) ?? (s.original.workflowHistory as Doc[] | undefined) ?? []).map((r) => ({ ...r }))
  rows.push({ from, to, by: s.actor ?? null, at: nowIso(), comment: comment || null })
  s.data.workflowHistory = rows
}
