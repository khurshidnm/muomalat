import { Fragment } from 'react'

/** Render a message template, replacing `{0}`, `{1}`… with React nodes (links, placeholders). */
export function Fill({ template, values }: { template: string; values: React.ReactNode[] }) {
  const parts = template.split(/\{(\d)\}/)
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{i % 2 === 1 ? values[Number(part)] : part}</Fragment>
      ))}
    </>
  )
}
