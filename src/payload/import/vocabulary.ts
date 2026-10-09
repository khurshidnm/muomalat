import type { Payload } from 'payload'

import { count, type Counter, findExisting, type Id, TRANSLATED, writeDoc } from './shared'
import type { MockCorpus } from './source'

/**
 * Steps 2–4 of CMS-SPEC §11.2: rubrics, tags and authors. Each is keyed by
 * its slug (`legacyId` = slug) and published; ru and en come from the mock
 * `translations` / `labels`. A personal byline's name stays empty in ru and
 * en (the admin says names are written once); team bylines translate theirs.
 */

/** Publish with no extra system values. */
const published = {}

export async function importRubrics(payload: Payload, corpus: MockCorpus, counter: Counter): Promise<Map<string, Id>> {
  const ids = new Map<string, Id>()
  for (const r of corpus.rubrics) {
    const existing = await findExisting(payload, 'rubrics', r.slug, { slug: { equals: r.slug } })
    const { doc, created } = await writeDoc(payload, {
      collection: 'rubrics',
      existing,
      uz: { legacyId: r.slug, slug: r.slug, order: r.order, name: r.name, description: r.description },
      locales: Object.fromEntries(TRANSLATED.map((l) => [l, { name: r.translations?.[l]?.name ?? null, description: r.translations?.[l]?.description ?? null }])),
      publish: published,
    })
    ids.set(r.slug, doc.id)
    count(counter, created)
  }
  return ids
}

export async function importTags(payload: Payload, corpus: MockCorpus, counter: Counter): Promise<Map<string, Id>> {
  const ids = new Map<string, Id>()
  for (const t of corpus.tags) {
    const existing = await findExisting(payload, 'tags', t.slug, { slug: { equals: t.slug } })
    const { doc, created } = await writeDoc(payload, {
      collection: 'tags',
      existing,
      uz: { legacyId: t.slug, slug: t.slug, label: t.label },
      locales: Object.fromEntries(TRANSLATED.map((l) => [l, { label: t.labels?.[l] ?? null }])),
      publish: published,
    })
    ids.set(t.slug, doc.id)
    count(counter, created)
  }
  return ids
}

/** Team bylines (JSON-LD Organization, CMS-SPEC §3.5). */
const TEAM = new Set(['tahririyat', 'hamkorlik'])

export async function importAuthors(
  payload: Payload,
  corpus: MockCorpus,
  counter: Counter,
  media: (ref: NonNullable<MockCorpus['authors'][number]['portrait']>) => Id | undefined,
): Promise<Map<string, Id>> {
  const ids = new Map<string, Id>()
  for (const a of corpus.authors) {
    const existing = await findExisting(payload, 'authors', a.slug, { slug: { equals: a.slug } })
    const { doc, created } = await writeDoc(payload, {
      collection: 'authors',
      existing,
      uz: {
        legacyId: a.slug,
        slug: a.slug,
        name: a.name,
        role: a.role,
        bio: a.bio,
        // isCommercialAuthor() in src/content: the mock marks the partner byline by its slug only.
        commercial: a.commercial ?? a.slug === 'hamkorlik',
        isTeam: TEAM.has(a.slug),
        email: a.email ?? null,
        telegram: a.telegram ?? null,
        portrait: a.portrait ? (media(a.portrait) ?? null) : null,
        active: true,
      },
      locales: Object.fromEntries(
        TRANSLATED.map((l) => {
          const tr = a.translations?.[l]
          return [l, { name: tr?.name ?? null, role: tr?.role ?? null, bio: tr?.bio ?? null }]
        }),
      ),
      publish: published,
    })
    ids.set(a.slug, doc.id)
    count(counter, created)
  }
  return ids
}
