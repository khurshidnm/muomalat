import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import { AboutSection, Diamond, Prose, keepDash } from './Section'

/** Beat order on the page (keys of `mission.beat`). */
export const BEAT_ORDER = ['market', 'regulation', 'licences', 'products', 'deals', 'people'] as const

/** Mission: what Muomalat covers and for whom. */
export function Mission({ id, locale }: { id: string; locale: Locale }) {
  const m = pick(aboutMessages, locale).mission
  return (
    <AboutSection id={id} title={m.title}>
      <p className="mt-5 max-w-measure font-serif text-standfirst text-ink">{keepDash(m.lead)}</p>
      <Prose paragraphs={m.paragraphs} className="mt-4" />

      <h3 className="label-caps mt-10 text-ink-3">{m.beatTitle}</h3>
      <ol className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {BEAT_ORDER.map((key, i) => (
          <li key={key} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-t border-rule pt-3.5 pb-5">
            <span aria-hidden="true" className="figures font-display text-[1.5rem] leading-none font-semibold text-brass" style={{ fontVariationSettings: '"opsz" 60' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <h4 className="font-display text-h4 font-semibold">{m.beat[key].title}</h4>
              <p className="mt-1 text-meta leading-relaxed text-ink-2">{m.beat[key].text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h3 className="label-caps mt-6 text-ink-3">{m.audienceTitle}</h3>
      <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {m.audience.map((item) => (
          <li key={item} className="flex items-start gap-3 text-ui text-ink-2">
            <Diamond className="mt-[0.55em]" />
            {item}
          </li>
        ))}
      </ul>
    </AboutSection>
  )
}
