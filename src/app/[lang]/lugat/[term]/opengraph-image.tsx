import { isLocale, locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { getGlossary, getTerm, isSlug } from '@/content'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat — Lugʻat'
// A new term's card renders on its first request; unknown terms 404 (CMS-SPEC §8.7).
export const revalidate = 3600

export async function generateStaticParams() {
  return (await Promise.all(locales.map(async (lang) => (await getGlossary(lang)).map((t) => ({ lang, term: t.slug }))))).flat()
}

/**
 * 404 for an unknown card (CMS-SPEC §8.7). Returned, not thrown: a thrown
 * notFound() leaves Next a cached 404 with no tags and no revalidate, which
 * would outlive the story's publication; a returned one carries the route's
 * tags and path, so the publication's invalidation clears it.
 */
const missing = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

/** Telegram card for a glossary term: headword and one-line definition. */
export default async function Image({ params }: { params: Promise<{ lang: string; term: string }> }) {
  const { lang, term: slug } = await params
  const term = isLocale(lang) && isSlug(slug) ? await getTerm(lang, slug) : undefined
  if (!term || !isLocale(lang)) return missing()
  const c = pick(commonMessages, lang)
  const eq = [term.aliases.en, term.aliases.ru].filter(Boolean).join(' · ')
  return ogCard({ kicker: c.nav.lugat, title: `${term.term} — ${term.short}`, footer: eq || c.nav.lugat })
}
