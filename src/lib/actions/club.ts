'use server'

import { EMAIL_MAX, clampValues, isBot, oneOf, validate, type FieldError, type FormState } from '@/lib/forms'
import { CLUB_INTERESTS, CLUB_MESSAGE_MAX, CLUB_SECTORS, CLUB_SIZES, type ClubInterest, type ClubSector, type ClubSize } from '@/components/club/options'
import { formContext, limitForm } from '@/lib/actions/context'
import { personalData } from '@/payload/personalData'

/**
 * Club form state: the shared FormState plus a submission counter the client
 * uses to remount the fields with the echoed values after each attempt.
 */
export type ClubFormState = FormState & { n?: number }

/**
 * Membership application + next-meeting sign-up (CMS-SPEC §3.14). A valid
 * application is stored in `club-applications` with its consent record and
 * acknowledged by e-mail when an address is given; commercial works it in
 * the CMS.
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

  const ctx = await formContext()
  if (limitForm('club', ctx.ip, values.email || values.phone)) return { status: 'error', errors: {}, values, n, formError: 'rate' }

  const result = await personalData().createSubmission(
    'club',
    {
      name: values.name,
      company: values.company,
      sector: values.sector as ClubSector,
      size: values.size as ClubSize,
      phone: values.phone,
      email: values.email || undefined,
      interests: interests as ClubInterest[],
      message: values.message || undefined,
      attend: values.attend === 'on',
      consent: values.consent === 'on',
    },
    { locale: ctx.locale, path: ctx.path },
  )
  if (result.ok) return { status: 'success', errors: {}, values: {}, n }
  if (result.reason === 'consent') return { status: 'error', errors: { consent: 'consent' }, values, n }
  if (result.reason === 'invalid') {
    const field = result.field === 'interests' ? 'interest' : result.field
    return { status: 'error', errors: { [field]: field === 'email' ? 'email' : 'required' }, values, n }
  }
  return { status: 'error', errors: {}, values, n, formError: 'unavailable' }
}
