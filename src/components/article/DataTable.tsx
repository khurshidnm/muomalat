import type { Locale } from '@/i18n/config'
import type { TableColumn } from '@/content/types'
import { formatNumber } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'

function cell(v: string | number | null, locale: Locale) {
  if (v === null || v === undefined || v === '') return <span className="text-ink-3">—</span>
  return typeof v === 'number' ? formatNumber(v, locale) : v
}

/**
 * Data table with tabular figures. On phones a table with more than three
 * columns scrolls sideways inside a focusable region with the first column
 * pinned; a visible cue says so, and data columns keep a minimum width so the
 * next column always peeks in at the edge.
 */
export function DataTable({
  id,
  caption,
  columns,
  rows,
  note,
  source,
  locale,
  labels,
  compact = false,
}: {
  id: string
  caption: string
  columns: TableColumn[]
  rows: (string | number | null)[][]
  note?: string
  source?: string
  locale: Locale
  /** `lang`: language of these labels when it differs from the table's (story text in ru/en). */
  labels: { source: string; note: string; scroll: string; lang?: string }
  compact?: boolean
}) {
  const wide = columns.length > 3
  return (
    <figure className="breakout font-sans">
      <p id={`${id}-cap`} aria-hidden="true" className="pb-3 text-ui font-semibold text-ink">
        {caption}
      </p>
      {wide ? (
        <p aria-hidden="true" lang={labels.lang} className="-mt-1 mb-2 flex items-center gap-1 text-meta text-ink-3 sm:hidden">
          {labels.scroll}
          <Icon name="arrow-right" size={14} />
        </p>
      ) : null}
      <div
        role="region"
        aria-labelledby={`${id}-cap`}
        tabIndex={0}
        className="relative -mx-4 overflow-x-auto px-4 focus-visible:outline-offset-[-2px] sm:mx-0 sm:px-0"
      >
        <table className="w-full border-collapse text-left text-data">
          <caption className="sr-only">
            {caption}
            {wide ? (
              <>
                {' — '}
                <span lang={labels.lang}>{labels.scroll}</span>
              </>
            ) : null}
          </caption>
          <thead>
            <tr className="border-b-2 border-ink">
              {columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-2 pb-2 align-bottom text-meta font-semibold text-ink-2 first:pl-0 last:pr-0 ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${i === 0 ? 'sticky left-0 bg-paper' : wide ? 'min-w-[6.5rem] sm:min-w-0' : ''} ${
                    i === 0 && wide ? 'after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-rule sm:after:hidden' : ''
                  }`}
                >
                  {c.label}
                  {c.unit ? <span className="block font-normal text-ink-3">{c.unit}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-rule">
                {r.map((v, ci) => {
                  const col = columns[ci]
                  const align = col?.align === 'right' || (col?.align !== 'left' && typeof v === 'number') ? 'text-right' : 'text-left'
                  const Tag = ci === 0 ? 'th' : 'td'
                  return (
                    <Tag
                      key={ci}
                      scope={ci === 0 ? 'row' : undefined}
                      className={`figures px-2 ${compact ? 'py-1.5' : 'py-2.5'} align-top first:pl-0 last:pr-0 ${align} ${
                        ci === 0 ? 'sticky left-0 bg-paper font-medium text-ink' : 'text-ink'
                      } ${ci === 0 && wide ? 'after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-rule sm:after:hidden' : ''}`}
                    >
                      {cell(v, locale)}
                    </Tag>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note || source ? (
        <figcaption className="mt-2.5 space-y-0.5 text-meta text-ink-3">
          {note ? (
            <p>
              <span lang={labels.lang} className="font-semibold">
                {labels.note}:
              </span>{' '}
              {note}
            </p>
          ) : null}
          {source ? (
            <p>
              <span lang={labels.lang} className="font-semibold">
                {labels.source}:
              </span>{' '}
              {source}
            </p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
