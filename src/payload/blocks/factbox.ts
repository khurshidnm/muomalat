import type { Block } from 'payload'

/** The "Raqamlarda" (in figures) key-figures box (CMS-SPEC §3.4). */
export const factbox: Block = {
  slug: 'factbox',
  labels: { singular: 'Raqamlarda', plural: 'Raqamlarda' },
  fields: [
    { name: 'title', label: 'Sarlavha', type: 'text', defaultValue: 'Raqamlarda' },
    {
      name: 'items',
      label: 'Koʻrsatkichlar',
      labels: { singular: 'Koʻrsatkich', plural: 'Koʻrsatkichlar' },
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 8,
      fields: [
        { name: 'label', label: 'Koʻrsatkich', type: 'text', required: true },
        { name: 'value', label: 'Qiymat', type: 'text', required: true },
      ],
    },
    { name: 'note', label: 'Izoh', type: 'text', admin: { description: 'Sana va manba, masalan «8-oktabr holatiga. Manba: regulyator maʼlumotlari».' } },
  ],
}
