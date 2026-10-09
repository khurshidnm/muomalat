import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { listingMessages } from '@/i18n/messages/listing'
import type { ArticleView } from '@/content'
import { href } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StoryMeta } from '@/components/story/StoryMeta'
import { ItemKicker } from './parts'

/**
 * Nothing published yet: say so plainly, then offer the latest stories from
 * the whole site so the reader is never left on a dead end.
 */
export function EmptyState({
  locale,
  title,
  text,
  latest,
  id,
  children,
}: {
  locale: Locale
  title: string
  text: string
  latest: ArticleView[]
  id: string
  children?: React.ReactNode
}) {
  const m = pick(listingMessages, locale)
  return (
    <div>
      <section aria-labelledby={id} className="border-t-2 border-ink pt-4">
        <h2 id={id} className="flex items-center gap-2 font-display text-h3 font-semibold">
          <Icon name="info" size={20} className="shrink-0 text-ink-3" />
          {title}
        </h2>
        <p className="mt-2 max-w-[56ch] text-ui text-ink-2">{text}</p>
        {children}
      </section>
      {latest.length ? (
        <section aria-labelledby={`${id}-latest`} className="mt-10">
          <SectionHeader id={`${id}-latest`} title={m.empty.latest} />
          <ul>
            {latest.map((a) => (
              <li key={a.id} lang={a.contentLang} className="border-b border-rule py-4 last:border-b-0">
                <ItemKicker article={a} locale={locale} mode="rubric" className="mb-1" />
                <h3 className="font-display text-h4 font-semibold">
                  <Link href={href(locale, a.url)} className="headline-link">
                    {a.title}
                  </Link>
                </h3>
                <StoryMeta article={a} locale={locale} show={['author', 'time']} className="mt-1.5" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
