'use server'

import { clampValues, isBot, oneOf, validate, type FieldRule } from '@/lib/forms'
import { AD_BUDGETS, AD_FORMATS, AD_MESSAGE_MAX } from '@/components/pages/advertise/options'
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_TOPICS,
  URL_MAX,
  type ContactFieldError,
  type ContactFormState,
} from '@/components/pages/contact/options'

/**
 * Endpoints for the /reklama enquiry form and the /aloqa contact form.
 * Placeholder: they validate and acknowledge but do not store or send
 * anything. Wire to the commercial and newsroom inboxes / CRM when available.
 */

/** Lenient article-link check: http(s), a dotted host; "muomalat.uz/..." without a scheme is accepted. */
function isUrl(value: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

function run(
  prev: ContactFormState | undefined,
  formData: FormData,
  rules: FieldRule[],
  limits: Record<string, number>,
  check: (values: Record<string, string>, errors: Record<string, ContactFieldError>) => void,
): ContactFormState {
  const n = (prev?.n ?? 0) + 1
  if (isBot(formData)) return { status: 'success', errors: {}, values: {}, n }
  const base = validate(formData, rules)
  const errors: Record<string, ContactFieldError> = { ...base.errors }
  const values = clampValues(base.values, limits)
  check(values, errors)
  if (Object.keys(errors).length) return { status: 'error', errors, values, n }
  return { status: 'success', errors: {}, values: {}, n }
}

/** Advertiser enquiry from /reklama. */
export async function sendAdvertisingEnquiry(prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const state = run(
    prev,
    formData,
    [
      { name: 'name', required: true },
      { name: 'company', required: true },
      { name: 'email', required: true, type: 'email' },
      { name: 'phone', required: true, type: 'phone' },
      { name: 'format' },
      { name: 'budget' },
      { name: 'message', required: true },
      { name: 'consent', type: 'consent' },
    ],
    { message: AD_MESSAGE_MAX },
    (values, errors) => {
      // Selects must hold one of the published options; budget may stay empty.
      if (!oneOf(AD_FORMATS, values.format)) errors.format = 'choose'
      if (values.budget && !oneOf(AD_BUDGETS, values.budget)) errors.budget = 'choose'
    },
  )
  // TODO(backend): forward successful enquiries to the commercial team (CRM + reklama@ inbox).
  return state
}

/** General message from /aloqa: newsroom tip, correction request, advertising, club, other. */
export async function sendContactMessage(prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const state = run(
    prev,
    formData,
    [
      { name: 'topic' },
      { name: 'name', required: true },
      { name: 'email', required: true, type: 'email' },
      { name: 'url' },
      { name: 'message', required: true },
      { name: 'consent', type: 'consent' },
    ],
    { message: CONTACT_MESSAGE_MAX, url: URL_MAX },
    (values, errors) => {
      if (!oneOf(CONTACT_TOPICS, values.topic)) errors.topic = 'choose'
      if (values.url && !isUrl(values.url)) errors.url = 'url'
    },
  )
  // TODO(backend): route by topic — tahririyat/tuzatish → newsroom desk, reklama → commercial team, klub → events desk.
  return state
}
