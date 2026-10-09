/**
 * Stories from Payload (CMS-SPEC §3.3, §6.5, §8.1).
 *
 * One read per edition loads every published story with `locale: 'all'`;
 * the views it makes are cached as the edition's *index*: newest first,
 * without `body` and `sources` (summaries; §8.1), but with `readingMinutes`
 * computed from the full body. A full story is its own cached entry, tagged
 * `article:<id>`. Withdrawn stories stay in the index, flagged, so their
 * address still resolves to the withdrawal notice; every list leaves them out.
 */
import type { Payload, Where } from 'payload'

import type { Locale } from '@/i18n/config'
import { readingMinutes } from '@/lib/format'
import { serializeBody, type LexicalState } from '@/payload/lexical/serialize'
import { translationHash } from '@/payload/hooks/workflow/hash'
import type { Article, ArticleBlock, Correction, Interviewee, RubricSlug, Source, Sponsorship } from '../../types'
import type { ArticleView } from '../../views'
import { articlePath } from '../../shared'
import { tashkentIsoOrUndefined } from '../../dates'
import { readAs, type Reader } from './client'
import { at, clean, contentLangOf, cyrillic, text, textAt, translationGate, type Doc, type GateResult, type Loc } from './locale'
import { idOf, imageRef, loadMedia, type MediaRow } from './media'
import { loadRefs, serializeContext, slugList, type Refs } from './refs'

/** The fields a reader may see; internal ones are also stripped by field access for anonymous reads. */
const ARTICLE_SELECT = {
  slug: true,
  rubric: true,
  title: true,
  kicker: true,
  lead: true,
  body: true,
  image: true,
  imageCaption: true,
  authors: true,
  tags: true,
  terms: true,
  about: true,
  mentions: true,
  related: true,
  interviewee: true,
  sources: true,
  featured: true,
  publishedAt: true,
  firstPublishedAt: true,
  significantUpdateAt: true,
  withdrawal: true,
  corrections: true,
  sponsored: true,
  translation: true,
  kr: true,
  noindex: true,
  shortCode: true,
  slugHistory: true,
  inappropriateForSponsorship: true,
  ageMark: true,
  views: true,
  legacyId: true,
  workflowStatus: true,
} as const

export async function fetchArticleDocs(payload: Payload, reader: Reader, where?: Where): Promise<Doc[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    sort: ['-publishedAt', 'id'],
    select: ARTICLE_SELECT as never,
    ...(where ? { where } : {}),
    ...readAs(reader),
  })
  return docs as unknown as Doc[]
}

/** Every media id a story uses outside its body text: hero image, interviewee portrait, figures. */
function mediaIds(doc: Doc): (string | number)[] {
  const ids: (string | number)[] = []
  const add = (v: unknown) => {
    const id = idOf(v)
    if (id !== undefined) ids.push(id)
  }
  add(doc.image)
  add((doc.interviewee as Doc | undefined)?.portrait)
  for (const l of ['uz', 'ru', 'en'] as const) {
    const walk = (n: unknown) => {
      if (!n || typeof n !== 'object') return
      const node = n as { type?: string; fields?: Doc; children?: unknown[] }
      if (node.type === 'block' && node.fields?.blockType === 'figure') add(node.fields.image)
      for (const c of node.children ?? []) walk(c)
    }
    walk((at<LexicalState>(doc.body, l) as { root?: unknown } | undefined)?.root)
  }
  return ids
}

export interface ArticleSources {
  refs: Refs
  media: Map<string, MediaRow>
}

/** Refs and media for a set of story documents (one query per collection). */
export async function sourcesFor(payload: Payload, docs: Doc[], refs?: Refs): Promise<ArticleSources> {
  const [r, media] = await Promise.all([refs ? Promise.resolve(refs) : loadRefs(payload), loadMedia(payload, docs.flatMap(mediaIds))])
  return { refs: r, media }
}

/** Article paths from the documents just read (the public read of every story). */
export function pathsOf(docs: Doc[], rubric: Map<string, RubricSlug>): Refs['article'] {
  const out: Refs['article'] = new Map()
  for (const d of docs) {
    const r = rubric.get(String(idOf(d.rubric)))
    if (typeof d.slug === 'string' && r) out.set(String(d.id), { rubric: r, slug: d.slug })
  }
  return out
}

