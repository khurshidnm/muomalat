import { createHash } from 'node:crypto'

import { type LexicalNode, type LexicalState, type SerializeCtx, serializeBody } from '../../lexical/serialize'
import { canonical, type Doc, idOf, idsOf, isoOrNull, isPlainObject, type Locale } from './shared'

/**
 * Content hashes of CMS-SPEC §5.3.1 (editorial hash, approval) and §6.3
 * (translation hash). The body is hashed as the `ArticleBlock[]` the site
 * renders, not as Lexical JSON, so cosmetic editor changes (direction,
 * indent, a format bit the site ignores) never cancel an approval.
 */

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** A serializer context with no I/O: every link target resolves to its id, every image to its media id. */
function hashCtx(locale: Locale): SerializeCtx {
  const media = new (class extends Map<string | number, { id: string | number; url: string }> {
    override get(id: string | number) {
      return { id, url: `media:${id}` }
    }
  })()
  return {
    locale,
    resolveDoc: ({ relationTo, value }) => {
      const id = idOf(value)
      return id === undefined ? undefined : { path: `${relationTo}:${id}`, slug: String(id), published: true }
    },
    mediaById: media,
    warn: () => {},
  }
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export const bodyBlocks = (state: unknown, locale: Locale) => serializeBody(state as LexicalState, hashCtx(locale))

/**
 * The editorial hash: uz title, kicker, lead, image caption and body, plus
 * the non-localized rubric, authors, hero image, sources, interviewee,
 * institutions and the sponsorship record. `uz` holds the uz values of the
 * localized fields; `shared` the non-localized ones (the same document during
 * a uz save).
 */
export function editorialHash(uz: Doc, shared: Doc = uz): string {
  const sp = (shared.sponsored ?? {}) as Doc
  const spUz = (uz.sponsored ?? {}) as Doc
  const iv = (shared.interviewee ?? {}) as Doc
  return sha256(
    canonical({
      title: text(uz.title),
      kicker: text(uz.kicker),
      lead: text(uz.lead),
      imageCaption: text(uz.imageCaption),
      body: bodyBlocks(uz.body, 'uz'),
      rubric: idOf(shared.rubric) ?? null,
      authors: idsOf(shared.authors).map(String),
      image: idOf(shared.image) ?? null,
      sources: ((shared.sources as Doc[] | null | undefined) ?? []).map((s) => ({
        title: text(s.title),
        publisher: text(s.publisher),
        url: text(s.url),
        date: text(s.date),
        type: (s.type as string | null | undefined) ?? null,
      })),
      interviewee: { name: text(iv.name), role: text(iv.role), organisation: text(iv.organisation), portrait: idOf(iv.portrait) ?? null },
      about: idOf(shared.about) ?? null,
      mentions: idsOf(shared.mentions).map(String).sort(),
      sponsored: {
        enabled: Boolean(sp.enabled),
        partner: text(sp.partner),
        advertiserLegalName: text(sp.advertiserLegalName),
        category: (sp.category as string | null | undefined) ?? null,
        licenceNumber: text(sp.licenceNumber),
        licenceIssuer: text(sp.licenceIssuer),
        contractRef: text(sp.contractRef),
        campaignStart: isoOrNull(sp.campaignStart),
        campaignEnd: isoOrNull(sp.campaignEnd),
        riskWarning: text(spUz.riskWarning),
        keyTerms: text(spUz.keyTerms),
        disclosure: text(spUz.disclosure),
      },
    }),
  )
}

/** The translation hash of one locale (§6.3): that locale's title, kicker, lead, body and image caption. */
export function translationHash(doc: Doc, locale: Locale): string {
  return sha256(
    canonical({
      title: text(doc.title),
      kicker: text(doc.kicker),
      lead: text(doc.lead),
      imageCaption: text(doc.imageCaption),
      body: bodyBlocks(doc.body, locale),
    }),
  )
}

// ── text extraction (numbers rule, word count) ──────────────────────────────
/** Keys inside block fields that hold ids or structure, not text the reader sees. */
const NON_TEXT_KEYS = new Set(['id', 'blockType', 'blockName', 'image', 'term', 'doc', 'portrait', 'relationTo', 'value', 'linkType', 'newTab', 'kind', 'align', 'parsed'])

function collect(value: unknown, out: string[]) {
  if (value === null || value === undefined) return
  if (typeof value === 'string') out.push(value)
  else if (typeof value === 'number') out.push(String(value))
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out))
  else if (isPlainObject(value)) {
    if ('root' in value) walkNode((value as { root: LexicalNode }).root, out)
    else for (const [k, v] of Object.entries(value)) if (!NON_TEXT_KEYS.has(k)) collect(v, out)
  }
}

function walkNode(node: LexicalNode | undefined, out: string[]) {
  if (!node) return
  if (node.type === 'text' && typeof node.text === 'string') out.push(node.text)
  if (node.fields && typeof node.fields === 'object') collect(node.fields, out)
  for (const c of node.children ?? []) walkNode(c, out)
}

/** Every piece of reader-visible text in a rich-text state, including link URLs, table cells and chart data. */
export function richTextStrings(state: unknown): string[] {
  const out: string[] = []
  walkNode((state as { root?: LexicalNode } | null | undefined)?.root, out)
  return out
}

const NUMBER = /\d+(?:[.,]\d+)?/g

/** N-1 (§5.6): the digit sequences of the uz title, lead and body, as a sorted multiset. */
export function numberMultiset(uz: Doc): string[] {
  const texts = [text(uz.title), text(uz.lead), ...richTextStrings(uz.body)]
  return texts.flatMap((t) => t.match(NUMBER) ?? []).sort()
}

/** Words in the body's visible text (§5.4: an urgent item has at most 400). */
export function wordCount(state: unknown): number {
  const out: string[] = []
  walkNode((state as { root?: LexicalNode } | null | undefined)?.root, out)
  return out.join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}
