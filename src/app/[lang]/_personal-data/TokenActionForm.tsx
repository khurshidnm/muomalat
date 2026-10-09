'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { TokenActionState } from '@/lib/actions/privacy'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export interface TokenActionText {
  button: string
  sending: string
  done: string
  invalid: string
  already?: string
  busy: string
}

const initial: TokenActionState = { status: 'idle', n: 0 }

/**
 * One button that acts on a link's token (confirm a subscription, unsubscribe,
 * confirm a rights request). Opening the link only shows this button; the
 * POST does the work, so mail scanners that prefetch links change nothing.
 * Works without JavaScript; with it, focus moves to the outcome.
 */
export function TokenActionForm({
  action,
  token,
  text,
}: {
  action: (state: TokenActionState, formData: FormData) => Promise<TokenActionState>
  token: string
  text: TokenActionText
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  const outcome = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.n > 0) outcome.current?.focus()
  }, [state.n])

  const message =
    state.status === 'done'
      ? text.done
      : state.status === 'already'
        ? (text.already ?? text.done)
        : state.status === 'invalid'
          ? text.invalid
          : state.status === 'busy'
            ? text.busy
            : null
  const ok = state.status === 'done' || state.status === 'already'

  return (
    <div className="space-y-4">
      <div role="status" aria-live="polite" className="empty:hidden">
        {message ? (
          <div
            ref={outcome}
            tabIndex={-1}
            className={
              ok
                ? 'flex items-start gap-2.5 border-l-2 border-emerald bg-emerald-wash px-4 py-3 text-ui font-medium text-emerald-ink'
                : 'flex items-start gap-2.5 border-l-2 border-signal bg-signal-wash px-4 py-3 text-ui font-medium text-signal'
            }
          >
            <Icon name={ok ? 'check' : 'alert'} size={20} className="mt-px shrink-0" />
            <p>{message}</p>
          </div>
        ) : null}
      </div>
      {ok || state.status === 'invalid' ? null : (
        <form
          action={formAction}
          onSubmit={(e) => {
            if (pending) e.preventDefault()
          }}
        >
          <input type="hidden" name="t" value={token} />
          <Button type="submit" size="lg" aria-disabled={pending || undefined} className="w-full sm:w-auto">
            {pending ? text.sending : text.button}
          </Button>
        </form>
      )}
    </div>
  )
}

/** The outcome shown without a button, when the link is already known to be bad. */
export function TokenNotice({ text }: { text: string }) {
  return (
    <div role="status" className="flex items-start gap-2.5 border-l-2 border-signal bg-signal-wash px-4 py-3 text-ui font-medium text-signal">
      <Icon name="alert" size={20} className="mt-px shrink-0" />
      <p>{text}</p>
    </div>
  )
}
