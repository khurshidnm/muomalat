import http from 'node:http'
import type { AddressInfo } from 'node:net'

import type { Where } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { purge, URL_BATCH_GAP_MS } from '@/payload/delivery/cloudflare'
import { MAX_ATTEMPTS } from '@/payload/delivery/outbox'
import { emptyTargets, TAG } from '@/payload/delivery/tags'
import { httpGetStatus, warmUp } from '@/payload/delivery/warm'
import { postRevalidate, processOutbox, type OutboxDeps } from '@/worker/jobs/outbox'
import { testPayload } from '../helpers/payload'
import { AS_IMPORT, author, eventsFor, rubric, story } from './fixtures'

/**
 * The outbox worker (CMS-SPEC §8.4 step 3) and H13: a change made with no
 * request scope (a script, the scheduler, this test) revalidates nothing
 * in-process; the worker posts the row's targets to /internal/revalidate,
 * warms the pages, purges Cloudflare by exact URL and marks the row done.
 * Because the row is what carries the invalidation, an app restart between
 * the change and the worker's pass loses nothing.
 *
 * The app side is the real route handler (next/cache stubbed); Cloudflare and
 * the warm-up are fakes that record their requests.
 */
const nextCache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('next/cache', async (importOriginal) => ({ ...(await importOriginal<object>()), ...nextCache }))

const SECRET = 'outbox-secret-'.padEnd(48, 'z')
const env = {
  siteUrl: 'https://muomalat.uz',
  siteHost: 'muomalat.uz',
  internalAppUrl: 'http://app:3000',
  revalidateSecret: SECRET,
  cloudflareToken: 'cf-token',
  cloudflareZone: 'zone-1',
}

let payload: Awaited<ReturnType<typeof testPayload>>
let routePOST: (request: Request) => Promise<Response>
let rubricId: number
let authorId: number
let previousSecret: string | undefined

type Call = { url: string; init?: RequestInit }
const cloudflare: Call[] = []
const app: Call[] = []
const warmed: { url: string; host: string }[] = []
const sleeps: number[] = []

/** The worker's fetch: /internal/revalidate goes to the route handler, the Cloudflare API to a recorder. */
const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input)
  if (url.startsWith('https://api.cloudflare.com/')) {
    cloudflare.push({ url, init })
    return Response.json({ success: true, errors: [], result: { id: 'purge' } })
  }
  app.push({ url, init })
  return routePOST(new Request(url, init))
}) as typeof fetch

const deps = (over: Partial<OutboxDeps> = {}): Partial<OutboxDeps> => ({
  revalidate: (t) => postRevalidate(t, { fetch: fakeFetch, env }),
  warm: (paths) =>
    warmUp(paths, {
      env,
      get: async (url, host) => (warmed.push({ url, host }), 200),
      sleep: async (ms) => void sleeps.push(ms),
    }),
  purge: (t) => purge(t, { env, fetch: fakeFetch, sleep: async (ms) => void sleeps.push(ms) }),
  ...over,
})

const scopeTo = (id: number): Where => ({ and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(id) } }] })

beforeAll(async () => {
  previousSecret = process.env.INTERNAL_REVALIDATE_SECRET
  process.env.INTERNAL_REVALIDATE_SECRET = SECRET
  payload = await testPayload()
  routePOST = (await import('@/app/internal/revalidate/route')).POST
  rubricId = (await rubric('izoh', 4)).id
  authorId = (await author('outbox')).id
})
afterAll(async () => {
  process.env.INTERNAL_REVALIDATE_SECRET = previousSecret
  await (await testPayload()).destroy()
})
beforeEach(() => {
  cloudflare.length = 0
  app.length = 0
  warmed.length = 0
  sleeps.length = 0
  nextCache.revalidateTag.mockClear()
  nextCache.revalidatePath.mockClear()
})

