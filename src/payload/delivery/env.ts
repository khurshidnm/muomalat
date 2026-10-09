/**
 * Delivery settings from the environment (CMS-SPEC §2.5), read on each call
 * so tests and the worker see the current values.
 */
export function deliveryEnv() {
  const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://muomalat.uz').replace(/\/+$/, '')
  return {
    /** Public origin: Cloudflare purge URLs and short-link targets. */
    siteUrl,
    /** Host header for the warm-up, so the proxy treats the request as the public site. */
    siteHost: process.env.SITE_HOST || new URL(siteUrl).host,
    /** The app as the worker reaches it inside the Docker network (http://app:3000). */
    internalAppUrl: (process.env.INTERNAL_APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, ''),
    revalidateSecret: process.env.INTERNAL_REVALIDATE_SECRET || '',
    cloudflareToken: process.env.CF_API_TOKEN || '',
    cloudflareZone: process.env.CF_ZONE_ID || '',
  }
}
