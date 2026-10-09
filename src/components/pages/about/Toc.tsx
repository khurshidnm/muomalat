export interface TocItem {
  id: string
  label: string
}

const num = (i: number) => String(i + 1).padStart(2, '0')

/**
 * "Ushbu sahifada": in-page contents. On phones a two-column list under the
 * header; from lg a sticky rail. Only one variant is displayed at a time, so
 * the hidden one is out of the accessibility tree.
 */
export function AboutToc({ items, label, variant }: { items: TocItem[]; label: string; variant: 'inline' | 'rail' }) {
  if (variant === 'inline') {
    return (
      <nav aria-label={label} className="border-y border-rule py-3 lg:hidden">
        <p className="label-caps text-ink-3">{label}</p>
        <ol className="mt-1 grid grid-cols-2 gap-x-4">
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="flex min-h-11 items-center gap-2 py-1 text-ui leading-snug text-ink-2 hover:text-emerald"
              >
                <span aria-hidden="true" className="figures w-5 shrink-0 text-meta font-semibold text-brass-ink">
                  {num(i)}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    )
  }
  return (
    <nav aria-label={label} className="hidden lg:block">
      <p className="label-caps border-t-2 border-ink pt-2.5 text-ink-3">{label}</p>
      <ol className="mt-1.5">
        {items.map((item, i) => (
          <li key={item.id} className="border-b border-rule last:border-b-0">
            <a href={`#${item.id}`} className="group flex items-baseline gap-3 py-2.5 text-ui text-ink-2 hover:text-emerald">
              <span aria-hidden="true" className="figures w-5 shrink-0 text-meta font-semibold text-brass-ink">
                {num(i)}
              </span>
              <span className="group-hover:underline group-hover:underline-offset-2">{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
