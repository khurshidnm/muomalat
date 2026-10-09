import type { Block } from 'payload'

/** A pull quote (CMS-SPEC §3.4). Plain text only: no links or formatting. */
export const quote: Block = {
  slug: 'quote',
  labels: { singular: 'Iqtibos', plural: 'Iqtiboslar' },
  fields: [
    {
      name: 'text',
      label: 'Matn',
      type: 'textarea',
      required: true,
      admin: { description: 'Faqat oddiy matn, qoʻshtirnoqsiz: havola va formatlash ishlamaydi.' },
    },
    { name: 'cite', label: 'Soʻzlovchi', type: 'text' },
    { name: 'role', label: 'Lavozimi', type: 'text' },
  ],
}
