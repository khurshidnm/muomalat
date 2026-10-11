import { isLocale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { articleMessages } from '@/i18n/messages/article'
import { getArticle, getArticles, getSponsoredLabel, isRubric, isSlug } from '@/content'
import { locales } from '@/i18n/config'
import { formatDate } from '@/lib/format'
import { ogCard, ogSize } from '@/lib/og/card'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Muomalat'
// Cards for the recent stories are prerendered; a newer story's card renders
// on its first request. Unknown params 404 (CMS-SPEC §8.7): the slug is
// checked before any read, so a probed URL costs no query.
export const revalidate = 3600

export async function generateStaticParams() {
  return (await Promise.all(locales.map(async (lang) => (await getArticles(lang)).slice(0, 50).map((a) => ({ lang, rubric: a.rubric, slug: a.slug }))))).flat()
}

/**
 * 404 for an unknown card (CMS-SPEC §8.7). Returned, not thrown: a thrown
 * notFound() leaves Next a cached 404 with no tags and no revalidate, which
 * would outlive the story's publication; a returned one carries the route's
 * tags and path, so the publication's invalidation clears it.
 */
const missing = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export default async function Image({ params }: { params: Promise<{ lang: string; rubric: string; slug: string }> }) {
  const { lang, rubric, slug } = await params
  const a = isLocale(lang) && isRubric(rubric) && isSlug(slug) ? await getArticle(lang, rubric, slug) : undefined
  if (!a || !isLocale(lang)) return missing()
  const locale = lang
  const t = pick(commonMessages, locale)
  // A withdrawn story keeps a card, without its title when the editor-in-chief hid it.
  const title = a.withdrawn?.hideTitle ? pick(articleMessages, locale).withdrawnTitle : a.title
  return ogCard({
    kicker: a.kicker ?? t.rubrics[a.rubric].name,
    title,
    footer: `${t.rubrics[a.rubric].name} · ${formatDate(a.publishedAt, locale, 'date')}`,
    sponsored: a.sponsored ? await getSponsoredLabel(locale) : undefined,
  })
}
