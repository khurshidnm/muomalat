'use client'

import { useActionState, useEffect, useRef } from 'react'
import { applyToClub, type ClubFormState } from '@/lib/actions/club'
import { EMAIL_MAX, FIELD_MAX, type FormError } from '@/lib/forms'
import { Checkbox, Field, Select, TextArea, TextInput } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import {
  CLUB_INTERESTS,
  CLUB_MESSAGE_MAX,
  CLUB_SECTORS,
  CLUB_SIZES,
  type ClubInterest,
  type ClubSector,
  type ClubSize,
} from './options'

/** Every string the form needs, resolved on the server for the page locale. */
export interface ClubFormText {
  required: string
  optional: string
  name: string
  company: string
  sector: string
  size: string
  choose: string
  sectors: Record<ClubSector, string>
  sizes: Record<ClubSize, string>
  phone: string
  phonePlaceholder: string
  phoneHint: string
  email: string
  emailPlaceholder: string
  interest: string
  interestHint: string
  interests: Record<ClubInterest, { label: string; hint: string }>
  message: string
  messageHint: string
  /** Sign-up line for the next meeting; omitted when none is scheduled. */
  attend?: string
  /** Label of the hidden anti-spam field (screen readers never reach it either). */
  honeypot: string
  consent: string
  submit: string
  sending: string
  success: string
  errorSummary: string
  /** Rate limit or store unreachable (lib/forms FormError). */
  formErrors: Record<FormError, string>
  errorList: string
  errors: { required: string; email: string; phone: string; consent: string; select: string; interest: string }
  /** Next to the submit button: where the privacy notice is (CMS-SPEC §13.2). */
  privacyNote: string
  privacyLink: string
  privacyHref: string
}

const initialState: ClubFormState = { status: 'idle', errors: {}, values: {}, n: 0 }

/** Order of the error summary = order of the fields on screen. */
const FIELDS = ['name', 'company', 'sector', 'size', 'phone', 'email', 'interest', 'consent'] as const
type FieldName = (typeof FIELDS)[number]

const fieldId = (f: FieldName) => (f === 'interest' ? `club-interest-${CLUB_INTERESTS[0]}` : `club-${f}`)

/**
 * Membership application. A plain POST to a server action, so it works
 * before (or without) JavaScript; with JS, useActionState keeps the page and
 * moves focus to the outcome.
 */
