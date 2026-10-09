import type { Locale } from '@/i18n/config'
import type { LineChartSpec } from '@/content/types'
import { formatNumber } from '@/lib/format'
import { DataTable } from './DataTable'
import { LineChartHover, type HoverPoint } from './LineChartHover'
import { SERIES_STYLES, SeriesMarker, SeriesSwatch } from './chartMarks'

/** Tick step of 1, 2, 2.5 or 5 × 10ⁿ, so every gridline value is exact. */
function niceStep(range: number, maxTicks = 5): number {
  if (range <= 0) return 1
  const raw = range / maxTicks
  const exp = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / exp
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * exp
}

/** Decimals a tick step needs: 0 for 20, 1 for 0.5, 1 for 2.5, 2 for 0.25. */
function stepDecimals(step: number): number {
  for (let d = 0; d < 6; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-9) return d
  return 6
}

/** Minimum vertical distance between end-of-line labels, in % of plot height (≈ 18px). */
const LABEL_GAP = 8.5

/**
 * Line chart: SVG strokes scale with the container (non-scaling 2px), axis
 * text and end markers are HTML so they stay crisp at any width. One y-axis.
 * Series differ by colour, dash pattern and marker shape (repeated in the
 * legend), and end values are nudged apart so close values never overprint.
 */
