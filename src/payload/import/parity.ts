import type { Article, ArticleBlock } from '../../content/types'
import { compare, type CompareOptions, type Difference } from './compare'
import { mediaEntries, srcStem } from './media'
import type { ReadBack } from './readback'
import { milestoneKey, type MockCorpus } from './source'

/**
 * Parity (CMS-SPEC §11.4), in two halves:
 *
 * - **data**: the corpus read back from Payload as the public site reads it
 *   (./readback) against the mock data, record by record. It checks the
 *   import and the read rules, and needs no adapter.
 * - **views**: every public content function of src/content/index.ts, in
 *   every locale, called on the mock adapter and on the Payload adapter
 *   (src/content/adapters/{mock,payload}.ts), results compared after mapping
 *   Payload ids to `legacyId` and Media URLs to the library files.
 *
 * Both report per collection or function and say what differs.
 */

export interface Section {
  name: string
  checked: number
  differences: { key: string; differences: Difference[] }[]
  notes: string[]
}

export const ok = (s: Section) => s.differences.length === 0

/** Glossary slugs the body references, in the order the CMS `terms` hook appends them (uz, then ru and en). */
function bodyTermRefs(a: Article): string[] {
  const out: string[] = []
  const add = (s: string) => !out.includes(s) && out.push(s)
  const scan = (v: unknown): void => {
    if (typeof v === 'string') for (const m of v.matchAll(/\[\[([^|\]]+)\|/g)) add(m[1])
    else if (Array.isArray(v)) v.forEach(scan)
    else if (v && typeof v === 'object') Object.values(v).forEach(scan)
  }
  for (const body of [a.body, a.translations?.ru?.body, a.translations?.en?.body] as (ArticleBlock[] | undefined)[])
    for (const b of body ?? []) {
      if (b.type === 'term') add(b.slug)
      else scan(b)
    }
  return out
}

/**
 * The mock corpus as the CMS model stores it, where the model differs on
 * purpose: the partner byline is `commercial` (the mock marks it by slug), a
 * story's `terms` also lists every term its body uses, and `featured: false`
 * is not written.
 */
export function expectedCorpus(corpus: MockCorpus): MockCorpus {
  return {
    ...corpus,
    authors: corpus.authors.map((a) => ({ ...a, commercial: (a.commercial ?? a.slug === 'hamkorlik') || undefined })),
    articles: corpus.articles.map((a) => {
      const terms = [...(a.terms ?? [])]
      for (const s of bodyTermRefs(a)) if (!terms.includes(s)) terms.push(s)
      return { ...a, terms: terms.length ? terms : undefined, featured: a.featured || undefined }
    }),
  }
}

type Keyed<T> = { name: string; key: (x: T) => string; mock: T[]; cms: T[] }

function section<T>({ name, key, mock, cms }: Keyed<T>, opts: CompareOptions): Section {
  const s: Section = { name, checked: mock.length, differences: [], notes: [] }
  const byKey = new Map(cms.map((x) => [key(x), x]))
  for (const m of mock) {
    const k = key(m)
    const c = byKey.get(k)
    byKey.delete(k)
    if (!c) {
      s.differences.push({ key: k, differences: [{ path: '(record)', mock: 'present', cms: 'missing or not published' }] })
      continue
    }
    const d = compare(m, c, opts)
    if (d.length) s.differences.push({ key: k, differences: d })
  }
  for (const k of byKey.keys()) s.differences.push({ key: k, differences: [{ path: '(record)', mock: 'missing', cms: 'present' }] })
  return s
}

/** The data half: mock corpus against the read-back corpus. */
export function dataParity(corpus: MockCorpus, cms: ReadBack, opts: CompareOptions = {}): Section[] {
  const want = expectedCorpus(corpus)
  return [
    section({ name: 'rubrics', key: (r) => r.slug, mock: want.rubrics, cms: cms.rubrics }, opts),
    section({ name: 'tags', key: (t) => t.slug, mock: want.tags, cms: cms.tags }, opts),
    section({ name: 'authors', key: (a) => a.slug, mock: want.authors, cms: cms.authors }, opts),
    section({ name: 'glossary-terms', key: (t) => t.slug, mock: want.glossary, cms: cms.glossary }, opts),
    section({ name: 'institutions', key: (i) => i.id, mock: want.institutions, cms: cms.institutions }, opts),
    section({ name: 'milestones', key: milestoneKey, mock: want.milestones, cms: cms.milestones }, opts),
    section({ name: 'club-events', key: (e) => e.slug, mock: want.clubEvents, cms: cms.clubEvents }, opts),
    section({ name: 'articles', key: (a) => a.id, mock: want.articles, cms: cms.articles }, opts),
  ]
}

/** Media URL (any form: /api/media/file/x.webp, an absolute URL, a next/image URL) → the library file it was imported from. */
export function mediaSrcResolver(): (url: string) => string | undefined {
  const byKey = new Map(mediaEntries().map((e) => [e.key, e.src]))
  return (url) => {
    let path = url
    try {
      const u = new URL(url, 'http://x')
      path = u.searchParams.get('url') ?? u.pathname
    } catch {}
    const file = decodeURIComponent(path.split('?')[0].split('/').pop() ?? '')
    // Sizes are stored as <name>-<w>x<h>.<ext>.
    return byKey.get(srcStem(file).replace(/-\d+x\d+$/, ''))
  }
}
