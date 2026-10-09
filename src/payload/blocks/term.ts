import type { Block } from 'payload'

import { REL } from '../fields/relations'

/** An inline glossary card for one term (CMS-SPEC §3.4). The term must be published (ART-19). */
export const term: Block = {
  slug: 'term',
  labels: { singular: 'Atama kartochkasi', plural: 'Atama kartochkalari' },
  fields: [{ name: 'term', label: 'Atama', type: 'relationship', relationTo: REL.glossaryTerms, required: true }],
}
