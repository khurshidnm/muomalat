import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { href, paths } from '@/lib/routes'
import { confirmSubscription } from '@/lib/actions/privacy'
import { PD_PATHS } from '@/payload/personalData/tokens'
import { privacyText } from '@/payload/personalData/texts'
import { TokenActionForm, TokenNotice } from '../../_personal-data/TokenActionForm'
import { TokenPage, readToken, tokenPageMetadata } from '../../_personal-data/TokenPage'

// Only the four editions from the layout exist; anything else is a 404.
export const dynamicParams = false

type Params = { params: Promise<{ lang: string }>; searchParams: Promise<{ t?: string | string[] }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const p = privacyText(lang).pages.digestConfirm
  return tokenPageMetadata(lang, PD_PATHS.digestConfirm, p.metaTitle, p.lead)
}

/**
 * Digest double opt-in (CMS-SPEC §13.1, test L3): the link in the
 * confirmation e-mail lands here; the subscription is confirmed by the POST.
 */
export default async function ConfirmSubscriptionPage({ params, searchParams }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = privacyText(locale)
  const p = t.pages.digestConfirm
  const token = readToken((await searchParams).t)
  return (
    <TokenPage
      locale={locale}
      kicker={t.purposes.digest.title}
      title={p.title}
      lead={token ? p.lead : undefined}
      backHref={href(locale, paths.digest())}
      backLabel={t.pages.common.digestLink}
    >
      {token ? (
        <TokenActionForm
          action={confirmSubscription}
          token={token}
          text={{ button: p.button, sending: t.pages.common.sending, done: p.done, invalid: p.invalid, busy: t.pages.common.busy }}
        />
      ) : (
        <TokenNotice text={p.invalid} />
      )}
    </TokenPage>
  )
}
