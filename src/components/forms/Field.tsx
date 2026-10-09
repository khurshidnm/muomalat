'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { FormError } from '@/lib/forms'

/**
 * Form primitives with visible labels, hints and inline errors wired to
 * aria-describedby / aria-invalid. Inputs use ink-3 outlines (≥ 3:1).
 */
const control =
  'w-full rounded-[2px] border bg-paper px-3 text-ui text-ink placeholder:text-ink-3 focus:border-emerald focus:outline-2 focus:outline-offset-0 focus:outline-emerald aria-[invalid=true]:border-signal'

export function Field({
  id,
  label,
  hint,
  error,
  required,
  requiredLabel,
  optionalLabel,
  children,
  className = '',
}: {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  requiredLabel?: string
  optionalLabel?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-meta font-semibold text-ink">
        <span>{label}</span>
        {required && requiredLabel ? <span className="font-normal text-ink-3">{requiredLabel}</span> : null}
        {!required && optionalLabel ? <span className="font-normal text-ink-3">{optionalLabel}</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-meta text-ink-3">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-meta font-medium text-signal">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({
  id,
  error,
  hint,
  className = '',
  ...rest
}: React.ComponentProps<'input'> & { id: string; error?: string; hint?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={`${control} h-11 border-ink-3 ${className}`}
      {...rest}
    />
  )
}

export function TextArea({
  id,
  error,
  hint,
  className = '',
  ...rest
}: React.ComponentProps<'textarea'> & { id: string; error?: string; hint?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={`${control} min-h-32 border-ink-3 py-2.5 leading-relaxed ${className}`}
      {...rest}
    />
  )
}

export function Select({
  id,
  error,
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; error?: string }) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${control} h-11 appearance-none border-ink-3 pr-9 ${className}`}
        {...rest}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3" />
    </div>
  )
}

export function Checkbox({
  id,
  label,
  error,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: React.ReactNode; error?: string }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-emerald"
          {...rest}
        />
        <label htmlFor={id} className="text-meta leading-snug text-ink-2">
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 pl-8 text-meta font-medium text-signal">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Live region summarising the submit outcome. The region is always in the
 * accessibility tree (an empty div, no display:none), so screen readers
 * announce the message when it arrives. On success, focus moves to the message
 * (as in ClubForm), so keyboard users are not left on <body>. Pass `attempt`
 * (e.g. the action state) to refocus on repeated successes.
 */
export function FormStatus({
  status,
  success,
  errorSummary,
  attempt,
  formError,
  formErrors,
}: {
  status: string
  success: string
  errorSummary: string
  attempt?: unknown
  /** An error that is not about one field (rate limit, store unreachable): its own message, not "check the fields". */
  formError?: FormError
  formErrors?: Record<FormError, string>
}) {
  const ok = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (status === 'success') ok.current?.focus()
  }, [status, attempt])
  return (
    <div role="status" aria-live="polite" className="empty:mb-0">
      {status === 'success' ? (
        <p
          ref={ok}
          tabIndex={-1}
          className="flex items-start gap-2 border-l-2 border-emerald bg-emerald-wash px-3 py-2.5 text-meta font-medium text-emerald-ink"
        >
          {success}
        </p>
      ) : status === 'error' ? (
        <p className="border-l-2 border-signal bg-signal-wash px-3 py-2.5 text-meta font-medium text-signal">
          {(formError && formErrors?.[formError]) || errorSummary}
        </p>
      ) : null}
    </div>
  )
}
