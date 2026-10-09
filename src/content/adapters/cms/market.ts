/**
 * The market map from Payload: institutions and regulatory milestones
 * (CMS-SPEC §3.9, §3.10). Only the institution's `note` and the milestone's
 * title and text are localized. No translation hook stores a content hash for
 * these two collections, so their ru/en text is gated on the status alone.
 */
import type { Payload } from 'payload'

import type { Locale } from '@/i18n/config'
import type { Institution, InstitutionType, LicenceStatus, Milestone } from '../../types'
import type { Localized } from '../../views'
import { PUBLIC, readAs } from './client'
import { at, clean, contentLangOf, cyrillic, text, textAt, translationGate, type Doc, type Loc } from './locale'
import { idOf } from './media'

const translatedIn = (doc: Doc, locale: Locale): 'ru' | 'en' | undefined =>
  (locale === 'ru' || locale === 'en') && translationGate(at(doc.translation, locale), undefined) ? locale : undefined

const idString = (v: unknown) => (idOf(v) === undefined ? undefined : String(idOf(v)))

export async function loadInstitutions(payload: Payload, locale: Locale): Promise<Localized<Institution>[]> {
  const { docs } = await payload.find({
    collection: 'institutions',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    sort: 'id',
    select: {
      name: true,
      type: true,
      parent: true,
      city: true,
      status: true,
      statusDate: true,
      statusSource: true,
      licenceNumber: true,
      statusHistory: true,
      products: true,
      note: true,
      article: true,
      translation: true,
      legacyId: true,
    } as never,
    ...readAs(PUBLIC),
  })
  return (docs as unknown as Doc[]).map((d) => {
    const tl = translatedIn(d, locale)
    const src: Loc = tl && textAt(d.note, tl) ? tl : 'uz'
    const history = ((d.statusHistory as Doc[] | null | undefined) ?? [])
      .filter((h) => text(h.status) && text(h.date))
      .map((h) => clean({ status: h.status as LicenceStatus, date: h.date as string, source: text(h.source) }))
    const view: Institution = clean({
      id: String(d.id),
      name: text(d.name) ?? '',
      type: d.type as InstitutionType,
      parent: text(d.parent),
      city: text(d.city) ?? '',
      status: d.status as LicenceStatus,
      statusDate: text(d.statusDate) ?? '',
      products: Array.isArray(d.products) ? (d.products as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim() !== '') : [],
      note: textAt(d.note, src) ?? textAt(d.note, 'uz'),
      articleId: idString(d.article),
      statusSource: text(d.statusSource),
      licenceNumber: text(d.licenceNumber),
      statusHistory: history.length ? history : undefined,
    })
    const out = locale === 'kr' ? cyrillic(view, ['licenceNumber']) : view
    return { ...out, contentLang: contentLangOf(locale, src !== 'uz') }
  })
}

export async function loadMilestones(payload: Payload, locale: Locale): Promise<Localized<Milestone>[]> {
  const { docs } = await payload.find({
    collection: 'milestones',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    select: { date: true, title: true, text: true, status: true, article: true, translation: true } as never,
    // Creation order first, so milestones of the same month keep the order they were entered in.
    sort: 'id',
    ...readAs(PUBLIC),
  })
  return (docs as unknown as Doc[])
    .map((d) => {
      const tl = translatedIn(d, locale)
      const src: Loc = tl && textAt(d.title, tl) && textAt(d.text, tl) ? tl : 'uz'
      const view: Milestone = clean({
        date: text(d.date) ?? '',
        title: textAt(d.title, src) ?? '',
        text: textAt(d.text, src) ?? '',
        status: d.status as Milestone['status'],
        articleId: idString(d.article),
      })
      const out = locale === 'kr' ? cyrillic(view) : view
      return { ...out, contentLang: contentLangOf(locale, src !== 'uz') }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}
