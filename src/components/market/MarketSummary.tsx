import type { InstitutionType, LicenceStatus } from '@/content/types'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { STATUS_ORDER, StatusMark } from './StatusMark'

export const TYPE_ORDER: InstitutionType[] = ['bank', 'window', 'microfinance', 'leasing', 'takaful']

export interface SummaryRow {
  id: string
  type: InstitutionType
  status: LicenceStatus
  /** Display name of the city in the interface language. */
  city: string
  cityLang: string
}

export interface SummaryText {
  title: string
  description: string
  byStatus: string
  byType: string
  byCity: string
  total: string
  unitNote: string
  legend: string
  statuses: Record<LicenceStatus, string>
  statusDefs: Record<LicenceStatus, string>
  typesPlural: Record<InstitutionType, string>
}

/** Column paddings for the status strip: 1 column on phones, 2 from sm, 4 from lg. */
function statusCell(i: number): string {
  const sm = i % 2 === 0 ? 'sm:pr-5' : 'sm:pl-5'
  const lg = `${i > 0 ? 'lg:pl-5' : 'lg:pl-0'} ${i < 3 ? 'lg:pr-5' : 'lg:pr-0'}`
  return `${sm} ${lg}`
}

/**
 * "Bozor raqamlarda": counts by licence status (which doubles as the legend
 * for the status marks), a unit chart by type of institution — one mark per
 * institution, so shape shows the status mix — and a short city breakdown.
 */
export function MarketSummary({
  id,
  headingId,
  rows,
  text,
  className = '',
}: {
  id: string
  headingId: string
  rows: SummaryRow[]
  text: SummaryText
  className?: string
}) {
  const byStatus = (list: SummaryRow[], s: LicenceStatus) => list.filter((r) => r.status === s).length
  const types = TYPE_ORDER.map((type) => {
    const list = rows.filter((r) => r.type === type)
    const sorted = STATUS_ORDER.flatMap((s) => list.filter((r) => r.status === s))
    return { type, list: sorted }
  }).filter((t) => t.list.length)

  const cityMap = new Map<string, { city: string; lang: string; n: number }>()
  for (const r of rows) {
    const c = cityMap.get(r.city) ?? { city: r.city, lang: r.cityLang, n: 0 }
    c.n += 1
    cityMap.set(r.city, c)
  }
  const cities = [...cityMap.values()].sort((a, b) => b.n - a.n)
  const maxCity = Math.max(1, ...cities.map((c) => c.n))

  return (
    <section id={id} aria-labelledby={headingId} className={`scroll-mt-20 ${className}`}>
      <SectionHeader id={headingId} title={text.title} description={text.description} />

      {/* Status strip — counts and the legend for the status marks. */}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="label-caps text-ink-3">
            {text.byStatus}
          </h3>
          <p className="text-meta text-ink-3">{text.legend}</p>
        </div>
        <dl className="mt-2 grid border-t-2 border-ink sm:grid-cols-2 lg:grid-cols-4 lg:border-b lg:border-rule">
          {STATUS_ORDER.map((s, i) => (
            <div
              key={s}
              className={`grid grid-cols-[3.25rem_minmax(0,1fr)] grid-rows-[auto_1fr] gap-x-3 border-b border-rule py-4 sm:[&:nth-child(even)]:border-l lg:border-b-0 lg:[&:not(:first-child)]:border-l ${statusCell(i)}`}
            >
              <dt className="col-start-2 row-start-1 flex items-center gap-1.5 text-ui font-semibold text-ink">
                <StatusMark status={s} size={13} />
                {text.statuses[s]}
              </dt>
              <dd
                className={`figures col-start-1 row-span-2 row-start-1 text-numeral font-semibold ${s === 'granted' ? 'text-emerald' : 'text-ink'}`}
              >
                {byStatus(rows, s)}
              </dd>
              <dd className="col-start-2 row-start-2 mt-1 text-meta leading-snug text-ink-3">{text.statusDefs[s]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-12 lg:gap-x-8">
        {/* Unit chart by type. */}
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="label-caps text-ink-3">
              {text.byType}
            </h3>
            <p className="text-meta text-ink-3">{text.unitNote}</p>
          </div>
          <dl className="mt-2 border-t-2 border-ink">
            {types.map(({ type, list }) => (
              <div
                key={type}
                className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-2 border-b border-rule py-3 sm:grid-cols-[minmax(0,15rem)_2.5rem_minmax(0,1fr)]"
              >
                <dt className="text-ui text-ink">{text.typesPlural[type]}</dt>
                <dd className="figures text-right text-ui font-semibold text-ink sm:text-left">{list.length}</dd>
                <dd className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1">
                  {list.map((r) => (
                    <StatusMark key={r.id} status={r.status} size={15} />
                  ))}
                  <span className="sr-only">
                    {STATUS_ORDER.filter((s) => byStatus(list, s))
                      .map((s) => `${text.statuses[s]}: ${byStatus(list, s)}`)
                      .join('; ')}
                  </span>
                </dd>
              </div>
            ))}
            <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-3 py-3 sm:grid-cols-[minmax(0,15rem)_2.5rem_minmax(0,1fr)]">
              <dt className="text-ui font-semibold text-ink">{text.total}</dt>
              <dd className="figures text-right text-ui font-semibold text-ink sm:text-left">{rows.length}</dd>
            </div>
          </dl>
        </div>

        {/* City breakdown. */}
        <div className="lg:col-span-4">
          <h3 className="label-caps text-ink-3">
            {text.byCity}
          </h3>
          <dl className="mt-2 border-t-2 border-ink">
            {cities.map((c) => (
              <div key={c.city} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2rem] items-center gap-x-3 border-b border-rule py-2">
                <dt lang={c.lang} className="truncate text-data text-ink">
                  {c.city}
                </dt>
                <dd aria-hidden="true" className="h-2">
                  <span className="block h-full bg-chart-1" style={{ width: `${(c.n / maxCity) * 100}%` }} />
                </dd>
                <dd className="figures text-right text-data font-semibold text-ink">{c.n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
