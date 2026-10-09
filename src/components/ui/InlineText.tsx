import { Fragment } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { href, paths } from '@/lib/routes'

/**
 * Renders RichText inline markup:
 *   **bold**   *italic*   [label](/path or https://…)   [[glossary-slug|label]]   {en:English words}
 * `{en:…}` marks foreign (English) words: they keep their Latin spelling in the
 * Cyrillic edition and get lang="en".
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[\[[^|\]]+\|[^\]]+\]\]|\[[^\]]+\]\([^)\s]+\)|\{en:[^}]+\})/g

/** A number joined to a word by a hyphen: 2026-yil, 8-oktabr, 22-июл. */
const NUMBER_WORD = /(\d+[–-][\p{L}ʻʼ]+)/u

/**
 * Keeps "2026-yil", "8-oktabr" and similar tokens on one line, so a line never
 * ends in "2026-" (the fonts have no non-breaking hyphen). Render-only: use
 * plainText() for meta, RSS and JSON-LD.
 */
export function keepNumberWords(text: string): React.ReactNode {
  if (!/\d[–-]\p{L}/u.test(text)) return text
  return text.split(NUMBER_WORD).map((p, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {p}
      </span>
    ) : (
      p
    ),
  )
}

export function InlineText({
  text,
  locale,
  sponsored = false,
}: {
  text: string
  locale: Locale
  /** Partner content: external links are paid links (rel="sponsored"). */
  sponsored?: boolean
}) {
  const parts = text.split(TOKEN)
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{keepNumberWords(part.slice(2, -2))}</strong>
        if (part.startsWith('{en:') && part.endsWith('}')) {
          return (
            <span key={i} lang="en">
              {part.slice(4, -1)}
            </span>
          )
        }
        if (part.startsWith('[[')) {
          const [slug, label] = part.slice(2, -2).split('|')
          return (
            <Link key={i} href={href(locale, paths.term(slug))} prefetch={false} className="term-link">
              {label}
            </Link>
          )
        }
        if (part.startsWith('[')) {
          const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
          if (m) {
            const [, label, target] = m
            if (/^https?:\/\//.test(target)) {
              return (
                <a key={i} href={target} className="text-link" rel={sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}>
                  {label}
                </a>
              )
            }
            return (
              <Link key={i} href={href(locale, target)} prefetch={false} className="text-link">
                {label}
              </Link>
            )
          }
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{keepNumberWords(part.slice(1, -1))}</em>
        return <Fragment key={i}>{keepNumberWords(part)}</Fragment>
      })}
    </>
  )
}

/** Strip markup to plain text (meta descriptions, RSS, JSON-LD). */
export function plainText(text: string): string {
  return text
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\{en:([^}]+)\}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
}
