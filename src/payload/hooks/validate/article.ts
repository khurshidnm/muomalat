import type { Field, PayloadRequest } from 'payload'

import {
  checkArticle,
  checkKr,
  checkMedia,
  DEFAULT_LIMITS,
  REVIEW,
  telegramCaptionLength,
  type ArticleCheckView,
  type Finding,
  type MediaCheckView,
} from '../../../content/rules'
import { parseChartData, parseTableData } from '../../../content/tabular'
import type { ArticleBlock, Source } from '../../../content/types'
import { REL } from '../../fields/relations'
import type { LexicalNode, LexicalState } from '../../lexical/serialize'
import { collectingCtx, isEmptyTree, isLexical, references, serializeByNode, structureFindings, wordCount, type Target } from './lexical'
import { deepMerge, idOf, idsOf, isolated, LOCALES, overlayNonLocalized, pickLocale, ruleSettings, saveLocale, type Doc, type Gate, type Id, type Locale } from './shared'
import { slugFindings } from './slug'
import { krFindings, textFindings, textItems, type TextItem } from './text'

/**
 * Every §7.2 rule for one article save (CMS-SPEC §7.3). Reads the document as
 * it will be stored: the incoming data over the latest version in the saving
 * locale, and the other locales from the database. The uz values are checked
 * whatever locale is being saved (§6.2): uz is the source of every edition.
 */

/** Article fields that are internal, system-written or checked separately (body, kr). */
const SKIP = new Set([
  'body', 'kr', 'translation', 'embargo', 'changeNote', 'secondRead', 'legalSignOff', 'workflowHistory', 'slugHistory',
  'withdrawal.internalReason', 'corrections.internalReason', 'corrections.location',
])

const TELEGRAM_TEXT_MAX = 4096

export interface ArticleCheckInput {
  req: PayloadRequest
  id?: Id
  /** The collection's sanitized fields. */
  fields: Field[]
  /** What is being saved, in the request's locale. */
  data: Doc
  /** The latest version in the request's locale (`undefined` on create). */
  originalDoc?: Doc
  gate: Gate
}

type MediaDoc = MediaCheckView & { id: Id; url?: string | null; width?: number | null; height?: number | null; caption?: string | null }

/** Parses `data` text into `rows` / `parsed` the way the block's field hooks will on this save (they run after us). */
function withParsedBlocks(state: LexicalState): LexicalState {
  if (!isLexical(state)) return state
  const copy = structuredClone(state)
  for (const node of copy.root.children ?? []) {
    const f = node.fields as Record<string, unknown> | undefined
    if (node.type !== 'block' || !f || typeof f.data !== 'string' || !f.data.trim()) continue
    if (f.blockType === 'table') f.rows = parseTableData(f.data)
    if (f.blockType === 'chart' && (f.kind === 'bar' || f.kind === 'line')) f.parsed = parseChartData(f.kind, f.data)
  }
  return copy
}

/** ART-8 / ART-10 on the raw chart text: cells the parser would silently drop. */
function chartTextFindings(state: LexicalState): Finding[] {
  const out: Finding[] = []
  ;(state?.root?.children ?? []).forEach((node, i) => {
    const f = node.fields as Record<string, unknown> | undefined
    if (node.type !== 'block' || f?.blockType !== 'chart' || typeof f.data !== 'string') return
    const lines = f.data.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim())
    const name = `«${String(f.title ?? '')}» diagrammasi`
    if (f.kind === 'line') {
      const width = (lines[0] ?? '').split(';').length
      lines.slice(1).forEach((l, k) => {
        if (l.split(';').length > width) out.push({ rule: 'ART-8', level: 'error', path: `body[${i}]`, message: `${name}: ${k + 2}-qatorda seriyalardan koʻp qiymat bor` })
      })
    } else {
      lines.forEach((l, k) => {
        const cells = l.split(';')
        if (cells.length > 3 || (cells.length === 3 && cells[2].trim() !== '*'))
          out.push({ rule: 'ART-10', level: 'error', path: `body[${i}]`, message: `${name}: ${k + 1}-qator «nom;qiymat» yoki «nom;qiymat;*» shaklida boʻlsin` })
      })
    }
  })
  return out
}

