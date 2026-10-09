import type { AcceptedLanguages } from '@payloadcms/translations'
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import type { Config } from 'payload'

import { uz } from './uz'

/**
 * `plugin-redirects` ships no Russian strings; without these its field labels
 * show as raw keys in the Russian admin.
 */
const ruRedirects = {
  customUrl: 'Произвольный URL',
  documentToRedirect: 'Документ для перенаправления',
  fromUrl: 'Исходный URL',
  internalLink: 'Внутренняя ссылка',
  redirectType: 'Тип перенаправления',
  toUrlType: 'Тип назначения',
}

/**
 * Admin interface languages (CMS-SPEC §6.6, PHASE0 §1.6). Uzbek is the
 * default; Russian and English stay selectable in the account settings.
 * Payload reads the language cookie first, then Accept-Language, then
 * `fallbackLanguage`. Accept-Language never selects `uz` but does select `ru`
 * or `en`, so src/proxy.ts presents the `uz` cookie on the CMS host until a
 * staff member has chosen a language. The `uz` entry also carries the Lexical
 * and plugin-redirects namespaces (src/payload/i18n/uz.ts).
 *
 * `error:userLocked` is replaced with the generic login error in every
 * language: "This user is locked" tells an attacker that the account exists
 * (PHASE0 §1.4). Both errors are 401.
 */
export const i18n = {
  supportedLanguages: { ...uz.supportedLanguagesEntry, ru, en },
  fallbackLanguage: 'uz' as AcceptedLanguages,
  translations: {
    ...uz.translationsEntry,
    ru: { 'plugin-redirects': ruRedirects, error: { userLocked: ru.translations.error.emailOrPasswordIncorrect } },
    en: { error: { userLocked: en.translations.error.emailOrPasswordIncorrect } },
  },
} satisfies Config['i18n']
