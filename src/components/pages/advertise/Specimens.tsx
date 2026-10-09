import { site } from '@/content/data/site'
import { AdLabel, SponsoredLabel } from '@/components/ui/Labels'
import { Icon } from '@/components/ui/Icon'
import { Placeholder } from '@/components/ui/Placeholder'
import { TELEGRAM_AD_TAG, type FormatKey } from './data'

/**
 * Label specimens for each advertising format, built from the real label
 * components (AdLabel, SponsoredLabel) so readers see exactly what they will
 * meet on the site. Scaled-down mock-ups, not live ad slots.
 */

export interface SpecimenText {
  advert: string
  sponsored: string
  partner: string
  partnerName: string
  sponsoredHeadline: string
  sponsoredNote: string
  telegramText: string
  advertiser: string
  digestIssue: string
  digestItems: readonly string[]
  digestAd: string
  clubLabel: string
  clubMeeting: string
  clubNote: string
  placeholder: string
}

/** Same hatch as AdSlot: neutral, deliberately unlike any editorial block. */
const hatch: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, transparent 0 9px, color-mix(in srgb, var(--ad-ink) 9%, transparent) 9px 10px)',
}
const adField = 'flex items-center justify-center border border-dashed border-ad-ink/40 bg-ad text-meta text-ad-ink'

function AdBox({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-center">
        <AdLabel>{label}</AdLabel>
      </div>
      {children}
    </div>
  )
}

function Banner({ t }: { t: SpecimenText }) {
  return (
    <div className="space-y-5">
      <AdBox label={t.advert}>
        <div className={`${adField} figures aspect-[728/90] w-full`} style={hatch}>
          728 × 90
        </div>
      </AdBox>
      <AdBox label={t.advert}>
        <div className={`${adField} figures mx-auto aspect-[300/250] w-[62%] max-w-[12.5rem]`} style={hatch}>
          300 × 250
        </div>
      </AdBox>
    </div>
  )
}

function Sponsored({ t }: { t: SpecimenText }) {
  return (
    <div className="border border-brass bg-brass-wash p-4">
      <SponsoredLabel>{t.sponsored}</SponsoredLabel>
      <p className="mt-2.5 font-serif text-lead leading-snug font-semibold text-ink">{t.sponsoredHeadline}</p>
      <p className="mt-2 text-meta text-brass-ink">
        {t.partner}: <Placeholder title={t.placeholder}>{t.partnerName}</Placeholder>
      </p>
      <p className="mt-3 border-t border-brass/40 pt-2.5 text-meta leading-relaxed text-ink-2">{t.sponsoredNote}</p>
    </div>
  )
}

function Telegram({ t, tagLang }: { t: SpecimenText; tagLang?: string }) {
  return (
    <div className="border border-rule bg-paper">
      <div className="flex items-center gap-2.5 border-b border-rule px-4 py-2.5">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald text-on-emerald">
          <Icon name="telegram" size={16} />
        </span>
        <span className="min-w-0 text-meta leading-tight">
          <span className="block font-semibold text-ink">{site.name}</span>
          <span className="text-ink-3">{site.telegram.handle}</span>
        </span>
      </div>
      <div className="space-y-2 px-4 py-3 text-ui">
        <p lang={tagLang} className="font-semibold text-emerald">
          {TELEGRAM_AD_TAG}
        </p>
        <p className="text-ink-2">{t.telegramText}</p>
        <p className="text-meta text-ink-3">
          {t.advertiser}: <Placeholder title={t.placeholder}>{t.partnerName}</Placeholder>
        </p>
      </div>
    </div>
  )
}

function Digest({ t }: { t: SpecimenText }) {
  return (
    <div className="border-t-2 border-brass bg-paper-2 p-4">
      <p className="label-caps text-brass-ink">{t.digestIssue}</p>
      <ul className="mt-2">
        {t.digestItems.map((item, i) => (
          <li key={i} className="flex items-baseline gap-2.5 border-b border-rule py-2 font-serif text-[1rem] leading-snug text-ink">
            <span aria-hidden="true" className="figures font-sans text-meta font-semibold text-brass-ink">
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
      <AdBox label={t.advert} className="mt-4">
        <div className={`${adField} h-16 px-3 text-center`} style={hatch}>
          {t.digestAd}
        </div>
      </AdBox>
    </div>
  )
}

function Club({ t }: { t: SpecimenText }) {
  return (
    <div className="border-t-2 border-brass bg-paper-2 p-4">
      <p className="label-caps text-ink-3">{t.clubMeeting}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <SponsoredLabel>{t.clubLabel}</SponsoredLabel>
        <span className="text-meta text-brass-ink">
          <Placeholder title={t.placeholder}>{t.partnerName}</Placeholder>
        </span>
      </div>
      <p className="mt-3 flex items-start gap-1.5 border-t border-rule pt-2.5 text-meta text-ink-2">
        <Icon name="info" size={16} className="mt-px shrink-0 text-emerald" />
        {t.clubNote}
      </p>
    </div>
  )
}

export function FormatSpecimen({
  format,
  text,
  caption,
  tagLang,
}: {
  format: FormatKey
  text: SpecimenText
  caption: string
  /** lang for the Uzbek-only Telegram hashtag on ru/en pages. */
  tagLang?: string
}) {
  return (
    <figure className="min-w-0">
      <figcaption className="label-caps mb-2.5 text-ink-3">{caption}</figcaption>
      {format === 'banner' ? <Banner t={text} /> : null}
      {format === 'sponsored' ? <Sponsored t={text} /> : null}
      {format === 'telegram' ? <Telegram t={text} tagLang={tagLang} /> : null}
      {format === 'digest' ? <Digest t={text} /> : null}
      {format === 'club' ? <Club t={text} /> : null}
    </figure>
  )
}
