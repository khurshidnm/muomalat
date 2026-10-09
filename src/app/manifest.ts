import type { MetadataRoute } from 'next'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { site } from '@/content/data/site'
import { href, paths } from '@/lib/routes'

/**
 * Web app manifest (/manifest.webmanifest). A news site, not an app shell:
 * "minimal-ui" keeps back/reload and the address for sharing when a reader
 * adds Muomalat to the home screen; browsers without it fall back to a tab.
 */
export default function manifest(): MetadataRoute.Manifest {
  const t = pick(commonMessages, 'uz')
  return {
    id: '/',
    name: `${site.name} — ${t.taglineInline}`,
    short_name: site.name,
    description: t.description,
    lang: 'uz',
    dir: 'ltr',
    start_url: href('uz', paths.home()),
    scope: '/',
    display: 'minimal-ui',
    display_override: ['minimal-ui', 'browser'],
    orientation: 'any',
    background_color: '#FAF8F3',
    theme_color: '#10201D',
    categories: ['news', 'business', 'finance'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: t.rubrics.yangiliklar.name, url: href('uz', paths.rubric('yangiliklar')) },
      { name: t.nav.lugat, url: href('uz', paths.glossary()) },
      { name: t.nav.xarita, url: href('uz', paths.market()) },
    ],
  }
}
