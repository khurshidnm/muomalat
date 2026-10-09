import type { Payload, PayloadRequest } from 'payload'

/** Crockford base32 in lower case, six characters (Articles.ts `shortCode`). */
export const SHORT_CODE_RE = /^[0-9a-hjkmnp-tv-z]{6}$/

/**
 * utm_content for a story's short link (§8.8): the message id of its channel
 * post once the bot has sent one (Phase 2), otherwise the short code itself,
 * so manual posts are still told apart in the analytics.
 */
export async function utmContentFor(payload: Payload, articleId: string | number, shortCode: string, req?: PayloadRequest): Promise<string> {
  const { docs } = await payload.find({
    collection: 'telegram-posts',
    where: { and: [{ article: { equals: articleId } }, { kind: { equals: 'article' } }, { messageId: { exists: true } }] },
    sort: '-sentAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { messageId: true },
    ...(req ? { req } : {}),
  })
  const messageId = docs[0]?.messageId
  return typeof messageId === 'string' && messageId !== '' ? messageId : shortCode
}

export type ShortLinkTarget = { articleId: number; rubric: string; slug: string; utmContent: string }

/**
 * The live story behind a short code, read the way the public site reads:
 * no user and `overrideAccess: false`, so drafts and unpublished stories are
 * not found. Withdrawn stories are found; their page shows the notice.
 */
export async function resolveShortCode(payload: Payload, code: string): Promise<ShortLinkTarget | undefined> {
  if (!SHORT_CODE_RE.test(code)) return undefined
  const { docs } = await payload.find({
    collection: 'articles',
    where: { shortCode: { equals: code } },
    limit: 1,
    depth: 0,
    draft: false,
    overrideAccess: false,
    select: { slug: true, rubric: true, shortCode: true },
  })
  const story = docs[0]
  if (!story?.slug || story.rubric === undefined || story.rubric === null) return undefined
  const rubricId = typeof story.rubric === 'object' ? story.rubric.id : story.rubric
  const rubric = await payload.findByID({ collection: 'rubrics', id: rubricId, depth: 0, draft: false, disableErrors: true, overrideAccess: true, select: { slug: true } })
  if (!rubric?.slug) return undefined
  return { articleId: story.id, rubric: rubric.slug, slug: story.slug, utmContent: await utmContentFor(payload, story.id, code) }
}
