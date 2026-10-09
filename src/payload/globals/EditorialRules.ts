import type { Field, GlobalConfig, TextFieldSingleValidation } from 'payload'

import { editorialRulesAccess } from '../access/system'
import { globalHooksFor } from '../hooks'

/** A pattern is a case-insensitive regular expression; it must compile. */
const regexPattern: TextFieldSingleValidation = (value) => {
  if (!value) return 'Andozani kiriting.'
  try {
    new RegExp(value, 'i')
    return true
  } catch {
    return 'Andoza notoʻgʻri (regular expression xatosi).'
  }
}

const domainName: TextFieldSingleValidation = (value) =>
  !!value && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)
    ? true
    : 'Faqat domen nomi, kichik harflarda: masalan, cbu.uz (https:// va yoʻlsiz).'

/** A list of patterns with an optional note on why each one is there. */
const patternList = (name: string, label: string, description: string): Field => ({
  name,
  label,
  type: 'array',
  admin: { description },
  fields: [
    { name: 'pattern', label: 'Andoza', type: 'text', required: true, validate: regexPattern },
    { name: 'note', label: 'Izoh', type: 'text' },
  ],
})

/**
 * Editorial rules that editors maintain without a deploy ("Tahririyat
 * qoidalari", CMS-SPEC §3.16). These lists only **extend** the rules in code
 * (src/content/rules.ts): `BANNED`, `REVIEW`, `REAL_ORGS` and the rest always
 * apply, and nothing here can switch a code-level rule off. The import (§11)
 * seeds the lists; the validation concern reads them through the `rules`
 * cache tag.
 */
export const EditorialRules: GlobalConfig = {
  slug: 'editorial-rules',
  label: 'Tahririyat qoidalari',
  admin: {
    group: 'Sozlamalar',
    description: 'Kod ichidagi qoidalarga qoʻshimchalar. Faqat bosh muharrir oʻzgartiradi; kod qoidasini bu yerdan oʻchirib boʻlmaydi.',
  },
  access: editorialRulesAccess,
  versions: { max: 0 },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Matn',
          fields: [
            patternList(
              'bannedTerms',
              'Taqiqlangan soʻzlar',
              'Diniy atamalar (TXT-3): nashr qilinmaydi. Koddagi roʻyxatga qoʻshiladi.',
            ),
            patternList(
              'reviewTerms',
              'Tekshiriladigan soʻzlar',
              'Hukmga oʻxshash iboralar: ogohlantirish beradi, muharrir koʻrib chiqadi.',
            ),
            {
              name: 'realOrgNames',
              label: 'Haqiqiy tashkilot nomlari',
              type: 'array',
              admin: { description: 'Matnda uchrasa, «Haqida/Eslatilgan» maydoniga belgilash taklif qilinadi (TXT-5).' },
              fields: [{ name: 'name', label: 'Nomi', type: 'text', required: true }],
            },
            {
              name: 'houseSpellings',
              label: 'Tahririyat imlosi',
              type: 'array',
              admin: { description: 'Masalan: som → soʻm (TXT-10).' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'wrong', label: 'Notoʻgʻri', type: 'text', required: true },
                    { name: 'right', label: 'Toʻgʻri', type: 'text', required: true },
                  ],
                },
                { name: 'note', label: 'Izoh', type: 'text' },
              ],
            },
            {
              name: 'expectedReturnPhrases',
              label: 'Daromad vaʼdasi iboralari',
              type: 'array',
              // Default version-table names exceed Postgres's 63-character identifier limit.
              dbName: 'editorial_rules_return_phrases',
              admin: {
                description:
                  'Kafolatlangan daromad vaʼdasi kabi iboralar, masalan «kafolatlangan daromad», «гарантированн\\w+ доход», «guaranteed return».',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'locale',
                      label: 'Til',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Oʻzbekcha', value: 'uz' },
                        { label: 'Русский', value: 'ru' },
                        { label: 'English', value: 'en' },
                      ],
                    },
                    { name: 'pattern', label: 'Andoza', type: 'text', required: true, validate: regexPattern },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Manbalar',
          fields: [
            {
              name: 'officialSourceDomains',
              label: 'Rasmiy manba domenlari',
              type: 'array',
              dbName: 'editorial_rules_source_domains',
              admin: {
                description: 'Shoshilinch yoʻl (§5.4) uchun: manba havolasi shu domenlardan birida boʻlishi kerak.',
              },
              fields: [
                {
                  name: 'domain',
                  label: 'Domen',
                  type: 'text',
                  required: true,
                  validate: domainName,
                  hooks: {
                    beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)],
                  },
                },
                { name: 'note', label: 'Izoh', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Kirill',
          description: 'Keyinroq: /kr nashri uchun transliteratsiya istisnolari (src/i18n/translit.ts ga qoʻshiladi).',
          fields: [
            {
              name: 'translitExceptions',
              label: 'Transliteratsiya istisnolari',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'latin', label: 'Lotincha', type: 'text', required: true },
                    { name: 'cyrillic', label: 'Kirillcha', type: 'text', required: true },
                    {
                      name: 'softEnd',
                      label: 'Oxirida ь',
                      type: 'checkbox',
                      admin: { description: 'Soʻz oxirida yumshatish belgisi qoʻyiladi.' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'translitKeep',
              label: 'Oʻzgarmaydigan soʻzlar',
              type: 'array',
              admin: { description: 'Lotin harflarida qoladigan qisqartmalar, masalan AAOIFI.' },
              fields: [{ name: 'term', label: 'Soʻz', type: 'text', required: true }],
            },
          ],
        },
        {
          label: 'Chegaralar',
          fields: [
            {
              name: 'limits',
              label: 'Uzunlik chegaralari',
              type: 'group',
              admin: { description: 'Belgilar soni. Ogohlantirish chegarasi xato chegarasidan kichik boʻlishi kerak.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'titleWarn', label: 'Sarlavha: ogohlantirish', type: 'number', min: 1, defaultValue: 80, required: true },
                    { name: 'titleMax', label: 'Sarlavha: eng koʻp', type: 'number', min: 1, defaultValue: 140, required: true },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'leadWarn', label: 'Lid: ogohlantirish', type: 'number', min: 1, defaultValue: 300, required: true },
                    { name: 'leadMax', label: 'Lid: eng koʻp', type: 'number', min: 1, defaultValue: 500, required: true },
                  ],
                },
                {
                  name: 'telegramCaption',
                  label: 'Telegram matni: eng koʻp',
                  type: 'number',
                  min: 1,
                  max: 1024,
                  defaultValue: 1024,
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: globalHooksFor('editorial-rules'),
}
