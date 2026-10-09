import { Forbidden, ValidationError, type Payload, type Where } from 'payload'

import type { AdBudget, AdFormatOption } from '../../components/pages/advertise/options'
import type { ClubInterest, ClubSector, ClubSize } from '../../components/club/options'
import type { ContactTopic } from '../../components/pages/contact/options'
import type { Locale } from '../../i18n/config'
import { auditPd } from './audit'
import { consentRecord, type SubmissionKind } from './consent'
import { sendPdMail } from './mail'
import { contactMessageRef, isSuppressionAddress, normaliseEmail, purgeExpired, suppressionAddress, type PurgeReport } from './retention'
import { privacyText } from './texts'
import {
  RIGHTS_KINDS,
  randomToken,
  readRightsToken,
  readUnsubscribeToken,
  rightsToken,
  sha256,
  type RightsKind,
} from './tokens'

/**
 * The Payload implementation of the personal-data store (CMS-SPEC §13.7).
 * Server actions and admin tools use only the interface in ./index.ts; to move
 * these collections to an Uzbek host, write another implementation of
 * PersonalDataStore (a small Postgres or HTTP service) and switch index.ts.
 *
 * Rules every function keeps:
 * - Writes use the Local API with `overrideAccess: true` and no user; this
 *   module is the only place that does so for these collections (§3.14).
 * - Nothing stored is returned to the caller: results are outcomes, not records.
 * - Nothing personal is logged: errors are logged by class and code only.
 * - E-mails go out after the write has committed (the Local API call has
 *   returned), never from inside a transaction.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubmissionMeta = {
  /** Site edition the form was sent from. */
  locale: Locale
  /** Locale-free page path, e.g. "/klub". */
  path: string | null
  now?: Date
}

export type ClubInput = {
  name: string
  company: string
  sector: ClubSector
  size: ClubSize
  phone: string
  email?: string
  interests: ClubInterest[]
  message?: string
  attend: boolean
  consent: boolean
}

export type ContactInput = { topic: ContactTopic; name: string; email: string; url?: string; message: string; consent: boolean }

export type AdvertisingInput = {
  name: string
  company: string
  email: string
  phone: string
  format: AdFormatOption
  budget?: AdBudget
  message: string
  consent: boolean
}

/** The digest has no checkbox: consent is the form plus the e-mailed confirmation (double opt-in). */
export type DigestInput = { email: string; placement?: string | null }

export type SubmissionInput = { club: ClubInput; contact: ContactInput; advertising: AdvertisingInput; digest: DigestInput }

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'consent' }
  | { ok: false; reason: 'invalid'; field: string }
  | { ok: false; reason: 'unavailable' }

export type RightsInput = { email: string; kind: RightsKind }

export type PersonalDataHit = { collection: PersonalDataCollection; id: number }

export type Actor = { id: number | string; email?: string | null; role?: string | null; active?: boolean | null }

export const PERSONAL_DATA_COLLECTIONS = ['club-applications', 'digest-subscribers', 'contact-messages', 'advertising-requests'] as const
export type PersonalDataCollection = (typeof PERSONAL_DATA_COLLECTIONS)[number]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Payload's own e-mail check (fields/validations.js), so a stored address never fails later. */
const STORABLE_EMAIL =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

export const isStorableEmail = (email: string) => email.length <= 254 && STORABLE_EMAIL.test(email)

const COLLECTION: Record<SubmissionKind, PersonalDataCollection> = {
  club: 'club-applications',
  digest: 'digest-subscribers',
  contact: 'contact-messages',
  advertising: 'advertising-requests',
}

function logFailure(payload: Payload, what: string, error: unknown) {
  const err = error as { name?: string; code?: string }
  payload.logger.error({ msg: `personal-data: ${what} failed`, errName: err?.name, errCode: err?.code })
}

/** First invalid field of a Payload ValidationError, by its top-level name. */
function invalidField(error: ValidationError): string {
  const path = error.data?.errors?.[0]?.path ?? ''
  return path.split('.')[0] || 'form'
}

