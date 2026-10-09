import type { Access, Field } from 'payload'

import type { ContactTopic } from '../../components/pages/contact/options'
import { denyAll, hasRole, userRole, withEdge, type Role } from './roles'
import { denyField, hiddenUnless, systemFieldAccess } from './system'

/**
 * Access for the four personal-data collections (CMS-SPEC §3.14, §4.2, §13.5).
 *
 * - Nobody creates through Payload: the site's server actions call
 *   createSubmission() in src/content/personal-data.ts, the only place that
 *   writes with `overrideAccess: true`.
 * - Reporters never see any of it; editors see only the newsroom topics of
 *   contact messages (the Bloomberg terminal lesson, §13.5).
 * - Deletion is the retention job's and the admin rights-request action's,
 *   both server-side with `overrideAccess: true`; only digest subscribers can
 *   also be deleted by an admin in the admin panel.
 */

/** Contact-message topics per role; the editor-in-chief and admin see every topic (§3.14). */
export const CONTACT_TOPICS_BY_ROLE: Partial<Record<Role, readonly ContactTopic[]>> = {
  editor: ['tahririyat', 'tuzatish'],
  commercial: ['reklama', 'klub'],
}

const roles =
  (...list: Role[]): Access =>
  ({ req }) =>
    hasRole(req, ...list)

/** Read and update scope for contact messages: by topic. */
const contactTopicScope: Access = ({ req }) => {
  const role = userRole(req)
  if (role === 'eic' || role === 'admin') return true
  const topics = role ? CONTACT_TOPICS_BY_ROLE[role] : undefined
  return topics?.length ? { topic: { in: [...topics] } } : false
}

export const clubApplicationsAccess = {
  create: withEdge(denyAll),
  read: withEdge(roles('commercial', 'eic', 'admin')),
  update: withEdge(roles('commercial', 'admin')),
  delete: withEdge(denyAll),
}

/** Admin only; the editor-in-chief and commercial see counts on a dashboard (later wave). */
export const digestSubscribersAccess = {
  create: withEdge(denyAll),
  read: withEdge(roles('admin')),
  update: withEdge(roles('admin')),
  delete: withEdge(roles('admin')),
}

export const contactMessagesAccess = {
  create: withEdge(denyAll),
  read: withEdge(contactTopicScope),
  update: withEdge(contactTopicScope),
  delete: withEdge(denyAll),
}

export const advertisingRequestsAccess = {
  create: withEdge(denyAll),
  read: withEdge(roles('commercial', 'eic', 'admin')),
  update: withEdge(roles('commercial')),
  delete: withEdge(denyAll),
}

/** `admin.hidden` per collection: the roles that can read it (§13.5). */
export const personalDataHidden = {
  clubApplications: hiddenUnless('commercial', 'eic', 'admin'),
  digestSubscribers: hiddenUnless('admin'),
  contactMessages: hiddenUnless('editor', 'commercial', 'eic', 'admin'),
  advertisingRequests: hiddenUnless('commercial', 'eic', 'admin'),
}

// ---------------------------------------------------------------------------
// Shared fields (§3.2 `consent`, §3.14 common fields). They live here, next to
// the access rules they carry: what the person sent and what they agreed to
// is a record, so staff cannot rewrite it; only the server-side Local API
// (overrideAccess) writes or anonymises it. No IP address is ever stored.
// ---------------------------------------------------------------------------

/** What the person submitted: read-only for staff. */
export const submittedFieldAccess = { create: denyField, update: denyField } as const

const localeOptions = [
  { label: 'Oʻzbekcha (lotin)', value: 'uz' },
  { label: 'Ўзбекча (кирилл)', value: 'kr' },
  { label: 'Русский', value: 'ru' },
  { label: 'English', value: 'en' },
]

/** Form locale, including the transliterated `kr` edition. */
export const formLocaleField = (name: string, label: string): Field => ({
  name,
  label,
  type: 'select',
  options: localeOptions,
  access: submittedFieldAccess,
  admin: { readOnly: true },
})

/** The `consent` group (§3.2): stored by the server action, never edited. */
export const consentField: Field = {
  name: 'consent',
  label: 'Rozilik',
  type: 'group',
  access: submittedFieldAccess,
  admin: { readOnly: true, description: 'Shaklda berilgan rozilik. Oʻzgartirib boʻlmaydi.' },
  fields: [
    {
      name: 'given',
      label: 'Rozilik berilgan',
      type: 'checkbox',
      required: true,
      validate: (value: unknown) => value === true || 'Rozilik boʻlmasa, yozuv saqlanmaydi.',
    },
    {
      name: 'textVersion',
      label: 'Rozilik matni versiyasi',
      type: 'text',
      required: true,
      admin: { description: 'Masalan, club-2026-10-v1 (src/i18n/messages/privacy.ts).' },
    },
    formLocaleField('locale', 'Til'),
    { name: 'at', label: 'Vaqti', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
  ],
}

/** Common fields after the collection's own ones: status, owner, notes, source, retention. */
export const personalDataFields = (statusOptions: { label: string; value: string }[], defaultStatus: string): Field[] => [
  {
    name: 'status',
    label: 'Holat',
    type: 'select',
    required: true,
    defaultValue: defaultStatus,
    options: statusOptions,
    index: true,
    admin: { position: 'sidebar' },
  },
  {
    name: 'assignedTo',
    label: 'Masʼul',
    type: 'relationship',
    relationTo: 'users',
    admin: { position: 'sidebar' },
  },
  {
    name: 'internalNotes',
    label: 'Ichki izohlar',
    type: 'textarea',
    admin: { description: 'Faqat xodimlar uchun. Yuboruvchiga koʻrsatilmaydi.' },
  },
  {
    name: 'source',
    label: 'Manba',
    type: 'group',
    access: submittedFieldAccess,
    admin: { readOnly: true, description: 'Shakl yuborilgan sahifa va til.' },
    fields: [
      { name: 'path', label: 'Sahifa', type: 'text' },
      formLocaleField('locale', 'Til'),
    ],
  },
  consentField,
  {
    name: 'retainUntil',
    label: 'Saqlash muddati',
    type: 'date',
    index: true,
    access: systemFieldAccess,
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: 'Shu sanadan keyin yozuv oʻchiriladi yoki anonimlashtiriladi (§13.1).',
    },
  },
]
