import type { Locale } from '@/i18n/config'
import { Icon } from '@/components/ui/Icon'
import { InlineText } from '@/components/ui/InlineText'

export interface FaqItem {
  id: string
  q: string
  /** RichText: links like [label](/aloqa) are allowed. */
  a: string
}

/**
 * Native details/summary accordion: keyboard and screen-reader support come
 * from the browser, it works without JavaScript, and each answer has an
 * anchor (#savol-{id}) so it can be linked from Telegram.
 */
export function FaqList({ items, locale, openFirst = true }: { items: FaqItem[]; locale: Locale; openFirst?: boolean }) {
  return (
    <div className="border-t border-rule">
      {items.map((item, i) => (
        <details key={item.id} id={`savol-${item.id}`} open={openFirst && i === 0} className="group scroll-mt-24 border-b border-rule">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3.5 font-display text-[1.125rem] leading-snug font-semibold text-ink hover:text-emerald-ink [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <Icon name="chevron-down" size={20} className="shrink-0 text-emerald transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <div className="pb-5 sm:pr-10">
            <p className="max-w-measure font-serif text-lead leading-relaxed text-ink-2">
              <InlineText text={item.a} locale={locale} />
            </p>
          </div>
        </details>
      ))}
    </div>
  )
}
