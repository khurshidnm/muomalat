/**
 * Seeds a database with a slice of the mock corpus through the Local API, so
 * the Payload content adapter can be read side by side with the mock one
 * (tests/adapter, and the manual check of the site in payload mode).
 *
 * Not the importer (scripts/import-mock.ts): a small, self-contained seed for
 * tests. Rich text goes through src/payload/lexical/fromMarkup.ts; every
 * write uses `overrideAccess: true` and the importer's context, so the
 * workflow concern lets the publication through while the validation concern
 * still checks it. Idempotent: documents are found by `legacyId` or slug.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'

import { translationHash } from '@/payload/hooks/workflow/hash'
import { localizedContentHash } from '@/payload/hooks/workflow/translation'
import { bodyToState, editorNodes, paragraphsToState, type ImportCtx } from '@/payload/lexical/fromMarkup'
import type { Article, ImageRef } from '@/content/types'
import { yangiliklar } from '@/content/data/articles/yangiliklar'
import { tahlil } from '@/content/data/articles/tahlil'
import { intervyu } from '@/content/data/articles/intervyu'
import { izoh } from '@/content/data/articles/izoh'
import { dunyo } from '@/content/data/articles/dunyo'
import { authors } from '@/content/data/authors'
import { tags } from '@/content/data/tags'
import { glossary } from '@/content/data/glossary'
import { institutions } from '@/content/data/institutions'
import { milestones } from '@/content/data/milestones'
import { clubEvents } from '@/content/data/club'
import { rubrics } from '@/content/data/rubrics'

export const SEED_CONTEXT = { trustedInternal: true, importing: true } as const

/** The stories the adapter tests read: translations, corrections, sponsorship, interview, figures, tables, charts, term cards. */
export const SEED_ARTICLES = ['yn-01', 'yn-05', 'yn-06', 'yn-07', 'th-01', 'th-05', 'iz-06', 'iz-07', 'iv-01', 'dn-01']

export const ALL_ARTICLES: Article[] = [...yangiliklar, ...tahlil, ...intervyu, ...izoh, ...dunyo]

type Id = number | string
type Doc = Record<string, unknown> & { id: Id }
type L = 'ru' | 'en'
const TRANSLATED: L[] = ['ru', 'en']
const iso = (v?: string) => (v ? new Date(v).toISOString() : null)

export interface Seeded {
  media: Map<string, Id>
  rubrics: Map<string, Id>
  authors: Map<string, Id>
  tags: Map<string, Id>
  terms: Map<string, Id>
  articles: Map<string, Id>
  institutions: Map<string, Id>
  events: Map<string, Id>
}

const base = { depth: 0, overrideAccess: true, context: SEED_CONTEXT } as const

async function findOne(payload: Payload, collection: string, where: Record<string, unknown>): Promise<Doc | undefined> {
  const { docs } = await payload.find({ collection: collection as never, where: where as never, limit: 1, depth: 0, draft: true, overrideAccess: true, trash: true })
  return docs[0] as unknown as Doc | undefined
}

/** Create (or reuse) a published document, then write its ru/en fields in their own calls. */
async function upsert(
  payload: Payload,
  collection: string,
  where: Record<string, unknown>,
  uz: Record<string, unknown>,
  locales: Partial<Record<L, Record<string, unknown>>> = {},
): Promise<Id> {
  const found = await findOne(payload, collection, where)
  let id: Id
  if (found) {
    id = found.id
    await payload.update({ ...base, collection: collection as never, id, locale: 'uz', data: { ...uz, _status: 'published' } as never })
  } else {
    try {
      const doc = (await payload.create({ ...base, collection: collection as never, locale: 'uz', data: { ...uz, _status: 'published' } as never })) as unknown as Doc
      id = doc.id
    } catch (error) {
      // Another test file created it meanwhile (unique slug).
      const raced = await findOne(payload, collection, where)
      if (!raced) throw error
      id = raced.id
    }
  }
  for (const l of TRANSLATED) {
    if (locales[l]) await payload.update({ ...base, collection: collection as never, id, locale: l, data: { ...locales[l], _status: 'published' } as never })
  }
  return id
}

