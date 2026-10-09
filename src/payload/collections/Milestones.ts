import type { CollectionConfig } from 'payload'

import { editorialAccess } from '../access/editorial'
import { REL } from '../fields/relations'
import { systemFields } from '../fields/system'
import { translationGroup } from '../fields/translation'
import { hooksFor } from '../hooks'

/** Stages of the regulatory timeline on /xarita (CMS-SPEC §3.10), in date order. */
export const Milestones: CollectionConfig = {
  slug: 'milestones',
  labels: { singular: 'Bosqich', plural: 'Regulyativ bosqichlar' },
  admin: { group: 'Maʼlumotnoma', useAsTitle: 'title', defaultColumns: ['date', 'title', 'status', 'updatedAt'], disableCopyToLocale: true },
  defaultSort: 'date',
  versions: { drafts: { autosave: true }, maxPerDoc: 100 },
  access: editorialAccess({
    readAll: ['reporter', 'editor', 'eic'],
    create: ['reporter', 'editor', 'eic'],
    publish: ['editor', 'eic'],
    draftOnly: ['reporter'],
    delete: ['eic'],
  }),
  hooks: hooksFor('milestones'),
  fields: [
    {
      name: 'date',
      label: 'Sana',
      type: 'text',
      required: true,
      index: true,
      validate: (value: unknown) =>
        typeof value === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(value) ? true : 'YYYY-MM yoki YYYY-MM-DD shaklida yozing, masalan 2026-06 yoki 2026-07-22.',
      admin: { description: 'Kun nomaʼlum boʻlsa faqat oy: 2026-06.' },
    },
    { name: 'title', label: 'Sarlavha', type: 'text', localized: true },
    { name: 'text', label: 'Matn', type: 'textarea', localized: true },
    {
      name: 'status',
      label: 'Holati',
      type: 'select',
      required: true,
      // The default enum name would be enum_milestones_status, which the drafts `_status` enum already uses.
      enumName: 'enum_milestones_milestone_status',
      options: [
        { label: 'Amalga oshgan', value: 'done' },
        { label: 'Kutilmoqda', value: 'upcoming' },
      ],
    },
    { name: 'article', label: 'Maqola', type: 'relationship', relationTo: REL.articles },
    { type: 'collapsible', label: 'Tarjima', admin: { initCollapsed: true }, fields: [translationGroup()] },
    ...systemFields(),
  ],
}
