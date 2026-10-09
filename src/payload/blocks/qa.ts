import type { Block } from 'payload'

import { inlineEditor } from './inline'

/**
 * One interview turn (CMS-SPEC §3.4): the question, then the answer in one or
 * more paragraphs. Rubric `intervyu` needs at least one (ART-6).
 */
export const qa: Block = {
  slug: 'qa',
  labels: { singular: 'Savol-javob', plural: 'Savol-javoblar' },
  fields: [
    { name: 'question', label: 'Savol', type: 'textarea', required: true },
    { name: 'answer', label: 'Javob', type: 'richText', editor: inlineEditor, required: true },
  ],
}
