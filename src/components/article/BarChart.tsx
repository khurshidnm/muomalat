import type { Locale } from '@/i18n/config'
import type { BarChartSpec } from '@/content/types'
import { formatNumber } from '@/lib/format'
import { DataTable } from './DataTable'

/**
 * Horizontal bar chart in HTML: labels stay real text and reflow on phones.
 * Single series → one colour; `highlight` bars carry the accent and the rest
 * recede. Value at each bar tip (≤ 12 bars), square ends like the rest of the
 * hairline grid. The list is static (no interaction), so it carries no
 * instructions; the figure is named by its title.
 */
export function BarChart({
  id,
  chart,
  locale,
  labels,
}: {
  id: string
  chart: BarChartSpec
  locale: Locale
  labels: { source: string; note: string; scroll: string; dataTable: string; category?: string; lang?: string }
}) {
  const max = Math.max(...chart.data.map((d) => d.value), 0) || 1
  const anyHighlight = chart.data.some((d) => d.highlight)
  return (
    <figure className="breakout font-sans" aria-labelledby={`${id}-title`}>
      <figcaption>
        <p id={`${id}-title`} className="text-ui font-semibold text-ink">
          {chart.title}
        </p>
        <p className="mt-0.5 text-meta text-ink-3">{chart.subtitle ?? chart.unit}</p>
      </figcaption>
      <ul role="list" className="mt-4 space-y-2.5">
        {chart.data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, 0.6)
          const color = anyHighlight ? (d.highlight ? 'bg-chart-1' : 'bg-chart-muted') : 'bg-chart-1'
          return (
            <li key={i} className="grid grid-cols-[minmax(6.5rem,38%)_1fr] items-center gap-3 sm:grid-cols-[minmax(8rem,32%)_1fr]">
              <span className={`text-meta leading-tight ${d.highlight ? 'font-semibold text-ink' : 'text-ink-2'}`}>{d.label}</span>
              <span className="relative block h-[18px]" style={{ width: 'calc(100% - 4.25rem)' }}>
                <span aria-hidden="true" className={`absolute inset-y-0 left-0 ${color}`} style={{ width: `${pct}%` }} />
                <span className="figures absolute top-1/2 -translate-y-1/2 pl-2 text-meta font-semibold whitespace-nowrap text-ink" style={{ left: `${pct}%` }}>
                  {formatNumber(d.value, locale)}
                  <span className="sr-only"> {chart.unit}</span>
                </span>
              </span>
            </li>
          )
        })}
      </ul>
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
            columns={[{ label: chart.categoryLabel ?? labels.category ?? '' }, { label: chart.unit, align: 'right' }]}
            rows={chart.data.map((d) => [d.label, d.value])}
            locale={locale}
            labels={labels}
            compact
          />
        </div>
      </details>
    </figure>
  )
}
