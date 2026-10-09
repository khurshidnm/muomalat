/**
 * App-level rate limiting. Muomalat launches on the Cloudflare Free plan, which
 * allows a single path-only rate-limit rule, so login, the public forms and
 * search are limited here (CMS-SPEC §12.3).
 *
 * Fixed window, in memory. That is enough for one app process on one VPS; a
 * restart clears the counters, which errs on the side of letting people in.
 * If the app ever runs as several processes, move the store to Postgres.
 * Counters are never written anywhere, so no IP address is stored (§3.14).
 *
 * The store lives on globalThis: the dev server reloads modules on every
 * change, and Payload hooks, server actions and src/proxy.ts may each load
 * their own copy of this module. Callers namespace their keys
 * (`login:ip:…`, `proxy:login:ip:…`), so sharing one map never mixes counts.
 */
type Bucket = { count: number; resetAt: number }
type Store = { buckets: Map<string, Bucket>; lastSweep: number }

const STORE = Symbol.for('muomalat.rateLimit')
const store: Store = ((globalThis as Record<symbol, Store | undefined>)[STORE] ??= { buckets: new Map(), lastSweep: 0 })

export type LimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number }

/**
 * Count one hit for `key` and say whether it is within `max` per `windowMs`.
 * Keys are namespaced by the caller, e.g. `login:ip:203.0.113.5`.
 */
export function hit(key: string, max: number, windowMs: number, now = Date.now()): LimitResult {
  sweep(now)
  let bucket = store.buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    store.buckets.set(key, bucket)
  }
  bucket.count += 1
  const ok = bucket.count <= max
  return { ok, remaining: Math.max(0, max - bucket.count), retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000) }
}

/**
 * Take back one hit, e.g. a login that turned out to be correct: the login
 * limit then counts failed attempts only, while still refusing an attempt
 * before its password is checked.
 */
export function refund(key: string, now = Date.now()) {
  const bucket = store.buckets.get(key)
  if (bucket && bucket.resetAt > now && bucket.count > 0) bucket.count -= 1
}

/** Forget a key, e.g. after a successful login. */
export function reset(key: string) {
  store.buckets.delete(key)
}

/**
 * The visitor's address. Behind Cloudflare Tunnel every request carries
 * cf-connecting-ip; locally there is none and requests share one bucket.
 * Never trust x-forwarded-for from the open internet: the origin is reachable
 * only through the tunnel, so cf-connecting-ip is set by Cloudflare.
 */
export function clientIp(headers: Headers): string {
  return headers.get('cf-connecting-ip')?.trim() || 'local'
}

function sweep(now: number) {
  if (now - store.lastSweep < 60_000) return
  store.lastSweep = now
  for (const [key, bucket] of store.buckets) if (bucket.resetAt <= now) store.buckets.delete(key)
}
