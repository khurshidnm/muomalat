/**
 * Marks a value that must be replaced before launch (legal block, contacts).
 * Visible dotted frame + data attribute so QA can grep the rendered HTML.
 */
export function Placeholder({ children, title, lang }: { children: React.ReactNode; title?: string; lang?: string }) {
  return (
    <span
      data-placeholder="true"
      title={title}
      lang={lang}
      className="rounded-[1px] border border-dashed border-brass bg-brass-wash/60 px-1 text-ink-2"
    >
      [{children}]
    </span>
  )
}
