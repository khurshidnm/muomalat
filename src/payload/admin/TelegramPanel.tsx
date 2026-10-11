'use client'

import { Button, toast, useConfig, useDocumentInfo, useFormModified } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import React, { useCallback, useEffect, useState } from 'react'

/**
 * "Telegram" sidebar panel of a channel post (CMS-SPEC §10.3): the state,
 * the countdown of the cancellable delay with its «Bekor qilish» button, and
 * the actions this user may take now, as the server computes them
 * (`GET /api/telegram-posts/:id/state`), performed with
 * `POST /api/telegram-posts/:id/action`. The hooks decide; a refusal shows
 * their Uzbek message, and a user who cannot approve sees why.
 */

type Action = { id: 'approve' | 'cancel' | 'confirm_deleted'; label: string }
type State = {
  kind: string
  status: string
  statusLabel: string
  sendAt: string | null
  now: number
  sentAt: string | null
  messageLink: string | null
  lastError: string | null
  sponsored: boolean
  article: { id: number; title: string; live: boolean; withdrawn: boolean; embargo: boolean } | null
  posting: { configured: boolean; enabled: boolean; delayMinutes: number; readOnly: boolean; rights: { ok: boolean; at: string; summary: string } | null }
  actions: Action[]
  hint: string | null
  notes: string[]
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: '12px',
  marginBottom: '16px',
  background: 'var(--theme-elevation-0)',
}
const small: React.CSSProperties = { fontSize: '12px', color: 'var(--theme-elevation-600)', lineHeight: 1.4, margin: '6px 0 0' }
const warn: React.CSSProperties = { ...small, color: 'var(--theme-warning-600, #b45309)' }
const error: React.CSSProperties = { ...small, color: 'var(--theme-error-500)' }
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

const COLORS: Record<string, string> = {
  draft: '#6b7280',
  edit_pending: '#b45309',
  approved: '#1d4ed8',
  queued: '#1d4ed8',
  sent: '#15803d',
  edited: '#15803d',
  cancelled: '#6b7280',
  retracted: '#7c2d12',
  failed: '#b42318',
}

