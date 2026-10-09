import type { Concern } from '../index'

/** Edge identity (Cloudflare Access), read-only mode, session limits (CMS-SPEC §12). */
export const security: Concern = {
  collections: {},
  globals: {},
}
