'use client'

import { Button, toast, useConfig, useDocumentInfo, useForm, useLocale } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { StoredChecks, StoredFinding } from '../hooks/validate/shared'

/**
 * "Tekshiruv" (checks): the sidebar panel of CMS-SPEC §7.3, a `ui` field on
 * articles. Lists the errors that block publishing and the warnings that do
 * not, in Uzbek, with a link to each field, the one-click fixes (TXT-1, TXT-2,
 * TXT-7) and an acknowledge action for warnings. It reads from
 * `POST /api/articles/:id/check`, which runs the publish checks on the latest
 * draft plus the unsaved form values, and refreshes after every save.
 */

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: '12px',
  marginBottom: '16px',
  background: 'var(--theme-elevation-0)',
}
const item = (level: 'error' | 'warning', done: boolean): React.CSSProperties => ({
  borderLeft: `3px solid ${level === 'error' ? 'var(--theme-error-500)' : done ? 'var(--theme-elevation-300)' : 'var(--theme-warning-500)'}`,
  padding: '6px 8px',
  margin: '8px 0',
  background: 'var(--theme-elevation-50)',
  opacity: done ? 0.7 : 1,
  fontSize: '13px',
  lineHeight: 1.4,
})
const small: React.CSSProperties = { fontSize: '12px', color: 'var(--theme-elevation-600)' }
const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  marginRight: '12px',
  color: 'var(--theme-success-600, var(--theme-text))',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: '12px',
}

const tashkentTime = (iso: string) =>
  new Intl.DateTimeFormat('uz-Latn-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Scrolls to the field and focuses it; fields in a closed tab are not reachable. */
function jumpTo(field: string) {
  const ids = [`field-${field.replace(/\./g, '__')}`, `field-${field}`]
  const el = ids.map((i) => document.getElementById(i)).find(Boolean) ?? document.querySelector(`[name="${field}"]`)
  if (!el) {
    toast.info('Bu maydon boshqa yorliqda: oʻsha yorliqni oching.')
    return
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  ;(el.querySelector('input, textarea, [contenteditable="true"]') as HTMLElement | null)?.focus()
}

export const ChecksPanel: UIFieldClientComponent = () => {
  const { id, collectionSlug, lastUpdateTime } = useDocumentInfo()
  const { getData } = useForm()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const [checks, setChecks] = useState<StoredChecks | undefined>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const locale = useLocale()
  // The form holds the values of the locale being edited; the endpoint must read them in that locale.
  const endpoint = id && collectionSlug === 'articles' ? `${serverURL}${api}/articles/${id}/check?locale=${encodeURIComponent(locale?.code ?? 'uz')}` : undefined
  const getDataRef = useRef(getData)
  getDataRef.current = getData

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      if (!endpoint) return undefined
      setBusy(true)
      try {
        const res = await fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const json = (await res.json().catch(() => ({}))) as { checks?: StoredChecks; message?: string }
        if (!res.ok) {
          toast.error(json.message ?? 'Tekshiruv bajarilmadi.')
          setFailed(true)
          return undefined
        }
        setFailed(false)
        if (json.checks) setChecks(json.checks)
        return json
      } catch {
        setFailed(true)
        toast.error('Tekshiruv bajarilmadi: tarmoq xatosi.')
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [endpoint],
  )

  const run = useCallback(() => call({ data: getDataRef.current() }), [call])

  // After every save (and on open) the checks run again on what was stored.
  useEffect(() => {
    void call({})
  }, [call, lastUpdateTime])

  if (!endpoint) {
    return <div style={{ ...box, ...small }}>Tekshiruv maqola birinchi marta saqlangandan keyin koʻrinadi.</div>
  }

  const findings = checks?.findings ?? []
  const errors = findings.filter((f) => f.level === 'error')
  const warnings = findings.filter((f) => f.level === 'warning')
  const open = warnings.filter((f) => !f.acknowledged)

  const fix = async (f: StoredFinding) => {
    if (!window.confirm('Tuzatish qoralama sifatida saqlanadi va sahifa yangilanadi. Saqlanmagan oʻzgarishlar boʻlsa, avval saqlang. Davom etilsinmi?')) return
    const res = await call({ fix: [f.key] })
    if (res) window.location.reload()
  }

  const renderItem = (f: StoredFinding) => (
    <li key={f.key} style={item(f.level, Boolean(f.acknowledged))}>
      <div style={small}>
        {f.location ?? f.field} · {f.rule}
      </div>
      <div>{f.message}</div>
      {f.excerpt ? <div style={{ ...small, fontStyle: 'italic' }}>«{f.excerpt}»</div> : null}
      {f.acknowledged ? (
        <div style={small}>
          Qabul qilingan{f.acknowledged.byName ? `: ${f.acknowledged.byName}` : ''}, {tashkentTime(f.acknowledged.at)}
        </div>
      ) : null}
      <div style={{ marginTop: '4px' }}>
        <button type="button" style={linkButton} onClick={() => jumpTo(f.field)}>
          Koʻrsatish
        </button>
        {f.fixable ? (
          <button type="button" style={linkButton} disabled={busy} onClick={() => void fix(f)}>
            Tuzatish
          </button>
        ) : null}
        {f.level === 'warning' ? (
          <button type="button" style={linkButton} disabled={busy} onClick={() => void call(f.acknowledged ? { unacknowledge: [f.key] } : { acknowledge: [f.key] })}>
            {f.acknowledged ? 'Qabulni bekor qilish' : 'Koʻrdim, qoldiraman'}
          </button>
        ) : null}
      </div>
    </li>
  )

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong>Tekshiruv</strong>
        <Button buttonStyle="secondary" size="small" margin={false} disabled={busy} onClick={() => void run()}>
          {busy ? 'Tekshirilmoqda…' : 'Tekshirish'}
        </Button>
      </div>
      {failed && !checks ? <p style={small}>Tekshiruv natijasini olib boʻlmadi.</p> : null}
      {checks ? (
        <>
          <p style={{ ...small, margin: '8px 0 0' }}>
            {errors.length ? `${errors.length} ta xato chop etishga toʻsqinlik qiladi.` : 'Chop etishga toʻsqinlik qiladigan xato yoʻq.'}{' '}
            {warnings.length ? `${warnings.length} ta ogohlantirish (${open.length} tasi koʻrilmagan) chop etishga xalal bermaydi.` : ''}
          </p>
          {errors.length ? <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{errors.map(renderItem)}</ul> : null}
          {warnings.length ? <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{[...open, ...warnings.filter((f) => f.acknowledged)].map(renderItem)}</ul> : null}
          <p style={{ ...small, margin: '8px 0 0' }}>Oxirgi tekshiruv: {tashkentTime(checks.checkedAt)}</p>
        </>
      ) : null}
    </div>
  )
}

export default ChecksPanel
