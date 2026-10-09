import { Placeholder } from '@/components/ui/Placeholder'

/**
 * Reader-segment bars for /reklama. Same idiom as article BarChart (single
 * series in chart-1, square bar ends, value at the bar tip, labels as
 * real text) but every value is wrapped in <Placeholder>: the split is
 * indicative until the reader survey replaces it.
 */
export function SegmentBars({
  id,
  title,
  subtitle,
  items,
  placeholderTitle,
}: {
  id: string
  title: string
  subtitle: string
  /** label + share (number) + formatted value text. */
  items: { label: string; value: number; display: string }[]
  placeholderTitle?: string
}) {
  const max = Math.max(...items.map((d) => d.value), 0) || 1
  return (
    <figure aria-labelledby={`${id}-title`} className="min-w-0">
      <figcaption>
        <p id={`${id}-title`} className="text-ui font-semibold text-ink">
          {title}
        </p>
        <p className="mt-0.5 text-meta text-ink-3">{subtitle}</p>
      </figcaption>
      <ul className="mt-4 space-y-2.5">
        {items.map((d) => (
          <li key={d.label} className="grid grid-cols-[minmax(7rem,42%)_1fr] items-center gap-3 sm:grid-cols-[minmax(9rem,38%)_1fr]">
            <span className="text-meta leading-tight text-ink-2">{d.label}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="block h-[18px] shrink-0 bg-chart-1"
                style={{ width: `calc((100% - 4.75rem) * ${(d.value / max).toFixed(3)})` }}
              />
              <span className="figures text-meta font-semibold whitespace-nowrap text-ink">
                <Placeholder title={placeholderTitle}>{d.display}</Placeholder>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
