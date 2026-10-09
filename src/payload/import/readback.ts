import type { CollectionSlug, Payload } from 'payload'

import type { Article, ArticleBlock, Author, ClubEvent, GlossaryTerm, ImageRef, Institution, Milestone, Rubric, RubricSlug, Tag } from '../../content/types'
import { translationHash } from '../hooks/workflow/hash'
import { type LexicalState, type MediaDoc, type SerializeCtx, serializeBody, serializeParagraphs } from '../lexical/serialize'
import { mediaEntries, srcStem } from './media'
import { type Doc, type Id, idOf, toTashkent, TRANSLATED } from './shared'
import { MOCK_NOW, type MockCorpus } from './source'

/**
 * The imported content read back into the mock data's own shapes (the types
 * of src/content/types.ts, before any localisation), through the Local API as
 * the public site reads it: no user and `overrideAccess: false`, so only
 * published documents and public fields come back; `locale: 'all'` and
 * `fallbackLocale: false`; Media metadata in a separate query, because the
 * public read leaves uploads as bare ids (CMS-SPEC §6.5).
 *
 * This is the data-level half of the parity check (§11.4) and the round-trip
 * test of the import: readBack(payload) deep-equals the mock corpus, with
 * image `src` mapped back to the library file and image sizes compared as a
 * ratio. It applies the same read rules as the site:
 * - ru/en text only when `translation.status` is `approved` and the stored
 *   content hash matches the text (§6.3);
 * - a link to a document that is not published is dropped and its label kept;
 * - club `status` is computed from `startsAt` (§3.11), here against the mock clock.
 */

type L = 'uz' | 'ru' | 'en'
type Loc<T> = Partial<Record<L, T | null>> | null | undefined

const at = <T>(v: Loc<T>, l: L): T | undefined => (v && typeof v === 'object' ? (v[l] ?? undefined) : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined)

/** Drop undefined keys, as hand-written mock objects have none. */
function clean<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k]
  return o
}

const PUBLIC = { overrideAccess: false, draft: false, locale: 'all', fallbackLocale: false, depth: 0, pagination: false } as const

async function publicDocs(payload: Payload, collection: string): Promise<Doc[]> {
  const { docs } = await payload.find({ ...PUBLIC, collection: collection as CollectionSlug } as never)
  return docs as unknown as Doc[]
}

export interface ReadBack extends MockCorpus {
  /** Media id → the library file it was imported from (`/images/<stem>.svg`). */
  mediaSrc: Map<string, string>
}

