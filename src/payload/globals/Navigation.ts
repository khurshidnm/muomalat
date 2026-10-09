import type { Field, GlobalConfig, TextFieldSingleValidation } from 'payload'

import type { RubricSlug } from '../../content/types'
import { navigationAccess } from '../access/system'
import { REL } from '../fields/relations'
import { globalHooksFor } from '../hooks'

/** Fixed pages a menu item can point at; the path comes from `paths` in src/lib/routes.ts. */
export const NAV_PAGES = ['lugat', 'xarita', 'klub', 'dayjest', 'about', 'advertise', 'contact'] as const
export type NavPage = (typeof NAV_PAGES)[number]

const RUBRICS = ['yangiliklar', 'tahlil', 'intervyu', 'izoh', 'dunyo'] as const satisfies readonly RubricSlug[]

/**
 * Locale-free route patterns of the site (src/lib/routes.ts `paths`). A custom
 * item must match one; the front end adds the locale prefix with
 * href(locale, path), so paths are never written with /kr, /ru or /en.
 */
const SEGMENT = '[a-z0-9]+(?:-[a-z0-9]+)*'
const ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  new RegExp(`^/(?:${RUBRICS.join('|')})(?:/${SEGMENT})?$`),
  new RegExp(`^/(?:lugat|klub)(?:/${SEGMENT})?$`),
  /^\/(?:xarita|dayjest|biz-haqimizda|reklama|aloqa|qidiruv|rss\.xml)$/,
  new RegExp(`^/(?:mavzu|muallif)/${SEGMENT}$`),
]

const knownRoute: TextFieldSingleValidation = (value, { siblingData }) => {
  if ((siblingData as { kind?: string })?.kind !== 'custom') return true
  if (!value) return 'Sahifa yoʻlini kiriting, masalan /tahlil.'
  const path = value.split(/[?#]/)[0]
  if (/^\/(?:kr|ru|en)(?:\/|$)/.test(path)) return 'Yoʻlni til prefiksisiz yozing (/ru/tahlil emas, /tahlil).'
  return ROUTE_PATTERNS.some((re) => re.test(path)) || 'Bunday sahifa saytda yoʻq. Mavjud sahifa yoʻlini kiriting.'
}

/** One menu item; header and footer columns use the same shape. Order = array order. */
const itemFields: Field[] = [
  {
    name: 'kind',
    label: 'Turi',
    type: 'select',
    required: true,
    defaultValue: 'rubric',
    options: [
      { label: 'Rubrika', value: 'rubric' },
      { label: 'Sahifa', value: 'page' },
      { label: 'Boshqa yoʻl', value: 'custom' },
    ],
  },
  {
    name: 'rubric',
    label: 'Rubrika',
    type: 'relationship',
    relationTo: REL.rubrics,
    admin: { condition: (_, sibling) => sibling?.kind === 'rubric' },
  },
  {
    name: 'page',
    label: 'Sahifa',
    type: 'select',
    options: [
      { label: 'Lugʻat', value: 'lugat' },
      { label: 'Bozor xaritasi', value: 'xarita' },
      { label: 'Klub', value: 'klub' },
      { label: 'Dayjest', value: 'dayjest' },
      { label: 'Biz haqimizda', value: 'about' },
      { label: 'Reklama', value: 'advertise' },
      { label: 'Aloqa', value: 'contact' },
    ] satisfies { label: string; value: NavPage }[],
    admin: { condition: (_, sibling) => sibling?.kind === 'page' },
  },
  {
    name: 'path',
    label: 'Yoʻl',
    type: 'text',
    validate: knownRoute,
    admin: {
      condition: (_, sibling) => sibling?.kind === 'custom',
      description: 'Saytdagi sahifa yoʻli, til prefiksisiz: /mavzu/ijora, /biz-haqimizda#tuzatishlar.',
    },
  },
  {
    name: 'label',
    label: 'Yorliq',
    type: 'text',
    localized: true,
    admin: { description: 'Ixtiyoriy. Boʻsh boʻlsa, sayt matnlaridagi standart nom ishlatiladi.' },
  },
  { name: 'visible', label: 'Koʻrinadi', type: 'checkbox', defaultValue: true },
]

/**
 * Header and footer menus (CMS-SPEC §3.16). Drafts on: the editor-in-chief
 * or admin edits a draft and publishes it. The public site reads only the
 * published version; while none exists it keeps today's menus.
 */
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigatsiya',
  admin: { group: 'Sozlamalar', description: 'Sayt menyulari. Tartib roʻyxatdagi tartib boʻyicha.' },
  access: navigationAccess,
  versions: { drafts: true, max: 0 },
  fields: [
    { name: 'header', label: 'Yuqori menyu', labels: { singular: 'Menyu bandi', plural: 'Menyu bandlari' }, type: 'array', fields: itemFields },
    {
      name: 'footer',
      label: 'Pastki menyu',
      labels: { singular: 'Ustun', plural: 'Ustunlar' },
      type: 'array',
      admin: { description: 'Har bir qator — bitta ustun.' },
      fields: [
        { name: 'title', label: 'Ustun sarlavhasi', type: 'text', localized: true },
        { name: 'items', label: 'Bandlar', labels: { singular: 'Band', plural: 'Bandlar' }, type: 'array', fields: itemFields },
      ],
    },
  ],
  hooks: globalHooksFor('navigation'),
}
