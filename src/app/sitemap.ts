import type { MetadataRoute } from 'next'
import { locales, localeMeta, localePath, type ContentLang, type Locale } from '@/i18n/config'
import {
  contentNow,
  getArticles,
  getArticlesByAuthor,
  getArticlesByRubric,
  getArticlesByTag,
  getArticlesByTerm,
  getAuthors,
  getClubEvents,
  getGlossary,
  getInstitutions,
  getMilestones,
  getTags,
  rubricSlugs,
  type ArticleView,
} from '@/content'
import { absoluteUrl, paths } from '@/lib/routes'
import { languageAlternates } from '@/lib/seo'
import { articleModified } from '@/lib/rss'
import { pageCount, pageSlice, rubricPagePath } from '@/components/listing/paginate'

/**
 * /sitemap.xml — one <url> per indexable edition URL (uz, uz-Cyrl, ru, en),
 * each carrying the page's full hreflang set (plus x-default → Uzbek Latin),
 * as Google's sitemap hreflang guidance asks.
 *
 * - Interface-translated pages (front page, rubrics, glossary index, map,
 *   club, standing pages, topics, authors) are self-canonical in every
 *   edition, so all four are listed.
 * - Stories, glossary terms and club meetings list only the editions that carry their text
 *   (see ownEditions): uz and uz-Cyrl always, ru/en only where a translation
 *   exists. Fallback pages show the Uzbek original and canonicalise to it,
 *   so they are left out of both the <loc> list and the alternates.
 * - lastModified comes from content dates only; pages whose content has no
 *   date (static pages, glossary index, upcoming events) omit it rather
 *   than report a made-up time.
 * - Rubric archive pages (/{rubric}/sahifa/{n}) are listed once a rubric
 *   outgrows one page (PAGE_SIZE from the listing helpers).
 * - Search (/qidiruv) is never listed: its pages are noindex, follow.
 * - Withdrawn and noindex stories are left out (CMS-SPEC §8.7).
 */

/** Seconds; a publication refreshes the sitemap sooner through tags and its path (CMS-SPEC §8.4). */
export const revalidate = 3600

type Entry = MetadataRoute.Sitemap[number]
type Freq = NonNullable<Entry['changeFrequency']>

const DAY = 86_400_000

/** Latest of the given ISO dates that is not in the future (relative to the content clock). */
function latest(dates: (string | undefined)[], now: number): string | undefined {
  let best: string | undefined
  for (const d of dates) {
    if (!d) continue
    const t = Date.parse(normalizeDate(d))
    if (Number.isNaN(t) || t > now) continue
    if (!best || t > Date.parse(normalizeDate(best))) best = d
  }
  return best ? normalizeDate(best) : undefined
}

/** "2026-06" → "2026-06-01", dates stay W3C Datetime as the sitemap protocol expects. */
function normalizeDate(d: string): string {
  return /^\d{4}-\d{2}$/.test(d) ? `${d}-01` : d
}

function newestStory(articles: ArticleView[], now: number): string | undefined {
  return latest(articles.map(articleModified), now)
}

interface EntryOpts {
  lastModified?: string
  changeFrequency: Freq
  priority: number
  /** Editions that carry the page (defaults to all). */
  languages?: readonly Locale[]
  images?: string[]
}

/** One entry per edition of a locale-free path, all sharing the same alternates. */
function entries(path: string, opts: EntryOpts): Entry[] {
  const editions = opts.languages ?? locales
  const alternates = { languages: languageAlternates(path, editions) }
  const images = opts.images?.length ? { images: opts.images.map((src) => absoluteUrl(src)) } : {}
  return editions.map((l) => ({
    url: absoluteUrl(localePath(l, path)),
    ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates,
    ...images,
  }))
}

/**
 * Editions whose page carries an item's text in the edition's own language
 * (uz → uz, kr → uz-Cyrl, ru/en → a translation). This is the rule the story
 * and term pages use for their canonical: a ru/en page showing the Uzbek
 * original canonicalises to the Uzbek URL, so it is not its own edition.
 */
function ownEditions(get: (l: Locale) => { contentLang: ContentLang } | undefined): Locale[] {
  return locales.filter((l) => get(l)?.contentLang === localeMeta[l].htmlLang)
}

