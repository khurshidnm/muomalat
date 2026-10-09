import type { CollectionSlug } from 'payload'

/**
 * Slugs of the collections that relationship, upload and join fields point
 * to. They are cast to CollectionSlug so the configs type-check before
 * src/payload-types.ts is regenerated with these collections; after
 * regeneration the cast changes nothing. Use these instead of string literals
 * in `relationTo`, `collection` and Local API calls.
 */
export const REL = {
  articles: 'articles' as CollectionSlug,
  authors: 'authors' as CollectionSlug,
  clubEvents: 'club-events' as CollectionSlug,
  glossaryTerms: 'glossary-terms' as CollectionSlug,
  institutions: 'institutions' as CollectionSlug,
  media: 'media' as CollectionSlug,
  milestones: 'milestones' as CollectionSlug,
  /** The requests register (CMS-SPEC §3.15), built with the system collections. */
  requests: 'requests' as CollectionSlug,
  rubrics: 'rubrics' as CollectionSlug,
  tags: 'tags' as CollectionSlug,
  /** Channel posts (CMS-SPEC §10.2); schema in Phase 1, behaviour in Phase 2. */
  telegramPosts: 'telegram-posts' as CollectionSlug,
  users: 'users' as CollectionSlug,
} as const
