import type { Concern } from '../index'

/** Cache invalidation and the publish pipeline after commit (CMS-SPEC §8.4–8.5). */
export const invalidate: Concern = {
  collections: {},
  globals: {},
}
