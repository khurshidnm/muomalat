import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import { articleMessages } from '@/i18n/messages/article'
import { commonMessages } from '@/i18n/messages/common'
import type { ArticleView } from '@/content'
import { formatDate } from '@/lib/format'
import { href, paths } from '@/lib/routes'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AboutSection, Prose, keepDash } from './Section'

/**
 * Corrections policy (#tuzatishlar): how corrections appear, a real
 * "Tuzatish" note from the archive as the example, and how to report an error.
 */
export function Corrections({ id, locale, example }: { id: string; locale: Locale; example?: ArticleView }) {
  const c = pick(aboutMessages, locale).corrections
  const t = pick(commonMessages, locale)
  const m = pick(articleMessages, locale)
  const note = example?.corrections?.at(-1)
  // Corrections are never translated: Uzbek (Latin or the Cyrillic edition).
  const noteLang = locale === 'kr' ? 'uz-Cyrl' : 'uz'

  return (
    <AboutSection id={id} title={c.title}>
      <p className="mt-5 max-w-measure font-serif text-standfirst text-ink">{keepDash(c.lead)}</p>
      <Prose paragraphs={c.text} className="mt-4" />

      {example && note ? (
        <figure className="mt-8 max-w-measure">
          <figcaption className="label-caps mb-2.5 text-ink-3">{c.sampleTitle}</figcaption>
          <div className="border-l-2 border-signal bg-signal-wash px-4 py-3.5">
            <p className="label-caps flex items-center gap-1.5 text-signal">
              <Icon name="alert" size={14} />
              {t.labels.correction}
            </p>
            <p className="mt-2 text-meta text-ink-3">
              <time dateTime={note.date}>{m.correctionDate(formatDate(note.date, locale, 'datetime'))}</time>
            </p>
            <p lang={noteLang} className="mt-1 font-serif text-lead leading-relaxed text-ink">
              {note.text}
            </p>
          </div>
          <p className="mt-2.5 text-meta text-ink-3">
            {c.sampleFrom}:{' '}
            <Link href={`${href(locale, example.url)}#tuzatish`} lang={example.contentLang} className="text-link font-medium">
              {example.title}
            </Link>
          </p>
        </figure>
      ) : null}

      <div className="mt-10 grid gap-6 border-t-2 border-ink pt-5 md:grid-cols-12 md:gap-x-8">
        <h3 className="font-display text-h3 font-semibold md:col-span-5">{c.reportTitle}</h3>
        <div className="md:col-span-7">
          <ol className="space-y-3">
            {c.steps.map((step, i) => (
              <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-2 text-ui text-ink">
                <span aria-hidden="true" className="figures font-display text-[1.5rem] leading-none font-semibold text-brass">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-ui text-ink-2">{c.reportText}</p>
          <ButtonLink href={href(locale, paths.contact())} className="mt-5 w-full xs:w-auto">
            <Icon name="mail" size={18} />
            {c.cta}
          </ButtonLink>
        </div>
      </div>
    </AboutSection>
  )
}
