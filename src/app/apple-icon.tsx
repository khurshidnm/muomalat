import { ImageResponse } from 'next/og'

/**
 * Home-screen icon (180×180 PNG): the favicon (src/app/icon.svg) redrawn at
 * touch-icon size — emerald ground, paper "M" monogram, brass diamond.
 * Full bleed and opaque: iOS applies its own corner mask. Image generation
 * cannot read CSS variables, so the light-theme token values are used directly.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const EMERALD = '#0F6B5C'
const PAPER = '#FAF8F3'
const BRASS = '#B0843A'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: EMERALD }}>
        <svg width={size.width} height={size.height} viewBox="0 0 64 64">
          <path d="M14 46V18h6.2l11.8 17 11.8-17H50v28h-6.6V29.4L32 45.6 20.6 29.4V46Z" fill={PAPER} />
          <path d="M32 6l4 4-4 4-4-4z" fill={BRASS} />
        </svg>
      </div>
    ),
    { ...size },
  )
}
