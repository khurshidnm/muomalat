/**
 * Club meetings from Payload (CMS-SPEC §3.11). `status` is not stored: it is
 * computed from `startsAt` against the time of the request, outside the
 * cache (see withStatus), so a cached list never freezes a meeting as
 * upcoming.
 */
import type { Payload } from 'payload'

import type { Locale } from '@/i18n/config'
import { serializeParagraphs, type LexicalState } from '@/payload/lexical/serialize'
import { localizedContentHash } from '@/payload/hooks/workflow/translation'
import type { ClubEvent, ClubSpeaker } from '../../types'
import type { Localized } from '../../views'
import { tashkentIsoOrUndefined } from '../../dates'
import { readAs, type Reader } from './client'
import { at, clean, contentLangOf, cyrillic, text, textAt, translationGate, type Doc, type Loc } from './locale'
import { idOf, imageRef, loadMedia } from './media'
import { serializeContext, type Refs } from './refs'
import { localeValues } from './glossary'

/** The localized fields the club translation hook hashes (src/payload/hooks/concerns/workflow.ts). */
export const CLUB_TRANSLATED = ['title', 'theme', 'summary', 'imageCaption', 'report', 'takeaways']
const clubHash = localizedContentHash(CLUB_TRANSLATED)

/** A meeting as cached: everything except the computed status. */
export type StoredEvent = Omit<Localized<ClubEvent>, 'status'>

export async function fetchEventDocs(payload: Payload, reader: Reader, slug?: string): Promise<Doc[]> {
  const { docs } = await payload.find({
    collection: 'club-events',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    sort: '-startsAt',
    select: {
      slug: true,
      number: true,
      title: true,
      theme: true,
      startsAt: true,
      endsAt: true,
      venue: true,
      summary: true,
      image: true,
      imageCaption: true,
      capacity: true,
      registrationOpen: true,
      registrationClosesAt: true,
      agenda: true,
      speakers: true,
      report: true,
      takeaways: true,
      translation: true,
    } as never,
    ...(slug ? { where: { slug: { equals: slug } } } : {}),
    ...readAs(reader),
  })
  return docs as unknown as Doc[]
}

function eventGate(doc: Doc, l: 'ru' | 'en', reader: Reader) {
  if (reader.kind === 'preview') return textAt(doc.title, l) ? 'approved' : undefined
  return translationGate(at(doc.translation, l), () => clubHash(localeValues(doc, CLUB_TRANSLATED, l), l))
}

export async function eventsOf(payload: Payload, docs: Doc[], locale: Locale, refs: Refs, reader: Reader): Promise<StoredEvent[]> {
  const mediaIds = docs.flatMap((d) => [idOf(d.image), ...((d.speakers as Doc[] | null | undefined) ?? []).map((s) => idOf(s.portrait))])
  const media = await loadMedia(payload, mediaIds.filter((x): x is string | number => x !== undefined))
  const out: StoredEvent[] = []
  for (const d of docs) {
    const slug = text(d.slug)
    const startsAt = tashkentIsoOrUndefined(d.startsAt)
    const endsAt = tashkentIsoOrUndefined(d.endsAt)
    if (!slug || !startsAt || !endsAt) continue
    const translated = locale === 'ru' || locale === 'en' ? Boolean(eventGate(d, locale, reader)) : false
    const src: Loc = translated ? (locale as 'ru' | 'en') : 'uz'
    const T = (v: unknown) => textAt(v, src) ?? textAt(v, 'uz')
    const ctx = serializeContext(src, refs, media)
    const venue = (d.venue ?? {}) as Doc
    const speakers: ClubSpeaker[] = ((d.speakers as Doc[] | null | undefined) ?? [])
      .filter((s) => text(s.name))
      .map((s) => {
        const row = media.get(String(idOf(s.portrait)))
        return clean({ name: s.name as string, role: text(s.role) ?? '', portrait: row ? imageRef(row, src, { altOverride: s.name as string }) : undefined })
      })
    const report = serializeParagraphs(at<LexicalState>(d.report, src), ctx, 'report')
    const takeaways = ((at<Doc[]>(d.takeaways, src) ?? []) as Doc[]).map((t) => text(t.text)).filter((t): t is string => Boolean(t))
    const imageRow = media.get(String(idOf(d.image)))
    const view: StoredEvent = clean({
      slug,
      number: typeof d.number === 'number' ? d.number : 0,
      title: T(d.title) ?? '',
      theme: T(d.theme) ?? '',
      startsAt,
      endsAt,
      venue: { name: text(venue.name) ?? '', address: text(venue.address) ?? '', city: text(venue.city) ?? '' },
      summary: T(d.summary) ?? '',
      agenda: ((d.agenda as Doc[] | null | undefined) ?? [])
        .filter((a) => text(a.time))
        .map((a) => clean({ time: a.time as string, title: T(a.title) ?? '', speaker: text(a.speaker) })),
      speakers,
      capacity: typeof d.capacity === 'number' ? d.capacity : undefined,
      report: report.length ? report : undefined,
      takeaways: takeaways.length ? takeaways : undefined,
      image: imageRow ? imageRef(imageRow, src, { caption: textAt(d.imageCaption, src) ?? textAt(imageRow.caption, src) }) : undefined,
      registrationOpen: d.registrationOpen ? true : undefined,
      registrationClosesAt: tashkentIsoOrUndefined(d.registrationClosesAt),
      contentLang: contentLangOf(locale, translated),
    })
    out.push(locale === 'kr' ? { ...cyrillic(view, ['registrationClosesAt']), contentLang: view.contentLang } : view)
  }
  return out
}

/** The stored meeting with its status at `now`: upcoming until it starts (§3.11). */
export function withStatus(e: StoredEvent, now: string): Localized<ClubEvent> {
  return { ...e, status: Date.parse(e.startsAt) > Date.parse(now) ? 'upcoming' : 'past' }
}
