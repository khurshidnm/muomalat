import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Lets Next's server modules run outside Next (scripts/parity.ts calls the
 * Payload content adapter from a plain Node process). Import it before
 * anything that loads `next/*`, the Payload config included: Next decides at
 * module load whether `AsyncLocalStorage` exists on globalThis, and without
 * it every request-storage call throws "AsyncLocalStorage accessed in runtime
 * where it is not available". Next's own server sets the same global.
 */
;(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage

/**
 * unstable_cache outside a request needs `globalThis.__incrementalCache`.
 * This one keeps entries in memory for the life of the process and returns
 * them through the same JSON round trip as Next's cache, so the caller sees
 * what a cached page would.
 */
export function installIncrementalCache(): void {
  const store = new Map<string, unknown>()
  ;(globalThis as { __incrementalCache?: unknown }).__incrementalCache ??= {
    isOnDemandRevalidate: false,
    generateSimpleCacheKey: async (key: string) => key,
    get: async (key: string) => (store.has(key) ? { value: store.get(key), isStale: false } : null),
    set: async (key: string, data: unknown) => void store.set(key, data),
    revalidateTag: async () => {},
  }
}
