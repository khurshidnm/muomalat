/** Pull quote: serif italic, brass rule, speaker in small caps. */
export function PullQuote({ text, cite, role }: { text: string; cite?: string; role?: string }) {
  return (
    <figure className="breakout my-9! max-w-measure border-t-2 border-brass pt-4 md:my-11!">
      <blockquote>
        <p className="font-display text-[1.5rem] leading-[1.28] font-medium text-ink italic md:text-[1.875rem]" style={{ fontVariationSettings: '"opsz" 40' }}>
          «{text.replace(/^«|»$/g, '')}»
        </p>
      </blockquote>
      {cite ? (
        <figcaption className="mt-3 font-sans text-meta text-ink-3">
          <span className="font-semibold text-ink">{cite}</span>
          {role ? <>, {role}</> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
