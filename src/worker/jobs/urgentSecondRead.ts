import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { flushNotices } from '../../payload/hooks/workflow/notify'
import { ARTICLES, type Doc, type Id, nowIso } from '../../payload/hooks/workflow/shared'
import type { Job } from '../index'

/**
 * Second-read escalation (CMS-SPEC §5.4): a story published through the
 * urgent fast path, or updated by its author-editor, must be read by another
 * editor within 30 minutes. When `secondRead.dueAt` passes with no reader,
 * the alert escalates to the editor-in-chief, once: the job stamps
 * `secondRead.escalatedAt`, which survives a worker restart. A new second
 * read (another update by its author-editor) clears the stamp.
 */

type Executor = { execute: (q: unknown) => Promise<unknown> }

/**
 * The stamp is a system field written straight to the live row and to the
 * latest version: a Local API update would create a version (and on a story
 * with a pending draft either publish the draft or show a change nobody made).
 */
async function stampEscalated(payload: Payload, id: Id, at: string) {
  const db = (payload.db as unknown as { drizzle: Executor }).drizzle
  await db.execute(sql`UPDATE "articles" SET "second_read_escalated_at" = ${at} WHERE "id" = ${Number(id)} AND "second_read_escalated_at" IS NULL`)
  await db.execute(
    sql`UPDATE "_articles_v" SET "version_second_read_escalated_at" = ${at} WHERE "parent_id" = ${Number(id)} AND "latest" = true AND "version_second_read_escalated_at" IS NULL`,
  )
}

/** Escalated in this process: the fallback if a stamp could not be written. */
const escalated = new Set<string>()

export async function escalateSecondReads(payload: Payload, now = Date.now()): Promise<Id[]> {
  const { docs } = await payload.find({
    collection: ARTICLES,
    draft: true,
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: {
      and: [
        { 'secondRead.required': { equals: true } },
        { 'secondRead.doneAt': { exists: false } },
        { 'secondRead.escalatedAt': { exists: false } },
        { 'secondRead.dueAt': { less_than_equal: new Date(now).toISOString() } },
      ],
    },
    context: { trustedInternal: true },
  })
  const out: Id[] = []
  for (const doc of docs as unknown as Doc[]) {
    const due = String((doc.secondRead as Doc | undefined)?.dueAt ?? '')
    const key = `${String(doc.id)}:${due}`
    if (escalated.has(key)) continue
    escalated.add(key)
    out.push(doc.id as Id)
    try {
      await stampEscalated(payload, doc.id as Id, nowIso())
    } catch (error) {
      payload.logger.warn({ err: error, msg: `urgent-second-read: article ${String(doc.id)} not stamped; escalated again after a restart` })
    }
    await flushNotices(payload, [
      {
        kind: 'second_read_overdue',
        audience: 'eic',
        articleId: doc.id as Id,
        title: (doc.title as string | undefined) ?? undefined,
        text: 'Ikkinchi oʻqish muddati oʻtdi: 30 daqiqada hech kim oʻqimadi.',
      },
    ])
  }
  return out
}

/** Tests: forget what was escalated in this process (the stamps stay). */
export const resetEscalations = () => escalated.clear()

export const job: Job = {
  name: 'urgent-second-read',
  intervalMs: 60_000,
  run: async (payload) => {
    await escalateSecondReads(payload)
  },
}
