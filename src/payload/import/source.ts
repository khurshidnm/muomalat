/**
 * The mock corpus the importer reads (CMS-SPEC §11.2): every file under
 * src/content/data, in the order the content layer serves it. The importer
 * and the parity check read it from here so both see the same records.
 */
import { dunyo } from '../../content/data/articles/dunyo'
import { intervyu } from '../../content/data/articles/intervyu'
import { izoh } from '../../content/data/articles/izoh'
import { tahlil } from '../../content/data/articles/tahlil'
import { yangiliklar } from '../../content/data/articles/yangiliklar'
import { authors } from '../../content/data/authors'
import { clubEvents } from '../../content/data/club'
import { glossary } from '../../content/data/glossary'
import { CREDIT, images } from '../../content/data/images'
import { institutions } from '../../content/data/institutions'
import { milestones } from '../../content/data/milestones'
import { rubrics } from '../../content/data/rubrics'
import { site } from '../../content/data/site'
import { tags } from '../../content/data/tags'
import type { Article, Author, ClubEvent, GlossaryTerm, Institution, Milestone, Rubric, Tag } from '../../content/types'

export interface MockCorpus {
  rubrics: Rubric[]
  tags: Tag[]
  authors: Author[]
  glossary: GlossaryTerm[]
  institutions: Institution[]
  milestones: Milestone[]
  clubEvents: ClubEvent[]
  /** Newest first, as src/content/index.ts sorts them. */
  articles: Article[]
}

export const mock: MockCorpus = {
  rubrics,
  tags,
  authors,
  glossary,
  institutions,
  milestones,
  clubEvents,
  articles: [...yangiliklar, ...tahlil, ...intervyu, ...izoh, ...dunyo].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
}

export { CREDIT, images, site }

/** Reference "now" of the mock data (src/content/index.ts CONTENT_NOW). */
export const MOCK_NOW = '2026-10-08T16:00:00+05:00'

/**
 * The milestone key: milestones have no id or slug in the mock data, so the
 * importer keys them by date and title (`legacyId`).
 */
export const milestoneKey = (m: Pick<Milestone, 'date' | 'title'>) =>
  `ms-${m.date}-${m.title
    .toLowerCase()
    .replace(/[ʻʼ'‘’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`.slice(0, 120)
