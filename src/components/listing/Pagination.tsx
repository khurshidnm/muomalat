import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { listingMessages } from '@/i18n/messages/listing'
import { href } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'

/** Page numbers to show: first, last, and a window around the current page; null = gap. */
export function pageWindow(current: number, total: number, radius = 1): (number | null)[] {
  const out: (number | null)[] = []
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - current) <= radius) out.push(n)
    else if (out.at(-1) !== null) out.push(null)
  }
  return out
}

const box = 'inline-flex h-11 min-w-11 items-center justify-center rounded-[2px] text-ui font-semibold'

/**
 * Listing pagination: previous/next (44px targets) with the page count in
 * between on phones, full page numbers from 640px. Renders nothing for a
 * single page. `pathFor` maps a page number to its locale-free path.
 */
export function Pagination({
  locale,
  page,
  total,
  pathFor,
  className = '',
}: {
  locale: Locale
  page: number
  total: number
  pathFor: (n: number) => string
  className?: string
}) {
  if (total <= 1) return null
  const m = pick(listingMessages, locale).pagination
  const prev = page > 1 ? page - 1 : undefined
  const next = page < total ? page + 1 : undefined
  const step = 'inline-flex h-11 items-center gap-1.5 rounded-[2px] px-3 text-ui font-semibold'
  return (
    <nav aria-label={m.label} className={`flex items-center justify-between gap-3 border-t-2 border-ink pt-4 ${className}`}>
      {prev ? (
        <Link href={href(locale, pathFor(prev))} className={`${step} -ml-3 text-emerald hover:bg-paper-2 hover:text-emerald-ink`}>
          <Icon name="arrow-right" size={18} className="rotate-180" />
          <span aria-hidden="true">{m.prev}</span>
          <span className="sr-only">{m.prevPage}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`${step} -ml-3 cursor-default text-ink-3`}>
          <Icon name="arrow-right" size={18} className="rotate-180" />
          {m.prev}
        </span>
      )}

      <p className="figures text-ui text-ink-2 sm:hidden">
        <span aria-hidden="true">
          {page} / {total}
        </span>
        <span className="sr-only">{m.current(page, total)}</span>
      </p>
      <ol className="hidden items-center gap-1 sm:flex">
        {pageWindow(page, total).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="figures px-1 text-ink-3">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={`${box} figures border border-ink bg-ink text-paper`}>
                  <span className="sr-only">{m.current(n, total)}</span>
                  <span aria-hidden="true">{n}</span>
                </span>
              ) : (
                <Link href={href(locale, pathFor(n))} className={`${box} figures text-ink-2 hover:bg-paper-2 hover:text-ink`}>
                  <span className="sr-only">{m.goTo(n)}</span>
                  <span aria-hidden="true">{n}</span>
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {next ? (
        <Link href={href(locale, pathFor(next))} className={`${step} -mr-3 text-emerald hover:bg-paper-2 hover:text-emerald-ink`}>
          <span aria-hidden="true">{m.next}</span>
          <span className="sr-only">{m.nextPage}</span>
          <Icon name="arrow-right" size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${step} -mr-3 cursor-default text-ink-3`}>
          {m.next}
          <Icon name="arrow-right" size={18} />
        </span>
      )}
    </nav>
  )
}
