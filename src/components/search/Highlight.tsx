import { Fragment } from 'react'
import { splitByMatches, templateParts } from './text'
import { keepNumberWords } from '@/components/ui/InlineText'

const MARK =
  'bg-emerald-wash text-current border-b-2 border-brass px-px [box-decoration-break:clone] [-webkit-box-decoration-break:clone]'

/**
 * Wraps the query's words in <mark>. Works on plain strings only: the text is
 * split into parts and rendered as React children, never as HTML.
 */
export function Highlight({ text, words }: { text: string; words: readonly string[] }) {
  // Plain runs keep "2026-yil" and the like on one line, as in story lists.
  if (!words.length) return <>{keepNumberWords(text)}</>
  return (
    <>
      {splitByMatches(text, words).map((part, i) =>
        part.match ? (
          <mark key={i} className={MARK}>
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{keepNumberWords(part.text)}</Fragment>
        ),
      )}
    </>
  )
}

/** Renders a "{0} … {1}" message template with React nodes in the slots. */
export function Template({ template, values }: { template: string; values: React.ReactNode[] }) {
  return (
    <>
      {templateParts(template).map((part, i) =>
        typeof part === 'number' ? <Fragment key={i}>{values[part]}</Fragment> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}
