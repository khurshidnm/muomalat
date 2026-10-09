'use client'

import { Button, toast, useConfig, useDocumentInfo, useFormModified, useLocale } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import React, { useCallback, useEffect, useState } from 'react'

/**
 * "Ish jarayoni" (workflow): the sidebar panel of CMS-SPEC §5.2. Shows the
 * story's state and the transitions this user may perform now, as the server
 * computes them (`GET /api/articles/:id/transitions`), and performs one with
 * `POST /api/articles/:id/transition`. "Tahrirga yuborish" (submit for edit)
 * is one click; the transitions that need a comment, a time, a notice or an
 * outcome open a small form first. The hooks on the server decide; a refused
 * transition shows their Uzbek message.
 */

type Transition = { id: string; label: string; to: string | null; comment: boolean; write: string }
type State = {
  state: string
  stateLabel: string
  live: boolean
  pendingChanges: boolean
  embargo: string | null
  scheduledAt: string | null
  scheduleError: string | null
  secondRead: { dueAt: string | null } | null
  transitions: Transition[]
  hint?: string | null
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: '12px',
  marginBottom: '16px',
  background: 'var(--theme-elevation-0)',
}
const small: React.CSSProperties = { fontSize: '12px', color: 'var(--theme-elevation-600)', lineHeight: 1.4 }
const badge = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  background: color,
  color: '#fff',
  borderRadius: 4,
  padding: '2px 8px',
  fontWeight: 600,
  fontSize: '12px',
  marginRight: 6,
})
const input: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  padding: '6px 8px',
  border: '1px solid var(--theme-elevation-250)',
  borderRadius: 4,
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-text)',
  font: 'inherit',
}

