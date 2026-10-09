import type { Metadata, Viewport } from 'next'
import { preload } from 'react-dom'
import { IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google'
import { defaultLocale, isLocale, locales, localeMeta } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { site } from '@/content/data/site'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { previewChrome } from '@/components/layout/PreviewChrome'
import '../globals.css'

// Both families cover Uzbek Latin (ʻ U+02BB, ʼ U+02BC), Uzbek Cyrillic
// (ў қ ғ ҳ) and Russian. Only the Latin roman faces are preloaded; Cyrillic
// files load on demand through unicode-range. No explicit `fallback` lists:
// with them next/font skips its metric-adjusted fallback faces ("Source Serif 4
// Fallback", size-adjust/ascent-override), which keep the swap from shifting
// layout. The system stacks live in globals.css (--font-serif, --font-sans).
const serif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal'],
  axes: ['opsz'],
  variable: '--font-source-serif',
  display: 'swap',
})

// The italic is used in a few places only (pull quotes, interview intros), so
// it is not preloaded. Its @font-face rules register under the same family
// name, so `font-style: italic` picks it up wherever it is needed.
const serifItalic = Source_Serif_4({
  subsets: ['latin'],
  style: ['italic'],
  axes: ['opsz'],
  variable: '--font-source-serif-italic',
  display: 'swap',
  preload: false,
})

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex-sans',
  display: 'swap',
})

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#10201d' },
  ],
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = pick(commonMessages, lang)
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} — ${t.taglineInline}`, template: `%s — ${site.name}` },
    description: t.description,
    applicationName: site.name,
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: { siteName: site.name, locale: localeMeta[lang].ogLocale, type: 'website' },
    twitter: { card: 'summary_large_image' },
    other: { 'telegram:channel': site.telegram.handle },
  }
}

// Runs before first paint: applies a stored theme choice. Without one, CSS
// follows prefers-color-scheme.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  // The proxy only ever routes valid editions here. Never throw from the root
  // layout: a notFound() here escapes every boundary and breaks 404 rendering.
  const lang = isLocale(raw) ? raw : defaultLocale
  const t = pick(commonMessages, lang)
  preload('/fonts/okina-sans.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  // Draft preview on the CMS host only (§5.13); undefined for every public request.
  const preview = await previewChrome(lang)

  return (
    <html lang={localeMeta[lang].htmlLang} className={`${serif.variable} ${serifItalic.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only-focusable">
          {t.skipToContent}
        </a>
        <Header locale={lang} />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {preview ? (
            <>
              {preview}
              {children}
            </>
          ) : (
            children
          )}
        </main>
        <Footer locale={lang} />
      </body>
    </html>
  )
}
