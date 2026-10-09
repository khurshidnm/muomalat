/**
 * Series styles for line charts. Colour is never the only signal (WCAG 1.4.1):
 * each series also has its own dash pattern and marker shape, repeated in the
 * legend, the end-of-line labels and the hover readout.
 */
export type MarkerShape = 'circle' | 'square' | 'diamond'

export interface SeriesStyle {
  color: string
  /** SVG stroke-dasharray in screen pixels (strokes are non-scaling). */
  dash?: string
  marker: MarkerShape
}

export const SERIES_STYLES: SeriesStyle[] = [
  { color: 'var(--chart-1)', marker: 'circle' },
  { color: 'var(--chart-2)', dash: '7 4', marker: 'square' },
  { color: 'var(--chart-3)', dash: '2 3', marker: 'diamond' },
]

/** HTML marker for points on the plot (positioned by the caller). */
export function SeriesMarker({
  shape,
  color,
  className = '',
  style,
}: {
  shape: MarkerShape
  color: string
  className?: string
  style?: React.CSSProperties
}) {
  const form = shape === 'circle' ? 'size-2.5 rounded-full' : shape === 'square' ? 'size-2.5' : 'size-2 rotate-45'
  return <span aria-hidden="true" className={`inline-block ring-2 ring-paper ${form} ${className}`} style={{ background: color, ...style }} />
}

/** Legend swatch: a short stretch of the line with its marker in the middle. */
export function SeriesSwatch({ style }: { style: SeriesStyle }) {
  const { color, dash, marker } = style
  return (
    <svg aria-hidden="true" width="24" height="10" viewBox="0 0 24 10" className="shrink-0 overflow-visible">
      <line x1="0" y1="5" x2="24" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dash} />
      {marker === 'circle' ? (
        <circle cx="12" cy="5" r="3.5" fill={color} />
      ) : marker === 'square' ? (
        <rect x="8.5" y="1.5" width="7" height="7" fill={color} />
      ) : (
        <path d="M12 0.8 16.2 5 12 9.2 7.8 5Z" fill={color} />
      )}
    </svg>
  )
}
