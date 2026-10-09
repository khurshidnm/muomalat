import type { PayloadRequest } from 'payload'

import type { PublishEventKind } from '../../collections/PublishEvents'
import { REL } from '../../fields/relations'
import { asChangeKind, type ChangeKind } from '../../delivery/outbox'
import { utmContentFor } from '../../delivery/shortlinks'
import { articleTargets, type ArticleFacts } from '../../delivery/tags'
import { idOf, idsOf, isolated, liveHooks, slugsOf, type Doc, type Recorder } from './common'

/**
 * Stories (CMS-SPEC §8.5, first row). Every change of the live row becomes one
 * publish-events row: first publication, change, correction, withdrawal,
 * unpublish, delete (or trash), and republication.
 */
const withdrawn = (row: Doc | null | undefined) =>
  Boolean((row?.withdrawal as Doc | undefined)?.at) || row?.workflowStatus === 'withdrawn'

const sameSet = (a: unknown[], b: unknown[]) => {
  const x = new Set(a.map(String))
  const y = new Set(b.map(String))
  return x.size === y.size && [...x].every((v) => y.has(v))
}

const entities = (row: Doc | null | undefined) => (row ? [...idsOf(row.mentions), ...[idOf(row.about)].filter((x) => x !== undefined)] : [])

type Correction = { id?: string; kind?: string }
const CORRECTION_KINDS = new Set<ChangeKind>(['correction', 'clarification', 'editors_note'])
const corrections = (row: Doc | null | undefined) => (Array.isArray(row?.corrections) ? (row!.corrections as Correction[]) : [])

/**
 * Slugs for the live rows, in four queries at most (rubrics, tags, authors,
 * terms). One after another: they share the transaction's connection.
 */
async function factsFor(req: PayloadRequest, rows: (Doc | null)[]): Promise<(ArticleFacts | undefined)[]> {
  const present = rows.filter((r): r is Doc => Boolean(r))
  const rubrics = await slugsOf(req, REL.rubrics, present.map((r) => idOf(r.rubric)).filter((x) => x !== undefined))
  const tags = await slugsOf(req, REL.tags, present.flatMap((r) => idsOf(r.tags)))
  const authors = await slugsOf(req, REL.authors, present.flatMap((r) => idsOf(r.authors)))
  const terms = await slugsOf(req, REL.glossaryTerms, present.flatMap((r) => idsOf(r.terms)))
  const pick = (map: Map<string, string>, ids: unknown[]) => ids.map((i) => map.get(String(i))).filter((s): s is string => Boolean(s))
  const out: (ArticleFacts | undefined)[] = []
  for (const row of rows) {
    if (!row) {
      out.push(undefined)
      continue
    }
    const shortCode = typeof row.shortCode === 'string' && row.shortCode ? row.shortCode : undefined
    const rubricId = idOf(row.rubric)
    out.push({
      rubric: rubricId === undefined ? undefined : rubrics.get(String(rubricId)),
      slug: typeof row.slug === 'string' && row.slug ? row.slug : undefined,
      tags: pick(tags, idsOf(row.tags)),
      authors: pick(authors, idsOf(row.authors)),
      terms: pick(terms, idsOf(row.terms)),
      shortCode,
      utmContent: shortCode && row.id !== undefined ? await utmContentFor(req.payload, row.id, shortCode, isolated(req)) : undefined,
    })
  }
  return out
}

const decide: Recorder = async (c) => {
  const { req, before, after } = c
  const beforeRow = before ?? null
  let kind: PublishEventKind
  if (!c.wasLive) kind = beforeRow?.firstPublishedAt ? 'restore' : 'publish_first'
  else if (!c.isLive) kind = !after || after.deletedAt ? 'delete' : 'unpublish'
  else if (withdrawn(after) && !withdrawn(beforeRow)) kind = 'withdraw'
  else if (!withdrawn(after) && withdrawn(beforeRow)) kind = 'restore'
  else kind = 'publish_change'
  const first = kind === 'publish_first'
  const removal = kind === 'withdraw' || kind === 'unpublish' || kind === 'delete'
  const restored = kind === 'restore'
  // The story enters or leaves the public lists, the corrections list among them.
  const listed = removal || first || restored
  // The scheduler publishes with context.scheduledRun (CMS-SPEC §5.11); `first` keeps what Telegram needs.
  if (c.isLive && req.context.scheduledRun && kind !== 'withdraw') kind = 'schedule_run'

  const known = new Set(corrections(beforeRow).map((r) => r.id))
  const added = corrections(after).filter((r) => r.id && !known.has(r.id))
  let changeKind: ChangeKind | undefined
  if (kind === 'publish_change' || (kind === 'schedule_run' && !first)) {
    // The workflow clears the note in the same write and leaves the kind it published in req.context (§5.6).
    const published = (req.context as { workflowChange?: { kind?: unknown } }).workflowChange?.kind
    changeKind =
      asChangeKind(published) ?? asChangeKind(c.changeKind) ?? asChangeKind(added[added.length - 1]?.kind) ?? asChangeKind((after?.changeNote as Doc | undefined)?.kind)
  }

  const [factsBefore, factsAfter] = await factsFor(req, [c.wasLive ? beforeRow : null, c.isLive ? after : null])
  const targets = articleTargets({
    id: c.id,
    before: factsBefore,
    after: factsAfter,
    institutions: !sameSet(c.wasLive ? entities(beforeRow) : [], c.isLive ? entities(after) : []),
    corrections: added.length > 0 || (listed && corrections(after ?? beforeRow).length > 0),
    removal,
    // Cached copies of the notice or of the uncorrected text must go everywhere, query variants included.
    everyVariant: removal || restored || added.length > 0 || (changeKind !== undefined && CORRECTION_KINDS.has(changeKind)),
    first,
  })
  return { kind, changeKind, targets }
}

export const articleHooks = liveHooks(decide)
