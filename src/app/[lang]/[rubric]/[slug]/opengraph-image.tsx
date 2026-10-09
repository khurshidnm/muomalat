import { isLocale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { getArticle, getArticles, isRubric } from '@/content'
import { locales } from '@/i18n/config'
import { formatDate } from '@/lib/format'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat'
// Only the prerendered cards exist: unknown params 404 instead of rendering
// (and caching) a fresh image for every probed URL.
export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => getArticles(lang).map((a) => ({ lang, rubric: a.rubric, slug: a.slug })))
}

export default async function Image({ params }: { params: Promise<{ lang: string; rubric: string; slug: string }> }) {
  const { lang, rubric, slug } = await params
  const a = isLocale(lang) && isRubric(rubric) ? getArticle(lang, rubric, slug) : undefined
  const locale = isLocale(lang) ? lang : 'uz'
  const t = pick(commonMessages, locale)
  if (!a) return ogCard({ kicker: t.tagline, title: t.description, footer: t.siteName })
  return ogCard({
    kicker: a.kicker ?? t.rubrics[a.rubric].name,
    title: a.title,
    footer: `${t.rubrics[a.rubric].name} · ${formatDate(a.publishedAt, locale, 'date')}`,
    sponsored: a.sponsored ? t.labels.sponsored : undefined,
  })
}
