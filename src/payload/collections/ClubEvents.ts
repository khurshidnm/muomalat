import type { CollectionConfig } from 'payload'

import { editorialAccess } from '../access/editorial'
import { dateTime } from '../fields/dates'
import { livePreviewFor } from '../fields/preview'
import { REL } from '../fields/relations'
import { seoGroup } from '../fields/seo'
import { slugField } from '../fields/slug'
import { systemFields } from '../fields/system'
import { translationGroup } from '../fields/translation'
import { hooksFor } from '../hooks'
import { inlineEditor } from '../lexical/editors'

/**
 * Muomalat Club meetings (CMS-SPEC §3.11). `status` (upcoming / past) is not
 * stored: the read layer computes it from `startsAt`. Commercial prepares
 * meetings as drafts; editors and the editor-in-chief publish.
 */
export const ClubEvents: CollectionConfig = {
  slug: 'club-events',
  labels: { singular: 'Klub uchrashuvi', plural: 'Klub uchrashuvlari' },
  admin: {
    group: 'Klub',
    useAsTitle: 'title',
    defaultColumns: ['number', 'title', 'startsAt', 'registrationOpen', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    disableCopyToLocale: true,
    livePreview: livePreviewFor('club-events'),
  },
  defaultSort: '-startsAt',
  versions: { drafts: { autosave: true }, maxPerDoc: 100 },
  access: editorialAccess({
    readAll: ['editor', 'eic', 'commercial'],
    create: ['editor', 'eic', 'commercial'],
    publish: ['editor', 'eic'],
    draftOnly: ['commercial'],
    delete: ['eic'],
  }),
  hooks: hooksFor('club-events'),
  fields: [
    slugField({ from: 'title', localizedSource: true, description: 'Uchrashuv sahifasining manzili, masalan «oktabr-2026-ijora-uskuna».' }),
    { name: 'number', label: 'Tartib raqami', type: 'number', required: true, unique: true, admin: { position: 'sidebar' } },
    ...systemFields(),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Uchrashuv',
          fields: [
            { name: 'title', label: 'Sarlavha', type: 'text', localized: true },
            { name: 'theme', label: 'Mavzu', type: 'text', localized: true, admin: { description: 'Qisqa mavzu satri.' } },
            {
              type: 'row',
              fields: [
                dateTime({ name: 'startsAt', label: 'Boshlanishi', required: true, index: true }),
                dateTime({ name: 'endsAt', label: 'Tugashi', required: true, admin: { description: 'Boshlanishidan keyin boʻlishi kerak.' } }),
              ],
            },
            {
              name: 'venue',
              label: 'Joy',
              type: 'group',
              fields: [
                { name: 'name', label: 'Nomi', type: 'text', required: true },
                { name: 'address', label: 'Manzil', type: 'text', required: true },
                { name: 'city', label: 'Shahar', type: 'text', required: true },
              ],
            },
            { name: 'summary', label: 'Qisqacha', type: 'textarea', localized: true },
            { name: 'image', label: 'Rasm', type: 'upload', relationTo: REL.media },
            {
              name: 'imageCaption',
              label: 'Rasm izohi',
              type: 'text',
              localized: true,
              admin: { description: 'Shu uchrashuv uchun; boʻsh qolsa rasm kutubxonasidagi izoh koʻrsatiladi.' },
            },
            { name: 'capacity', label: 'Oʻrinlar soni', type: 'number', min: 1 },
            {
              type: 'row',
              fields: [
                { name: 'registrationOpen', label: 'Roʻyxatdan oʻtish ochiq', type: 'checkbox' },
                dateTime({ name: 'registrationClosesAt', label: 'Roʻyxatdan oʻtish tugashi' }),
              ],
            },
          ],
        },
        {
          label: 'Dastur',
          fields: [
            {
              name: 'agenda',
              label: 'Dastur',
              type: 'array',
              labels: { singular: 'Dastur bandi', plural: 'Dastur' },
              fields: [
                {
                  name: 'time',
                  label: 'Vaqt',
                  type: 'text',
                  required: true,
                  validate: (value: unknown) =>
                    typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? true : 'Vaqtni SS:DD shaklida yozing, masalan 18:30.',
                },
                { name: 'title', label: 'Band', type: 'text', localized: true },
                { name: 'speaker', label: 'Soʻzlovchi', type: 'text' },
              ],
            },
            {
              name: 'speakers',
              label: 'Spikerlar',
              type: 'array',
              labels: { singular: 'Spiker', plural: 'Spikerlar' },
              fields: [
                { name: 'name', label: 'Ism-familiya', type: 'text', required: true },
                { name: 'role', label: 'Lavozimi', type: 'text', required: true },
                { name: 'portrait', label: 'Portret', type: 'upload', relationTo: REL.media },
              ],
            },
          ],
        },
        {
          label: 'Hisobot',
          description: 'Oʻtgan uchrashuvlar uchun.',
          fields: [
            { name: 'report', label: 'Hisobot', type: 'richText', editor: inlineEditor, localized: true },
            {
              name: 'takeaways',
              label: 'Asosiy xulosalar',
              type: 'array',
              localized: true,
              labels: { singular: 'Xulosa', plural: 'Xulosalar' },
              fields: [{ name: 'text', label: 'Matn', type: 'textarea', required: true }],
            },
          ],
        },
        { label: 'Tarjima', fields: [translationGroup()] },
        { label: 'SEO va ulashish', fields: [seoGroup('seo')] },
      ],
    },
  ],
}
