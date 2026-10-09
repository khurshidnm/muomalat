import type { LivePreviewConfig } from 'payload'

const cmsUrl = process.env.CMS_URL || 'http://cms.localhost:3000'

/**
 * Live preview of a draft (CMS-SPEC §5.13): the cms-host /preview route checks
 * the session and read access, turns on draft mode and redirects to the page
 * in the chosen locale. Nothing is shown before the first save (no id yet).
 */
export function livePreviewFor(collection: string): LivePreviewConfig {
  return {
    url: ({ data, locale }) =>
      data?.id ? `${cmsUrl}/preview?c=${collection}&id=${encodeURIComponent(String(data.id))}&l=${locale.code}` : undefined,
    breakpoints: [
      { name: 'phone', label: 'Telefon', width: 360, height: 780 },
      { name: 'tablet', label: 'Planshet', width: 768, height: 1024 },
      { name: 'desktop', label: 'Kompyuter', width: 1280, height: 800 },
    ],
  }
}