export function ClubForm({ text, permalink }: { text: ClubFormText; permalink: string }) {
  const [state, action, pending] = useActionState(applyToClub, initialState, permalink)
  const outcome = useRef<HTMLDivElement>(null)
  const n = state.n ?? 0

  useEffect(() => {
    if (n > 0) outcome.current?.focus()
  }, [n])

  const v = state.values
  const e = state.errors
  const error = (f: FieldName): string | undefined => {
    const code = e[f]
    if (!code) return undefined
    if (f === 'sector' || f === 'size') return text.errors.select
    if (f === 'interest') return text.errors.interest
    return text.errors[code]
  }
  const label = (f: FieldName) => (f === 'interest' ? text.interest : f === 'consent' ? text.consent : text[f])
  const invalid = FIELDS.filter((f) => e[f])
  const chosen = new Set((v.interest ?? '').split(',').filter(Boolean))
  const interestError = error('interest')

  return (
    <form
      action={action}
      noValidate
      aria-describedby="club-form-note"
      className="space-y-6"
      onSubmit={(e) => {
        // Keep focus on the aria-disabled button; ignore repeat submits while sending.
        if (pending) e.preventDefault()
      }}
    >
      {/* Outcome: one persistent live region for success and errors. */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {state.status === 'success' ? (
          <div ref={outcome} tabIndex={-1} className="flex items-start gap-2.5 border-l-2 border-emerald bg-emerald-wash px-4 py-3 text-ui font-medium text-emerald-ink">
            <Icon name="check" size={20} className="mt-px shrink-0" />
            <p>{text.success}</p>
          </div>
        ) : state.status === 'error' ? (
          <div ref={outcome} tabIndex={-1} className="border-l-2 border-signal bg-signal-wash px-4 py-3 text-meta text-signal">
            <p className="flex items-start gap-2 font-semibold">
              <Icon name="alert" size={18} className="mt-px shrink-0" />
              {(state.formError && text.formErrors[state.formError]) || text.errorSummary}
            </p>
            {invalid.length ? (
              <>
                <p className="mt-2 pl-[1.625rem] text-ink-2">{text.errorList}</p>
                <ul className="mt-1 space-y-1 pl-[1.625rem]">
                  {invalid.map((f) => (
                    <li key={f}>
                      <a href={`#${fieldId(f)}`} className="font-medium underline underline-offset-2 hover:text-ink">
                        {f === 'consent' ? text.errors.consent : label(f)}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Remount after every attempt so fields pick up the echoed values. */}
      <div key={n} className="space-y-6">
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <Field id="club-name" label={text.name} required requiredLabel={text.required} error={error('name')}>
            <TextInput
              id="club-name"
              name="name"
              autoComplete="name"
              required
              maxLength={FIELD_MAX}
              defaultValue={v.name}
              error={error('name')}
            />
          </Field>
          <Field id="club-company" label={text.company} required requiredLabel={text.required} error={error('company')}>
            <TextInput
              id="club-company"
              name="company"
              autoComplete="organization"
              required
              maxLength={FIELD_MAX}
              defaultValue={v.company}
              error={error('company')}
            />
          </Field>
          <Field id="club-sector" label={text.sector} required requiredLabel={text.required} error={error('sector')}>
            <Select id="club-sector" name="sector" required defaultValue={v.sector ?? ''} error={error('sector')}>
              <option value="">{text.choose}</option>
              {CLUB_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {text.sectors[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="club-size" label={text.size} required requiredLabel={text.required} error={error('size')}>
            <Select id="club-size" name="size" required defaultValue={v.size ?? ''} error={error('size')}>
              <option value="">{text.choose}</option>
              {CLUB_SIZES.map((s) => (
                <option key={s} value={s}>
                  {text.sizes[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="club-phone"
            label={text.phone}
            hint={text.phoneHint}
            required
            requiredLabel={text.required}
            error={error('phone')}
          >
            <TextInput
              id="club-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={FIELD_MAX}
              placeholder={text.phonePlaceholder}
              defaultValue={v.phone}
              hint={text.phoneHint}
              error={error('phone')}
              className="figures"
            />
          </Field>
          <Field id="club-email" label={text.email} optionalLabel={text.optional} error={error('email')}>
            <TextInput
              id="club-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={EMAIL_MAX}
              placeholder={text.emailPlaceholder}
              defaultValue={v.email}
              error={error('email')}
            />
          </Field>
        </div>

        <fieldset aria-describedby={interestError ? 'club-interest-error' : 'club-interest-hint'}>
          <legend className="flex w-full items-baseline justify-between gap-3 text-meta font-semibold text-ink">
            <span>{text.interest}</span>
            <span className="font-normal text-ink-3">{text.required}</span>
          </legend>
          <p id="club-interest-hint" className="mt-1 text-meta text-ink-3">
            {text.interestHint}
          </p>
          <ul className={`mt-2 grid gap-x-6 border-y py-1 sm:grid-cols-2 ${interestError ? 'border-signal' : 'border-rule'}`}>
            {CLUB_INTERESTS.map((k) => (
              <li key={k} className="py-2.5">
                <Checkbox
                  id={`club-interest-${k}`}
                  name="interest"
                  value={k}
                  defaultChecked={chosen.has(k)}
                  aria-invalid={interestError ? true : undefined}
                  label={
                    <>
                      <span className="block text-ui font-medium text-ink">{text.interests[k].label}</span>
                      <span className="block text-meta text-ink-3">{text.interests[k].hint}</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
          {interestError ? (
            <p id="club-interest-error" className="mt-1.5 text-meta font-medium text-signal">
              {interestError}
            </p>
          ) : null}
        </fieldset>

        <Field id="club-message" label={text.message} hint={text.messageHint} optionalLabel={text.optional}>
          <TextArea
            id="club-message"
            name="message"
            rows={4}
            maxLength={CLUB_MESSAGE_MAX}
            defaultValue={v.message}
            hint={text.messageHint}
          />
        </Field>

        <div hidden>
          <label htmlFor="club-website">{text.honeypot}</label>
          <input id="club-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        <div className="space-y-4 border-t border-rule pt-5">
          {text.attend ? (
            <Checkbox id="club-attend" name="attend" defaultChecked={v.attend === 'on'} label={text.attend} />
          ) : null}
          <Checkbox
            id="club-consent"
            name="consent"
            required
            defaultChecked={v.consent === 'on'}
            label={text.consent}
            error={error('consent')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Button type="submit" size="lg" aria-disabled={pending || undefined} className="w-full shrink-0 sm:w-auto">
          {pending ? text.sending : text.submit}
          {pending ? null : <Icon name="arrow-right" size={18} />}
        </Button>
        <p id="club-form-note" className="flex items-start gap-1.5 text-meta text-ink-3">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          <span>
            {text.privacyNote}{' '}
            <a href={text.privacyHref} className="text-link font-medium">
              {text.privacyLink}
            </a>
          </span>
        </p>
      </div>
    </form>
  )
}
