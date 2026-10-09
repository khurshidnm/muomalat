import { isLocale, locales } from '@/i18n/config'
import { buildRss, RSS_CONTENT_TYPE } from '@/lib/rss'

/** RSS 2.0 per edition: /rss.xml (uz, via the proxy rewrite), /kr/rss.xml, /ru/rss.xml, /en/rss.xml. */
export const dynamic = 'force-static'
export const dynamicParams = false
/** Seconds; a publication refreshes the feed sooner through tags and its path (CMS-SPEC §8.4). */
export const revalidate = 300

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) return new Response('Not found', { status: 404 })
  return new Response(await buildRss(lang), {
    headers: {
      'Content-Type': RSS_CONTENT_TYPE,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
