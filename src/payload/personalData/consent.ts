import { createHash } from 'node:crypto'

import { locales, type Locale } from '../../i18n/config'
import { privacyText } from './texts'

/**
 * Consent text versions (CMS-SPEC §13.2). Each submission stores
 * `consent.textVersion`, `locale` and `at`; the version names the exact
 * consent and notice texts in ./texts.ts that the person was shown, in every
 * edition. The purpose is part of the version: one version per form.
 *
 * Changing any of those texts means a new version here and a new fingerprint
 * below; old records keep their version. tests/personaldata recomputes the
 * fingerprints and fails until both are updated.
 */
export const CONSENT_VERSIONS = {
  club: 'club-2026-10-v1',
  digest: 'digest-2026-10-v1',
  contact: 'contact-2026-10-v1',
  advertising: 'advertising-2026-10-v1',
} as const

export type SubmissionKind = keyof typeof CONSENT_VERSIONS
export const SUBMISSION_KINDS = Object.keys(CONSENT_VERSIONS) as SubmissionKind[]

/** sha256 of consentRecordText(kind) over every edition, first 16 hex digits. */
export const CONSENT_FINGERPRINTS: Record<SubmissionKind, string> = {
  club: '9cb125554e9cc868',
  digest: '4e26fc3731c27abe',
  contact: '979db3b08cba6776',
  advertising: '1561d440c5eb2be3',
}

/**
 * The text a consent version stands for in one edition: what the form showed,
 * the purpose block, and the notice. The founder's name is a slot, filled
 * from the legal settings when shown, so a change of name is not a new text.
 */
export function consentRecordText(kind: SubmissionKind, locale: Locale): string {
  const p = privacyText(locale)
  const n = p.notice
  const shown = kind === 'digest' ? [p.consent.digest, p.consent.digestConfirm] : [p.consent[kind]]
  const purpose = p.purposes[kind]
  return [
    ...shown,
    purpose.title,
    purpose.data,
    purpose.purpose,
    purpose.retention,
    n.controller('{founder}'),
    n.storage,
    n.processors,
    n.noSharing,
    n.noIp,
    n.rights,
    n.howTo,
    n.officer,
  ].join('\n')
}

export function consentFingerprint(kind: SubmissionKind): string {
  const hash = createHash('sha256')
  for (const locale of locales) hash.update(`${locale}\n${consentRecordText(kind, locale)}\n`)
  return hash.digest('hex').slice(0, 16)
}

/** The consent group stored with a submission. */
export function consentRecord(kind: SubmissionKind, locale: Locale, at: Date) {
  return { given: true, textVersion: CONSENT_VERSIONS[kind], locale, at: at.toISOString() }
}
