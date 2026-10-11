import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import { commonMessages } from '@/i18n/messages/common'
import { getSponsoredLabel } from '@/content'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { Kicker } from '@/components/ui/Kicker'
import { AdLabel, SponsoredLabel } from '@/components/ui/Labels'
import { Placeholder } from '@/components/ui/Placeholder'
import { AboutSection, Prose, keepDash } from './Section'

/** Clause order and their anchors (#siyosat-…), linkable from articles and JSON-LD. */
export const POLICY_CLAUSES = [
  { key: 'accuracy', anchor: 'siyosat-manbalar' },
  { key: 'independence', anchor: 'siyosat-mustaqillik' },
  { key: 'commercial', anchor: 'siyosat-tijorat' },
  { key: 'conflicts', anchor: 'siyosat-manfaatlar' },
  { key: 'anonymity', anchor: 'siyosat-anonim-manbalar' },
  { key: 'estimates', anchor: 'siyosat-taxminlar' },
] as const

const OPSZ = { fontVariationSettings: '"opsz" 60' } as const

function LabelRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-rule py-3.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-5">
      <dt className="sm:pt-0.5">{label}</dt>
      <dd className="text-ui text-ink-2">{children}</dd>
    </div>
  )
}

/** Editorial policy (#tahririyat-siyosati): six numbered clauses. */
export async function Policy({ id, locale }: { id: string; locale: Locale }) {
  const p = pick(aboutMessages, locale).policy
  const t = pick(commonMessages, locale)
  const sponsoredLabel = await getSponsoredLabel(locale)
  const c = p.commercial
  const est = p.estimates

  const body: Record<(typeof POLICY_CLAUSES)[number]['key'], React.ReactNode> = {
    accuracy: <Prose paragraphs={p.accuracy.text} className="mt-3" />,
    independence: <Prose paragraphs={p.independence.text} className="mt-3" />,
    commercial: (
      <>
        <Prose paragraphs={[c.intro]} className="mt-3" />
        <dl className="mt-4 max-w-measure border-t border-rule">
          <LabelRow label={<Kicker>{c.editorialLabel}</Kicker>}>{c.editorial}</LabelRow>
          <LabelRow label={<SponsoredLabel>{sponsoredLabel}</SponsoredLabel>}>
            {c.sponsored}{' '}
            <Link href={href(locale, paths.author('hamkorlik'))} className="text-link whitespace-nowrap">
              {c.authorLink}
            </Link>
          </LabelRow>
          <LabelRow label={<AdLabel>{t.labels.advert}</AdLabel>}>{c.advert}</LabelRow>
        </dl>
        <p className="mt-4 max-w-measure font-serif text-[1.125rem] leading-relaxed text-ink-2">{keepDash(c.after)}</p>
        <p className="mt-3">
          <Link
            href={href(locale, paths.advertise())}
            className="group inline-flex items-center gap-1 text-meta font-semibold text-emerald hover:text-emerald-ink"
          >
            {c.advertiseLink}
            <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </>
    ),
    conflicts: <Prose paragraphs={p.conflicts.text} className="mt-3" />,
    anonymity: <Prose paragraphs={p.anonymity.text} className="mt-3" />,
    estimates: (
      <>
        <Prose paragraphs={est.text} className="mt-3" />
        <p className="mt-4 max-w-measure font-serif text-[1.125rem] leading-relaxed text-ink-2">
          {keepDash(est.placeholderText)} <Placeholder>{est.placeholderSample}</Placeholder>
        </p>
      </>
    ),
  }

  return (
    <AboutSection id={id} title={p.title}>
      <p className="mt-5 max-w-measure font-serif text-standfirst text-ink">{keepDash(p.lead)}</p>
      <ol className="mt-6">
        {POLICY_CLAUSES.map(({ key, anchor }, i) => (
          <li
            key={key}
            id={anchor}
            className="scroll-mt-24 border-t border-rule py-6 sm:grid sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-x-4"
          >
            <span
              aria-hidden="true"
              className="figures hidden font-display text-[2rem] leading-none font-semibold text-brass sm:block"
              style={OPSZ}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 id={`${anchor}-title`} className="flex items-baseline gap-3 font-display text-h3 font-semibold">
                <span aria-hidden="true" className="figures font-display text-[1.625rem] leading-none text-brass sm:hidden" style={OPSZ}>
                  {i + 1}
                </span>
                <span>{p[key].title}</span>
              </h3>
              {body[key]}
            </div>
          </li>
        ))}
      </ol>
    </AboutSection>
  )
}