/** Text items of the serialized body, as the validator script walks ArticleBlock objects. */
function bodyItems(nodes: { index: number; blocks: ArticleBlock[] }[], state: LexicalState): TextItem[] {
  const out: TextItem[] = []
  const skip = new Set(['translations', 'labels', 'aliases', 'src', 'url', 'slug', 'id', 'type', 'image'])
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      if (v.trim()) out.push({ path, schema: 'body', value: v })
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, path))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!skip.has(k)) walk(x, path)
  }
  for (const { index, blocks } of nodes) {
    const path = `body[${index}]`
    for (const b of blocks) walk(b, path)
    // A figure's own caption (the media caption is the media item's text).
    const node = state?.root?.children?.[index]
    const caption = node?.type === 'block' ? (node.fields as { blockType?: string; caption?: unknown }).caption : undefined
    if (typeof caption === 'string' && caption.trim()) out.push({ path, schema: 'body', value: caption })
  }
  return out
}

async function findMany(req: PayloadRequest, collection: string, ids: Id[], opts: { locale?: string; select?: Record<string, true> } = {}): Promise<Doc[]> {
  const unique = [...new Set(ids.map(String))]
  if (!unique.length) return []
  const { docs } = await req.payload.find({
    collection: collection as never,
    where: { id: { in: unique } },
    depth: 0,
    limit: unique.length,
    pagination: false,
    draft: false,
    overrideAccess: true,
    ...(collection === REL.articles ? { trash: true } : {}),
    ...(opts.locale ? { locale: opts.locale as never } : {}),
    ...(opts.select ? { select: opts.select as never } : {}),
    req: isolated(req),
  })
  return docs as Doc[]
}

const published = (d: Doc | undefined) => !!d && d._status === 'published' && !d.deletedAt

/** The presence rules of the submit transition (§5.2: title, lead, rubric, an author, a source). */
function presence(uz: Doc): Finding[] {
  const out: Finding[] = []
  const add = (rule: string, path: string, message: string) => out.push({ rule, level: 'error', path, message })
  if (!String(uz.title ?? '').trim()) add('ART-2', 'title', 'Oʻzbekcha sarlavha yozilmagan')
  if (!String(uz.lead ?? '').trim()) add('ART-3', 'lead', 'Oʻzbekcha lid yozilmagan')
  if (idOf(uz.rubric) === undefined) add('REQ', 'rubric', 'Rubrika tanlanmagan')
  if (!idsOf(uz.authors).length) add('ART-4', 'authors', 'Kamida bitta muallif tanlang')
  if (!(Array.isArray(uz.sources) && uz.sources.length)) add('ART-5', 'sources', 'Kamida bitta manba kiriting («Manbalar» roʻyxati)')
  return out
}

/** Uzbek names of the locales, for ART-25 messages. */
const LOCALE_NAMES: Record<Locale, string> = { uz: 'Oʻzbekcha', ru: 'Ruscha', en: 'Inglizcha' }

/**
 * `findings`: everything §7.2 reports for this save. `presence`: the subset
 * the submit transition requires (§5.2).
 */
