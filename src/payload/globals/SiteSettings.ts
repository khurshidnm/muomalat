import type { Field, GlobalConfig, TextFieldSingleValidation } from 'payload'

import { site } from '../../content/data/site'
import { fieldRoles, siteSettingsAccess, staffField, systemFieldAccess } from '../access/system'
import { globalHooksFor } from '../hooks'

/** Age marks (Law on protecting children from harmful information; types.ts `Article.ageMark`). */
export const AGE_MARKS = ['0+', '7+', '12+', '16+', '18+'] as const
export type AgeMark = (typeof AGE_MARKS)[number]
const ageMarkOptions = AGE_MARKS.map((value) => ({ label: value, value }))

const httpsUrl: TextFieldSingleValidation = (value) => {
  if (!value) return true
  try {
    return new URL(value).protocol === 'https:' || 'Faqat https:// havola.'
  } catch {
    return 'Toʻliq havola kiriting (https://…).'
  }
}

/** A full https URL or a site path such as /biz-haqimizda#tuzatishlar. */
const httpsOrSitePath: TextFieldSingleValidation = (value, args) =>
  !value || /^\/(?!\/)[^\s]*$/.test(value) ? true : httpsUrl(value, args)

/** Write access for one group, used for both create and update (globals are created on first save). */
const writers = (...roles: Parameters<typeof fieldRoles>) => {
  const fn = fieldRoles(...roles)
  return { create: fn, update: fn }
}

type LegalKey = keyof typeof site.legal | 'postalIndex'

/**
 * One line of the legal imprint (Media Law Art. 27¹): `{ value, placeholder }`,
 * rendered through <Placeholder> while `placeholder` is true. Defaults are the
 * placeholders in src/content/data/site.ts, so a new install starts in the
 * same state as the mock site.
 */
const legalLine = (name: LegalKey, label: string, opts: { ageMark?: boolean; description?: string } = {}): Field => {
  const seed = name === 'postalIndex' ? { value: '', placeholder: true } : site.legal[name]
  return {
    name,
    label,
    type: 'group',
    admin: { description: opts.description },
    fields: [
      opts.ageMark
        ? { name: 'value', label: 'Qiymat', type: 'select', options: ageMarkOptions, defaultValue: seed.value }
        : { name: 'value', label: 'Qiymat', type: 'text', defaultValue: seed.value },
      {
        name: 'placeholder',
        label: 'Namuna (haqiqiy qiymat hali yoʻq)',
        type: 'checkbox',
        defaultValue: seed.placeholder,
        admin: { description: 'Belgilangan qator saytda namuna sifatida koʻrsatiladi.' },
      },
    ],
  }
}

