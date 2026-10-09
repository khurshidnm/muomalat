/**
 * Caching for the Payload adapter (CMS-SPEC §8.2, Option B): every published
 * read goes through unstable_cache with the §8.3 tags from
 * src/payload/delivery/tags.ts and a revalidate backstop.
 *
 * Outside a Next.js request (tests, scripts/parity.ts, a validator run) there
 * is no incremental cache and unstable_cache throws an invariant; the read
 * then runs uncached. Tests replace the implementation to record the keys
 * and tags of each read.
 */
import { unstable_cache } from 'next/cache'

export interface CacheOptions {
  tags: string[]
  /** Seconds; false keeps the entry until a tag is revalidated. */
  revalidate: number | false
}

export type CacheImpl = <R>(fn: () => Promise<R>, key: string[], options: CacheOptions) => Promise<R>

/** The two ways unstable_cache fails outside a Next.js server: no incremental cache, or no request storage. */
const OUTSIDE_NEXT = [/^Invariant: incrementalCache missing in unstable_cache/, /AsyncLocalStorage accessed in runtime where it is not available/]

const nextCache: CacheImpl = async (fn, key, options) => {
  let ran = false
  try {
    return await unstable_cache(
      () => {
        ran = true
        return fn()
      },
      key,
      options,
    )()
  } catch (error) {
    // Only when unstable_cache itself refused; an error thrown by `fn` goes to the caller.
    if (!ran && error instanceof Error && OUTSIDE_NEXT.some((re) => re.test(error.message))) return fn()
    throw error
  }
}

let impl: CacheImpl = nextCache

/** Tests only: record or bypass the cache. `undefined` restores unstable_cache. */
export function setCacheImpl(next: CacheImpl | undefined) {
  impl = next ?? nextCache
}

/**
 * Data revalidation backstops, in seconds. Content changes reach the cache
 * through tags at once (§8.4); these only bound the age of an entry whose
 * invalidation was lost. They match the route `revalidate` values (§8.2).
 */
export const REVALIDATE = { lists: 300, documents: 3600, vocabulary: 3600 } as const

/**
 * Thrown inside a cached function for "not found": unstable_cache stores
 * only results, so a miss is never cached and a story published a moment
 * later is found on the very next request (the short-link route does the same).
 */
export class Missing extends Error {
  constructor(what: string) {
    super(`content: ${what} not found`)
    this.name = 'Missing'
  }
}

/** One cached read. `key` must name everything the result depends on (the locale above all). */
export async function cached<R>(key: string[], options: CacheOptions, fn: () => Promise<R>): Promise<R> {
  return impl(fn, ['content', ...key], options)
}

/** cached() for a single document: a Missing thrown by `fn` comes back as undefined, uncached. */
export async function cachedOrMissing<R>(key: string[], options: CacheOptions, fn: () => Promise<R>): Promise<R | undefined> {
  try {
    return await cached(key, options, fn)
  } catch (error) {
    if (error instanceof Missing || (error instanceof Error && error.name === 'Missing')) return undefined
    throw error
  }
}
