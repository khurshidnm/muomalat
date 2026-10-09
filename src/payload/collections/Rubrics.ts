import type { CollectionConfig } from 'payload'

import { editorialAccess } from '../access/editorial'
import { systemFields } from '../fields/system'
import { hooksFor } from '../hooks'

/** The five rubric slugs. The `RubricSlug` union in src/content/types.ts and the routes depend on them. */
export const rubricSlugOptions = [
  { label: 'Yangiliklar', value: 'yangiliklar' },
  { label: 'Tahlil', value: 'tahlil' },
  { label: 'Intervyu', value: 'intervyu' },
  { label: 'Izoh', value: 'izoh' },
  { label: 'Dunyo', value: 'dunyo' },
]

/**
 * Rubrics (CMS-SPEC §3.6). A rubric is added or removed only together with a
 * code change (messages, routes), so only admin creates and deletes; the
 * editor-in-chief edits and publishes names and descriptions.
 */
export const Rubrics: CollectionConfig = {
  slug: 'rubrics',
  labels: { singular: 'Rubrika', plural: 'Rubrikalar' },
  // The built-in Copy to locale publishes at once (PHASE0 item 16).
  admin: { group: 'Tahririyat', useAsTitle: 'name', defaultColumns: ['name', 'slug', 'order', 'updatedAt'], disableCopyToLocale: true },
  defaultSort: 'order',
  // No autosave: with it the create view saves an empty draft at once, and admin, who creates rubrics but may
  // not update them, could not fill it in. Admin fills the form and saves a draft, and can open it afterwards
  // (read-only); the editor-in-chief edits and publishes.
  versions: { drafts: true, maxPerDoc: 100 },
  access: editorialAccess({ readAll: ['eic', 'admin'], create: ['admin'], publish: ['eic'], delete: ['admin'] }),
  hooks: hooksFor('rubrics'),
  fields: [
    {
      name: 'slug',
      label: 'URL qismi (slug)',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      options: rubricSlugOptions,
      // Read-only after create: the routes and the RubricSlug type depend on it.
      access: { update: () => false },
      admin: { position: 'sidebar', description: 'Yaratilgandan keyin oʻzgarmaydi.' },
    },
    { name: 'order', label: 'Tartib', type: 'number', required: true, admin: { position: 'sidebar', description: 'Menyu va roʻyxatlardagi oʻrni.' } },
    { name: 'name', label: 'Nomi', type: 'text', localized: true },
    { name: 'description', label: 'Tavsif', type: 'textarea', localized: true, admin: { description: 'Bitta gap: rubrika sahifasida va metamaʼlumotlarda.' } },
    ...systemFields(),
  ],
}
