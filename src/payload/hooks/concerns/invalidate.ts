import type { Concern } from '../index'
import { articleHooks } from '../invalidate/articles'
import { contentHooks } from '../invalidate/content'
import { globalHooks } from '../invalidate/globals'

/**
 * Cache invalidation and the publish pipeline after commit (CMS-SPEC §8.4–8.5).
 * Every change of a live row writes a publish-events row in the change's
 * transaction; after() revalidates once it has committed, and the outbox
 * worker re-posts, warms the pages and purges Cloudflare
 * (src/payload/delivery, src/worker/jobs/outbox.ts). Runs last, so it sees
 * what the other concerns made of the save.
 */
export const invalidate: Concern = {
  collections: {
    articles: articleHooks,
    ...contentHooks,
  },
  globals: {
    'home-page': globalHooks,
    navigation: globalHooks,
    'ad-slots': globalHooks,
    'site-settings': globalHooks,
    'editorial-rules': globalHooks,
  },
}
