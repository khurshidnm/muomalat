import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { sign, signedRequest } from '@/payload/delivery/signature'
import { emptyTargets, TAG, type Targets } from '@/payload/delivery/tags'

/**
 * H5 (the route half): POST /internal/revalidate accepts only a body signed
 * with INTERNAL_REVALIDATE_SECRET, at most 60 s old, used once, and never a
 * request that came in through the tunnel (cf-connecting-ip). Everything else
 * is 403 and revalidates nothing.
 */
const nextCache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('next/cache', async (importOriginal) => ({ ...(await importOriginal<object>()), ...nextCache }))

const SECRET = 'test-secret-'.padEnd(48, 'x')
let previous: string | undefined
let POST: (request: Request) => Promise<Response>

const targets: Targets = { ...emptyTargets(), expire: [TAG.article(42)], tags: [TAG.articles, TAG.home], paths: ['/uz/tahlil/x', '/rss.xml'], layouts: ['/[lang]'] }

const request = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://app:3000/internal/revalidate', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } })

const signed = (t: Targets = targets, ts = Date.now()) => {
  const { body, headers } = signedRequest(t, SECRET, ts)
  return request(body, headers)
}

beforeAll(async () => {
  previous = process.env.INTERNAL_REVALIDATE_SECRET
  process.env.INTERNAL_REVALIDATE_SECRET = SECRET
  POST = (await import('@/app/internal/revalidate/route')).POST
})
afterAll(() => {
  process.env.INTERNAL_REVALIDATE_SECRET = previous
})
beforeEach(() => {
  nextCache.revalidateTag.mockClear()
  nextCache.revalidatePath.mockClear()
})

const expectRefused = async (res: Response) => {
  expect(res.status).toBe(403)
  expect(nextCache.revalidateTag).not.toHaveBeenCalled()
  expect(nextCache.revalidatePath).not.toHaveBeenCalled()
}

describe('/internal/revalidate', () => {
  it('a signed, fresh request revalidates every target', async () => {
    const res = await POST(signed())
    expect(res.status).toBe(200)
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.article(42), { expire: 0 })
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.articles, 'max')
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.home, 'max')
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/uz/tahlil/x')
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/rss.xml')
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/[lang]', 'layout')
  })

  it('no signature → 403', async () => {
    await expectRefused(await POST(request(JSON.stringify({ targets, ts: Date.now() }))))
  })

  it('a signature made with another key → 403', async () => {
    const body = JSON.stringify({ targets, ts: Date.now() })
    await expectRefused(await POST(request(body, { 'x-signature': sign(body, 'another-secret-'.padEnd(48, 'y')) })))
  })

  it('a valid signature over a different body → 403', async () => {
    const { headers } = signedRequest(targets, SECRET)
    const tampered = JSON.stringify({ targets: { ...targets, layouts: ['/'] }, ts: Date.now() })
    await expectRefused(await POST(request(tampered, headers)))
  })

  it('a malformed signature → 403', async () => {
    const body = JSON.stringify({ targets, ts: Date.now() })
    await expectRefused(await POST(request(body, { 'x-signature': 'zz' })))
    await expectRefused(await POST(request(body, { 'x-signature': sign(body, SECRET).slice(0, 40) })))
  })

  it('a timestamp older than 60 s → 403, and so is one from the future', async () => {
    await expectRefused(await POST(signed(targets, Date.now() - 61_000)))
    await expectRefused(await POST(signed(targets, Date.now() + 61_000)))
  })

  it('a replay of an accepted request → 403', async () => {
    const { body, headers } = signedRequest({ ...targets, tags: ['replay'] }, SECRET)
    expect((await POST(request(body, headers))).status).toBe(200)
    nextCache.revalidateTag.mockClear()
    nextCache.revalidatePath.mockClear()
    await expectRefused(await POST(request(body, headers)))
  })

  it('a correctly signed request that carries cf-connecting-ip came from outside → 403', async () => {
    const { body, headers } = signedRequest({ ...targets, tags: ['tunnel'] }, SECRET)
    await expectRefused(await POST(request(body, { ...headers, 'cf-connecting-ip': '203.0.113.7' })))
  })

  it('a signed body whose targets are not targets → 403', async () => {
    const body = JSON.stringify({ targets: { tags: 'articles' }, ts: Date.now() })
    await expectRefused(await POST(request(body, { 'x-signature': sign(body, SECRET) })))
  })

  it('without a usable secret everything is refused', async () => {
    process.env.INTERNAL_REVALIDATE_SECRET = 'short'
    try {
      const { body, headers } = signedRequest(targets, 'short')
      await expectRefused(await POST(request(body, headers)))
    } finally {
      process.env.INTERNAL_REVALIDATE_SECRET = SECRET
    }
  })
})
