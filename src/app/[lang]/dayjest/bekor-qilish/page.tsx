import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { href, paths } from '@/lib/routes'
import { unsubscribeFromDigest } from '@/lib/actions/privacy'
import { PD_PATHS, readUnsubscribeToken } from '@/payload/personalData/tokens'
import { privacyText } from '@/payload/personalData/texts'
import { TokenActionForm, TokenNotice } from '../../_personal-data/TokenActionForm'
import { TokenPage, readToken, tokenPageMetadata } from '../../_personal-data/TokenPage'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }>; searchParams: Promise<{ t?: string | string[] }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const p = privacyText(lang).pages.unsubscribe
  return tokenPageMetadata(lang, PD_PATHS.unsubscribe, p.metaTitle, p.lead)
}

/**
 * Unsubscribe link from every digest e-mail (CMS-SPEC §13.3). The token is
 * checked here without touching the database; the button's POST
 * unsubscribes. Mail clients use the one-click endpoint (./bir-bosish).
 */
export default async function UnsubscribePage({ params, searchParams }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = privacyText(locale)
  const p = t.pages.unsubscribe
  const token = readToken((await searchParams).t)
  const valid = readUnsubscribeToken(token) !== null
  return (
    <TokenPage
      locale={locale}
      kicker={t.purposes.digest.title}
      title={p.title}
      lead={valid ? p.lead : undefined}
      backHref={href(locale, paths.digest())}
      backLabel={t.pages.common.digestLink}
    >
      {valid ? (
        <TokenActionForm
          action={unsubscribeFromDigest}
          token={token}
          text={{ button: p.button, sending: t.pages.common.sending, done: p.done, invalid: p.invalid, busy: t.pages.common.busy }}
        />
      ) : (
        <TokenNotice text={p.invalid} />
      )}
    </TokenPage>
  )
}
