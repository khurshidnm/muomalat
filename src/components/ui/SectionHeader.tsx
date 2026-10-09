import Link from 'next/link'
import { Icon } from './Icon'

/**
 * Newspaper section head: a 2px ink rule, the section name in serif, and an
 * optional "Barchasi" link. `id` lets sections be labelled with aria-labelledby.
 */
export function SectionHeader({
  title,
  id,
  href,
  linkLabel,
  as: As = 'h2',
  description,
  className = '',
}: {
  title: React.ReactNode
  id?: string
  href?: string
  linkLabel?: string
  as?: 'h2' | 'h3'
  description?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rule-ink pt-2.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <As id={id} className="font-display text-h3 font-semibold tracking-[-0.005em]">
          {href ? (
            <Link href={href} prefetch={false} className="headline-link">
              {title}
            </Link>
          ) : (
            title
          )}
        </As>
        {href && linkLabel ? (
          <Link
            href={href}
            prefetch={false}
            className="group inline-flex shrink-0 items-center gap-1 text-meta font-medium text-emerald hover:text-emerald-ink"
          >
            {linkLabel}
            <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
      {description ? <p className="mt-1 max-w-[46ch] text-meta text-ink-3">{description}</p> : null}
    </div>
  )
}
