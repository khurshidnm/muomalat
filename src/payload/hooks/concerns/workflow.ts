import type { Concern } from '../index'
import { articleAfterChange, articleBeforeChange } from '../workflow/articles'
import { globalRestoreGuard } from '../workflow/globalRestore'
import { articleGuard, draftOnlyGuard } from '../workflow/guard'
import { authorOwnership, deleteUnusedOnly, forceSponsoredMedia, requestDecisionGuard, stampRequestDecision } from '../workflow/others'
import { translationHookFor } from '../workflow/translation'
import { articleBeforeDelete } from '../workflow/withdrawal'

const globalRestore = { beforeOperation: [globalRestoreGuard] }

/**
 * Editorial workflow: states, two-person rule, corrections, sponsored guard,
 * embargo (CMS-SPEC §5), translation status (§6.3), and the publish locks of
 * PHASE0 §1.2 for every drafts collection. Implementations live in
 * ../workflow; the transition and copy endpoints in src/payload/endpoints.
 */
export const workflow: Concern = {
  collections: {
    articles: {
      beforeOperation: [articleGuard],
      beforeChange: [articleBeforeChange],
      afterChange: [articleAfterChange],
      beforeDelete: [articleBeforeDelete],
    },
    'glossary-terms': {
      beforeOperation: [draftOnlyGuard(['editor', 'eic'])],
      beforeChange: [translationHookFor(['short', 'definition', 'origin', 'practice', 'steps', 'example'])],
    },
    'club-events': {
      beforeOperation: [draftOnlyGuard(['editor', 'eic'])],
      beforeChange: [translationHookFor(['title', 'theme', 'summary', 'imageCaption', 'report', 'takeaways'])],
    },
    institutions: { beforeOperation: [draftOnlyGuard(['editor', 'eic'])] },
    milestones: { beforeOperation: [draftOnlyGuard(['editor', 'eic'])] },
    authors: {
      beforeOperation: [draftOnlyGuard(['editor', 'eic', 'admin'])],
      beforeChange: [authorOwnership],
      beforeDelete: [deleteUnusedOnly('authors', 'Bu muallif maqolalarda ishlatilgan: oʻchirilmaydi; «Faol» belgisini olib tashlang.')],
    },
    tags: {
      beforeOperation: [draftOnlyGuard(['editor', 'eic'])],
      beforeDelete: [deleteUnusedOnly('tags', 'Bu mavzu maqolalarda ishlatilgan: oʻchirilmaydi.')],
    },
    requests: { beforeOperation: [requestDecisionGuard], beforeChange: [stampRequestDecision] },
    rubrics: { beforeOperation: [draftOnlyGuard(['eic'])] },
    media: { beforeChange: [forceSponsoredMedia] },
  },
  globals: {
    'home-page': globalRestore,
    navigation: globalRestore,
    'ad-slots': globalRestore,
    'site-settings': globalRestore,
    'editorial-rules': globalRestore,
  },
}
