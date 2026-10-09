'use server'

import { EMAIL_MAX, isBot, validate, type FormState } from '@/lib/forms'

/**
 * Form endpoints. Placeholder: they validate and acknowledge but do not store
 * or send anything. Wire to the e-mail provider / CRM when available.
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
  if (state.status === 'success') {
    // TODO(backend): add to the weekly digest list (double opt-in).
    return { ...state, values: {} }
  }
  return state
}
