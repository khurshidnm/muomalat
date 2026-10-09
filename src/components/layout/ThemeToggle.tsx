'use client'

import { useLayoutEffect } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * Light/dark switch. The initial theme is set before paint by the inline
 * script in the root layout; icons swap purely through CSS, so the server
 * markup never mismatches.
 *
 * The layout effect is a fallback for pages whose document is rendered on the
 * client (the 404 under app/[lang]): React never executes that inline script
 * there, so the stored choice is applied here, still before paint.
 */
export function ThemeToggle({ toDark, toLight }: { toDark: string; toLight: string }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (root.dataset.theme) return
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') root.dataset.theme = stored
    } catch {}
  }, [])

  function toggle() {
    const root = document.documentElement
    const current =
      root.dataset.theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const next = current === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle inline-flex size-8 items-center justify-center rounded-[2px] text-ink-2 hover:bg-paper-2 hover:text-ink"
    >
      <span className="when-light">
        <Icon name="moon" size={17} />
        <span className="sr-only">{toDark}</span>
      </span>
      <span className="when-dark">
        <Icon name="sun" size={17} />
        <span className="sr-only">{toLight}</span>
      </span>
    </button>
  )
}
