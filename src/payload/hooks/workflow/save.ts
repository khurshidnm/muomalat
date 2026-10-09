import type { CollectionSlug, GlobalSlug, PayloadRequest } from 'payload'

import type { Role } from '../../access/roles'
import { REL } from '../../fields/relations'
import { ownsStory } from './editRules'
import {
  actorId,
  actorRole,
  ARTICLES,
  type Doc,
  type Id,
  idOf,
  idsOf,
  isolated,
  overlay,
  stateOf,
  type TransitionRequest,
  wctx,
  type WorkflowContext,
  type WorkflowState,
} from './shared'

/** Top-level localized article fields (§6.2); nested ones are handled where they are used. */
export const LOCALIZED_TOP = ['title', 'kicker', 'lead', 'body', 'imageCaption', 'meta', 'translation'] as const

/**
 * Everything the workflow rules need to know about one article save,
 * computed once per beforeChange. Reads that cost a query are lazy and
 * cached. Every nested read uses an isolated request (payloadcms#18246).
 *
 * `original` is the latest version in the saving locale, not the live row
 * (PHASE0 item 2): whether the story is public right now comes from the main
 * row (`mainRow()`), never from `original._status`.
 */
export interface Save {
  req: PayloadRequest
  operation: 'create' | 'update'
  /** The incoming data. Rules write system fields into it. */
  data: Doc
  original: Doc
  /** `original` overlaid by the incoming data: the document as this save leaves it, in the saving locale. */
  merged: Doc
  id?: Id
  role?: Role
  actor?: Id
  locale: string
  ctx: WorkflowContext
  draftArg: boolean
  restoring: boolean
  /** The stored workflow state, before this save. */
  state: WorkflowState
  transition?: TransitionRequest
  trashing: boolean
  untrashing: boolean
  /** This write sets the main row to published (§5.3: `data._status === 'published'`, except a restore as draft). */
  publishing: boolean
  /** No user: a trusted in-process caller (the worker passes the scheduling user instead). */
  system: boolean
  sponsored(): boolean
  now: number
  mainRow(): Promise<Doc | undefined>
  /** The story is public right now (main row published). */
  mainPublished(): Promise<boolean>
  /** This write takes a public story off the site (§5.8 detection). */
  unpublishing(): Promise<boolean>
  /** The latest version in uz (the stored uz text during a ru/en save). */
  storedUz(): Promise<Doc>
  /** uz values after this save, with this save's non-localized values. */
  uz(): Promise<Doc>
  /** The latest version with every locale (`{ title: { uz, ru, en } }`). */
  allLocales(): Promise<Doc>
  authorDocs(): Promise<Doc[]>
  /** Staff accounts linked to the bylines after this save (authors.user). */
  authorUsers(): Promise<Id[]>
  isAuthor(user: unknown): Promise<boolean>
  rules(): Promise<Doc>
  rubricSlug(): Promise<string | undefined>
}

const once = <T>(fn: () => Promise<T>) => {
  let p: Promise<T> | undefined
  return () => (p ??= fn())
}

