import type { Payload } from 'payload'

import type { Article, ArticleTranslation } from '../../content/types'
import { editorialHash, translationHash } from '../hooks/workflow/hash'
import { bodyToState } from '../lexical/fromMarkup'
import { markupCtx, type Refs } from './markup'
import { type Counter, type Data, type Doc, findExisting, IMPORT_CONTEXT, type Id, type ImportLog, isoZ, latest, TRANSLATED, type Translated, writeDoc } from './shared'
import type { MockCorpus } from './source'

/**
 * Step 7 of CMS-SPEC §11.2: the stories.
 *
 * Pass 1 makes sure every story exists (a minimal draft keyed by `legacyId`),
 * so related stories and body links to other stories resolve whatever the
 * order. Then, story by story:
 *  2. uz and the shared fields as a draft (body through fromMarkup, every block type);
 *  3. ru and en from `translations`, as drafts, each locale in its own call,
 *     then the locale's `translation` group: `approved` with the content hash
 *     the site's read gate checks (§6.3), or `in_edit` for a production-style
 *     import (`--translations=unapproved`);
 *  4. the publish, with the publication record stamped as the import:
 *     `workflowStatus: published`, first publication = `publishedAt` of the
 *     mock, `significantUpdateAt` = `updatedAt`, the approval hash of the
 *     content as published, and one history row. No person is named:
 *     approvedBy, publishedBy, translatedBy and reviewedBy stay empty, and the
 *     audit rows say `system:import`.
 *
 * Corrections become `{ kind: 'correction', publicText, createdAt }` rows; a
 * re-run sends each row with the id it already has (§11.1), so nothing written
 * in ru or en is lost. `views` is copied (the mock analytics).
 */

/** The workflow history row of an imported story. */
export const IMPORT_HISTORY_NOTE = 'Namunaviy maʼlumotlardan import qilindi (scripts/import-mock.ts)'

export interface ArticleImportOptions {
  translations: 'approved' | 'unapproved'
  rubrics: Map<string, Id>
  authors: Map<string, Id>
  tags: Map<string, Id>
  refs: Omit<Refs, 'articles'>
  log: ImportLog
}

const ids = (slugs: string[] | undefined, map: Map<string, Id>, what: string, where: string, log: ImportLog): Id[] =>
  (slugs ?? []).flatMap((s) => {
    const id = map.get(s)
    if (id === undefined) log.warn(`${where}: ${what} ${s} not found`)
    return id === undefined ? [] : [id]
  })

function translatedFields(tr: ArticleTranslation | undefined, body: Data | null): Data {
  return {
    title: tr?.title ?? null,
    lead: tr?.lead ?? null,
    kicker: tr?.kicker ?? null,
    imageCaption: tr?.imageCaption ?? null,
    body,
  }
}

