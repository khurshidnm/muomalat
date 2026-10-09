'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

/**
 * Full-screen menu built on <dialog>: native focus trapping, Esc to close,
 * and the page behind becomes inert. Closes on navigation.
 */
export function MobileMenu({
  openLabel,
  closeLabel,
  title,
  children,
}: {
  openLabel: string
  closeLabel: string
  title: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    ref.current?.close()
  }, [pathname])

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-[2px] text-ink hover:bg-paper-2"
      >
        <Icon name="menu" size={22} />
        <span className="sr-only">{openLabel}</span>
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-ink/40 open:flex open:flex-col"
        onClick={(e) => {
          const t = e.target as HTMLElement
          if (t === ref.current || t.closest('a')) ref.current?.close()
        }}
      >
        <div className="wrap flex h-14 shrink-0 items-center justify-between border-b border-rule">
          <span className="label-caps text-ink-3">{title}</span>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="inline-flex size-11 items-center justify-center rounded-[2px] hover:bg-paper-2"
          >
            <Icon name="close" size={22} />
            <span className="sr-only">{closeLabel}</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </dialog>
    </>
  )
}
