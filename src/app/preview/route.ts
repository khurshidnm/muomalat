import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import type { PayloadRequest } from 'payload'

import { isLocale, localePath, type Locale } from '@/i18n/config'
import { payloadClient } from '@/content/adapters/cms/client'
import { isCmsHost, staffUser } from '@/content/adapters/cms/preview'
import { rubricSlugsById } from '@/content/adapters/cms/refs'
import { idOf } from '@/content/adapters/cms/media'
import { PAGE } from '@/payload/delivery/tags'

/**
 * Draft preview (CMS-SPEC §5.13): /preview?c=<collection>&id=<id>&l=<uz|kr|ru|en>,
 * opened by the admin's live preview and the "Kirill" tab's KrPreview.
 *
 * Only on the CMS host (src/proxy.ts answers 404 elsewhere; this route checks
 * again). There is no URL secret: the host sits behind Cloudflare Access and
 * the request must carry a Payload session. The document is read as that
 * staff member (`overrideAccess: false`), so preview needs read access to
 * the draft; then draft mode is turned on and the browser goes to the page.
 */
export const dynamic = 'force-dynamic'

const PREVIEWABLE = ['articles', 'glossary-terms', 'club-events'] as const
type Previewable = (typeof PREVIEWABLE)[number]

const plain = (status: number, text: string) =>
  new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } })

export async function GET(request: NextRequest) {
  if (!isCmsHost(request.headers.get('host'))) return plain(404, 'Not found')
  const params = request.nextUrl.searchParams
  const c = params.get('c') ?? ''
  const id = params.get('id') ?? ''
  const l = params.get('l') ?? 'uz'
  if (!(PREVIEWABLE as readonly string[]).includes(c) || !/^\d{1,12}$/.test(id) || !isLocale(l)) {
    return plain(400, 'Koʻrib chiqish havolasi notoʻgʻri.')
  }
  const user = await staffUser(request.headers)
  if (!user) {
    const back = `${request.nextUrl.pathname}${request.nextUrl.search}`
    redirect(`/admin/login?redirect=${encodeURIComponent(back)}`)
  }

  const payload = await payloadClient()
  const doc = (await payload.findByID({
    collection: c as Previewable,
    id,
    draft: true,
    depth: 0,
    disableErrors: true,
    user,
    overrideAccess: false,
    req: { headers: request.headers } as Partial<PayloadRequest>,
    select: { slug: true, ...(c === 'articles' ? { rubric: true } : {}) } as never,
  })) as { slug?: string | null; rubric?: unknown } | null
  if (!doc) return plain(404, 'Hujjat topilmadi yoki uni koʻrish huquqingiz yoʻq.')

  const path = await pagePath(c as Previewable, doc)
  if (!path) return plain(409, 'Koʻrib chiqish uchun hujjatning manzili (slug) va rubrikasi saqlangan boʻlishi kerak.')

  ;(await draftMode()).enable()
  redirect(localePath(l as Locale, path))
}

async function pagePath(c: Previewable, doc: { slug?: string | null; rubric?: unknown }): Promise<string | undefined> {
  if (!doc.slug) return undefined
  if (c === 'glossary-terms') return PAGE.term(doc.slug)
  if (c === 'club-events') return PAGE.clubEvent(doc.slug)
  const rubric = (await rubricSlugsById(await payloadClient())).get(String(idOf(doc.rubric)))
  return rubric ? PAGE.article(rubric, doc.slug) : undefined
}
