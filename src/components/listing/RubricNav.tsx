import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import { rubricSlugs, type RubricSlug } from '@/content'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'

/**
 * The five rubrics as a closing strip: name and one-line description each.
 * The current rubric keeps its link (aria-current) and is marked by a heavier
 * rule and a text note, not by colour alone.
 */
export function RubricNav({
  locale,
  current,
  id = 'listing-rubrics',
  className = '',
}: {
  locale: Locale
  current?: RubricSlug
  id?: string
  className?: string
}) {
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  return (
    <nav aria-labelledby={id} className={`no-print ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="label-caps text-ink-3">
          {m.rubricsNav}
        </h2>
        <p className="hidden text-meta text-ink-3 sm:block">{m.rubricsNavIntro}</p>
      </div>
      <ul className="mt-2 grid border-t border-rule sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-6 lg:border-t-0">
        {rubricSlugs.map((r) => {
          const on = r === current
          return (
            <li key={r} className={`border-b border-rule lg:border-b-0 ${on ? 'lg:border-t-2 lg:border-ink' : 'lg:border-t lg:border-rule'}`}>
              <Link
                href={href(locale, paths.rubric(r))}
                aria-current={on ? 'page' : undefined}
                className="group flex min-h-11 items-start justify-between gap-3 py-3 sm:pr-4 lg:block lg:pr-0"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    {on ? <span aria-hidden="true" className="size-1.5 shrink-0 rotate-45 bg-brass" /> : null}
                    <span className="font-display text-h4 font-semibold text-ink group-hover:text-emerald">{t.rubrics[r].name}</span>
                  </span>
                  <span className="mt-1 block text-meta text-ink-3">{on ? m.currentRubric : t.rubrics[r].description}</span>
                </span>
                <Icon name="chevron-right" size={18} className="mt-1 shrink-0 text-ink-3 lg:hidden" />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
