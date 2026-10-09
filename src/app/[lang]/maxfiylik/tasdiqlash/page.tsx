import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { href } from '@/lib/routes'
import { confirmRightsRequest } from '@/lib/actions/privacy'
import { personalData } from '@/payload/personalData'
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
  const p = privacyText(lang).pages.rightsConfirm
  return tokenPageMetadata(lang, PD_PATHS.rightsConfirm, p.metaTitle, p.metaTitle)
}

/**
 * Verification of a rights request (CMS-SPEC §13.3): the e-mailed link lands
 * here, the page says what will be registered (address masked), and the
 * POST enters it in the requests register.
 */
export default async function ConfirmRightsPage({ params, searchParams }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const locale: Locale = lang
  const t = privacyText(locale)
  const p = t.pages.rightsConfirm
  const token = readToken((await searchParams).t)
  const claim = token ? personalData().peekRightsRequest(token) : null
  return (
    <TokenPage
      locale={locale}
      kicker={t.pages.privacy.kicker}
      title={p.title}
      lead={claim ? p.lead(t.rightsKinds[claim.kind], claim.maskedEmail) : undefined}
      backHref={href(locale, PD_PATHS.privacy)}
      backLabel={t.pages.privacy.title}
    >
      {claim ? (
        <TokenActionForm
          action={confirmRightsRequest}
          token={token}
          text={{ button: p.button, sending: t.pages.common.sending, done: p.done, already: p.already, invalid: p.invalid, busy: t.pages.common.busy }}
        />
      ) : (
        <TokenNotice text={p.invalid} />
      )}
    </TokenPage>
  )
}
