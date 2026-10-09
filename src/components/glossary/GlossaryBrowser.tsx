'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GlossaryCategory } from '@/content/types'
import { Icon } from '@/components/ui/Icon'
import { buttonClass } from '@/components/ui/Button'
import { fill, matchesAll, searchWords } from './text'

export interface BrowserEntry {
  slug: string
  term: string
  href: string
  /** Letter id the headword is filed under ("a", "ou", "sh"). */
  letter: string
  category: GlossaryCategory
  en?: string
  ru?: string
  short: string
  /** " word word … " text the filter matches word prefixes against (see text.ts). */
  haystack: string
}

export interface BrowserLabels {
  searchLabel: string
  searchPlaceholder: string
  searchHint: string
  submit: string
  clearQuery: string
  categories: string
  all: string
  alphabet: string
  alphabetTitle: string
  /** "28 ta atama": shown when nothing is filtered. */
  total: string
  /** "{1} ta atamadan {0} tasi" */
  shown: string
  /** "«{0}» boʻyicha … topilmadi" */
  none: string
  noneCategory: string
  /** "«{0}» soʻzini butun saytdan qidirish" */
  siteSearch: string
  reset: string
  /** "{0} ta" */
  termsIn: string
  /** Plural names for the filter chips ("Shartnomalar"). */
  categoryNames: Record<GlossaryCategory, string>
  /** Singular names for the label on each entry ("Shartnoma"). */
  categoryLabels: Record<GlossaryCategory, string>
}

type Category = GlossaryCategory | ''

const PARAM_Q = 'q'
const PARAM_CATEGORY = 'turkum'

/**
 * Without JavaScript the category radios still filter: these rules hide
 * entries (and emptied letter groups) of other categories. With JavaScript
 * React renders only the matching entries and the rules agree with it.
 */
function noScriptCss(categories: readonly GlossaryCategory[]): string {
  return categories
    .map((c) => {
      const on = `.gl-root:has(input[name="${PARAM_CATEGORY}"][value="${c}"]:checked)`
      return `${on} [data-cat]:not([data-cat="${c}"]),${on} [data-group]:not(:has([data-cat="${c}"])){display:none}`
    })
    .join('')
}

/**
 * Glossary index: live filter by text and category, an A–Z bar in Uzbek
 * alphabet order and the terms grouped by letter. Server-rendered with the
 * full list, so it reads and links correctly before (or without) hydration;
 * the search box is a GET form to the site search.
 */
