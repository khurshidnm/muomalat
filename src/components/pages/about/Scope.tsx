import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import { commonMessages } from '@/i18n/messages/common'
import type { ArticleView, GlossaryTerm, Localized } from '@/content'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { AboutSection, keepDash } from './Section'

/**
 * "Biz nima qilamiz / nima qilmaymiz": the block that makes the non-religious
 * status unmistakable. Two columns, each marked by icon + heading (never by
 * colour alone), then who is responsible for Sharia opinions.
 */
export function Scope({
  id,
  locale,
  explainer,
  term,
}: {
  id: string
  locale: Locale
  /** Explainer on what a Sharia board does. */
  explainer?: ArticleView
  term?: Localized<GlossaryTerm>
}) {
  const s = pick(aboutMessages, locale).scope
  const t = pick(commonMessages, locale)
  return (
    <AboutSection id={id} title={s.title}>
      <p className="mt-5 max-w-[40rem] font-display text-h3 font-semibold text-ink">{keepDash(s.lead)}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="border-t-2 border-emerald bg-emerald-wash/60 p-5 sm:p-6">
          <h3 className="flex items-center gap-3 font-display text-h3 font-semibold">
            <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center bg-emerald text-on-emerald">
              <Icon name="check" size={20} />
            </span>
            {s.doTitle}
          </h3>
          <ul className="mt-4">
            {s.do.map((item) => (
              <li key={item} className="flex items-start gap-3 border-t border-rule py-3 text-ui text-ink">
                <Icon name="check" size={18} className="mt-0.5 shrink-0 text-emerald" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t-2 border-ink bg-paper-2 p-5 sm:p-6">
          <h3 className="flex items-center gap-3 font-display text-h3 font-semibold">
            <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center border-2 border-ink text-ink">
              <Icon name="close" size={16} />
            </span>
            {s.dontTitle}
          </h3>
          <ul className="mt-4">
            {s.dont.map((item) => (
              <li key={item} className="flex items-start gap-3 border-t border-rule py-3 text-ui text-ink">
                <Icon name="close" size={18} className="mt-0.5 shrink-0 text-ink-3" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside aria-labelledby={`${id}-board`} className="mt-6 max-w-measure border-l-2 border-brass pl-4 sm:pl-5">
        <h3 id={`${id}-board`} className="font-display text-h4 font-semibold">
          {s.boardTitle}
        </h3>
        <p className="mt-2 font-serif text-lead leading-relaxed text-ink-2">{keepDash(s.boardText)}</p>
        {explainer || term ? (
          <ul className="mt-3 space-y-2 text-meta">
            {explainer ? (
              <li className="flex flex-wrap items-baseline gap-x-2">
                <span className="label-caps text-emerald">{t.rubrics[explainer.rubric].name}</span>
                <Link href={href(locale, explainer.url)} lang={explainer.contentLang} className="text-link font-medium">
                  {explainer.title}
                </Link>
              </li>
            ) : null}
            {term ? (
              <li className="flex flex-wrap items-baseline gap-x-2">
                <span className="label-caps text-ink-3">{s.inGlossary}</span>
                <Link href={href(locale, paths.term(term.slug))} lang={term.contentLang} className="term-link font-serif text-lead">
                  {term.term}
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}
      </aside>
    </AboutSection>
  )
}
