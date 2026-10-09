import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { isLocale } from '../../../i18n/config'
import { contactMessageRef } from '../../personalData/retention'
import { siteUrl } from '../../personalData/tokens'

/** Hosts whose links point at our own stories. */
function ownHosts(): Set<string> {
  const hosts = new Set(['muomalat.uz', 'www.muomalat.uz'])
  try {
    hosts.add(new URL(siteUrl()).hostname)
  } catch {}
  return hosts
}

/** The article slug in a muomalat.uz story link (/<rubric>/<slug>, any edition), or null. */
export function storySlugFromUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  if (!ownHosts().has(url.hostname.toLowerCase())) return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] && isLocale(parts[0])) parts.shift()
  return parts.length === 2 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(parts[1]) ? parts[1] : null
}

/**
 * `article` is resolved from the submitted link when it is one of our
 * published stories (CMS-SPEC §3.14). Runs on create only: the link is part
 * of what the person sent and does not change afterwards.
 */
export const resolveArticle: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.article) return data
  const slug = storySlugFromUrl(data.url)
  if (!slug) return data
  const { docs } = await req.payload.find({
    collection: 'articles',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    // Same transaction; no locale is passed, so the outer request's locale is untouched (payloadcms#18246).
    req,
  })
  if (docs[0]) data.article = docs[0].id
  return data
}

/**
 * A `tuzatish` (correction) message opens an `error_report` item in the
 * requests register (CMS-SPEC §3.14, test L6), in the same transaction, so a
 * message is never stored without its register entry. The requests
 * collection derives `dueAt` (received + 3 days). The item keeps the
 * requester's details itself and points back only with an opaque text
 * reference in `documents`, never a relationship (§13.7); the retention job
 * keeps the message for as long as the item is kept.
 *
 * Also when the editor-in-chief or an admin later moves a message to
 * `tuzatish`, if it has no item yet.
 */
export const openCorrectionRequest: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (doc.topic !== 'tuzatish') return doc
  if (operation === 'update' && previousDoc?.topic === 'tuzatish') return doc
  const ref = contactMessageRef(doc.id)
  if (operation === 'update') {
    const { totalDocs } = await req.payload.count({ collection: 'requests', where: { documents: { equals: ref } }, overrideAccess: true, req })
    if (totalDocs) return doc
  }
  const article = typeof doc.article === 'object' && doc.article ? doc.article.id : doc.article
  await req.payload.create({
    collection: 'requests',
    overrideAccess: true,
    depth: 0,
    req,
    data: {
      kind: 'error_report',
      article: article ?? null,
      requesterName: doc.name,
      requesterContact: doc.email,
      receivedAt: doc.createdAt,
      receivedAt_tz: 'Asia/Tashkent',
      channel: 'site_form',
      summary: `Aloqa shakli orqali tuzatish soʻrovi (aloqa xabari №${doc.id}).\n\n${String(doc.message ?? '').slice(0, 2000)}`,
      documents: ref,
      status: 'new',
    },
  })
  return doc
}
