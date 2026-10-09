'use server'

import { EMAIL_MAX, isBot, validate, type FormState } from '@/lib/forms'
import { FORM_LIMITS, formContext, limitForm } from '@/lib/actions/context'
import { personalData } from '@/payload/personalData'

/**
 * Weekly digest signup (CMS-SPEC §3.14, §13.1). Double opt-in: the address is
 * stored as `pending` and gets a confirmation link; it becomes a subscriber
 * only when the link is used (/dayjest/tasdiqlash). The answer is the same
 * whether the address was new, pending or already confirmed, so the form
 * never tells anyone who is subscribed.
 */
export async function subscribeDigest(_prev: FormState, formData: FormData): Promise<FormState> {
  // Spam trap filled: acknowledge silently, as the other forms do.
  if (isBot(formData)) return { status: 'success', errors: {}, values: {} }
  const state = validate(formData, [{ name: 'email', required: true, type: 'email' }])
  const email = state.values.email ?? ''
  if (email.length > EMAIL_MAX) {
    // Over the RFC 5321 limit: reject, and never echo an oversized value back.
    return { status: 'error', errors: { email: 'email' }, values: { email: email.slice(0, EMAIL_MAX) } }
  }
  if (state.status !== 'success') return state

  const ctx = await formContext()
  const limited = limitForm('digest', ctx.ip, email, FORM_LIMITS.mailIdentity)
  if (limited === 'ip') return { status: 'error', errors: {}, values: { email }, formError: 'rate' }
  // One address asked for too often: answer as usual and send nothing more.
  if (limited === 'identity') return { status: 'success', errors: {}, values: {} }

  const result = await personalData().createSubmission(
    'digest',
    { email, placement: placementOf(ctx.path) },
    { locale: ctx.locale, path: ctx.path },
  )
  if (result.ok) return { status: 'success', errors: {}, values: {} }
  if (result.reason === 'invalid') return { status: 'error', errors: { email: 'email' }, values: { email } }
  return { status: 'error', errors: {}, values: { email }, formError: 'unavailable' }
}

/** Where the signup sat: "home", "dayjest", or the section (rubric listing). */
function placementOf(path: string | null): string | null {
  if (!path) return null
  const first = path.split('/').filter(Boolean)[0]
  return first ?? 'home'
}
