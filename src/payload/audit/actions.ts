/**
 * The audit actions of CMS-SPEC §9.2. `audit-log.action` is a text column; this
 * list is the enumeration, enforced by the writer's type and by the labels the
 * admin and the alerts show.
 */
export const AUDIT_ACTIONS = [
  // Auth
  'auth.login',
  'auth.logout',
  'auth.locked',
  'auth.unlock',
  'auth.password_reset_requested',
  'auth.password_changed',
  'auth.edge_mismatch',
  'auth.login_failed',
  'auth.edge_login_failed',
  // Users
  'user.create',
  'user.update',
  'user.role_change',
  'user.disable',
  'user.enable',
  // Content (all collections and globals)
  'doc.create',
  'doc.update',
  'doc.publish_first',
  'doc.publish_change',
  'doc.unpublish',
  'doc.trash',
  'doc.restore_from_trash',
  'doc.delete',
  'doc.version_restore',
  // Workflow
  'workflow.transition',
  'workflow.approval_voided',
  /** The urgent fast path (§5.4), written by the workflow concern with its publish. */
  'workflow.urgent_publish',
  'article.withdraw',
  'article.restore',
  'correction.add',
  'correction.amend',
  'legal.signoff',
  'legal.hold_set',
  'legal.hold_cleared',
  /** SP-5 overridden by the editor-in-chief at a sponsored publish (§5.9), with the reason. */
  'sponsored.return_phrase_override',
  // Scheduling
  'schedule.set',
  'schedule.cancel',
  'schedule.run',
  'schedule.fail',
  // Globals
  'global.update',
  'global.publish',
  // Telegram (Phase 2)
  'telegram.approve',
  'telegram.cancel',
  'telegram.send',
  'telegram.edit',
  'telegram.delete',
  'telegram.channel_admin_change',
  // Personal data
  'pd.read',
  'pd.export',
  'pd.delete',
  'pd.retention_purge',
  // Operations
  'ops.read_only_on',
  'ops.read_only_off',
  'ops.backup_ok',
  'ops.backup_fail',
  'ops.chain_break',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const isAuditAction = (value: unknown): value is AuditAction =>
  typeof value === 'string' && (AUDIT_ACTIONS as readonly string[]).includes(value)

/** What an editor reads in the alerts group and the admin (Uzbek). */
export const ACTION_LABELS: Record<AuditAction, string> = {
  'auth.login': 'Tizimga kirish',
  'auth.logout': 'Tizimdan chiqish',
  'auth.locked': 'Hisob vaqtincha bloklandi',
  'auth.unlock': 'Hisob blokdan chiqarildi',
  'auth.password_reset_requested': 'Parolni tiklash soʻraldi',
  'auth.password_changed': 'Parol oʻzgartirildi',
  'auth.edge_mismatch': 'Cloudflare Access hisobi mos kelmadi',
  'auth.login_failed': 'Muvaffaqiyatsiz kirish urinishi',
  'auth.edge_login_failed': 'Cloudflare Access orqali muvaffaqiyatsiz kirish',
  'user.create': 'Yangi foydalanuvchi yaratildi',
  'user.update': 'Foydalanuvchi maʼlumotlari oʻzgartirildi',
  'user.role_change': 'Foydalanuvchi roli oʻzgartirildi',
  'user.disable': 'Hisob faolsizlantirildi',
  'user.enable': 'Hisob qayta faollashtirildi',
  'doc.create': 'Hujjat yaratildi',
  'doc.update': 'Qoralama saqlandi',
  'doc.publish_first': 'Birinchi marta chop etildi',
  'doc.publish_change': 'Oʻzgarish chop etildi',
  'doc.unpublish': 'Nashrdan olindi',
  'doc.trash': 'Savatga oʻtkazildi',
  'doc.restore_from_trash': 'Savatdan tiklandi',
  'doc.delete': 'Butunlay oʻchirildi',
  'doc.version_restore': 'Versiya tiklandi',
  'workflow.transition': 'Ish jarayoni holati oʻzgardi',
  'workflow.approval_voided': 'Tasdiq bekor qilindi',
  'workflow.urgent_publish': 'Shoshilinch yoʻl bilan chop etildi',
  'article.withdraw': 'Maqola olib tashlandi',
  'article.restore': 'Olib tashlangan maqola tiklandi',
  'correction.add': 'Tuzatish qoʻshildi',
  'correction.amend': 'Tuzatish matni oʻzgartirildi',
  'legal.signoff': 'Yuridik tasdiq berildi',
  'legal.hold_set': 'Yuridik saqlash belgilandi',
  'legal.hold_cleared': 'Yuridik saqlash olib tashlandi',
  'sponsored.return_phrase_override': 'Daromad vaʼdasi tekshiruvi chetlab oʻtildi',
  'schedule.set': 'Nashr rejalashtirildi',
  'schedule.cancel': 'Rejali nashr bekor qilindi',
  'schedule.run': 'Rejali nashr bajarildi',
  'schedule.fail': 'Rejali nashr bajarilmadi',
  'global.update': 'Sozlamalar oʻzgartirildi',
  'global.publish': 'Sozlamalar chop etildi',
  'telegram.approve': 'Telegram posti tasdiqlandi',
  'telegram.cancel': 'Telegram posti bekor qilindi',
  'telegram.send': 'Telegram posti yuborildi',
  'telegram.edit': 'Telegram posti tahrirlandi',
  'telegram.delete': 'Telegram posti oʻchirildi',
  'telegram.channel_admin_change': 'Telegram kanali adminlari oʻzgardi',
  'pd.read': 'Shaxsiy maʼlumot koʻrildi',
  'pd.export': 'Shaxsiy maʼlumot eksport qilindi',
  'pd.delete': 'Shaxsiy maʼlumot oʻchirildi',
  'pd.retention_purge': 'Saqlash muddati tugagan maʼlumot oʻchirildi',
  'ops.read_only_on': 'Faqat oʻqish rejimi yoqildi',
  'ops.read_only_off': 'Faqat oʻqish rejimi oʻchirildi',
  'ops.backup_ok': 'Zaxira nusxa olindi',
  'ops.backup_fail': 'Zaxira nusxa olinmadi',
  'ops.chain_break': 'Audit jurnali zanjiri buzilgan',
}
