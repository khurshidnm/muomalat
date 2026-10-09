import Link from 'next/link'

export function Breadcrumbs({ items, label }: { items: { name: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="text-meta text-ink-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden="true" className="text-rule-strong">/</span> : null}
            {item.href ? (
              <Link href={item.href} prefetch={false} className="hover:text-emerald hover:underline underline-offset-2">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-2">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
