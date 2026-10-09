/**
 * Runs once when a Next.js server starts (instrumentation.ts `register`). In
 * production and staging it boots Payload at once, so the startup guard
 * (CMS-SPEC §12.1, src/payload/security/startupGuard.ts) refuses unsafe
 * settings before the first request instead of on it. Development and the
 * build start Payload lazily, as before.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.SITE_ENV !== 'production' && process.env.SITE_ENV !== 'staging') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')])
  await getPayload({ config })
}
