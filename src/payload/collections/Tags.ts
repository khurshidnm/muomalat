import type { CollectionConfig } from 'payload'

import { editorialAccess } from '../access/editorial'
import { slugField } from '../fields/slug'
import { systemFields } from '../fields/system'
import { hooksFor } from '../hooks'

/**
 * Topic tags, a controlled vocabulary (CMS-SPEC §3.7): editors and the
 * editor-in-chief create them, reporters only pick. The Cyrillic label is
 * transliterated from the Uzbek one at read time. Deleting a tag that an
 * article still uses is refused in beforeDelete.
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: 'Mavzu', plural: 'Mavzular' },
  admin: {
    group: 'Tahririyat',
    useAsTitle: 'label',
    defaultColumns: ['label', 'slug', 'updatedAt'],
    listSearchableFields: ['label', 'slug'],
    // The built-in Copy to locale publishes at once (PHASE0 item 16).
    disableCopyToLocale: true,
  },
  versions: { drafts: { autosave: true }, maxPerDoc: 100 },
  access: editorialAccess({ readAll: ['editor', 'eic'], create: ['editor', 'eic'], publish: ['editor', 'eic'], delete: ['eic'] }),
  hooks: hooksFor('tags'),
  fields: [
    slugField({ from: 'label', localizedSource: true, description: 'Mavzu sahifasining manzili, masalan «islom-oynasi».' }),
    {
      name: 'label',
      label: 'Nomi',
      type: 'text',
      localized: true,
      admin: { description: 'Rus va ingliz tilidagi nom ixtiyoriy; kirill varianti oʻzbekchadan yasaladi.' },
    },
    ...systemFields(),
  ],
}
