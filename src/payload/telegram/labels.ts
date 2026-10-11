/**
 * Uzbek labels of the Telegram rows, for the admin components (client code:
 * no server imports here) and the server messages alike.
 */

export const STATUS_LABELS = {
  draft: 'Qoralama',
  approved: 'Tasdiqlangan',
  queued: 'Navbatda',
  sent: 'Yuborildi',
  edit_pending: 'Tahrir kutilmoqda',
  edited: 'Tahrirlandi',
  cancelled: 'Bekor qilindi',
  retracted: 'Qaytarib olindi',
  failed: 'Xato',
} as const

/**
 * `history.action` codes. A correction adds `:correction:<row id>`, which is
 * how the outbox recognises a correction it has already handled.
 */
export const HISTORY_LABELS: Record<string, string> = {
  created: 'Qoralama yaratildi',
  approved: 'Tasdiqlandi',
  cancelled: 'Bekor qilindi',
  sent: 'Kanalga yuborildi',
  failed: 'Xato',
  edit_requested: 'Tahrir soʻraldi',
  edited: 'Matn tahrirlandi',
  edit_cancelled: 'Tahrir bekor qilindi',
  approval_voided: 'Tasdiq bekor boʻldi',
  rebuilt: 'Matn maqoladan qayta yasaldi',
  deleted: 'Kanaldan oʻchirildi',
  retraction_caption: 'Matn olib tashlash xabariga almashtirildi',
  manual_deletion_confirmed: 'Qoʻlda oʻchirilgani tasdiqlandi',
  manual_post: 'Kanalga qoʻlda joylandi',
  manual_edit: 'Kanalda qoʻlda tahrirlandi',
}

export const mark = (action: string, correctionId?: string | null) => (correctionId ? `${action}:correction:${correctionId}` : action)
export const correctionOf = (action: string | null | undefined) => /:correction:([^:]+)$/.exec(action ?? '')?.[1]
export const actionOf = (action: string | null | undefined) => String(action ?? '').split(':')[0]

/** "Kanalga yuborildi (tuzatish)" for a history row. */
export function historyLabel(action: string | null | undefined): string {
  const base = HISTORY_LABELS[actionOf(action)] ?? actionOf(action) ?? '—'
  return correctionOf(action) ? `${base} (tuzatish)` : base
}
