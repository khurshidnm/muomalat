import type { CollectionConfig } from 'payload'

import { AD_BUDGETS, AD_FORMATS, type AdBudget, type AdFormatOption } from '../../components/pages/advertise/options'
import {
  advertisingRequestsAccess,
  personalDataFields,
  personalDataHidden,
  submittedFieldAccess,
} from '../access/personalData'
import { hooksFor } from '../hooks'

const FORMAT_LABELS = {
  banner: 'Banner reklama',
  sponsored: 'Hamkorlik materiali',
  telegram: 'Telegram post',
  digest: 'Dayjest homiyligi',
  club: 'Klub uchrashuvi hamkorligi',
  several: 'Bir nechta format yoki maslahat',
} satisfies Record<AdFormatOption, string>

const BUDGET_LABELS = {
  upTo10: '10 mln soʻmgacha',
  upTo30: '10–30 mln soʻm',
  upTo100: '30–100 mln soʻm',
  over100: '100 mln soʻmdan ortiq',
  unknown: 'Hali aniq emas',
} satisfies Record<AdBudget, string>

/**
 * Advertiser enquiries from /reklama (CMS-SPEC §3.14). Commercial works them;
 * the editor-in-chief and admin read. Retention is 12 months, or 3 years once
 * `contract` is set (Art. 15), computed by the personal-data concern.
 */
export const AdvertisingRequests: CollectionConfig = {
  slug: 'advertising-requests',
  labels: { singular: 'Reklama soʻrovi', plural: 'Reklama soʻrovlari' },
  admin: {
    group: 'Shaxsiy maʼlumotlar',
    useAsTitle: 'company',
    defaultColumns: ['company', 'name', 'format', 'status', 'createdAt'],
    hidden: personalDataHidden.advertisingRequests,
    description: 'Reklama beruvchilarning soʻrovlari. Tijorat boʻlimi ishlaydi; bosh muharrir va administrator koʻradi.',
  },
  access: advertisingRequestsAccess,
  disableDuplicate: true,
  fields: [
    { name: 'name', label: 'Ism', type: 'text', required: true, access: submittedFieldAccess },
    { name: 'company', label: 'Kompaniya', type: 'text', required: true, access: submittedFieldAccess },
    { name: 'email', label: 'E-pochta', type: 'email', required: true, index: true, access: submittedFieldAccess },
    { name: 'phone', label: 'Telefon', type: 'text', required: true, access: submittedFieldAccess },
    {
      name: 'format',
      label: 'Format',
      type: 'select',
      required: true,
      options: AD_FORMATS.map((value) => ({ label: FORMAT_LABELS[value], value })),
      access: submittedFieldAccess,
    },
    {
      name: 'budget',
      label: 'Taxminiy byudjet',
      type: 'select',
      options: AD_BUDGETS.map((value) => ({ label: BUDGET_LABELS[value], value })),
      access: submittedFieldAccess,
    },
    { name: 'message', label: 'Kampaniya haqida', type: 'textarea', required: true, access: submittedFieldAccess },
    {
      name: 'contract',
      label: 'Shartnoma tuzildi',
      type: 'checkbox',
      admin: { position: 'sidebar', description: 'Belgilansa, yozuv 3 yil saqlanadi (Reklama toʻgʻrisidagi qonun, 15-modda).' },
    },
    ...personalDataFields(
      [
        { label: 'Yangi', value: 'new' },
        { label: 'Ishlanmoqda', value: 'in_progress' },
        { label: 'Shartnoma tuzildi', value: 'won' },
        { label: 'Natijasiz', value: 'lost' },
      ],
      'new',
    ),
  ],
  hooks: hooksFor('advertising-requests'),
}
