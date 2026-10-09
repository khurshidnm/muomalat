import type { Block } from 'payload'

import { inlineEditor } from './inline'

/** The "Maʼlumot uchun" (for reference) context box (CMS-SPEC §3.4). */
export const callout: Block = {
  slug: 'callout',
  labels: { singular: 'Maʼlumot uchun', plural: 'Maʼlumot uchun' },
  fields: [
    { name: 'title', label: 'Sarlavha', type: 'text', defaultValue: 'Maʼlumot uchun' },
    {
      name: 'text',
      label: 'Matn',
      type: 'richText',
      editor: inlineEditor,
      required: true,
      admin: { description: 'Bitta xatboshi. Bir nechta xatboshi saytda bittaga birlashtiriladi.' },
    },
  ],
}
