import type { CollectionConfig, FieldHook } from 'payload'

import {
  digestSubscribersAccess,
  formLocaleField,
  personalDataFields,
  personalDataHidden,
  submittedFieldAccess,
} from '../access/personalData'
import { systemFieldAccess } from '../access/system'
import { hooksFor } from '../hooks'

/** One subscriber per address: stored trimmed and lower-cased (§3.14). */
const normaliseEmail: FieldHook = ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)

/**
 * Weekly digest subscribers (CMS-SPEC §3.14). Double opt-in: a record stays
 * `pending` until the emailed link is used. Admin only; the editor-in-chief
 * and commercial see counts through a dashboard component (later wave).
 * Retention (pending 7 days, unsubscribed 30 days, suppression hash) is the
 * personal-data concern's job.
 */
export const DigestSubscribers: CollectionConfig = {
  slug: 'digest-subscribers',
  labels: { singular: 'Dayjest obunachisi', plural: 'Dayjest obunachilari' },
  admin: {
    group: 'Shaxsiy maʼlumotlar',
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'locale', 'confirmedAt', 'createdAt'],
    hidden: personalDataHidden.digestSubscribers,
    description: 'Haftalik dayjest obunachilari. Faqat administrator koʻradi.',
  },
  access: digestSubscribersAccess,
  disableDuplicate: true,
  fields: [
    {
      name: 'email',
      label: 'E-pochta',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      access: submittedFieldAccess,
      hooks: { beforeValidate: [normaliseEmail] },
    },
    formLocaleField('locale', 'Til'),
    {
      name: 'placement',
      label: 'Shakl joyi',
      type: 'text',
      access: submittedFieldAccess,
      admin: { readOnly: true, description: 'Obuna boʻlingan shakl, masalan home-digest.' },
    },
    {
      // Only the SHA-256 of the confirmation token is stored; the token itself is in the email.
      name: 'confirmTokenHash',
      type: 'text',
      hidden: true,
      access: systemFieldAccess,
    },
    {
      name: 'confirmedAt',
      label: 'Tasdiqlangan vaqt',
      type: 'date',
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'unsubscribedAt',
      label: 'Obunadan chiqqan vaqt',
      type: 'date',
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    ...personalDataFields(
      [
        { label: 'Tasdiqlanmagan', value: 'pending' },
        { label: 'Tasdiqlangan', value: 'confirmed' },
        { label: 'Obunadan chiqqan', value: 'unsubscribed' },
      ],
      'pending',
    ),
  ],
  hooks: hooksFor('digest-subscribers'),
}
