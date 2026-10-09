import ObjectID from 'bson-objectid'
import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

import { REL } from '../../fields/relations'
import type { Save } from './save'
import { type Doc, fieldError, forbidden, type Id, idOf, isBlank, isolatedWrite, MINUTE, nowIso, pendingFor, time } from './shared'

/**
 * The corrections log (CMS-SPEC §5.7). Append-only:
 * - every row already stored must still be there, in the same order;
 * - `kind`, `location` and the uz `publicText` of a stored row never change,
 *   except by the editor-in-chief within 30 minutes of the row's creation
 *   (a typo in the note itself), which is audited with before and after;
 * - new rows are added in uz, by an editor or the editor-in-chief who is not
 *   an author, to a story that has been published; they get `createdAt`,
 *   `createdBy` and `approvedBy` here and `versionId` when they are published.
 *
 * Array rows are shared by every locale and matched by id (PHASE0 item 6): a
 * ru save that drops a row, or sends one without its id, would delete the uz
 * text. Both are refused (test F10).
 */
export async function correctionsRules(s: Save): Promise<void> {
  const next = s.data.corrections as Doc[] | undefined | null
  if (!Array.isArray(next)) return
  const prev = ((s.original.corrections as Doc[] | undefined) ?? []).filter((r) => r.id)
  const prevIds = prev.map((r) => String(r.id))
  const nextIds = next.map((r) => (r.id ? String(r.id) : ''))

  let last = -1
  for (const id of prevIds) {
    const at = nextIds.indexOf(id)
    if (at === -1) throw forbidden('Tuzatishlar jurnalidan yozuv oʻchirilmaydi.')
    if (at < last) throw forbidden('Tuzatishlar tartibi oʻzgartirilmaydi.')
    last = at
  }

  const work = pendingFor(s.req, s.id)
  const errors: { path: string; message: string }[] = []
  for (const [i, row] of next.entries()) {
    const stored = row.id ? prev.find((p) => String(p.id) === String(row.id)) : undefined
    if (stored) {
      const changed: string[] = []
      if ((row.kind ?? 'correction') !== (stored.kind ?? 'correction')) changed.push('kind')
      if ((row.location ?? '') !== (stored.location ?? '')) changed.push('location')
      if (s.locale === 'uz' && (row.publicText ?? '') !== (stored.publicText ?? '')) changed.push('publicText')
      if (!changed.length) continue
      const created = time(stored.createdAt)
      if (s.role === 'eic' && created !== undefined && s.now - created <= 30 * MINUTE) {
        work.events.push({
          action: 'correction.amend',
          summary: `corrections[${i}]: ${changed.join(', ')}`,
          before: Object.fromEntries(changed.map((k) => [k, stored[k] ?? null])),
          after: Object.fromEntries(changed.map((k) => [k, row[k] ?? null])),
          locale: s.locale,
        })
        continue
      }
      throw forbidden(
        s.role === 'eic'
          ? 'Tuzatish matnini faqat kiritilganidan keyin 30 daqiqa ichida oʻzgartirish mumkin.'
          : 'Kiritilgan tuzatish oʻzgartirilmaydi: yangi tuzatish yoki aniqlik kiriting.',
      )
    }
    // A new row.
    if (i < last) throw forbidden('Yangi tuzatish jurnal oxiriga qoʻshiladi.')
    if (s.locale !== 'uz') throw forbidden('Yangi tuzatish oʻzbek tilida qoʻshiladi; tarjimasini keyin shu tilda yozing.')
    if (!s.system && s.role !== 'editor' && s.role !== 'eic') {
      throw forbidden('Tuzatishni muharrir kiritadi; muxbir uni «Murojaatlar» orqali taklif qiladi.')
    }
    if (!s.original.firstPublishedAt && !(await s.mainPublished())) {
      throw fieldError(s.req, `corrections.${i}.publicText`, 'Tuzatish faqat chop etilgan maqolaga qoʻshiladi.')
    }
    if (!s.system && (await s.isAuthor(s.actor))) throw forbidden('Muallif oʻz maqolasiga tuzatish kirita olmaydi: buni boshqa muharrir qiladi.')
    if (isBlank(row.publicText)) errors.push({ path: `corrections.${i}.publicText`, message: 'Tuzatishning ochiq matnini oʻzbekcha yozing.' })
    row.id = row.id || new ObjectID().toHexString()
    row.kind = row.kind ?? 'correction'
    row.createdAt = nowIso()
    row.createdBy = s.actor ?? null
    row.approvedBy = s.actor ?? null
    row.versionId = null
    row.telegramAction = 'none'
    work.events.push({ action: 'correction.add', summary: `${row.kind}: ${String(row.publicText ?? '').slice(0, 120)}`, after: { kind: row.kind, location: row.location ?? null } })
  }
  if (errors.length) throw fieldError(s.req, errors)
}

/** Rows that this publish makes public for the first time: not on the live row yet. */
export async function correctionsPublishedNow(s: Save): Promise<Doc[]> {
  const live = await s.mainRow()
  const liveIds = new Set((((live?._status === 'published' ? live.corrections : []) as Doc[] | undefined) ?? []).map((r) => String(r.id)))
  return (((s.data.corrections ?? s.merged.corrections) as Doc[] | undefined) ?? []).filter((r) => r.id && !liveIds.has(String(r.id)))
}

type Executor = { execute: (q: unknown) => Promise<unknown> }

/**
 * After a publish: the published rows get the id of the version that made
 * them public, on the live row and in that version. One column on the array
 * tables is updated directly: a Local API update would create another
 * version, and a partial adapter update rewrites every locale.
 */
export async function stampCorrectionVersion(req: PayloadRequest, articleId: Id, rows: { id: string; request?: Id }[]): Promise<void> {
  if (!rows.length) return
  const { docs } = await req.payload.db.findVersions({
    collection: REL.articles,
    where: { parent: { equals: articleId } },
    sort: '-createdAt',
    limit: 1,
    pagination: false,
    req,
  })
  const versionId = idOf(docs[0]?.id)
  if (versionId !== undefined) {
    const adapter = req.payload.db as unknown as { drizzle: Executor; sessions?: Record<string, { db: Executor }> }
    const tid = req.transactionID instanceof Promise ? await req.transactionID : req.transactionID
    const db = (tid !== undefined && tid !== null && adapter.sessions?.[String(tid)]?.db) || adapter.drizzle
    const ids = sql.join(
      rows.map((r) => sql`${r.id}`),
      sql`, `,
    )
    await db.execute(sql`UPDATE "articles_corrections" SET "version_id" = ${String(versionId)} WHERE "id" IN (${ids}) AND "version_id" IS NULL`)
    await db.execute(
      sql`UPDATE "_articles_v_version_corrections" SET "version_id" = ${String(versionId)} WHERE "_parent_id" = ${Number(versionId)} AND "_uuid" IN (${ids}) AND "version_id" IS NULL`,
    )
  }
  // A correction made from a request closes it (§5.7 "Linked requests").
  for (const r of rows) {
    if (r.request === undefined) continue
    await req.payload.update({
      collection: REL.requests,
      id: r.request,
      data: { decision: 'correction' } as never,
      overrideAccess: true,
      req: isolatedWrite(req),
      context: { workflowSync: 'request-decision' },
    })
  }
}
