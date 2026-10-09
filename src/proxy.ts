import { NextResponse, type NextRequest } from 'next/server'

/**
 * 1. Host rules (CMS-SPEC §2.3). The Payload admin and REST API answer only on
 *    the CMS host (cms.muomalat.uz, behind Cloudflare Access). On the public
 *    host they are 404, except GET/HEAD of image files. First-user
 *    registration is closed on every host: the first admin is created by
 *    script (GHSA-97rh-rhh2-7vjv). Cloudflare repeats these rules at the edge;
 *    this is never the only check.
 *
 * 2. Locale routing. Uzbek Latin is served at the root (/tahlil) by rewriting
 *    to the internal /uz segment; /kr, /ru and /en pass through. Explicit /uz
 *    URLs redirect to the root so each page has one public address. Metadata
 *    image routes keep their internal /uz path because Next generates them
 *    that way.
 */
const PREFIXED = new Set(['kr', 'ru', 'en'])
const INTERNAL_ASSET = /\/(opengraph-image|twitter-image|icon|apple-icon)(?:[-\w]*)?(?:\.\w+)?$/
const CMS_ONLY = /^\/(?:admin|api)(?:\/|$)/
const PUBLIC_FILE = /^\/api\/media\/file\/[^/]+$/
const FIRST_USER = /^\/(?:api\/users\/first-register|admin\/create-first-user)(?:\/|$)/

const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

/**
 * Payload's admin language cookie (`<cookiePrefix>-lng`, prefix `muomalat` in
 * src/payload.config.ts). Payload picks the interface language from this
 * cookie, then from Accept-Language, and only then from `fallbackLanguage`
 * ('uz'). Accept-Language never selects `uz` (it is not one of Payload's
 * languages) but does select `ru` or `en`, so a browser set to Russian or
 * English, or "uz, ru", would get those. Until a staff member picks a
 * language in their account settings, which stores this cookie, the CMS host
 * presents `uz` to Payload (CMS-SPEC §6.6).
 */
const ADMIN_LANGUAGE_COOKIE = 'muomalat-lng'

function cmsRequest(request: NextRequest) {
  if (request.cookies.has(ADMIN_LANGUAGE_COOKIE)) return NextResponse.next()
  const headers = new Headers(request.headers)
  const cookie = request.headers.get('cookie')
  headers.set('cookie', cookie ? `${cookie}; ${ADMIN_LANGUAGE_COOKIE}=uz` : `${ADMIN_LANGUAGE_COOKIE}=uz`)
  return NextResponse.next({ request: { headers } })
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cmsHost = process.env.CMS_HOST
  const onCms = Boolean(cmsHost) && request.headers.get('host') === cmsHost

  if (FIRST_USER.test(pathname)) return notFound()

  if (CMS_ONLY.test(pathname)) {
    if (onCms) return cmsRequest(request)
    const read = request.method === 'GET' || request.method === 'HEAD'
    return read && PUBLIC_FILE.test(pathname) ? NextResponse.next() : notFound()
  }

  const response = localeRoute(request, pathname)
  // The CMS host also renders the site (for preview); keep it out of search.
  if (onCms) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

function localeRoute(request: NextRequest, pathname: string) {
  const first = pathname.split('/')[1] ?? ''

  if (first === 'uz') {
    if (INTERNAL_ASSET.test(pathname)) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(3) || '/'
    return NextResponse.redirect(url, 308)
  }
  if (PREFIXED.has(first)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/uz${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    // Every /admin and /api path, whatever its extension, so the host rules
    // above cannot be skipped by a path ending in ".png".
    '/admin/:path*',
    '/api/:path*',
    // Site pages: skip Next internals, static files in /public and root metadata files.
    '/((?!_next/|images/|fonts/|favicon\\.ico$|icon\\.svg$|apple-icon|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|css|js|map|txt)$).*)',
  ],
}