export async function checkArticleDoc({ req, id, fields, data, originalDoc, gate }: ArticleCheckInput): Promise<{ findings: Finding[]; presence: Finding[] }> {
  const now = Date.now()
  const L = saveLocale(req)
  const current = deepMerge(originalDoc, data)
  const all =
    id !== undefined
      ? ((await req.payload.findByID({ collection: REL.articles, id, locale: 'all', draft: true, depth: 0, trash: true, disableErrors: true, overrideAccess: true, req: isolated(req) })) as Doc | null)
      : null
  const viewOf = (loc: Locale): Doc => (loc === L ? current : overlayNonLocalized(all ? pickLocale(all, loc, fields) : {}, current, fields))
  const uz = viewOf('uz')

  const { demoMode, rules } = await ruleSettings(req)
  const limits = { ...DEFAULT_LIMITS, ...Object.fromEntries(Object.entries(rules.limits ?? {}).filter(([, v]) => typeof v === 'number')) }
  const findings: Finding[] = []
  const add = (rule: string, level: Finding['level'], path: string, message: string) => findings.push({ rule, level, path, message })
  const sponsored = Boolean((uz.sponsored as { enabled?: boolean } | undefined)?.enabled)

  // ── translations that the site will show (ART-25) ─────────────────────────
  const approved = LOCALES.filter((l) => l !== 'uz' && (viewOf(l).translation as { status?: string } | undefined)?.status === 'approved')
  for (const l of approved) {
    const v = viewOf(l)
    for (const [name, label] of [['title', 'sarlavha'], ['lead', 'lid']] as const)
      if (!String(v[name] ?? '').trim()) add('ART-25', 'error', name, `${LOCALE_NAMES[l]} tarjima tasdiqlangan, lekin ${l} ${label} boʻsh`)
    if (isEmptyTree(v.body)) add('ART-25', 'error', 'body', `${LOCALE_NAMES[l]} tarjima tasdiqlangan, lekin ${l} matni boʻsh`)
  }
  // §6.3: a translation in progress stays off the site; the editor is told so when publishing.
  for (const l of LOCALES.filter((x) => x !== 'uz' && !approved.includes(x))) {
    const status = (viewOf(l).translation as { status?: string } | undefined)?.status
    if (status === 'machine_draft' || status === 'in_edit') add('ART-25', 'warning', 'translation', `${l} tarjima chop etilmaydi (holati: ${status})`)
  }

  // ── what the story references ─────────────────────────────────────────────
  const body = withParsedBlocks(uz.body as LexicalState)
  const bodies = [body, ...approved.map((l) => viewOf(l).body as LexicalState)]
  const refs = bodies.map((b) => references(b))
  const meta = (l: Locale) => (viewOf(l).meta ?? {}) as { title?: string; description?: string; image?: unknown }
  const interviewee = (uz.interviewee ?? {}) as { name?: string; role?: string; organisation?: string; portrait?: unknown }
  const mediaIds = [
    idOf(uz.image),
    idOf(interviewee.portrait),
    ...['uz' as Locale, ...approved].map((l) => idOf(meta(l).image)),
    ...refs.flatMap((r) => r.media),
  ].filter((x): x is Id => x !== undefined)
  const docRefs = refs.flatMap((r) => r.docs)
  const articleIds = [...docRefs.filter((d) => d.relationTo === REL.articles).map((d) => d.id), ...idsOf(uz.related)]
  const termIds = [...docRefs.filter((d) => d.relationTo === REL.glossaryTerms).map((d) => d.id), ...idsOf(uz.terms)]
  const institutionIds = [idOf(uz.about), ...idsOf(uz.mentions)].filter((x): x is Id => x !== undefined)

  // One after another: the reads share the transaction's connection, which runs one query at a time
  // (pg warns about, and pg@9 will refuse, parallel queries on one client).
  // Link targets need every rubric slug; there are five.
  const rubricDocs = (
    await req.payload.find({ collection: REL.rubrics, depth: 0, limit: 50, pagination: false, draft: false, overrideAccess: true, req: isolated(req), select: { slug: true, _status: true } as never })
  ).docs as Doc[]
  const articleDocs = await findMany(req, REL.articles, articleIds, { select: { slug: true, rubric: true, _status: true, deletedAt: true, withdrawal: true } })
  const termDocs = await findMany(req, REL.glossaryTerms, termIds, { select: { slug: true, _status: true } })
  const institutionDocs = await findMany(req, REL.institutions, institutionIds, { select: { name: true, _status: true } })
  const authorDocs = await findMany(req, REL.authors, idsOf(uz.authors), { locale: 'uz', select: { name: true, _status: true, active: true, user: true } })
  const tagDocs = await findMany(req, REL.tags, idsOf(uz.tags), { locale: 'uz', select: { slug: true, label: true, _status: true } })
  const mediaDocs = await findMany(req, REL.media, mediaIds, { locale: 'uz' })
  const byId = (docs: Doc[]) => new Map(docs.map((d) => [String(d.id), d]))
  const rubrics = byId(rubricDocs)
  const rubricSlug = (v: unknown) => String(rubrics.get(String(idOf(v)))?.slug ?? '')
  const media = new Map<Id, MediaDoc>()
  for (const m of mediaDocs as unknown as MediaDoc[]) {
    media.set(m.id, m)
    media.set(String(m.id), m)
  }
  const targets = new Map<string, Target>()
  for (const a of articleDocs) targets.set(`${REL.articles}:${String(a.id)}`, { slug: String(a.slug ?? ''), path: `/${rubricSlug(a.rubric)}/${String(a.slug ?? '')}`, published: published(a) })
  for (const t of termDocs) targets.set(`${REL.glossaryTerms}:${String(t.id)}`, { slug: String(t.slug ?? ''), path: `/lugat/${String(t.slug ?? '')}`, published: published(t) })

  // ── the body, node by node ────────────────────────────────────────────────
  const ctxs: ReturnType<typeof collectingCtx>[] = []
  const nodes = serializeByNode(body, (i) => {
    const ctx = collectingCtx({ locale: 'uz', targets, media, prefix: (w) => (w ? w.replace(/^body\[0\]/, `body[${i}]`) : `body[${i}]`) })
    ctxs.push(ctx)
    return ctx
  })
  for (const c of ctxs) findings.push(...c.findings)
  bodies.forEach((b, k) =>
    findings.push(...structureFindings(b, 'article', 'body').map((f) => (k === 0 ? f : { ...f, message: `${LOCALE_NAMES[approved[k - 1]]} matn: ${f.message}` }))),
  )
  findings.push(...chartTextFindings(body))
  if (isEmptyTree(body)) add('REQ', 'error', 'body', 'Oʻzbekcha matn boʻsh')
  if (idOf(uz.rubric) === undefined) add('REQ', 'error', 'rubric', 'Rubrika tanlanmagan')

  // ── the structural rules shared with the script ───────────────────────────
  const blockNode: number[] = []
  const blocks: ArticleBlock[] = []
  for (const n of nodes) for (const b of n.blocks) {
    blocks.push(b)
    blockNode.push(n.index)
  }
  const hero = media.get(idOf(uz.image) as Id)
  const view: ArticleCheckView = {
    id: id === undefined ? undefined : String(id),
    slug: uz.slug as string | undefined,
    rubric: rubricSlug(uz.rubric),
    title: uz.title as string | undefined,
    lead: uz.lead as string | undefined,
    body: blocks,
    authors: idsOf(uz.authors).map(String),
    tags: idsOf(uz.tags).map(String),
    sources: (Array.isArray(uz.sources) ? uz.sources : []) as Source[],
    publishedAt: (uz.publishedAt as string | undefined) ?? null,
    updatedAt: (uz.significantUpdateAt as string | undefined) ?? null,
    image: idOf(uz.image) !== undefined ? { src: hero?.url ?? '', width: hero?.width, height: hero?.height } : null,
    interviewee: interviewee.name?.trim() ? { name: interviewee.name, role: interviewee.role ?? '', organisation: interviewee.organisation ?? '' } : null,
    urgent: uz.urgent as boolean | undefined,
    needsLegal: uz.needsLegal as string | undefined,
    embargo: uz.embargo as ArticleCheckView['embargo'],
    meta: meta('uz'),
    bodyWords: wordCount(body),
  }
  for (const f of checkArticle(view, { scope: 'all', now, limits: rules.limits, gate })) {
    const m = /^body\[(\d+)\]/.exec(f.path)
    findings.push(m ? { ...f, path: f.path.replace(/^body\[\d+\]/, `body[${blockNode[Number(m[1])] ?? 0}]`) } : f)
  }
  findings.push(...(await slugFindings(req, id, uz.slug)))

  // ── images: alt, credit, rights (ART-13 to ART-15) ────────────────────────
  const image = (v: unknown, path: string, label: string) => {
    const mid = idOf(v)
    if (mid === undefined) return
    const m = media.get(mid) ?? media.get(String(mid))
    if (!m) add('ART-13', 'error', path, `${label}: rasm topilmadi (oʻchirilgan boʻlishi mumkin)`)
    else findings.push(...checkMedia(m, path, { now, sponsoredStory: sponsored, label }))
  }
  image(uz.image, 'image', 'Asosiy rasm')
  image(interviewee.portrait, 'interviewee.portrait', 'Suhbatdosh portreti')
  for (const l of ['uz' as Locale, ...approved]) image(meta(l).image, 'meta.image', l === 'uz' ? 'Ulashish rasmi' : `Ulashish rasmi (${l})`)
  bodies.forEach((b, k) =>
    (b?.root?.children ?? []).forEach((node: LexicalNode, i: number) => {
      const f = node.fields as { blockType?: string; image?: unknown } | undefined
      if (node.type === 'block' && f?.blockType === 'figure') image(f.image, `body[${i}]`, k === 0 ? 'Rasm' : `Rasm (${approved[k - 1]} matni)`)
    }),
  )

  // ── bylines and references (ART-4, ART-19, ART-31) ────────────────────────
  const firstPublication = !uz.firstPublishedAt
  const authors = byId(authorDocs)
  for (const aid of idsOf(uz.authors)) {
    const a = authors.get(String(aid))
    if (!a) add('ART-4', 'error', 'authors', 'Tanlangan muallif topilmadi (oʻchirilgan)')
    else if (a._status !== 'published') add('ART-4', 'error', 'authors', `«${String(a.name ?? '')}» muallif sahifasi chop etilmagan: avval uni chop eting`)
    else if (a.active === false && firstPublication) add('ART-4', 'error', 'authors', `«${String(a.name ?? '')}» faol muallif emas: boshqa muallif tanlang`)
  }
  const unpublished = (docs: Doc[], ids: Id[], path: string, what: string, name: (d: Doc) => string) => {
    const map = byId(docs)
    for (const rid of ids) {
      const d = map.get(String(rid))
      if (!published(d)) add('ART-19', 'warning', path, `${what} ${d ? `«${name(d)}» ` : ''}chop etilmagan yoki oʻchirilgan: saytda koʻrinmaydi`)
    }
  }
  unpublished(articleDocs, idsOf(uz.related), 'related', 'Aloqador maqola', (d) => String(d.slug ?? d.id))
  unpublished(institutionDocs, [idOf(uz.about)].filter((x): x is Id => x !== undefined), 'about', 'Tashkilot', (d) => String(d.name ?? d.id))
  unpublished(institutionDocs, idsOf(uz.mentions), 'mentions', 'Tashkilot', (d) => String(d.name ?? d.id))
  unpublished(termDocs, idsOf(uz.terms), 'terms', 'Lugʻat atamasi', (d) => String(d.slug ?? d.id))
  unpublished(tagDocs, idsOf(uz.tags), 'tags', 'Mavzu', (d) => String(d.label ?? d.slug ?? d.id))
  const rubric = rubrics.get(String(idOf(uz.rubric)))
  if (rubric && rubric._status !== 'published') add('ART-19', 'warning', 'rubric', 'Rubrika chop etilmagan')

  const userIds = authorDocs.map((a) => idOf(a.user)).filter((x): x is Id => x !== undefined)
  if (userIds.length && institutionIds.length) {
    const users = await findMany(req, REL.users, userIds, { select: { name: true, declaredInterests: true } })
    const covered = new Set(institutionIds.map(String))
    const names = byId(institutionDocs)
    for (const u of users)
      for (const interest of (u.declaredInterests ?? []) as { institution?: unknown }[]) {
        const iid = idOf(interest.institution)
        if (iid !== undefined && covered.has(String(iid)))
          add('ART-31', 'warning', 'about', `Muallif ${String(u.name ?? '')} «${String(names.get(String(iid))?.name ?? iid)}» tashkiloti bilan manfaatdorligini maʼlum qilgan: maqolani bosh muharrir chop etadi`)
      }
  }

  // ── text (TXT-*, KR-*, ART-26) ────────────────────────────────────────────
  const tagged = demoMode ? undefined : institutionDocs.map((d) => String(d.name ?? ''))
  const items = [...textItems(fields, uz, { skip: SKIP }), ...bodyItems(nodes, body)]
  findings.push(...textFindings(items, () => ({ demoMode, extra: rules, tagged, arabic: 'warning' })))
  if (sponsored) {
    // SP-10: a glossary link whose label is a review term reads like a ruling in an advert.
    for (const [i, node] of (body?.root?.children ?? []).entries())
      for (const label of glossaryLabels(node))
        if (REVIEW.some((re) => re.test(label))) add('SP-10', 'warning', `body[${i}]`, `Homiylik materialida «${label}» lugʻat havolasi hukmga oʻxshaydi: havola matnini oʻzgartiring`)
  }
  const kr = (uz.kr ?? {}) as Record<string, string | undefined>
  const overridden = new Set(['title', 'lead', 'kicker'].filter((k) => kr[k]?.trim()))
  findings.push(...krFindings(items.filter((it) => ['title', 'lead', 'kicker', 'body'].includes(it.schema) && !overridden.has(it.schema))))
  for (const k of overridden)
    for (const f of checkKr(kr[k] as string, `kr.${k}`))
      findings.push(f.rule === 'KR-3' ? f : { ...f, rule: 'ART-26', level: 'error', message: `Kirill varianti kirill harflarida boʻlsin: ${f.message.charAt(0).toLowerCase()}${f.message.slice(1)}` })

  // ── Telegram caption written by hand (ART-29; the post itself is checked on its own save) ──
  const caption = (uz.telegram as { captionOverride?: string } | undefined)?.captionOverride
  if (caption?.trim()) {
    const withPhoto = idOf(uz.image) !== undefined
    const max = withPhoto ? Math.min(limits.telegramCaption, 1024) : TELEGRAM_TEXT_MAX
    const n = telegramCaptionLength(caption)
    if (n > max) add('ART-29', 'warning', 'telegram.captionOverride', `Telegram matni teglarsiz ${n} belgi: ${withPhoto ? 'rasm bilan' : 'rasmsiz'} ${max} belgidan oshmasin`)
  }
  return { findings, presence: presence(uz) }
}

/** Glossary-link labels under one node. */
function glossaryLabels(node: LexicalNode): string[] {
  const out: string[] = []
  const walk = (n: LexicalNode) => {
    const f = n.fields as { blockType?: string; label?: string } | undefined
    if (n.type === 'inlineBlock' && f?.blockType === 'glossaryLink' && f.label) out.push(f.label)
    for (const c of n.children ?? []) walk(c)
    if (n.type === 'block' && n.fields) for (const v of Object.values(n.fields as object)) if (isLexical(v)) walk(v.root)
  }
  walk(node)
  return out
}
