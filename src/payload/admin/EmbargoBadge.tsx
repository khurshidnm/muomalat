import type { DefaultServerCellComponentProps } from 'payload'
import React from 'react'

import { embargoLabel } from '../hooks/workflow/embargo'

/**
 * The red embargo badge of CMS-SPEC §5.10 in the article list: "EMBARGO
 * 14:00 (09:00 UTC)", in Tashkent time with UTC alongside. Server cells,
 * rendered by Payload's list view through the import map:
 * - `EmbargoCell` on the `embargo` group column;
 * - `TitleCell` on `title`, the first column: a custom Cell replaces the
 *   default one, so it renders the link to the document itself, with the
 *   badge in front of the title while the embargo is active.
 * The badge is computed at render time from the stored fields: a saved
 * preset cannot hold a relative "now" (§5.10 handover list).
 */

const style: React.CSSProperties = {
  display: 'inline-block',
  background: '#b42318',
  color: '#fff',
  borderRadius: 4,
  padding: '1px 6px',
  fontWeight: 600,
  fontSize: 12,
  whiteSpace: 'nowrap',
}

export function Badge({ doc }: { doc: Record<string, unknown> | null | undefined }) {
  const label = embargoLabel(doc)
  return label ? <span style={style}>{label}</span> : null
}

export function EmbargoCell({ rowData }: DefaultServerCellComponentProps) {
  return <Badge doc={rowData} />
}

export function TitleCell({ cellData, rowData, link, linkURL }: DefaultServerCellComponentProps) {
  const title = typeof cellData === 'string' && cellData.trim() ? cellData : `#${String(rowData?.id ?? '')} (sarlavhasiz)`
  const href = linkURL ?? (rowData?.id !== undefined ? `/admin/collections/articles/${rowData.id}` : undefined)
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <Badge doc={rowData} />
      {link !== false && href ? <a href={href}>{title}</a> : <span>{title}</span>}
    </span>
  )
}

export default EmbargoCell
