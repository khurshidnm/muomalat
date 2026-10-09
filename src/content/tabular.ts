/**
 * Text formats of the `table` and `chart` article blocks (CMS-SPEC §3.4): the
 * `data` textarea an editor pastes into, the parsers that fill the hidden
 * `rows` / `parsed` json fields, and the formatters the importer uses to turn
 * mock data back into text.
 *
 * Numbers use the Uzbek format: a space (or a no-break / narrow no-break
 * space) separates thousands and a comma is the decimal mark, so "4,5" is 4.5
 * and "12 500" is 12500. For that reason a comma never separates cells: cells
 * are separated by tabs (a paste from Excel) or semicolons.
 */
import type { ChartSpec } from './types'

export type Cell = string | number | null

const THOUSANDS = /[   ]/g
const UZ_NUMBER = /^[-−]?(\d{1,3}([   ]\d{3})+|\d+)(,\d+)?$/

/** "12 500,5" → 12500.5; undefined when the text is not a number in Uzbek format. */
export function parseUzNumber(raw: string): number | undefined {
  const s = raw.trim()
  if (!UZ_NUMBER.test(s)) return undefined
  return Number(s.replace(THOUSANDS, '').replace('−', '-').replace(',', '.'))
}

/** 4.5 → "4,5". No thousands separator, so the text round-trips through parseUzNumber. */
export function formatUzNumber(n: number): string {
  return String(n).replace('.', ',')
}

/** Tab when the text has one (Excel), otherwise semicolon. */
function separatorOf(text: string): string {
  return text.includes('\t') ? '\t' : ';'
}

const lines = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')

/**
 * Table `data` → rows. An empty cell becomes null, a cell in Uzbek number
 * format a number, anything else a string. A text cell that looks like a
 * number (a year, a code such as "05") also becomes a number. Row lengths are
 * not padded: ART-8 reports a row whose length differs from the column count.
 */
export function parseTableData(text: string): Cell[][] {
  const sep = separatorOf(text)
  return lines(text).map((line) =>
    line.split(sep).map((c): Cell => {
      const t = c.trim()
      if (t === '') return null
      const n = parseUzNumber(t)
      return n === undefined ? t : n
    }),
  )
}

/** Rows → table `data`: tab-separated, numbers in Uzbek format. */
export function formatTableData(rows: Cell[][]): string {
  return rows
    .map((r) => r.map((c) => (c === null ? '' : typeof c === 'number' ? formatUzNumber(c) : c)).join('\t'))
    .join('\n')
}

// ── charts ──────────────────────────────────────────────────────────────────
export type ParsedChart =
  | { kind: 'bar'; data: { label: string; value: number; highlight?: boolean }[] }
  | { kind: 'line'; xLabels: string[]; series: { name: string; values: (number | null)[] }[] }

/**
 * Chart → `data` text. Bar: one `label;value` line per bar, `;*` marks the
 * highlighted bar. Line: a header row `Davr;Series A;Series B…` (its first
 * cell is ignored on parse; the axis label is the block's `xLabel`), then one
 * row per period. Bar labels and series names cannot contain ";".
 */
export function formatChartData(chart: ChartSpec): string {
  if (chart.kind === 'bar') {
    return chart.data.map((d) => `${d.label};${formatUzNumber(d.value)}${d.highlight ? ';*' : ''}`).join('\n')
  }
  const header = [chart.xLabel ?? 'Davr', ...chart.series.map((s) => s.name)].join(';')
  const rows = chart.xLabels.map((x, i) =>
    [x, ...chart.series.map((s) => (s.values[i] === null || s.values[i] === undefined ? '' : formatUzNumber(s.values[i] as number)))].join(';'),
  )
  return [header, ...rows].join('\n')
}

/** Chart `data` text → the `parsed` json. A value that does not parse becomes NaN, which ART-10 reports. */
export function parseChartData(kind: 'bar' | 'line', text: string): ParsedChart {
  const rowsOf = lines(text)
  if (kind === 'bar') {
    return {
      kind,
      data: rowsOf.map((l) => {
        const [label, value, flag] = l.split(';')
        const v = parseUzNumber(value ?? '')
        return { label: label.trim(), value: v ?? NaN, ...(flag?.trim() === '*' ? { highlight: true } : {}) }
      }),
    }
  }
  const [header = '', ...rows] = rowsOf
  const names = header.split(';').slice(1).map((s) => s.trim())
  const xLabels: string[] = []
  const series = names.map((name) => ({ name, values: [] as (number | null)[] }))
  for (const r of rows) {
    const [x, ...vals] = r.split(';')
    xLabels.push(x.trim())
    series.forEach((s, i) => {
      const t = (vals[i] ?? '').trim()
      s.values.push(t === '' ? null : (parseUzNumber(t) ?? NaN))
    })
  }
  return { kind, xLabels, series }
}
