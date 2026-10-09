import type { CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'

import { hasRole } from '../access/roles'
import { fieldRoles, hiddenUnless, requestsAccess, systemFieldAccess } from '../access/system'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'

export const REQUEST_KINDS = ['error_report', 'refutation', 'reply', 'removal', 'other'] as const
export type RequestKind = (typeof REQUEST_KINDS)[number]

const DAY = 24 * 60 * 60 * 1000

/**
 * Response deadline from the date received (CMS-SPEC §3.15; Media Law
 * Art. 34): refutation and reply one calendar month, error report 3 days,
 * removal 14 days. `other` has no statutory deadline.
 */
export function requestDueAt(kind: string | null | undefined, receivedAt: string | Date | null | undefined): string | null {
  if (!receivedAt) return null
  const at = new Date(receivedAt)
  if (Number.isNaN(at.getTime())) return null
  switch (kind) {
    case 'refutation':
    case 'reply': {
      const due = new Date(at)
      due.setUTCMonth(due.getUTCMonth() + 1)
      return due.toISOString()
    }
    case 'error_report':
      return new Date(at.getTime() + 3 * DAY).toISOString()
    case 'removal':
      return new Date(at.getTime() + 14 * DAY).toISOString()
    default:
      return null
  }
}

/** Derived system fields: the deadline follows kind and date received; the creator is the logged-in user. */
const deriveSystemFields: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const kind = data.kind ?? originalDoc?.kind
  const receivedAt = data.receivedAt ?? originalDoc?.receivedAt
  data.dueAt = requestDueAt(kind, receivedAt)
  // On update, field access has already put the stored value back.
  if (operation === 'create') data.createdBy = req.user?.id ?? null
  return data
}

/** Triage and outcome fields: the desk, not the reporter who logged the item. */
const desk = fieldRoles('editor', 'eic')

/**
 * The decision itself: the editor-in-chief always; an editor only for an
 * `error_report` (§4.2). Silent drop is the second guard; the workflow concern
 * (later wave) rejects a forbidden decision loudly and records decidedBy/At.
 */
const decisionAccess: FieldAccess = ({ req, data, doc }) => {
  if (hasRole(req, 'eic')) return true
  if (!hasRole(req, 'editor')) return false
  return (doc?.kind ?? data?.kind) === 'error_report' && (data?.kind ?? doc?.kind) === 'error_report'
}

/**
 * Register of error reports, refutation, reply and removal requests
 * ("Murojaatlar", CMS-SPEC §3.15; Media Law Art. 34). Requester details are
 * personal data, deleted when `retainUntil` passes. No editorial collection
 * relates to this one except through articles' `withdrawal.request` and
 * `corrections[].request`.
 */
