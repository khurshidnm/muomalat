import type { Payload } from 'payload'

import { flushNotices, takeNotices } from '../../payload/hooks/workflow/notify'
import { ensureWorkflowPresets } from '../../payload/hooks/workflow/presets'
import { ARTICLES, type Doc, type Id, idOf, nowIso, type StaffNotice, type TransitionRequest } from '../../payload/hooks/workflow/shared'
import { isReadOnly } from '../../payload/security/readOnly'
import type { Job } from '../index'

/**
 * Our own scheduler (CMS-SPEC §5.11); Payload's `schedulePublish` stays off.
 * Every 30 seconds it publishes the `scheduled` stories whose `scheduledAt`
 * has come, each as the user who scheduled it, through the Local API with
 * `overrideAccess: false`: every rule of §5.3 runs again at publish time
 * (approval and its hash, ¬author, the editor-in-chief tiers, the embargo,
 * the publish validation). The call publishes the latest draft's content
 * (PHASE0 item 22).
 *
 * It fails closed: if the scheduling user has been disabled, or any rule
 * refuses, the story goes back to `ready` with `scheduleError`, and the desk
 * and the editor-in-chief are told. The worker runs outside a request, so
 * `after()` is unavailable; cache invalidation goes through the outbox
 * (§8.4), and notices are sent here once each publish has committed.
 */

export interface SchedulerResult {
  published: Id[]
  failed: { id: Id; error: string }[]
}

const message = (error: unknown) => {
  const e = error as { message?: string; data?: { errors?: { message?: string }[] } }
  const detail = e?.data?.errors?.map((x) => x.message).filter(Boolean).join(' ')
  return (detail || e?.message || 'Nomaʼlum xato').slice(0, 1000)
}

async function markScheduleFailed(payload: Payload, doc: Doc, error: string) {
  const history = ((doc.workflowHistory as Doc[] | undefined) ?? []).map((r) => ({ ...r }))
  history.push({ from: 'scheduled', to: 'ready', by: null, at: nowIso(), comment: `Rejali chop etish bajarilmadi: ${error}`.slice(0, 1000) })
  // A system write: the workflow hooks skip it, the audit concern records schedule.fail from scheduleError.
  await payload.update({
    collection: ARTICLES,
    id: doc.id as Id,
    data: { _status: 'draft', workflowStatus: 'ready', scheduledBy: null, scheduleError: error, workflowHistory: history } as never,
    draft: true,
    depth: 0,
    overrideAccess: true,
    context: { trustedInternal: true, workflowSync: 'schedule-failed' },
  })
  const notice: StaffNotice = {
    kind: 'schedule_failed',
    audience: 'desk',
    articleId: doc.id as Id,
    title: (doc.title as string | undefined) ?? undefined,
    text: `Rejali chop etish bajarilmadi, maqola «Tayyor» holatiga qaytdi: ${error}`,
  }
  await flushNotices(payload, [notice, { ...notice, audience: 'eic' }])
}

export async function publishDue(payload: Payload, now = Date.now()): Promise<SchedulerResult> {
  const result: SchedulerResult = { published: [], failed: [] }
  const { docs } = await payload.find({
    collection: ARTICLES,
    draft: true,
    depth: 0,
    limit: 50,
    sort: 'scheduledAt',
    overrideAccess: true,
    where: { and: [{ workflowStatus: { equals: 'scheduled' } }, { scheduledAt: { less_than_equal: new Date(now).toISOString() } }] },
    context: { trustedInternal: true },
  })
  for (const doc of docs as unknown as Doc[]) {
    const id = doc.id as Id
    try {
      const scheduler = idOf(doc.scheduledBy)
      const user =
        scheduler === undefined
          ? null
          : ((await payload.findByID({ collection: 'users', id: scheduler, depth: 0, overrideAccess: true, disableErrors: true })) as Doc | null)
      if (!user) throw new Error('Rejalashtirgan foydalanuvchi topilmadi.')
      if (user.active === false) throw new Error('Rejalashtirgan foydalanuvchi faol emas: maqolani boshqa muharrir qayta rejalashtirsin.')
      const transition: TransitionRequest = { id: 'publish', from: 'scheduled', to: 'published' }
      const context: Record<string, unknown> = { trustedInternal: true, scheduledRun: true, noticesFlushedBy: 'worker', transition }
      await payload.update({
        collection: ARTICLES,
        id,
        data: { _status: 'published' } as never,
        draft: false,
        depth: 0,
        user: user as never,
        overrideAccess: false,
        context,
      })
      result.published.push(id)
      await flushNotices(payload, takeNotices(context))
    } catch (error) {
      const text = message(error)
      result.failed.push({ id, error: text })
      payload.logger.warn(`scheduler: article ${String(id)} not published: ${text}`)
      try {
        await markScheduleFailed(payload, doc, text)
      } catch (markError) {
        payload.logger.error({ err: markError, msg: `scheduler: could not record the failure of article ${String(id)}` })
      }
    }
  }
  return result
}

let presetsChecked = false

export const job: Job = {
  name: 'scheduler',
  intervalMs: 30_000,
  run: async (payload) => {
    // The newsroom's list views (§5.14) are seeded once per worker start; new staff get "Mening ishlarim" on the next start.
    if (!presetsChecked) {
      presetsChecked = true
      await ensureWorkflowPresets(payload).catch((err) => payload.logger.warn({ err, msg: 'scheduler: list views not seeded' }))
    }
    // Read-only mode (§12.10) pauses publishing: due stories wait and go out on the first run after it ends.
    if (await isReadOnly({ payload })) {
      payload.logger.info('scheduler: read-only mode; no scheduled publication this run')
      return
    }
    await publishDue(payload)
  },
}
