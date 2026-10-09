import type { Block } from 'payload'

import { REL } from '../../fields/relations'

/**
 * Inline link to a glossary term (CMS-SPEC §3.4). Serializes to
 * `[[slug|label]]`; the site renders it as a term link.
 */
export const glossaryLink: Block = {
  slug: 'glossaryLink',
  labels: { singular: 'Lugʻat havolasi', plural: 'Lugʻat havolalari' },
  fields: [
    { name: 'term', label: 'Atama', type: 'relationship', relationTo: REL.glossaryTerms, required: true },
    {
      name: 'label',
      label: 'Koʻrinadigan matn',
      type: 'text',
      required: true,
      admin: { description: 'Matndagi soʻz shaklida yozing, masalan «islom oynalari». «|» va «]» belgilarini ishlatmang.' },
    },
  ],
}
