import Link from 'next/link'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { href } from '@/lib/routes'
import { pageMetadata } from '@/lib/seo'
import { PD_PATHS } from '@/payload/personalData/tokens'
import { privacyText } from '@/payload/personalData/texts'
import { Kicker } from '@/components/ui/Kicker'
import { Icon } from '@/components/ui/Icon'

/**
 * Metadata for a page reached through a tokenised link: never indexed, and no
 * Referer leaves it, so the token cannot travel on to another page's logs.
 */
export function tokenPageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  return { ...pageMetadata({ locale, path, title, description, noindex: true }), referrer: 'no-referrer' }
}

/** The token from ?t=…; anything else is treated as a bad link. */
export function readToken(value: string | string[] | undefined): string {
  const t = Array.isArray(value) ? value[0] : value
  return typeof t === 'string' && /^[\w.-]{1,1024}$/.test(t) ? t : ''
}

/**
 * Shell of the confirm and unsubscribe pages: same header rhythm as the other
 * static pages (kicker, h1, lead), the action below, and the way back.
 */
export function TokenPage({
  locale,
  kicker,
  title,
  lead,
  backHref,
  backLabel,
  children,
}: {
  locale: Locale
  kicker: string
  title: string
  lead?: string
  backHref: string
  backLabel: string
  children: React.ReactNode
}) {
  const c = privacyText(locale).pages.common
  return (
    <div className="wrap pt-5 pb-12 md:pt-9 md:pb-16">
      <div className="max-w-[40rem]">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-2 font-display text-h1 font-semibold text-ink">{title}</h1>
        {lead ? <p className="mt-3 font-serif text-standfirst text-ink-2 md:mt-4">{lead}</p> : null}
        <div className="mt-6 md:mt-8">{children}</div>
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-1 border-t border-rule pt-4">
          <Link href={backHref} className="inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold text-emerald hover:text-emerald-ink">
            {backLabel}
            <Icon name="arrow-right" size={16} />
          </Link>
          <Link href={href(locale, PD_PATHS.privacy)} className="inline-flex min-h-11 items-center text-meta font-medium text-ink-2 underline decoration-rule-strong underline-offset-[0.2em] hover:text-ink">
            {c.privacyLink}
          </Link>
        </p>
      </div>
    </div>
  )
}
