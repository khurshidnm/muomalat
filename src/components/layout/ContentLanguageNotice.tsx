'use client'

import { usePathname } from 'next/navigation'
import { splitLocale } from '@/i18n/config'

/**
 * "Most stories are in Uzbek" strip for the ru/en editions. Hidden on the
 * stories that are translated into the page language, where it would be noise.
 */
export function ContentLanguageNotice({ text, hideOn }: { text: string; hideOn: string[] }) {
  const { path } = splitLocale(usePathname() ?? '/')
  if (hideOn.includes(path)) return null
  return (
    <p className="border-b border-rule bg-paper-2">
      <span className="wrap block py-2 text-meta text-ink-2">{text}</span>
    </p>
  )
}
