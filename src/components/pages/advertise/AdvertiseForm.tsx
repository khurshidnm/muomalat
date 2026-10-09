'use client'

import { useActionState, useEffect, useRef } from 'react'
import { sendAdvertisingEnquiry } from '@/lib/actions/contact'
import { Checkbox, Field, FormStatus, Select, TextArea, TextInput } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { FIELD_MAX, initialContactState, type ContactFieldError } from '@/components/pages/contact/options'
import { AD_BUDGETS, AD_FORMATS, AD_MESSAGE_MAX, type AdBudget, type AdFormatOption } from './options'

export interface AdvertiseFormText {
  name: string
  company: string
  email: string
  emailPlaceholder: string
  phone: string
  phonePlaceholder: string
  formatLabel: string
  formatPrompt: string
  formats: Record<AdFormatOption, string>
  budgetLabel: string
  budgetPrompt: string
  budgets: Record<AdBudget, string>
  messageLabel: string
  messageHint: string
  consent: string
  optional: string
  honeypot: string
  submit: string
  sending: string
  success: string
  errorSummary: string
  demoNote: string
  errors: Record<ContactFieldError, string>
}

/**
 * Advertiser enquiry for /reklama. Server action + useActionState: works as a
 * plain POST before hydration. Fields remount after each attempt (key =
 * submission count) so the echoed values become their defaults.
 */
export function AdvertiseForm({ text, idPrefix = 'reklama' }: { text: AdvertiseFormText; idPrefix?: string }) {
  const [state, action, pending] = useActionState(sendAdvertisingEnquiry, initialContactState)
  const formRef = useRef<HTMLFormElement>(null)
  const v = state.values
  const id = (name: string) => `${idPrefix}-${name}`
  const err = (name: string) => {
    const code = state.errors[name]
    return code ? text.errors[code] : undefined
  }

  // After a failed attempt, move focus to the first invalid field.
  useEffect(() => {
    if (state.status === 'error') formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [state])

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        // Keep focus on the aria-disabled button; ignore repeat submits while sending.
        if (pending) e.preventDefault()
      }}
    >
      <div key={state.n} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={id('name')} label={text.name} error={err('name')}>
            <TextInput id={id('name')} name="name" required autoComplete="name" maxLength={FIELD_MAX} defaultValue={v.name} error={err('name')} />
          </Field>
          <Field id={id('company')} label={text.company} error={err('company')}>
            <TextInput
              id={id('company')}
              name="company"
              required
              autoComplete="organization"
              maxLength={FIELD_MAX}
              defaultValue={v.company}
              error={err('company')}
            />
          </Field>
          <Field id={id('email')} label={text.email} error={err('email')}>
            <TextInput
              id={id('email')}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              maxLength={FIELD_MAX}
              placeholder={text.emailPlaceholder}
              defaultValue={v.email}
              error={err('email')}
            />
          </Field>
          <Field id={id('phone')} label={text.phone} error={err('phone')}>
            <TextInput
              id={id('phone')}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              maxLength={32}
              placeholder={text.phonePlaceholder}
              defaultValue={v.phone}
              error={err('phone')}
            />
          </Field>
          <Field id={id('format')} label={text.formatLabel} error={err('format')}>
            <Select id={id('format')} name="format" required defaultValue={v.format ?? ''} error={err('format')}>
              <option value="">{text.formatPrompt}</option>
              {AD_FORMATS.map((key) => (
                <option key={key} value={key}>
                  {text.formats[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={id('budget')} label={text.budgetLabel} error={err('budget')} optionalLabel={text.optional}>
            <Select id={id('budget')} name="budget" defaultValue={v.budget ?? ''} error={err('budget')}>
              <option value="">{text.budgetPrompt}</option>
              {AD_BUDGETS.map((key) => (
                <option key={key} value={key}>
                  {text.budgets[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field id={id('message')} label={text.messageLabel} hint={text.messageHint} error={err('message')}>
          <TextArea
            id={id('message')}
            name="message"
            required
            rows={5}
            maxLength={AD_MESSAGE_MAX}
            defaultValue={v.message}
            hint={text.messageHint}
            error={err('message')}
          />
        </Field>

        <div hidden>
          <label htmlFor={id('website')}>{text.honeypot}</label>
          <input id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        <Checkbox id={id('consent')} name="consent" required label={text.consent} defaultChecked={v.consent === 'on'} error={err('consent')} />
      </div>

      <FormStatus status={state.status} success={text.success} errorSummary={text.errorSummary} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Button type="submit" size="lg" aria-disabled={pending || undefined} className="w-full sm:w-auto">
          {pending ? text.sending : text.submit}
        </Button>
        <p className="flex items-start gap-1.5 text-meta text-ink-3">
          <Icon name="info" size={16} className="mt-px shrink-0" />
          {text.demoNote}
        </p>
      </div>
    </form>
  )
}
