import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { isCmsHost } from '@/content/adapters/cms/preview'

/**
 * Leaves draft preview (CMS-SPEC §5.13) and returns to the page it was left
 * from, on the same host; the preview banner submits a form here (a form, so
 * no prefetch can end the preview by accident). CMS host only.
 */
export const dynamic = 'force-dynamic'

function backTo(request: NextRequest): string {
  const referer = request.headers.get('referer')
  if (!referer) return '/'
  try {
    const url = new URL(referer)
    if (url.host !== request.headers.get('host')) return '/'
    const path = `${url.pathname}${url.search}`
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/preview') ? path : '/'
  } catch {
    return '/'
  }
}

export async function GET(request: NextRequest) {
  if (!isCmsHost(request.headers.get('host'))) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }
  ;(await draftMode()).disable()
  redirect(backTo(request))
}

export const POST = GET
