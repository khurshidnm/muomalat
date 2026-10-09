import type { CollectionConfig, FieldHook } from 'payload'
import { isolateObjectProperty } from 'payload'

import { editorialAccess, fieldRoles } from '../access/editorial'
import { validateIsoDay } from '../fields/dates'
import { REL } from '../fields/relations'
import { system, systemFields } from '../fields/system'
import { translationGroup } from '../fields/translation'
import { hooksFor } from '../hooks'

export const institutionTypeOptions = [
  { label: 'Bank', value: 'bank' },
  { label: 'Islom oynasi', value: 'window' },
  { label: 'Mikromoliya tashkiloti', value: 'microfinance' },
  { label: 'Lizing kompaniyasi', value: 'leasing' },
  { label: 'Takaful operatori', value: 'takaful' },
]

/** granted: licence issued; review: under review; applied: filed; announced: intention announced. */
export const licenceStatusOptions = [
  { label: 'Litsenziya berilgan', value: 'granted' },
  { label: 'Koʻrib chiqilmoqda', value: 'review' },
  { label: 'Ariza topshirilgan', value: 'applied' },
  { label: 'Niyat eʼlon qilingan', value: 'announced' },
]

type StatusRow = { status?: string; date?: string; source?: string; note?: string }

/**
 * `statusHistory`: when a publish changes the status or its date, the values
 * that were live until then are appended. The live values are read from the
 * main row (drafts do not touch it), so intermediate drafts leave no trace.
 */
const appendStatusHistory: FieldHook = async ({ value, siblingData, originalDoc, req, collection }) => {
  const rows = (Array.isArray(value) ? value : []) as StatusRow[]
  if (siblingData?._status !== 'published' || !originalDoc?.id || !collection) return value
  const live = (await req.payload.findByID({
    collection: collection.slug as never,
    id: originalDoc.id,
    depth: 0,
    draft: false,
    disableErrors: true,
    overrideAccess: true,
    req: isolateObjectProperty(req, ['locale', 'fallbackLocale']),
  })) as { _status?: string; status?: string; statusDate?: string; statusSource?: string } | null
  if (!live || live._status !== 'published' || !live.status) return value
  if (live.status === siblingData.status && live.statusDate === siblingData.statusDate) return value
  return [...rows, { status: live.status, date: live.statusDate, source: live.statusSource }]
}

/**
 * Licensed and applying institutions for /xarita (CMS-SPEC §3.9). Real names
 * are allowed in `name` (TXT-5 does not apply to it). The importer sets
 * `needsReview` on mock institutions, which use fictional names.
 */
export const Institutions: CollectionConfig = {
  slug: 'institutions',
  labels: { singular: 'Tashkilot', plural: 'Tashkilotlar' },
  admin: {
    group: 'Maʼlumotnoma',
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'status', 'statusDate', 'city', 'updatedAt'],
    listSearchableFields: ['name', 'parent', 'city'],
    disableCopyToLocale: true,
  },
  defaultSort: 'name',
  versions: { drafts: { autosave: true }, maxPerDoc: 0 },
  access: editorialAccess({
    readAll: ['reporter', 'editor', 'eic'],
    create: ['reporter', 'editor', 'eic'],
    publish: ['editor', 'eic'],
    draftOnly: ['reporter'],
    delete: ['eic'],
  }),
  hooks: hooksFor('institutions'),
  fields: [
    {
      name: 'name',
      label: 'Nomi',
      type: 'text',
      required: true,
      admin: { description: 'Tashkilotning rasmiy nomi; bu maydonda haqiqiy nomlar yoziladi.' },
    },
    { name: 'type', label: 'Turi', type: 'select', required: true, options: institutionTypeOptions },
    {
      name: 'parent',
      label: 'Bosh bank',
      type: 'text',
      admin: { description: 'Islom oynasi uchun shart: oyna ochilgan anʼanaviy bank.', condition: (_, sibling) => sibling?.type === 'window' },
    },
    { name: 'city', label: 'Shahar', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          label: 'Holati',
          type: 'select',
          required: true,
          options: licenceStatusOptions,
          // The default enum name would be enum_institutions_status, which the drafts `_status` enum already uses.
          enumName: 'enum_institutions_licence_status',
        },
        {
          name: 'statusDate',
          label: 'Holat sanasi',
          type: 'text',
          required: true,
          validate: validateIsoDay,
          admin: { description: 'YYYY-MM-DD; kelajakdagi sana boʻlmaydi.' },
        },
      ],
    },
    {
      name: 'statusSource',
      label: 'Holat manbasi',
      type: 'text',
      admin: { description: 'Regulyator xabari yoki reyestrga havola. «Litsenziya berilgan» holatda boʻsh qolsa ogohlantiriladi.' },
    },
    { name: 'licenceNumber', label: 'Litsenziya raqami', type: 'text' },
    system({
      name: 'statusHistory',
      label: 'Holatlar tarixi',
      type: 'array',
      hooks: { beforeChange: [appendStatusHistory] },
      admin: { initCollapsed: true, description: 'Holat yoki sana oʻzgarib chop etilganda avvalgi qiymatlar avtomatik qoʻshiladi.' },
      fields: [
        { name: 'status', label: 'Holati', type: 'select', options: licenceStatusOptions },
        { name: 'date', label: 'Sana', type: 'text' },
        { name: 'source', label: 'Manba', type: 'text' },
        { name: 'note', label: 'Izoh', type: 'text' },
      ],
    }),
    { name: 'products', label: 'Mahsulotlar', type: 'text', hasMany: true, admin: { description: 'Har bir mahsulotni alohida kiriting, masalan «Murobaha (KOʻB uchun)».' } },
    { name: 'note', label: 'Izoh', type: 'textarea', localized: true },
    { name: 'article', label: 'Maqola', type: 'relationship', relationTo: REL.articles, admin: { description: 'Shu tashkilot haqidagi asosiy maqola.' } },
    {
      name: 'needsReview',
      label: 'Koʻrib chiqish kerak',
      type: 'checkbox',
      access: { create: fieldRoles('editor', 'eic'), update: fieldRoles('editor', 'eic') },
      admin: { position: 'sidebar', description: 'Import qilingan yozuv muharrir tekshirib, belgini olib tashlamaguncha chop etilmaydi.' },
    },
    { type: 'collapsible', label: 'Tarjima', admin: { initCollapsed: true }, fields: [translationGroup()] },
    ...systemFields(),
  ],
}
