import config from '@payload-config'
import { getPayload } from 'payload'

import type { SubmissionKind } from './consent'
import * as store from './store'

/**
 * The personal-data interface (CMS-SPEC §13.7). The site's server actions,
 * the personal-data pages and admin tools call only this; nothing else reads
 * or writes the four personal-data collections from outside the CMS.
 *
 * Today it is backed by Payload (./store.ts) on the main database. If counsel
 * or the law requires the data to be kept in Uzbekistan, provide another
 * PersonalDataStore (a small Postgres or HTTP service on an Uzbek host) and
 * return it from personalData(); the newsroom side does not change, because no
 * editorial collection has a relationship into these collections.
 */
export interface PersonalDataStore {
  createSubmission<K extends SubmissionKind>(kind: K, input: store.SubmissionInput[K], meta: store.SubmissionMeta): Promise<store.SubmitResult>
  confirmDigest(token: unknown): Promise<store.ConfirmOutcome>
  unsubscribeDigest(token: unknown): Promise<store.UnsubscribeOutcome>
  requestRights(input: store.RightsInput, meta: store.SubmissionMeta): Promise<store.SubmitResult>
  peekRightsRequest(token: unknown): ReturnType<typeof store.peekRightsRequest>
  confirmRightsRequest(token: unknown): Promise<store.RightsOutcome>
  findPersonalData(email: string): Promise<store.PersonalDataHit[]>
  exportPersonalData(email: string, opts: { actor: store.Actor; requestId?: number | string }): Promise<store.PersonalDataExport>
  erasePersonalData(email: string, opts: { actor: store.Actor; requestId?: number | string }): Promise<store.EraseReport>
  purgeExpired(now?: Date): Promise<store.PurgeReport>
}

const payload = () => getPayload({ config })

export const payloadStore: PersonalDataStore = {
  createSubmission: async (kind, input, meta) => store.createSubmission(await payload(), kind, input, meta),
  confirmDigest: async (token) => store.confirmDigest(await payload(), token),
  unsubscribeDigest: async (token) => store.unsubscribeDigest(await payload(), token),
  requestRights: async (input, meta) => store.requestRights(await payload(), input, meta),
  peekRightsRequest: (token) => store.peekRightsRequest(token),
  confirmRightsRequest: async (token) => store.confirmRightsRequest(await payload(), token),
  findPersonalData: async (email) => store.findPersonalData(await payload(), email),
  exportPersonalData: async (email, opts) => store.exportPersonalData(await payload(), email, opts),
  erasePersonalData: async (email, opts) => store.erasePersonalData(await payload(), email, opts),
  purgeExpired: async (now) => store.purgeExpired(await payload(), now),
}

/** The store in use. */
export const personalData = (): PersonalDataStore => payloadStore

/**
 * The person responsible for personal data (Personal Data Law Art. 31), from
 * site-settings → policies.personalDataOfficer, for the privacy notice. A
 * public read (no user); empty until the editor-in-chief fills it in, or
 * when the CMS cannot be reached (the page then shows a placeholder).
 */
export async function privacyOfficer(): Promise<{ name: string | null; email: string | null }> {
  try {
    const settings = await (await payload()).findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: false })
    const officer = settings.policies?.personalDataOfficer
    return { name: officer?.name?.trim() || null, email: officer?.email?.trim() || null }
  } catch {
    return { name: null, email: null }
  }
}

export type {
  AdvertisingInput,
  ClubInput,
  ContactInput,
  DigestInput,
  RightsInput,
  SubmissionInput,
  SubmissionMeta,
  SubmitResult,
} from './store'
export { CONSENT_VERSIONS, type SubmissionKind } from './consent'
export { isRightsKind, RIGHTS_KINDS, type RightsKind } from './tokens'
