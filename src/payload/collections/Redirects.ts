import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import type { Field, TextFieldSingleValidation } from 'payload'

import { hiddenUnless, redirectsAccess } from '../access/system'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'

/** A path on the site: starts with one slash, no host, no spaces (/tahlil/eski-slug, /ru/lugat/murobaha). */
const SITE_PATH = /^\/(?!\/)\S*$/

const sitePath: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && SITE_PATH.test(value)
    ? true
    : 'Saytdagi eski yoʻlni yozing: / bilan boshlanadi, domensiz, masalan /tahlil/eski-slug yoki /ru/tahlil/eski-slug.'

const httpsOrSitePath: TextFieldSingleValidation = (value) => {
  if (typeof value === 'string' && SITE_PATH.test(value)) return true
  try {
    return new URL(String(value)).protocol === 'https:' || 'Faqat https:// havola yoki sayt ichidagi /yoʻl.'
  } catch {
    return 'Faqat https:// havola yoki sayt ichidagi /yoʻl.'
  }
}

/** The plugin's default fields with our validation and Uzbek help text. */
const withRules = ({ defaultFields }: { defaultFields: Field[] }): Field[] =>
  defaultFields.map((field): Field => {
    if (field.type === 'text' && !field.hasMany && field.name === 'from') {
      return {
        ...field,
        validate: sitePath,
        admin: { ...field.admin, description: 'Eski manzil, til prefiksi bilan: /tahlil/eski-slug, /ru/tahlil/eski-slug. Domen yozilmaydi.' },
      }
    }
    if (field.type === 'group' && 'name' in field && field.name === 'to') {
      return {
        ...field,
        // Without a label Payload names the group after the field: «To».
        label: 'Yangi manzil',
        fields: field.fields.map((sub): Field => (sub.type === 'text' && !sub.hasMany && sub.name === 'url' ? { ...sub, validate: httpsOrSitePath } : sub)),
      }
    }
    return field
  })

/**
 * URL redirects (CMS-SPEC §3.15, §8.8), from `@payloadcms/plugin-redirects`.
 * Created by the workflow concern from `slugHistory` when a published slug
 * changes, by the import, and by editors by hand. The site applies them on a
 * 404 (`resolveMissing`, cache tag `redirects`). Targets are the routed
 * collections: stories, glossary terms, club meetings, author and tag pages.
 * Always 301: an old address of a story is replaced for good.
 */
export const redirects = redirectsPlugin({
  collections: [REL.articles, REL.glossaryTerms, REL.clubEvents, REL.authors, REL.tags],
  redirectTypes: ['301'],
  redirectTypeFieldOverride: {
    defaultValue: '301',
    admin: { description: '301: doimiy yoʻnaltirish. Qidiruv tizimlari eski manzilni yangisiga almashtiradi.' },
  },
  overrides: {
    labels: { singular: 'Yoʻnaltirish', plural: 'Yoʻnaltirishlar' },
    admin: {
      group: 'Sozlamalar',
      useAsTitle: 'from',
      defaultColumns: ['from', 'to.type', 'type', 'updatedAt'],
      hidden: hiddenUnless('editor', 'eic', 'admin'),
      description: 'Eski manzildan yangisiga 301 yoʻnaltirish. Chop etilgan maqola manzili oʻzgarganda avtomatik yaratiladi.',
    },
    access: redirectsAccess,
    disableDuplicate: true,
    hooks: hooksFor('redirects'),
    fields: withRules,
  },
})
