import type { Concern } from '../index'
import { openCorrectionRequest, resolveArticle } from '../personalData/contactMessages'
import { setRetainUntil } from '../personalData/retainUntil'

/**
 * Consent records, retention and access to personal data (CMS-SPEC §13).
 *
 * - `retainUntil` on every change of the four personal-data collections and
 *   of `requests` (§13.1); the worker's `retention` job acts on it.
 * - Contact messages: `article` from the submitted link, and a `tuzatish`
 *   message opens its `requests` item (§3.14).
 *
 * Submissions themselves are written by src/payload/personalData (the store),
 * which the site's server actions call; nothing here sends mail. Audit rows
 * for these collections (`doc.*`, `pd.read`) come from the audit concern.
 */
export const personalData: Concern = {
  collections: {
    'club-applications': {
      beforeChange: [setRetainUntil('club-applications')],
    },
    'digest-subscribers': {
      beforeChange: [setRetainUntil('digest-subscribers')],
    },
    'contact-messages': {
      beforeChange: [resolveArticle, setRetainUntil('contact-messages')],
      afterChange: [openCorrectionRequest],
    },
    'advertising-requests': {
      beforeChange: [setRetainUntil('advertising-requests')],
    },
    requests: {
      beforeChange: [setRetainUntil('requests')],
    },
  },
  globals: {},
}
