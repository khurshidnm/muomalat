'use client'

import { useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

/**
 * The edit-view half of the embargo display (CMS-SPEC §5.10): a red banner
 * next to the document controls while the embargo is active, and the browser
 * tab title prefixed with "EMBARGO · ". A virtual field cannot be
 * `useAsTitle`, and `useAsTitle` never sets the tab title (PHASE0 item 11),
 * so the prefix is set here in an effect and removed when the embargo ends or
 * the editor leaves the document.
 */

const PREFIX = 'EMBARGO · '
const fmt = (t: number, tz: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(t)
const day = (t: number) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Tashkent' }).format(t)

export function EmbargoBanner() {
  const { until, indefinite } = useFormFields(([fields]) => ({
    until: fields['embargo.until']?.value as string | null | undefined,
    indefinite: Boolean(fields['embargo.indefinite']?.value),
  }))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const at = until ? new Date(until).getTime() : NaN
  const active = indefinite || (Number.isFinite(at) && at > now)

  useEffect(() => {
    if (!active) return
    const apply = () => {
      if (!document.title.startsWith(PREFIX)) document.title = PREFIX + document.title
    }
    apply()
    // Payload sets the title again on navigation inside the admin.
    const observer = new MutationObserver(apply)
    const head = document.querySelector('title')
    if (head) observer.observe(head, { childList: true })
    return () => {
      observer.disconnect()
      if (document.title.startsWith(PREFIX)) document.title = document.title.slice(PREFIX.length)
    }
  }, [active])

  if (!active) return null
  const text = indefinite ? 'EMBARGO (muddatsiz)' : `EMBARGO ${day(at)} ${fmt(at, 'Asia/Tashkent')} (${fmt(at, 'UTC')} UTC)`
  return (
    <div
      role="status"
      style={{ background: '#b42318', color: '#fff', borderRadius: 4, padding: '4px 10px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}
      title="Embargo amalda: chop etish, rejalashtirish va Telegram taqiqlangan."
    >
      {text}
    </div>
  )
}

export default EmbargoBanner
