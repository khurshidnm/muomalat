'use client'

import { useActionState, useEffect, useRef } from 'react'
import { subscribeDigest } from '@/app/actions'
import { EMAIL_MAX, initialFormState } from '@/lib/forms'
import { Field, FormStatus, TextInput } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'

export interface DigestFormText {
  emailLabel: string
  placeholder: string
  submit: string
  sending: string
  success: string
  errorSummary: string
  errors: { required: string; email: string }
  note: string
  /** Label of the hidden spam-trap field. */
  honeypot: string
}

/**
 * E-mail signup for the weekly digest. Works without JS (plain POST). While
 * the action runs the button is aria-disabled, not disabled, so focus stays on
 * it; an invalid address moves focus to the field, success to the message.
 */
export function DigestForm({ text, idPrefix = 'digest' }: { text: DigestFormText; idPrefix?: string }) {
  const [state, action, pending] = useActionState(subscribeDigest, initialFormState)
  const input = useRef<HTMLInputElement>(null)
  const id = `${idPrefix}-email`
  const error = state.errors.email ? text.errors[state.errors.email as 'required' | 'email'] : undefined

  useEffect(() => {
    if (state.status === 'error') input.current?.focus()
  }, [state])

  return (
    <form
      action={action}
      noValidate
      className="space-y-3"
      onSubmit={(e) => {
        if (pending) e.preventDefault()
      }}
    >
      <Field id={id} label={text.emailLabel} error={error}>
        <div className="flex flex-col gap-2 xs:flex-row">
          <TextInput
            ref={input}
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={EMAIL_MAX}
            defaultValue={state.values.email}
            placeholder={text.placeholder}
            error={error}
            hint={text.note}
            className="min-w-0 xs:flex-1"
          />
          <Button type="submit" aria-disabled={pending || undefined} className="shrink-0">
            {pending ? text.sending : text.submit}
          </Button>
        </div>
      </Field>
      <div hidden>
        <label htmlFor={`${idPrefix}-website`}>{text.honeypot}</label>
        <input id={`${idPrefix}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <FormStatus status={state.status} success={text.success} errorSummary={text.errorSummary} attempt={state} />
      {/* The note doubles as the field's description (aria-describedby → `${id}-hint`). */}
      <p id={`${id}-hint`} className="text-[0.75rem] text-ink-3">
        {text.note}
      </p>
    </form>
  )
}
