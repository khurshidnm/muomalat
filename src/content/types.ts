/**
 * Content model. Mock data in src/content/data/* conforms to these types so a
 * headless CMS can replace it by implementing the same query functions in
 * src/content/index.ts.
 *
 * Text conventions
 * - Uzbek Latin uses U+02BB for oʻ / gʻ and U+02BC for the tutuq belgisi (aʼzo).
 * - Fields typed `RichText` accept a small inline markup:
 *     **bold**   *italic*   [label](/path-or-url)   [[glossary-slug|label]]
 * - Dates are ISO 8601 with the Tashkent offset, e.g. 2026-10-08T14:05:00+05:00.
 */

export type RichText = string

export type RubricSlug = 'yangiliklar' | 'tahlil' | 'intervyu' | 'izoh' | 'dunyo'

export interface ImageRef {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
  credit?: string
  /**
   * Alt text and credit for the ru/en editions. The content layer applies them
   * when the text around the image is shown in that language (a translated
   * story); Uzbek content keeps the Uzbek alt so it matches its lang="uz".
   */
  translations?: Partial<Record<'ru' | 'en', { alt: string; credit?: string }>>
}

export interface Rubric {
  slug: RubricSlug
  /** Position in navigation and listings. */
  order: number
  name: string
  /** One-sentence description used on the rubric front and in metadata. */
  description: string
  translations?: Partial<Record<'ru' | 'en', { name: string; description: string }>>
}

export interface Author {
  slug: string
  name: string
  role: string
  bio: string
  /** Commercial byline (partner content): never styled like a journalist's. */
  commercial?: boolean
  email?: string
  telegram?: string
  portrait?: ImageRef
  /** Byline in the ru/en editions. `name` only for team bylines; personal names stay as written. */
  translations?: Partial<Record<'ru' | 'en', { name?: string; role: string; bio: string }>>
}

export interface Tag {
  slug: string
  label: string
  /** Topic name in the ru/en editions (kr is transliterated from `label`). */
  labels?: { ru: string; en: string }
}

export interface TableColumn {
  label: string
  align?: 'left' | 'right'
  /** Shown in the header after the label, e.g. "mlrd soʻm", "%". */
  unit?: string
}

export interface BarChartSpec {
  kind: 'bar'
  title: string
  subtitle?: string
  /** Unit label for values, e.g. "mlrd soʻm" or "%". */
  unit: string
  /** Header for the bar labels in the data table, e.g. "Mintaqa" (default: "Toifa"). */
  categoryLabel?: string
  data: { label: string; value: number; highlight?: boolean }[]
  source?: string
  note?: string
}

export interface LineChartSpec {
  kind: 'line'
  title: string
  subtitle?: string
  unit: string
  /** Header for the x-axis column in the data table, e.g. "Oy" (default: "Davr"). */
  xLabel?: string
  xLabels: string[]
  series: { name: string; values: (number | null)[] }[]
  source?: string
  note?: string
}

export type ChartSpec = BarChartSpec | LineChartSpec

export type ArticleBlock =
  | { type: 'p'; text: RichText }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; ordered?: boolean; items: RichText[] }
  /** Pull quote. `cite` is the speaker, `role` their position. */
  | { type: 'quote'; text: string; cite?: string; role?: string }
  | { type: 'figure'; image: ImageRef }
  | {
      type: 'table'
      caption: string
      columns: TableColumn[]
      rows: (string | number | null)[][]
      note?: string
      source?: string
    }
  | { type: 'chart'; chart: ChartSpec }
  /** One interview turn: the question in bold sans, the answer paragraphs in serif. */
  | { type: 'qa'; question: string; answer: RichText[] }
  /** "Raqamlarda" key-figures box. */
  | { type: 'factbox'; title: string; items: { label: string; value: string }[]; note?: string }
  /** Context box ("Maʼlumot uchun"). */
  | { type: 'callout'; title?: string; text: RichText }
  /** Inline glossary card for a term. */
  | { type: 'term'; slug: string }

