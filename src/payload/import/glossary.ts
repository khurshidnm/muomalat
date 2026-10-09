import type { Payload } from 'payload'

import { paragraphsToState } from '../lexical/fromMarkup'
import { markupCtx, type Refs } from './markup'
import { count, type Counter, findExisting, IMPORT_CONTEXT, type Id, type ImportLog, writeDoc } from './shared'
import type { MockCorpus } from './source'

/**
 * Step 5 of CMS-SPEC §11.2: glossary terms. Pass 1 makes sure every term
 * exists (a minimal draft), so pass 2 can write `related` and the inline
 * glossary links in the rich text, which need the other terms' ids. Rich text
 * goes through fromMarkup with the inline editor's nodes.
 *
 * In production (`review`) a term is imported with `needsReview` and left a
 * draft: NR-1 blocks its publication until an editor has checked it (§11.1).
 */
export async function importGlossary(
  payload: Payload,
  corpus: MockCorpus,
  counter: Counter,
  opts: { review: boolean; refs: Omit<Refs, 'glossary'>; log: ImportLog },
): Promise<Map<string, Id>> {
  const ids = new Map<string, Id>()
  const existing = new Map<string, Awaited<ReturnType<typeof findExisting>>>()
  for (const t of corpus.glossary) {
    const found = await findExisting(payload, 'glossary-terms', t.slug, { slug: { equals: t.slug } })
    if (found) {
      ids.set(t.slug, found.id)
      existing.set(t.slug, found)
      continue
    }
    const doc = await payload.create({
      collection: 'glossary-terms',
      locale: 'uz',
      draft: true,
      depth: 0,
      overrideAccess: true,
      context: IMPORT_CONTEXT,
      data: { legacyId: t.slug, slug: t.slug, term: t.term, category: t.category, needsReview: opts.review, _status: 'draft' } as never,
    })
    ids.set(t.slug, doc.id)
    counter.created++
  }

  const refs: Refs = { ...opts.refs, glossary: ids }
  for (const t of corpus.glossary) {
    const ctx = markupCtx(payload, refs, opts.log, `glossary ${t.slug}`)
    const found = existing.get(t.slug)
    await writeDoc(payload, {
      collection: 'glossary-terms',
      existing: found ?? { id: ids.get(t.slug)! },
      uz: {
        legacyId: t.slug,
        slug: t.slug,
        term: t.term,
        category: t.category,
        needsReview: opts.review,
        aliases: { ru: t.aliases.ru ?? null, en: t.aliases.en ?? null, ar: t.aliases.ar ?? null, other: t.aliases.other ?? [] },
        short: t.short,
        definition: paragraphsToState(t.definition, ctx),
        origin: paragraphsToState([t.origin], ctx),
        practice: paragraphsToState(t.practice, ctx),
        steps: (t.steps ?? []).map((text) => ({ text })),
        example: t.example ? { title: t.example.title, text: paragraphsToState([t.example.text], ctx) } : { title: null, text: null },
        related: t.related.map((slug) => {
          const id = ids.get(slug)
          if (id === undefined) opts.log.warn(`glossary ${t.slug}: related term ${slug} not found`)
          return id
        }).filter((id) => id !== undefined),
      },
      publish: opts.review ? false : {},
    })
    if (found) count(counter, false)
  }
  return ids
}
