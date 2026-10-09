import type { Block } from 'payload'

/**
 * Inline text kept in Latin script in the Cyrillic (/kr) edition (CMS-SPEC
 * §3.4). Serializes to `{en:text}`; the site also gives it lang="en".
 */
export const keepLatin: Block = {
  slug: 'keepLatin',
  labels: { singular: 'Lotin harflarida qoldirish', plural: 'Lotin harflarida qoldirish' },
  fields: [
    {
      name: 'text',
      label: 'Matn',
      type: 'text',
      required: true,
      admin: { description: 'Kirill nashrida transliteratsiya qilinmaydi: inglizcha nomlar va iboralar uchun. «}» belgisini ishlatmang.' },
    },
  ],
}
