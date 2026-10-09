import type { CollectionConfig } from 'payload'

import {
  CLUB_INTERESTS,
  CLUB_SECTORS,
  CLUB_SIZES,
  type ClubInterest,
  type ClubSector,
  type ClubSize,
} from '../../components/club/options'
import {
  clubApplicationsAccess,
  personalDataFields,
  personalDataHidden,
  submittedFieldAccess,
} from '../access/personalData'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'

const SECTOR_LABELS = {
  savdo: 'Savdo',
  'ishlab-chiqarish': 'Ishlab chiqarish',
  qurilish: 'Qurilish',
  'qishloq-xojaligi': 'Qishloq xoʻjaligi',
  xizmatlar: 'Xizmatlar',
  it: 'IT',
  boshqa: 'Boshqa',
} satisfies Record<ClubSector, string>

const SIZE_LABELS = {
  '1-10': '1–10 xodim',
  '11-50': '11–50 xodim',
  '51-250': '51–250 xodim',
  '250+': '250 dan ortiq xodim',
} satisfies Record<ClubSize, string>

const INTEREST_LABELS = {
  murobaha: 'Murobaha',
  ijora: 'Ijora',
  mushoraka: 'Mushoraka yoki muzoraba',
  takaful: 'Takaful',
  boshqa: 'Boshqa',
} satisfies Record<ClubInterest, string>

/**
 * Club membership applications and meeting sign-ups from /klub (CMS-SPEC
 * §3.14). The option lists are the ones the form and its server action use
 * (src/components/club/options.ts), so the CMS cannot drift from the form.
 */
export const ClubApplications: CollectionConfig = {
  slug: 'club-applications',
  labels: { singular: 'Klub arizasi', plural: 'Klub arizalari' },
  admin: {
    group: 'Shaxsiy maʼlumotlar',
    useAsTitle: 'name',
    defaultColumns: ['name', 'company', 'sector', 'status', 'createdAt'],
    hidden: personalDataHidden.clubApplications,
    description: 'Klubga aʼzolik va uchrashuvga yozilish arizalari. Faqat tijorat boʻlimi, bosh muharrir va administrator koʻradi.',
  },
  access: clubApplicationsAccess,
  disableDuplicate: true,
  fields: [
    { name: 'name', label: 'Ism', type: 'text', required: true, access: submittedFieldAccess },
    { name: 'company', label: 'Kompaniya', type: 'text', required: true, access: submittedFieldAccess },
    {
      name: 'sector',
      label: 'Soha',
      type: 'select',
      required: true,
      options: CLUB_SECTORS.map((value) => ({ label: SECTOR_LABELS[value], value })),
      access: submittedFieldAccess,
    },
    {
      name: 'size',
      label: 'Kompaniya hajmi',
      type: 'select',
      required: true,
      options: CLUB_SIZES.map((value) => ({ label: SIZE_LABELS[value], value })),
      access: submittedFieldAccess,
    },
    { name: 'phone', label: 'Telefon', type: 'text', required: true, access: submittedFieldAccess },
    { name: 'email', label: 'E-pochta', type: 'email', index: true, access: submittedFieldAccess },
    {
      name: 'interests',
      label: 'Qiziqishlar',
      type: 'select',
      hasMany: true,
      options: CLUB_INTERESTS.map((value) => ({ label: INTEREST_LABELS[value], value })),
      access: submittedFieldAccess,
    },
    { name: 'message', label: 'Xabar', type: 'textarea', access: submittedFieldAccess },
    { name: 'attend', label: 'Uchrashuvda qatnashmoqchi', type: 'checkbox', access: submittedFieldAccess },
    {
      name: 'event',
      label: 'Uchrashuv',
      type: 'relationship',
      relationTo: REL.clubEvents,
      admin: { description: 'Ariza qaysi uchrashuvga yozilish bilan yuborilgan boʻlsa.' },
    },
    ...personalDataFields(
      [
        { label: 'Yangi', value: 'new' },
        { label: 'Bogʻlanildi', value: 'contacted' },
        { label: 'Qabul qilindi', value: 'accepted' },
        { label: 'Rad etildi', value: 'declined' },
        { label: 'Qatnashdi', value: 'attended' },
      ],
      'new',
    ),
  ],
  hooks: hooksFor('club-applications'),
}
