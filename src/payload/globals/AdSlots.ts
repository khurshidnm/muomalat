import type { GlobalConfig, TextFieldSingleValidation } from 'payload'

import type { RubricSlug } from '../../content/types'
import { adSlotsAccess, hiddenUnless, staffField } from '../access/system'
import { REL } from '../fields/relations'
import { globalHooksFor } from '../hooks'
import { AGE_MARKS } from './SiteSettings'

export type AdFormat = 'leaderboard' | 'mpu' | 'inline'

const RUBRICS = ['yangiliklar', 'tahlil', 'intervyu', 'izoh', 'dunyo'] as const satisfies readonly RubricSlug[]

/**
 * Every ad slot the site renders, with the format it reserves
 * (src/components/blocks/AdSlot.tsx). Listing pages render `<prefix>-rail`;
 * rubric fronts have one id each, while all tag pages share `tag-rail` and all
 * author pages `author-rail` (their prefixes carry the slug, so the front end
 * maps `tag-<slug>-rail` to `tag-rail`).
 */
export const AD_SLOTS = {
  'home-mid': 'leaderboard',
  'home-mid-mobile': 'mpu',
  'article-rail': 'mpu',
  ...(Object.fromEntries(RUBRICS.map((r) => [`rubric-${r}-rail`, 'mpu'])) as Record<`rubric-${RubricSlug}-rail`, 'mpu'>),
  'tag-rail': 'mpu',
  'author-rail': 'mpu',
} as const satisfies Record<string, AdFormat>
export type AdSlotId = keyof typeof AD_SLOTS
export const AD_SLOT_IDS = Object.keys(AD_SLOTS) as AdSlotId[]

const httpsUrl: TextFieldSingleValidation = (value) => {
  if (!value) return true
  try {
    return new URL(value).protocol === 'https:' || 'Faqat https:// havola.'
  } catch {
    return 'Toʻliq havola kiriting (https://…).'
  }
}

/** Creatives must be images uploaded as sponsored-only (§3.12; ART-15 keeps them out of editorial stories). */
const sponsoredMedia = () => ({ sponsoredOnly: { equals: true } })

/**
 * Advertising slots (CMS-SPEC §3.16). Drafts on: commercial edits and
 * publishes; the editor-in-chief can unpublish (veto) through an endpoint in
 * a later wave. Images only: no HTML, no scripts, no third-party tags. The
 * label is always "Reklama" (site-settings `labels.advert`), never per slot,
 * and links render with rel="sponsored noopener".
 *
 * Later waves: format must match the slot (AD_SLOTS), `creativeUz` required
 * when the creative's text is not Uzbek (Art. 6), licence and risk warning
 * by category (Art. 42), and the `ads` cache tag.
 */
export const AdSlots: GlobalConfig = {
  slug: 'ad-slots',
  label: 'Reklama joylari',
  admin: {
    group: 'Tijorat',
    hidden: hiddenUnless('editor', 'eic', 'commercial', 'admin'),
    description: 'Saytdagi reklama bloklari. Faqat rasm: HTML, skript va tashqi kodlar qoʻyilmaydi.',
  },
  access: adSlotsAccess,
  versions: { drafts: true, max: 0 },
  fields: [
    {
      name: 'slots',
      label: 'Joylar',
      labels: { singular: 'Reklama joyi', plural: 'Reklama joylari' },
      type: 'array',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'slotId',
              label: 'Joy',
              type: 'select',
              required: true,
              options: AD_SLOT_IDS.map((value) => ({ label: `${value} (${AD_SLOTS[value]})`, value })),
            },
            {
              name: 'format',
              label: 'Format',
              type: 'select',
              required: true,
              options: [
                { label: '728 × 90 (leaderboard)', value: 'leaderboard' },
                { label: '300 × 250 (mpu)', value: 'mpu' },
                { label: '640 × 120 (inline)', value: 'inline' },
              ] satisfies { label: string; value: AdFormat }[],
            },
            { name: 'enabled', label: 'Yoqilgan', type: 'checkbox', defaultValue: false },
          ],
        },
        {
          name: 'creative',
          label: 'Reklama rasmi',
          type: 'upload',
          relationTo: REL.media,
          filterOptions: sponsoredMedia,
          admin: { description: 'Faqat tijorat boʻlimi yuklagan (sponsoredOnly) rasm.' },
        },
        {
          name: 'creativeUz',
          label: 'Oʻzbekcha varianti',
          type: 'upload',
          relationTo: REL.media,
          filterOptions: sponsoredMedia,
          admin: { description: 'Rasmdagi matn oʻzbekcha boʻlmasa, majburiy (Reklama toʻgʻrisidagi qonun, 6-modda).' },
        },
        { name: 'creativeAlt', label: 'Muqobil matn (alt)', type: 'text', localized: true },
        { name: 'linkUrl', label: 'Havola', type: 'text', validate: httpsUrl },
        {
          type: 'row',
          fields: [
            { name: 'advertiserName', label: 'Reklama beruvchi', type: 'text' },
            {
              name: 'category',
              label: 'Toifa',
              type: 'select',
              defaultValue: 'general',
              options: [
                { label: 'Umumiy', value: 'general' },
                { label: 'Moliyaviy xizmat', value: 'financial_service' },
                { label: 'Bank omonati', value: 'bank_deposit' },
                { label: 'Investitsiyalar va qimmatli qogʻozlar', value: 'investment_securities' },
                { label: 'Sugʻurta va takaful', value: 'insurance_takaful' },
              ],
            },
            { name: 'licenceNumber', label: 'Litsenziya raqami', type: 'text' },
          ],
        },
        {
          name: 'riskWarning',
          label: 'Xavf haqida ogohlantirish',
          type: 'textarea',
          localized: true,
          admin: { description: 'Rasm ostida koʻrsatiladi (Reklama toʻgʻrisidagi qonun, 42-modda).' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'startsAt',
              label: 'Boshlanishi',
              type: 'date',
              timezone: true,
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'endsAt',
              label: 'Tugashi',
              type: 'date',
              timezone: true,
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'contractRef',
              label: 'Shartnoma',
              type: 'text',
              access: { read: staffField },
              admin: { description: 'Ichki; saytda koʻrinmaydi.' },
            },
            {
              name: 'ageMark',
              label: 'Yosh chegarasi',
              type: 'select',
              options: AGE_MARKS.map((value) => ({ label: value, value })),
            },
          ],
        },
      ],
    },
  ],
  hooks: globalHooksFor('ad-slots'),
}
