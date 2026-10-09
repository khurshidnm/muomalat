import { site } from '@/content/data/site'

/**
 * Contact directory. Every value is a placeholder until the newsroom confirms
 * it, so each renders through <Placeholder>. Kept out of the message files so
 * the Cyrillic edition does not transliterate addresses and handles.
 */
export interface ContactValue {
  value: string
  placeholder: boolean
}

export const contacts = {
  editorialEmail: { value: 'tahririyat@muomalat.uz', placeholder: true },
  advertisingEmail: { value: 'reklama@muomalat.uz', placeholder: true },
  clubEmail: { value: 'klub@muomalat.uz', placeholder: true },
  /** The public channel is real; the bot for messages is not registered yet. */
  telegramChannel: { value: site.telegram.handle, placeholder: false },
  telegramBot: { value: '@muomalat_bot', placeholder: true },
  phone: site.legal.phone,
  address: site.legal.address,
  hours: {
    weekdays: { value: '09:00–18:00', placeholder: true },
  },
  /** Tashkent: UTC+5 all year, no daylight saving. */
  utcOffset: 'UTC+5',
} as const satisfies Record<string, unknown>

/** mailto: link for a directory address, with an optional subject line. */
export function mailto(address: string, subject?: string): string {
  return `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
}
