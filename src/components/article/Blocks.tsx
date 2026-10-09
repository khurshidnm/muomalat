import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { ArticleBlock } from '@/content/types'
import { getTerm } from '@/content'
import { href, paths } from '@/lib/routes'
import { InlineText, keepNumberWords } from '@/components/ui/InlineText'
import { Figure } from '@/components/ui/Figure'
import { Icon } from '@/components/ui/Icon'
import { PullQuote } from './PullQuote'
import { DataTable } from './DataTable'
import { BarChart } from './BarChart'
import { LineChart } from './LineChart'

export interface BlockLabels {
  /** Language of these interface labels (the page's), set on them inside the story text. */
  lang?: string
  source: string
  note: string
  scroll: string
  dataTable: string
  chart: string
  more: string
  question: string
  glossary: string
}

/**
 * Renders an article body. Running text is serif; data blocks switch to sans.
 * `contentLang` marks the story text when it differs from the page language
 * (an untranslated story in ru/en); interface labels keep `labels.lang`.
 */
export function ArticleBlocks({
  blocks,
  locale,
  labels,
  contentLang,
  sponsored = false,
}: {
  blocks: ArticleBlock[]
  locale: Locale
  labels: BlockLabels
  contentLang?: string
  /** Partner content: external links get rel="sponsored". */
  sponsored?: boolean
}) {
  let h2 = 0
  const ui = labels.lang
  return (
    <div className="article-body" lang={contentLang}>
      {blocks.map((b, i) => {
        const key = `b${i}`
        switch (b.type) {
          case 'p':
            return (
              <p key={key}>
                <InlineText text={b.text} locale={locale} sponsored={sponsored} />
              </p>
            )
          case 'h2':
            h2 += 1
            return (
              <h2 key={key} id={`bolim-${h2}`} className="font-display">
                {keepNumberWords(b.text)}
              </h2>
            )
          case 'h3':
            return <h3 key={key}>{keepNumberWords(b.text)}</h3>
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul'
            return (
              <L key={key}>
                {b.items.map((it, k) => (
                  <li key={k}>
                    <InlineText text={it} locale={locale} sponsored={sponsored} />
                  </li>
                ))}
              </L>
            )
          }
          case 'quote':
            return <PullQuote key={key} text={b.text} cite={b.cite} role={b.role} />
          case 'figure':
            return (
              <Figure key={key} image={b.image} className="breakout" sizes="(min-width: 1024px) 790px, 100vw" />
            )
          case 'table':
            return (
              <DataTable
                key={key}
                id={`t${i}`}
                caption={b.caption}
                columns={b.columns}
                rows={b.rows}
                note={b.note}
                source={b.source}
                locale={locale}
                labels={labels}
              />
            )
          case 'chart':
            return b.chart.kind === 'bar' ? (
              <BarChart key={key} id={`c${i}`} chart={b.chart} locale={locale} labels={labels} />
            ) : (
              <LineChart key={key} id={`c${i}`} chart={b.chart} locale={locale} labels={labels} contentLang={contentLang} />
            )
          case 'qa':
            return (
              <div key={key} className="qa">
                <p className="font-sans text-lead leading-snug font-semibold text-ink">
                  <span lang={ui} className="sr-only">
                    {labels.question}:{' '}
                  </span>
                  <span aria-hidden="true" className="mr-1.5 text-emerald">—</span>
                  {b.question}
                </p>
                {b.answer.map((a, k) => (
                  <p key={k} className="mt-3">
                    <InlineText text={a} locale={locale} sponsored={sponsored} />
                  </p>
                ))}
              </div>
            )
          case 'factbox':
            return (
              <aside key={key} className="breakout max-w-measure border-y-2 border-ink py-4 font-sans">
                <p className="label-caps text-emerald">{b.title}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {b.items.map((it, k) => (
                    <div key={k} className="border-l-2 border-brass pl-3">
                      <dt className="text-meta leading-snug text-ink-3">{it.label}</dt>
                      <dd className="figures mt-0.5 text-[1.375rem] leading-tight font-semibold text-ink">{it.value}</dd>
                    </div>
                  ))}
                </dl>
                {b.note ? <p className="mt-3 text-meta text-ink-3">{b.note}</p> : null}
              </aside>
            )
          case 'callout':
            return (
              <aside key={key} className="breakout max-w-measure border-l-2 border-emerald bg-emerald-wash/60 px-4 py-3.5 font-sans">
                {b.title ? <p className="label-caps mb-1.5 text-emerald-ink">{b.title}</p> : null}
                <p className="text-ui leading-relaxed text-ink">
                  <InlineText text={b.text} locale={locale} sponsored={sponsored} />
                </p>
              </aside>
            )
          case 'term': {
            const term = getTerm(locale, b.slug)
            if (!term) return null
            return (
              <aside key={key} className="breakout max-w-measure border border-rule bg-paper-2 p-4 font-sans">
                <p lang={ui} className="label-caps text-brass-ink">
                  {labels.glossary}
                </p>
                <p className="mt-1.5 font-display text-h4 font-semibold">
                  <Link href={href(locale, paths.term(term.slug))} prefetch={false} lang={term.contentLang} className="headline-link">
                    {term.term}
                  </Link>
                  {term.aliases.en ? (
                    <span lang="en" className="ml-2 font-sans text-meta font-normal text-ink-3">
                      {term.aliases.en}
                    </span>
                  ) : null}
                </p>
                <p lang={term.contentLang} className="mt-1.5 text-ui text-ink-2">
                  {term.short}
                </p>
                <Link
                  href={href(locale, paths.term(term.slug))}
                  prefetch={false}
                  lang={ui}
                  className="mt-2 inline-flex items-center gap-1 text-meta font-semibold text-emerald hover:text-emerald-ink"
                >
                  {labels.more}
                  <Icon name="arrow-right" size={14} />
                </Link>
              </aside>
            )
          }
          default:
            return null
        }
      })}
    </div>
  )
}