export const Requests: CollectionConfig = {
  slug: 'requests',
  labels: { singular: 'Murojaat', plural: 'Murojaatlar' },
  admin: {
    group: 'Tahririyat',
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'kind', 'status', 'assignedTo', 'dueAt', 'receivedAt'],
    hidden: hiddenUnless('reporter', 'editor', 'eic', 'admin'),
    description: 'Xatolar, raddiya, javob va olib tashlash talablari reyestri (OAV toʻgʻrisidagi qonun, 34-modda).',
  },
  access: requestsAccess,
  disableDuplicate: true,
  fields: [
    {
      name: 'kind',
      label: 'Turi',
      type: 'select',
      required: true,
      defaultValue: 'error_report',
      index: true,
      options: [
        { label: 'Xato haqida xabar', value: 'error_report' },
        { label: 'Raddiya', value: 'refutation' },
        { label: 'Javob', value: 'reply' },
        { label: 'Olib tashlash talabi', value: 'removal' },
        { label: 'Boshqa', value: 'other' },
      ] satisfies { label: string; value: RequestKind }[],
      access: { update: desk },
      admin: { description: 'Muxbir faqat «Xato haqida xabar» kirita oladi.' },
    },
    { name: 'article', label: 'Maqola', type: 'relationship', relationTo: REL.articles, index: true },
    {
      name: 'requesterName',
      label: 'Murojaatchi',
      type: 'text',
      admin: { description: 'Shaxsiy maʼlumot: saqlash muddati tugagach oʻchiriladi.' },
    },
    { name: 'requesterContact', label: 'Murojaatchi bilan aloqa', type: 'text' },
    {
      name: 'receivedAt',
      label: 'Qabul qilingan vaqt',
      type: 'date',
      required: true,
      timezone: true,
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'channel',
      label: 'Qayerdan kelgan',
      type: 'select',
      options: [
        { label: 'Sayt shakli', value: 'site_form' },
        { label: 'E-pochta', value: 'email' },
        { label: 'Telefon', value: 'phone' },
        { label: 'Pochta', value: 'post' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Xodim orqali', value: 'staff' },
      ],
    },
    { name: 'summary', label: 'Qisqacha mazmun', type: 'textarea', required: true },
    {
      name: 'documents',
      label: 'Hujjatlar',
      type: 'text',
      admin: { description: 'Hujjatlarga havola yoki raqamlar (masalan, kiruvchi xat raqami).' },
    },
    {
      name: 'assignedTo',
      label: 'Masʼul',
      type: 'relationship',
      relationTo: 'users',
      access: { create: desk, update: desk },
      admin: {
        position: 'sidebar',
        description: 'Keyingi qadam egasi. Raddiya, javob va olib tashlashda bosh muharrir; xato haqida xabarda muharrir oladi.',
      },
    },
    {
      name: 'dueAt',
      label: 'Javob muddati',
      type: 'date',
      index: true,
      access: systemFieldAccess,
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Raddiya va javob: 1 oy; xato haqida xabar: 3 kun; olib tashlash: 14 kun.',
      },
    },
    {
      name: 'status',
      label: 'Holat',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Yangi', value: 'new' },
        { label: 'Saralash', value: 'triage' },
        { label: 'Ishlanmoqda', value: 'in_progress' },
        { label: 'Qaror qabul qilindi', value: 'decided' },
        { label: 'Yopildi', value: 'closed' },
      ],
      access: { create: desk, update: desk },
      admin: { position: 'sidebar' },
    },
    {
      name: 'decision',
      label: 'Qaror',
      type: 'select',
      options: [
        { label: 'Oʻzgarishsiz', value: 'no_change' },
        { label: 'Tuzatish', value: 'correction' },
        { label: 'Raddiya eʼlon qilindi', value: 'refutation_published' },
        { label: 'Javob eʼlon qilindi', value: 'reply_published' },
        { label: 'Anonimlashtirildi', value: 'anonymised' },
        { label: 'Qidiruvdan yashirildi (noindex)', value: 'noindex' },
        { label: 'Olib qoʻyildi', value: 'withdrawn' },
        { label: 'Rad etildi', value: 'declined' },
      ],
      access: { create: decisionAccess, update: decisionAccess },
      admin: { description: 'Raddiya, javob va olib tashlash boʻyicha qarorni faqat bosh muharrir qabul qiladi.' },
    },
    {
      name: 'decidedBy',
      label: 'Qaror qabul qilgan',
      type: 'relationship',
      relationTo: 'users',
      access: systemFieldAccess,
      admin: { readOnly: true },
    },
    {
      name: 'decidedAt',
      label: 'Qaror vaqti',
      type: 'date',
      access: systemFieldAccess,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'response',
      label: 'Murojaatchiga yuborilgan javob',
      type: 'textarea',
      access: { create: desk, update: desk },
    },
    {
      name: 'retainUntil',
      label: 'Saqlash muddati',
      type: 'date',
      index: true,
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true, description: 'Qarordan keyin 3 yil (taklif; huquqshunos tasdiqlaydi).' },
    },
    {
      name: 'createdBy',
      label: 'Kiritgan xodim',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  hooks: hooksFor('requests', { beforeChange: [deriveSystemFields] }),
}
