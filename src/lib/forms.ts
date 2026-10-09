/**
 * Shared form plumbing for server actions. Actions return error *codes*;
 * client components map them to localised messages (forms.ts messages).
 * Valid submissions are stored through src/payload/personalData; a response
 * never echoes stored data, only what the person typed after an error.
 * This module is imported by client components: keep it free of server code.
 */
export type FieldError = 'required' | 'email' | 'phone' | 'consent'

/**
 * Not about one field: too many submissions (app rate limit, CMS-SPEC §12.3)
 * or the store could not take the submission. The form shows its error
 * summary either way; components may show a specific message for these.
 */
export type FormError = 'rate' | 'unavailable'

export interface FormState {
  status: 'idle' | 'success' | 'error'
  errors: Record<string, FieldError>
  /** Echo of submitted values so fields keep their content after an error. */
  values: Record<string, string>
  formError?: FormError
}

export const initialFormState: FormState = { status: 'idle', errors: {}, values: {} }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+998[\s-]?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/

export interface FieldRule {
  name: string
  required?: boolean
  type?: 'email' | 'phone' | 'consent'
}

export function validate(formData: FormData, rules: FieldRule[]): FormState {
  const errors: Record<string, FieldError> = {}
  const values: Record<string, string> = {}
  for (const rule of rules) {
    const raw = formData.get(rule.name)
    const value = typeof raw === 'string' ? raw.trim() : ''
    values[rule.name] = value
    if (rule.type === 'consent') {
      if (value !== 'on') errors[rule.name] = 'consent'
      continue
    }
    if (!value) {
      if (rule.required) errors[rule.name] = 'required'
      continue
    }
    if (rule.type === 'email' && !EMAIL.test(value)) errors[rule.name] = 'email'
    if (rule.type === 'phone' && !PHONE.test(value.replace(/\s+/g, ' '))) errors[rule.name] = 'phone'
  }
  return { status: Object.keys(errors).length ? 'error' : 'success', errors, values }
}

/** Default cap for one-line fields (name, company, phone…), in characters. */
export const FIELD_MAX = 160
/** RFC 5321 limit for an e-mail address. */
export const EMAIL_MAX = 254

/** A select/radio value must be one of the published options. */
export const oneOf = (list: readonly string[], value: string | undefined): boolean => !!value && list.includes(value)

/**
 * Honeypot: forms render a hidden `website` field that people never see;
 * bots fill every field. Treat a filled trap as a silent success.
 */
export function isBot(formData: FormData): boolean {
  const trap = formData.get('website')
  return typeof trap === 'string' && trap.trim() !== ''
}

/** Clamp every echoed value to its limit (FIELD_MAX unless listed), so an action never echoes back an oversized body. */
export function clampValues(values: Record<string, string>, limits: Record<string, number> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(values)) out[k] = v.slice(0, limits[k] ?? FIELD_MAX)
  return out
}
