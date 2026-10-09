'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { InstitutionType, LicenceStatus } from '@/content/types'
import { Field, Select, TextInput } from '@/components/forms/Field'
import { Icon } from '@/components/ui/Icon'
import { STATUS_ORDER, STATUS_RANK, StatusMark } from './StatusMark'
import { format, normalizeSearch } from './normalize'

/** One institution, pre-localised on the server. */
export interface MarketRow {
  id: string
  name: string
  parent?: string
  type: InstitutionType
  city: string
  /** Language of the city name (translated for ru/en, Uzbek otherwise). */
  cityLang: string
  status: LicenceStatus
  /** ISO date of the latest status change. */
  statusDate: string
  statusDateText: string
  products: string[]
  note?: string
  article?: { href: string; title: string; lang: string }
  /** Language of the institution's own fields (name, products, note). */
  lang: string
  /** Pre-normalised search text (see normalizeSearch). */
  haystack: string
}

export interface MarketTableText {
  caption: string
  filters: string
  search: string
  searchPlaceholder: string
  type: string
  allTypes: string
  status: string
  allStatuses: string
  sort: string
  sortStatus: string
  sortName: string
  sortDate: string
  countAll: string
  countFiltered: string
  reset: string
  empty: string
  emptyHint: string
  colName: string
  colType: string
  colCity: string
  colStatus: string
  colProducts: string
  parent: string
  article: string
  types: Record<InstitutionType, string>
  statuses: Record<LicenceStatus, string>
}

type Sort = 'status' | 'name' | 'date'

const TYPES: InstitutionType[] = ['bank', 'window', 'microfinance', 'leasing', 'takaful']
const SORTS: Sort[] = ['status', 'name', 'date']

const isType = (v: string | null): v is InstitutionType => !!v && (TYPES as string[]).includes(v)
const isStatus = (v: string | null): v is LicenceStatus => !!v && (STATUS_ORDER as string[]).includes(v)
const isSort = (v: string | null): v is Sort => !!v && (SORTS as string[]).includes(v)

/**
 * Filterable register of institutions. The server renders the full list in
 * status order (so it works without JavaScript); filters, search and sort run
 * in the browser and are mirrored in the query string (?q=&tur=&holat=&tartib=)
 * so a filtered view can be shared. Phones get a stacked list, ≥ md a table.
 */
