import Link from 'next/link'

/** Rubric or topic label above a headline. Emerald, uppercase, never filled. */
export function Kicker({
  children,
  href,
  tone = 'emerald',
  lang,
  className = '',
}: {
  children: React.ReactNode
  href?: string
  tone?: 'emerald' | 'ink' | 'brass'
  /** Set when the label is story text (a topical kicker) rather than an interface word. */
  lang?: string
  className?: string
}) {
  const color = tone === 'ink' ? 'text-ink-2' : tone === 'brass' ? 'text-brass-ink' : 'text-emerald'
  const cls = `label-caps inline-block ${color} ${className}`
  if (href) {
    return (
      <Link href={href} prefetch={false} lang={lang} className={`${cls} hover:underline underline-offset-2`}>
        {children}
      </Link>
    )
  }
  return (
    <span lang={lang} className={cls}>
      {children}
    </span>
  )
}
