import {
  BlocksFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { articleBlocks } from '../blocks'
import { inlineBlocks, inlineEditor, inlineFeatures, linkFeature, SITE_OR_HTTPS } from '../blocks/inline'
import type { LexicalNode, LexicalState } from './serialize'

/**
 * The two rich-text configurations of CMS-SPEC §3.4. Both serialize to the
 * existing markup through ./serialize.ts.
 *
 * Not enabled, on purpose: underline, strikethrough, sub/superscript, inline
 * code, alignment, indent, uploads (images go through the `figure` block),
 * relationships, blockquote (use the `quote` block), horizontal rule,
 * checklist, tables and any raw HTML or embed.
 *
 * These limits hold only in the admin's browser editor. REST and the Local API
 * accept anything, so the server checks the stored tree with inspectLexical()
 * below (wired in by the validation concern) and the serializer ignores what
 * it cannot render.
 */
export { inlineBlocks, inlineEditor, inlineFeatures, linkFeature }

export const articleFeatures = () => [
  ParagraphFeature(),
  HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
  UnorderedListFeature(),
  OrderedListFeature(),
  BoldFeature(),
  ItalicFeature(),
  linkFeature(),
  FixedToolbarFeature(),
  InlineToolbarFeature(),
  BlocksFeature({ blocks: articleBlocks, inlineBlocks }),
]

/** The article body editor. */
export const articleEditor = lexicalEditor({ features: articleFeatures })

// ── server-side check of a stored tree ──────────────────────────────────────
/** Node types each editor registers. Anything else cannot be loaded by the admin editor. */
export const ARTICLE_NODE_TYPES: ReadonlySet<string> = new Set([
  'root', 'paragraph', 'text', 'linebreak', 'tab', 'heading', 'list', 'listitem', 'link', 'autolink', 'block', 'inlineBlock',
])
export const INLINE_NODE_TYPES: ReadonlySet<string> = new Set(['root', 'paragraph', 'text', 'linebreak', 'tab', 'link', 'autolink', 'inlineBlock'])

/** Rich-text fields inside body blocks, checked with the inline node set. */
const NESTED_RICH_TEXT: Record<string, string[]> = { qa: ['answer'], callout: ['text'] }

export interface LexicalFinding {
  rule: 'ART-21' | 'ART-22'
  level: 'error' | 'warning'
  path: string
  message: string
}

/**
 * Walks a stored Lexical tree and reports what the editor cannot produce:
 * node types it does not register (error), nested lists and checklists
 * (ART-21, error) and links that are neither https:// nor a site path
 * (ART-22, error). The validation concern rejects unregistered node types on
 * every save, drafts included, and reports the rest as findings on drafts and
 * errors at publish (CMS-SPEC §3.4, §7.2).
 */
export function inspectLexical(state: LexicalState, allowed: ReadonlySet<string> = ARTICLE_NODE_TYPES, path = 'body'): LexicalFinding[] {
  const out: LexicalFinding[] = []
  const walk = (node: LexicalNode, at: string, allowedHere: ReadonlySet<string>, inList: boolean) => {
    if (!allowedHere.has(node.type)) {
      out.push({ rule: 'ART-21', level: 'error', path: at, message: `«${node.type}» turidagi element bu muharrirda yoʻq; uni olib tashlang` })
    }
    if (node.type === 'list') {
      if (inList) out.push({ rule: 'ART-21', level: 'error', path: at, message: 'Ichma-ich roʻyxat qoʻllab-quvvatlanmaydi; roʻyxatni bir darajaga keltiring' })
      if (node.listType === 'check') out.push({ rule: 'ART-21', level: 'error', path: at, message: 'Belgilash roʻyxati (checklist) qoʻllab-quvvatlanmaydi; oddiy roʻyxatga aylantiring' })
    }
    if (node.type === 'link' || node.type === 'autolink') {
      const f = (node.fields ?? {}) as { linkType?: string; url?: string }
      if (f.linkType !== 'internal' && !SITE_OR_HTTPS.test(f.url ?? '')) {
        out.push({ rule: 'ART-22', level: 'error', path: at, message: `Havola https:// yoki sayt ichidagi /yoʻl boʻlishi kerak («${f.url ?? ''}»)` })
      }
    }
    if (node.type === 'block') {
      const fields = (node.fields ?? {}) as Record<string, unknown> & { blockType?: string }
      for (const name of NESTED_RICH_TEXT[fields.blockType ?? ''] ?? []) {
        const nested = fields[name] as LexicalState
        if (nested?.root) walk(nested.root, `${at}.${name}`, INLINE_NODE_TYPES, false)
      }
    }
    ;(node.children ?? []).forEach((c, i) => walk(c, `${at}[${i}]`, allowedHere, inList || node.type === 'list'))
  }
  if (state?.root) walk(state.root, path, allowed, false)
  return out
}
