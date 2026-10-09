import { NextResponse, type NextRequest } from 'next/server'
import { clientIp } from '@/lib/rateLimit'
import { limitToken } from '@/lib/actions/context'
import { personalData } from '@/payload/personalData'
import { PD_PATHS, readUnsubscribeToken } from '@/payload/personalData/tokens'
import { isLocale, localePath } from '@/i18n/config'

/**
 * RFC 8058 one-click unsubscribe, the target of every digest e-mail's
 * List-Unsubscribe header (listUnsubscribeHeaders in personalData/tokens).
 * Mail clients POST `List-Unsubscribe=One-Click` here; the token in the URL
 * is the only credential. A GET (someone opening the header link in a
 * browser) goes to the unsubscribe page, which asks for the click.
 */
const noStore = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }

export async function POST(request: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  await params
  if (!limitToken('digest-one-click', clientIp(request.headers))) return new NextResponse(null, { status: 429, headers: noStore })
  const token = request.nextUrl.searchParams.get('t')
  if (readUnsubscribeToken(token) === null) return new NextResponse(null, { status: 400, headers: noStore })
  const outcome = await personalData().unsubscribeDigest(token)
  return new NextResponse(null, { status: outcome === 'unsubscribed' ? 200 : 503, headers: noStore })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const url = request.nextUrl.clone()
  url.pathname = localePath(isLocale(lang) ? lang : 'uz', PD_PATHS.unsubscribe)
  return NextResponse.redirect(url, { status: 303, headers: noStore })
}
