import type { CollectionConfig, Field } from 'payload'

import { editorialAccess, fieldRoles, notAdminField, staffField } from '../access/editorial'
import { REL } from '../fields/relations'
import { slugField } from '../fields/slug'
import { systemFields } from '../fields/system'
import { hooksFor } from '../hooks'

/** Admin may change only the account link; every other field is editorial (separation of duties, §4.1). */
const editorialOnly = <F extends Field>(field: F): F => {
  const f = field as F & { access?: Record<string, unknown> }
  return { ...f, access: { ...f.access, create: notAdminField, update: notAdminField } } as F
}

/**
 * Bylines (CMS-SPEC §3.5). `name` is translated only for team bylines; personal
 * names stay as written in every edition. Rules that depend on the document
 * (a reporter edits only their own profile, commercial only the commercial
 * byline, only unused authors are deleted) run in hooks, not in access.
 */
export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: { singular: 'Muallif', plural: 'Mualliflar' },
  admin: {
    group: 'Tahririyat',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'commercial', 'active', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
    // The built-in Copy to locale publishes at once (PHASE0 item 16).
    disableCopyToLocale: true,
  },
  versions: { drafts: { autosave: true }, maxPerDoc: 100 },
  access: editorialAccess({
    readAll: ['reporter', 'editor', 'eic', 'commercial', 'admin'],
    create: ['editor', 'eic'],
    // Admin saves only to set the `user` link (field access below keeps everything else editorial).
    publish: ['editor', 'eic', 'admin'],
    draftOnly: ['reporter', 'commercial'],
    delete: ['eic'],
  }),
  hooks: hooksFor('authors'),
  fields: [
    editorialOnly(
      slugField({ from: 'name', localizedSource: true, description: 'Muallif sahifasining manzili, masalan «aziza-rahimova».' }),
    ),
    ...[
      {
        name: 'name',
        label: 'Ism',
        type: 'text',
        localized: true,
        admin: { description: 'Shaxs ismi barcha tillarda bir xil yoziladi; rus va ingliz tilidagi nom faqat jamoa imzolari uchun.' },
      },
      { name: 'role', label: 'Lavozim', type: 'text', localized: true },
      { name: 'bio', label: 'Qisqacha maʼlumot', type: 'textarea', localized: true },
      {
        name: 'commercial',
        label: 'Tijorat imzosi',
        type: 'checkbox',
        admin: { description: 'Hamkorlik materiallari imzosi: saytda jurnalist imzosi kabi koʻrsatilmaydi.' },
      },
      {
        name: 'isTeam',
        label: 'Jamoa imzosi',
        type: 'checkbox',
        admin: { description: 'Tahririyat yoki boʻlim nomidan; JSON-LD da Person emas, Organization.' },
      },
      { name: 'email', label: 'Elektron pochta', type: 'email' },
      {
        name: 'telegram',
        label: 'Telegram',
        type: 'text',
        validate: (value: unknown) =>
          value === undefined || value === null || value === '' || (typeof value === 'string' && /^@[A-Za-z0-9_]{5,32}$/.test(value))
            ? true
            : 'Telegram foydalanuvchi nomi @ bilan, 5–32 ta lotin harfi, raqam yoki «_»: masalan @muomalatuz.',
      },
      { name: 'portrait', label: 'Portret', type: 'upload', relationTo: REL.media },
      {
        name: 'active',
        label: 'Faol',
        type: 'checkbox',
        defaultValue: true,
        admin: { description: 'Faol boʻlmagan muallif tanlov roʻyxatlarida koʻrinmaydi; sahifasi saqlanadi.' },
      },
    ].map((f) => editorialOnly(f as Field)),
    {
      name: 'user',
      label: 'Xodim hisobi',
      type: 'relationship',
      relationTo: REL.users,
      unique: true,
      access: { read: staffField, create: fieldRoles('admin'), update: fieldRoles('admin') },
      admin: {
        position: 'sidebar',
        description: 'Imzoni xodim hisobiga bogʻlaydi: ikki kishi qoidasi va kirish huquqlari shunga tayanadi. Faqat administrator belgilaydi.',
      },
    },
    ...systemFields(),
  ],
}