export function MarketTable({ rows, text, collation }: { rows: MarketRow[]; text: MarketTableText; collation: string }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<InstitutionType | ''>('')
  const [status, setStatus] = useState<LicenceStatus | ''>('')
  const [sort, setSort] = useState<Sort>('status')
  const [restored, setRestored] = useState(false)

  // Restore a shared view from the URL once hydrated (the static HTML is unfiltered).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const q = p.get('q')
    const tur = p.get('tur')
    const holat = p.get('holat')
    const tartib = p.get('tartib')
    if (q) setQuery(q.slice(0, 80))
    if (isType(tur)) setType(tur)
    if (isStatus(holat)) setStatus(holat)
    if (isSort(tartib)) setSort(tartib)
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    const p = new URLSearchParams(window.location.search)
    const set = (k: string, v: string) => (v ? p.set(k, v) : p.delete(k))
    set('q', query.trim())
    set('tur', type)
    set('holat', status)
    set('tartib', sort === 'status' ? '' : sort)
    const qs = p.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, '', next)
    }
  }, [restored, query, type, status, sort])

  const shown = useMemo(() => {
    const words = normalizeSearch(query).split(' ').filter(Boolean)
    const list = rows.filter(
      (r) => (!type || r.type === type) && (!status || r.status === status) && words.every((w) => r.haystack.includes(w)),
    )
    // Rows arrive in status order from the server; other orders are computed
    // only after interaction, so hydration always matches the static HTML.
    if (sort === 'name') {
      const collator = new Intl.Collator(collation, { sensitivity: 'base', numeric: true })
      return [...list].sort((a, b) => collator.compare(a.name, b.name))
    }
    if (sort === 'date') {
      return [...list].sort(
        (a, b) => b.statusDate.localeCompare(a.statusDate) || STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.id.localeCompare(b.id),
      )
    }
    return list
  }, [rows, query, type, status, sort, collation])

  const typeCount = useMemo(() => new Map(TYPES.map((t) => [t, rows.filter((r) => r.type === t).length])), [rows])
  const statusCount = useMemo(() => new Map(STATUS_ORDER.map((s) => [s, rows.filter((r) => r.status === s).length])), [rows])

  const filtered = !!(query.trim() || type || status)
  const count = filtered ? format(text.countFiltered, shown.length, rows.length) : format(text.countAll, rows.length)

  function reset() {
    setQuery('')
    setType('')
    setStatus('')
    document.getElementById('xarita-q')?.focus()
  }

  const resetButton = (
    <button
      type="button"
      onClick={reset}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-[2px] text-meta font-semibold text-emerald hover:text-emerald-ink hover:underline underline-offset-2"
    >
      <Icon name="close" size={14} />
      {text.reset}
    </button>
  )

  return (
    <div>
      <form
        role="search"
        aria-label={text.filters}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <Field id="xarita-q" label={text.search} className="sm:col-span-2 md:col-span-1">
          <TextInput
            id="xarita-q"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={text.searchPlaceholder}
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            maxLength={80}
          />
        </Field>
        <Field id="xarita-tur" label={text.type}>
          <Select id="xarita-tur" name="tur" value={type} onChange={(e) => setType(e.target.value as InstitutionType | '')}>
            <option value="">{text.allTypes}</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {`${text.types[t]} (${typeCount.get(t) ?? 0})`}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="xarita-holat" label={text.status}>
          <Select id="xarita-holat" name="holat" value={status} onChange={(e) => setStatus(e.target.value as LicenceStatus | '')}>
            <option value="">{text.allStatuses}</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {`${text.statuses[s]} (${statusCount.get(s) ?? 0})`}
              </option>
            ))}
          </Select>
        </Field>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p role="status" aria-live="polite" aria-atomic="true" className="figures text-ui font-semibold text-ink">
            {count}
          </p>
          {filtered ? resetButton : null}
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="xarita-tartib" className="text-meta text-ink-3">
            {text.sort}
          </label>
          <div className="w-44">
            <Select id="xarita-tartib" name="tartib" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="status">{text.sortStatus}</option>
              <option value="name">{text.sortName}</option>
              <option value="date">{text.sortDate}</option>
            </Select>
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="border-y-2 border-ink py-8 text-center">
          <p className="font-display text-h4 font-semibold text-ink">{text.empty}</p>
          <p className="mt-1.5 text-meta text-ink-3">{text.emptyHint}</p>
          <div className="mt-3">{resetButton}</div>
        </div>
      ) : null}

      {/* Phones: one block per institution, label/value pairs on hairlines. */}
      {shown.length ? (
        <ul className="border-t-2 border-ink md:hidden">
          {shown.map((r) => (
            <li key={r.id} className="border-b border-rule-strong py-3.5">
              <h3 lang={r.lang} className="font-display text-h4 font-semibold text-ink">
                {r.name}
              </h3>
              {r.parent ? (
                <p className="mt-0.5 text-meta text-ink-3">
                  {text.parent}: <span lang={r.lang}>{r.parent}</span>
                </p>
              ) : null}
              <dl className="mt-2.5 text-data">
                <Pair label={text.colStatus}>
                  <StatusLine row={r} text={text} inline />
                </Pair>
                <Pair label={text.colType}>{text.types[r.type]}</Pair>
                <Pair label={text.colCity}>
                  <span lang={r.cityLang}>{r.city}</span>
                </Pair>
                <Pair label={text.colProducts} last>
                  <span lang={r.lang}>{r.products.join(', ')}</span>
                </Pair>
              </dl>
              <Extra row={r} text={text} />
            </li>
          ))}
        </ul>
      ) : null}

      {/* ≥ md: a real table with tabular figures. */}
      {shown.length ? (
        <table className="hidden w-full table-fixed border-collapse text-left text-data md:table">
          <caption className="sr-only">
            {text.caption}. {count}
          </caption>
          <thead>
            <tr className="border-y-2 border-ink">
              <Th className="w-[31%] lg:w-[29%]" active={sort === 'name'} onSort={() => setSort('name')}>
                {text.colName}
              </Th>
              <Th className="w-[17%] lg:w-[13%]">
                {text.colType}
                <span className="lg:hidden"> / {text.colCity}</span>
              </Th>
              <Th className="hidden lg:table-cell lg:w-[11%]">{text.colCity}</Th>
              <Th
                className="w-[21%] lg:w-[18%]"
                active={sort !== 'name'}
                direction={sort === 'date' ? 'descending' : 'ascending'}
                onSort={() => setSort('status')}
              >
                {text.colStatus}
              </Th>
              <Th last>{text.colProducts}</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-rule align-top">
                <th scope="row" className="py-3 pr-5 font-normal">
                  <span lang={r.lang} className="block font-semibold text-ink">
                    {r.name}
                  </span>
                  {r.parent ? (
                    <span className="mt-0.5 block text-meta text-ink-3">
                      {text.parent}: <span lang={r.lang}>{r.parent}</span>
                    </span>
                  ) : null}
                  <Extra row={r} text={text} compact />
                </th>
                <td className="py-3 pr-4 text-ink">
                  {text.types[r.type]}
                  <span lang={r.cityLang} className="mt-0.5 block text-meta text-ink-3 lg:hidden">
                    {r.city}
                  </span>
                </td>
                <td lang={r.cityLang} className="hidden py-3 pr-4 text-ink lg:table-cell">
                  {r.city}
                </td>
                <td className="py-3 pr-4">
                  <StatusLine row={r} text={text} />
                </td>
                <td lang={r.lang} className="py-3 text-ink">
                  <ul className="space-y-1">
                    {r.products.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/** Column head; sortable columns get a button (state mirrored in aria-sort). */
function Th({
  children,
  active = false,
  direction = 'ascending',
  onSort,
  last = false,
  className = '',
}: {
  children: React.ReactNode
  active?: boolean
  direction?: 'ascending' | 'descending'
  onSort?: () => void
  last?: boolean
  className?: string
}) {
  const cls = `py-1 align-bottom text-meta font-semibold text-ink-2 ${last ? '' : 'pr-4'} ${className}`
  if (!onSort) {
    return (
      <th scope="col" className={cls}>
        <span className="inline-flex min-h-8 items-center">{children}</span>
      </th>
    )
  }
  return (
    <th scope="col" aria-sort={active ? direction : undefined} className={cls}>
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex min-h-8 items-center gap-1 rounded-[2px] text-left hover:text-emerald ${active ? 'text-ink' : ''}`}
      >
        {children}
        <Icon name="chevron-down" size={14} className={active ? 'text-ink' : 'text-rule-strong'} />
      </button>
    </th>
  )
}

function Pair({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[6.25rem_minmax(0,1fr)] items-baseline gap-x-3 border-t border-rule py-1.5 ${last ? 'border-b' : ''}`}>
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  )
}

function StatusLine({ row, text, inline = false }: { row: MarketRow; text: MarketTableText; inline?: boolean }) {
  const label = (
    <span className="inline-flex items-start gap-1.5 font-semibold text-ink">
      <StatusMark status={row.status} size={12} className="mt-1" />
      {text.statuses[row.status]}
    </span>
  )
  const date = (
    <time dateTime={row.statusDate} className={`figures text-meta text-ink-3 ${inline ? 'leading-[1.225rem] whitespace-nowrap' : ''}`}>
      {row.statusDateText}
    </time>
  )
  if (inline) {
    return (
      <span className="flex flex-wrap items-start gap-x-2">
        {label}
        {date}
      </span>
    )
  }
  return (
    <>
      {label}
      <span className="mt-0.5 block pl-[1.125rem]">{date}</span>
    </>
  )
}

/** Note and story link under an institution. */
function Extra({ row, text, compact = false }: { row: MarketRow; text: MarketTableText; compact?: boolean }) {
  if (!row.note && !row.article) return null
  return (
    <>
      {row.note ? (
        <span lang={row.lang} className={`block text-meta text-ink-2 ${compact ? 'mt-1.5' : 'mt-2.5'}`}>
          {row.note}
        </span>
      ) : null}
      {row.article ? (
        <Link
          href={row.article.href}
          className={`group inline-flex min-h-6 items-center gap-1 text-meta font-semibold text-emerald hover:text-emerald-ink ${compact ? 'mt-1' : 'mt-1.5'}`}
        >
          {text.article}
          <span className="sr-only" lang={row.article.lang}>
            : {row.article.title}
          </span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </>
  )
}
