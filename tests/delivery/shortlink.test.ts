import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Article } from '@/payload-types'
import { TAG } from '@/payload/delivery/tags'
import { testPayload } from '../helpers/payload'
import { author, rubric, story } from './fixtures'

/**
 * H8 (the route half; H8 itself is end-to-end): /t/<code> answers 301 to the
 * story on the canonical host with the UTM parameters (§8.8); unknown codes,
 * malformed codes and stories that are not live get 404. unstable_cache needs
 * Next's incremental cache, so here it is a pass-through that records its tags.
 */
const cacheCalls = vi.hoisted(() => [] as { keyParts: string[]; tags?: string[] }[])
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, keyParts: string[], options: { tags?: string[] }) =>
    (...args: A) => {
      cacheCalls.push({ keyParts, tags: options.tags })
      return fn(...args)
    },
}))

const SITE = 'https://muomalat.uz'
let previousSite: string | undefined
let GET: (request: Request, ctx: { params: Promise<{ code: string }> }) => Promise<Response>
let payload: Awaited<ReturnType<typeof testPayload>>
let live: Article
let draft: Article

const hit = (code: string, query = '') => GET(new Request(`http://app:3000/t/${code}${query}`), { params: Promise.resolve({ code }) })
const utm = (content: string) => `utm_source=telegram&utm_medium=channel&utm_campaign=muomalatuz&utm_content=${content}`

beforeAll(async () => {
  previousSite = process.env.SITE_URL
  process.env.SITE_URL = SITE
  payload = await testPayload()
  GET = (await import('@/app/t/[code]/route')).GET
  const r = (await rubric('yangiliklar', 1)).id
  const by = (await author('short')).id
  live = await story({ tag: 'short-live', rubric: r, authors: [by] })
  draft = await story({ tag: 'short-draft', rubric: r, authors: [by], publish: false })
})
afterAll(async () => {
  process.env.SITE_URL = previousSite
  await (await testPayload()).destroy()
})

describe('/t/<code>', () => {
  it('301 to the uz story with the UTM parameters; Cloudflare may keep it a day', async () => {
    const res = await hit(live.shortCode!)
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(`${SITE}/yangiliklar/${live.slug}?${utm(live.shortCode!)}`)
    expect(res.headers.get('cache-control')).toContain('s-maxage=86400')
    expect(cacheCalls.at(-1)?.tags).toEqual([TAG.shortlinks])
  })

  it('?l=kr, ru and en pick the edition; anything else is uz', async () => {
    for (const l of ['kr', 'ru', 'en']) {
      expect((await hit(live.shortCode!, `?l=${l}`)).headers.get('location')).toBe(`${SITE}/${l}/yangiliklar/${live.slug}?${utm(live.shortCode!)}`)
    }
    expect((await hit(live.shortCode!, '?l=uz')).headers.get('location')).toBe(`${SITE}/yangiliklar/${live.slug}?${utm(live.shortCode!)}`)
    expect((await hit(live.shortCode!, '?l=../admin')).headers.get('location')).toBe(`${SITE}/yangiliklar/${live.slug}?${utm(live.shortCode!)}`)
  })

  it('a code typed in capitals still resolves', async () => {
    expect((await hit(live.shortCode!.toUpperCase())).status).toBe(301)
  })

  it('utm_content is the channel post id once the bot has sent the post', async () => {
    await payload.create({
      collection: 'telegram-posts',
      data: { article: live.id, kind: 'article', status: 'sent', messageId: '4321', sentAt: new Date().toISOString() },
      overrideAccess: true,
    })
    expect((await hit(live.shortCode!)).headers.get('location')).toBe(`${SITE}/yangiliklar/${live.slug}?${utm('4321')}`)
  })

  it('unknown and malformed codes → 404, not cached', async () => {
    for (const code of ['zzzzzz', 'abc', 'iiiiii', 'abcdef1', '../../x']) {
      const res = await hit(code)
      expect(res.status).toBe(404)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
  })

  it('a story that is not live → 404', async () => {
    expect(draft.shortCode).toMatch(/^[0-9a-z]{6}$/)
    expect((await hit(draft.shortCode!)).status).toBe(404)
  })
})
