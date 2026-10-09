import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { deliveryEnv } from '@/payload/delivery/env'
import { resolveShortCode, SHORT_CODE_RE, type ShortLinkTarget } from '@/payload/delivery/shortlinks'
import { PAGE, publicPath, TAG, utmQuery } from '@/payload/delivery/tags'

/**
 * Short links (CMS-SPEC §8.8, §10.7): /t/<code> answers 301 to the story on
 * the canonical host with the channel's UTM parameters; `?l=kr|ru|en` picks
 * the edition. Unknown codes, drafts and unpublished stories get 404.
 *
 * Found codes are cached under the `shortlinks` tag, which the invalidate
 * concern expires when a story is published, moved or taken down. Misses are
 * not cached, so probing random codes fills no cache. Cloudflare keeps the
 * 301 for a day (s-maxage). There is no click counter in the schema, so
 * there is nothing to skip for TelegramBot's link previews.
 */
const MISSING = 'SHORTLINK_MISSING'

const lookup = unstable_cache(
  async (code: string): Promise<ShortLinkTarget> => {
    const found = await resolveShortCode(await getPayload({ config }), code)
    if (!found) throw Object.assign(new Error(`no story for short code ${code}`), { code: MISSING })
    return found
  },
  ['shortlink'],
  { tags: [TAG.shortlinks], revalidate: 86_400 },
)

const notFound = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } })

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase()
  if (!SHORT_CODE_RE.test(code)) return notFound()
  let target: ShortLinkTarget
  try {
    target = await lookup(code)
  } catch (error) {
    if ((error as { code?: string }).code === MISSING) return notFound()
    throw error
  }
  const l = new URL(request.url).searchParams.get('l')
  const edition = l === 'kr' || l === 'ru' || l === 'en' ? l : 'uz'
  const location = `${deliveryEnv().siteUrl}${publicPath(edition, PAGE.article(target.rubric, target.slug))}?${utmQuery(target.utmContent)}`
  return new Response(null, { status: 301, headers: { location, 'cache-control': 'public, max-age=3600, s-maxage=86400' } })
}
