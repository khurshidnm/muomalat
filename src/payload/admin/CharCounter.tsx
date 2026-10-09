'use client'

import { useConfig, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

/**
 * Live character counter under the title and the lead (CMS-SPEC §3.3): grey
 * up to the warning limit, amber above it, red above the maximum, which
 * blocks publishing (ART-2, ART-3). Limits come from `editorial-rules.limits`
 * (titleWarn 80, titleMax 140, leadWarn 300, leadMax 500 by default).
 */

type Limits = { titleWarn: number; titleMax: number; leadWarn: number; leadMax: number }
const DEFAULTS: Limits = { titleWarn: 80, titleMax: 140, leadWarn: 300, leadMax: 500 }
let cached: Promise<Limits> | undefined

export function CharCounter({ path, kind = 'title' }: { path: string; kind?: 'title' | 'lead' }) {
  const value = useFormFields(([fields]) => fields[path]?.value)
  const {
    config: {
      serverURL,
      routes: { api },
    },
  } = useConfig()
  const [limits, setLimits] = useState<Limits>(DEFAULTS)
  useEffect(() => {
    cached ??= fetch(`${serverURL ?? ''}${api}/globals/editorial-rules?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((g: { limits?: Partial<Limits> }) => ({ ...DEFAULTS, ...(g.limits ?? {}) }))
      .catch(() => DEFAULTS)
    void cached.then(setLimits)
  }, [api, serverURL])

  const len = typeof value === 'string' ? [...value].length : 0
  const warn = kind === 'lead' ? limits.leadWarn : limits.titleWarn
  const max = kind === 'lead' ? limits.leadMax : limits.titleMax
  const color = len > max ? 'var(--theme-error-500)' : len > warn ? 'var(--theme-warning-600, #b45309)' : 'var(--theme-elevation-500)'
  const note = len > max ? ' — juda uzun, chop etilmaydi' : len > warn ? ' — uzun' : ''
  return (
    <div style={{ fontSize: 12, color, textAlign: 'right', marginTop: 4 }} aria-live="polite">
      {len} / {max}
      {note}
    </div>
  )
}

export const LeadCounter = ({ path }: { path: string }) => <CharCounter path={path} kind="lead" />

export default CharCounter
