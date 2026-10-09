import type { PayloadHandler, PayloadRequest } from 'payload'
import { addDataAndFileToRequest, commitTransaction, initTransaction, killTransaction } from 'payload'

import { ARTICLES, type Doc, type Id, isolated } from '../hooks/workflow/shared'
import { errorResponse } from './transition'

/**
 * "Oʻzbekchadan nusxalash" (copy from Uzbek), CMS-SPEC §3.3 tab Tarjima:
 * `POST /api/articles/:id/copy-from-uz` with `{ locale: 'ru' | 'en', overwrite?: string[], machine?: boolean }`.
 *
 * Replaces Payload's Copy to locale, which publishes at once when the latest
 * version is published, copies the translation status (an `approved`
 * included), skips an empty Lexical body and overwrites every field
 * (PHASE0 item 16). This action:
 * - copies only title, kicker, lead, body and image caption from uz;
 * - fills a field when it is empty in the target locale (an empty Lexical
 *   root counts as empty), or overwrites it when the translator asks;
 * - always saves a draft (`draft: true`, `_status: 'draft'`);
 * - leaves the translation group, SEO, sponsorship and corrections alone; the
 *   translation hook sets the status to `in_edit` (`machine_draft` when
 *   machine translation was used) and records the translator.
 * Who may do it is decided by the articles hooks (the translator of that
 * locale, editors, the editor-in-chief; commercial on sponsored stories).
 */

export const COPY_FIELDS = ['title', 'kicker', 'lead', 'body', 'imageCaption'] as const
type CopyField = (typeof COPY_FIELDS)[number]

type Body = { locale?: string; overwrite?: string[] | boolean; machine?: boolean }

/** Empty text, or a Lexical tree with no text in it. */
export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (typeof v === 'object' && 'root' in (v as object)) {
    const hasContent = (n: { type?: string; text?: unknown; children?: unknown[] }): boolean =>
      (n.type === 'text' && typeof n.text === 'string' && n.text.trim() !== '') ||
      n.type === 'block' ||
      n.type === 'inlineBlock' ||
      (Array.isArray(n.children) && n.children.some((c) => hasContent(c as never)))
    return !hasContent((v as { root: never }).root)
  }
  return false
}

const read = async (req: PayloadRequest, id: Id, locale: string) =>
  (await req.payload.findByID({
    collection: ARTICLES,
    id,
    draft: true,
    depth: 0,
    locale: locale as 'uz',
    fallbackLocale: false,
    overrideAccess: false,
    req: isolated(req),
  })) as unknown as Doc

export const copyFromUzHandler: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ errors: [{ message: 'Tizimga kiring.' }] }, { status: 401 })
  const raw = req.routeParams?.id
  const id = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : (raw as Id | undefined)
  if (id === undefined) return Response.json({ errors: [{ message: 'Maqola koʻrsatilmagan.' }] }, { status: 400 })
  if (req.data === undefined) await addDataAndFileToRequest(req)
  const body = (req.data ?? {}) as Body
  const locale = body.locale
  if (locale !== 'ru' && locale !== 'en') return Response.json({ errors: [{ message: 'Tilni tanlang: ru yoki en.' }] }, { status: 400 })
  const overwrite = new Set<string>(body.overwrite === true ? COPY_FIELDS : Array.isArray(body.overwrite) ? body.overwrite : [])

  let committed = false
  try {
    await initTransaction(req)
    const uz = await read(req, id, 'uz')
    const target = await read(req, id, locale)
    const data: Doc = { _status: 'draft' }
    const copied: CopyField[] = []
    const skipped: CopyField[] = []
    for (const f of COPY_FIELDS) {
      if (isEmptyValue(uz[f])) continue
      if (isEmptyValue(target[f]) || overwrite.has(f)) {
        data[f] = uz[f]
        copied.push(f)
      } else skipped.push(f)
    }
    if (copied.length) {
      // The target locale is not the request's: an isolated request keeps the outer locale intact (payloadcms#18246).
      await req.payload.update({
        collection: ARTICLES,
        id,
        locale,
        data: data as never,
        draft: true,
        depth: 0,
        overrideAccess: false,
        req: isolated(req),
        context: { copyFromUz: { machine: Boolean(body.machine) } },
      })
    }
    await commitTransaction(req)
    committed = true
    return Response.json({
      message: copied.length ? `Nusxalandi: ${copied.join(', ')}. Qoralama saqlandi.` : 'Nusxalanadigan boʻsh maydon yoʻq.',
      copied,
      skipped,
    })
  } catch (error) {
    if (!committed) await killTransaction(req)
    return errorResponse(error)
  }
}