export function GlossaryBrowser({
  entries,
  letters,
  categories,
  labels,
  searchAction,
  contentLang,
  uiLang,
  aside,
  footer,
}: {
  entries: BrowserEntry[]
  letters: { id: string; label: string }[]
  categories: readonly GlossaryCategory[]
  labels: BrowserLabels
  searchAction: string
  contentLang: string
  uiLang: string
  /** Rail content under the desktop A–Z grid (sticky, keep it short). */
  aside?: React.ReactNode
  /** Notes after the list, in the main column. */
  footer?: React.ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const strip = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('')

  // Pick up state the server could not know: ?q= / ?turkum= links, text typed
  // before hydration, or values restored by the browser on back navigation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get(PARAM_CATEGORY)
    const checked = root.current?.querySelector<HTMLInputElement>(`input[name="${PARAM_CATEGORY}"]:checked`)?.value
    const cat = [fromUrl, checked].find((c): c is GlossaryCategory => !!c && (categories as string[]).includes(c)) ?? ''
    const q = params.get(PARAM_Q) ?? input.current?.value ?? ''
    if (input.current && input.current.value !== q) input.current.value = q
    const radio = root.current?.querySelector<HTMLInputElement>(`input[name="${PARAM_CATEGORY}"][value="${cat}"]`)
    if (radio) radio.checked = true
    setQuery(q)
    setCategory(cat)
  }, [categories])

  // The A–Z strip sticks right under whatever part of the site header is
  // still on screen (the header bar may or may not stay pinned).
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const bar = document.querySelector<HTMLElement>('header .sticky')
    let frame = 0
    const update = () => {
      frame = 0
      const bottom = bar ? Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) : 0
      el.style.top = `${bottom}px`
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  // Keep the address shareable: /lugat?q=ijara&turkum=shartnoma
  function syncUrl(q: string, cat: Category) {
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set(PARAM_Q, q.trim())
    else params.delete(PARAM_Q)
    if (cat) params.set(PARAM_CATEGORY, cat)
    else params.delete(PARAM_CATEGORY)
    const qs = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }

  const words = useMemo(() => searchWords(query), [query])
  const textMatches = useMemo(
    () => entries.filter((e) => matchesAll(e.haystack, words)),
    [entries, words],
  )
  const visible = useMemo(
    () => (category ? textMatches.filter((e) => e.category === category) : textMatches),
    [textMatches, category],
  )
  const counts = useMemo(() => {
    const out: Record<string, number> = { '': textMatches.length }
    for (const c of categories) out[c] = textMatches.filter((e) => e.category === c).length
    return out
  }, [textMatches, categories])
  const groups = useMemo(
    () =>
      letters
        .map((l) => ({ letter: l, items: visible.filter((e) => e.letter === l.id) }))
        .filter((g) => g.items.length > 0),
    [letters, visible],
  )
  const available = new Set(groups.map((g) => g.letter.id))
  const filtered = words.length > 0 || category !== ''
  const q = query.trim()
  const siteSearchHref = `${searchAction}?q=${encodeURIComponent(q)}`

  function onQuery(value: string) {
    setQuery(value)
    syncUrl(value, category)
  }
  function onCategory(value: Category) {
    setCategory(value)
    syncUrl(query, value)
  }
  function clearQuery() {
    if (input.current) input.current.value = ''
    onQuery('')
    input.current?.focus()
  }
  function reset() {
    if (input.current) input.current.value = ''
    const all = root.current?.querySelector<HTMLInputElement>(`input[name="${PARAM_CATEGORY}"][value=""]`)
    if (all) all.checked = true
    setQuery('')
    setCategory('')
    syncUrl('', '')
    input.current?.focus()
  }

  const letterLink = (l: { id: string; label: string }, className: string, offClassName: string) =>
    available.has(l.id) ? (
      <a href={`#harf-${l.id}`} className={className}>
        {l.label}
      </a>
    ) : (
      <span aria-hidden="true" className={offClassName}>
        {l.label}
      </span>
    )

  return (
    <div ref={root} className="gl-root">
      <style href="muomalat-glossary-filter" precedence="default">
        {noScriptCss(categories)}
      </style>

      <div className="grid gap-x-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          {/* Search: live filter with JS, site search without */}
          <form
            action={searchAction}
            method="get"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              input.current?.blur()
            }}
          >
            <label htmlFor="gl-q" className="mb-1.5 block text-meta font-semibold text-ink">
              {labels.searchLabel}
            </label>
            <div className="flex max-w-xl">
              <div className="relative min-w-0 flex-1">
                <Icon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
                />
                <input
                  ref={input}
                  id="gl-q"
                  name={PARAM_Q}
                  type="search"
                  defaultValue=""
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  placeholder={labels.searchPlaceholder}
                  aria-describedby="gl-q-hint"
                  aria-controls="gl-results"
                  onChange={(e) => onQuery(e.target.value)}
                  className={`h-11 w-full rounded-l-[2px] border border-ink-3 bg-paper pl-10 ${query ? 'pr-11' : 'pr-2'} text-ui text-ink placeholder:text-ink-3 focus:border-emerald focus:outline-2 focus:outline-offset-0 focus:outline-emerald [&::-webkit-search-cancel-button]:hidden`}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={clearQuery}
                    className="absolute top-0 right-0 inline-flex size-11 items-center justify-center text-ink-3 hover:text-ink"
                  >
                    <Icon name="close" size={18} title={labels.clearQuery} />
                  </button>
                ) : null}
              </div>
              <button type="submit" className={buttonClass('primary', 'md', 'shrink-0 rounded-l-none max-sm:px-3')}>
                {labels.submit}
              </button>
            </div>
            <p id="gl-q-hint" className="mt-1.5 text-meta text-ink-3">
              {labels.searchHint}
            </p>
          </form>

          {/* Category filter */}
          <fieldset className="mt-5 min-w-0">
            <legend className="label-caps mb-2 text-ink-3">{labels.categories}</legend>
            <div className="scroll-x -mx-4 flex gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {(['', ...categories] as Category[]).map((c) => (
                <label
                  key={c || 'all'}
                  className="relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[2px] border border-rule-strong px-3 text-meta font-semibold text-ink-2 select-none hover:border-ink hover:text-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald"
                >
                  <input
                    type="radio"
                    name={PARAM_CATEGORY}
                    value={c}
                    defaultChecked={c === ''}
                    onChange={() => onCategory(c)}
                    className="peer sr-only"
                  />
                  <Icon name="check" size={14} className="-ml-0.5 hidden peer-checked:block" />
                  <span>{c ? labels.categoryNames[c] : labels.all}</span>
                  {/* ink-3 (5.6:1) on paper; inverted with the chip when selected */}
                  <span className="figures font-normal text-ink-3 peer-checked:text-paper/80">{counts[c]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* A–Z: sticky strip under the header on phones and tablets */}
          <nav
            ref={strip}
            aria-label={labels.alphabet}
            className="sticky top-0 z-30 -mx-4 mt-5 border-y border-rule bg-paper md:-mx-6 lg:hidden"
          >
            <ul className="scroll-x flex px-2 md:px-4">
              {letters.map((l) => (
                <li key={l.id} className="shrink-0">
                  {letterLink(
                    l,
                    'inline-flex h-11 min-w-10 items-center justify-center px-1.5 text-ui font-semibold text-ink hover:text-emerald',
                    'inline-flex h-11 min-w-10 items-center justify-center px-1.5 text-ui text-rule-strong',
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Count and status */}
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p role="status" aria-live="polite" aria-atomic="true" className="text-meta text-ink-3">
              {filtered ? fill(labels.shown, visible.length, entries.length) : labels.total}
            </p>
            {filtered && visible.length > 0 ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-9 items-center gap-1 text-meta font-semibold text-emerald hover:text-emerald-ink"
              >
                <Icon name="close" size={14} />
                {labels.reset}
              </button>
            ) : null}
          </div>
          {q && visible.length > 0 ? (
            <p className="mt-1 text-meta">
              <Link href={siteSearchHref} className="text-link">
                {fill(labels.siteSearch, q)}
              </Link>
            </p>
          ) : null}

          {/* Terms by letter */}
          <div id="gl-results" lang={contentLang} className="mt-4">
            {groups.map(({ letter, items }) => (
              <section
                key={letter.id}
                aria-labelledby={`harf-${letter.id}`}
                data-group={letter.id}
                className="border-t-2 border-ink pt-2 pb-2 md:grid md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-x-6 md:pt-3"
              >
                <div className="flex items-baseline justify-between gap-3 md:block">
                  <h2
                    id={`harf-${letter.id}`}
                    className="scroll-mt-8 font-display text-h1 leading-none font-semibold text-ink lg:scroll-mt-4"
                  >
                    {letter.label}
                  </h2>
                  <p aria-hidden="true" lang={uiLang} className="figures text-meta text-ink-3 md:mt-2">
                    {fill(labels.termsIn, items.length)}
                  </p>
                </div>
                <ul className="mt-1 divide-y divide-rule md:mt-0">
                  {items.map((e) => (
                    <li
                      key={e.slug}
                      data-cat={e.category}
                      className="py-4 first:pt-3 sm:grid sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-x-6 md:first:pt-0.5"
                    >
                      <div className="min-w-0">
                        <h3 className="font-display text-h4 font-semibold">
                          <Link href={e.href} prefetch={false} className="headline-link">
                            {e.term}
                          </Link>
                        </h3>
                        {e.en || e.ru ? (
                          <p className="mt-1 text-meta text-ink-3">
                            {e.en ? <span lang="en">{e.en}</span> : null}
                            {e.en && e.ru ? <span aria-hidden="true"> · </span> : null}
                            {e.ru ? <span lang="ru">{e.ru}</span> : null}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-2 min-w-0 sm:mt-0.5">
                        <p lang={uiLang} className="label-caps text-emerald">
                          {labels.categoryLabels[e.category]}
                        </p>
                        <p className="mt-1 text-ui text-ink-2">{e.short}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {groups.length === 0 ? (
              <div lang={uiLang} className="border-t-2 border-ink pt-5 pb-2">
                <p className="font-display text-h3 font-semibold text-ink">
                  {q ? fill(labels.none, q) : labels.noneCategory}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {q ? (
                    <Link href={siteSearchHref} className={buttonClass('primary', 'md', 'max-w-full !whitespace-normal text-left')}>
                      <Icon name="search" size={18} className="shrink-0" />
                      {fill(labels.siteSearch, q)}
                    </Link>
                  ) : null}
                  <button type="button" onClick={reset} className={buttonClass('secondary', 'md')}>
                    {labels.reset}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {footer ? <div className="mt-12 md:mt-16">{footer}</div> : null}
        </div>

        {/* Rail: A–Z grid on desktop, then a short note */}
        <aside className="mt-12 lg:col-span-4 lg:mt-0">
          <div className="space-y-8 lg:sticky lg:top-20">
            <nav aria-label={labels.alphabet} className="hidden lg:block">
              <p aria-hidden="true" className="label-caps text-ink-3">
                {labels.alphabetTitle}
              </p>
              <ul className="mt-2 grid grid-cols-7 border-t border-l border-rule">
                {letters.map((l) => (
                  <li key={l.id} className="border-r border-b border-rule">
                    {letterLink(
                      l,
                      'flex h-10 items-center justify-center text-ui font-semibold text-ink hover:bg-paper-2 hover:text-emerald',
                      'flex h-10 items-center justify-center text-ui text-rule-strong',
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            {aside}
          </div>
        </aside>
      </div>
    </div>
  )
}