export async function readBack(payload: Payload, opts: { now?: string } = {}): Promise<ReadBack> {
  const now = Date.parse(opts.now ?? MOCK_NOW)
  const [rubricDocs, tagDocs, authorDocs, termDocs, institutionDocs, milestoneDocs, clubDocs, articleDocs] = [
    await publicDocs(payload, 'rubrics'),
    await publicDocs(payload, 'tags'),
    await publicDocs(payload, 'authors'),
    await publicDocs(payload, 'glossary-terms'),
    await publicDocs(payload, 'institutions'),
    await publicDocs(payload, 'milestones'),
    await publicDocs(payload, 'club-events'),
    await publicDocs(payload, 'articles'),
  ]

  // Media: metadata is staff-only, so the site loads it with overrideAccess for the ids published documents use.
  const { docs: mediaDocs } = await payload.find({ collection: 'media', locale: 'all', fallbackLocale: false, depth: 0, pagination: false, overrideAccess: true } as never)
  const srcByStem = new Map(mediaEntries().map((e) => [e.key, e.src]))
  const mediaSrc = new Map<string, string>()
  const media = new Map<Id, MediaDoc>()
  for (const m of mediaDocs as unknown as (MediaDoc & { filename?: string })[]) {
    const src = (m.filename && srcByStem.get(srcStem(m.filename))) || m.url || ''
    mediaSrc.set(String(m.id), src)
    const doc = { ...m, url: src }
    media.set(m.id, doc)
    media.set(String(m.id), doc)
  }

  const byId = (docs: Doc[]) => new Map(docs.map((d) => [String(d.id), d]))
  const rubrics = byId(rubricDocs)
  const terms = byId(termDocs)
  const articles = byId(articleDocs)
  const slugOf = (map: Map<string, Doc>, v: unknown) => {
    const d = map.get(String(idOf(v)))
    return d ? (d.slug as string) : undefined
  }
  const slugs = (map: Map<string, Doc>, v: unknown) => (Array.isArray(v) ? v.map((x) => slugOf(map, x)).filter((s): s is string => !!s) : [])
  const legacyOf = (map: Map<string, Doc>, v: unknown) => str(map.get(String(idOf(v)))?.legacyId)

  const ctx = (locale: L): SerializeCtx => ({
    locale,
    mediaById: media,
    resolveDoc({ relationTo, value }) {
      if (relationTo === 'glossary-terms') {
        const slug = slugOf(terms, value)
        return slug ? { path: `/lugat/${slug}`, slug, published: true } : undefined
      }
      if (relationTo === 'articles') {
        const a = articles.get(String(idOf(value)))
        const rubric = a && slugOf(rubrics, a.rubric)
        return a && rubric ? { path: `/${rubric}/${a.slug as string}`, slug: a.slug as string, published: true } : undefined
      }
      return undefined
    },
    warn: () => {},
  })
  const paragraphs = (state: unknown, l: L = 'uz') => serializeParagraphs(state as LexicalState, ctx(l))
  const one = (state: unknown, l: L = 'uz') => paragraphs(state, l).join(' ')

  /** An ImageRef as the mock library makes it: uz alt and credit, ru/en in `translations`, the caption of the place that uses it. */
  const image = (v: unknown, caption?: string): ImageRef | undefined => {
    const m = media.get(idOf(v) as Id)
    if (!m) return undefined
    const translations: ImageRef['translations'] = {}
    for (const l of TRANSLATED) {
      const alt = at(m.alt as Loc<string>, l)
      if (alt) translations[l] = clean({ alt, credit: at(m.credit as Loc<string>, l) })
    }
    return clean({
      src: m.url ?? '',
      alt: at(m.alt as Loc<string>, 'uz') ?? '',
      width: m.width ?? 0,
      height: m.height ?? 0,
      caption: caption || at(m.caption as Loc<string>, 'uz'),
      credit: at(m.credit as Loc<string>, 'uz'),
      translations: Object.keys(translations).length ? translations : undefined,
    })
  }

  // ── vocabulary ──────────────────────────────────────────────────────────
  const rubricOut: Rubric[] = rubricDocs.map((r) => {
    const translations: Rubric['translations'] = {}
    for (const l of TRANSLATED) {
      const name = at(r.name as Loc<string>, l)
      if (name) translations[l] = { name, description: at(r.description as Loc<string>, l) ?? '' }
    }
    return clean({
      slug: r.slug as RubricSlug,
      order: r.order as number,
      name: at(r.name as Loc<string>, 'uz') ?? '',
      description: at(r.description as Loc<string>, 'uz') ?? '',
      translations: Object.keys(translations).length ? translations : undefined,
    })
  })

  const tagOut: Tag[] = tagDocs.map((t) => {
    const ru = at(t.label as Loc<string>, 'ru')
    const en = at(t.label as Loc<string>, 'en')
    return clean({ slug: t.slug as string, label: at(t.label as Loc<string>, 'uz') ?? '', labels: ru || en ? { ru: ru ?? '', en: en ?? '' } : undefined })
  })

  const authorOut: Author[] = authorDocs.map((a) => {
    const translations: Author['translations'] = {}
    for (const l of TRANSLATED) {
      const role = at(a.role as Loc<string>, l)
      if (role) translations[l] = clean({ name: at(a.name as Loc<string>, l), role, bio: at(a.bio as Loc<string>, l) ?? '' })
    }
    return clean({
      slug: a.slug as string,
      name: at(a.name as Loc<string>, 'uz') ?? '',
      role: at(a.role as Loc<string>, 'uz') ?? '',
      bio: at(a.bio as Loc<string>, 'uz') ?? '',
      commercial: a.commercial ? true : undefined,
      email: str(a.email),
      telegram: str(a.telegram),
      portrait: image(a.portrait),
      translations: Object.keys(translations).length ? translations : undefined,
    })
  })

  // ── glossary ────────────────────────────────────────────────────────────
  const glossaryOut: GlossaryTerm[] = termDocs.map((t) => {
    const aliases = (t.aliases ?? {}) as { ru?: string | null; en?: string | null; ar?: string | null; other?: string[] | null }
    const steps = (at(t.steps as Loc<{ text?: string }[]>, 'uz') ?? []).map((s) => s.text ?? '')
    const example = at(t.example as Loc<{ title?: string | null; text?: unknown }>, 'uz')
    return clean({
      slug: t.slug as string,
      term: t.term as string,
      aliases: clean({ ru: str(aliases.ru), en: str(aliases.en), ar: str(aliases.ar), other: aliases.other?.length ? aliases.other : undefined }),
      category: t.category as GlossaryTerm['category'],
      short: at(t.short as Loc<string>, 'uz') ?? '',
      definition: paragraphs(at(t.definition as Loc<unknown>, 'uz')),
      origin: one(at(t.origin as Loc<unknown>, 'uz')),
      practice: paragraphs(at(t.practice as Loc<unknown>, 'uz')),
      steps: steps.length ? steps : undefined,
      example: example?.title ? { title: example.title, text: one(example.text) } : undefined,
      related: slugs(terms, t.related),
    })
  })

  // ── market map ──────────────────────────────────────────────────────────
  const institutionOut: Institution[] = institutionDocs.map((i) =>
    clean({
      id: i.legacyId as string,
      name: i.name as string,
      type: i.type as Institution['type'],
      parent: str(i.parent),
      city: i.city as string,
      status: i.status as Institution['status'],
      statusDate: i.statusDate as string,
      products: (i.products as string[] | null) ?? [],
      note: at(i.note as Loc<string>, 'uz'),
      articleId: legacyOf(articles, i.article),
    }),
  )
  const milestoneOut: Milestone[] = milestoneDocs.map((m) =>
    clean({
      date: m.date as string,
      title: at(m.title as Loc<string>, 'uz') ?? '',
      text: at(m.text as Loc<string>, 'uz') ?? '',
      status: m.status as Milestone['status'],
      articleId: legacyOf(articles, m.article),
    }),
  )

  // ── club ────────────────────────────────────────────────────────────────
  const clubOut: ClubEvent[] = clubDocs.map((e) => {
    const report = paragraphs(at(e.report as Loc<unknown>, 'uz'))
    const takeaways = (at(e.takeaways as Loc<{ text?: string }[]>, 'uz') ?? []).map((t) => t.text ?? '')
    return clean({
      slug: e.slug as string,
      number: e.number as number,
      title: at(e.title as Loc<string>, 'uz') ?? '',
      theme: at(e.theme as Loc<string>, 'uz') ?? '',
      startsAt: toTashkent(e.startsAt as string),
      endsAt: toTashkent(e.endsAt as string),
      venue: { ...(e.venue as ClubEvent['venue']) },
      summary: at(e.summary as Loc<string>, 'uz') ?? '',
      agenda: ((e.agenda as { time: string; title?: Loc<string>; speaker?: string | null }[] | null) ?? []).map((row) =>
        clean({ time: row.time, title: at(row.title, 'uz') ?? '', speaker: str(row.speaker) }),
      ),
      speakers: ((e.speakers as { name: string; role: string; portrait?: unknown }[] | null) ?? []).map((s) => clean({ name: s.name, role: s.role, portrait: image(s.portrait) })),
      capacity: typeof e.capacity === 'number' ? e.capacity : undefined,
      status: Date.parse(e.startsAt as string) > now ? ('upcoming' as const) : ('past' as const),
      report: report.length ? report : undefined,
      takeaways: takeaways.length ? takeaways : undefined,
      image: image(e.image, at(e.imageCaption as Loc<string>, 'uz')),
    })
  })

  // ── stories ─────────────────────────────────────────────────────────────
  const articleOut: Article[] = articleDocs.map((a) => {
    const textIn = (l: L) => ({
      title: at(a.title as Loc<string>, l),
      kicker: at(a.kicker as Loc<string>, l),
      lead: at(a.lead as Loc<string>, l),
      imageCaption: at(a.imageCaption as Loc<string>, l),
      body: at(a.body as Loc<unknown>, l),
    })
    const translations: Article['translations'] = {}
    for (const l of TRANSLATED) {
      const tr = at(a.translation as Loc<{ status?: string; contentHash?: string | null }>, l)
      const text = textIn(l)
      // The read gate (§6.3); images in a translated body keep the library's uz alt here, as in the mock data.
      if (tr?.status !== 'approved' || !tr.contentHash || tr.contentHash !== translationHash(text as never, l)) continue
      translations[l] = clean({
        title: text.title ?? '',
        lead: text.lead ?? '',
        body: serializeBody(text.body as LexicalState, ctx('uz')) as ArticleBlock[],
        kicker: text.kicker,
        imageCaption: text.imageCaption,
      })
    }
    const uz = textIn('uz')
    const iv = (a.interviewee ?? {}) as { name?: string | null; role?: string | null; organisation?: string | null; portrait?: unknown }
    const sp = (a.sponsored ?? {}) as { enabled?: boolean | null; partner?: string | null; disclosure?: Loc<string> }
    const corrections = ((a.corrections as { createdAt?: string | null; publicText?: Loc<string> }[] | null) ?? []).map((c) => ({
      date: c.createdAt ? toTashkent(c.createdAt) : '',
      text: at(c.publicText, 'uz') ?? '',
    }))
    const termSlugs = slugs(terms, a.terms)
    const related = ((a.related as unknown[] | null) ?? []).map((r) => legacyOf(articles, r)).filter((x): x is string => !!x)
    return clean({
      id: a.legacyId as string,
      slug: a.slug as string,
      rubric: slugOf(rubrics, a.rubric) as RubricSlug,
      title: uz.title ?? '',
      kicker: uz.kicker,
      lead: uz.lead ?? '',
      body: serializeBody(uz.body as LexicalState, ctx('uz')),
      authors: slugs(byId(authorDocs), a.authors),
      publishedAt: toTashkent(a.publishedAt as string),
      updatedAt: a.significantUpdateAt ? toTashkent(a.significantUpdateAt as string) : undefined,
      image: image(a.image, uz.imageCaption),
      tags: slugs(byId(tagDocs), a.tags),
      sources: ((a.sources as Record<string, string | null>[] | null) ?? []).map((s) =>
        clean({ title: s.title ?? '', publisher: s.publisher ?? '', url: str(s.url), date: str(s.date), type: (str(s.type) as Article['sources'][number]['type']) ?? undefined }),
      ),
      terms: termSlugs.length ? termSlugs : undefined,
      related: related.length ? related : undefined,
      interviewee: iv.name ? clean({ name: iv.name, role: iv.role ?? '', organisation: iv.organisation ?? '', portrait: image(iv.portrait) }) : undefined,
      sponsored: sp.enabled ? { partner: sp.partner ?? '', disclosure: at(sp.disclosure, 'uz') ?? '' } : undefined,
      corrections: corrections.length ? corrections : undefined,
      featured: a.featured ? true : undefined,
      views: (a.views as number | null) ?? 0,
      translations: Object.keys(translations).length ? translations : undefined,
    })
  })

  return {
    rubrics: rubricOut,
    tags: tagOut,
    authors: authorOut,
    glossary: glossaryOut,
    institutions: institutionOut,
    milestones: milestoneOut,
    clubEvents: clubOut,
    articles: articleOut.sort((x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt)),
    mediaSrc,
  }
}
