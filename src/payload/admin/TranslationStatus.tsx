'use client'

import { Button, toast, useConfig, useDocumentInfo, useFormModified, useLocale } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import React, { useCallback, useEffect, useState } from 'react'

/**
 * Tab "Tarjima" (CMS-SPEC §3.3, §6.3): the status of every locale side by
 * side, and the "Oʻzbekchadan nusxalash" (copy from Uzbek) action that
 * replaces Payload's Copy to locale. The action fills only empty fields
 * unless "overwrite" is ticked, always saves a draft and sets the status to
 * `in_edit` (`machine_draft` when machine translation was used); the server
 * endpoint and the translation hook enforce all of it.
 */

type Tr = { status?: string | null; approvedAt?: string | null; translatedBy?: unknown; reviewedBy?: unknown; contentHash?: string | null }

const LABELS: Record<string, string> = {
  missing: 'Tarjima yoʻq',
  machine_draft: 'Mashina tarjimasi (qoralama)',
  in_edit: 'Tahrirda',
  approved: 'Tasdiqlangan',
  outdated: 'Eskirgan',
}
const COLORS: Record<string, string> = {
  missing: 'var(--theme-elevation-400)',
  machine_draft: '#b45309',
  in_edit: '#b45309',
  approved: '#15803d',
  outdated: '#991b1b',
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: '12px',
  marginBottom: '16px',
}
const cell: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid var(--theme-elevation-100)', fontSize: 13, textAlign: 'left' }

const when = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—'

export const TranslationStatus: UIFieldClientComponent = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const { code: locale } = useLocale()
  const modified = useFormModified()
  const {
    config: {
      serverURL,
      routes: { api },
    },
  } = useConfig()
  const [tr, setTr] = useState<Record<string, Tr> | null>(null)
  const [overwrite, setOverwrite] = useState(false)
  const [machine, setMachine] = useState(false)
  const [busy, setBusy] = useState(false)
  const base = `${serverURL ?? ''}${api}/${collectionSlug ?? 'articles'}/${id}`

  const load = useCallback(async () => {
    if (!id) return
    const res = await fetch(`${base}?locale=all&draft=true&depth=0`, { credentials: 'include' }).catch(() => undefined)
    if (res?.ok) setTr((((await res.json()) as { translation?: Record<string, Tr> }).translation ?? {}) as Record<string, Tr>)
  }, [base, id])

  useEffect(() => {
    void load()
  }, [load, modified])

  const copy = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch(`${base}/copy-from-uz`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, overwrite, machine }),
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string; errors?: { message?: string }[] }
      if (!res.ok) {
        toast.error(json.errors?.[0]?.message ?? 'Nusxalab boʻlmadi.')
        return
      }
      toast.success(json.message ?? 'Nusxalandi.')
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }, [base, locale, machine, overwrite])

  if (!id) return null
  return (
    <div style={box}>
      <strong>Tillar boʻyicha holat</strong>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr>
            <th style={cell}>Til</th>
            <th style={cell}>Holat</th>
            <th style={cell}>Tasdiqlangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>uz</td>
            <td style={cell}>Asl matn</td>
            <td style={cell}>—</td>
          </tr>
          {(['ru', 'en'] as const).map((l) => {
            const status = tr?.[l]?.status ?? 'missing'
            const hidden = status === 'outdated' && !tr?.[l]?.contentHash
            return (
              <tr key={l} style={l === locale ? { background: 'var(--theme-elevation-50)' } : undefined}>
                <td style={cell}>{l}</td>
                <td style={{ ...cell, color: COLORS[status] }}>
                  {LABELS[status] ?? status}
                  {status === 'outdated' ? (hidden ? ' — tuzatishdan keyin saytda koʻrinmaydi' : ' — saytda «asl matn yangilangan» izohi bilan') : ''}
                </td>
                <td style={cell}>{when(tr?.[l]?.approvedAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {locale === 'ru' || locale === 'en' ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <label>
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Toʻldirilgan maydonlarni ham almashtirish
            </label>
            <label>
              <input type="checkbox" checked={machine} onChange={(e) => setMachine(e.target.checked)} /> Mashina tarjimasidan foydalanaman
            </label>
          </div>
          <Button buttonStyle="secondary" size="small" disabled={busy || modified} onClick={() => void copy()}>
            Oʻzbekchadan nusxalash ({locale})
          </Button>
          <p style={{ fontSize: 12, color: 'var(--theme-elevation-600)' }}>
            Sarlavha, mavzu yorligʻi, lid, matn va rasm izohi nusxalanadi; qoralama sifatida saqlanadi. Tarjima holati, SEO va tuzatishlar nusxalanmaydi.
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--theme-elevation-600)', marginTop: 8 }}>Tarjima qilish uchun yuqoridan rus yoki ingliz tilini tanlang.</p>
      )}
    </div>
  )
}

export default TranslationStatus
