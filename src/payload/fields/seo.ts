import type { GroupField } from 'payload'

import { REL } from './relations'

/**
 * The `seo` group of CMS-SPEC §3.2, localized as a whole. Over-length values
 * are warnings (ART-18), not errors, so no maxLength is set here. Articles
 * name it `meta`; glossary terms and club events name it `seo`.
 */
export function seoGroup(name: 'meta' | 'seo' = 'seo'): GroupField {
  return {
    name,
    label: 'SEO va ulashish',
    type: 'group',
    localized: true,
    admin: { description: 'Qidiruv natijalari va ijtimoiy tarmoqlardagi koʻrinish. Boʻsh maydonlar asosiy matndan olinadi.' },
    fields: [
      {
        name: 'title',
        label: 'SEO sarlavha',
        type: 'text',
        admin: { description: 'Boʻsh qolsa sarlavha ishlatiladi. 70 belgidan oshmasin.' },
      },
      {
        name: 'description',
        label: 'SEO tavsif',
        type: 'textarea',
        admin: { description: 'Boʻsh qolsa lid (qisqa tavsif) ishlatiladi. 160 belgidan oshmasin.' },
      },
      {
        name: 'image',
        label: 'Ulashish rasmi',
        type: 'upload',
        relationTo: REL.media,
        admin: { description: 'Boʻsh qolsa asosiy rasm ishlatiladi.' },
      },
    ],
  }
}
