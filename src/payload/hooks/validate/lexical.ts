import type { Finding, Level } from '../../../content/rules'
import type { ArticleBlock, RichText } from '../../../content/types'
import { articleBlocks, inlineBlocks } from '../../blocks'
import { ARTICLE_NODE_TYPES, INLINE_NODE_TYPES, inspectLexical } from '../../lexical/editors'
import { forEachNode, plainText, serializeBody, serializeParagraphs, type LexicalNode, type LexicalState, type SerializeCtx } from '../../lexical/serialize'
import type { Id } from './shared'

/**
 * The server side of the editor's limits (CMS-SPEC §3.4, PHASE0 §1.7). The
 * admin editor enforces its feature list only in the browser; REST, the Local
 * API and pasting let anything through. So:
 *
 * - node types and blocks the editor does not register are rejected on every
 *   save, drafts included, because the admin cannot even load such a tree;
 * - nested lists, checklists and links that are neither https:// nor a site
 *   path are findings: stored on drafts, errors at publish (ART-21, ART-22);
 * - what the serializer reports while turning the tree into the site's markup
 *   becomes ART-19 / ART-20 / ART-21 findings with the level §7.2 gives them.
 */

const BLOCK_SLUGS = new Set(articleBlocks.map((b) => b.slug))
const INLINE_BLOCK_SLUGS = new Set(inlineBlocks.map((b) => b.slug))
/** Rich-text fields inside body blocks; they use the inline editor. */
const NESTED_RICH_TEXT: Record<string, string[]> = { qa: ['answer'], callout: ['text'] }

export const isLexical = (v: unknown): v is { root: LexicalNode } => !!v && typeof v === 'object' && 'root' in (v as object) && !!(v as { root?: unknown }).root

/** Paths of nodes the editor cannot load: unknown node types, block or inline-block slugs. */
export function unregisteredNodes(state: LexicalState, editor: 'article' | 'inline', path: string): { path: string; type: string }[] {
  const out: { path: string; type: string }[] = []
  const walk = (node: LexicalNode, at: string, allowed: ReadonlySet<string>, blocks: boolean) => {
    if (!allowed.has(node.type)) out.push({ path: at, type: node.type })
    const f = (node.fields ?? {}) as Record<string, unknown> & { blockType?: string }
    if (node.type === 'block' && (!blocks || !BLOCK_SLUGS.has(f.blockType ?? ''))) out.push({ path: at, type: `block:${f.blockType ?? '?'}` })
    if (node.type === 'inlineBlock' && !INLINE_BLOCK_SLUGS.has(f.blockType ?? '')) out.push({ path: at, type: `inlineBlock:${f.blockType ?? '?'}` })
    if (node.type === 'block') {
      for (const name of NESTED_RICH_TEXT[f.blockType ?? ''] ?? []) {
        const nested = f[name] as LexicalState
        if (nested?.root) walk(nested.root, `${at}.${name}`, INLINE_NODE_TYPES, false)
      }
    }
    ;(node.children ?? []).forEach((c, i) => walk(c, `${at}[${i}]`, allowed, blocks))
  }
  if (state?.root) {
    const allowed = editor === 'article' ? ARTICLE_NODE_TYPES : INLINE_NODE_TYPES
    ;(state.root.children ?? []).forEach((c, i) => walk(c, `${path}[${i}]`, allowed, editor === 'article'))
  }
  return out
}

/** Uzbek names of the node types Payload's own features produce, for the rejection message. */
const NODE_NAMES: Record<string, string> = {
  quote: 'iqtibos (blockquote)',
  upload: 'rasm (upload)',
  horizontalrule: 'gorizontal chiziq',
  relationship: 'hujjat bogʻlanishi',
  table: 'jadval (Lexical)',
  code: 'kod bloki',
}
export const nodeName = (type: string) => NODE_NAMES[type] ?? `«${type}»`

/**
 * ART-21 (nested list, checklist) and ART-22 (link scheme) on a stored tree,
 * at any depth, including the rich text inside blocks. Unregistered node types
 * are left to unregisteredNodes(), which rejects them outright.
 */
export function structureFindings(state: LexicalState, editor: 'article' | 'inline', path: string): Finding[] {
  const allowed = editor === 'article' ? ARTICLE_NODE_TYPES : INLINE_NODE_TYPES
  return inspectLexical(state, allowed, path)
    .filter((f) => !/bu muharrirda yoʻq/.test(f.message))
    .map((f) => ({ rule: f.rule, level: f.level, path: topLevel(f.path), message: f.message }))
}

