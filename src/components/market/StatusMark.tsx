import type { LicenceStatus } from '@/content/types'

/** Licence statuses in the order a licence progresses, most advanced first. */
export const STATUS_ORDER: LicenceStatus[] = ['granted', 'review', 'applied', 'announced']

export const STATUS_RANK: Record<LicenceStatus, number> = { granted: 0, review: 1, applied: 2, announced: 3 }

const TONE: Record<LicenceStatus, string> = {
  granted: 'text-emerald',
  review: 'text-emerald',
  applied: 'text-ink-2',
  announced: 'text-ink-3',
}

/**
 * Data mark for a licence status. Shape and fill carry the meaning so it
 * never depends on colour: filled diamond = licensed, half-filled diamond =
 * under review, ring = applied, dashed ring = announced. Always shown next to
 * the status label (or a legend), so it is hidden from assistive tech.
 */
export function StatusMark({ status, size = 12, className = '' }: { status: LicenceStatus; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
      data-status={status}
      className={`shrink-0 ${TONE[status]} ${className}`}
    >
      {status === 'granted' ? <path d="M6 .7 11.3 6 6 11.3.7 6Z" fill="currentColor" /> : null}
      {status === 'review' ? (
        <>
          <path d="M6 1.3 10.7 6 6 10.7 1.3 6Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6 1.3 1.3 6 6 10.7Z" fill="currentColor" />
        </>
      ) : null}
      {status === 'applied' ? <circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {status === 'announced' ? (
        <circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.69 1.69" />
      ) : null}
    </svg>
  )
}
