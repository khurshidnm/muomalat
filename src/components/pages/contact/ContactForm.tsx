'use client'

import { useActionState, useEffect, useRef } from 'react'
import { sendContactMessage } from '@/lib/actions/contact'
import { Checkbox, Field, FormStatus, Select, TextArea, TextInput } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { FormError } from '@/lib/forms'
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_TOPICS,
  FIELD_MAX,
  TOPIC_EVENT,
  TOPIC_PARAM,
  URL_MAX,
  initialContactState,
  isTopic,
  type ContactFieldError,
  type ContactTopic,
} from './options'

export interface ContactFormText {
  topicLabel: string
  topicPrompt: string
  topics: Record<ContactTopic, string>
  name: string
  email: string
  emailPlaceholder: string
  urlLabel: string
  urlHint: string
  urlPlaceholder: string
  message: string
  messageHint: string
  consent: string
  optional: string
  honeypot: string
  submit: string
  sending: string
  success: string
  errorSummary: string
  /** Rate limit or store unreachable (lib/forms FormError). */
  formErrors: Record<FormError, string>
  /** Under the submit button: where the privacy notice is (CMS-SPEC §13.2). */
  privacyNote: string
  privacyLink: string
  privacyHref: string
  errors: Record<ContactFieldError, string>
}

/**
 * General contact form for /aloqa. Server action + useActionState, so it
 * works as a plain POST before hydration. Fields remount after each attempt
 * (key = submission count) so echoed values become their defaults.
 */
export function ContactForm({ text, idPrefix = 'aloqa' }: { text: ContactFormText; idPrefix?: string }) {
  const [state, action, pending] = useActionState(sendContactMessage, initialContactState)
  const formRef = useRef<HTMLFormElement>(null)
  const v = state.values
  const id = (name: string) => `${idPrefix}-${name}`
  const err = (name: string) => {
    const code = state.errors[name]
    return code ? text.errors[code] : undefined
  }

  // Preselect a topic from ?mavzu=… on load, or from an in-page TopicLink.
  useEffect(() => {
    const topicSelect = () => formRef.current?.elements.namedItem('topic') as HTMLSelectElement | null
    const select = (topic: string | null, focus: boolean) => {
      const el = topicSelect()
      if (!el || !isTopic(topic)) return
      el.value = topic
      if (focus) {
        el.focus({ preventScroll: true })
        el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      }
    }
    const fromUrl = new URLSearchParams(window.location.search).get(TOPIC_PARAM)
    if (!topicSelect()?.value) select(fromUrl, false)
    const onTopic = (e: Event) => select((e as CustomEvent<string>).detail, true)
    window.addEventListener(TOPIC_EVENT, onTopic)
    return () => window.removeEventListener(TOPIC_EVENT, onTopic)
  }, [])

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
        <Field id={id('topic')} label={text.topicLabel} error={err('topic')}>
          <Select id={id('topic')} name="topic" required defaultValue={v.topic ?? ''} error={err('topic')}>
            <option value="">{text.topicPrompt}</option>
            {CONTACT_TOPICS.map((key) => (
              <option key={key} value={key}>
                {text.topics[key]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={id('name')} label={text.name} error={err('name')}>
            <TextInput
              id={id('name')}
              name="name"
              required
              autoComplete="name"
              maxLength={FIELD_MAX}
              defaultValue={v.name}
              error={err('name')}
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
        </div>

        <Field id={id('url')} label={text.urlLabel} hint={text.urlHint} error={err('url')} optionalLabel={text.optional}>
          <TextInput
            id={id('url')}
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            maxLength={URL_MAX}
            placeholder={text.urlPlaceholder}
            defaultValue={v.url}
            hint={text.urlHint}
            error={err('url')}
          />
        </Field>

        <Field id={id('message')} label={text.message} hint={text.messageHint} error={err('message')}>
          <TextArea
            id={id('message')}
            name="message"
            required
            rows={6}
            maxLength={CONTACT_MESSAGE_MAX}
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

      <FormStatus status={state.status} success={text.success} errorSummary={text.errorSummary} formError={state.formError} formErrors={text.formErrors} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Button type="submit" size="lg" aria-disabled={pending || undefined} className="w-full sm:w-auto">
          {pending ? text.sending : text.submit}
        </Button>
        <p className="flex items-start gap-1.5 text-meta text-ink-3">
          <Icon name="info" size={16} className="mt-px shrink-0" />
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
