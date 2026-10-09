import Link from 'next/link'

/**
 * Interim typographic wordmark. Source Serif 4 at display optical size, tight
 * tracking, with a brass diamond standing in for the future mark.
 */
export function Wordmark({
  href,
  size = 'md',
  className = '',
  label = 'Muomalat',
}: {
  href: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}) {
  const sz = {
    sm: 'text-[1.375rem]',
    md: 'text-[1.625rem]',
    lg: 'text-[2.5rem]',
    xl: 'text-[clamp(3rem,2rem+3.5vw,4.75rem)]',
  }[size]
  return (
    <Link href={href} prefetch={false} className={`group inline-flex items-baseline leading-none ${className}`} aria-label={label}>
      <span
        className={`font-display font-semibold tracking-[-0.022em] text-ink ${sz}`}
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        Muomalat
      </span>
      <span aria-hidden="true" className="ml-[0.12em] inline-block size-[0.42em] max-h-3 max-w-3 min-h-1.5 min-w-1.5 translate-y-[-0.05em] rotate-45 bg-brass" />
    </Link>
  )
}
