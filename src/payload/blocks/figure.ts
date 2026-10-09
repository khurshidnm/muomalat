import type { Block } from 'payload'

import { REL } from '../fields/relations'

/**
 * An image inside the body (CMS-SPEC §3.4). Images go through this block, not
 * Lexical's upload node, so the alt text, credit and rights checks of the
 * media item always apply (ART-13/14/15).
 */
export const figure: Block = {
  slug: 'figure',
  labels: { singular: 'Rasm', plural: 'Rasmlar' },
  fields: [
    { name: 'image', label: 'Rasm', type: 'upload', relationTo: REL.media, required: true },
    {
      name: 'caption',
      label: 'Izoh',
      type: 'text',
      admin: { description: 'Boʻsh qolsa rasm kutubxonasidagi izoh koʻrsatiladi.' },
    },
  ],
}
