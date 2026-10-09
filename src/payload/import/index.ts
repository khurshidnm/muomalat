import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

import { importArticles } from './articles'
import { importClubEvents } from './club'
import { importGlossary } from './glossary'
import { importGlobals } from './globals'
import { importInstitutions, importMilestones } from './market'
import type { Refs } from './markup'
import { importMedia, mediaKey, srcStem } from './media'
import { type Counter, type Id, type ImportLog, newCounter } from './shared'
import { mock, type MockCorpus } from './source'
import { importAuthors, importRubrics, importTags } from './vocabulary'

/**
 * The mock importer (CMS-SPEC §11): src/content/data → Payload, in the order
 * of §11.2. scripts/import-mock.ts is the command line; the tests call
 * runImport directly against a database made by scripts/test-db.sh.
 */

export const SCOPES = ['media', 'rubrics', 'tags', 'authors', 'glossary', 'articles', 'institutions', 'milestones', 'club', 'globals'] as const
export type Scope = (typeof SCOPES)[number]

/**
 * What production may receive (§11.1, M1): the vocabulary only. Glossary
 * terms and institutions go in with `needsReview` and stay drafts; stories,
 * bylines, club meetings, the timeline, the images and the globals are mock
 * content and never reach production.
 */
export const PRODUCTION_SCOPES: readonly Scope[] = ['rubrics', 'tags', 'glossary', 'institutions']

export interface ImportOptions {
  scopes: Scope[]
  /** `approved`: ru/en go live as in the mock site (development, staging). `unapproved`: `in_edit`, for a person to approve. */
  translations: 'approved' | 'unapproved'
  /** SITE_ENV of the target; `production` turns on the §11.1 rules. */
  siteEnv?: string
  log?: ImportLog
  corpus?: MockCorpus
}

export interface ImportReport {
  counts: Partial<Record<Scope, Counter>>
  warnings: string[]
}

export class ImportRefused extends Error {}

/** Throws ImportRefused when the options break a §11.1 rule; nothing has been written then. */
export function checkOptions(opts: ImportOptions): void {
  if (opts.siteEnv !== 'production') return
  const refused = opts.scopes.filter((s) => !PRODUCTION_SCOPES.includes(s))
  if (refused.length) {
    throw new ImportRefused(
      `SITE_ENV=production: mock ${refused.join(', ')} are never imported into production (CMS-SPEC §11.1). Allowed: --only=${PRODUCTION_SCOPES.join(',')}.`,
    )
  }
  if (opts.translations === 'approved') {
    throw new ImportRefused('SITE_ENV=production: imported translations go in as «in_edit» for a person to approve. Pass --translations=unapproved.')
  }
}

const silent: ImportLog = { info: () => {}, warn: () => {} }