/**
 * Site-wide settings (CMS-SPEC §3.16). Each group is writable only by its
 * owners (§4.2); the global's update access is the union of them.
 *
 * Not here, by design:
 * - SET-1 (the demo launch gate) and SP-7 (label wording) are validation-
 *   concern hooks; the `legal.meta.lastChangedAt` stamp and the Art. 20
 *   alert are the audit concern's (later waves).
 * - Version restore on a global runs no hooks and no field access
 *   (PHASE0-FINDINGS item 12) and republishes at once. `readVersions` is
 *   limited to admin and the editor-in-chief, so an editor (who may write
 *   only `emergency`) cannot restore a whole version. The restore guard is a
 *   `beforeOperation` hook in a later wave.
 * - `demo.noticeEnabled` replaces NEXT_PUBLIC_DEMO_NOTICE in Header.tsx when
 *   the front end switches to Payload; the variable still forces it off.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Sayt sozlamalari',
  admin: { group: 'Sozlamalar', description: 'Saytning umumiy, huquqiy va texnik sozlamalari.' },
  access: siteSettingsAccess,
  versions: { max: 0 },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Asosiy',
          description: 'Faqat administrator oʻzgartiradi.',
          fields: [
            { name: 'name', label: 'Nomi', type: 'text', required: true, defaultValue: site.name, access: writers('admin') },
            { name: 'domain', label: 'Domen', type: 'text', required: true, defaultValue: site.domain, access: writers('admin') },
            { name: 'email', label: 'E-pochta', type: 'email', defaultValue: site.email, access: writers('admin') },
            {
              name: 'foundedYear',
              label: 'Tashkil etilgan yil',
              type: 'number',
              min: 2020,
              max: 2100,
              defaultValue: site.foundedYear,
              access: writers('admin'),
            },
          ],
        },
        {
          label: 'Huquqiy maʼlumotlar',
          fields: [
            {
              name: 'legal',
              label: 'Chiqish maʼlumotlari',
              type: 'group',
              access: writers('eic'),
              admin: {
                description:
                  'OAV toʻgʻrisidagi qonun, 27¹-modda. Faqat bosh muharrir oʻzgartiradi. Har qanday oʻzgarish haqida bir oy ichida roʻyxatga olgan organga xabar beriladi (20-modda).',
              },
              fields: [
                legalLine('registrationNumber', 'Guvohnoma raqami'),
                legalLine('registrationDate', 'Roʻyxatdan oʻtgan sana', { description: 'KK.OO.YYYY' }),
                legalLine('registrar', 'Roʻyxatga olgan organ'),
                legalLine('founder', 'Muassis'),
                legalLine('editorInChief', 'Bosh muharrir', { description: 'Familiya, ism, otasining ismi.' }),
                legalLine('address', 'Manzil'),
                legalLine('postalIndex', 'Indeks', {
                  description: 'Pochta indeksi yoki obuna indeksi: qaysi biri talab qilinishini huquqshunos aniqlaydi.',
                }),
                legalLine('email', 'E-pochta'),
                legalLine('phone', 'Telefon (ixtiyoriy)'),
                legalLine('ageMark', 'Yosh chegarasi', { ageMark: true }),
                {
                  name: 'meta',
                  type: 'group',
                  label: 'Tizim',
                  access: { read: staffField, ...systemFieldAccess },
                  fields: [
                    {
                      name: 'lastChangedAt',
                      label: 'Oxirgi oʻzgarish',
                      type: 'date',
                      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Demo va belgilar',
          fields: [
            {
              name: 'demo',
              label: 'Demo rejimi',
              type: 'group',
              access: writers('admin', 'eic'),
              fields: [
                {
                  name: 'noticeEnabled',
                  label: 'Demo ogohlantirishini koʻrsatish',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    description: 'Oʻchirish uchun avval barcha chiqish maʼlumotlari haqiqiy boʻlishi kerak (namuna belgisi olib tashlangan).',
                  },
                },
                { name: 'noticeText', label: 'Ogohlantirish matni', type: 'textarea', localized: true },
              ],
            },
            {
              name: 'labels',
              label: 'Reklama belgilari',
              type: 'group',
              access: writers('eic'),
              admin: { description: 'Oʻzbekchada «Reklama», ruschada «Реклама», inglizchada «Advertisement» soʻzi boʻlishi shart.' },
              fields: [
                {
                  name: 'sponsored',
                  label: 'Hamkorlik materiali belgisi',
                  type: 'text',
                  localized: true,
                  defaultValue: ({ locale }) =>
                    locale === 'ru'
                      ? 'Реклама · Партнёрский материал'
                      : locale === 'en'
                        ? 'Advertisement · Partner content'
                        : 'Reklama · Hamkorlik materiali',
                },
                {
                  name: 'advert',
                  label: 'Reklama joyi belgisi',
                  type: 'text',
                  localized: true,
                  defaultValue: ({ locale }) => (locale === 'ru' ? 'Реклама' : locale === 'en' ? 'Advertisement' : 'Reklama'),
                },
              ],
            },
          ],
        },
        {
          label: 'Telegram',
          fields: [
            {
              name: 'telegram',
              label: 'Telegram',
              type: 'group',
              // Access per field, not on the group: a child can never get more than its group,
              // and postingEnabled is also the editor-in-chief's.
              fields: [
                {
                  name: 'channelHandle',
                  label: 'Kanal',
                  type: 'text',
                  defaultValue: site.telegram.handle,
                  access: writers('admin'),
                },
                {
                  name: 'channelUrl',
                  label: 'Kanal havolasi',
                  type: 'text',
                  defaultValue: site.telegram.url,
                  validate: httpsUrl,
                  access: writers('admin'),
                },
                {
                  name: 'channelChatId',
                  label: 'Kanal chat ID',
                  type: 'text',
                  access: { read: staffField, ...systemFieldAccess },
                  admin: { readOnly: true, description: 'Bot tekshiruvi yozadi (-100… raqami).' },
                },
                {
                  name: 'feedbackBot',
                  label: 'Fikr-mulohaza boti',
                  type: 'text',
                  access: writers('admin'),
                  admin: { description: 'Masalan, @muomalat_bot.' },
                },
                {
                  name: 'inviteLinks',
                  label: 'Taklif havolalari',
                  labels: { singular: 'Taklif havolasi', plural: 'Taklif havolalari' },
                  type: 'array',
                  access: writers('admin'),
                  admin: { description: 'Kanal egasi Telegram ilovasida yaratadi; bot taklif havolasi yarata olmaydi.' },
                  fields: [
                    {
                      name: 'placement',
                      label: 'Joyi',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Yopishqoq tugma', value: 'sticky' },
                        { label: 'Maqola oxiri', value: 'article_footer' },
                        { label: 'Klub', value: 'club' },
                        { label: 'Dayjest', value: 'digest' },
                        { label: 'Telegram ichidagi brauzer', value: 'in_app' },
                      ],
                    },
                    { name: 'url', label: 'Havola', type: 'text', required: true, validate: httpsUrl },
                  ],
                },
                {
                  name: 'postingEnabled',
                  label: 'Kanalga avtomatik joylash yoqilgan',
                  type: 'checkbox',
                  defaultValue: false,
                  access: writers('admin', 'eic'),
                  admin: { description: 'Favqulodda oʻchirish tugmasi. Bosh muharrir ham oʻchira oladi.' },
                },
                {
                  name: 'delayMinutes',
                  label: 'Yuborishdan oldin kutish (daqiqa)',
                  type: 'number',
                  defaultValue: 3,
                  min: 2,
                  max: 30,
                  required: true,
                  access: writers('admin'),
                },
              ],
            },
          ],
        },
        {
          label: 'Siyosatlar',
          fields: [
            {
              name: 'policies',
              label: 'Siyosatlar',
              type: 'group',
              // Per field: the editor-in-chief owns the policies, admin the security contact.
              fields: [
                {
                  name: 'correctionsPolicyUrl',
                  label: 'Tuzatishlar siyosati',
                  type: 'text',
                  validate: httpsOrSitePath,
                  access: writers('eic'),
                },
                {
                  name: 'privacyPolicyUrl',
                  label: 'Maxfiylik siyosati',
                  type: 'text',
                  validate: httpsOrSitePath,
                  access: writers('eic'),
                },
                {
                  name: 'personalDataOfficer',
                  label: 'Shaxsiy maʼlumotlar uchun masʼul shaxs',
                  type: 'group',
                  access: writers('eic'),
                  admin: { description: 'Shaxsga doir maʼlumotlar toʻgʻrisidagi qonun, 31-modda.' },
                  fields: [
                    { name: 'name', label: 'Ism', type: 'text' },
                    { name: 'email', label: 'E-pochta', type: 'email' },
                  ],
                },
                {
                  name: 'securityContact',
                  label: 'Xavfsizlik boʻyicha aloqa',
                  type: 'text',
                  access: writers('admin'),
                  admin: { description: '/.well-known/security.txt uchun: mailto: yoki https:// havola. Faqat administrator.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Favqulodda',
          fields: [
            {
              name: 'emergency',
              label: 'Favqulodda eʼlon',
              type: 'group',
              access: writers('editor', 'eic', 'admin'),
              admin: { description: 'Barcha sahifalar tepasida koʻrinadigan qisqa eʼlon.' },
              fields: [
                { name: 'enabled', label: 'Koʻrsatish', type: 'checkbox', defaultValue: false },
                { name: 'text', label: 'Matn', type: 'textarea', localized: true },
                { name: 'link', label: 'Havola', type: 'text', validate: httpsOrSitePath },
                {
                  name: 'level',
                  label: 'Darajasi',
                  type: 'select',
                  defaultValue: 'info',
                  options: [
                    { label: 'Maʼlumot', value: 'info' },
                    { label: 'Ogohlantirish', value: 'warning' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Ishlash',
          fields: [
            {
              name: 'operations',
              label: 'Ishlash',
              type: 'group',
              access: { read: fieldRoles('admin', 'eic'), ...writers('admin', 'eic') },
              fields: [
                {
                  name: 'readOnly',
                  label: 'Faqat oʻqish rejimi',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: {
                    description: 'Yoqilsa, CMSda hech kim hech narsani oʻzgartira olmaydi (administratorning shu boʻlimidan tashqari). Hodisa paytida ishlatiladi.',
                  },
                },
                {
                  name: 'officeHours',
                  label: 'Ish vaqti (Toshkent)',
                  type: 'group',
                  admin: { description: 'Ish vaqtidan tashqari birinchi nashr ogohlantirish beradi.' },
                  fields: [
                    { name: 'start', label: 'Boshlanishi', type: 'text', defaultValue: '09:00', validate: hhmm },
                    { name: 'end', label: 'Tugashi', type: 'text', defaultValue: '19:00', validate: hhmm },
                  ],
                },
                {
                  name: 'alertRecipients',
                  label: 'Ogohlantirish oluvchilar',
                  labels: { singular: 'Oluvchi', plural: 'Oluvchilar' },
                  type: 'array',
                  // The default version-table name is longer than Postgres's 63-character limit.
                  dbName: 'site_settings_alert_recipients',
                  admin: { description: 'Muhim hodisalar e-pochta orqali yuboriladi (Telegram guruhiga qoʻshimcha).' },
                  fields: [
                    { name: 'name', label: 'Ism', type: 'text', required: true },
                    { name: 'email', label: 'E-pochta', type: 'email', required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: globalHooksFor('site-settings'),
}

function hhmm(value: string | null | undefined): true | string {
  return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value) || 'Vaqt SS:DD koʻrinishida (masalan, 09:00).'
}
