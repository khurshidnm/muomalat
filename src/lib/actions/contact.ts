'use server'

import { clampValues, isBot, oneOf, validate, type FieldRule } from '@/lib/forms'
import { AD_BUDGETS, AD_FORMATS, AD_MESSAGE_MAX, type AdBudget, type AdFormatOption } from '@/components/pages/advertise/options'
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_TOPICS,
  URL_MAX,
  type ContactFieldError,
  type ContactFormState,
  type ContactTopic,
} from '@/components/pages/contact/options'
import { formContext, limitForm } from '@/lib/actions/context'
import { personalData, type SubmissionInput, type SubmitResult } from '@/payload/personalData'

/**
 * Endpoints for the /reklama enquiry form and the /aloqa contact form
 * (CMS-SPEC §3.14). Valid submissions are stored with their consent record:
 * enquiries in `advertising-requests` (commercial), messages in
 * `contact-messages`, where each desk sees its own topics; a `tuzatish`
 * message also opens a correction item in the requests register. The sender
 * gets a short acknowledgement by e-mail.
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

type Checked = { state: ContactFormState; values?: Record<string, string> }

function check(
  prev: ContactFormState | undefined,
  formData: FormData,
  rules: FieldRule[],
  limits: Record<string, number>,
  extra: (values: Record<string, string>, errors: Record<string, ContactFieldError>) => void,
): Checked {
  const n = (prev?.n ?? 0) + 1
  if (isBot(formData)) return { state: { status: 'success', errors: {}, values: {}, n } }
  const base = validate(formData, rules)
  const errors: Record<string, ContactFieldError> = { ...base.errors }
  const values = clampValues(base.values, limits)
  extra(values, errors)
  if (Object.keys(errors).length) return { state: { status: 'error', errors, values, n } }
  return { state: { status: 'success', errors: {}, values: {}, n }, values }
}

/** Rate limit, store, and turn the outcome into form state. Values are echoed only after a failure. */
async function submit<K extends 'contact' | 'advertising'>(
  kind: K,
  checked: Checked,
  input: (values: Record<string, string>) => SubmissionInput[K],
): Promise<ContactFormState> {
  const { state, values } = checked
  if (!values) return state
  const fail = (patch: Partial<ContactFormState>): ContactFormState => ({ ...state, status: 'error', errors: {}, values, ...patch })
  const ctx = await formContext()
  if (limitForm(kind, ctx.ip, values.email)) return fail({ formError: 'rate' })
  const result: SubmitResult = await personalData().createSubmission(kind, input(values), { locale: ctx.locale, path: ctx.path })
  if (result.ok) return state
  if (result.reason === 'consent') return fail({ errors: { consent: 'consent' } })
  if (result.reason === 'invalid') return fail({ errors: { [result.field]: result.field === 'email' ? 'email' : 'required' } })
  return fail({ formError: 'unavailable' })
}

/** Advertiser enquiry from /reklama. */
export async function sendAdvertisingEnquiry(prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const checked = check(
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
  return submit('advertising', checked, (v) => ({
    name: v.name,
    company: v.company,
    email: v.email,
    phone: v.phone,
    format: v.format as AdFormatOption,
    budget: (v.budget || undefined) as AdBudget | undefined,
    message: v.message,
    consent: v.consent === 'on',
  }))
}

/** General message from /aloqa: newsroom tip, correction request, advertising, club, other. */
export async function sendContactMessage(prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const checked = check(
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
  return submit('contact', checked, (v) => ({
    topic: v.topic as ContactTopic,
    name: v.name,
    email: v.email,
    url: v.url || undefined,
    message: v.message,
    consent: v.consent === 'on',
  }))
}
