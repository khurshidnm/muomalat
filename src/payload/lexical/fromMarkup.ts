/**
 * Mock markup → Lexical JSON for the article and inline editors (CMS-SPEC
 * §11.3). Used by the importer only; the reverse is ./serialize.ts, and
 * serialize(fromMarkup(x)) === x for every mock article and glossary term.
 *
 * Nodes are created through a headless Lexical editor built from the node list
 * of the sanitized Payload field (editorNodes below), so the JSON is exactly
 * what the admin editor loads and re-exports. Block and node ids are
 * ObjectIds, as Payload's own editor makes them.
 */
import {
  $createLinkNode,
  $createServerBlockNode,
  $createServerInlineBlockNode,
  getEnabledNodes,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical'
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type Klass,
  type LexicalNode,
  type SerializedEditorState,
} from '@payloadcms/richtext-lexical/lexical'
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless'
import { $createListItemNode, $createListNode } from '@payloadcms/richtext-lexical/lexical/list'
import { $createHeadingNode } from '@payloadcms/richtext-lexical/lexical/rich-text'
import ObjectID from 'bson-objectid'
import type { BasePayload, SanitizedCollectionConfig } from 'payload'

import { LINK, TOKEN } from '../../content/markup'
import { formatChartData, formatTableData, parseChartData } from '../../content/tabular'
import type { ArticleBlock, RichText } from '../../content/types'

type Id = string | number
type Nodes = Klass<LexicalNode>[]

export interface ImportCtx {
  /** Node classes of the article body editor and of the inline editor (see editorNodes). */
  articleNodes: Nodes
  inlineNodes: Nodes
  glossaryId(slug: string): Id | undefined
  mediaId(src: string): Id | undefined
  /** `/lugat/<slug>` or `/<rubric>/<slug>` → an imported document; undefined keeps a custom link (e.g. /xarita). */
  internalDoc(path: string): { relationTo: 'articles' | 'glossary-terms'; value: Id } | undefined
  warn(msg: string): void
}

/** Node lists of the two editors, read from the sanitized `articles.body` and `glossary-terms.definition` fields. */
export function editorNodes(payload: BasePayload): { articleNodes: Nodes; inlineNodes: Nodes } {
  const nodesOf = (collection: string, name: string): Nodes => {
    const config = (payload.collections as unknown as Record<string, { config: SanitizedCollectionConfig } | undefined>)[collection]?.config
    const field = config?.flattenedFields.find((f) => f.name === name) as { editor?: { editorConfig?: SanitizedServerEditorConfig } } | undefined
    if (!field?.editor?.editorConfig) throw new Error(`fromMarkup: ${collection}.${name} is not a sanitized Lexical field`)
    return getEnabledNodes({ editorConfig: field.editor.editorConfig }) as unknown as Nodes
  }
  return { articleNodes: nodesOf('articles', 'body'), inlineNodes: nodesOf('glossary-terms', 'definition') }
}

type OidCtor = new () => { toHexString(): string }
const OID: OidCtor = ((ObjectID as unknown as { default?: OidCtor }).default ?? ObjectID) as unknown as OidCtor
const oid = () => new OID().toHexString()

function $inline(text: RichText, ctx: ImportCtx): LexicalNode[] {
  const out: LexicalNode[] = []
  for (const part of text.split(TOKEN)) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      out.push($createTextNode(part.slice(2, -2)).toggleFormat('bold'))
    } else if (part.startsWith('{en:') && part.endsWith('}')) {
      out.push($createServerInlineBlockNode({ id: oid(), blockType: 'keepLatin', blockName: '', text: part.slice(4, -1) } as never))
    } else if (part.startsWith('[[')) {
      const [slug, label] = part.slice(2, -2).split('|')
      const term = ctx.glossaryId(slug)
      if (term === undefined) ctx.warn(`glossaryLink to unknown term ${slug}`)
      out.push($createServerInlineBlockNode({ id: oid(), blockType: 'glossaryLink', blockName: '', term, label } as never))
    } else if (part.startsWith('[') && LINK.test(part)) {
      const [, label, target] = part.match(LINK)!
      const doc = target.startsWith('/') ? ctx.internalDoc(target) : undefined
      const fields = doc ? { linkType: 'internal', doc, newTab: false } : { linkType: 'custom', url: target, newTab: false }
      out.push($createLinkNode({ id: oid(), fields } as never).append($createTextNode(label)))
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      out.push($createTextNode(part.slice(1, -1)).toggleFormat('italic'))
    } else {
      // Plain text. A '\n' becomes a linebreak node; the mock data has none.
      part.split('\n').forEach((l, i) => {
        if (i > 0) out.push($createLineBreakNode())
        if (l) out.push($createTextNode(l))
      })
    }
  }
  return out
}

