import type { CollectionSlug, Payload, Where } from 'payload'

import { type Doc, type Id } from './shared'

/**
 * The article list views every newsroom member gets (CMS-SPEC §5.14), as
 * Payload query presets (`enableQueryPresets` on articles). Shared presets
 * are readable by everyone and changed only by the editor-in-chief who owns them;
 * "Mening ishlarim" (my work) needs the user, which a preset cannot hold as
 * a relative "me", so each staff member gets their own private copy.
 *
 * Presets filter on stored fields only: a virtual field cannot be filtered,
 * and a preset cannot hold a relative "now" (§5.10), so "Embargolar" lists
 * every story with an embargo set, sorted by release time, and the badge
 * shows which are still active.
 */

const PRESETS = 'payload-query-presets' as CollectionSlug

const cols = (...names: string[]) => names.map((accessor) => ({ accessor, active: true }))
const BASE = ['title', 'workflowStatus', 'rubric', 'authors', 'assignee', 'dueAt', 'updatedAt']

export const SHARED_PRESETS: { title: string; where: Where; columns: { accessor: string; active: boolean }[] }[] = [
  { title: 'Tahrir navbati', where: { workflowStatus: { equals: 'in_edit' } }, columns: cols('title', 'deskEditor', 'submittedBy', 'submittedAt', 'rubric', 'dueAt') },
  { title: 'Tayyor', where: { workflowStatus: { equals: 'ready' } }, columns: cols('title', 'approvedBy', 'approvedAt', 'rubric', 'embargo') },
  { title: 'Rejalashtirilgan', where: { workflowStatus: { equals: 'scheduled' } }, columns: cols('title', 'scheduledAt', 'scheduledBy', 'embargo', 'rubric') },
  {
    title: 'Embargolar',
    where: { or: [{ 'embargo.indefinite': { equals: true } }, { 'embargo.until': { exists: true } }] },
    columns: cols('title', 'embargo', 'workflowStatus', 'rubric'),
  },
  {
    title: 'Ikkinchi oʻqish',
    where: { and: [{ 'secondRead.required': { equals: true } }, { 'secondRead.doneAt': { exists: false } }] },
    columns: cols('title', 'secondRead', 'publishedBy', 'rubric'),
  },
  {
    title: 'Tarjima kutilmoqda',
    where: { and: [{ workflowStatus: { in: ['published'] } }, { 'translation.status': { in: ['machine_draft', 'in_edit', 'outdated'] } }] },
    columns: cols('title', 'translation', 'rubric', 'updatedAt'),
  },
  { title: 'Yuridik koʻrik', where: { needsLegal: { equals: 'required' } }, columns: cols(...BASE) },
  { title: 'Homiylik', where: { 'sponsored.enabled': { equals: true } }, columns: cols('title', 'workflowStatus', 'sponsored', 'updatedAt') },
]

const myWork = (userId: Id): Where => ({
  and: [
    { or: [{ assignee: { equals: userId } }, { _authorUsers: { in: [userId] } }] },
    { workflowStatus: { not_in: ['published', 'withdrawn'] } },
  ],
})

/** Creates the missing presets; safe to run at every start. */
export async function ensureWorkflowPresets(payload: Payload): Promise<number> {
  let created = 0
  const exists = async (where: Where) => (await payload.count({ collection: PRESETS, where, overrideAccess: true })).totalDocs > 0
  const { docs: users } = await payload.find({
    collection: 'users',
    where: { and: [{ active: { not_equals: false } }, { role: { in: ['reporter', 'editor', 'eic', 'commercial'] } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  // Sharing is for editors and the editor-in-chief (payload.config queryPresets.filterConstraints): the
  // editor-in-chief owns the shared views, and only they can change or delete them.
  const owner = (users as unknown as Doc[]).find((u) => u.role === 'eic') ?? (users as unknown as Doc[]).find((u) => u.role === 'editor')
  for (const p of owner ? SHARED_PRESETS : []) {
    if (await exists({ and: [{ title: { equals: p.title } }, { relatedCollection: { equals: 'articles' } }] })) continue
    await payload.create({
      collection: PRESETS,
      data: {
        title: p.title,
        isShared: true,
        relatedCollection: 'articles',
        where: p.where,
        columns: p.columns,
        access: { read: { constraint: 'everyone' }, update: { constraint: 'onlyMe' }, delete: { constraint: 'onlyMe' } },
      } as never,
      overrideAccess: true,
      user: owner as never,
      context: { trustedInternal: true },
    })
    created++
  }
  for (const u of users as unknown as Doc[]) {
    const id = u.id as Id
    if (await exists({ and: [{ title: { equals: 'Mening ishlarim' } }, { 'access.read.users': { in: [id] } }] })) continue
    await payload.create({
      collection: PRESETS,
      data: {
        title: 'Mening ishlarim',
        isShared: false,
        relatedCollection: 'articles',
        where: myWork(id),
        columns: cols(...BASE),
        access: { read: { constraint: 'onlyMe', users: [id] }, update: { constraint: 'onlyMe', users: [id] }, delete: { constraint: 'onlyMe', users: [id] } },
      } as never,
      overrideAccess: true,
      user: u as never,
      context: { trustedInternal: true },
    })
    created++
  }
  return created
}
