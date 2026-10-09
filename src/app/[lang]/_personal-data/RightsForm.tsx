'use client'

import { useActionState, useEffect, useRef } from 'react'
import { requestDataRights, type RightsFormState } from '@/lib/actions/privacy'
import { EMAIL_MAX } from '@/lib/forms'
import { Field, FormStatus, Select, TextInput } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'

export interface RightsFormText {
  email: string
  emailPlaceholder: string
  kindLabel: string
  kindPrompt: string
  kinds: Record<'delete' | 'suspend' | 'access', string>
  note: string
  submit: string
  sending: string
  success: string
  errorSummary: string
  busy: string
  honeypot: string
  errors: { required: string; email: string; choose: string }
}

const initial: RightsFormState = { status: 'idle', errors: {}, values: {}, n: 0 }
const KINDS = ['delete', 'suspend', 'access'] as const

/**
 * Rights request (CMS-SPEC §13.3): e-mail and kind. The action e-mails a
 * verification link and stores nothing until it is used. Same plumbing as
 * the contact form: plain POST before hydration, fields remount with the
 * echoed values after an error, focus goes to the first invalid field.
 */
export function RightsForm({ text, idPrefix = 'sorov' }: { text: RightsFormText; idPrefix?: string }) {
  const [state, action, pending] = useActionState(requestDataRights, initial)
  const formRef = useRef<HTMLFormElement>(null)
  const v = state.values
  const id = (name: string) => `${idPrefix}-${name}`
  const err = (name: string) => {
    const code = state.errors[name]
    if (!code) return undefined
    return code === 'email' ? text.errors.email : code === 'choose' ? text.errors.choose : text.errors.required
  }

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
        if (pending) e.preventDefault()
      }}
    >
      <div key={state.n} className="space-y-5">
        <Field id={id('email')} label={text.email} hint={text.note} error={err('email')}>
          <TextInput
            id={id('email')}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={EMAIL_MAX}
            placeholder={text.emailPlaceholder}
            defaultValue={v.email}
            hint={text.note}
            error={err('email')}
          />
        </Field>
        <Field id={id('kind')} label={text.kindLabel} error={err('kind')}>
          <Select id={id('kind')} name="kind" required defaultValue={v.kind ?? ''} error={err('kind')}>
            <option value="">{text.kindPrompt}</option>
            {KINDS.map((key) => (
              <option key={key} value={key}>
                {text.kinds[key]}
              </option>
            ))}
          </Select>
        </Field>
        <div hidden>
          <label htmlFor={id('website')}>{text.honeypot}</label>
          <input id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
      </div>

      <FormStatus
        status={state.status}
        success={text.success}
        errorSummary={state.formError ? text.busy : text.errorSummary}
        attempt={state}
      />

      <Button type="submit" size="lg" aria-disabled={pending || undefined} className="w-full sm:w-auto">
        {pending ? text.sending : text.submit}
      </Button>
    </form>
  )
}
