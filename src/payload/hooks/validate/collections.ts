import type { Field, PayloadRequest } from 'payload'

import { ARABIC, checkText, telegramCaptionLength, type Finding, type TextCheckOptions } from '../../../content/rules'
import { REL } from '../../fields/relations'
import type { LexicalState } from '../../lexical/serialize'
import { collectingCtx, paragraphs, references, structureFindings, type Target } from './lexical'
import { deepMerge, idOf, idsOf, isolated, overlayNonLocalized, pickLocale, ruleSettings, saveLocale, type Doc, type Gate, type Id } from './shared'
import { textFindings, textItems, type TextItem } from './text'

/**
 * The §7.2 rules for every collection other than articles: the text rules on
 * all public text (TXT-*), the uz values required at publish (§6.2), and the
 * GL-1, INST-1, MS-1, CLUB-1 and ART-29 rules. Only errors matter here:
 * these collections have no `validationWarnings` field, so a warning has
 * nowhere to be shown and is dropped by the caller.
 */

export interface DocCheckInput {
  req: PayloadRequest
  slug: string
  id?: Id
  fields: Field[]
  data: Doc
  originalDoc?: Doc
  gate: Gate
}

/** Rich-text fields of the inline editor, serialized to paragraph markup for the text rules. */
const RICH_FIELDS: Record<string, string[]> = {
  'glossary-terms': ['definition', 'origin', 'practice', 'example.text'],
  'club-events': ['report'],
}

/** uz values a publish needs (§3.5–3.11: "Req" on localized fields is enforced here, not by Payload). */
const REQUIRED_UZ: Record<string, [string, string][]> = {
  authors: [['name', 'Ism'], ['role', 'Lavozim'], ['bio', 'Qisqacha maʼlumot']],
  tags: [['label', 'Nomi']],
  'glossary-terms': [['short', 'Qisqa taʼrif'], ['definition', 'Taʼrif'], ['origin', 'Kelib chiqishi'], ['practice', 'Amaliyotda']],
  milestones: [['title', 'Sarlavha'], ['text', 'Matn']],
  'club-events': [['title', 'Sarlavha'], ['theme', 'Mavzu'], ['summary', 'Qisqacha']],
}

/** Internal fields of these collections. */
const SKIP: Record<string, string[]> = {
  'glossary-terms': ['aliases', 'translation'],
  institutions: ['translation', 'statusHistory'],
  milestones: ['translation'],
  'club-events': ['translation', 'agenda.time'],
  media: ['filename'],
  'telegram-posts': ['captionHtml', 'history', 'lastError', 'replyTo'],
}

/** TXT-5 (real organisation names) applies to article text, the glossary and the club (§7.2). */
const REAL_ORG_COLLECTIONS = new Set(['glossary-terms', 'club-events'])

const empty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (typeof v === 'object' && 'root' in (v as object) && !JSON.stringify(v).includes('"text":"'))

async function findPublished(req: PayloadRequest, collection: string, ids: Id[], select: Record<string, true>): Promise<Map<string, Doc>> {
  const unique = [...new Set(ids.map(String))]
  if (!unique.length) return new Map()
  const { docs } = await req.payload.find({
    collection: collection as never,
    where: { id: { in: unique } },
    depth: 0,
    limit: unique.length,
    pagination: false,
    draft: false,
    overrideAccess: true,
    ...(collection === REL.articles ? { trash: true } : {}),
    select: select as never,
    req: isolated(req),
  })
  return new Map((docs as Doc[]).map((d) => [String(d.id), d]))
}

const isLive = (d: Doc | undefined) => !!d && d._status === 'published' && !d.deletedAt

