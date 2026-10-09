import type { Payload } from 'payload'

import { count, type Counter, findExisting, type Id, type ImportLog, TRANSLATED, writeDoc } from './shared'
import { milestoneKey, type MockCorpus } from './source'

/**
 * Steps 6 and 8 of CMS-SPEC §11.2: the market map (institutions) and the
 * regulatory timeline (milestones). They run after the stories, so
 * `articleId` resolves through the story ids in one write; without stories
 * (a production vocabulary import) the link is left empty.
 *
 * Mock institutions use fictional names: in production they are imported
 * with `needsReview` and left drafts (NR-1 blocks their publication).
 */
export async function importInstitutions(
  payload: Payload,
  corpus: MockCorpus,
  counter: Counter,
  opts: { review: boolean; articles: Map<string, Id>; log: ImportLog },
): Promise<Map<string, Id>> {
  const ids = new Map<string, Id>()
  for (const i of corpus.institutions) {
    const existing = await findExisting(payload, 'institutions', i.id)
    const article = i.articleId ? opts.articles.get(i.articleId) : undefined
    if (i.articleId && article === undefined && opts.articles.size) opts.log.warn(`institution ${i.id}: article ${i.articleId} not found`)
    const { doc, created } = await writeDoc(payload, {
      collection: 'institutions',
      existing,
      uz: {
        legacyId: i.id,
        name: i.name,
        type: i.type,
        parent: i.parent ?? null,
        city: i.city,
        status: i.status,
        statusDate: i.statusDate,
        products: i.products,
        note: i.note ?? null,
        article: article ?? null,
        needsReview: opts.review,
      },
      // Notes have no ru/en text in the mock data; a re-run clears any left from an earlier import.
      locales: existing ? Object.fromEntries(TRANSLATED.map((l) => [l, { note: null }])) : undefined,
      publish: opts.review ? false : {},
    })
    ids.set(i.id, doc.id)
    count(counter, created)
  }
  return ids
}

export async function importMilestones(payload: Payload, corpus: MockCorpus, counter: Counter, opts: { articles: Map<string, Id>; log: ImportLog }): Promise<void> {
  for (const m of corpus.milestones) {
    const key = milestoneKey(m)
    const existing = await findExisting(payload, 'milestones', key)
    const article = m.articleId ? opts.articles.get(m.articleId) : undefined
    if (m.articleId && article === undefined) opts.log.warn(`milestone ${key}: article ${m.articleId} not found`)
    const { created } = await writeDoc(payload, {
      collection: 'milestones',
      existing,
      uz: { legacyId: key, date: m.date, title: m.title, text: m.text, status: m.status, article: article ?? null },
      publish: {},
    })
    count(counter, created)
  }
}
