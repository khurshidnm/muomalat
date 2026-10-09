import http from 'node:http'
import https from 'node:https'

import { deliveryEnv } from './env'

/**
 * Warm-up (CMS-SPEC §8.4 step 3.1): each public page is requested from the app
 * inside the Docker network, with the public Host so the proxy routes it as
 * the site, twice and 2 s apart. After a 'max' tag invalidation the first
 * request is served stale and starts the regeneration; the second finds the
 * fresh page, so the Cloudflare purge that follows refills the edge with it.
 *
 * fetch() ignores a Host header, so this uses node:http.
 */
export type WarmResult = { path: string; round: number; status: number | 'error' }

export type WarmDeps = {
  get?: (url: string, host: string) => Promise<number>
  sleep?: (ms: number) => Promise<void>
  env?: Partial<ReturnType<typeof deliveryEnv>>
  rounds?: number
  gapMs?: number
  concurrency?: number
}

export function httpGetStatus(url: string, host: string, timeoutMs = 30_000): Promise<number> {
  const u = new URL(url)
  const lib = u.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.request(
      u,
      { method: 'GET', headers: { host, 'user-agent': 'muomalat-warmup', accept: 'text/html,*/*' }, timeout: timeoutMs },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs} ms`)))
    req.on('error', reject)
    req.end()
  })
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Warms the pages; never throws (a slow or broken page is the page's problem, not the outbox's). */
export async function warmUp(paths: string[], deps: WarmDeps = {}): Promise<WarmResult[]> {
  const env = { ...deliveryEnv(), ...deps.env }
  const get = deps.get ?? httpGetStatus
  const sleep = deps.sleep ?? defaultSleep
  const rounds = deps.rounds ?? 2
  const concurrency = Math.max(1, deps.concurrency ?? 4)
  const unique = [...new Set(paths)].filter((p) => p.startsWith('/') && !p.startsWith('//'))
  const results: WarmResult[] = []
  for (let round = 1; round <= rounds && unique.length; round++) {
    if (round > 1) await sleep(deps.gapMs ?? 2_000)
    const queue = [...unique]
    const worker = async () => {
      for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
        const status = await get(`${env.internalAppUrl}${path}`, env.siteHost).catch(() => 'error' as const)
        results.push({ path, round, status })
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker))
  }
  return results
}
