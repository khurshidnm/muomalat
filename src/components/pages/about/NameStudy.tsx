import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import { AboutSection, Diamond, keepDash } from './Section'

/**
 * Word samples stay in Latin script in every edition: the section is about
 * how the name is spelled in Uzbek Latin (and on the domain).
 */
const LATIN = 'uz-Latn'
const WORD = { before: 'Mu', mark: 'o', after: 'malat' }
const SYLLABLES = ['mu', 'o', 'ma', 'lat'] as const
const HEADWORD = 'muomala'
const SOURCE = 'muʼomalat'
const OPSZ = { fontVariationSettings: '"opsz" 60' } as const

/** The highlighted letter: a brass rule under the "o" (or a quiet one under the "a"). */
function Marked({ before, mark, after, tone }: { before: string; mark: string; after: string; tone: 'brass' | 'muted' }) {
  const deco = tone === 'brass' ? 'decoration-brass' : 'decoration-rule-strong'
  return (
    <>
      {before}
      <span className={`underline ${deco} decoration-[0.06em] underline-offset-[0.06em] [text-decoration-skip-ink:none]`}>{mark}</span>
      {after}
    </>
  )
}

/**
 * "Nega Muomalat?": the name set large in serif with its syllables, a
 * dictionary-style entry (Uzbek senses, origin, spelling) and the Uzbek vs
 * international spelling side by side. Linguistic and secular by design.
 */
export function NameStudy({ id, locale }: { id: string; locale: Locale }) {
  const n = pick(aboutMessages, locale).name
  const e = n.entries
  return (
    <AboutSection id={id} title={n.title} description={n.lead}>
      <div className="mt-6 border-b border-rule pb-6">
        <p
          lang={LATIN}
          className="font-display text-[clamp(4rem,1.6rem+10.5vw,8rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-ink"
          style={OPSZ}
        >
          <span aria-hidden="true">
            <Marked {...WORD} tone="brass" />
          </span>
          <span className="sr-only">Muomalat</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="label-caps text-ink-3">{n.syllables}</span>
          <ol lang={LATIN} className="flex items-center gap-x-2.5 font-serif text-[1.375rem] text-ink-2 italic">
            {SYLLABLES.map((s, i) => (
              <li key={i} className="flex items-center gap-x-2.5">
                {i > 0 ? <Diamond /> : null}
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-12 md:gap-x-8">
        {/* Dictionary entry */}
        <dl className="md:col-span-7">
          <div className="grid gap-1.5 border-b border-rule pb-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
            <dt className="label-caps text-ink-3 sm:pt-1.5">{e.uzbek.label}</dt>
            <dd>
              <p>
                <span lang={LATIN} className="font-display text-h3 font-semibold">
                  {HEADWORD}
                </span>{' '}
                <span className="font-serif text-ink-3 italic">{n.pos}</span>
              </p>
              <ol className="mt-2 space-y-1.5 font-serif text-lead leading-snug text-ink-2">
                {e.uzbek.senses.map((s, i) => (
                  <li key={s} className="grid grid-cols-[1.25rem_minmax(0,1fr)]">
                    <span className="figures font-sans text-meta leading-[1.6] font-semibold text-brass-ink">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <ul className="mt-3 space-y-1">
                {e.uzbek.examples.map((x) => (
                  <li key={x} className="flex items-center gap-2.5 font-serif text-lead text-ink italic">
                    <Diamond />
                    {x}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="grid gap-1.5 border-b border-rule py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
            <dt className="label-caps text-ink-3 sm:pt-1.5">{e.origin.label}</dt>
            <dd>
              <p lang={LATIN} className="font-display text-h3 font-semibold">
                {SOURCE}
              </p>
              <p className="mt-1.5 font-serif text-lead leading-snug text-ink-2">{e.origin.text}</p>
            </dd>
          </div>
          <div className="grid gap-1.5 py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
            <dt className="label-caps text-ink-3 sm:pt-1">{e.spelling.label}</dt>
            <dd className="font-serif text-lead leading-snug text-ink-2">{keepDash(e.spelling.text)}</dd>
          </div>
        </dl>

        <div className="md:col-span-5">
          {/* Spelling side by side */}
          <div className="grid grid-cols-2 border-y border-rule">
            <div className="py-4 pr-4">
              <p lang={LATIN} className="font-display text-h2 font-semibold text-ink" style={OPSZ}>
                <span aria-hidden="true">
                  <Marked before="mu" mark="o" after="malat" tone="brass" />
                </span>
                <span className="sr-only">muomalat</span>
              </p>
              <p className="mt-1.5 text-meta font-semibold text-ink-2">{n.compareOurs}</p>
            </div>
            <div className="border-l border-rule py-4 pl-4">
              <p lang={LATIN} className="font-display text-h2 font-semibold text-ink-3" style={OPSZ}>
                <span aria-hidden="true">
                  <Marked before="mu" mark="a" after="malat" tone="muted" />
                </span>
                <span className="sr-only">muamalat</span>
              </p>
              <p className="mt-1.5 text-meta text-ink-3">{n.compareIntl}</p>
            </div>
          </div>

          <div className="mt-6 border-t-2 border-brass bg-paper-2 p-5">
            <h3 className="label-caps text-brass-ink">{n.meaningTitle}</h3>
            <p className="mt-2 font-display text-h3 font-semibold text-ink">{keepDash(n.meaning)}</p>
          </div>
        </div>
      </div>
    </AboutSection>
  )
}
