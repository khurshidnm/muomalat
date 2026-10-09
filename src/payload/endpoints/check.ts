import type { PayloadHandler, PayloadRequest } from 'payload'
import { addDataAndFileToRequest, APIError, ValidationError } from 'payload'

import { REL } from '../fields/relations'
import { applyFixes } from '../hooks/validate/fixes'
import { checkArticleDoc } from '../hooks/validate/article'
import { ACK_KEY, FIX_KEY, type AckRequest, type FixRecord } from '../hooks/validate/hooks'
import { isolated, toStored, type Doc, type Id, type StoredChecks, type StoredFinding } from '../hooks/validate/shared'

/**
 * `POST /api/articles/:id/check` (CMS-SPEC §7.3), registered on the articles
 * collection by the workflow concern. ChecksPanel calls it. Body:
 *
 *   {}                              run the publish checks on the latest draft, nothing saved
 *   { data: {...} }                 the same, with unsaved form values (this request's locale) on top
 *   { acknowledge: [key…] }         mark warnings as seen; stored in validationWarnings
 *   { unacknowledge: [key…] }       undo that
 *   { fix: [key…] }                 apply the one-click fixes (TXT-1, TXT-2, TXT-7) and save a draft
 *
 * Every read and write runs as the caller (overrideAccess: false): who may
 * read the story may check it, who may save a draft of it may acknowledge or
 * fix. Writes are draft saves (`draft: true`, `_status: 'draft'`), so a live
 * story stays live. Custom endpoints get no automatic auth or body parsing
 * (PHASE0 item 14), so both are done here.
 */

type Body = { data?: Doc; acknowledge?: string[]; unacknowledge?: string[]; fix?: string[] }

const json = (body: unknown, status = 200) => Response.json(body, { status })

const keysOf = (v: unknown) => (Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string').slice(0, 200) : [])

async function latestDraft(req: PayloadRequest, id: Id, locale?: 'uz'): Promise<Doc> {
  return (await req.payload.findByID({
    collection: REL.articles,
    id,
    draft: true,
    depth: 0,
    overrideAccess: false,
    // A different locale than the request's goes through an isolated request (payloadcms#18246).
    ...(locale && req.locale !== locale ? { locale, req: isolated(req) } : { req }),
  })) as unknown as Doc
}

/** Saves a draft carrying an acknowledge or fix record; the validation hook stores the result. */
async function saveDraft(req: PayloadRequest, id: Id, data: Doc, context: Record<string, unknown>, locale?: 'uz'): Promise<StoredChecks | undefined> {
  const doc = (await req.payload.update({
    collection: REL.articles,
    id,
    data: { ...data, _status: 'draft' },
    draft: true,
    depth: 0,
    overrideAccess: false,
    context,
    ...(locale && req.locale !== locale ? { locale, req: isolated(req) } : { req }),
  })) as unknown as Doc
  return doc.validationWarnings as StoredChecks | undefined
}

export const checkHandler: PayloadHandler = async (req) => {
  if (!req.user) return json({ message: 'Avval tizimga kiring.' }, 401)
  const raw = req.routeParams?.id
  const id = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : (raw as Id | undefined)
  if (id === undefined || id === '') return json({ message: 'Maqola koʻrsatilmagan.' }, 400)
  if (req.data === undefined) await addDataAndFileToRequest(req)
  const body = (req.data ?? {}) as Body
  const user = req.user as { id: Id; name?: string; email?: string }

  try {
    const acknowledge = keysOf(body.acknowledge)
    const unacknowledge = keysOf(body.unacknowledge)
    if (acknowledge.length || unacknowledge.length) {
      await latestDraft(req, id) // read access first: a 404/403 is clearer than a failed save
      let stored: StoredChecks | undefined
      for (const [keys, undo] of [[acknowledge, false], [unacknowledge, true]] as const) {
        if (!keys.length) continue
        const ack: AckRequest = { id, keys, undo, by: user.id, byName: user.name ?? user.email }
        stored = await saveDraft(req, id, {}, { [ACK_KEY]: ack })
      }
      return json({ checks: stored })
    }

    const fixKeys = keysOf(body.fix)
    if (fixKeys.length) {
      const uz = await latestDraft(req, id, 'uz')
      const fields = req.payload.collections[REL.articles].config.fields
      const isolatedReq = isolated(req)
      isolatedReq.locale = 'uz'
      const { findings } = await checkArticleDoc({ req: isolatedReq, id, fields, data: {}, originalDoc: uz, gate: 'draft' })
      const chosen = toStored(findings, fields).filter((f) => fixKeys.includes(f.key) && f.fixable)
      if (!chosen.length) return json({ message: 'Tuzatiladigan topilma qolmagan: sahifani yangilang.' }, 409)
      const { data, applied } = applyFixes(uz, chosen)
      const record: FixRecord = { id, entries: applied, by: user.id }
      const stored = await saveDraft(req, id, data, { [FIX_KEY]: record }, 'uz')
      return json({ checks: stored, applied })
    }

    const doc = await latestDraft(req, id)
    const fields = req.payload.collections[REL.articles].config.fields
    const { findings } = await checkArticleDoc({ req, id, fields, data: body.data && typeof body.data === 'object' ? body.data : {}, originalDoc: doc, gate: 'publish' })
    // Acknowledgements live on the stored copy; show them on the fresh result too.
    const previous = new Map(((doc.validationWarnings as StoredChecks | undefined)?.findings ?? []).map((f) => [f.key, f.acknowledged]))
    const list: StoredFinding[] = toStored(findings, fields).map((f) => (f.level === 'warning' && previous.get(f.key) ? { ...f, acknowledged: previous.get(f.key) } : f))
    const checks: StoredChecks = {
      version: 1,
      checkedAt: new Date().toISOString(),
      gate: 'publish',
      errors: list.filter((f) => f.level === 'error').length,
      warnings: list.filter((f) => f.level === 'warning').length,
      findings: list,
      ...((doc.validationWarnings as StoredChecks | undefined)?.fixes ? { fixes: (doc.validationWarnings as StoredChecks).fixes } : {}),
    }
    return json({ checks })
  } catch (error) {
    if (error instanceof ValidationError) return json({ message: error.message, errors: error.data.errors }, 400)
    if (error instanceof APIError) return json({ message: error.message }, error.status)
    throw error
  }
}
