'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

/**
 * Live preview (CMS-SPEC §5.13): when the editor saves in the admin's
 * live-preview pane, Payload posts a message to this frame and the page
 * re-renders on the server with the latest draft.
 */
export function PreviewRefresh({ serverURL }: { serverURL: string }) {
  const router = useRouter()
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
}
