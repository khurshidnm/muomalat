import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-sans font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60'
const variants: Record<Variant, string> = {
  primary: 'bg-emerald text-on-emerald hover:bg-emerald-ink',
  secondary: 'border border-ink text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-emerald hover:text-emerald-ink underline-offset-4 hover:underline',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-meta',
  md: 'h-11 px-4 text-ui',
  lg: 'h-12 px-5 text-ui',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${variant === 'ghost' ? '' : sizes[size]} ${extra}`
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  external,
  ...rest
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  size?: Size
  className?: string
  external?: boolean
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  const cls = buttonClass(variant, size, className)
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  )
}
