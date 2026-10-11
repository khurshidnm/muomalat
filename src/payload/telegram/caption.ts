import { telegramCaptionLength } from '../../content/rules'

/**
 * Telegram captions (CMS-SPEC §10.4). HTML `parse_mode`; only `<`, `>` and
 * `&` are escaped, MarkdownV2 is never used. Pure functions with no server
 * imports: the admin's caption counter uses them too.
 *
 *   <b>{title}</b>                       <b>Reklama</b> · {partner}
 *
 *   {lead}                               <b>{title}</b>
 *
 *   {shortUrl}                           {lead}
 *
 *   #{rubricHashtag}                     {shortUrl}
 *
 *                                        #reklama
 *
 * The link is bare (no `<a>`), so Telegram shows no "Open this link?" alert
 * (CMS-RESEARCH §2.8); no buttons, no signature, no `protect_content`.
 * Captions are Uzbek Latin: the channel has one edition.
 */

/** With a photo (sendPhoto, editMessageCaption). */
export const CAPTION_LIMIT = 1024
/** A text message (sendMessage, editMessageText). */
export const TEXT_LIMIT = 4096

export const SPONSORED_LABEL = 'Reklama'
export const SPONSORED_HASHTAG = '#reklama'
/** First line when the article names no partner. */
export const SPONSORED_FALLBACK_PARTNER = 'Hamkorlik materiali'
const PARTNER_MAX = 120

/** Length after entity parsing, in UTF-16 units: the conservative bound of §10.2 (rule ART-29). */
export const captionLength = (html: string) => telegramCaptionLength(html)

export const limitFor = (withPhoto: boolean) => (withPhoto ? CAPTION_LIMIT : TEXT_LIMIT)

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

/** Collapses whitespace in one-line values; keeps paragraph breaks out of titles and partner names. */
const oneLine = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
/** A lead keeps its line breaks but not runs of blank lines. */
const paragraph = (s: unknown) =>
  String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** `#tahlil` from the rubric slug: Telegram hashtags take letters, digits and `_` only. */
export function hashtagFor(rubricSlug: string | null | undefined): string | undefined {
  const tag = String(rubricSlug ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return tag && /[a-z]/.test(tag) ? `#${tag}` : undefined
}

/** `https://muomalat.uz/t/<code>` (§8.8). */
export const shortUrlFor = (siteUrl: string, code: string) => `${siteUrl.replace(/\/+$/, '')}/t/${code}`

export type ArticleCaptionInput = {
  title: string
  lead?: string | null
  shortUrl: string
  rubricSlug?: string | null
  sponsored?: boolean
  partner?: string | null
}

/** `<b>Reklama</b> · {partner}`: the fixed first line of an ad (Advertising Law Art. 6, 18). */
export const sponsoredFirstLine = (partner: string | null | undefined) =>
  `<b>${SPONSORED_LABEL}</b> · ${escapeHtml(oneLine(partner).slice(0, PARTNER_MAX) || SPONSORED_FALLBACK_PARTNER)}`

/**
 * The post caption from the template, shortened to `limit` when it must be:
 * the lead is cut at a word with «…», and dropped if too little of it fits.
 * Title, link, hashtag and the sponsored line are never cut.
 */
export function articleCaption(input: ArticleCaptionInput, limit = CAPTION_LIMIT): string {
  const title = `<b>${escapeHtml(oneLine(input.title))}</b>`
  const tag = input.sponsored ? SPONSORED_HASHTAG : hashtagFor(input.rubricSlug)
  const head = input.sponsored ? [sponsoredFirstLine(input.partner), title] : [title]
  const tail = [input.shortUrl, ...(tag ? [tag] : [])]
  const lead = paragraph(input.lead)
  const build = (l: string) => [...head, ...(l ? [escapeHtml(l)] : []), ...tail].join('\n\n')
  const full = build(lead)
  if (captionLength(full) <= limit || !lead) return full
  const budget = limit - captionLength(build('')) - 2 // the two newlines before the lead
  const cut = truncateText(lead, budget)
  return build(cut)
}

/** Plain text cut to `max` UTF-16 units at a word boundary, with «…»; empty when under 40 units would remain. */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text
  if (max < 40) return ''
  let cut = text.slice(0, max - 1)
  // Never leave half a surrogate pair.
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1)
  const space = cut.search(/\s\S*$/)
  if (space > max * 0.6) cut = cut.slice(0, space)
  return `${cut.replace(/[\s,;:.–-]+$/, '')}…`
}

const NOTE_LABELS: Record<string, string> = {
  correction: 'Tuzatish',
  clarification: 'Aniqlik',
  editors_note: 'Tahririyat izohi',
}