/** The ru/en translation gate for a story (§6.3); in preview any written translation is shown. */
function articleGate(doc: Doc, l: 'ru' | 'en', reader: Reader): GateResult {
  if (reader.kind === 'preview') return textAt(doc.title, l) ? 'approved' : undefined
  return translationGate(at(doc.translation, l), () =>
    translationHash({ title: at(doc.title, l), kicker: at(doc.kicker, l), lead: at(doc.lead, l), imageCaption: at(doc.imageCaption, l), body: at(doc.body, l) }, l),
  )
}

/** Body figures rebuilt from the media rows, so they carry the same fields as the hero image. */
function figures(blocks: ArticleBlock[], media: Map<string, MediaRow>, l: Loc): ArticleBlock[] {
  const bySrc = new Map<string, MediaRow>()
  for (const m of media.values()) {
    const ref = imageRef(m, l)
    if (ref) bySrc.set(ref.src, m)
  }
  return blocks.map((b) => {
    if (b.type !== 'figure') return b
    const m = bySrc.get(b.image.src)
    const image = m ? imageRef(m, l, { caption: b.image.caption }) : undefined
    return image ? { ...b, image } : b
  })
}

export interface BuildOptions {
  /** Summaries leave out body and sources. */
  summary: boolean
  reader: Reader
}

/**
 * One story for one edition. `src` is the text locale: the edition's own
 * language when its translation passes the gate, otherwise Uzbek.
 */
