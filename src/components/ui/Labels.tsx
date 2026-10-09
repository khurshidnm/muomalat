/**
 * Commercial labels. Both are deliberately unlike editorial kickers:
 * sponsored content sits on brass with a frame; adverts on a neutral grey
 * that belongs to no editorial token.
 */
export function SponsoredLabel({ children, lang, className = '' }: { children: React.ReactNode; lang?: string; className?: string }) {
  return (
    <span
      lang={lang}
      className={`label-caps inline-flex items-center gap-1.5 border border-brass bg-brass-wash px-1.5 py-[3px] text-brass-ink ${className}`}
    >
      <span aria-hidden="true" className="size-1.5 rotate-45 bg-brass" />
      {children}
    </span>
  )
}

export function AdLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`label-caps inline-block bg-ink-3 px-1.5 py-[3px] tracking-[0.12em] text-paper ${className}`}>
      {children}
    </span>
  )
}