/** `dd.mm` in Tashkent (UTC+05:00 all year). */
export function tashkentDayMonth(at: Date | string | number): string {
  const d = new Date(new Date(at).getTime() + 5 * 60 * 60 * 1000).toISOString()
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`
}

/** "Tuzatish (dd.mm): {publicText}", escaped (§10.3 step 4). */
export const correctionNote = (kind: string, publicText: string, at: Date | string | number) =>
  `${NOTE_LABELS[kind] ?? NOTE_LABELS.correction} (${tashkentDayMonth(at)}): ${escapeHtml(oneLine(publicText))}`

/** The reply post for a factual correction: "TUZATISH: {publicText}\n{shortUrl}" (§10.3 step 4). */
export const correctionReplyText = (publicText: string, shortUrl: string) => `TUZATISH: ${escapeHtml(oneLine(publicText))}\n${shortUrl}`

/** The caption a retracted post is edited to when the bot can no longer delete it (§10.3 step 5). */
export function retractionCaption(input: { notice?: string | null; shortUrl?: string; sponsored?: boolean; partner?: string | null }, limit = CAPTION_LIMIT): string {
  const notice = paragraph(input.notice) || 'Muomalat tahririyati bu materialni olib tashladi.'
  const head = [...(input.sponsored ? [sponsoredFirstLine(input.partner)] : []), '<b>Material olib tashlandi</b>']
  const tail = input.shortUrl ? [input.shortUrl] : []
  const build = (n: string) => [...head, escapeHtml(n), ...tail].join('\n\n')
  const full = build(notice)
  return captionLength(full) <= limit ? full : build(truncateText(notice, limit - captionLength(build('')) - 2) || notice.slice(0, 40))
}

/**
 * The stored caption plus a note at the end, kept within `limit`. When the
 * sum is too long, plain paragraphs (no markup, no link, no hashtag: in our
 * template, the lead) are shortened, longest first. Returns undefined if
 * even that cannot make room.
 */
export function appendNote(caption: string, note: string, limit = CAPTION_LIMIT): string | undefined {
  // A dropped block becomes null, so the indices of the others stay valid.
  const blocks: (string | null)[] = caption.replace(/\s+$/, '').split('\n\n')
  const join = () => [...blocks.filter((b): b is string => b !== null), note].join('\n\n')
  let out = join()
  if (captionLength(out) <= limit) return out
  const plain = (b: string) => !/[<>]/.test(b) && !/https?:\/\//.test(b) && !/^#\S+$/.test(b.trim()) && b.trim() !== ''
  const order = blocks
    .map((b, i) => ({ i, n: captionLength(b ?? '') }))
    .filter(({ i }) => plain(blocks[i] ?? ''))
    .sort((a, b) => b.n - a.n)
  for (const { i } of order) {
    const over = captionLength(out) - limit
    if (over <= 0) break
    const text = decode(blocks[i] ?? '')
    const cut = truncateText(text, text.length - over)
    blocks[i] = cut ? escapeHtml(cut) : null
    out = join()
  }
  return captionLength(out) <= limit ? out : undefined
}

// ── structure ───────────────────────────────────────────────────────────────

const TAG = /<(\/?)([a-z-]+)((?:\s+[a-z-]+="[^"<>]*")*)\s*>/y
const ENTITY = /&(lt|gt|amp|quot);/y
const ALLOWED = new Set(['b', 'i', 'a'])

/**
 * Telegram refuses the whole message when its HTML does not parse, so a
 * caption must be well formed before it is approved: only `<b>`, `<i>` and
 * `<a href="https://…">`, properly nested and closed; `&` only in `&lt;`,
 * `&gt;`, `&amp;`, `&quot;`. Returns the Uzbek reason, or null when it is fine.
 */
export function captionHtmlProblem(html: string): string | null {
  const stack: string[] = []
  let i = 0
  while (i < html.length) {
    const ch = html[i]
    if (ch === '<') {
      TAG.lastIndex = i
      const m = TAG.exec(html)
      if (!m) return 'Matnda «<» belgisi bor: uni &lt; deb yozing yoki faqat <b>, <i>, <a> teglaridan foydalaning.'
      const [whole, closing, name, attrs] = m
      if (!ALLOWED.has(name)) return `<${name}> tegi ishlatilmaydi: faqat <b>, <i> va <a>.`
      if (closing) {
        if (attrs) return `</${name}> tegida atribut boʻlmaydi.`
        if (stack.pop() !== name) return `</${name}> tegi ochilmagan yoki tartibi notoʻgʻri.`
      } else {
        if (name === 'a') {
          const href = /^\s+href="(https:\/\/[^"\s]+|http:\/\/[^"\s]+)"$/.exec(attrs)
          if (!href) return '<a> tegida faqat href="https://…" boʻladi.'
          if (stack.includes('a')) return '<a> ichida boshqa <a> boʻlmaydi.'
        } else if (attrs) return `<${name}> tegida atribut boʻlmaydi.`
        stack.push(name)
      }
      i += whole.length
      continue
    }
    if (ch === '>') return 'Matnda «>» belgisi bor: uni &gt; deb yozing.'
    if (ch === '&') {
      ENTITY.lastIndex = i
      const m = ENTITY.exec(html)
      if (!m) return 'Matnda «&» belgisi bor: uni &amp; deb yozing.'
      i += m[0].length
      continue
    }
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(ch)) return 'Matnda koʻrinmas boshqaruv belgisi bor.'
    i++
  }
  if (stack.length) return `<${stack[stack.length - 1]}> tegi yopilmagan.`
  return null
}

// ── sponsored ───────────────────────────────────────────────────────────────

const FIRST_LINE = /^<b>Reklama<\/b> · ([^\n<>]{1,400})$/

/** Splits a sponsored caption into its partner (escaped, as written) and the rest; null if line one is not `<b>Reklama</b> · …`. */
export function splitSponsored(html: string): { partner: string; rest: string } | null {
  const nl = html.indexOf('\n')
  const first = nl === -1 ? html : html.slice(0, nl)
  const m = FIRST_LINE.exec(first)
  if (!m || !m[1].trim()) return null
  return { partner: m[1], rest: nl === -1 ? '' : html.slice(nl) }
}

/**
 * I4: a sponsored post keeps «Reklama» as its first line, and only the
 * partner on that line may change. Returns the Uzbek reason, or null.
 */
export function sponsoredEditProblem(stored: string, next: string): string | null {
  const after = splitSponsored(next)
  if (!after) return 'Reklama postining birinchi qatori «Reklama · hamkor» boʻlishi shart va olib tashlanmaydi.'
  if (decode(after.partner).length > PARTNER_MAX) return `Hamkor nomi ${PARTNER_MAX} belgidan oshmasin.`
  const before = splitSponsored(stored)
  if (before && before.rest !== after.rest) return 'Reklama postining matni oʻzgartirilmaydi: faqat birinchi qatordagi hamkor nomini tahrirlash mumkin.'
  return null
}

// ── messages read back from Telegram ────────────────────────────────────────

type Entity = { type: string; offset: number; length: number; url?: string }

const OPEN: Record<string, (e: Entity) => string> = {
  bold: () => '<b>',
  italic: () => '<i>',
  underline: () => '<u>',
  strikethrough: () => '<s>',
  spoiler: () => '<tg-spoiler>',
  code: () => '<code>',
  pre: () => '<pre>',
  blockquote: () => '<blockquote>',
  expandable_blockquote: () => '<blockquote expandable>',
  text_link: (e) => `<a href="${escapeHtml(e.url ?? '').replace(/"/g, '&quot;')}">`,
}
const CLOSE: Record<string, string> = {
  bold: '</b>',
  italic: '</i>',
  underline: '</u>',
  strikethrough: '</s>',
  spoiler: '</tg-spoiler>',
  code: '</code>',
  pre: '</pre>',
  blockquote: '</blockquote>',
  expandable_blockquote: '</blockquote>',
  text_link: '</a>',
}

