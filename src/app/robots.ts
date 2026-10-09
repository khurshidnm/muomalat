import type { MetadataRoute } from 'next'
import { site } from '@/content/data/site'
import { absoluteUrl } from '@/lib/routes'

/**
 * /robots.txt — everything is crawlable. Search results (/qidiruv in every
 * edition) are kept out of the index by their own <meta name="robots"
 * content="noindex, follow">, not by a Disallow: a crawler only sees that
 * meta when it may fetch the page, and a blocked URL linked from outside
 * (Telegram shares, the WebSite SearchAction template) could still be
 * indexed without content ("Indexed, though blocked by robots.txt").
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: new URL(site.url).origin,
  }
}