function run(nodes: Nodes, build: () => void): SerializedEditorState {
  const editor = createHeadlessEditor({
    nodes,
    onError: (e) => {
      throw e
    },
  })
  editor.update(build, { discrete: true })
  return editor.getEditorState().toJSON()
}

/** RichText[] (one string per paragraph) → inline-editor state (qa.answer, glossary definition, club report…). */
export function paragraphsToState(paragraphs: RichText[], ctx: ImportCtx): SerializedEditorState {
  return run(ctx.inlineNodes, () => {
    const root = $getRoot()
    for (const p of paragraphs) root.append($createParagraphNode().append(...$inline(p, ctx)))
  })
}

function blockNode(fields: Record<string, unknown>) {
  return $createServerBlockNode({ id: oid(), blockName: '', ...fields } as never)
}

/** ArticleBlock[] → article-editor state. */
export function bodyToState(blocks: ArticleBlock[], ctx: ImportCtx): SerializedEditorState {
  // Nested inline states are built first: each needs its own editor.
  const nested = new Map<number, SerializedEditorState>()
  blocks.forEach((b, i) => {
    if (b.type === 'qa') nested.set(i, paragraphsToState(b.answer, ctx))
    if (b.type === 'callout') nested.set(i, paragraphsToState([b.text], ctx))
  })
  return run(ctx.articleNodes, () => {
    const root = $getRoot()
    blocks.forEach((b, i) => {
      switch (b.type) {
        case 'p':
          root.append($createParagraphNode().append(...$inline(b.text, ctx)))
          return
        case 'h2':
        case 'h3':
          root.append($createHeadingNode(b.type).append($createTextNode(b.text)))
          return
        case 'list': {
          const list = $createListNode(b.ordered ? 'number' : 'bullet')
          for (const item of b.items) list.append($createListItemNode().append(...$inline(item, ctx)))
          root.append(list)
          return
        }
        case 'quote':
          root.append(blockNode({ blockType: 'quote', text: b.text, cite: b.cite, role: b.role }))
          return
        case 'figure': {
          const image = ctx.mediaId(b.image.src)
          if (image === undefined) ctx.warn(`figure: no media for ${b.image.src}`)
          root.append(blockNode({ blockType: 'figure', image, caption: b.image.caption }))
          return
        }
        case 'table':
          root.append(
            blockNode({
              blockType: 'table',
              caption: b.caption,
              columns: b.columns.map((c) => ({ id: oid(), label: c.label, align: c.align, unit: c.unit })),
              data: formatTableData(b.rows),
              rows: b.rows,
              note: b.note,
              source: b.source,
            }),
          )
          return
        case 'chart': {
          const c = b.chart
          const data = formatChartData(c)
          root.append(
            blockNode({
              blockType: 'chart',
              kind: c.kind,
              title: c.title,
              subtitle: c.subtitle,
              unit: c.unit,
              categoryLabel: c.kind === 'bar' ? c.categoryLabel : undefined,
              xLabel: c.kind === 'line' ? c.xLabel : undefined,
              data,
              parsed: parseChartData(c.kind, data),
              source: c.source,
              note: c.note,
            }),
          )
          return
        }
        case 'qa':
          root.append(blockNode({ blockType: 'qa', question: b.question, answer: nested.get(i) }))
          return
        case 'factbox':
          root.append(blockNode({ blockType: 'factbox', title: b.title, items: b.items.map((it) => ({ id: oid(), ...it })), note: b.note }))
          return
        case 'callout':
          root.append(blockNode({ blockType: 'callout', title: b.title, text: nested.get(i) }))
          return
        case 'term': {
          const term = ctx.glossaryId(b.slug)
          if (term === undefined) ctx.warn(`term block: unknown ${b.slug}`)
          root.append(blockNode({ blockType: 'term', term }))
          return
        }
      }
    })
  })
}
