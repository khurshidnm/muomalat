'use client'

import { useFormFields, useRowLabel } from '@payloadcms/ui'

import { captionHtmlProblem, captionLength, CAPTION_LIMIT, TEXT_LIMIT } from '../telegram/caption'
import { historyLabel } from '../telegram/labels'

/**
 * Under the caption of a Telegram post: the live length as Telegram counts
 * it after entity parsing (tags removed, `&lt;` `&gt;` `&amp;` `&quot;`
 * decoded, UTF-16 units: a conservative bound, CMS-SPEC §10.2, I3), against
 * 1024 with a photo and 4096 for text, and the first markup problem that
 * would make Telegram refuse the message.
 */
export function TelegramCaptionCounter({ path }: { path: string }) {
  const value = useFormFields(([fields]) => fields[path]?.value)
  const photo = useFormFields(([fields]) => fields.photo?.value)
  const kind = useFormFields(([fields]) => fields.kind?.value)
  const html = typeof value === 'string' ? value : ''
  const limit = kind === 'correction_reply' ? TEXT_LIMIT : photo || kind === 'article' ? CAPTION_LIMIT : TEXT_LIMIT
  const n = captionLength(html)
  const problem = html ? captionHtmlProblem(html) : null
  const color = n > limit || problem ? 'var(--theme-error-500)' : n > limit - 60 ? 'var(--theme-warning-600, #b45309)' : 'var(--theme-elevation-500)'
  return (
    <div style={{ fontSize: 12, color, marginTop: 4 }} aria-live="polite">
      <div style={{ textAlign: 'right' }}>
        {n} / {limit}
        {n > limit ? ' — juda uzun, Telegram qabul qilmaydi' : ''}
      </div>
      {problem ? <div>{problem}</div> : null}
    </div>
  )
}

/** A history row as «Kanalga yuborildi · 09.10.2026 14:03». */
export function TelegramHistoryLabel() {
  const { data, rowNumber } = useRowLabel<{ action?: string; at?: string }>()
  const at = data?.at ? new Date(data.at) : undefined
  const when =
    at && !Number.isNaN(at.getTime())
      ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
          .format(at)
          .replace(',', '')
          .replace(/\//g, '.')
      : ''
  return (
    <span>
      {data?.action ? historyLabel(data.action) : `Yozuv ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}
      {when ? ` · ${when}` : ''}
    </span>
  )
}

export default TelegramCaptionCounter
