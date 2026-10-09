import type { CollectionBeforeOperationHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { hasRole, isAdmin, isAdminField, roleOptions, userRole, withEdge } from '../access/roles'
import { selfOrRoles, systemFieldAccess } from '../access/system'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'

const secureCookies = process.env.SITE_ENV === 'production' || process.env.COOKIE_SECURE !== 'false'

/** Absolute session lifetime (CMS-SPEC §12.2). The Access session (8 h) is the second limit. */
export const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000

/** Fields only an admin may change on any account, including their own (§4.3). */
const ADMIN_ONLY_FIELDS = ['role', 'active', 'offboardedAt'] as const

/**
 * Payload has no absolute session lifetime: every refresh extends the session
 * (PHASE0-FINDINGS §1.8). Refuse a refresh once the current session is older
 * than 8 h; the admin treats the 401 as a logout. Tested in
 * .spike/auth/run-absolute.ts.
 */
const maxSessionAge: CollectionBeforeOperationHook = ({ operation, req }) => {
  if (operation !== 'refresh' || !req.user) return
  const user = req.user as { _sid?: string; sessions?: { id: string; createdAt: string | Date }[] | null }
  const session = user.sessions?.find((s) => s.id === user._sid)
  const age = session ? Date.now() - new Date(session.createdAt).getTime() : Infinity
  if (age > MAX_SESSION_AGE_MS) throw new APIError('Sessiya muddati tugadi. Qaytadan kiring.', 401)
}

/**
 * Field access silently drops a forbidden write, and it runs before every
 * collection hook, so by `beforeChange` the forbidden value is already gone.
 * The guard therefore reads the raw incoming data here, so a non-admin
 * changing role, active or offboardedAt gets an error instead of a silent
 * no-op (§4.3, test A8).
 */
const adminOnlyFieldsGuard: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'update' || !req.user || hasRole(req, 'admin')) return
  const data = (args as { data?: Record<string, unknown> }).data
  if (!data) return
  const sent = ADMIN_ONLY_FIELDS.filter((key) => key in data && data[key] !== undefined)
  if (!sent.length) return
  // The admin form sends the whole document back, unchanged values included:
  // compare with the stored account rather than rejecting any presence.
  const id = (args as { id?: number | string }).id ?? req.user.id
  const current = (await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>
  for (const key of sent) {
    const before = current[key] ?? null
    const after = data[key] ?? null
    const same =
      key === 'offboardedAt' && before && after
        ? new Date(before as string).getTime() === new Date(after as string).getTime()
        : before === after
    if (!same) throw new APIError(`Faqat administrator «${key}» maydonini oʻzgartira oladi.`, 403)
  }
}

/** Personal fields: the account holder, the editor-in-chief (conflict checks) and admin (§3.13, §13.1). */
const personalRead = selfOrRoles('eic', 'admin')

