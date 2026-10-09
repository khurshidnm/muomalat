import type { TextField, TextFieldSingleValidation } from 'payload'
import { BlocksFeature, BoldFeature, ItalicFeature, LinkFeature, ParagraphFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { REL } from '../../fields/relations'
import { glossaryLink } from './glossaryLink'
import { keepLatin } from './keepLatin'

/**
 * Inline content shared by both editors (CMS-SPEC §3.4): the two inline
 * blocks, the link feature and the inline editor itself.
 *
 * The inline editor lives here rather than in lexical/editors.ts because the
 * `qa` and `callout` body blocks use it, and lexical/editors.ts imports those
 * blocks: defining it there would make an import cycle in which the blocks
 * read the editor before it exists. lexical/editors.ts re-exports everything
 * below.
 */
export { glossaryLink, keepLatin }
export const inlineBlocks = [glossaryLink, keepLatin]

/** https:// or a site path (/xarita, /lugat/murobaha); never http:, javascript:, // or #. */
export const SITE_OR_HTTPS = /^(https:\/\/|\/(?!\/))/

/**
 * Validation of the link `url` field. It runs at publish (drafts are not
 * validated); the body check in the validation concern reports the same rule
 * (ART-22) on drafts, and the serializer drops any other link.
 */
export const validateLinkUrl: TextFieldSingleValidation = (value, options) => {
  if ((options?.siblingData as { linkType?: string } | undefined)?.linkType === 'internal') return true
  if (typeof value !== 'string' || value.trim() === '') return 'Havola manzilini kiriting.'
  if (/\s/.test(value)) return 'Havola manzilida boʻsh joy boʻlmasligi kerak.'
  if (!SITE_OR_HTTPS.test(value)) return 'Faqat https:// bilan boshlanadigan manzil yoki sayt ichidagi /yoʻl (masalan, /xarita).'
  return true
}

/** Links to articles and glossary terms, or a custom https:// / site URL. */
export const linkFeature = () =>
  LinkFeature({
    enabledCollections: [REL.articles, REL.glossaryTerms],
    fields: ({ defaultFields }) =>
      defaultFields.map((f) => (f.name === 'url' && f.type === 'text' ? ({ ...f, validate: validateLinkUrl } as TextField) : f)),
  })

export const inlineFeatures = () => [
  ParagraphFeature(),
  BoldFeature(),
  ItalicFeature(),
  linkFeature(),
  BlocksFeature({ inlineBlocks }),
]

/** Paragraphs with bold, italic, links and the two inline blocks: block texts and the glossary. */
export const inlineEditor = lexicalEditor({ features: inlineFeatures })
