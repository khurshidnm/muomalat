import type { FieldError, FormState } from '@/lib/forms'

/**
 * Allowed values and state shape for the /aloqa and /reklama forms. Shared by
 * the client forms and the server actions in src/lib/actions/contact.ts
 * (which reject anything outside these lists). Labels live in
 * src/i18n/messages/contact.ts and advertise.ts under the same keys.
 */
export const CONTACT_TOPICS = ['tahririyat', 'tuzatish', 'reklama', 'klub', 'boshqa'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_MESSAGE_MAX = 4000
/** One-line field cap, shared with the club form (src/lib/forms.ts). */
export { FIELD_MAX } from '@/lib/forms'
export const URL_MAX = 500

/** Query parameter that preselects the topic: /aloqa?mavzu=tuzatish#xabar */
export const TOPIC_PARAM = 'mavzu'
/** Window event fired by TopicLink so an in-page link can preselect the topic. */
export const TOPIC_EVENT = 'muomalat:contact-topic'
/** Id of the contact form section (anchor target). */
export const CONTACT_FORM_ID = 'xabar'

/** Error codes: the shared ones plus "choose" (select) and "url" (article link). */
export type ContactFieldError = FieldError | 'choose' | 'url'

/**
 * Form state: the shared FormState shape with wider error codes and a
 * submission counter the client uses to remount fields with echoed values.
 */
export interface ContactFormState extends Omit<FormState, 'errors'> {
  errors: Record<string, ContactFieldError>
  n: number
}

export const initialContactState: ContactFormState = { status: 'idle', errors: {}, values: {}, n: 0 }

export function isTopic(value: string | null | undefined): value is ContactTopic {
  return !!value && (CONTACT_TOPICS as readonly string[]).includes(value)
}