export function LineChart({
  id,
  chart,
  locale,
  labels,
  contentLang,
}: {
  id: string
  chart: LineChartSpec
  locale: Locale
  labels: { source: string; note: string; scroll: string; dataTable: string; chart: string; period?: string; lang?: string }
  /** Language of the chart's own text when it differs from the page's. */
  contentLang?: string
}) {
  const series = chart.series.slice(0, 3)
  const multi = series.length > 1
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  const dataMin = Math.min(0, ...all)
  const step = niceStep(Math.max(...all) - dataMin)
  const minV = Math.floor(dataMin / step) * step
  const top = Math.max(Math.ceil(Math.max(...all) / step) * step, minV + step)
  const tickCount = Math.round((top - minV) / step)
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Number((minV + i * step).toFixed(6)))
  const decimals = stepDecimals(step)
  const n = chart.xLabels.length
  const xPos = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100)
  const yPos = (v: number) => ((v - minV) / (top - minV)) * 100
  const tickPos = (i: number) => (i / tickCount) * 100
  const every = n > 8 ? Math.ceil(n / 6) : 1

  const points: HoverPoint[] = chart.xLabels.map((label, i) => ({
    label,
    x: xPos(i),
    values: series.map((s, k) => ({
      name: s.name,
      color: SERIES_STYLES[k].color,
      marker: SERIES_STYLES[k].marker,
      y: s.values[i] === null ? null : yPos(s.values[i] as number),
      text: s.values[i] === null ? '—' : `${formatNumber(s.values[i] as number, locale)} ${chart.unit}`,
    })),
  }))

  // End-of-line labels, nudged apart so close values never overprint.
  const ends = series
    .map((s, k) => {
      let last = s.values.length - 1
      while (last >= 0 && s.values[last] === null) last--
      if (last < 0) return null
      const v = s.values[last] as number
      return { k, name: s.name, last, v, y: yPos(v), ly: yPos(v) }
    })
    .filter((e) => e !== null)
  const byY = [...ends].sort((a, b) => a.y - b.y)
  byY.forEach((e, j) => {
    e.ly = Math.max(e.y, j === 0 ? 4 : byY[j - 1].ly + LABEL_GAP)
  })
  const overflow = byY.length ? byY[byY.length - 1].ly - 98 : 0
  if (overflow > 0) byY.forEach((e) => (e.ly -= overflow))

  return (
    <figure className="breakout font-sans" aria-labelledby={`${id}-title`}>
      <figcaption>
        <p id={`${id}-title`} className="text-ui font-semibold text-ink">
          {chart.title}
        </p>
        <p className="mt-0.5 text-meta text-ink-3">{chart.subtitle ?? chart.unit}</p>
      </figcaption>
      {multi ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-2">
          {series.map((s, k) => (
            <li key={s.name} className="inline-flex items-center gap-1.5">
              <SeriesSwatch style={SERIES_STYLES[k]} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-2 pr-2">
        {/* y ticks */}
        <div className="relative h-52 w-9 sm:h-60" aria-hidden="true">
          {ticks.map((v, i) => (
            <span
              key={i}
              className="figures absolute right-0 translate-y-1/2 text-micro tracking-normal text-ink-3"
              style={{ bottom: `${tickPos(i)}%` }}
            >
              {formatNumber(v, locale, decimals)}
            </span>
          ))}
        </div>
        <div className="relative h-52 sm:h-60">
          {ticks.map((v, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`absolute inset-x-0 h-px ${v === 0 || i === 0 ? 'bg-ink-3' : 'bg-chart-grid'}`}
              style={{ bottom: `${tickPos(i)}%` }}
            />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {series.map((s, k) => {
              const d = s.values
                .map((v, i) => (v === null ? null : `${xPos(i).toFixed(2)},${(100 - yPos(v)).toFixed(2)}`))
                .reduce<string[]>((acc, pt, i, arr) => {
                  if (pt === null) return acc
                  acc.push(`${i === 0 || arr[i - 1] === null ? 'M' : 'L'}${pt}`)
                  return acc
                }, [])
                .join(' ')
              return (
                <path
                  key={s.name}
                  d={d}
                  fill="none"
                  stroke={SERIES_STYLES[k].color}
                  strokeWidth={2}
                  strokeDasharray={SERIES_STYLES[k].dash}
                  strokeLinejoin="round"
                  strokeLinecap={SERIES_STYLES[k].dash ? 'butt' : 'round'}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>
          {/* end markers + end labels (series name when there are several) */}
          {ends.map((e) => (
            <span key={e.name} aria-hidden="true">
              <SeriesMarker
                shape={SERIES_STYLES[e.k].marker}
                color={SERIES_STYLES[e.k].color}
                className="absolute -translate-x-1/2 translate-y-1/2"
                style={{ left: `${xPos(e.last)}%`, bottom: `${e.y}%` }}
              />
              {/* One line: the value sits just above its end point. Several: values are
                  centred on their (nudged) end heights beside the series' own marker
                  shape, which the legend repeats; long names would cover the lines. */}
              <span
                className={`absolute bg-paper/85 px-1 text-meta leading-tight whitespace-nowrap text-ink ${multi ? 'translate-y-1/2' : '-translate-y-1.5'}`}
                style={multi ? { right: `calc(${100 - xPos(e.last)}% + 0.5rem)`, bottom: `${e.ly}%` } : { right: `${100 - xPos(e.last)}%`, bottom: `${e.y}%` }}
              >
                {multi ? (
                  <SeriesMarker shape={SERIES_STYLES[e.k].marker} color={SERIES_STYLES[e.k].color} className="mr-1 align-middle ring-0" />
                ) : null}
                <span className="figures font-semibold">{formatNumber(e.v, locale)}</span>
              </span>
            </span>
          ))}
          <LineChartHover points={points} label={labels.chart} uiLang={labels.lang} contentLang={contentLang} />
        </div>
        <span />
        <div className="relative mt-1.5 h-4" aria-hidden="true">
          {chart.xLabels.map((l, i) =>
            // Every `every`-th label, plus the last; drop the one just before it so they never collide.
            (i % every === 0 && n - 1 - i >= every) || i === n - 1 ? (
              <span
                key={i}
                className={`figures absolute text-micro tracking-normal whitespace-nowrap text-ink-3 ${i === 0 ? '' : i === n - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: `${xPos(i)}%` }}
              >
                {l}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-rule pt-2 text-meta text-ink-3">
        {chart.note ? <p>{chart.note}</p> : null}
        {chart.source ? (
          <p>
            <span lang={labels.lang} className="font-semibold">
              {labels.source}:
            </span>{' '}
            {chart.source}
          </p>
        ) : null}
      </div>
      <details className="mt-2 text-meta">
        <summary lang={labels.lang} className="cursor-pointer text-emerald hover:text-emerald-ink">
          {labels.dataTable}
        </summary>
        <div className="mt-3">
          <DataTable
            id={`${id}-table`}
            caption={chart.title}
            columns={[
              { label: chart.xLabel ?? labels.period ?? '' },
              ...series.map((s) => ({ label: s.name, align: 'right' as const, unit: chart.unit })),
            ]}
            rows={chart.xLabels.map((l, i) => [l, ...series.map((s) => s.values[i])])}
            locale={locale}
            labels={labels}
            compact
          />
        </div>
      </details>
    </figure>
  )
}
