/**
 * The shapes the content API returns: the content model (./types.ts) after
 * localisation for one edition. Shared by src/content/index.ts and both
 * adapters.
 */
import type { ContentLang } from '@/i18n/config'
import type { Article, Rubric } from './types'

export type Localized<T> = T & { contentLang: ContentLang }

export type ArticleView = Localized<Article> & {
  readingMinutes: number
  url: string
}

export type RubricView = Localized<Omit<Rubric, 'translations'>>