/** One list per edition, keyed by `key`, for ownEditions. */
async function byEdition<T>(load: (l: Locale) => Promise<T[]>, key: (x: T) => string): Promise<Record<Locale, Map<string, T>>> {
  const lists = await Promise.all(locales.map(async (l) => [l, new Map((await load(l)).map((x) => [key(x), x]))] as const))
  return Object.fromEntries(lists) as Record<Locale, Map<string, T>>
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = Date.parse(contentNow())
  const articles = (await getArticles('uz')).filter((a) => !a.noindex)
  const out: Entry[] = []
  const add = (path: string, opts: EntryOpts) => out.push(...entries(path, opts))

  // Front page and rubrics
  add(paths.home(), { lastModified: newestStory(articles, now), changeFrequency: 'hourly', priority: 1 })
  for (const rubric of rubricSlugs) {
    const list = await getArticlesByRubric('uz', rubric)
    if (!list.length) continue
    add(paths.rubric(rubric), {
      lastModified: newestStory(list, now),
      changeFrequency: rubric === 'yangiliklar' ? 'hourly' : 'daily',
      priority: 0.8,
    })
    // Archive pages /{rubric}/sahifa/{n}: they shift as new stories push older ones down.
    for (let page = 2; page <= pageCount(list.length); page++) {
      add(rubricPagePath(rubric, page), {
        lastModified: newestStory(pageSlice(list, page), now),
        changeFrequency: 'daily',
        priority: 0.3,
      })
    }
  }

  // Stories
  const storyEditions = await byEdition(getArticles, (a) => a.id)
  for (const a of articles) {
    const modified = articleModified(a)
    const fresh = now - Date.parse(modified) < 2 * DAY
    add(paths.article(a), {
      lastModified: latest([modified], now),
      changeFrequency: fresh ? 'daily' : 'monthly',
      priority: a.sponsored ? 0.4 : 0.7,
      languages: ownEditions((l) => storyEditions[l].get(a.id)),
      images: a.image ? [a.image.src] : undefined,
    })
  }

  // Glossary
  add(paths.glossary(), { changeFrequency: 'weekly', priority: 0.7 })
  const termEditions = await byEdition(getGlossary, (t) => t.slug)
  for (const term of await getGlossary('uz')) {
    add(paths.term(term.slug), {
      lastModified: newestStory(await getArticlesByTerm('uz', term.slug), now),
      changeFrequency: 'monthly',
      priority: 0.6,
      languages: ownEditions((l) => termEditions[l].get(term.slug)),
    })
  }

  // Market map: latest licence status change or completed milestone
  add(paths.market(), {
    lastModified: latest(
      [
        ...(await getInstitutions('uz')).map((i) => i.statusDate),
        ...(await getMilestones('uz'))
          .filter((m) => m.status === 'done')
          .map((m) => m.date),
      ],
      now,
    ),
    changeFrequency: 'weekly',
    priority: 0.7,
  })

  // Club: the index changes when a meeting ends (report) or is announced
  const events = await getClubEvents('uz')
  const eventEditions = await byEdition(getClubEvents, (e) => e.slug)
  add(paths.club(), {
    lastModified: latest(
      events.filter((e) => e.status === 'past').map((e) => e.endsAt),
      now,
    ),
    changeFrequency: 'weekly',
    priority: 0.6,
  })
  for (const e of events) {
    const past = e.status === 'past'
    add(paths.clubEvent(e.slug), {
      lastModified: past ? latest([e.endsAt], now) : undefined,
      changeFrequency: past ? 'yearly' : 'weekly',
      priority: past ? 0.4 : 0.6,
      // Meetings are written in Uzbek unless a translation is approved: ru/en pages showing Uzbek canonicalise to uz.
      languages: ownEditions((l) => eventEditions[l].get(e.slug)),
      images: e.image ? [e.image.src] : undefined,
    })
  }

  // Standing pages
  add(paths.digest(), { changeFrequency: 'weekly', priority: 0.5 })
  add(paths.about(), { changeFrequency: 'yearly', priority: 0.4 })
  add(paths.advertise(), { changeFrequency: 'yearly', priority: 0.3 })
  add(paths.contact(), { changeFrequency: 'yearly', priority: 0.3 })
  add(paths.privacy(), { changeFrequency: 'yearly', priority: 0.2 })

  // Topic and author listings (only those with at least one story; empty ones are noindex)
  for (const tag of await getTags('uz')) {
    const list = await getArticlesByTag('uz', tag.slug)
    if (!list.length) continue
    add(paths.tag(tag.slug), { lastModified: newestStory(list, now), changeFrequency: 'daily', priority: 0.4 })
  }
  for (const author of await getAuthors('uz')) {
    const list = await getArticlesByAuthor('uz', author.slug)
    if (!list.length) continue
    add(paths.author(author.slug), { lastModified: newestStory(list, now), changeFrequency: 'weekly', priority: 0.3 })
  }

  return out
}
