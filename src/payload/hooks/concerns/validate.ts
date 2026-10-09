import type { Concern } from '../index'
import {
  guardGlobalRestore,
  rejectUnknownNodes,
  rememberDraftArg,
  rememberGlobalDraftArg,
  validateArticle,
  validateDoc,
  validateGlobal,
} from '../validate/hooks'
import { createSlugRedirects } from '../validate/slug'

/**
 * Publish-time content rules shared with scripts/validate-content.ts
 * (CMS-SPEC §7; rules in src/content/rules.ts, hooks in ../validate).
 * Errors block publish, approval and (for its presence rules) the submit
 * transition; draft saves are never blocked, except by rich text the editor
 * cannot load. Article findings are stored in `validationWarnings` for
 * ChecksPanel.
 */
const doc = { beforeOperation: [rememberDraftArg], beforeChange: [validateDoc] }
const rich = { beforeOperation: [rememberDraftArg], beforeValidate: [rejectUnknownNodes], beforeChange: [validateDoc] }
const global = { beforeOperation: [rememberGlobalDraftArg, guardGlobalRestore], beforeChange: [validateGlobal] }

export const validate: Concern = {
  collections: {
    articles: {
      beforeOperation: [rememberDraftArg],
      beforeValidate: [rejectUnknownNodes],
      beforeChange: [validateArticle],
      afterChange: [createSlugRedirects],
    },
    'glossary-terms': rich,
    'club-events': rich,
    institutions: doc,
    milestones: doc,
    authors: doc,
    tags: doc,
    rubrics: doc,
    media: doc,
    'telegram-posts': doc,
  },
  globals: {
    'site-settings': global,
    'home-page': global,
    navigation: global,
    'ad-slots': global,
  },
}
