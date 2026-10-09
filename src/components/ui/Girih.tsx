/**
 * The site's single ornament: an eight-point star-and-cross lattice in the
 * girih tradition, drawn as a CSS mask so it inherits theme tokens.
 * Use sparingly — section dividers, the club header, the 404 page.
 */
export function Girih({
  size = 40,
  tone = 'emerald',
  className = '',
}: {
  /** Tile size in px. */
  size?: number
  tone?: 'emerald' | 'brass'
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`girih ${tone === 'brass' ? 'girih--brass' : ''} ${className}`}
      style={{ ['--girih-size' as string]: `${size}px` }}
    />
  )
}

/** Section divider: a single row of the lattice between hairlines. */
export function GirihDivider({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`wrap ${className}`}>
      <div className="border-y border-rule py-[5px]">
        <Girih size={16} className="h-4" />
      </div>
    </div>
  )
}
