import { NextResponse, type NextRequest } from 'next/server'

import { clientIp, hit } from './lib/rateLimit'

/**
 * 1. Host rules (CMS-SPEC §2.3). The Payload admin and REST API answer only on
 *    the CMS host (cms.muomalat.uz, behind Cloudflare Access). On the public
 *    host they are 404, except GET/HEAD of image files. First-user
 *    registration is closed on every host: the first admin is created by
 *    script (GHSA-97rh-rhh2-7vjv). `/preview` and `/exit-preview` exist on the
 *    CMS host only. `/internal/*` is 404 on both public hosts and for anything
 *    that came through Cloudflare; only callers inside the Docker network
 *    reach it, and the route checks its HMAC itself. `/t/<code>` short links
 *    pass through on every host. The CMS host's robots.txt disallows
 *    everything. Cloudflare repeats these rules at the edge; this is never the
 *    only check.
 *
 * 2. Login limit. POST /api/users/login and /forgot-password on the CMS host
 *    are counted per IP and per submitted email before the body reaches
 *    Payload (§12.3). This is the coarse outer layer: it counts every attempt,
 *    correct ones too, so its per-IP limit sits above the one in the users
 *    `beforeOperation` hook, which counts failures only and is the one the
 *    acceptance test (K18) holds to.
 *
 * 3. Locale routing. Uzbek Latin is served at the root (/tahlil) by rewriting
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
const INTERNAL = /^\/internal(?:\/|$)/
const PREVIEW = /^\/(?:preview|exit-preview)(?:\/|$)/
const SHORT_LINK = /^\/t\/[^/]+\/?$/
const LOGIN = /^\/api\/users\/(?:login|forgot-password)\/?$/

const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

const NOINDEX = 'noindex, nofollow'

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

// ---------------------------------------------------------------------------
// Login limit
// ---------------------------------------------------------------------------

const PROXY_LOGIN_LIMITS = {
  ip: { max: 30, windowMs: 15 * 60_000 },
  email: { max: 10, windowMs: 15 * 60_000 },
} as const

/** The email in a login or forgot-password body: JSON, or the admin form's multipart `_payload`. */
async function submittedEmail(request: NextRequest): Promise<string | undefined> {
  if (Number(request.headers.get('content-length') ?? 0) > 16_384) return undefined
  const type = request.headers.get('content-type') ?? ''
  try {
    let data: unknown
    if (type.includes('application/json')) data = await request.clone().json()
    else if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
      const form = await request.clone().formData()
      const raw = form.get('_payload')
      data = typeof raw === 'string' ? JSON.parse(raw) : { email: form.get('email') }
    }
    const email = (data as { email?: unknown } | undefined)?.email
    return typeof email === 'string' && email.trim() ? email.trim().toLowerCase().slice(0, 320) : undefined
  } catch {
    return undefined
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes.slice(0, 12)), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * A 429 in Payload's error shape, with the generic login error (§12.3), or
 * null. Only requests that came through Cloudflare are counted: without
 * cf-connecting-ip every caller would share one bucket (local development,
 * calls from inside the Docker network).
 */
async function limitLogin(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  if (request.method !== 'POST' || !LOGIN.test(pathname) || !request.headers.has('cf-connecting-ip')) return null
  const kind = pathname.includes('forgot-password') ? 'forgot' : 'login'
  const ip = hit(`proxy:${kind}:ip:${clientIp(request.headers)}`, PROXY_LOGIN_LIMITS.ip.max, PROXY_LOGIN_LIMITS.ip.windowMs)
  let limited = ip.ok ? null : ip
  if (!limited) {
    const email = await submittedEmail(request)
    if (email) {
      const byEmail = hit(`proxy:${kind}:email:${await digest(email)}`, PROXY_LOGIN_LIMITS.email.max, PROXY_LOGIN_LIMITS.email.windowMs)
      if (!byEmail.ok) limited = byEmail
    }
  }
  if (!limited) return null
  return NextResponse.json(
    { errors: [{ message: 'Elektron pochta yoki parol notoʻgʻri.' }] },
    { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds), 'Cache-Control': 'no-store' } },
  )
}

// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')
  const cmsHost = process.env.CMS_HOST
  const siteHost = process.env.SITE_HOST
  const onCms = Boolean(cmsHost) && host === cmsHost
  const onSite = Boolean(siteHost) && host === siteHost

  if (FIRST_USER.test(pathname)) return notFound()

  // Inside the Docker network the worker calls http://app:3000/internal/…;
  // every request through the tunnel carries cf-connecting-ip.
  if (INTERNAL.test(pathname)) {
    return onCms || onSite || request.headers.has('cf-connecting-ip') ? notFound() : NextResponse.next()
  }

  if (CMS_ONLY.test(pathname)) {
    if (onCms) return (await limitLogin(request, pathname)) ?? cmsRequest(request)
    const read = request.method === 'GET' || request.method === 'HEAD'
    return read && PUBLIC_FILE.test(pathname) ? NextResponse.next() : notFound()
  }

  if (PREVIEW.test(pathname)) {
    if (!onCms) return notFound()
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', NOINDEX)
    return response
  }

  if (pathname === '/robots.txt') {
    if (!onCms) return NextResponse.next()
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': NOINDEX, 'Cache-Control': 'no-store' },
    })
  }

  // The short-link route answers 301 itself; it must not be rewritten to /uz.
  if (SHORT_LINK.test(pathname)) return NextResponse.next()

  const response = localeRoute(request, pathname)
  // The CMS host also renders the site (for preview); keep it out of search.
  if (onCms) response.headers.set('X-Robots-Tag', NOINDEX)
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
    // Every /admin, /api, /internal and preview path, whatever its extension,
    // so the host rules above cannot be skipped by a path ending in ".png".
    '/admin/:path*',
    '/api/:path*',
    '/internal/:path*',
    '/preview/:path*',
    '/exit-preview/:path*',
    // Answered here on the CMS host; passed to src/app/robots.ts on the site.
    '/robots.txt',
    // Site pages: skip Next internals, static files in /public and root metadata files.
    '/((?!_next/|images/|fonts/|favicon\\.ico$|icon\\.svg$|apple-icon|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|css|js|map|txt)$).*)',
  ],
}
