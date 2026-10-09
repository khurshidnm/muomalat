import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // The home directory holds an unrelated lockfile; pin the workspace root.
  turbopack: { root: process.cwd() },
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
  async headers() {
    return [
      { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=31536000' }] },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