// ── media ───────────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.resolve('public')
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** Library SVG → PNG at least 1600 px wide with the exact mock ratio (Media accepts raster images only). */
async function rasterize(ref: ImageRef): Promise<Buffer> {
  const g = gcd(ref.width, ref.height)
  const [w, h] = [ref.width / g, ref.height / g]
  const k = Math.max(1, Math.ceil(Math.max(1600, ref.width) / w))
  const svg = await readFile(path.join(PUBLIC_DIR, ref.src))
  return sharp(svg, { density: (72 * w * k) / ref.width }).resize(w * k, h * k, { fit: 'fill' }).png().toBuffer()
}

/** A media key per file and alt text: portraits carry the person's name as alt. */
export const mediaKey = (ref: Pick<ImageRef, 'src' | 'alt'>) => `${ref.src}#${ref.alt}`

async function media(payload: Payload, seeded: Seeded, ref: ImageRef | undefined): Promise<Id | null> {
  if (!ref) return null
  const key = mediaKey(ref)
  const known = seeded.media.get(key)
  if (known !== undefined) return known
  const name = `${path.basename(ref.src, '.svg')}-${Buffer.from(ref.alt).toString('hex').slice(0, 12)}`
  const found = await findOne(payload, 'media', { filename: { equals: `${name}.webp` } })
  let id: Id
  if (found) id = found.id
  else {
    const data = await rasterize(ref)
    const doc = (await payload.create({
      ...base,
      collection: 'media',
      locale: 'uz',
      data: { alt: ref.alt, credit: ref.credit ?? 'Illyustratsiya: Muomalat', rightsCategory: 'staff', creator: 'Muomalat' } as never,
      file: { data, mimetype: 'image/png', name: `${name}.png`, size: data.length },
    })) as unknown as Doc
    id = doc.id
    for (const l of TRANSLATED) {
      const tr = ref.translations?.[l]
      if (tr) await payload.update({ ...base, collection: 'media', id, locale: l, data: { alt: tr.alt, credit: tr.credit ?? ref.credit } as never })
    }
  }
  seeded.media.set(key, id)
  return id
}

// ── the corpus ──────────────────────────────────────────────────────────────

