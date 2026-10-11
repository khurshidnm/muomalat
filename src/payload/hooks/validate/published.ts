import { createLocalReq, type CollectionSlug, type GlobalSlug, type Payload } from 'payload'

import { checkKr, KR_SKIP, type Finding } from '../../../content/rules'
import { REL } from '../../fields/relations'
import { checkArticleDoc } from './article'
import { checkCollectionDoc } from './collections'
import { checkGlobalDoc, labelRules, launchGate } from './globals'
import type { Doc, Id } from './shared'

/**
 * `npm run validate -- --source=payload` (CMS-SPEC §7.1): the published CMS
 * content through the same rules the CMS applies when it is published.
 *
 * - Every published document is read as the public site reads it (the Local
 *   API with no user and `overrideAccess: false`) and checked by this
 *   concern's own publish checks: checkArticleDoc for stories (gate
 *   `publish`, so every §7.2 rule, warnings included), checkCollectionDoc for
 *   the glossary, the market map, the club and the vocabulary, checkGlobalDoc
 *   (with SP-7 in every locale and SET-1) for the globals the site shows.
 *   Demo mode and the editorial-rules additions come from the CMS, as they do
 *   on a save. Withdrawn stories are left out: the site shows their notice.
 * - The Cyrillic edition is checked as the site renders it: checkKr over the
 *   payload content adapter's `kr` views, every issue an error, as the script
 *   does for the mock data.
 *
 * Read only. The scopes are the script's: articles, glossary, market, club,
 * messages (here the vocabulary and the globals; interface strings are code
 * and checked by the mock run), kr.
 */

export type Scope = 'articles' | 'glossary' | 'market' | 'club' | 'messages' | 'kr'

export interface PublishedReport {
  errors: string[]
  warnings: string[]
  counts: { articles: number; terms: number; institutions: number; milestones: number; clubEvents: number }
}

const COLLECTIONS: Record<Exclude<Scope, 'articles' | 'kr'>, { slug: string; label: string }[]> = {
  glossary: [{ slug: REL.glossaryTerms, label: 'term' }],
  market: [
    { slug: REL.institutions, label: 'institution' },
    { slug: REL.milestones, label: 'milestone' },
  ],
  club: [{ slug: REL.clubEvents, label: 'event' }],
  messages: [
    { slug: REL.tags, label: 'tag' },
    { slug: REL.authors, label: 'author' },
    { slug: REL.rubrics, label: 'rubric' },
  ],
}

/** Globals the public site shows; those with drafts are read as published. */
const GLOBALS = ['site-settings', 'home-page', 'navigation', 'ad-slots'] as const

/** Not text: KR_SKIP, and the fields only CMS views carry (§3.17), such as the short-link code. */
const KR_NOT_TEXT = new Set([...KR_SKIP, 'shortCode'])

const line = (prefix: string, f: Finding) => `${prefix}${f.path ? ` › ${f.path}` : ''}: ${f.message}${f.excerpt ? ` — «${f.excerpt}»` : ''}`

/** One finding per place and message: a rule seen through two checks is reported once. */
function unique(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    const key = `${f.level}|${f.path}|${f.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function published(payload: Payload, collection: string): Promise<Doc[]> {
  const { docs } = await payload.find({ collection: collection as CollectionSlug, locale: 'uz', depth: 0, pagination: false, draft: false, overrideAccess: false })
  return docs as unknown as Doc[]
}

const keyOf = (doc: Doc) => String(doc.slug ?? doc.legacyId ?? doc.id)

export async function validatePublished(payload: Payload, only?: Scope): Promise<PublishedReport> {
  const report: PublishedReport = { errors: [], warnings: [], counts: { articles: 0, terms: 0, institutions: 0, milestones: 0, clubEvents: 0 } }
  const record = (prefix: string, findings: Finding[]) => {
    for (const f of unique(findings)) (f.level === 'error' ? report.errors : report.warnings).push(line(prefix, f))
  }
  // One request for the whole run: the rule settings (demo mode, editorial-rules) are read once and kept on it.
  const req = await createLocalReq({ locale: 'uz', context: {} }, payload)
  const wants = (scope: Scope) => !only || only === scope

  if (wants('articles')) {
    const fields = payload.collections[REL.articles].config.fields
    const stories = (await published(payload, REL.articles)).filter((d) => d.workflowStatus !== 'withdrawn')
    report.counts.articles = stories.length
    for (const doc of stories) {
      const { findings } = await checkArticleDoc({ req, id: doc.id as Id, fields, data: doc, originalDoc: doc, gate: 'publish' })
      record(`article ${keyOf(doc)}`, findings)
    }
  }

  for (const [scope, list] of Object.entries(COLLECTIONS) as [Exclude<Scope, 'articles' | 'kr'>, { slug: string; label: string }[]][]) {
    if (!wants(scope)) continue
    for (const { slug, label } of list) {
      const fields = payload.collections[slug as CollectionSlug].config.fields
      const docs = await published(payload, slug)
      if (slug === REL.glossaryTerms) report.counts.terms = docs.length
      if (slug === REL.institutions) report.counts.institutions = docs.length
      if (slug === REL.milestones) report.counts.milestones = docs.length
      if (slug === REL.clubEvents) report.counts.clubEvents = docs.length
      for (const doc of docs) record(`${label} ${keyOf(doc)}`, await checkCollectionDoc({ req, slug, id: doc.id as Id, fields, data: doc, originalDoc: doc, gate: 'publish' }))
    }
  }

  if (wants('messages')) {
    for (const slug of GLOBALS) {
      const config = payload.globals.config.find((g) => g.slug === slug)
      if (!config) continue
      const doc = (await payload.findGlobal({ slug: slug as GlobalSlug, locale: 'uz', depth: 0, draft: false, overrideAccess: false })) as unknown as Doc
      const findings = await checkGlobalDoc({ req, slug, fields: config.fields, data: doc, originalDoc: doc, publishing: true })
      if (slug === 'site-settings') {
        // SP-7 in every locale, not only the one read; SET-1 on the stored settings.
        const all = (await payload.findGlobal({ slug: slug as GlobalSlug, locale: 'all', depth: 0, overrideAccess: false })) as unknown as Doc
        findings.push(...labelRules(all.labels, 'all'), ...launchGate(all))
      }
      record(`global ${slug}`, findings)
    }
  }

  if (wants('kr')) {
    const kr = new Map<string, { path: string; count: number }>()
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        for (const f of checkKr(value, path)) {
          const seen = kr.get(f.message)
          if (seen) seen.count++
          else kr.set(f.message, { path, count: 1 })
        }
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`))
      else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (!KR_NOT_TEXT.has(k)) walk(v, `${path}.${k}`)
    }
    // The site's own reads (src/content/adapters/payload.ts), loaded here so the CMS hooks never import the site.
    const site = await import('../../../content/adapters/payload')
    const summaries = await site.getArticles('kr')
    walk(await Promise.all(summaries.map(async (a) => (await site.getArticleById('kr', a.id)) ?? a)), 'kr articles')
    walk(await site.getGlossary('kr'), 'kr glossary')
    walk(await site.getInstitutions('kr'), 'kr institutions')
    walk(await site.getMilestones('kr'), 'kr milestones')
    walk(await site.getClubEvents('kr'), 'kr club')
    walk(await site.getTags('kr'), 'kr tags')
    walk(await site.getAuthors('kr'), 'kr authors')
    walk(await site.getRubrics('kr'), 'kr rubrics')
    for (const [issue, { path, count }] of kr) report.errors.push(`${path}: ${issue}${count > 1 ? ` (${count}×)` : ''}`)
  }
  return report
}
