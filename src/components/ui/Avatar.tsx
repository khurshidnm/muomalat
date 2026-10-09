/**
 * Byline avatar: initials set in serif on a paper tint. `commercial` bylines
 * (partner content) get the brass SponsoredLabel diamond instead, so they never
 * look like a journalist's.
 */
export function Avatar({
  name,
  size = 32,
  commercial = false,
  className = '',
}: {
  name: string
  size?: number
  commercial?: boolean
  className?: string
}) {
  if (commercial) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-brass bg-brass-wash ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="rotate-45 bg-brass" style={{ width: Math.round(size * 0.28), height: Math.round(size * 0.28) }} />
      </span>
    )
  }
  const initials = name
    .replace(/[«»"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase())
    .join('')
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-rule bg-paper-2 font-serif font-semibold text-ink-2 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials}
    </span>
  )
}
