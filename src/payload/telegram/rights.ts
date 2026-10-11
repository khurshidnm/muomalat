import type { TgChatMember } from './client'

/**
 * The bot's rights check (CMS-SPEC §10.5, test I7). An allow-list: every
 * `can_*` key in the `getChatMember` result must be false except the four
 * below, so a right Telegram adds later (Bot API 10.3 added
 * `can_send_welcome_messages`) is refused by default. `can_manage_chat` is
 * allowed because Telegram reports it as true for every administrator
 * ("Implied by any other administrator privilege").
 *
 * Required: the bot is an administrator with `can_post_messages`. Editing and
 * deleting its own posts need no more than that; `can_edit_messages` and
 * `can_delete_messages` extend both to other admins' posts, so they are
 * allowed but not required (the least-privilege option of §10.5, to confirm
 * in staging with I5 and I6).
 */
export const ALLOWED_RIGHTS = ['can_post_messages', 'can_edit_messages', 'can_delete_messages', 'can_manage_chat'] as const
export const REQUIRED_RIGHTS = ['can_post_messages'] as const

export type RightsResult = {
  ok: boolean
  status: string
  /** `can_*` keys that are true and not on the allow-list. */
  unexpected: string[]
  /** Required keys that are missing or false. */
  missing: string[]
  /** Every `can_*` key that is true, for the record. */
  granted: string[]
}

export function checkRights(member: { status?: string } & Record<string, unknown>): RightsResult {
  const granted = Object.entries(member)
    .filter(([k, v]) => k.startsWith('can_') && v === true)
    .map(([k]) => k)
    .sort()
  const allowed = new Set<string>(ALLOWED_RIGHTS)
  // Any value other than false counts: a right reported as a string or number is not "off".
  const unexpected = Object.entries(member)
    .filter(([k, v]) => k.startsWith('can_') && !allowed.has(k) && v !== false && v !== undefined && v !== null)
    .map(([k]) => k)
    .sort()
  const missing = member.status === 'administrator' ? REQUIRED_RIGHTS.filter((k) => member[k] !== true) : [...REQUIRED_RIGHTS]
  const status = String(member.status ?? 'unknown')
  // A bot can never be the creator; anything but administrator means it cannot post.
  const ok = status === 'administrator' && !unexpected.length && !missing.length
  return { ok, status, unexpected, missing, granted }
}

/** One line for logs, alerts and the admin panel (Uzbek). */
export function describeRights(r: RightsResult): string {
  if (r.ok) return `Bot huquqlari joyida: ${r.granted.join(', ') || '—'}.`
  const parts: string[] = []
  if (r.status !== 'administrator') parts.push(`bot kanal administratori emas (holati: ${r.status})`)
  if (r.unexpected.length) parts.push(`ortiqcha huquqlar: ${r.unexpected.join(', ')}`)
  if (r.missing.length && r.status === 'administrator') parts.push(`yetishmaydi: ${r.missing.join(', ')}`)
  return `Bot huquqlari tekshiruvdan oʻtmadi: ${parts.join('; ')}.`
}

/** An administrator as the hourly snapshot keeps it (§10.6). */
export type AdminEntry = { id: number; name: string; username?: string; status: string; isBot: boolean; rights: string[] }

export function adminEntry(m: TgChatMember): AdminEntry {
  const u = m.user
  return {
    id: u.id,
    name: [u.first_name, u.last_name].filter(Boolean).join(' '),
    ...(u.username ? { username: u.username } : {}),
    status: m.status,
    isBot: Boolean(u.is_bot),
    rights: Object.entries(m)
      .filter(([k, v]) => k.startsWith('can_') && v === true)
      .map(([k]) => k)
      .sort(),
  }
}

export type AdminDiff = { added: AdminEntry[]; removed: AdminEntry[]; changed: { before: AdminEntry; after: AdminEntry }[] }

/** What changed between two snapshots: admins added, removed, or with other rights or status. */
export function diffAdmins(before: AdminEntry[], after: AdminEntry[]): AdminDiff {
  const old = new Map(before.map((a) => [a.id, a]))
  const now = new Map(after.map((a) => [a.id, a]))
  const added = after.filter((a) => !old.has(a.id))
  const removed = before.filter((a) => !now.has(a.id))
  const changed = after
    .filter((a) => old.has(a.id))
    .map((a) => ({ before: old.get(a.id)!, after: a }))
    .filter(({ before: b, after: a }) => b.status !== a.status || b.rights.join() !== a.rights.join())
  return { added, removed, changed }
}

export const isEmptyDiff = (d: AdminDiff) => !d.added.length && !d.removed.length && !d.changed.length

const who = (a: AdminEntry) => `${a.name || a.id}${a.username ? ` (@${a.username})` : ''}`

export function describeAdminDiff(d: AdminDiff): string {
  const parts: string[] = []
  if (d.added.length) parts.push(`qoʻshildi: ${d.added.map(who).join(', ')}`)
  if (d.removed.length) parts.push(`olib tashlandi: ${d.removed.map(who).join(', ')}`)
  for (const c of d.changed) parts.push(`${who(c.after)}: ${c.before.status} → ${c.after.status}; huquqlar ${c.before.rights.join(', ') || '—'} → ${c.after.rights.join(', ') || '—'}`)
  return parts.join('; ')
}

/** `chat_member` / `my_chat_member`: only changes that involve an administrator or the creator alert (§10.6). */
export const involvesAdmin = (oldStatus: string, newStatus: string) =>
  ['administrator', 'creator'].includes(oldStatus) || ['administrator', 'creator'].includes(newStatus)
