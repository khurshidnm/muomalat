import { formatLabels, type Field } from 'payload'
import { describe, expect, it } from 'vitest'

import configPromise from '@payload-config'
import { articleBlocks, inlineBlocks } from '@/payload/blocks'

/**
 * F8 in part (CMS-SPEC §16): every list in the admin names its rows in Uzbek.
 * An array without `labels` gets Payload's English default, the field name
 * singularised ("Column qoʻshish"), and so does a blocks field. Sanitising
 * fills `labels` in, so the check compares them with that default.
 */
type AnyField = Field & { name?: string; type: string; labels?: unknown; fields?: Field[]; tabs?: { fields: Field[] }[]; blocks?: { slug: string; fields: Field[] }[] }

function unlabelled(fields: Field[], path: string, out: string[]) {
  for (const f of fields as AnyField[]) {
    const here = f.name ? `${path}.${f.name}` : path
    if (f.type === 'array' || f.type === 'blocks') {
      const labels = f.labels as { singular?: unknown } | undefined
      if (!labels || (f.name && labels.singular === formatLabels(f.name).singular)) out.push(here)
    }
    if (f.fields) unlabelled(f.fields, here, out)
    if (f.tabs) for (const t of f.tabs) unlabelled(t.fields, here, out)
    if (f.blocks) for (const b of f.blocks) unlabelled(b.fields, `${here}[${b.slug}]`, out)
  }
}

describe('admin labels', () => {
  it('every array names its rows in Uzbek', async () => {
    const config = await configPromise
    const out: string[] = []
    for (const c of config.collections) if (!c.slug.startsWith('payload-')) unlabelled(c.fields, c.slug, out)
    for (const g of config.globals) unlabelled(g.fields, `global:${g.slug}`, out)
    // The rich-text blocks (src/payload/blocks), which the Lexical editors carry.
    for (const b of [...articleBlocks, ...(inlineBlocks as { slug: string; fields: Field[] }[])]) unlabelled(b.fields, `block:${b.slug}`, out)
    // Payload's own session list on users is hidden from the admin.
    expect(out.filter((p) => p !== 'users.sessions')).toEqual([])
  })
})
