/**
 * Site vocabulary from Payload: rubrics, bylines and topics (CMS-SPEC §3.5–3.7).
 * They are not gated by a translation status: ru/en show the translated
 * fields where they are filled in (contentLang = the edition), otherwise the
 * Uzbek values with contentLang 'uz', as the mock vocabulary does.
 */
import type { Payload } from 'payload'

import type { ContentLang, Locale } from '@/i18n/config'
import type { Author, Tag } from '../../types'
import type { Localized, RubricView } from '../../views'
import { isRubric, rubricSlugs } from '../../shared'
import { PUBLIC, readAs } from './client'
import { clean, cyrillic, text, textAt, type Doc } from './locale'
import { idOf, imageRef, loadMedia } from './media'

const translatedIn = (locale: Locale): 'ru' | 'en' | undefined => (locale === 'ru' || locale === 'en' ? locale : undefined)

function localize<T extends object>(uzValue: T, locale: Locale, translated: (T & object) | undefined, tl: 'ru' | 'en' | undefined): Localized<T> {
  if (tl && translated) return { ...translated, contentLang: tl as ContentLang }
  if (locale === 'kr') return { ...cyrillic(uzValue), contentLang: 'uz-Cyrl' }
  return { ...uzValue, contentLang: 'uz' }
}

export async function loadRubrics(payload: Payload, locale: Locale): Promise<RubricView[]> {
  const { docs } = await payload.find({
    collection: 'rubrics',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    sort: 'order',
    ...readAs(PUBLIC),
  })
  const tl = translatedIn(locale)
  return (docs as unknown as Doc[])
    .filter((d) => typeof d.slug === 'string' && isRubric(d.slug))
    .map((d) => {
      const base = { slug: d.slug as RubricView['slug'], order: typeof d.order === 'number' ? d.order : rubricSlugs.indexOf(d.slug as RubricView['slug']) + 1 }
      const uz = { ...base, name: textAt(d.name, 'uz') ?? '', description: textAt(d.description, 'uz') ?? '' }
      const name = tl ? textAt(d.name, tl) : undefined
      const description = tl ? textAt(d.description, tl) : undefined
      return localize(uz, locale, name && description ? { ...base, name, description } : undefined, tl) as RubricView
    })
    .sort((a, b) => a.order - b.order)
}

export async function loadAuthors(payload: Payload, locale: Locale): Promise<Localized<Author>[]> {
  const { docs } = await payload.find({
    collection: 'authors',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    // Creation order, as the vocabulary was entered (the mock files' order after import).
    sort: 'id',
    select: { slug: true, name: true, role: true, bio: true, commercial: true, isTeam: true, email: true, telegram: true, portrait: true },
    ...readAs(PUBLIC),
  })
  const list = docs as unknown as Doc[]
  const media = await loadMedia(payload, list.map((d) => idOf(d.portrait)).filter((x): x is string | number => x !== undefined))
  const tl = translatedIn(locale)
  return list
    .filter((d) => text(d.slug))
    .map((d) => {
      const name = textAt(d.name, 'uz') ?? (d.slug as string)
      const portraitRow = media.get(String(idOf(d.portrait)))
      const shared = {
        commercial: d.commercial ? true : undefined,
        isTeam: d.isTeam ? true : undefined,
        email: text(d.email),
        telegram: text(d.telegram),
      }
      const portraitIn = (l: 'uz' | 'ru' | 'en') => (portraitRow ? imageRef(portraitRow, l, { altOverride: name }) : undefined)
      const uz: Author = clean({ slug: d.slug as string, name, role: textAt(d.role, 'uz') ?? '', bio: textAt(d.bio, 'uz') ?? '', ...shared, portrait: portraitIn('uz') })
      const role = tl ? textAt(d.role, tl) : undefined
      const bio = tl ? textAt(d.bio, tl) : undefined
      const translated =
        tl && role && bio ? clean({ ...uz, name: textAt(d.name, tl) ?? name, role, bio, portrait: portraitIn(tl) }) : undefined
      return localize(uz, locale, translated, tl)
    })
}

export async function loadTags(payload: Payload, locale: Locale): Promise<Localized<Tag>[]> {
  const { docs } = await payload.find({
    collection: 'tags',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    // Creation order, as the vocabulary was entered (the mock files' order after import).
    sort: 'id',
    select: { slug: true, label: true },
    ...readAs(PUBLIC),
  })
  const tl = translatedIn(locale)
  return (docs as unknown as Doc[])
    .filter((d) => text(d.slug))
    .map((d) => {
      const uz: Tag = { slug: d.slug as string, label: textAt(d.label, 'uz') ?? (d.slug as string) }
      const label = tl ? textAt(d.label, tl) : undefined
      return localize(uz, locale, label ? { slug: uz.slug, label } : undefined, tl)
    })
}
