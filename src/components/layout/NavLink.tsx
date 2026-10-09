'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { splitLocale } from '@/i18n/config'

/** Navigation link that marks itself current for its section. */
export function NavLink({
  href,
  section,
  children,
  className = '',
  activeClassName = '',
}: {
  href: string
  /** Locale-free section path, e.g. "/tahlil". */
  section: string
  children: React.ReactNode
  className?: string
  activeClassName?: string
}) {
  const { path } = splitLocale(usePathname() ?? '/')
  const current = path === section
  const active = current || path.startsWith(`${section}/`)
  // "page" only on the section front itself; inside the section (an article,
  // a term, an event) the link is the current location, not the current page.
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : active ? 'true' : undefined}
      className={`${className} ${active ? activeClassName : ''}`}
    >
      {children}
    </Link>
  )
}

/** Renders children only on the front page of any edition. */
export function HomeOnly({ children, invert = false }: { children: React.ReactNode; invert?: boolean }) {
  const { path } = splitLocale(usePathname() ?? '/')
  const isHome = path === '/'
  return isHome !== invert ? <>{children}</> : null
}