const source = (meta: SubmissionMeta) => ({ path: meta.path?.slice(0, 300) ?? null, locale: meta.locale })

/** The next published club meeting, for an application that also signs up for it. */
async function nextClubEvent(payload: Payload, now: Date): Promise<number | null> {
  const { docs } = await payload.find({
    collection: 'club-events',
    where: { and: [{ _status: { equals: 'published' } }, { startsAt: { greater_than: now.toISOString() } }] },
    sort: 'startsAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]?.id ?? null
}

function assertAdmin(actor: Actor) {
  if (!actor || actor.role !== 'admin' || actor.active === false) throw new Forbidden()
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function createSubmission<K extends SubmissionKind>(
  payload: Payload,
  kind: K,
  input: SubmissionInput[K],
  meta: SubmissionMeta,
): Promise<SubmitResult> {
  const now = meta.now ?? new Date()
  if (kind !== 'digest' && (input as { consent?: boolean }).consent !== true) return { ok: false, reason: 'consent' }
  const email = (input as { email?: string }).email?.trim()
  if (email && !isStorableEmail(email)) return { ok: false, reason: 'invalid', field: 'email' }
  if (kind === 'digest') return subscribe(payload, input as DigestInput, meta, now)

  const consent = consentRecord(kind, meta.locale, now)
  try {
    switch (kind) {
      case 'club': {
        const v = input as ClubInput
        await payload.create({
          collection: 'club-applications',
          overrideAccess: true,
          depth: 0,
          data: {
            name: v.name,
            company: v.company,
            sector: v.sector,
            size: v.size,
            phone: v.phone,
            email: email || null,
            interests: v.interests,
            message: v.message || null,
            attend: v.attend,
            event: v.attend ? await nextClubEvent(payload, now) : null,
            status: 'new',
            source: source(meta),
            consent,
          },
        })
        break
      }
      case 'contact': {
        const v = input as ContactInput
        await payload.create({
          collection: 'contact-messages',
          overrideAccess: true,
          depth: 0,
          data: {
            topic: v.topic,
            name: v.name,
            email: email as string,
            url: v.url || null,
            message: v.message,
            status: 'new',
            source: source(meta),
            consent,
          },
        })
        break
      }
      case 'advertising': {
        const v = input as AdvertisingInput
        await payload.create({
          collection: 'advertising-requests',
          overrideAccess: true,
          depth: 0,
          data: {
            name: v.name,
            company: v.company,
            email: email as string,
            phone: v.phone,
            format: v.format,
            budget: v.budget || null,
            message: v.message,
            status: 'new',
            source: source(meta),
            consent,
          },
        })
        break
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, reason: 'invalid', field: invalidField(error) }
    logFailure(payload, `${COLLECTION[kind]} create`, error)
    return { ok: false, reason: 'unavailable' }
  }
  // Committed: acknowledge by mail. Club applicants may leave the address out.
  if (email) await sendPdMail(payload, email, kind as 'club' | 'contact' | 'advertising', meta.locale)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Digest: double opt-in (§13.1, test L3)
// ---------------------------------------------------------------------------

/** A confirmation link is honoured for as long as a pending row is kept. */
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function subscribe(payload: Payload, input: DigestInput, meta: SubmissionMeta, now: Date): Promise<SubmitResult> {
  const email = normaliseEmail(input.email)
  const token = randomToken()
  const data = {
    locale: meta.locale,
    placement: input.placement?.slice(0, 60) ?? null,
    status: 'pending' as const,
    confirmTokenHash: sha256(token),
    confirmedAt: null,
    unsubscribedAt: null,
    source: source(meta),
    consent: consentRecord('digest', meta.locale, now),
  }
  try {
    const { docs } = await payload.find({
      collection: 'digest-subscribers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const existing = docs[0]
    // Already confirmed: change nothing, send nothing, answer the same (no enumeration).
    if (existing?.status === 'confirmed') return { ok: true }
    if (existing) {
      await payload.update({ collection: 'digest-subscribers', id: existing.id, overrideAccess: true, depth: 0, data })
    } else {
      await payload.create({ collection: 'digest-subscribers', overrideAccess: true, depth: 0, data: { email, ...data } })
    }
  } catch (error) {
    // Two submissions racing for one address: the other one sent the mail.
    if (error instanceof ValidationError && invalidField(error) === 'email' && isStorableEmail(email)) return { ok: true }
    if (error instanceof ValidationError) return { ok: false, reason: 'invalid', field: invalidField(error) }
    logFailure(payload, 'digest-subscribers subscribe', error)
    return { ok: false, reason: 'unavailable' }
  }
  await sendPdMail(payload, email, 'digestConfirm', meta.locale, { token })
  return { ok: true }
}

export type ConfirmOutcome = 'confirmed' | 'invalid' | 'unavailable'

export async function confirmDigest(payload: Payload, token: unknown, now = new Date()): Promise<ConfirmOutcome> {
  if (typeof token !== 'string' || !/^[\w-]{32,64}$/.test(token)) return 'invalid'
  try {
    const { docs } = await payload.find({
      collection: 'digest-subscribers',
      where: { and: [{ confirmTokenHash: { equals: sha256(token) } }, { status: { equals: 'pending' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const row = docs[0]
    if (!row || now.getTime() - new Date(row.updatedAt).getTime() > CONFIRM_TTL_MS) return 'invalid'
    await payload.update({
      collection: 'digest-subscribers',
      id: row.id,
      overrideAccess: true,
      depth: 0,
      data: { status: 'confirmed', confirmedAt: now.toISOString(), confirmTokenHash: null },
    })
    // A fresh, confirmed consent replaces an earlier opt-out.
    await payload.delete({
      collection: 'digest-subscribers',
      where: { email: { equals: suppressionAddress(row.email) } },
      overrideAccess: true,
    })
    return 'confirmed'
  } catch (error) {
    logFailure(payload, 'digest-subscribers confirm', error)
    return 'unavailable'
  }
}

export type UnsubscribeOutcome = 'unsubscribed' | 'invalid' | 'unavailable'

/** One click from every digest e-mail (§13.3). Idempotent; a purged row also counts as done. */
export async function unsubscribeDigest(payload: Payload, token: unknown, now = new Date()): Promise<UnsubscribeOutcome> {
  const id = readUnsubscribeToken(token)
  if (id === null) return 'invalid'
  try {
    const row = await payload.findByID({ collection: 'digest-subscribers', id, depth: 0, overrideAccess: true, disableErrors: true })
    if (!row || row.status === 'unsubscribed' || isSuppressionAddress(row.email)) return 'unsubscribed'
    await payload.update({
      collection: 'digest-subscribers',
      id,
      overrideAccess: true,
      depth: 0,
      data: { status: 'unsubscribed', unsubscribedAt: now.toISOString(), confirmTokenHash: null },
    })
    return 'unsubscribed'
  } catch (error) {
    logFailure(payload, 'digest-subscribers unsubscribe', error)
    return 'unavailable'
  }
}

// ---------------------------------------------------------------------------
// Rights requests (§13.3)
// ---------------------------------------------------------------------------

/** Sends the verification link. Nothing is stored until the link is used. */
export async function requestRights(payload: Payload, input: RightsInput, meta: SubmissionMeta): Promise<SubmitResult> {
  const email = normaliseEmail(input.email)
  if (!isStorableEmail(email)) return { ok: false, reason: 'invalid', field: 'email' }
  if (!RIGHTS_KINDS.includes(input.kind)) return { ok: false, reason: 'invalid', field: 'kind' }
  const token = rightsToken({ email, kind: input.kind, locale: meta.locale }, (meta.now ?? new Date()).getTime())
  await sendPdMail(payload, email, 'rightsVerify', meta.locale, { token, rightsKind: privacyText(meta.locale).rightsKinds[input.kind] })
  return { ok: true }
}

/** What a verification link stands for, for the confirmation page; the address is masked. */
export function peekRightsRequest(token: unknown, now = new Date()) {
  const claim = readRightsToken(token, now.getTime())
  if (!claim || claim === 'expired') return null
  const [local, domain] = claim.email.split('@')
  return { kind: claim.kind, locale: claim.locale, maskedEmail: `${local.slice(0, 1)}***@${domain}` }
}

export type RightsOutcome = 'registered' | 'already' | 'invalid' | 'unavailable'

const RIGHTS_SUMMARY: Record<RightsKind, string> = {
  delete: 'oʻchirish',
  suspend: 'qayta ishlashni toʻxtatish',
  access: 'maʼlumotlar nusxasini berish',
}

/** Registers a verified request in the requests register ("Murojaatlar"). */
export async function confirmRightsRequest(payload: Payload, token: unknown, now = new Date()): Promise<RightsOutcome> {
  const claim = readRightsToken(token, now.getTime())
  if (!claim || claim === 'expired') return 'invalid'
  const ref = `pd-rights:${claim.nonce}`
  try {
    const { totalDocs } = await payload.count({ collection: 'requests', where: { documents: { equals: ref } }, overrideAccess: true })
    if (totalDocs) return 'already'
    await payload.create({
      collection: 'requests',
      overrideAccess: true,
      depth: 0,
      data: {
        kind: 'personal_data',
        requesterContact: claim.email,
        receivedAt: now.toISOString(),
        receivedAt_tz: 'Asia/Tashkent',
        channel: 'site_form',
        summary: `Shaxsga doir maʼlumotlar boʻyicha soʻrov: ${RIGHTS_SUMMARY[claim.kind]}. Sayt shakli orqali yuborilgan va elektron pochtaga yuborilgan havola bilan tasdiqlangan (sayt tili: ${claim.locale}). Maʼlumotlar shu manzil boʻyicha toʻrtta shaxsiy maʼlumotlar toʻplamidan qidiriladi.`,
        documents: ref,
        status: 'new',
      },
    })
  } catch (error) {
    logFailure(payload, 'requests rights-request create', error)
    return 'unavailable'
  }
  await sendPdMail(payload, claim.email, 'rightsReceived', claim.locale, { rightsKind: privacyText(claim.locale).rightsKinds[claim.kind] })
  return 'registered'
}

// ---------------------------------------------------------------------------
// Admin: find, export, erase by e-mail (§13.3, test L5)
// ---------------------------------------------------------------------------

/** Every record holding this address, across the four collections; ids only. */
export async function findPersonalData(payload: Payload, email: string): Promise<PersonalDataHit[]> {
  const target = normaliseEmail(email)
  const hits: PersonalDataHit[] = []
  for (const collection of PERSONAL_DATA_COLLECTIONS) {
    // `like` is case-insensitive; the exact match is checked below.
    const where: Where =
      collection === 'digest-subscribers'
        ? { email: { in: [target, suppressionAddress(target)] } }
        : { email: { like: target } }
    const { docs } = await payload.find({ collection, where, limit: 1000, depth: 0, overrideAccess: true, pagination: false })
    for (const doc of docs as { id: number; email?: string | null }[]) {
      const stored = normaliseEmail(doc.email ?? '')
      if (stored === target || stored === suppressionAddress(target)) hits.push({ collection, id: doc.id })
    }
  }
  return hits
}

const countsSummary = (hits: PersonalDataHit[]) =>
  PERSONAL_DATA_COLLECTIONS.map((c) => `${c} ${hits.filter((h) => h.collection === c).length}`).join(', ')

export type PersonalDataExport = {
  generatedAt: string
  records: Record<PersonalDataCollection | 'requests', Record<string, unknown>[]>
}

/**
 * A copy of everything held about one address, for the person who asked
 * (Personal Data Law, access right). Admin only; audited as `pd.export` with
 * counts, never the address. `requests` entries are included for
 * completeness; they are kept under the Media Law and are not erased.
 */
export async function exportPersonalData(
  payload: Payload,
  email: string,
  { actor, requestId }: { actor: Actor; requestId?: number | string },
): Promise<PersonalDataExport> {
  assertAdmin(actor)
  const hits = await findPersonalData(payload, email)
  const records = { 'club-applications': [], 'digest-subscribers': [], 'contact-messages': [], 'advertising-requests': [], requests: [] } as PersonalDataExport['records']
  for (const hit of hits) {
    const doc = (await payload.findByID({ collection: hit.collection, id: hit.id, depth: 0, overrideAccess: true })) as unknown as Record<string, unknown>
    records[hit.collection].push(doc)
  }
  const target = normaliseEmail(email)
  const requests = await payload.find({
    collection: 'requests',
    where: { requesterContact: { like: target } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
  records.requests = (requests.docs as unknown as Record<string, unknown>[]).filter(
    (r) => normaliseEmail(String(r.requesterContact ?? '')) === target,
  )
  await auditPd(payload, {
    action: 'pd.export',
    actor,
    docId: requestId,
    collection: requestId ? 'requests' : undefined,
    summary: `${countsSummary(hits)}, requests ${records.requests.length}`,
  })
  return { generatedAt: new Date().toISOString(), records }
}

export type EraseReport = { deleted: number; suppressed: number; keptUnderContract: number }

/**
 * Deletes everything held about one address (§13.3). Admin only; audited as
 * `pd.delete`. Two things stay, each for a legal reason:
 * - a digest address becomes its suppression hash, so it is never mailed again;
 * - advertising requests that became contracts (Advertising Law Art. 15).
 */
export async function erasePersonalData(
  payload: Payload,
  email: string,
  { actor, requestId }: { actor: Actor; requestId?: number | string },
): Promise<EraseReport> {
  assertAdmin(actor)
  const hits = await findPersonalData(payload, email)
  const report: EraseReport = { deleted: 0, suppressed: 0, keptUnderContract: 0 }
  // The writes run as the admin, so the audit concern's per-record rows name them.
  const asAdmin = { user: actor as never, context: { personalDataErase: true } }
  for (const hit of hits) {
    if (hit.collection === 'digest-subscribers') {
      const row = await payload.findByID({ collection: hit.collection, id: hit.id, depth: 0, overrideAccess: true })
      if (isSuppressionAddress(row.email)) continue
      const hashed = suppressionAddress(row.email)
      const { totalDocs } = await payload.count({ collection: hit.collection, where: { email: { equals: hashed } }, overrideAccess: true })
      if (totalDocs) {
        await payload.delete({ collection: hit.collection, id: hit.id, overrideAccess: true, ...asAdmin })
      } else {
        await payload.update({
          collection: hit.collection,
          id: hit.id,
          overrideAccess: true,
          ...asAdmin,
          data: {
            email: hashed,
            status: 'unsubscribed',
            unsubscribedAt: row.unsubscribedAt ?? new Date().toISOString(),
            placement: null,
            confirmTokenHash: null,
            internalNotes: null,
            assignedTo: null,
            source: { path: null, locale: null },
          },
        })
      }
      report.suppressed += 1
      continue
    }
    if (hit.collection === 'advertising-requests') {
      const row = await payload.findByID({ collection: hit.collection, id: hit.id, depth: 0, overrideAccess: true })
      if (row.contract) {
        report.keptUnderContract += 1
        continue
      }
    }
    await payload.delete({ collection: hit.collection, id: hit.id, overrideAccess: true, ...asAdmin })
    report.deleted += 1
  }
  await auditPd(payload, {
    action: 'pd.delete',
    actor,
    docId: requestId,
    collection: requestId ? 'requests' : undefined,
    summary: `${countsSummary(hits)}; ${report.deleted} oʻchirildi, ${report.suppressed} xeshga aylantirildi, ${report.keptUnderContract} shartnoma sababli qoldi`,
  })
  return report
}

export { purgeExpired, type PurgeReport }