export function articleView(doc: Doc, locale: Locale, { refs, media }: ArticleSources, { summary, reader }: BuildOptions): ArticleView | undefined {
  const rubric = refs.rubric.get(String(idOf(doc.rubric)))
  const slug = text(doc.slug)
  if (!rubric || !slug) return undefined
  const gate = locale === 'ru' || locale === 'en' ? articleGate(doc, locale, reader) : undefined
  const src: Loc = gate && (locale === 'ru' || locale === 'en') ? locale : 'uz'
  const T = (v: unknown) => textAt(v, src)
  const uz = (v: unknown) => textAt(v, 'uz')

  const body = figures(serializeBody(at<LexicalState>(doc.body, src), serializeContext(src, refs, media)), media, src)
  const heroRow = media.get(String(idOf(doc.image)))
  const image = heroRow ? imageRef(heroRow, src, { caption: T(doc.imageCaption) ?? textAt(heroRow.caption, src) }) : undefined

  const iv = (doc.interviewee ?? {}) as Doc
  const portraitRow = media.get(String(idOf(iv.portrait)))
  const interviewee: Interviewee | undefined = text(iv.name)
    ? clean({
        name: iv.name as string,
        role: text(iv.role) ?? '',
        organisation: text(iv.organisation) ?? '',
        portrait: portraitRow ? imageRef(portraitRow, src, { altOverride: iv.name as string }) : undefined,
      })
    : undefined

  const sp = (doc.sponsored ?? {}) as Doc
  const sponsored: Sponsorship | undefined = sp.enabled
    ? clean({
        partner: text(sp.partner) ?? '',
        disclosure: T(sp.disclosure) ?? uz(sp.disclosure) ?? '',
        category: (text(sp.category) as Sponsorship['category']) ?? undefined,
        licenceNumber: text(sp.licenceNumber),
        riskWarning: T(sp.riskWarning) ?? uz(sp.riskWarning),
        keyTerms: T(sp.keyTerms) ?? uz(sp.keyTerms),
      })
    : undefined

  const corrections: Correction[] = ((doc.corrections as Doc[] | null | undefined) ?? [])
    .map((c) =>
      clean({
        date: tashkentIsoOrUndefined(c.createdAt) ?? '',
        text: T(c.publicText) ?? uz(c.publicText) ?? '',
        kind: (text(c.kind) as Correction['kind']) ?? undefined,
        id: c.id === undefined || c.id === null ? undefined : String(c.id),
      }),
    )
    .filter((c) => c.date && c.text)

  const sources: Source[] = ((doc.sources as Doc[] | null | undefined) ?? []).map((s) =>
    clean({
      title: text(s.title) ?? '',
      publisher: text(s.publisher) ?? '',
      url: text(s.url),
      date: text(s.date),
      type: (text(s.type) as Source['type']) ?? undefined,
    }),
  )

  const w = (doc.withdrawal ?? {}) as Doc
  const withdrawnAt = tashkentIsoOrUndefined(w.at)
  const withdrawn = withdrawnAt || doc.workflowStatus === 'withdrawn'
    ? clean({ at: withdrawnAt ?? tashkentIsoOrUndefined(doc.significantUpdateAt) ?? '', notice: T(w.publicNotice) ?? uz(w.publicNotice) ?? '', hideTitle: w.hideTitle ? true : undefined })
    : undefined

  const ageMark = text(doc.ageMark)
  const updatedAt = tashkentIsoOrUndefined(doc.significantUpdateAt)
  const article: Article = clean({
    id: String(doc.id),
    slug,
    rubric,
    title: T(doc.title) ?? uz(doc.title) ?? '',
    kicker: T(doc.kicker),
    lead: T(doc.lead) ?? uz(doc.lead) ?? '',
    body: summary ? [] : body,
    authors: slugList(refs.author, doc.authors),
    publishedAt: tashkentIsoOrUndefined(doc.publishedAt) ?? tashkentIsoOrUndefined(doc.firstPublishedAt) ?? '',
    updatedAt,
    image,
    tags: slugList(refs.tag, doc.tags),
    sources: summary ? [] : sources,
    terms: slugList(refs.term, doc.terms),
    related: (Array.isArray(doc.related) ? doc.related : []).map((v) => String(idOf(v))).filter((id) => refs.article.has(id)),
    interviewee,
    sponsored,
    corrections: corrections.length ? corrections : undefined,
    featured: doc.featured ? true : undefined,
    views: typeof doc.views === 'number' ? doc.views : 0,
    firstPublishedAt: tashkentIsoOrUndefined(doc.firstPublishedAt),
    withdrawn,
    noindex: doc.noindex ? true : undefined,
    ageMark: ageMark && ageMark !== 'inherit' ? (ageMark as Article['ageMark']) : undefined,
    about: idOf(doc.about) === undefined ? undefined : String(idOf(doc.about)),
    mentions: Array.isArray(doc.mentions) && doc.mentions.length ? doc.mentions.map((v) => String(idOf(v))) : undefined,
    inappropriateForSponsorship: doc.inappropriateForSponsorship ? true : undefined,
    shortCode: text(doc.shortCode),
    originalUpdatedAt: gate === 'outdated' ? updatedAt : undefined,
  })
  if (!article.terms?.length) delete article.terms
  if (!article.related?.length) delete article.related

  let out: Article = article
  if (locale === 'kr') {
    // Transliterated from Uzbek, then the editor's Cyrillic overrides (§6.4).
    out = cyrillic(article, ['firstPublishedAt', 'withdrawn.at', 'shortCode', 'sponsored.licenceNumber'])
    const kr = (doc.kr ?? {}) as Doc
    if (text(kr.title)) out.title = kr.title as string
    if (text(kr.lead)) out.lead = kr.lead as string
    if (text(kr.kicker)) out.kicker = kr.kicker as string
  }
  // Reading time comes from the full text, also for summaries. Transliteration
  // keeps every word boundary, so the Latin body counts the same on /kr.
  const minutes = readingMinutes(body, out.lead)
  return { ...out, contentLang: contentLangOf(locale, src !== 'uz'), readingMinutes: minutes, url: articlePath(out) }
}

/** The cached index of one edition: summaries, newest first, plus the lookups that need the stored documents. */
export interface ArticleIndex {
  items: ArticleView[]
  /** Mock ids kept in `legacyId` (th-05) → CMS id, for code that still names mock stories (§11.2 step 12). */
  legacy: [string, string][]
  /** Earlier addresses from `slugHistory` → the story's id (§8.8). */
  moved: [string, string][]
}

export function buildIndex(docs: Doc[], locale: Locale, sources: ArticleSources, reader: Reader): ArticleIndex {
  const items: ArticleView[] = []
  const legacy: [string, string][] = []
  const moved: [string, string][] = []
  for (const doc of docs) {
    const view = articleView(doc, locale, sources, { summary: true, reader })
    if (!view) continue
    items.push(view)
    if (text(doc.legacyId)) legacy.push([doc.legacyId as string, view.id])
    for (const h of (doc.slugHistory as Doc[] | null | undefined) ?? []) {
      if (text(h.slug) && text(h.rubric)) moved.push([`/${h.rubric}/${h.slug}`, view.id])
    }
  }
  items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  return { items, legacy, moved }
}
