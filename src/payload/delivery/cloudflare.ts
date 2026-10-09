import { deliveryEnv } from './env'
import type { Targets } from './tags'

/**
 * Cloudflare cache purge (CMS-SPEC §8.4 step 3.2), used by the outbox worker.
 *
 * Free plan limits, per account and shared with staging (PHASE0 item 20c):
 * - by exact URL: 800 URLs a second, at most 100 per request;
 * - by prefix, tag or host, and purge everything: 5 requests a minute with a
 *   bucket of 25, at most 100 prefixes per request.
 * Exact URLs are the default. Prefixes are used only when a story's slug or
 * rubric changed; purge everything only for settings, navigation and rubrics.
 *
 * Without CF_API_TOKEN and CF_ZONE_ID (development, tests) nothing is sent and
 * one log line says what would have been purged.
 */
export const PURGE_BATCH = 100
/** 100 URLs per request every 150 ms stays under 800 URLs a second. */
export const URL_BATCH_GAP_MS = 150
/** Five prefix requests a minute. */
export const PREFIX_BATCH_GAP_MS = 12_000

type Log = { info: (msg: string) => void }

export type PurgeDeps = {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  log?: Log
  env?: Partial<ReturnType<typeof deliveryEnv>>
}

export type PurgeResult = { skipped: boolean; requests: number; urls: number; prefixes: number; everything: boolean }

const chunks = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function purgeConfigured(env = deliveryEnv()) {
  return Boolean(env.cloudflareToken && env.cloudflareZone)
}

/** Purges the targets' URLs (absolute, under SITE_URL) and prefixes, or the whole zone. Throws on any API failure. */
export async function purge(t: Pick<Targets, 'urls' | 'prefixes' | 'purgeEverything'>, deps: PurgeDeps = {}): Promise<PurgeResult> {
  const env = { ...deliveryEnv(), ...deps.env }
  const sleep = deps.sleep ?? defaultSleep
  const doFetch = deps.fetch ?? fetch
  const origin = env.siteUrl
  const host = new URL(origin).host
  const files = [...new Set(t.urls)].map((p) => `${origin}${p}`)
  const prefixes = [...new Set(t.prefixes)].map((p) => `${host}${p}`)
  const result: PurgeResult = { skipped: false, requests: 0, urls: files.length, prefixes: prefixes.length, everything: Boolean(t.purgeEverything) }

  if (!env.cloudflareToken || !env.cloudflareZone) {
    deps.log?.info(
      `cloudflare purge skipped (CF_API_TOKEN/CF_ZONE_ID not set): ${t.purgeEverything ? 'everything' : `${files.length} url(s), ${prefixes.length} prefix(es)`}`,
    )
    return { ...result, skipped: true }
  }

  const send = async (body: Record<string, unknown>) => {
    result.requests++
    const res = await doFetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(env.cloudflareZone!)}/purge_cache`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.cloudflareToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; errors?: { code?: number; message?: string }[] }
    if (!res.ok || json.success !== true) {
      const detail = (json.errors ?? []).map((e) => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ')
      throw new Error(`Cloudflare purge failed: HTTP ${res.status}${detail ? ` (${detail})` : ''}`)
    }
  }

  if (t.purgeEverything) {
    await send({ purge_everything: true })
    return result
  }
  for (const [i, batch] of chunks(files, PURGE_BATCH).entries()) {
    if (i > 0) await sleep(URL_BATCH_GAP_MS)
    await send({ files: batch })
  }
  for (const [i, batch] of chunks(prefixes, PURGE_BATCH).entries()) {
    if (i > 0 || files.length) await sleep(i > 0 ? PREFIX_BATCH_GAP_MS : URL_BATCH_GAP_MS)
    await send({ prefixes: batch })
  }
  return result
}
