import type { Payload } from 'payload'

import { paragraphsToState } from '../lexical/fromMarkup'
import { markupCtx, type Refs } from './markup'
import { count, type Counter, findExisting, type ImportLog, isoZ, latest, writeDoc } from './shared'
import type { MockCorpus } from './source'

/**
 * Step 9 of CMS-SPEC §11.2: club meetings. `status` is not stored (the read
 * layer computes it from `startsAt`, §3.11). The report goes through
 * fromMarkup with the inline editor's nodes; speakers keep their portraits
 * (the Media item that carries the speaker's name as alt). Agenda rows have a
 * localized title, so a re-run sends them with the ids they already have.
 */
export async function importClubEvents(payload: Payload, corpus: MockCorpus, counter: Counter, opts: { refs: Refs; log: ImportLog }): Promise<void> {
  for (const e of corpus.clubEvents) {
    const existing = await findExisting(payload, 'club-events', e.slug, { slug: { equals: e.slug } })
    const stored = existing ? await latest(payload, 'club-events', existing.id, 'uz') : undefined
    const rows = (stored?.agenda as { id?: string }[] | undefined) ?? []
    const ctx = markupCtx(payload, opts.refs, opts.log, `club ${e.slug}`)
    const { created } = await writeDoc(payload, {
      collection: 'club-events',
      existing,
      uz: {
        legacyId: e.slug,
        slug: e.slug,
        number: e.number,
        title: e.title,
        theme: e.theme,
        startsAt: isoZ(e.startsAt),
        endsAt: isoZ(e.endsAt),
        venue: { ...e.venue },
        summary: e.summary,
        image: e.image ? (opts.refs.media(e.image) ?? null) : null,
        imageCaption: e.image?.caption ?? null,
        capacity: e.capacity ?? null,
        // The mock site takes applications for the upcoming meeting (klub#ariza) and for no other.
        registrationOpen: e.status === 'upcoming',
        agenda: e.agenda.map((row, i) => ({ ...(rows[i]?.id ? { id: rows[i].id } : {}), time: row.time, title: row.title, speaker: row.speaker ?? null })),
        speakers: e.speakers.map((s) => ({ name: s.name, role: s.role, portrait: s.portrait ? (opts.refs.media(s.portrait) ?? null) : null })),
        report: e.report?.length ? paragraphsToState(e.report, ctx) : null,
        takeaways: (e.takeaways ?? []).map((text) => ({ text })),
      },
      publish: {},
    })
    count(counter, created)
  }
}