export async function checkCollectionDoc({ req, slug, id, fields, data, originalDoc, gate }: DocCheckInput): Promise<Finding[]> {
  const now = Date.now()
  const L = saveLocale(req)
  const current = deepMerge(originalDoc, data)
  let uz = current
  if (L !== 'uz' && id !== undefined) {
    const all = (await req.payload.findByID({ collection: slug as never, id, locale: 'all', depth: 0, disableErrors: true, overrideAccess: true, req: isolated(req), ...(slug === 'media' || slug === 'telegram-posts' ? {} : { draft: true }) })) as Doc | null
    uz = overlayNonLocalized(all ? pickLocale(all, 'uz', fields) : {}, current, fields)
  }
  const { demoMode, rules } = await ruleSettings(req)
  const out: Finding[] = []
  const add = (rule: string, path: string, message: string, level: Finding['level'] = 'error') => out.push({ rule, level, path, message })

  // ── rich text: structure, link targets, paragraph markup ─────────────────
  const richPaths = RICH_FIELDS[slug] ?? []
  const states = richPaths.map((p) => ({ path: p, state: p.split('.').reduce<unknown>((v, k) => (v as Doc | undefined)?.[k], uz) as LexicalState }))
  const termIds = states.flatMap((s) => references(s.state).docs.filter((d) => d.relationTo === REL.glossaryTerms).map((d) => d.id))
  const articleIds = states.flatMap((s) => references(s.state).docs.filter((d) => d.relationTo === REL.articles).map((d) => d.id))
  // One after another: nested reads share the transaction's connection (pg queues parallel queries on it).
  const terms = await findPublished(req, REL.glossaryTerms, [...termIds, ...idsOf(uz.related)], { slug: true, _status: true })
  const articles = await findPublished(req, REL.articles, [...articleIds, idOf(uz.article)].filter((x): x is Id => x !== undefined), { slug: true, _status: true, deletedAt: true })
  const targets = new Map<string, Target>()
  for (const [tid, t] of terms) targets.set(`${REL.glossaryTerms}:${tid}`, { slug: String(t.slug), path: `/lugat/${String(t.slug)}`, published: isLive(t) })
  for (const [aid, a] of articles) targets.set(`${REL.articles}:${aid}`, { slug: String(a.slug), path: `/${String(a.slug)}`, published: isLive(a) })
  const richItems = new Map<string, TextItem[]>()
  for (const { path, state } of states) {
    out.push(...structureFindings(state, 'inline', path))
    const ctx = collectingCtx({ locale: 'uz', targets, media: new Map(), prefix: (w) => w || path })
    const items = paragraphs(state, ctx, path).map((value, i) => ({ path: `${path}[${i}]`, schema: path, value }))
    // GL-1: an inline link to a term that does not exist is an error in the glossary.
    for (const f of ctx.findings) out.push(slug === 'glossary-terms' && f.rule === 'ART-19' && /oʻchirilgan/.test(f.message) ? { ...f, rule: 'GL-1', level: 'error' } : f)
    richItems.set(path, items)
  }

  // ── text rules on every public text field ────────────────────────────────
  const items = textItems(fields, uz, {
    skip: new Set(SKIP[slug] ?? []),
    rich: (_v, p) => richItems.get(p) ?? [],
  })
  const opts = (item: TextItem): TextCheckOptions => ({
    demoMode,
    extra: rules,
    realOrgs: REAL_ORG_COLLECTIONS.has(slug) && demoMode,
    arabic: slug === 'glossary-terms' ? 'error' : 'warning',
    ...(slug === 'institutions' && item.schema === 'name' ? { realOrgs: false } : {}),
  })
  out.push(...textFindings(items, opts))

  // ── per collection ────────────────────────────────────────────────────────
  switch (slug) {
    case 'glossary-terms': {
      const aliases = (uz.aliases ?? {}) as Record<string, unknown>
      for (const [k, v] of Object.entries(aliases))
        for (const s of Array.isArray(v) ? v : [v]) if (typeof s === 'string' && ARABIC.test(s)) add('TXT-11', `aliases.${k}`, 'Arab yozuvi ishlatilgan: lotin transliteratsiyasidan foydalaning')
      for (const rid of idsOf(uz.related)) {
        if (id !== undefined && String(rid) === String(id)) add('GL-1', 'related', 'Atama oʻziga aloqador boʻla olmaydi')
        else if (!terms.has(String(rid))) add('GL-1', 'related', 'Aloqador atama topilmadi (oʻchirilgan)')
      }
      if (uz.needsReview) add('NR-1', 'needsReview', 'Import qilingan atama hali koʻrib chiqilmagan: muharrir tekshirib, «Koʻrib chiqish kerak» belgisini olib tashlashi kerak')
      break
    }
    case 'institutions': {
      const day = String(uz.statusDate ?? '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || Date.parse(day) > now) add('INST-1', 'statusDate', 'Holat sanasi YYYY-MM-DD shaklida boʻlsin va kelajakda boʻlmasin')
      if (uz.type === 'window' && !String(uz.parent ?? '').trim()) add('INST-1', 'parent', 'Islom oynasi uchun bosh bankni yozing')
      checkLinkedArticle(uz, articles, add, 'INST-1')
      if (uz.status === 'granted' && !String(uz.statusSource ?? '').trim()) add('INST-1', 'statusSource', 'Litsenziya berilgan, lekin holat manbasi koʻrsatilmagan', 'warning')
      if (uz.needsReview) add('NR-1', 'needsReview', 'Import qilingan yozuv hali koʻrib chiqilmagan: muharrir tekshirib, «Koʻrib chiqish kerak» belgisini olib tashlashi kerak')
      break
    }
    case 'milestones': {
      if (!/^\d{4}-\d{2}(-\d{2})?$/.test(String(uz.date ?? ''))) add('MS-1', 'date', 'Sanani YYYY-MM yoki YYYY-MM-DD shaklida yozing')
      else if (uz.status === 'done' && Date.parse(String(uz.date)) > now) add('MS-1', 'status', '«Amalga oshgan» bosqich kelajak sanasi bilan', 'warning')
      checkLinkedArticle(uz, articles, add, 'MS-1')
      break
    }
    case 'club-events': {
      const starts = Date.parse(String(uz.startsAt ?? ''))
      const ends = Date.parse(String(uz.endsAt ?? ''))
      if (Number.isFinite(starts) && Number.isFinite(ends) && ends <= starts) add('CLUB-1', 'endsAt', 'Tugash vaqti boshlanishidan keyin boʻlsin')
      if (typeof uz.number === 'number') {
        const { totalDocs } = await req.payload.count({
          collection: REL.clubEvents,
          where: id === undefined ? { number: { equals: uz.number } } : { and: [{ number: { equals: uz.number } }, { id: { not_equals: id } }] },
          overrideAccess: true,
          req: isolated(req),
        })
        if (totalDocs) add('CLUB-1', 'number', `${uz.number}-raqamli uchrashuv allaqachon bor: boshqa tartib raqami yozing`)
      }
      break
    }
    case 'telegram-posts': {
      const html = String(uz.captionHtml ?? '')
      if (html.trim()) {
        const withPhoto = idOf(uz.photo) !== undefined || (await articleHasImage(req, uz.article))
        const max = withPhoto ? Math.min(rules.limits?.telegramCaption ?? 1024, 1024) : 4096
        const n = telegramCaptionLength(html)
        if (n > max) add('ART-29', 'captionHtml', `Post matni teglarsiz ${n} belgi: ${withPhoto ? 'rasm bilan' : 'rasmsiz'} ${max} belgidan oshmasin`)
        const plain = html.replace(/<[^>]*>/g, '')
        out.push(...checkText(plain, 'captionHtml', { demoMode, extra: rules, realOrgs: false }))
      }
      break
    }
  }

  // ── uz values required at publish ─────────────────────────────────────────
  if (gate === 'publish') for (const [name, label] of REQUIRED_UZ[slug] ?? []) if (empty(uz[name])) add('REQ', name, `Oʻzbekcha «${label}» toʻldirilmagan`)
  return out
}

function checkLinkedArticle(uz: Doc, articles: Map<string, Doc>, add: (rule: string, path: string, message: string) => void, rule: string) {
  const aid = idOf(uz.article)
  if (aid === undefined) return
  const a = articles.get(String(aid))
  if (!a || a.deletedAt) add(rule, 'article', 'Bogʻlangan maqola topilmadi yoki oʻchirilgan')
}

async function articleHasImage(req: PayloadRequest, article: unknown): Promise<boolean> {
  const aid = idOf(article)
  if (aid === undefined) return false
  const a = (await req.payload.findByID({ collection: REL.articles, id: aid, depth: 0, draft: false, disableErrors: true, overrideAccess: true, req: isolated(req), select: { image: true } as never })) as Doc | null
  return idOf(a?.image) !== undefined
}