/** `body[3][0][1]` → `body[3]`: findings point at the top-level element the editor sees. */
const topLevel = (path: string) => path.replace(/^([^[]+\[\d+\]).*$/, '$1')

/**
 * The level §7.2 gives each serializer report. The serializer only reports a
 * code; ART-20 and ART-21 are errors for some cases and warnings for others.
 * Reports that the structure walk already makes (nested lists, checklists,
 * link schemes) are dropped here.
 */
export function classify(code: string, message: string): Level | undefined {
  switch (code) {
    case 'ART-13':
      return 'error'
    case 'ART-19':
      return /kartochka/.test(message) ? 'error' : 'warning'
    case 'ART-20':
      return /sayt belgilash deb oʻqiydigan/.test(message) ? 'warning' : 'error'
    case 'ART-21':
      if (/ichma-ich|checklist/.test(message)) return undefined
      return /nomaʼlum|qoʻllab-quvvatlanmaydi/.test(message) ? 'error' : 'warning'
    case 'ART-22':
      return undefined
    default:
      return 'warning'
  }
}

/** What a target looks like to the checks: its public path and whether the site can show it. */
export interface Target {
  slug: string
  path: string
  published: boolean
}

/** A serializer context over preloaded targets and media that collects findings. */
export function collectingCtx(opts: {
  locale: 'uz' | 'ru' | 'en'
  targets: Map<string, Target>
  media: Map<Id, { id: Id; url?: string | null; width?: number | null; height?: number | null; alt?: unknown; credit?: unknown; caption?: unknown }>
  /** Rewrites the serializer's `body[0]` prefix: per-node serialization numbers every node 0. */
  prefix: (where: string) => string
}): SerializeCtx & { findings: Finding[] } {
  const findings: Finding[] = []
  return {
    locale: opts.locale,
    mediaById: opts.media as SerializeCtx['mediaById'],
    resolveDoc(rel) {
      const id = rel.value && typeof rel.value === 'object' ? (rel.value as { id?: Id }).id : rel.value
      return opts.targets.get(`${rel.relationTo}:${String(id)}`)
    },
    warn(code, message) {
      const m = /^([^:]*): ([\s\S]*)$/.exec(message)
      const where = opts.prefix(m ? m[1] : '')
      const text = m ? m[2] : message
      const level = classify(code, text)
      if (level) findings.push({ rule: code, level, path: where, message: text.charAt(0).toUpperCase() + text.slice(1) })
    },
    findings,
  }
}

/**
 * The body serialized one top-level node at a time, so every block and every
 * finding keeps the index of the node the editor sees (serializeBody drops
 * empty paragraphs, which would shift the numbering).
 */
export function serializeByNode(state: LexicalState, ctxFor: (index: number) => SerializeCtx): { index: number; blocks: ArticleBlock[] }[] {
  return (state?.root?.children ?? []).map((node, index) => ({
    index,
    blocks: serializeBody({ root: { type: 'root', children: [node] } }, ctxFor(index)),
  }))
}

/** Paragraph markup of an inline-editor field (glossary, club report), one string per paragraph. */
export function paragraphs(state: LexicalState, ctx: SerializeCtx, path: string): RichText[] {
  return isLexical(state) ? serializeParagraphs(state, ctx, path) : []
}

/** Every relationship a tree references: link targets, glossary links, term cards and figure media. */
export function references(state: LexicalState): { docs: { relationTo: string; id: Id }[]; media: Id[] } {
  const docs: { relationTo: string; id: Id }[] = []
  const media: Id[] = []
  forEachNode(state, (n) => {
    const f = (n.fields ?? {}) as { blockType?: string; term?: unknown; image?: unknown; linkType?: string; doc?: { relationTo?: string; value?: unknown } }
    const id = (v: unknown) => (v && typeof v === 'object' ? (v as { id?: Id }).id : (v as Id | undefined))
    if ((n.type === 'link' || n.type === 'autolink') && f.linkType === 'internal' && f.doc?.relationTo) {
      const v = id(f.doc.value)
      if (v !== undefined && v !== null) docs.push({ relationTo: f.doc.relationTo, id: v })
    }
    if ((n.type === 'inlineBlock' && f.blockType === 'glossaryLink') || (n.type === 'block' && f.blockType === 'term')) {
      const v = id(f.term)
      if (v !== undefined && v !== null) docs.push({ relationTo: 'glossary-terms', id: v })
    }
    if (n.type === 'block' && f.blockType === 'figure') {
      const v = id(f.image)
      if (v !== undefined && v !== null) media.push(v)
    }
  })
  return { docs, media }
}

/** Words in the stored tree (ART-30): every text node, inline blocks included. */
export function wordCount(state: LexicalState): number {
  let n = 0
  for (const node of state?.root?.children ?? []) n += (plainText([node]).match(/[\p{L}\p{N}ʻʼ'-]+/gu) ?? []).length
  return n
}

/** A tree with nothing in it counts as empty (as the copy-from-Uzbek action does, §3.3). */
export const isEmptyTree = (state: unknown) => !isLexical(state) || plainText(state.root.children ?? []).trim() === '' && !(state.root.children ?? []).some((c) => c.type === 'block')

/**
 * Applies a text fix to every text node under one top-level node (the
 * one-click fixes of TXT-1, TXT-2 and TXT-7). Returns a new tree.
 */
export function fixTextNodes(state: { root: LexicalNode }, index: number | undefined, fix: (s: string) => string): { root: LexicalNode } {
  const copy = structuredClone(state)
  const visit = (node: LexicalNode) => {
    if (node.type === 'text' && typeof node.text === 'string') node.text = fix(node.text)
    const f = node.fields as Record<string, unknown> | undefined
    if (node.type === 'inlineBlock' && f) {
      if (typeof f.label === 'string') f.label = fix(f.label)
      if (typeof f.text === 'string') f.text = fix(f.text)
    }
    if (node.type === 'block' && f) {
      for (const [k, v] of Object.entries(f)) {
        if (k === 'blockType' || k === 'id' || k === 'blockName' || k === 'rows' || k === 'parsed') continue
        if (typeof v === 'string') f[k] = fix(v)
        else if (isLexical(v)) visit(v.root)
      }
    }
    for (const c of node.children ?? []) visit(c)
  }
  const nodes = copy.root.children ?? []
  if (index === undefined) nodes.forEach(visit)
  else if (nodes[index]) visit(nodes[index])
  return copy
}