/**
 * A channel message as HTML (for the record of manual posts and edits, §10.6
 * and the Art. 15 history). Offsets are UTF-16 units, like JS strings.
 */
export function entitiesToHtml(text: string, entities: Entity[] = []): string {
  // Telegram nests entities and never overlaps them, so the innermost open entity always ends first.
  const list = entities.filter((e) => OPEN[e.type] && e.length > 0).sort((a, b) => a.offset - b.offset || b.length - a.length)
  const end = (e: Entity) => e.offset + e.length
  let out = ''
  let pos = 0
  const stack: Entity[] = []
  const emitTo = (at: number) => {
    if (at > pos) out += escapeHtml(text.slice(pos, at))
    pos = Math.max(pos, at)
  }
  const closeEndingBy = (at: number) => {
    while (stack.length && end(stack[stack.length - 1]) <= at) {
      emitTo(end(stack[stack.length - 1]))
      out += CLOSE[stack.pop()!.type]
    }
  }
  for (const e of list) {
    closeEndingBy(e.offset)
    emitTo(e.offset)
    out += OPEN[e.type](e)
    stack.push(e)
  }
  closeEndingBy(Number.POSITIVE_INFINITY)
  emitTo(text.length)
  return out
}

/** The muomalat.uz links in a message (text and text_link entities), for matching manual posts to stories. */
export function siteLinksIn(text: string, entities: Entity[] = [], hosts: string[] = ['muomalat.uz']): string[] {
  const urls = [...text.matchAll(/https?:\/\/[^\s<>"«»]+/g)].map((m) => m[0])
  for (const e of entities) if (e.type === 'text_link' && e.url) urls.push(e.url)
  for (const e of entities) if (e.type === 'url') urls.push(text.slice(e.offset, e.offset + e.length))
  const out: string[] = []
  for (const raw of urls) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      if (hosts.some((h) => u.host === h || u.host === `www.${h}`)) out.push(u.pathname.replace(/\/+$/, '') || '/')
    } catch {
      // not a URL
    }
  }
  return [...new Set(out)]
}