export async function seedMock(payload: Payload, articleIds: string[] = SEED_ARTICLES): Promise<Seeded> {
  const seeded: Seeded = {
    media: new Map(),
    rubrics: new Map(),
    authors: new Map(),
    tags: new Map(),
    terms: new Map(),
    articles: new Map(),
    institutions: new Map(),
    events: new Map(),
  }
  const { articleNodes, inlineNodes } = editorNodes(payload)
  const stories = ALL_ARTICLES.filter((a) => articleIds.includes(a.id))
  const ctx: ImportCtx = {
    articleNodes,
    inlineNodes,
    glossaryId: (slug) => seeded.terms.get(slug),
    mediaId: () => undefined,
    internalDoc: (p) => {
      const m = /^\/lugat\/([a-z0-9-]+)$/.exec(p)
      if (m && seeded.terms.has(m[1])) return { relationTo: 'glossary-terms', value: seeded.terms.get(m[1])! }
      const a = /^\/([a-z]+)\/([a-z0-9-]+)$/.exec(p)
      const story = a ? ALL_ARTICLES.find((x) => x.rubric === a[1] && x.slug === a[2]) : undefined
      const id = story ? seeded.articles.get(story.id) : undefined
      return id !== undefined ? { relationTo: 'articles', value: id } : undefined
    },
    warn: () => {},
  }

  for (const r of rubrics) {
    seeded.rubrics.set(
      r.slug,
      await upsert(payload, 'rubrics', { slug: { equals: r.slug } }, { slug: r.slug, order: r.order, name: r.name, description: r.description }, r.translations),
    )
  }
  for (const t of tags) {
    seeded.tags.set(t.slug, await upsert(payload, 'tags', { slug: { equals: t.slug } }, { slug: t.slug, label: t.label }, t.labels ? { ru: { label: t.labels.ru }, en: { label: t.labels.en } } : {}))
  }
  for (const a of authors) {
    const portrait = await media(payload, seeded, a.portrait)
    seeded.authors.set(
      a.slug,
      await upsert(
        payload,
        'authors',
        { slug: { equals: a.slug } },
        {
          slug: a.slug,
          name: a.name,
          role: a.role,
          bio: a.bio,
          commercial: Boolean(a.commercial ?? a.slug === 'hamkorlik'),
          isTeam: a.slug === 'tahririyat' || a.slug === 'hamkorlik',
          email: a.email ?? null,
          telegram: a.telegram ?? null,
          portrait,
        },
        Object.fromEntries(
          TRANSLATED.filter((l) => a.translations?.[l]).map((l) => [l, { name: a.translations![l]!.name ?? a.name, role: a.translations![l]!.role, bio: a.translations![l]!.bio }]),
        ),
      ),
    )
  }

  // Glossary: every term (definitions link to each other), related in a second pass.
  const termData = (t: (typeof glossary)[number]) => ({
    slug: t.slug,
    term: t.term,
    aliases: { ru: t.aliases.ru ?? null, en: t.aliases.en ?? null, ar: t.aliases.ar ?? null, other: t.aliases.other ?? [] },
    category: t.category,
    short: t.short,
    definition: paragraphsToState(t.definition, ctx),
    origin: paragraphsToState([t.origin], ctx),
    practice: paragraphsToState(t.practice, ctx),
    steps: (t.steps ?? []).map((text) => ({ text })),
    example: t.example ? { title: t.example.title, text: paragraphsToState([t.example.text], ctx) } : { title: null, text: null },
    legacyId: `term:${t.slug}`,
  })
  for (const t of glossary) {
    const found = await findOne(payload, 'glossary-terms', { slug: { equals: t.slug } })
    if (found) seeded.terms.set(t.slug, found.id)
    else seeded.terms.set(t.slug, ((await payload.create({ ...base, collection: 'glossary-terms', locale: 'uz', draft: true, data: { slug: t.slug, term: t.term, category: t.category, short: t.short, _status: 'draft' } as never })) as unknown as Doc).id)
  }
  for (const t of glossary) {
    await payload.update({
      ...base,
      collection: 'glossary-terms',
      id: seeded.terms.get(t.slug)!,
      locale: 'uz',
      data: { ...termData(t), related: t.related.map((s) => seeded.terms.get(s)).filter(Boolean), _status: 'published' } as never,
    })
  }

  // Stories: drafts first (so links between them resolve), then ru/en, then publication.
  for (const a of stories) {
    const found = await findOne(payload, 'articles', { legacyId: { equals: a.id } })
    if (found) seeded.articles.set(a.id, found.id)
    else {
      const doc = (await payload.create({
        ...base,
        collection: 'articles',
        locale: 'uz',
        draft: true,
        data: { legacyId: a.id, slug: a.slug, title: a.title, lead: a.lead, rubric: seeded.rubrics.get(a.rubric), authors: a.authors.map((s) => seeded.authors.get(s)), _status: 'draft' } as never,
      })) as unknown as Doc
      seeded.articles.set(a.id, doc.id)
    }
  }
  for (const a of stories) {
    const id = seeded.articles.get(a.id)!
    const figureCtx: ImportCtx = { ...ctx, mediaId: (src) => [...seeded.media.entries()].find(([k]) => k.startsWith(`${src}#`))?.[1] }
    // Figures in the body need their media first.
    for (const body of [a.body, a.translations?.ru?.body, a.translations?.en?.body]) for (const b of body ?? []) if (b.type === 'figure') await media(payload, seeded, b.image)
    const image = await media(payload, seeded, a.image)
    const portrait = await media(payload, seeded, a.interviewee?.portrait)
    const figureMedia = (blocks: Article['body']) => {
      const byKey = new Map(blocks.flatMap((b) => (b.type === 'figure' ? [[b.image.src, seeded.media.get(mediaKey(b.image))]] : [])))
      return { ...figureCtx, mediaId: (src: string) => byKey.get(src) }
    }
    await payload.update({
      ...base,
      collection: 'articles',
      id,
      locale: 'uz',
      draft: true,
      data: {
        slug: a.slug,
        rubric: seeded.rubrics.get(a.rubric),
        authors: a.authors.map((s) => seeded.authors.get(s)),
        title: a.title,
        kicker: a.kicker ?? null,
        lead: a.lead,
        body: bodyToState(a.body, figureMedia(a.body)),
        image,
        imageCaption: a.image?.caption ?? null,
        tags: a.tags.map((s) => seeded.tags.get(s)).filter(Boolean),
        terms: (a.terms ?? []).map((s) => seeded.terms.get(s)).filter(Boolean),
        related: (a.related ?? []).map((r) => seeded.articles.get(r)).filter(Boolean),
        interviewee: a.interviewee
          ? { name: a.interviewee.name, role: a.interviewee.role, organisation: a.interviewee.organisation, portrait }
          : { name: null, role: null, organisation: null, portrait: null },
        sources: a.sources.map((s) => ({ title: s.title, publisher: s.publisher, url: s.url ?? null, date: s.date ?? null, type: s.type ?? null })),
        sponsored: a.sponsored ? { enabled: true, partner: a.sponsored.partner, disclosure: a.sponsored.disclosure, category: 'general' } : { enabled: false },
        corrections: (a.corrections ?? []).map((c) => ({ kind: 'correction', publicText: c.text, createdAt: iso(c.date) })),
        featured: Boolean(a.featured),
        views: a.views,
        _status: 'draft',
      } as never,
    })
    for (const l of TRANSLATED) {
      const tr = a.translations?.[l]
      if (!tr) continue
      await payload.update({
        ...base,
        collection: 'articles',
        id,
        locale: l,
        draft: true,
        data: { title: tr.title, lead: tr.lead, kicker: tr.kicker ?? null, imageCaption: tr.imageCaption ?? null, body: bodyToState(tr.body, figureMedia(tr.body)), _status: 'draft' } as never,
      })
      const latest = (await payload.findByID({ collection: 'articles', id, locale: l, draft: true, depth: 0, overrideAccess: true })) as unknown as Doc
      await payload.update({
        ...base,
        collection: 'articles',
        id,
        locale: l,
        draft: true,
        data: { translation: { status: 'approved', approvedAt: iso(a.updatedAt ?? a.publishedAt), contentHash: translationHash(latest, l) }, _status: 'draft' } as never,
      })
    }
  }
  for (const a of stories) {
    const published = iso(a.publishedAt)
    await payload.update({
      ...base,
      collection: 'articles',
      id: seeded.articles.get(a.id)!,
      locale: 'uz',
      draft: false,
      data: {
        _status: 'published',
        workflowStatus: 'published',
        publishedAt: published,
        firstPublishedAt: published,
        significantUpdateAt: iso(a.updatedAt),
      } as never,
    })
  }

  for (const i of institutions) {
    seeded.institutions.set(
      i.id,
      await upsert(
        payload,
        'institutions',
        { legacyId: { equals: i.id } },
        {
          legacyId: i.id,
          name: i.name,
          type: i.type,
          parent: i.parent ?? null,
          city: i.city,
          status: i.status,
          statusDate: i.statusDate,
          products: i.products,
          note: i.note ?? null,
          article: i.articleId ? (seeded.articles.get(i.articleId) ?? null) : null,
        },
      ),
    )
  }
  for (const [n, m] of milestones.entries()) {
    await upsert(payload, 'milestones', { legacyId: { equals: `ms-${n}` } }, {
      legacyId: `ms-${n}`,
      date: m.date,
      title: m.title,
      text: m.text,
      status: m.status,
      article: m.articleId ? (seeded.articles.get(m.articleId) ?? null) : null,
    })
  }
  for (const e of clubEvents) {
    const image = await media(payload, seeded, e.image)
    const speakers = []
    for (const s of e.speakers) speakers.push({ name: s.name, role: s.role, portrait: await media(payload, seeded, s.portrait) })
    seeded.events.set(
      e.slug,
      await upsert(payload, 'club-events', { slug: { equals: e.slug } }, {
        slug: e.slug,
        number: e.number,
        title: e.title,
        theme: e.theme,
        startsAt: iso(e.startsAt),
        endsAt: iso(e.endsAt),
        venue: e.venue,
        summary: e.summary,
        agenda: e.agenda.map((x) => ({ time: x.time, title: x.title, speaker: x.speaker ?? null })),
        speakers,
        capacity: e.capacity ?? null,
        report: e.report ? paragraphsToState(e.report, ctx) : null,
        takeaways: (e.takeaways ?? []).map((text) => ({ text })),
        image,
        imageCaption: e.image?.caption ?? null,
      }),
    )
  }
  return seeded
}

/** Approve a glossary or club translation the way the translation hook would have stored it. */
export async function approveTranslation(payload: Payload, collection: 'glossary-terms' | 'club-events', id: Id, l: L, fields: string[], data: Record<string, unknown>) {
  await payload.update({ ...base, collection, id, locale: l, data: { ...data, _status: 'published' } as never })
  const stored = (await payload.findByID({ collection, id, locale: l, depth: 0, overrideAccess: true })) as unknown as Doc
  const hash = localizedContentHash(fields)(stored, l)
  await payload.update({ ...base, collection, id, locale: l, data: { translation: { status: 'approved', contentHash: hash }, _status: 'published' } as never })
}
