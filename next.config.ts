import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // .next/standalone: server.js plus only the files it needs, for the
  // production image (docker/Dockerfile, CMS-SPEC §15).
  output: 'standalone',
  poweredByHeader: false,
  devIndicators: false,
  // The home directory holds an unrelated lockfile; pin the workspace root.
  turbopack: { root: process.cwd() },
  experimental: {
    // Every /api request passes src/proxy.ts, which buffers the body up to this
    // size and silently truncates the rest (default 10 MB). Media uploads are
    // up to 15 MB (payload.config upload.limits).
    proxyClientMaxBodySize: '16mb',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Editorial illustrations are local SVGs; CMS uploads are raster images
    // served by Payload. Any other local path is refused by the optimiser.
    localPatterns: [{ pathname: '/images/**' }, { pathname: '/api/media/file/**' }],
    dangerouslyAllowSVG: false,
  },
  // Files in /public have no content hash, so Next serves them with max-age=0
  // and every Telegram link (a fresh page load) revalidates the preloaded okina
  // patch and each illustration. Cache them for a week / a day and refresh in
  // the background; rename a file if it must change everywhere at once.
  //
  // Security headers (CMS-SPEC §12.4), chosen by host. The CSP is static, with
  // no nonces, so pages stay cacheable; Next's inline scripts and the theme
  // script need 'unsafe-inline'. The protection comes from blocking framing,
  // plugins, <base> hijacks and every third-party origin. Headers are fixed at
  // build time, so the CMS host is matched by pattern (cms.*, cms-staging.*)
  // as well as by the CMS_HOST of the build.
  async headers() {
    const dev = process.env.NODE_ENV !== 'production'
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const cmsHostname = process.env.CMS_HOST?.split(':')[0]
    const cmsHost = `(?:${cmsHostname ? `${escape(cmsHostname)}|` : ''}cms(?:-[a-z0-9-]+)?\\..+)`

    // Payload's JSON and code fields load the Monaco editor from jsDelivr
    // (@monaco-editor/loader). Allow exactly that pinned build, on the CMS
    // host only, until Monaco is served from our own origin.
    const { readFileSync } = await import('node:fs')
    let monaco = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/'
    try {
      const loader = readFileSync(`${process.cwd()}/node_modules/@monaco-editor/loader/lib/es/config/index.js`, 'utf8')
      monaco = loader.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[\w.-]+\//)?.[0] ?? monaco
    } catch {}

    // React needs eval for its debugging aids in development only.
    const scripts = `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`
    const policy = (...directives: string[]) => directives.join('; ')
    const siteCsp = policy(
      "default-src 'self'",
      scripts,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    )
    const cmsCsp = policy(
      "default-src 'self'",
      `${scripts} ${monaco}`,
      `style-src 'self' 'unsafe-inline' ${monaco}`,
      "img-src 'self' data: blob:",
      `font-src 'self' data: ${monaco}`,
      `connect-src 'self' ${monaco}`,
      "worker-src 'self' blob:",
      // Live preview frames the site as rendered on the CMS host.
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      'upgrade-insecure-requests',
    )
    const common = [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ]
    const cms = [{ type: 'host' as const, value: cmsHost }]

    return [
      {
        source: '/:path*',
        missing: cms,
        headers: [...common, { key: 'Content-Security-Policy', value: siteCsp }, { key: 'X-Frame-Options', value: 'DENY' }],
      },
      {
        source: '/:path*',
        has: cms,
        headers: [
          ...common,
          { key: 'Content-Security-Policy', value: cmsCsp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      { source: '/admin/:path*', has: cms, headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=31536000' }] },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
