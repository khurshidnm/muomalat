import type { FieldAccess, GroupField } from 'payload'

import { staffField } from '../access/editorial'
import { hasRole } from '../access/roles'
import { REL } from './relations'
import { system } from './system'

export const translationStatusOptions = [
  { label: 'Tarjima yoʻq', value: 'missing' },
  { label: 'Mashina tarjimasi (qoralama)', value: 'machine_draft' },
  { label: 'Tahrirda', value: 'in_edit' },
  { label: 'Tasdiqlangan', value: 'approved' },
  { label: 'Eskirgan', value: 'outdated' },
]

/** The translator is chosen by an editor (CMS-SPEC §3.2). */
const editorsSet: FieldAccess = ({ req }) => hasRole(req, 'editor', 'eic')

/**
 * The localized `translation` group of CMS-SPEC §3.2 and §6.3: one status per
 * locale. The site shows the ru or en text only when its status is
 * `approved` (or `outdated` after an update) and `contentHash` matches.
 * Approval rules (who may approve, the hash, machine drafts passing through
 * `in_edit`) are enforced by the translation hook, which also writes the
 * system fields here. On the uz locale the group stays empty: uz is the source.
 */
export function translationGroup(): GroupField {
  return {
    name: 'translation',
    label: 'Tarjima holati',
    type: 'group',
    localized: true,
    admin: { description: 'Har bir til uchun alohida. Rus va ingliz matni faqat «Tasdiqlangan» holatda saytda koʻrinadi.' },
    fields: [
      { name: 'status', label: 'Holati', type: 'select', defaultValue: 'missing', options: translationStatusOptions },
      {
        name: 'assignee',
        label: 'Tarjimon',
        type: 'relationship',
        relationTo: REL.users,
        access: { read: staffField, create: editorsSet, update: editorsSet },
        admin: { description: 'Shu tildagi tarjima uchun masʼul; muharrir tayinlaydi.' },
      },
      system({ name: 'translatedBy', label: 'Tarjima qilgan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system({ name: 'reviewedBy', label: 'Tasdiqlagan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system({ name: 'approvedAt', label: 'Tasdiqlangan vaqt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } }),
      system({ name: 'contentHash', type: 'text', admin: { hidden: true } }),
      {
        name: 'machine',
        label: 'Mashina tarjimasi',
        type: 'group',
        fields: [
          { name: 'used', label: 'Mashina tarjimasidan foydalanilgan', type: 'checkbox' },
          { name: 'engine', label: 'Tizim', type: 'text', admin: { condition: (_, sibling) => Boolean(sibling?.used) } },
        ],
      },
    ],
  }
}
