import { isLocale, locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat — islom moliyasi va biznes nashri'
// Only the prerendered cards exist: unknown params 404 instead of rendering
// (and caching) a fresh image for every probed URL.
export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

/** Default card for every page without its own image. */
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = pick(commonMessages, isLocale(lang) ? lang : 'uz')
  return ogCard({ kicker: t.tagline, title: t.description, footer: t.editorial.short.split('.')[0] })
}
