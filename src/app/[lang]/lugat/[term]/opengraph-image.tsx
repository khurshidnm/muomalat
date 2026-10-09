import { isLocale, locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { getGlossary, getTerm } from '@/content'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat — Lugʻat'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => getGlossary(lang).map((t) => ({ lang, term: t.slug })))
}

/** Telegram card for a glossary term: headword and one-line definition. */
export default async function Image({ params }: { params: Promise<{ lang: string; term: string }> }) {
  const { lang, term: slug } = await params
  const locale = isLocale(lang) ? lang : 'uz'
  const c = pick(commonMessages, locale)
  const term = getTerm(locale, slug)
  if (!term) return ogCard({ kicker: c.nav.lugat, title: c.description, footer: c.siteName })
  const eq = [term.aliases.en, term.aliases.ru].filter(Boolean).join(' · ')
  return ogCard({ kicker: c.nav.lugat, title: `${term.term} — ${term.short}`, footer: eq || c.nav.lugat })
}
