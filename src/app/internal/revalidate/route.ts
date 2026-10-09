import { revalidateTargets } from '@/payload/delivery/revalidate'
import { MAX_BODY_BYTES, SIGNATURE_HEADER, verifySigned } from '@/payload/delivery/signature'

/**
 * POST /internal/revalidate (CMS-SPEC §8.4 step 2): cache invalidation for
 * callers outside a request, which is the outbox worker. It is reachable only
 * inside the Docker network: Cloudflare and proxy.ts answer 404 to /internal/*
 * from outside, and anything carrying cf-connecting-ip came through the
 * tunnel and is refused here as well.
 *
 * Body `{"targets": …, "ts": <ms>}`, header `X-Signature: hex
 * HMAC-SHA256(body, INTERNAL_REVALIDATE_SECRET)`, compared in constant time.
 * A timestamp more than 60 s off, or a signature already used, is refused.
 * Every refusal is the same 403; the reason goes to the log only.
 */
const forbidden = () => new Response('Forbidden', { status: 403, headers: { 'cache-control': 'no-store' } })

export async function POST(request: Request) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return forbidden()
  const body = await request.text()
  const verdict = verifySigned({
    body,
    signature: request.headers.get(SIGNATURE_HEADER),
    viaTunnel: request.headers.has('cf-connecting-ip'),
    secret: process.env.INTERNAL_REVALIDATE_SECRET,
  })
  if (!verdict.ok) {
    console.warn(`[internal/revalidate] refused: ${verdict.reason}`)
    return forbidden()
  }
  revalidateTargets(verdict.targets)
  const t = verdict.targets
  return Response.json(
    { ok: true, expired: t.expire.length, tags: t.tags.length, paths: t.paths.length, layouts: t.layouts.length },
    { headers: { 'cache-control': 'no-store' } },
  )
}
