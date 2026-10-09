import type { CollectionBeforeOperationHook, GlobalBeforeOperationHook, PayloadRequest } from 'payload'

/**
 * A REST call without `?locale=` arrives with `req.locale = null`: with
 * `localization.fallback: false` Payload does not substitute the default
 * locale (PHASE0 note; the Local API does). A write in that state stores no
 * localized field at all, and a create with a localized group fails inside
 * the database adapter with a 500. Every operation therefore runs in the
 * default locale (uz) when none was asked for, as the Local API already
 * does. Runs first in beforeOperation, before Payload reads `req.locale`.
 */
function defaultLocale(req: PayloadRequest) {
  const localization = req.payload.config.localization
  if (localization && !req.locale) req.locale = localization.defaultLocale as NonNullable<PayloadRequest['locale']>
}

export const collectionDefaultLocale: CollectionBeforeOperationHook = ({ args, req }) => {
  defaultLocale(req)
  return args
}

export const globalDefaultLocale: GlobalBeforeOperationHook = ({ args, req }) => {
  defaultLocale(req)
  return args
}
