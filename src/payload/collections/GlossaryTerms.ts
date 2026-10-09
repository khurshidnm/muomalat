import type { CollectionConfig } from 'payload'

import { editorialAccess, fieldRoles } from '../access/editorial'
import { livePreviewFor } from '../fields/preview'
import { REL } from '../fields/relations'
import { seoGroup } from '../fields/seo'
import { slugField } from '../fields/slug'
import { systemFields } from '../fields/system'
import { translationGroup } from '../fields/translation'
import { hooksFor } from '../hooks'
import { inlineEditor } from '../lexical/editors'

export const glossaryCategoryOptions = [
  { label: 'Shartnoma', value: 'shartnoma' },
  { label: 'Tamoyil', value: 'tamoyil' },
  { label: 'Institut', value: 'institut' },
  { label: 'Bozor', value: 'bozor' },
  { label: 'Standart', value: 'standart' },
]

/**
 * The glossary at /lugat (CMS-SPEC §3.8). Texts explain finance and law; they
 * are never religious rulings. Rich text uses the inline editor and serializes
 * to RichText paragraphs (definition, practice, origin, example.text).
 */
export const GlossaryTerms: CollectionConfig = {
  slug: 'glossary-terms',
  labels: { singular: 'Atama', plural: 'Lugʻat' },
  admin: {
    group: 'Maʼlumotnoma',
    useAsTitle: 'term',
    defaultColumns: ['term', 'category', 'needsReview', '_status', 'updatedAt'],
    listSearchableFields: ['term', 'slug'],
    disableCopyToLocale: true,
    livePreview: livePreviewFor('glossary-terms'),
  },
  defaultSort: 'term',
  versions: { drafts: { autosave: true }, maxPerDoc: 0 },
  access: editorialAccess({
    readAll: ['reporter', 'editor', 'eic'],
    create: ['reporter', 'editor', 'eic'],
    publish: ['editor', 'eic'],
    draftOnly: ['reporter'],
    delete: ['eic'],
  }),
  hooks: hooksFor('glossary-terms'),
  fields: [
    slugField({ from: 'term', description: 'Atama sahifasining manzili, masalan «murobaha».' }),
    {
      name: 'needsReview',
      label: 'Koʻrib chiqish kerak',
      type: 'checkbox',
      access: { create: fieldRoles('editor', 'eic'), update: fieldRoles('editor', 'eic') },
      admin: { position: 'sidebar', description: 'Import qilingan atama muharrir tekshirib, belgini olib tashlamaguncha chop etilmaydi.' },
    },
    {
      name: 'category',
      label: 'Toifa',
      type: 'select',
      required: true,
      options: glossaryCategoryOptions,
      admin: { position: 'sidebar' },
    },
    ...systemFields(),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Matn',
          fields: [
            { name: 'term', label: 'Atama', type: 'text', required: true, admin: { description: 'Oʻzbekcha (lotin) yozilishi; barcha tillarda bir xil.' } },
            {
              name: 'aliases',
              label: 'Boshqa tillarda va yozilishlar',
              type: 'group',
              fields: [
                { name: 'ru', label: 'Ruscha', type: 'text' },
                { name: 'en', label: 'Inglizcha', type: 'text' },
                { name: 'ar', label: 'Arabcha (lotin harflarida)', type: 'text', admin: { description: 'Faqat lotin transliteratsiyasi; arab yozuvi ishlatilmaydi.' } },
                { name: 'other', label: 'Boshqa yozilishlar', type: 'text', hasMany: true },
              ],
            },
            { name: 'short', label: 'Qisqa taʼrif', type: 'textarea', localized: true, admin: { description: 'Bitta gap: roʻyxatlar va kartochkalarda.' } },
            { name: 'definition', label: 'Taʼrif', type: 'richText', editor: inlineEditor, localized: true },
            { name: 'origin', label: 'Kelib chiqishi', type: 'richText', editor: inlineEditor, localized: true, admin: { description: 'Bitta xatboshi.' } },
            { name: 'practice', label: 'Amaliyotda', type: 'richText', editor: inlineEditor, localized: true },
            {
              name: 'steps',
              label: 'Bosqichlar',
              type: 'array',
              localized: true,
              labels: { singular: 'Bosqich', plural: 'Bosqichlar' },
              fields: [{ name: 'text', label: 'Matn', type: 'textarea', required: true }],
            },
            {
              name: 'example',
              label: 'Misol',
              type: 'group',
              localized: true,
              admin: { description: 'Raqamlar bilan ishlangan misol; ixtiyoriy.' },
              fields: [
                { name: 'title', label: 'Sarlavha', type: 'text' },
                { name: 'text', label: 'Matn', type: 'richText', editor: inlineEditor, admin: { description: 'Bitta xatboshi.' } },
              ],
            },
            {
              name: 'related',
              label: 'Aloqador atamalar',
              type: 'relationship',
              relationTo: REL.glossaryTerms,
              hasMany: true,
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
            },
          ],
        },
        { label: 'Tarjima', fields: [translationGroup()] },
        { label: 'SEO va ulashish', fields: [seoGroup('seo')] },
      ],
    },
  ],
}
