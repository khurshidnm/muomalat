'use server'

import { EMAIL_MAX, clampValues, isBot, oneOf, validate, type FieldError, type FormState } from '@/lib/forms'
import { CLUB_INTERESTS, CLUB_MESSAGE_MAX, CLUB_SECTORS, CLUB_SIZES } from '@/components/club/options'

/**
 * Club form state: the shared FormState plus a submission counter the client
 * uses to remount the fields with the echoed values after each attempt.
 */
export type ClubFormState = FormState & { n?: number }

/**
 * Membership application + next-meeting sign-up. Placeholder endpoint: it
 * validates and acknowledges but does not store or send anything.
 */
export async function applyToClub(prev: ClubFormState, formData: FormData): Promise<ClubFormState> {
  const n = (prev?.n ?? 0) + 1
  if (isBot(formData)) return { status: 'success', errors: {}, values: {}, n }
  const state = validate(formData, [
    { name: 'name', required: true },
    { name: 'company', required: true },
    { name: 'sector', required: true },
    { name: 'size', required: true },
    { name: 'phone', required: true, type: 'phone' },
    { name: 'email', type: 'email' },
    { name: 'message' },
    { name: 'attend' },
    { name: 'consent', type: 'consent' },
  ])
  const errors: Record<string, FieldError> = { ...state.errors }
  if (!errors.email && state.values.email.length > EMAIL_MAX) errors.email = 'email'
  // Every echoed field is bounded: one-line fields at FIELD_MAX, e-mail and message at their own limits.
  const values = clampValues(state.values, { email: EMAIL_MAX, message: CLUB_MESSAGE_MAX })

  // Selects must hold one of the published options.
  if (!errors.sector && !oneOf(CLUB_SECTORS, values.sector)) errors.sector = 'required'
  if (!errors.size && !oneOf(CLUB_SIZES, values.size)) errors.size = 'required'

  // Checkbox group: keep known values only, at least one.
  const interests = [...new Set(formData.getAll('interest'))].filter(
    (v): v is string => typeof v === 'string' && oneOf(CLUB_INTERESTS, v),
  )
  values.interest = interests.join(',')
  if (!interests.length) errors.interest = 'required'

  if (Object.keys(errors).length) return { status: 'error', errors, values, n }

  // TODO(backend): send to the events desk CRM and e-mail a confirmation.
  return { status: 'success', errors: {}, values: {}, n }
}
