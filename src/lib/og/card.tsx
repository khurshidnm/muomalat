import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Open Graph card (1200×630) used for Telegram/link previews. Paper ground,
 * serif headline, emerald kicker, brass diamond. Fonts are subset TTFs with
 * Uzbek Latin/Cyrillic coverage (satori cannot read woff2).
 */
export const ogSize = { width: 1200, height: 630 }

const fontDir = join(process.cwd(), 'src/assets/fonts')
let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 600; style: 'normal' }[]> | undefined
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(fontDir, 'MuomalatCardSerif-SemiBold.ttf')).then((data) => ({ name: 'Serif', data, weight: 600 as const, style: 'normal' as const })),
    readFile(join(fontDir, 'MuomalatCardSans-Medium.ttf')).then((data) => ({ name: 'Sans', data, weight: 500 as const, style: 'normal' as const })),
    readFile(join(fontDir, 'MuomalatCardSans-SemiBold.ttf')).then((data) => ({ name: 'Sans', data, weight: 600 as const, style: 'normal' as const })),
  ])
  return fonts
}

export async function ogCard({
  kicker,
  title,
  footer,
  sponsored,
}: {
  kicker: string
  title: string
  footer: string
  /** Shows the partner-content label in brass instead of an editorial kicker. */
  sponsored?: string
}) {
  const size = title.length > 110 ? 50 : title.length > 80 ? 58 : title.length > 50 ? 66 : 76
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FAF8F3',
          color: '#10201D',
          padding: '56px 72px 0 72px',
          fontFamily: 'Sans',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'Serif', fontSize: 46, letterSpacing: -1, lineHeight: 1 }}>Muomalat</span>
            <span style={{ width: 14, height: 14, background: '#B0843A', transform: 'rotate(45deg)', marginLeft: 6, marginBottom: 8 }} />
          </div>
          {sponsored ? (
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#80601F',
                border: '2px solid #B0843A',
                background: '#F5EEDF',
                padding: '6px 12px',
              }}
            >
              {sponsored}
            </span>
          ) : (
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#0F6B5C' }}>{kicker}</span>
          )}
        </div>
        <div style={{ height: 2, background: '#10201D', marginTop: 28 }} />
        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
          <div style={{ fontFamily: 'Serif', fontSize: size, lineHeight: 1.08, letterSpacing: -0.5, display: 'flex' }}>{title}</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #DAD5C8',
            padding: '22px 0 26px 0',
            fontSize: 24,
            color: '#5A6662',
          }}
        >
          <span>{footer}</span>
          <span style={{ color: '#0F6B5C', fontWeight: 600 }}>muomalat.uz</span>
        </div>
        <div style={{ height: 14, background: '#0F6B5C', marginLeft: -72, marginRight: -72, display: 'flex' }} />
      </div>
    ),
    { ...ogSize, fonts: await loadFonts() },
  )
}