/** dd.MM.yyyy HH:mm in Tashkent, the admin's own format (payload.config admin.dateFormat). */
const tashkent = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  )
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`
}

/** `YYYY-MM-DDTHH:mm` typed in Tashkent time (UTC+05:00, no daylight saving) → ISO UTC. */
const fromTashkentInput = (v: string) => (v ? new Date(`${v}:00+05:00`).toISOString() : '')

const STATE_COLORS: Record<string, string> = {
  idea: '#6b7280',
  draft: '#6b7280',
  in_edit: '#b45309',
  ready: '#047857',
  scheduled: '#1d4ed8',
  published: '#15803d',
  hold: '#7c2d12',
  withdrawn: '#991b1b',
}

export const WorkflowActions: UIFieldClientComponent = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const {
    config: {
      serverURL,
      routes: { api, admin },
    },
  } = useConfig()
  const modified = useFormModified()
  const { code: locale } = useLocale()
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<Transition | null>(null)
  const [comment, setComment] = useState('')
  const [when, setWhen] = useState('')
  const [notice, setNotice] = useState('')
  const [reason, setReason] = useState('')
  const [hideTitle, setHideTitle] = useState(false)
  const [outcome, setOutcome] = useState('ok')

  const base = `${serverURL ?? ''}${api}/${collectionSlug ?? 'articles'}/${id}`

  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`${base}/transitions`, { credentials: 'include' })
      if (res.ok) setState((await res.json()) as State)
    } catch {
      // offline: the panel stays empty, Payload's own buttons still work
    }
  }, [base, id])

  useEffect(() => {
    void load()
  }, [load, modified])

  const run = useCallback(
    async (t: Transition) => {
      setBusy(true)
      try {
        const body: Record<string, unknown> = { action: t.id }
        if (comment.trim()) body.comment = comment.trim()
        if (t.id === 'schedule') body.scheduledAt = fromTashkentInput(when)
        if (t.id === 'withdraw') body.withdrawal = { publicNotice: notice || undefined, internalReason: reason || undefined, hideTitle }
        if (t.id === 'secondRead') body.outcome = outcome
        if (t.id === 'unpublish' && !body.comment && reason.trim()) body.comment = reason.trim()
        // The withdrawal notice is written in the locale being edited.
        const res = await fetch(`${base}/transition?locale=${encodeURIComponent(locale ?? 'uz')}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = (await res.json().catch(() => ({}))) as { message?: string; errors?: { message?: string; data?: { errors?: { message: string }[] } }[] }
        if (!res.ok) {
          const e = json.errors?.[0]
          const detail = e?.data?.errors?.map((x) => x.message).join(' ')
          toast.error(detail || e?.message || 'Amal bajarilmadi.')
          return
        }
        toast.success(json.message ?? 'Bajarildi.')
        setOpen(null)
        setComment('')
        // The author leaves the document after submitting it (§5.2).
        if (t.id === 'submit') window.location.assign(`${admin}/collections/${collectionSlug ?? 'articles'}`)
        else window.location.reload()
      } finally {
        setBusy(false)
      }
    },
    [admin, base, collectionSlug, comment, hideTitle, locale, notice, outcome, reason, when],
  )

  if (!id) {
    return (
      <div style={box}>
        <strong>Ish jarayoni</strong>
        <p style={small}>Maqola saqlangach, bu yerda «Tahrirga yuborish» va boshqa amallar chiqadi.</p>
      </div>
    )
  }
  if (!state) return <div style={box}>Ish jarayoni yuklanmoqda…</div>

  const needsForm = (t: Transition) => t.comment || ['schedule', 'withdraw', 'secondRead', 'unpublish'].includes(t.id)

  return (
    <div style={box}>
      <div style={{ marginBottom: 8 }}>
        <span style={badge(STATE_COLORS[state.state] ?? '#6b7280')}>{state.stateLabel}</span>
        {state.embargo ? <span style={badge('#b42318')}>{state.embargo}</span> : null}
      </div>
      {state.pendingChanges ? <p style={small}>Chop etilmagan oʻzgarishlar bor: ular «Oʻzgarishlarni chop etish» bilan saytga chiqadi.</p> : null}
      {state.scheduledAt && state.state === 'scheduled' ? <p style={small}>Chop etiladi: {tashkent(state.scheduledAt)} (Toshkent)</p> : null}
      {state.scheduleError ? <p style={{ ...small, color: 'var(--theme-error-500)' }}>Rejali chop etish xatosi: {state.scheduleError}</p> : null}
      {state.secondRead ? (
        <p style={{ ...small, color: 'var(--theme-warning-600, #b45309)' }}>
          Ikkinchi oʻqish kutilmoqda{state.secondRead.dueAt ? `: ${tashkent(state.secondRead.dueAt)} gacha` : ''}.
        </p>
      ) : null}
      {modified ? <p style={small}>Oʻzgarishlar saqlanmoqda: amallar saqlangandan keyin ishlaydi.</p> : null}

      {open ? (
        <div style={{ marginTop: 8 }}>
          <strong style={{ fontSize: 13 }}>{open.label}</strong>
          {open.id === 'schedule' ? (
            <label style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              Chop etish vaqti (Toshkent)
              <input style={input} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
          ) : null}
          {open.id === 'withdraw' ? (
            <>
              <label style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                Oʻquvchilar uchun izoh ({locale ?? 'uz'})
                <textarea style={input} rows={3} value={notice} onChange={(e) => setNotice(e.target.value)} />
              </label>
              <label style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                Ichki sabab
                <textarea style={input} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <label style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                <input type="checkbox" checked={hideTitle} onChange={(e) => setHideTitle(e.target.checked)} /> Sarlavhani yashirish
              </label>
            </>
          ) : null}
          {open.id === 'secondRead' ? (
            <label style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              Natija
              <select style={input} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="ok">Kamchilik yoʻq</option>
                <option value="minor_fix">Mayda tuzatish</option>
                <option value="correction">Tuzatish kerak</option>
              </select>
            </label>
          ) : null}
          {open.comment || open.id === 'unpublish' ? (
            <label style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              {open.id === 'unpublish' ? 'Sabab (majburiy)' : 'Izoh (majburiy)'}
              <textarea style={input} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
          ) : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button buttonStyle="primary" size="small" disabled={busy} onClick={() => void run(open)}>
              {open.label}
            </Button>
            <Button buttonStyle="secondary" size="small" disabled={busy} onClick={() => setOpen(null)}>
              Bekor qilish
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {state.transitions.length === 0 ? (
            <p style={small}>
              Siz uchun hozir amal yoʻq.{state.hint ? ` ${state.hint}` : ''}
            </p>
          ) : null}
          {state.transitions.map((t, i) => (
            <Button
              key={t.id}
              buttonStyle={i === 0 ? 'primary' : 'secondary'}
              size="small"
              disabled={busy || modified}
              onClick={() => (needsForm(t) ? setOpen(t) : void run(t))}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkflowActions
