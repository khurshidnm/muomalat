'use server'

import { EMAIL_MAX, isBot, validate, type FieldError } from '@/lib/forms'
import { FORM_LIMITS, formContext, limitForm, limitToken } from '@/lib/actions/context'
import { isRightsKind, personalData } from '@/payload/personalData'

/**
 * Personal-data links and the rights-request form (CMS-SPEC §13.1, §13.3).
 * Every link carries a token; the pages only show a button, and these actions
 * act on the POST, so a mail scanner that opens links cannot confirm or
 * unsubscribe anybody.
 */

export type TokenActionState = { status: 'idle' | 'done' | 'already' | 'invalid' | 'busy'; n: number }

const token = (formData: FormData) => {
  const t = formData.get('t')
  return typeof t === 'string' ? t.slice(0, 1024) : ''
}

async function guarded(prev: TokenActionState, name: string, run: () => Promise<TokenActionState['status']>): Promise<TokenActionState> {
  const n = (prev?.n ?? 0) + 1
  const { ip } = await formContext()
  if (!limitToken(name, ip)) return { status: 'busy', n }
  return { status: await run(), n }
}

/** Digest double opt-in: the confirmation link's button (/dayjest/tasdiqlash). */
export async function confirmSubscription(prev: TokenActionState, formData: FormData): Promise<TokenActionState> {
  return guarded(prev, 'digest-confirm', async () => {
    const outcome = await personalData().confirmDigest(token(formData))
    return outcome === 'confirmed' ? 'done' : outcome === 'invalid' ? 'invalid' : 'busy'
  })
}

/** The unsubscribe link in every digest e-mail (/dayjest/bekor-qilish). */
export async function unsubscribeFromDigest(prev: TokenActionState, formData: FormData): Promise<TokenActionState> {
  return guarded(prev, 'digest-unsubscribe', async () => {
    const outcome = await personalData().unsubscribeDigest(token(formData))
    return outcome === 'unsubscribed' ? 'done' : outcome === 'invalid' ? 'invalid' : 'busy'
  })
}

/** The verification link of a rights request (/maxfiylik/tasdiqlash): registers it. */
export async function confirmRightsRequest(prev: TokenActionState, formData: FormData): Promise<TokenActionState> {
  return guarded(prev, 'rights-confirm', async () => {
    const outcome = await personalData().confirmRightsRequest(token(formData))
    return outcome === 'registered' ? 'done' : outcome === 'unavailable' ? 'busy' : outcome
  })
}

export type RightsFormState = {
  status: 'idle' | 'success' | 'error'
  errors: Record<string, FieldError | 'choose'>
  values: Record<string, string>
  formError?: 'rate' | 'unavailable'
  n: number
}

/** The rights-request form on /maxfiylik#sorov: e-mails a verification link, stores nothing yet. */
export async function requestDataRights(prev: RightsFormState, formData: FormData): Promise<RightsFormState> {
  const n = (prev?.n ?? 0) + 1
  if (isBot(formData)) return { status: 'success', errors: {}, values: {}, n }
  const base = validate(formData, [
    { name: 'email', required: true, type: 'email' },
    { name: 'kind', required: true },
  ])
  const errors: RightsFormState['errors'] = { ...base.errors }
  const values = { email: base.values.email.slice(0, EMAIL_MAX), kind: base.values.kind.slice(0, 20) }
  if (!errors.email && base.values.email.length > EMAIL_MAX) errors.email = 'email'
  if (!isRightsKind(values.kind)) errors.kind = 'choose'
  if (Object.keys(errors).length) return { status: 'error', errors, values, n }

  const ctx = await formContext()
  if (limitForm('rights', ctx.ip, values.email, FORM_LIMITS.mailIdentity)) return { status: 'error', errors: {}, values, n, formError: 'rate' }
  const result = await personalData().requestRights(
    { email: values.email, kind: values.kind as 'delete' | 'suspend' | 'access' },
    { locale: ctx.locale, path: ctx.path },
  )
  if (result.ok) return { status: 'success', errors: {}, values: {}, n }
  if (result.reason === 'invalid') return { status: 'error', errors: { [result.field]: result.field === 'email' ? 'email' : 'choose' }, values, n }
  return { status: 'error', errors: {}, values, n, formError: 'unavailable' }
}