export async function runImport(payload: Payload, opts: ImportOptions): Promise<ImportReport> {
  checkOptions(opts)
  const corpus = opts.corpus ?? mock
  const warnings: string[] = []
  const outer = opts.log ?? silent
  const log: ImportLog = { info: outer.info, warn: (line) => (warnings.push(line), outer.warn(line)) }
  const has = (s: Scope) => opts.scopes.includes(s)
  const review = opts.siteEnv === 'production'
  const counts: ImportReport['counts'] = {}
  const counter = (s: Scope) => (counts[s] = newCounter())
  const done = (s: Scope) => {
    const c = counts[s]!
    log.info(`${s.padEnd(13)} ${c.created} created, ${c.updated} updated${c.unchanged ? `, ${c.unchanged} unchanged` : ''}`)
  }

  // Ids of what earlier steps wrote, or of what an earlier run wrote when a step is not selected.
  const media = has('media') ? await importMedia(payload, counter('media'), log, corpus) : await existingMedia(payload)
  if (has('media')) done('media')
  const refs: Omit<Refs, 'glossary' | 'articles'> = {
    media: (ref) => {
      const id = media.get(ref.alt ? mediaKey(ref) : srcStem(ref.src))
      if (id === undefined) log.warn(`no media item for ${ref.src}${ref.alt ? ` («${ref.alt}»)` : ''}`)
      return id
    },
  }
  const rubrics = has('rubrics') ? await importRubrics(payload, corpus, counter('rubrics')) : await existingIds(payload, 'rubrics')
  if (has('rubrics')) done('rubrics')
  const tags = has('tags') ? await importTags(payload, corpus, counter('tags')) : await existingIds(payload, 'tags')
  if (has('tags')) done('tags')
  const authors = has('authors') ? await importAuthors(payload, corpus, counter('authors'), (ref) => refs.media(ref)) : await existingIds(payload, 'authors')
  if (has('authors')) done('authors')
  const glossary = has('glossary')
    ? await importGlossary(payload, corpus, counter('glossary'), { review, refs: { ...refs, articles: new Map() }, log })
    : await existingIds(payload, 'glossary-terms')
  if (has('glossary')) done('glossary')
  const articles = has('articles')
    ? await importArticles(payload, corpus, counter('articles'), { translations: opts.translations, rubrics, authors, tags, refs: { ...refs, glossary }, log })
    : await existingIds(payload, 'articles')
  if (has('articles')) done('articles')
  if (has('institutions')) {
    await importInstitutions(payload, corpus, counter('institutions'), { review, articles, log })
    done('institutions')
  }
  if (has('milestones')) {
    await importMilestones(payload, corpus, counter('milestones'), { articles, log })
    done('milestones')
  }
  if (has('club')) {
    await importClubEvents(payload, corpus, counter('club'), { refs: { ...refs, glossary, articles: await articlePaths(payload) }, log })
    done('club')
  }
  if (has('globals')) {
    await importGlobals(payload, corpus, counter('globals'), { rubrics, articles, log })
    done('globals')
  }
  return { counts, warnings }
}

/** legacyId → id of the documents an earlier run imported. */
async function existingIds(payload: Payload, collection: string): Promise<Map<string, Id>> {
  const { docs } = await payload.find({
    collection: collection as never,
    where: { legacyId: { exists: true } },
    depth: 0,
    pagination: false,
    draft: false,
    overrideAccess: true,
    select: { legacyId: true } as never,
  })
  return new Map((docs as { id: Id; legacyId?: string | null }[]).filter((d) => d.legacyId).map((d) => [d.legacyId as string, d.id]))
}

async function existingMedia(payload: Payload): Promise<Map<string, Id>> {
  const { docs } = await payload.find({ collection: 'media', depth: 0, pagination: false, overrideAccess: true, select: { filename: true } as never })
  return new Map((docs as { id: Id; filename?: string | null }[]).filter((d) => d.filename).map((d) => [srcStem(d.filename as string), d.id]))
}

/** `rubric/slug` → id, for links from club reports to stories. */
async function articlePaths(payload: Payload): Promise<Map<string, Id>> {
  const { docs } = await payload.find({
    collection: 'articles',
    depth: 1,
    pagination: false,
    draft: false,
    overrideAccess: true,
    populate: { rubrics: { slug: true } } as never,
    select: { slug: true, rubric: true } as never,
  })
  return new Map(
    (docs as unknown as { id: Id; slug?: string; rubric?: { slug?: string } | null }[])
      .filter((d) => d.slug && d.rubric?.slug)
      .map((d) => [`${d.rubric!.slug}/${d.slug}`, d.id]),
  )
}

/**
 * The preflight of §11.1: the import runs only when `npm run validate`
 * passes on the mock data. Returns the validator's exit code and output.
 */
export function preflight(): { ok: boolean; output: string } {
  const script = fileURLToPath(new URL('../../../scripts/validate-content.ts', import.meta.url))
  const run = spawnSync(process.execPath, ['--import', 'tsx', script], { encoding: 'utf8', cwd: fileURLToPath(new URL('../../../', import.meta.url)) })
  return { ok: run.status === 0, output: `${run.stdout ?? ''}${run.stderr ?? ''}`.trim() }
}

export { mediaEntries, mediaKey, rasterSize, srcStem } from './media'
export { mock } from './source'
