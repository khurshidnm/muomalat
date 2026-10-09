'use client'

import { useEffect, useRef, useState } from 'react'
import { SeriesMarker, type MarkerShape } from './chartMarks'

export interface HoverPoint {
  label: string
  /** 0–100, horizontal position in the plot. */
  x: number
  values: { name: string; color: string; marker: MarkerShape; text: string; y: number | null }[]
}

/**
 * Crosshair + readout layer for LineChart. Pointer, touch and keyboard all
 * move the readout: arrows step through points, Home/End jump to the ends,
 * Esc hides it. Focusing the layer shows the latest point. The live region is
 * always mounted so the first value is announced too.
 */
export function LineChartHover({
  points,
  label,
  uiLang,
  contentLang,
}: {
  points: HoverPoint[]
  label: string
  /** Language of `label` (the page's), when the chart text is in another language. */
  uiLang?: string
  /** Language of the chart's point labels and series names. */
  contentLang?: string
}) {
  const [i, setI] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const p = i === null ? null : points[i]
  const last = points.length - 1

  // A touch readout stays after the finger lifts; the next tap elsewhere clears it.
  useEffect(() => {
    if (i === null) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setI(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [i])

  const nearest = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const x = ((clientX - r.left) / r.width) * 100
    let best = 0
    points.forEach((pt, k) => {
      if (Math.abs(pt.x - x) < Math.abs(points[best].x - x)) best = k
    })
    return best
  }
  const announce = p ? `${p.label}: ${p.values.map((v) => `${v.name} ${v.text}`).join('; ')}` : ''

  return (
    <div
      ref={ref}
      className="absolute inset-0 touch-pan-y"
      tabIndex={0}
      role="group"
      aria-label={label}
      lang={uiLang}
      onPointerMove={(e) => setI(nearest(e.clientX, e.currentTarget))}
      onPointerDown={(e) => setI(nearest(e.clientX, e.currentTarget))}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') setI(null)
      }}
      onFocus={() => setI((v) => v ?? last)}
      onBlur={() => setI(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setI((v) => Math.min(last, (v ?? -1) + 1))
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setI((v) => Math.max(0, (v ?? points.length) - 1))
        else if (e.key === 'Home') setI(0)
        else if (e.key === 'End') setI(last)
        else if (e.key === 'Escape') setI(null)
        else return
        e.preventDefault()
      }}
    >
      <p role="status" lang={contentLang} className="sr-only">
        {announce}
      </p>
      {p ? (
        <>
          <span aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-ink-3" style={{ left: `${p.x}%` }} />
          {p.values.map((v) =>
            v.y === null ? null : (
              <SeriesMarker
                key={v.name}
                shape={v.marker}
                color={v.color}
                className="absolute -translate-x-1/2 translate-y-1/2"
                style={{ left: `${p.x}%`, bottom: `${v.y}%` }}
              />
            ),
          )}
          <div
            aria-hidden="true"
            lang={contentLang}
            className="pointer-events-none absolute top-0 z-10 min-w-36 border border-rule bg-paper px-3 py-2 text-meta"
            style={p.x > 55 ? { right: `${100 - p.x + 2}%` } : { left: `${p.x + 2}%` }}
          >
            <p className="font-semibold text-ink">{p.label}</p>
            {p.values.map((v) => (
              <p key={v.name} className="mt-0.5 flex items-center justify-between gap-3 text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  {p.values.length > 1 ? <SeriesMarker shape={v.marker} color={v.color} className="ring-0" /> : null}
                  {v.name}
                </span>
                <span className="figures font-semibold text-ink">{v.text}</span>
              </p>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
