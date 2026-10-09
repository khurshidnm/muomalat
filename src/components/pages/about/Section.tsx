import { SectionHeader } from '@/components/ui/SectionHeader'

/** About-page section: anchor id on the section, 2px ink head, aria-labelledby. */
export function AboutSection({
  id,
  title,
  description,
  children,
  className = '',
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 ${className}`}>
      <SectionHeader id={`${id}-title`} title={title} description={description} />
      {children}
    </section>
  )
}

/** No-break space before a spaced em dash, so a line never starts with "—". */
export function keepDash(text: string): string {
  return text.replace(/ — /g, '\u00a0— ')
}

/** Serif running text at reading size, held to the article measure. */
export function Prose({ paragraphs, className = '' }: { paragraphs: readonly string[]; className?: string }) {
  return (
    <div className={`max-w-measure space-y-4 font-serif text-[1.125rem] leading-relaxed text-ink-2 ${className}`}>
      {paragraphs.map((text) => (
        <p key={text}>{keepDash(text)}</p>
      ))}
    </div>
  )
}

/** Small brass diamond used as a list bullet. */
export function Diamond({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-1.5 shrink-0 rotate-45 bg-brass ${className}`} />
}