export interface Source {
  title: string
  publisher: string
  url?: string
  /** ISO date (YYYY-MM-DD). */
  date?: string
  type?: 'document' | 'report' | 'interview' | 'press' | 'data'
}

export interface Correction {
  /** ISO datetime the correction was made. */
  date: string
  text: string
}

export interface Sponsorship {
  /** Generic partner description, e.g. "Lizing kompaniyasi" (never a real brand in mocks). */
  partner: string
  disclosure: string
}

export interface Interviewee {
  name: string
  role: string
  organisation: string
  portrait?: ImageRef
}

export interface ArticleTranslation {
  title: string
  lead: string
  body: ArticleBlock[]
  /** Translated topical kicker; without it the rubric name is shown. */
  kicker?: string
  /** Translated caption for the hero image. */
  imageCaption?: string
}

export interface Article {
  id: string
  slug: string
  rubric: RubricSlug
  title: string
  /** Optional topical kicker shown instead of the rubric name, e.g. "Litsenziyalash". */
  kicker?: string
  /** Standfirst: one or two sentences under the headline. */
  lead: string
  body: ArticleBlock[]
  /** Author slugs. */
  authors: string[]
  publishedAt: string
  updatedAt?: string
  image?: ImageRef
  /** Tag slugs from src/content/data/tags.ts. */
  tags: string[]
  /** "Manbalar" list rendered after the body. */
  sources: Source[]
  /** Glossary slugs referenced by the story. */
  terms?: string[]
  /** Hand-picked related article ids (falls back to tag overlap). */
  related?: string[]
  interviewee?: Interviewee
  sponsored?: Sponsorship
  corrections?: Correction[]
  /** Candidate for the home page lead slot. */
  featured?: boolean
  /** Mock analytics used for "Koʻp oʻqilgan". */
  views: number
  translations?: Partial<Record<'ru' | 'en', ArticleTranslation>>
}

export type GlossaryCategory = 'shartnoma' | 'tamoyil' | 'institut' | 'bozor' | 'standart'

export interface GlossaryTerm {
  slug: string
  term: string
  /** Equivalents and spellings in other languages (Latin transliteration only; no Arabic script). */
  aliases: { ru?: string; en?: string; ar?: string; other?: string[] }
  category: GlossaryCategory
  /** One-sentence definition used in lists and cards. */
  short: string
  definition: RichText[]
  /** Etymology / where the term comes from. */
  origin: RichText
  /** How it works in practice in banks and companies. */
  practice: RichText[]
  /** Optional numbered mechanics. */
  steps?: string[]
  /** Optional worked example with numbers. */
  example?: { title: string; text: RichText }
  /** Related term slugs. */
  related: string[]
}

export type InstitutionType = 'bank' | 'window' | 'microfinance' | 'leasing' | 'takaful'

/** granted: licence issued; review: application under review; applied: filed; announced: intention announced. */
export type LicenceStatus = 'granted' | 'review' | 'applied' | 'announced'

export interface Institution {
  id: string
  name: string
  type: InstitutionType
  /** For Islamic windows: the conventional parent institution. */
  parent?: string
  city: string
  status: LicenceStatus
  /** ISO date of the latest status change. */
  statusDate: string
  products: string[]
  note?: string
  /** Article covering this institution. */
  articleId?: string
}

export interface Milestone {
  /** ISO date (YYYY-MM-DD) or month (YYYY-MM). */
  date: string
  title: string
  text: string
  status: 'done' | 'upcoming'
  articleId?: string
}

export interface ClubSpeaker {
  name: string
  role: string
  portrait?: ImageRef
}

export interface ClubEvent {
  slug: string
  /** Sequential meeting number. */
  number: number
  title: string
  /** Short topic line. */
  theme: string
  startsAt: string
  endsAt: string
  venue: { name: string; address: string; city: string }
  summary: string
  agenda: { time: string; title: string; speaker?: string }[]
  speakers: ClubSpeaker[]
  capacity?: number
  status: 'upcoming' | 'past'
  /** Write-up for past meetings. */
  report?: RichText[]
  takeaways?: string[]
  image?: ImageRef
}
