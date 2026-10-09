import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { hasRole, isAdmin, isAdminField, roleOptions, userRole } from '../access/roles'

const secureCookies = process.env.SITE_ENV === 'production' || process.env.COOKIE_SECURE !== 'false'

/**
 * Staff accounts (CMS-SPEC §3.13, §4.3, §12.2). Accounts are never deleted, so
 * bylines and audit history survive; leavers are switched to `active: false`.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Foydalanuvchi', plural: 'Foydalanuvchilar' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active'],
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
    admin: ({ req }) => userRole(req) !== undefined,
    create: isAdmin,
    read: ({ req }) => {
      if (hasRole(req, 'admin', 'eic')) return true
      if (userRole(req) && req.user) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (hasRole(req, 'admin')) return true
      if (userRole(req) && req.user) return { id: { equals: req.user.id } }
      return false
    },
    delete: () => false,
    // Payload's default lets any admin-panel user unlock anyone (CVE-2026-11779).
    unlock: isAdmin,
  },
  fields: [
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
      name: 'offboardedAt',
      label: 'Ishdan ketgan sana',
      type: 'date',
      access: { create: isAdminField, update: isAdminField },
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeChange: [
      // Field access silently drops a forbidden write; make role/active changes
      // by non-admins fail loudly instead (§4.3).
      ({ req, data, originalDoc, operation }) => {
        if (operation !== 'update' || !req.user || hasRole(req, 'admin')) return data
        for (const key of ['role', 'active', 'offboardedAt'] as const) {
          if (key in data && data[key] !== undefined && data[key] !== originalDoc?.[key]) {
            throw new APIError(`Faqat administrator "${key}" maydonini oʻzgartira oladi.`, 403)
          }
        }
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user?.active === false) throw new APIError('Bu hisob oʻchirilgan.', 403)
        return user
      },
    ],
  },
}
