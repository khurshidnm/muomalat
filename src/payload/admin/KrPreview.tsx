'use client'

import { Button, useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

/**
 * Tab "Kirill" (CMS-SPEC §3.3, §5.13): opens the `/kr` (Cyrillic) preview of
 * this draft in a new tab. The `/preview` route authenticates the staff
 * member, checks read access and enables draft mode; `l=kr` renders the
 * transliterated uz text with the `kr.*` overrides.
 */
export const KrPreview: UIFieldClientComponent = () => {
  const { id, collectionSlug } = useDocumentInfo()
  if (!id) return <p style={{ fontSize: 12, color: 'var(--theme-elevation-600)' }}>Kirill koʻrinishi maqola saqlangach ochiladi.</p>
  const href = `/preview?c=${collectionSlug ?? 'articles'}&id=${id}&l=kr`
  return (
    <div style={{ marginBottom: 16 }}>
      <Button buttonStyle="secondary" size="small" el="anchor" url={href} newTab>
        Kirill nashrini koʻrish (/kr)
      </Button>
    </div>
  )
}

export default KrPreview