/** dd.MM.yyyy HH:mm in Tashkent, the admin's format. */
const tashkent = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  )
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`
}
/** `YYYY-MM-DDTHH:mm` typed in Tashkent time (UTC+05:00) → ISO UTC. */
const fromTashkentInput = (v: string) => (v ? new Date(`${v}:00+05:00`).toISOString() : '')
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const TelegramPanel: UIFieldClientComponent = () => {
  const { id } = useDocumentInfo()
  const {
    config: {
      serverURL,
      routes: { api },
    },
  } = useConfig()
  const modified = useFormModified()
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [later, setLater] = useState('')
  const [skew, setSkew] = useState(0)
  const [tick, setTick] = useState(Date.now())

  const base = `${serverURL ?? ''}${api}/telegram-posts/${id}`
  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`${base}/state`, { credentials: 'include' })
      if (!res.ok) return
      const s = (await res.json()) as State
      setSkew(s.now - Date.now())
      setState(s)
    } catch {
      // offline: the panel stays empty
    }
  }, [base, id])

  useEffect(() => {
    void load()
  }, [load, modified])

  // The countdown, and a reload once the post should have gone.
  useEffect(() => {
    if (state?.status !== 'queued' && state?.status !== 'approved') return
    const t = setInterval(() => setTick(Date.now()), 1000)
    const r = setInterval(() => void load(), 10_000)
    return () => {
      clearInterval(t)
      clearInterval(r)
    }
  }, [load, state?.status])

  const run = useCallback(
    async (a: Action) => {
      setBusy(true)
      try {
        const body: Record<string, unknown> = { action: a.id }
        if (a.id === 'approve' && later) body.sendAt = fromTashkentInput(later)
        const res = await fetch(`${base}/action`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = (await res.json().catch(() => ({}))) as { message?: string; errors?: { message?: string; data?: { errors?: { message: string }[] } }[] }
        if (!res.ok) {
          const e = json.errors?.[0]
          toast.error(e?.data?.errors?.map((x) => x.message).join(' ') || e?.message || 'Amal bajarilmadi.')
          return
        }
        toast.success(json.message ?? 'Bajarildi.')
        window.location.reload()
      } finally {
        setBusy(false)
      }
    },
    [base, later],
  )

  if (!id) {
    return (
      <div style={box}>
        <strong>Telegram</strong>
        <p style={small}>Saqlangandan keyin bu yerda tasdiqlash tugmasi chiqadi. Matn boʻsh qolsa, maqoladan shablon boʻyicha yasaladi.</p>
      </div>
    )
  }
  if (!state) return <div style={box}>Telegram holati yuklanmoqda…</div>

  const remaining = state.sendAt ? new Date(state.sendAt).getTime() - (tick + skew) : 0
  const p = state.posting
  return (
    <div style={box}>
      <div>
        <span style={badge(COLORS[state.status] ?? '#6b7280')}>{state.statusLabel}</span>
        {state.sponsored ? <span style={badge('#7c3aed')}>Reklama</span> : null}
      </div>
      {state.article ? (
        <p style={small}>
          Maqola: «{state.article.title}»{!state.article.live ? ' — chop etilmagan' : ''}
          {state.article.withdrawn ? ' — olib tashlangan' : ''}
          {state.article.embargo ? ' — embargo amalda' : ''}
        </p>
      ) : null}
      {state.status === 'queued' && state.sendAt ? (
        <p style={{ ...small, fontSize: 14, color: 'var(--theme-text)' }}>
          {remaining > 0 ? (
            <>
              Yuborishga <strong>{mmss(remaining)}</strong> qoldi ({tashkent(state.sendAt)}, Toshkent). Bu vaqt ichida bekor qilish mumkin.
            </>
          ) : (
            'Yuborish vaqti keldi: bot bir necha soniyada yuboradi.'
          )}
        </p>
      ) : null}
      {state.status === 'approved' ? <p style={small}>Tasdiqlangan: bot bir necha soniyada bajaradi.</p> : null}
      {state.sentAt ? <p style={small}>Kanalga yuborilgan: {tashkent(state.sentAt)}</p> : null}
      {state.messageLink ? (
        <p style={small}>
          <a href={state.messageLink} target="_blank" rel="noopener noreferrer">
            Kanaldagi xabarni ochish
          </a>
        </p>
      ) : null}
      {state.status === 'edited' && state.kind === 'retraction' ? (
        <p style={warn}>Vazifa: kanal egasi eski postlarni Telegram ilovasida qoʻlda oʻchirsin, keyin «Qoʻlda oʻchirildi»ni bosing.</p>
      ) : null}
      {state.lastError ? <p style={error}>Xato: {state.lastError}</p> : null}
      {!p.configured ? <p style={warn}>Telegram boti sozlanmagan: post yuborilmaydi (kanalga qoʻlda joylanadi).</p> : null}
      {p.configured && !p.enabled ? <p style={warn}>Kanalga avtomatik joylash oʻchirilgan (Sozlamalar → Telegram): navbatdagi postlar kutib turadi.</p> : null}
      {p.readOnly ? <p style={error}>CMS faqat oʻqish rejimida: Telegram ham toʻxtatilgan.</p> : null}
      {p.rights && !p.rights.ok ? <p style={error}>{p.rights.summary}</p> : null}
      {state.notes.map((n) => (
        <p key={n} style={small}>
          {n}
        </p>
      ))}
      {modified ? <p style={small}>Avval saqlang: amallar saqlangan matn bilan ishlaydi.</p> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {state.actions.some((a) => a.id === 'approve') && state.kind !== 'retraction' && !(state.messageLink && state.kind === 'article') ? (
          <label style={{ display: 'block', fontSize: 12 }}>
            Keyinroq yuborish (ixtiyoriy, Toshkent vaqti; kamida {p.delayMinutes} daqiqadan keyin)
            <input style={input} type="datetime-local" value={later} onChange={(e) => setLater(e.target.value)} />
          </label>
        ) : null}
        {state.actions.map((a, i) => (
          <Button key={a.id} buttonStyle={i === 0 && a.id !== 'cancel' ? 'primary' : 'secondary'} size="small" disabled={busy || modified} onClick={() => void run(a)}>
            {a.label}
          </Button>
        ))}
        {!state.actions.length ? <p style={small}>Siz uchun hozir amal yoʻq.{state.hint ? ` ${state.hint}` : ''}</p> : null}
        {state.actions.length && state.hint ? <p style={small}>{state.hint}</p> : null}
      </div>
    </div>
  )
}

export default TelegramPanel