describe('H13: a change outside a request reaches the caches through the outbox', () => {
  it('re-posts, warms twice, purges by exact URL and marks the row done', async () => {
    const a = await story({ tag: 'outbox-h13', rubric: rubricId, authors: [authorId] })
    const [row] = await eventsFor(payload, 'articles', a.id)
    expect(row).toMatchObject({ kind: 'publish_first', status: 'pending' })
    // No request scope: nothing was revalidated in-process.
    expect(nextCache.revalidateTag).not.toHaveBeenCalled()

    const result = await processOutbox(payload, deps(), scopeTo(a.id))
    expect(result).toEqual({ done: 1, retried: 0, failed: 0 })

    // 0. One signed POST to the app, which revalidated the row's targets.
    expect(app).toHaveLength(1)
    expect(app[0]!.url).toBe('http://app:3000/internal/revalidate')
    expect(new Headers(app[0]!.init?.headers).get('x-signature')).toMatch(/^[0-9a-f]{64}$/)
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.article(a.id), { expire: 0 })
    expect(nextCache.revalidateTag).toHaveBeenCalledWith(TAG.articles, 'max')
    expect(nextCache.revalidatePath).toHaveBeenCalledWith(`/uz/izoh/${a.slug}`)
    expect(nextCache.revalidatePath).toHaveBeenCalledWith(`/en/izoh/${a.slug}`)

    // 1. Each page twice, 2 s apart, with the public Host.
    const story4 = [`/izoh/${a.slug}`, `/kr/izoh/${a.slug}`, `/ru/izoh/${a.slug}`, `/en/izoh/${a.slug}`]
    for (const p of [...story4, '/', '/kr', '/ru', '/en', '/izoh']) {
      expect(warmed.filter((w) => w.url === `http://app:3000${p}`)).toHaveLength(2)
    }
    expect(new Set(warmed.map((w) => w.host))).toEqual(new Set(['muomalat.uz']))
    expect(sleeps).toContain(2_000)

    // 2. Cloudflare: exact URLs on the public host, at most 100 per request, no prefix purge.
    expect(cloudflare.length).toBeGreaterThan(0)
    const bodies = cloudflare.map((c) => JSON.parse(String(c.init?.body)) as { files?: string[]; prefixes?: string[] })
    expect(cloudflare[0]!.url).toBe('https://api.cloudflare.com/client/v4/zones/zone-1/purge_cache')
    expect(new Headers(cloudflare[0]!.init?.headers).get('authorization')).toBe('Bearer cf-token')
    expect(bodies.every((b) => !b.prefixes && (b.files?.length ?? 0) <= 100)).toBe(true)
    const files = bodies.flatMap((b) => b.files ?? [])
    expect(files).toEqual(
      expect.arrayContaining([
        ...story4.map((p) => `https://muomalat.uz${p}`),
        ...story4.map((p) => `https://muomalat.uz${p}/opengraph-image`),
        `https://muomalat.uz/uz/izoh/${a.slug}/opengraph-image`,
        'https://muomalat.uz/',
        'https://muomalat.uz/kr',
        'https://muomalat.uz/izoh',
        'https://muomalat.uz/rss.xml',
        'https://muomalat.uz/ru/rss.xml',
        'https://muomalat.uz/sitemap.xml',
      ]),
    )

    // 4. Done.
    const [after] = await eventsFor(payload, 'articles', a.id)
    expect(after).toMatchObject({ status: 'done', attempts: 1, lastError: null })
    expect(after!.processedAt).toBeTruthy()

    // A second pass finds nothing to do.
    expect(await processOutbox(payload, deps(), scopeTo(a.id))).toEqual({ done: 0, retried: 0, failed: 0 })
  })

  it('a slug change purges the old address by prefix as well', async () => {
    const a = await story({ tag: 'outbox-move', rubric: rubricId, authors: [authorId] })
    await processOutbox(payload, deps(), scopeTo(a.id))
    cloudflare.length = 0
    await payload.update({ collection: 'articles', id: a.id, data: { slug: `${a.slug}-2`, _status: 'published' }, draft: false, context: AS_IMPORT, overrideAccess: true })
    await processOutbox(payload, deps(), scopeTo(a.id))
    const prefixes = cloudflare.flatMap((c) => (JSON.parse(String(c.init?.body)) as { prefixes?: string[] }).prefixes ?? [])
    expect(prefixes).toEqual([`muomalat.uz/izoh/${a.slug}`, `muomalat.uz/kr/izoh/${a.slug}`, `muomalat.uz/ru/izoh/${a.slug}`, `muomalat.uz/en/izoh/${a.slug}`])
  })
})

describe('retries', () => {
  it('a failed pass keeps the row pending with the error, and retries after the backoff', async () => {
    const a = await story({ tag: 'outbox-retry', rubric: rubricId, authors: [authorId] })
    const now = Date.now()
    const failing = vi.fn(async () => {
      throw new Error('app is restarting')
    })
    expect(await processOutbox(payload, deps({ revalidate: failing, now: () => now }), scopeTo(a.id))).toEqual({ done: 0, retried: 1, failed: 0 })
    const [row] = await eventsFor(payload, 'articles', a.id)
    expect(row).toMatchObject({ status: 'pending', attempts: 1, lastError: 'app is restarting' })
    expect(cloudflare).toHaveLength(0)

    // Not due again straight away…
    await processOutbox(payload, deps({ revalidate: failing, now: () => now }), scopeTo(a.id))
    expect(failing).toHaveBeenCalledTimes(1)
    // …but after the first backoff (5 s) it is, and then it succeeds.
    expect(await processOutbox(payload, deps({ now: () => now + 6_000 }), scopeTo(a.id))).toEqual({ done: 1, retried: 0, failed: 0 })
    expect((await eventsFor(payload, 'articles', a.id))[0]).toMatchObject({ status: 'done', attempts: 2, lastError: null })
  })

  it(`after ${MAX_ATTEMPTS} attempts the row is failed and an alert goes out`, async () => {
    const a = await story({ tag: 'outbox-give-up', rubric: rubricId, authors: [authorId] })
    const [row] = await eventsFor(payload, 'articles', a.id)
    await payload.update({ collection: 'publish-events', id: row!.id, data: { attempts: MAX_ATTEMPTS - 1 }, overrideAccess: true })
    const alert = vi.fn(async () => {})
    const result = await processOutbox(
      payload,
      deps({ revalidate: async () => Promise.reject(new Error('still down')), alert, now: () => Date.now() + 3_600_000 }),
      scopeTo(a.id),
    )
    expect(result).toEqual({ done: 0, retried: 0, failed: 1 })
    expect((await eventsFor(payload, 'articles', a.id))[0]).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS, lastError: 'still down' })
    expect(alert).toHaveBeenCalledTimes(1)
  })

  it('a row that keeps failing is retried on its own and does not hold back new rows', async () => {
    const poison = await story({ tag: 'outbox-poison', rubric: rubricId, authors: [authorId] })
    const [bad] = await eventsFor(payload, 'articles', poison.id)
    await payload.update({ collection: 'publish-events', id: bad!.id, data: { attempts: 1 }, overrideAccess: true })
    const fine = await story({ tag: 'outbox-fine', rubric: rubricId, authors: [authorId] })
    const refusesPoison = vi.fn(async (t: { expire: string[] }) => {
      if (t.expire.includes(TAG.article(poison.id))) throw new Error('refused')
    })
    // Only these two stories' rows: an author or term of another file may share a docId.
    const scope: Where = { and: [{ collection: { equals: 'articles' } }, { docId: { in: [String(poison.id), String(fine.id)] } }] }
    const result = await processOutbox(payload, deps({ revalidate: refusesPoison as never, now: () => Date.now() + 60_000 }), scope)
    expect(result).toEqual({ done: 1, retried: 1, failed: 0 })
    expect((await eventsFor(payload, 'articles', fine.id))[0]).toMatchObject({ status: 'done' })
    expect((await eventsFor(payload, 'articles', poison.id))[0]).toMatchObject({ status: 'pending', attempts: 2, lastError: 'refused' })
  })

  it('a row with malformed targets fails at once, without holding up the others', async () => {
    const bad = await payload.create({
      collection: 'publish-events',
      data: { at: new Date().toISOString(), collection: 'articles', docId: 'malformed-1', kind: 'publish_change', targets: { tags: 'articles' }, status: 'pending' },
      context: AS_IMPORT, overrideAccess: true,
    })
    const alert = vi.fn(async () => {})
    await processOutbox(payload, deps({ alert }), { docId: { equals: 'malformed-1' } })
    const after = await payload.findByID({ collection: 'publish-events', id: bad.id, overrideAccess: true })
    expect(after).toMatchObject({ status: 'failed', attempts: 1 })
    expect(alert).toHaveBeenCalledTimes(1)
  })
})

describe('Cloudflare purge client', () => {
  it('without CF_API_TOKEN or CF_ZONE_ID it sends nothing and logs one line', async () => {
    const lines: string[] = []
    const fetchSpy = vi.fn()
    const r = await purge(
      { urls: ['/a'], prefixes: [], purgeEverything: false },
      { env: { ...env, cloudflareToken: '' }, fetch: fetchSpy as unknown as typeof fetch, log: { info: (m) => lines.push(m) } },
    )
    expect(r.skipped).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(lines).toEqual(['cloudflare purge skipped (CF_API_TOKEN/CF_ZONE_ID not set): 1 url(s), 0 prefix(es)'])
  })

  it('sends at most 100 URLs per request and paces the requests', async () => {
    const urls = Array.from({ length: 250 }, (_, i) => `/p/${i}`)
    const r = await purge({ ...emptyTargets(), urls }, { env, fetch: fakeFetch, sleep: async (ms) => void sleeps.push(ms) })
    expect(r).toMatchObject({ skipped: false, requests: 3, urls: 250 })
    expect(cloudflare.map((c) => (JSON.parse(String(c.init?.body)) as { files: string[] }).files.length)).toEqual([100, 100, 50])
    expect(sleeps).toEqual([URL_BATCH_GAP_MS, URL_BATCH_GAP_MS])
  })

  it('purge everything is one request and nothing else', async () => {
    await purge({ ...emptyTargets(), urls: ['/a'], purgeEverything: true }, { env, fetch: fakeFetch })
    expect(cloudflare.map((c) => JSON.parse(String(c.init?.body)))).toEqual([{ purge_everything: true }])
  })

  it('an API error fails the pass', async () => {
    const refusing = (async () => Response.json({ success: false, errors: [{ code: 1015, message: 'rate limited' }] }, { status: 429 })) as unknown as typeof fetch
    await expect(purge({ ...emptyTargets(), urls: ['/a'] }, { env, fetch: refusing })).rejects.toThrow('Cloudflare purge failed: HTTP 429 (1015 rate limited)')
  })
})

describe('warm-up', () => {
  it('requests the page with the public Host header (fetch would drop it)', async () => {
    const seen: { host?: string; url?: string }[] = []
    const server = http.createServer((req, res) => {
      seen.push({ host: req.headers.host, url: req.url })
      res.statusCode = req.url === '/missing' ? 404 : 200
      res.end('ok')
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    const { port } = server.address() as AddressInfo
    try {
      expect(await httpGetStatus(`http://127.0.0.1:${port}/tahlil/x`, 'muomalat.uz')).toBe(200)
      const results = await warmUp(['/tahlil/x', '/missing'], { env: { internalAppUrl: `http://127.0.0.1:${port}`, siteHost: 'muomalat.uz' }, gapMs: 1 })
      expect(results.filter((r) => r.round === 2).map((r) => [r.path, r.status]).sort()).toEqual([
        ['/missing', 404],
        ['/tahlil/x', 200],
      ])
      expect(seen.every((s) => s.host === 'muomalat.uz')).toBe(true)
      expect(seen).toHaveLength(5)
    } finally {
      server.close()
    }
  })
})
