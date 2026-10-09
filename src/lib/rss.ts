/**
 * RSS 2.0 feed per edition (/rss.xml, /kr/rss.xml, /ru/rss.xml, /en/rss.xml).
 *
 * - Items: the newest 50 stories of the edition, linked to that edition's URL.
 *   Russian and English feeds carry Uzbek originals where no translation
 *   exists; `dc:language` says which language each item is written in.
 * - Withdrawn and noindex stories are left out (CMS-SPEC §8.7). The guid is
 *   the story's id, not its URL, so it survives a slug change.
 * - Read through the cached content functions, so the `articles` tag
 *   refreshes the feed (§8.4).
 * - Partner content is prefixed with the localized "Hamkorlik materiali:" label
 *   so it is never mistaken for editorial copy in a reader or a Telegram bot.
 * - All dates are RFC 822 in Tashkent time (+0500).
 */
import { localeMeta, localePath, type Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { getArticles, getAuthors, type ArticleView } from '@/content'
import { site } from '@/content/data/site'
import { plainText } from '@/components/ui/InlineText'
import { tashkentParts } from '@/lib/format'
import { absoluteUrl, paths } from '@/lib/routes'

export const RSS_ITEM_LIMIT = 50
/** Minutes a reader may cache the feed. */
export const RSS_TTL = 30
export const RSS_CONTENT_TYPE = 'application/rss+xml; charset=utf-8'

// Characters XML 1.0 forbids outright (C0 controls except tab/LF/CR, U+FFFE/U+FFFF).
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

/** Escape text for XML element content and attribute values. */
export function xmlEscape(value: string): string {
  return value
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')

/** RFC 822 date-time in Tashkent time, e.g. "Thu, 08 Oct 2026 14:05:00 +0500". */
export function rfc822(iso: string): string {
  const p = tashkentParts(iso)
  const seconds = new Date(iso).getUTCSeconds()
  return `${DAYS[p.weekday]}, ${pad(p.day)} ${MONTHS[p.month]} ${p.year} ${pad(p.hours)}:${pad(p.minutes)}:${pad(seconds)} +0500`
}

/** Latest moment a story changed: update, correction or publication. */
export function articleModified(a: Pick<ArticleView, 'publishedAt' | 'updatedAt' | 'corrections'>): string {
  const dates = [a.publishedAt, a.updatedAt, ...(a.corrections ?? []).map((c) => c.date)].filter((d): d is string => !!d)
  return dates.reduce((max, d) => (Date.parse(d) > Date.parse(max) ? d : max))
}

/** Single-line plain text for a feed field (markup stripped, whitespace collapsed). */
function text(value: string): string {
  return plainText(value).replace(/\s+/g, ' ').trim()
}

function el(name: string, value: string, attrs: Record<string, string> = {}): string {
  return `<${name}${attributes(attrs)}>${xmlEscape(value)}</${name}>`
}

function empty(name: string, attrs: Record<string, string>): string {
  return `<${name}${attributes(attrs)}/>`
}

function attributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${xmlEscape(v)}"`)
    .join('')
}

/** Wrap child lines in an element, indenting them by two spaces. */
function block(name: string, lines: string[], attrs: Record<string, string> = {}): string[] {
  return [`<${name}${attributes(attrs)}>`, ...lines.map((l) => `  ${l}`), `</${name}>`]
}

const common = (locale: Locale) => pick(commonMessages, locale)

/** Stable across slug and rubric changes (H7). */
export const rssGuid = (a: Pick<ArticleView, 'id'>) => `muomalat:article:${a.id}`

function item(a: ArticleView, locale: Locale, t: ReturnType<typeof common>, authorNames: Map<string, string>): string[] {
  const link = absoluteUrl(localePath(locale, a.url))
  const title = a.sponsored ? `${t.labels.sponsored}: ${text(a.title)}` : text(a.title)
  const creators = a.authors.map((slug) => authorNames.get(slug) ?? slug)
  return block('item', [
    el('title', title),
    el('link', link),
    el('guid', rssGuid(a), { isPermaLink: 'false' }),
    el('pubDate', rfc822(a.publishedAt)),
    el('description', text(a.lead)),
    el('category', t.rubrics[a.rubric].name),
    ...creators.map((name) => el('dc:creator', name)),
    el('dc:language', a.contentLang),
    // Link-preview card (PNG) generated for every story; readers and bots show it as the thumbnail.
    empty('media:content', {
      url: absoluteUrl(`${localePath(locale, a.url)}/opengraph-image`),
      medium: 'image',
      type: 'image/png',
      width: '1200',
      height: '630',
    }),
  ])
}

/** Build the complete RSS 2.0 document for one edition. */
export async function buildRss(locale: Locale): Promise<string> {
  const t = common(locale)
  const articles = (await getArticles(locale)).filter((a) => !a.noindex).slice(0, RSS_ITEM_LIMIT)
  const authorNames = new Map((await getAuthors(locale)).map((a) => [a.slug, a.name]))
  const home = absoluteUrl(localePath(locale, paths.home()))
  const self = absoluteUrl(localePath(locale, paths.rss()))
  const title = `${site.name} — ${t.taglineInline}`
  const newest = articles.length ? articles.map(articleModified).reduce((m, d) => (Date.parse(d) > Date.parse(m) ? d : m)) : undefined
  const year = newest ? tashkentParts(newest).year : site.foundedYear

  const channel = block('channel', [
    el('title', title),
    el('link', home),
    el('description', t.description),
    el('language', localeMeta[locale].htmlLang),
    el('copyright', t.footer.copyright(year)),
    ...(newest ? [el('lastBuildDate', rfc822(newest))] : []),
    ...(articles[0] ? [el('pubDate', rfc822(articles[0].publishedAt))] : []),
    el('docs', 'https://www.rssboard.org/rss-specification'),
    el('ttl', String(RSS_TTL)),
    empty('atom:link', { href: self, rel: 'self', type: 'application/rss+xml' }),
    // RSS 2.0 allows GIF/JPEG/PNG up to 144px wide: the PNG touch icon, shown at 144.
    ...block('image', [el('url', absoluteUrl('/apple-icon')), el('title', title), el('link', home), el('width', '144'), el('height', '144')]),
    ...articles.flatMap((a) => item(a, locale, t, authorNames)),
  ])

  const rss = block('rss', channel, {
    version: '2.0',
    'xmlns:atom': 'http://www.w3.org/2005/Atom',
    'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
    'xmlns:media': 'http://search.yahoo.com/mrss/',
  })
  return ['<?xml version="1.0" encoding="UTF-8"?>', ...rss, ''].join('\n')
}
