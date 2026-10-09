import { REL } from '../../fields/relations'
import {
  authorTargets,
  clubEventTargets,
  isEmptyTargets,
  marketTargets,
  mediaTargets,
  redirectTargets,
  rubricTargets,
  shortLinkTargets,
  tagTargets,
  TAG,
  termTargets,
  type SlugChange,
  type Targets,
} from '../../delivery/tags'
import { idOf, isolated, liveHooks, plainKind, slugOf, slugsOf, type Doc, type LiveChange, type Recorder } from './common'

/** The other collections the site reads (CMS-SPEC §8.5). */
const slugChange = (c: LiveChange): SlugChange => ({
  before: c.wasLive ? slugOf(c.before) : undefined,
  after: c.isLive ? slugOf(c.after) : undefined,
})

const bySlug =
  (build: (s: SlugChange) => Targets): Recorder =>
  async (c) => ({ kind: plainKind(c), targets: build(slugChange(c)) })

const fixed =
  (targets: () => Targets): Recorder =>
  async (c) => ({ kind: plainKind(c), targets: targets() })

/**
 * Media metadata (alt, credit, caption, rights): the live stories that use the
 * item through `mediaRefs`. A new upload is used nowhere yet.
 */
const media: Recorder = async (c) => {
  if (c.operation === 'create') return undefined
  const { docs } = await c.req.payload.find({
    collection: REL.articles,
    where: { and: [{ mediaRefs: { in: [c.id] } }, { _status: { equals: 'published' } }] },
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: true,
    req: isolated(c.req),
    select: { slug: true, rubric: true } as never,
  })
  if (!docs.length) return undefined
  const rubrics = await slugsOf(c.req, REL.rubrics, docs.map((d) => idOf((d as Doc).rubric)).filter((x) => x !== undefined))
  const stories = docs.map((d) => {
    const row = d as Doc
    return { id: row.id!, slug: slugOf(row), rubric: rubrics.get(String(idOf(row.rubric))) }
  })
  return { kind: 'publish_change', targets: mediaTargets(stories) }
}

/** Redirects: the old address (before and after an edit) and the `redirects` lookup. */
const redirects: Recorder = async (c) => {
  const froms = [c.before?.from, c.after?.from].filter((f): f is string => typeof f === 'string' && f !== '')
  return { kind: plainKind(c), targets: redirectTargets(froms) }
}

/**
 * Telegram posts: once the bot records the channel message id, /t/<code>
 * carries it as utm_content, so the cached redirect is refreshed (Phase 2).
 */
const telegramPosts: Recorder = async (c) => {
  const messageId = c.after?.messageId
  if (!messageId || messageId === c.before?.messageId) return undefined
  const articleId = idOf(c.after?.article)
  if (articleId === undefined) return undefined
  const story = await c.req.payload.findByID({
    collection: REL.articles,
    id: articleId,
    depth: 0,
    draft: false,
    disableErrors: true,
    overrideAccess: true,
    req: isolated(c.req),
    select: { shortCode: true } as never,
  })
  const code = (story as Doc | null)?.shortCode
  const targets = shortLinkTargets(typeof code === 'string' ? code : undefined)
  return isEmptyTargets(targets) ? undefined : { kind: 'publish_change', targets }
}

export const contentHooks = {
  authors: liveHooks(bySlug(authorTargets)),
  tags: liveHooks(bySlug(tagTargets)),
  'glossary-terms': liveHooks(bySlug(termTargets)),
  'club-events': liveHooks(bySlug(clubEventTargets)),
  institutions: liveHooks(fixed(() => marketTargets(TAG.institutions))),
  milestones: liveHooks(fixed(() => marketTargets(TAG.milestones))),
  rubrics: liveHooks(async (c) => ({ kind: plainKind(c), targets: rubricTargets(slugOf(c.after) ?? slugOf(c.before)) })),
  media: liveHooks(media),
  redirects: liveHooks(redirects),
  'telegram-posts': liveHooks(telegramPosts),
}