export function buildSave(args: { req: PayloadRequest; data: Doc; originalDoc?: Doc; operation: 'create' | 'update' }): Save {
  const { req, data, operation } = args
  const original = (args.originalDoc ?? {}) as Doc
  const ctx = wctx(req)
  const id = idOf(original.id)
  const draftArg = Boolean(ctx.draftArg)
  const restoring = Boolean(ctx.isRestoringVersion)
  const merged = overlay(original, data)
  const effectiveStatus = (data._status as string | undefined) ?? (draftArg ? 'draft' : ((original._status as string | undefined) ?? 'draft'))
  const publishing = effectiveStatus === 'published' && !(restoring && draftArg)
  const trashing = data.deletedAt !== undefined && data.deletedAt !== null && !original.deletedAt
  const untrashing = 'deletedAt' in data && data.deletedAt === null && Boolean(original.deletedAt)
  const locale = (req.locale as string | undefined) ?? 'uz'

  const read = (opts: { draft: boolean; locale: string }) =>
    id === undefined
      ? Promise.resolve(undefined)
      : (req.payload.findByID({
          collection: ARTICLES,
          id,
          draft: opts.draft,
          locale: opts.locale as 'uz',
          fallbackLocale: false,
          depth: 0,
          trash: true,
          overrideAccess: true,
          disableErrors: true,
          req: isolated(req),
        }) as Promise<Doc | null>).then((d) => d ?? undefined)

  const mainRow = once(() => read({ draft: false, locale: 'uz' }))
  const mainPublished = once(async () => (await mainRow())?._status === 'published')
  const storedUz = once(async () => (locale === 'uz' ? original : ((await read({ draft: true, locale: 'uz' })) ?? {})))
  const allLocales = once(async () => (await read({ draft: true, locale: 'all' })) ?? {})

  const uz = once(async (): Promise<Doc> => {
    if (locale === 'uz') return merged
    const shared: Doc = { ...merged }
    for (const k of LOCALIZED_TOP) delete shared[k]
    const base = await storedUz()
    if (locale === 'all') {
      const fromData: Doc = {}
      for (const k of LOCALIZED_TOP) {
        const v = (data[k] as Doc | undefined)?.uz
        if (v !== undefined) fromData[k] = v
      }
      return overlay(overlay(base, shared), fromData)
    }
    return overlay(base, shared)
  })

  const authorDocs = once(async () => {
    const ids = idsOf(merged.authors)
    if (!ids.length) return []
    const { docs } = await req.payload.find({
      collection: REL.authors,
      where: { id: { in: ids } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req: isolated(req),
    })
    return docs as unknown as Doc[]
  })
  // A byline's staff link counts from the moment it is saved, published or not (Articles `_authorUsers` does the same).
  const authorUsers = once(async () => {
    const ids = idsOf(merged.authors)
    const users = new Set((await authorDocs()).map((a) => idOf(a.user)).filter((x): x is Id => x !== undefined).map(String))
    if (ids.length) {
      const { docs } = await req.payload.find({
        collection: REL.authors,
        where: { id: { in: ids } },
        depth: 0,
        pagination: false,
        draft: true,
        overrideAccess: true,
        req: isolated(req),
      })
      for (const d of docs as unknown as Doc[]) {
        const uid = idOf(d.user)
        if (uid !== undefined) users.add(String(uid))
      }
    }
    return [...users].map((u) => (/^\d+$/.test(u) ? Number(u) : u)) as Id[]
  })

  const rules = once(
    async () => (await req.payload.findGlobal({ slug: 'editorial-rules' as GlobalSlug, depth: 0, overrideAccess: true, req: isolated(req) })) as unknown as Doc,
  )
  const rubricSlug = once(async () => {
    const rid = idOf(merged.rubric)
    if (rid === undefined) return undefined
    const r = (await req.payload.findByID({
      collection: REL.rubrics as CollectionSlug,
      id: rid,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      req: isolated(req),
    })) as Doc | null
    return (r?.slug as string | undefined) ?? undefined
  })

  const s: Save = {
    req,
    operation,
    data,
    original,
    merged,
    id,
    role: actorRole(req),
    actor: actorId(req),
    locale,
    ctx,
    draftArg,
    restoring,
    state: operation === 'create' ? 'idea' : stateOf(original),
    transition: ctx.transition,
    trashing,
    untrashing,
    publishing,
    system: !req.user,
    sponsored: () => Boolean((overlay(original, data).sponsored as Doc | undefined)?.enabled),
    now: Date.now(),
    mainRow,
    mainPublished,
    unpublishing: once(async () => operation === 'update' && !draftArg && effectiveStatus !== 'published' && (await mainPublished())),
    storedUz,
    uz,
    allLocales,
    authorDocs,
    authorUsers,
    isAuthor: async (user) => {
      const uid = idOf(user)
      return uid !== undefined && (await authorUsers()).some((x) => String(x) === String(uid))
    },
    rules,
    rubricSlug,
  }
  return s
}

/** A user is an author of the story, or submitted it (§4.2 "¬author"). */
export async function isAuthorOrSubmitter(s: Save, user: unknown): Promise<boolean> {
  const uid = idOf(user)
  if (uid === undefined) return false
  if (String(idOf(s.original.submittedBy)) === String(uid)) return true
  return s.isAuthor(uid)
}

/** "own" of §4.2: an author (through the stored `_authorUsers`) or the assignee. */
export function isOwner(s: Save, user: unknown): boolean {
  return ownsStory(s.original, user, s.operation === 'create')
}
