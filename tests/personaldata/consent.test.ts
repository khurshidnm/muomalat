import { describe, expect, it } from 'vitest'

import { locales } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { digestMessages } from '@/i18n/messages/digest'
import { formMessages } from '@/i18n/messages/forms'
import {
  CONSENT_FINGERPRINTS,
  CONSENT_VERSIONS,
  SUBMISSION_KINDS,
  consentFingerprint,
  consentRecordText,
} from '@/payload/personalData/consent'
import { buildMail } from '@/payload/personalData/mail'
import { privacyMessages, privacyText } from '@/payload/personalData/texts'

/** Unit tests: no database. */
describe('consent texts (§13.2)', () => {
  it('each version still stands for the texts it was published with (bump the version when a text changes)', () => {
    for (const kind of SUBMISSION_KINDS) {
      expect(consentFingerprint(kind), `${kind}: texts changed; give ${CONSENT_VERSIONS[kind]} a new version and fingerprint`).toBe(
        CONSENT_FINGERPRINTS[kind],
      )
    }
  })

  it('records exactly what the forms show, in every edition', () => {
    for (const locale of locales) {
      const p = privacyText(locale)
      const f = pick(formMessages, locale)
      const d = pick(digestMessages, locale)
      expect(p.consent.club).toBe(f.consent)
      expect(p.consent.contact).toBe(f.consent)
      expect(p.consent.advertising).toBe(f.consent)
      expect(p.consent.digest).toBe(d.note)
    }
  })

  it('versions are distinct and dated', () => {
    const versions = Object.values(CONSENT_VERSIONS)
    expect(new Set(versions).size).toBe(versions.length)
    for (const v of versions) expect(v).toMatch(/^[a-z]+-\d{4}-\d{2}-v\d+$/)
  })

  it('L7: the notice names the EU storage, the processors, the retention periods and the person responsible, in four editions', () => {
    const storage = { uz: /Litva/, kr: /Литва/, ru: /Литв/, en: /Lithuania/ }
    const officer = { uz: /masʼul shaxs/i, kr: /масъул шахс/i, ru: /Ответственн/, en: /responsible/ }
    for (const locale of locales) {
      const text = SUBMISSION_KINDS.map((k) => consentRecordText(k, locale)).join('\n')
      expect(text).toMatch(storage[locale])
      expect(text).toMatch(/Hostinger/)
      expect(text).toMatch(/Cloudflare/)
      expect(text).toMatch(officer[locale])
      // Every form's retention period is stated.
      for (const kind of SUBMISSION_KINDS) expect(privacyText(locale).purposes[kind].retention).toMatch(/\d/)
      expect(privacyText(locale).purposes.digest.retention).toMatch(/7/)
      expect(privacyText(locale).purposes.digest.retention).toMatch(/30/)
    }
  })

  it('Uzbek texts use ʻ (U+02BB) and ʼ (U+02BC), never an ASCII or curly apostrophe', () => {
    const strings: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v)
      else if (typeof v === 'function') strings.push((v as (...a: string[]) => string)('X', 'Y'))
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    walk(privacyMessages.uz)
    for (const s of strings) {
      expect(s, s).not.toMatch(/['‘’`]/)
      expect(s, s).not.toMatch(/[oOgG]ʼ/)
    }
  })

  it('confirmation mails carry fixed text and our link only', () => {
    const mail = buildMail('digestConfirm', 'ru', { token: 'T'.repeat(43) })
    expect(mail.subject).toMatch(/дайджест/)
    expect(mail.text).toContain('/ru/dayjest/tasdiqlash?t=' + 'T'.repeat(43))
    expect(mail.html).toContain('lang="ru"')
    const kr = buildMail('club', 'kr')
    expect(kr.subject).toMatch(/[А-Яа-яЎўҚқҒғҲҳ]/)
    expect(kr.text).not.toMatch(/\{en:/)
  })
})