/**
 * Staff accounts (CMS-SPEC §3.13, §4.3, §12.2). Accounts are never deleted, so
 * bylines and audit history survive; leavers are switched to `active: false`.
 *
 * Hooks owned by other concerns arrive through hooksFor('users'): the Access
 * JWT check in beforeLogin (security), login and logout audit, country
 * tracking and failed-login auditing in afterError (audit, §9.4). The
 * "This user is locked" message reveals that an account exists; it is
 * replaced with the generic login error there, or through the
 * `error:userLocked` translation key (§1.4 of PHASE0-FINDINGS).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Foydalanuvchi', plural: 'Foydalanuvchilar' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active', 'lastLoginAt'],
    group: 'Tizim',
  },
  auth: {
    tokenExpiration: 1800,
    useSessions: true,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { secure: secureCookies, sameSite: 'Strict' },
    forgotPassword: { expiration: 30 * 60 * 1000 },
    useAPIKey: false,
  },
  access: {
    // An active staff account may open the admin.
    admin: withEdge(({ req }) => userRole(req) !== undefined),
    create: withEdge(isAdmin),
    // §4.2: editors see the names and roles of everyone, so they can assign a story or a translation and see
    // who approved it; the personal fields stay with the person, the editor-in-chief and admin (field access).
    read: withEdge(({ req }) => {
      if (hasRole(req, 'admin', 'eic', 'editor')) return true
      if (userRole(req) && req.user) return { id: { equals: req.user.id } }
      return false
    }),
    update: withEdge(({ req }) => {
      if (hasRole(req, 'admin')) return true
      if (userRole(req) && req.user) return { id: { equals: req.user.id } }
      return false
    }),
    delete: withEdge(() => false),
    // Payload's default lets any admin-panel user unlock anyone (CVE-2026-11779).
    unlock: withEdge(isAdmin),
  },
  fields: [
    // Merged into Payload's built-in email field. §4.2 gives editors the names
    // and roles of other staff, not their addresses (§13.1): the address is read
    // by the account holder, the editor-in-chief and admin only.
    { name: 'email', type: 'email', access: { read: personalRead } },
    { name: 'name', label: 'Ism', type: 'text', required: true },
    {
      name: 'role',
      label: 'Rol',
      type: 'select',
      required: true,
      defaultValue: 'reporter',
      options: roleOptions,
      saveToJWT: true,
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'active',
      label: 'Faol',
      type: 'checkbox',
      defaultValue: true,
      saveToJWT: true,
      admin: { description: 'Oʻchirilgan hisob tizimga kira olmaydi. Hisoblar oʻchirib tashlanmaydi.' },
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'author',
      label: 'Muallif profili',
      type: 'join',
      collection: REL.authors,
      on: 'user',
      admin: {
        allowCreate: false,
        description: 'Bu hisobga bogʻlangan muallif. Bogʻlashni administrator muallif profilida qiladi.',
      },
    },
    {
      name: 'preferredContentLocale',
      label: 'Asosiy til',
      type: 'select',
      defaultValue: 'uz',
      options: [
        { label: 'Oʻzbekcha', value: 'uz' },
        { label: 'Русский', value: 'ru' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'declaredInterests',
      label: 'Manfaatlar toʻqnashuvi deklaratsiyasi',
      labels: { singular: 'Manfaat', plural: 'Manfaatlar' },
      type: 'array',
      access: { read: personalRead, create: personalRead, update: selfOrRoles('admin') },
      admin: {
        description:
          'Siz bilan bogʻliq tashkilotlar: ulush, ish joyi, oila. Faqat siz, bosh muharrir va administrator koʻradi. Shu tashkilot haqidagi maqolada ogohlantirish chiqadi.',
      },
      fields: [
        { name: 'institution', label: 'Tashkilot', type: 'relationship', relationTo: REL.institutions, required: true },
        {
          name: 'nature',
          label: 'Aloqa turi',
          type: 'select',
          required: true,
          options: [
            { label: 'Ulush yoki aksiya', value: 'shares' },
            { label: 'Ish joyi', value: 'employment' },
            { label: 'Oila aʼzosi', value: 'family' },
            { label: 'Boshqa', value: 'other' },
          ],
        },
        { name: 'since', label: 'Qachondan', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'note', label: 'Izoh', type: 'textarea' },
      ],
    },
    {
      name: 'telegramUserId',
      label: 'Telegram foydalanuvchi ID',
      type: 'text',
      access: { read: personalRead, create: personalRead, update: selfOrRoles('admin') },
      validate: (value: string | null | undefined) =>
        !value || /^\d{1,20}$/.test(value) || 'Faqat raqamlar: Telegram foydalanuvchi ID (@username emas).',
      admin: { description: 'Ixtiyoriy. Shaxsiy ogohlantirishlar uchun.' },
    },
    {
      name: 'offboardedAt',
      label: 'Ishdan ketgan sana',
      type: 'date',
      access: { create: isAdminField, update: isAdminField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastLoginAt',
      label: 'Oxirgi kirish',
      type: 'date',
      access: { read: personalRead, ...systemFieldAccess },
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastLoginCountry',
      label: 'Oxirgi kirish mamlakati',
      type: 'text',
      access: { read: personalRead, ...systemFieldAccess },
      admin: { position: 'sidebar', readOnly: true, description: 'cf-ipcountry sarlavhasidan.' },
    },
    {
      name: 'knownCountries',
      label: 'Maʼlum mamlakatlar',
      type: 'json',
      access: { read: personalRead, ...systemFieldAccess },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Kirish boʻlgan mamlakatlar (ISO kodlari). Yangi mamlakatdan kirish ogohlantirish beradi.',
      },
    },
  ],
  hooks: hooksFor('users', {
    beforeOperation: [maxSessionAge, adminOnlyFieldsGuard],
    beforeLogin: [
      ({ user }) => {
        if (user?.active === false) throw new APIError('Bu hisob oʻchirilgan.', 403)
        return user
      },
    ],
  }),
}