export async function importArticles(payload: Payload, corpus: MockCorpus, counter: Counter, opts: ArticleImportOptions): Promise<Map<string, Id>> {
  const byLegacy = new Map<string, Id>()
  const byPath = new Map<string, Id>()
  const existing = new Map<string, Doc>()
  const where = (a: Article) => `article ${a.id}`

  // ── pass 1: every story has an id ────────────────────────────────────────
  for (const a of corpus.articles) {
    let doc = await findExisting(payload, 'articles', a.id, { slug: { equals: a.slug } })
    if (doc) existing.set(a.id, doc)
    else {
      doc = (await payload.create({
        collection: 'articles',
        locale: 'uz',
        draft: true,
        depth: 0,
        overrideAccess: true,
        context: IMPORT_CONTEXT,
        data: {
          legacyId: a.id,
          slug: a.slug,
          title: a.title,
          rubric: opts.rubrics.get(a.rubric),
          authors: ids(a.authors, opts.authors, 'author', where(a), opts.log),
          workflowStatus: 'draft',
          _status: 'draft',
        } as never,
      })) as unknown as Doc
      counter.created++
    }
    byLegacy.set(a.id, doc.id)
    byPath.set(`${a.rubric}/${a.slug}`, doc.id)
  }

  const refs: Refs = { ...opts.refs, articles: byPath }
  for (const a of corpus.articles) {
    const id = byLegacy.get(a.id)!
    const ctx = markupCtx(payload, refs, opts.log, where(a))
    const stored = existing.has(a.id) ? await latest(payload, 'articles', id, 'all') : undefined
    const storedRows = ((stored?.corrections as { id?: string }[] | undefined) ?? [])

    // ── pass 2: uz and the shared fields ───────────────────────────────────
    const uz: Data = {
      legacyId: a.id,
      slug: a.slug,
      rubric: opts.rubrics.get(a.rubric),
      authors: ids(a.authors, opts.authors, 'author', where(a), opts.log),
      title: a.title,
      kicker: a.kicker ?? null,
      lead: a.lead,
      body: bodyToState(a.body, ctx),
      image: a.image ? (opts.refs.media(a.image) ?? null) : null,
      imageCaption: a.image?.caption ?? null,
      tags: ids(a.tags, opts.tags, 'tag', where(a), opts.log),
      terms: ids(a.terms, refs.glossary, 'term', where(a), opts.log),
      related: ids(a.related, byLegacy, 'related story', where(a), opts.log),
      interviewee: a.interviewee
        ? {
            name: a.interviewee.name,
            role: a.interviewee.role,
            organisation: a.interviewee.organisation,
            portrait: a.interviewee.portrait ? (opts.refs.media(a.interviewee.portrait) ?? null) : null,
          }
        : { name: null, role: null, organisation: null, portrait: null },
      sources: a.sources.map((s) => ({ title: s.title, publisher: s.publisher, url: s.url ?? null, date: s.date ?? null, type: s.type ?? null })),
      sponsored: a.sponsored
        ? { enabled: true, partner: a.sponsored.partner, disclosure: a.sponsored.disclosure, category: 'general' }
        : { enabled: false, partner: null, disclosure: null },
      corrections: (a.corrections ?? []).map((c, i) => ({
        ...(storedRows[i]?.id ? { id: storedRows[i].id } : {}),
        kind: 'correction',
        publicText: c.text,
        createdAt: isoZ(c.date),
      })),
      featured: Boolean(a.featured),
      views: a.views,
    }

    // ── pass 3: ru and en ──────────────────────────────────────────────────
    const locales: Partial<Record<Translated, Data>> = {}
    for (const l of TRANSLATED) {
      const tr = a.translations?.[l]
      const had = Boolean((stored?.title as Record<string, unknown> | undefined)?.[l])
      if (tr) locales[l] = translatedFields(tr, bodyToState(tr.body, ctx) as unknown as Data)
      // The mock dropped this translation: clear the text and the status.
      else if (had) locales[l] = { ...translatedFields(undefined, null), translation: { status: 'missing', contentHash: null, approvedAt: null } }
    }
    await writeDoc(payload, { collection: 'articles', existing: existing.get(a.id) ?? { id }, uz, locales, publish: false })

    for (const l of TRANSLATED) {
      if (!a.translations?.[l]) continue
      const doc = await latest(payload, 'articles', id, l)
      const approved = opts.translations === 'approved'
      await payload.update({
        collection: 'articles',
        id,
        locale: l,
        draft: true,
        depth: 0,
        overrideAccess: true,
        context: IMPORT_CONTEXT,
        trash: true,
        data: {
          translation: {
            status: approved ? 'approved' : 'in_edit',
            translatedBy: null,
            reviewedBy: null,
            approvedAt: approved ? isoZ(a.updatedAt ?? a.publishedAt) : null,
            contentHash: approved ? translationHash(doc, l) : null,
            machine: { used: false, engine: null },
          },
        } as never,
      })
    }

    // ── pass 4: publish ────────────────────────────────────────────────────
    const uzDoc = await latest(payload, 'articles', id, 'uz')
    const published = isoZ(a.publishedAt)
    await payload.update({
      collection: 'articles',
      id,
      locale: 'uz',
      draft: false,
      depth: 0,
      overrideAccess: true,
      context: IMPORT_CONTEXT,
      trash: true,
      data: {
        _status: 'published',
        workflowStatus: 'published',
        publishedAt: published,
        firstPublishedAt: published,
        significantUpdateAt: isoZ(a.updatedAt),
        approvedBy: null,
        approvedAt: published,
        approvedContentHash: editorialHash(uzDoc),
        publishedBy: null,
        scheduleError: null,
        workflowHistory: [{ from: 'idea', to: 'published', by: null, at: published, comment: IMPORT_HISTORY_NOTE }],
      } as never,
    })
    if (existing.has(a.id)) counter.updated++
  }
  return byLegacy
}
