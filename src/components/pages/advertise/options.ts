/**
 * Allowed values for the advertiser enquiry form. Shared by the client form
 * and the server action (which rejects anything outside these lists).
 * Labels live in src/i18n/messages/advertise.ts under form.formats / form.budgets.
 */
export const AD_FORMATS = ['banner', 'sponsored', 'telegram', 'digest', 'club', 'several'] as const
export type AdFormatOption = (typeof AD_FORMATS)[number]

export const AD_BUDGETS = ['upTo10', 'upTo30', 'upTo100', 'over100', 'unknown'] as const
export type AdBudget = (typeof AD_BUDGETS)[number]

export const AD_MESSAGE_MAX = 3000

/** Id of the enquiry form section (anchor target for the hero CTA). */
export const AD_FORM_ID = 'reklama-sorov'
export const MEDIA_KIT_ID = 'media-kit'
