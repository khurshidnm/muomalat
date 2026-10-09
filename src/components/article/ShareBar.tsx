'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { telegramShareUrl } from '@/lib/routes'

/** Telegram share (plain link, works without JS) + copy link. */
export function ShareBar({
  url,
  title,
  labels,
  className = '',
}: {
  url: string
  title: string
  /** `heading` is the visible "Ulashish" label; `share` names the group for screen readers. */
  labels: { share: string; telegram: string; copy: string; copied: string; heading?: string }
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const tg = telegramShareUrl(url, title)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2400)
  }
  return (
    <div role="group" aria-label={labels.share} className={`no-print flex flex-wrap items-center gap-2 ${className}`}>
      {labels.heading ? (
        <span aria-hidden="true" className="label-caps mr-1 text-ink-3">
          {labels.heading}
        </span>
      ) : null}
      <a
        href={tg}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center gap-1.5 rounded-[2px] bg-emerald px-2.5 text-meta font-semibold text-on-emerald hover:bg-emerald-ink sm:h-9"
      >
        <Icon name="telegram" size={16} />
        {labels.telegram}
      </a>
      <button
        type="button"
        onClick={copy}
        title={labels.copy}
        className="relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-[2px] border border-ink-3 px-2.5 text-meta font-semibold text-ink hover:border-ink sm:h-9 sm:min-w-9"
      >
        <Icon name={copied ? 'check' : 'link'} size={16} />
        <span aria-live="polite" className={copied ? '' : 'sr-only xs:not-sr-only'}>
          {copied ? labels.copied : labels.copy}
        </span>
      </button>
    </div>
  )
}
