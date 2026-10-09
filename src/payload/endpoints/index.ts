import type { Endpoint } from 'payload'

import { checkHandler } from './check'
import { copyFromUzHandler } from './copyFromUz'
import { transitionHandler, transitionsListHandler } from './transition'

/**
 * Custom article endpoints under `/api/articles/:id/…`. Custom endpoints get
 * Payload's cookie auth and CSRF check but no access control and no body
 * parsing (PHASE0 item 14): each handler checks the user and parses the body.
 */
export const articleEndpoints: Endpoint[] = [
  { path: '/:id/transition', method: 'post', handler: transitionHandler },
  { path: '/:id/transitions', method: 'get', handler: transitionsListHandler },
  { path: '/:id/copy-from-uz', method: 'post', handler: copyFromUzHandler },
  // §7.3 "On demand": the validation concern's checks, without saving.
  { path: '/:id/check', method: 'post', handler: checkHandler },
]
