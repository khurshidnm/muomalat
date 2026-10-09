import type { Payload } from 'payload'

import type { Locale } from '../../i18n/config'
import { plain, privacyText } from './texts'
import { PD_PATHS, pdLink } from './tokens'

/**
 * Confirmation e-mails for the public forms, sent through payload.sendEmail
 * (Mailpit in development, the EU provider in production).
 *
 * - Sent only after the record is committed: the store calls these after its
 *   Local API write has returned, never from inside a hook.
 * - No submitted text is ever copied into a mail. The address is not verified
 *   when the mail goes out, so anything a sender typed (a name, a message)
 *   could otherwise be used to send spam through us. The mails are fixed text
 *   plus a link we built.
 * - A failure is logged without the address and never fails the submission.
 */

export type MailKind = 'digestConfirm' | 'club' | 'contact' | 'advertising' | 'rightsVerify' | 'rightsReceived'

type Mail = { subject: string; paragraphs: string[]; action?: { label: string; href: string }; footer: string[] }

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

function render(mail: Mail, locale: Locale): { subject: string; html: string; text: string } {
  const lang = locale === 'kr' ? 'uz-Cyrl' : locale
  const p = (s: string) => `<p style="margin:0 0 16px;font:16px/1.5 Georgia,serif;color:#1d2a27">${escape(s)}</p>`
  const small = (s: string) => `<p style="margin:0 0 8px;font:13px/1.5 Arial,sans-serif;color:#5b6663">${escape(s)}</p>`
  const button = mail.action
    ? `<p style="margin:24px 0"><a href="${escape(mail.action.href)}" style="display:inline-block;background:#0f5e4d;color:#ffffff;padding:12px 20px;border-radius:2px;font:600 15px Arial,sans-serif;text-decoration:none">${escape(mail.action.label)}</a></p>`
    : ''
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;padding:24px;background:#faf8f3"><div style="max-width:560px;margin:0 auto">${mail.paragraphs.map(p).join('')}${button}<hr style="border:0;border-top:1px solid #d9d4c7;margin:24px 0">${mail.footer.map(small).join('')}</div></body></html>`
  const text = [...mail.paragraphs, ...(mail.action ? [`${mail.action.label}: ${mail.action.href}`] : []), '--', ...mail.footer].join('\n\n')
  return { subject: mail.subject, html, text }
}

function compose(kind: MailKind, locale: Locale, opts: { token?: string; rightsKind?: string }): Mail {
  const t = privacyText(locale)
  const m = t.mail
  const privacy = `${plain(m.privacy)} ${pdLink(locale, PD_PATHS.privacy)}`
  switch (kind) {
    case 'digestConfirm': {
      const href = pdLink(locale, PD_PATHS.digestConfirm, opts.token)
      return {
        subject: m.digestConfirm.subject,
        paragraphs: [m.digestConfirm.lead, plain(t.consent.digestConfirm), m.digestConfirm.expiry],
        action: { label: m.digestConfirm.action, href },
        footer: [`${m.linkHint} ${href}`, m.notYou, privacy, m.signoff],
      }
    }
    case 'club':
    case 'contact':
    case 'advertising':
      return {
        subject: m.received[kind].subject,
        paragraphs: [m.received[kind].lead],
        footer: [m.notYou, privacy, m.signoff],
      }
    case 'rightsVerify': {
      const href = pdLink(locale, PD_PATHS.rightsConfirm, opts.token)
      return {
        subject: m.rightsVerify.subject,
        paragraphs: [m.rightsVerify.lead(opts.rightsKind ?? ''), m.rightsVerify.expiry],
        action: { label: m.rightsVerify.action, href },
        footer: [`${m.linkHint} ${href}`, m.notYou, privacy, m.signoff],
      }
    }
    case 'rightsReceived':
      return {
        subject: m.rightsReceived.subject,
        paragraphs: [m.rightsReceived.lead(opts.rightsKind ?? ''), m.rightsReceived.next],
        footer: [privacy, m.signoff],
      }
  }
}

/** Builds the message without sending it (tests and previews). */
export function buildMail(kind: MailKind, locale: Locale, opts: { token?: string; rightsKind?: string } = {}) {
  return render(compose(kind, locale, opts), locale)
}

export async function sendPdMail(
  payload: Payload,
  to: string,
  kind: MailKind,
  locale: Locale,
  opts: { token?: string; rightsKind?: string } = {},
): Promise<boolean> {
  // Without SMTP the console adapter logs the recipient; skip it instead (§13.5: no personal data in logs).
  if (!payload.email || payload.email.name === 'console') {
    payload.logger.warn({ msg: `personal-data: ${kind} mail not sent, no e-mail adapter configured` })
    return false
  }
  try {
    await payload.sendEmail({ to, ...buildMail(kind, locale, opts) })
    return true
  } catch (error) {
    // The error text can contain the recipient (SMTP 550 replies quote it): log the class and code only.
    const err = error as { name?: string; code?: string; responseCode?: number }
    payload.logger.error({ msg: `personal-data: ${kind} mail failed`, errName: err?.name, errCode: err?.code ?? err?.responseCode })
    return false
  }
}
