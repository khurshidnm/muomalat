import { NextResponse, type NextRequest } from 'next/server'

/**
 * Locale routing. Uzbek Latin is served at the root (/tahlil) by rewriting to
 * the internal /uz segment; /kr, /ru and /en pass through. Explicit /uz URLs
 * redirect to the root so each page has one public address. Metadata image
 * routes keep their internal /uz path because Next generates them that way.
 */
const PREFIXED = new Set(['kr', 'ru', 'en'])
const INTERNAL_ASSET = /\/(opengraph-image|twitter-image|icon|apple-icon)(?:[-\w]*)?(?:\.\w+)?$/

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
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
    // Skip Next internals, API, static files in /public and root metadata files.
    '/((?!_next/|api/|images/|fonts/|favicon\\.ico$|icon\\.svg$|apple-icon|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|css|js|map|txt)$).*)',
  ],
}
