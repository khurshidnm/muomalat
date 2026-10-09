import type { CollectionConfig } from 'payload'

import { hiddenUnless, publishEventsAccess } from '../access/system'
import { hooksFor } from '../hooks'

export const PUBLISH_EVENT_KINDS = [
  'publish_first',
  'publish_change',
  'unpublish',
  'withdraw',
  'restore',
  'delete',
  'global_change',
  'schedule_run',
] as const
export type PublishEventKind = (typeof PUBLISH_EVENT_KINDS)[number]

/**
 * Outbox of the publish pipeline ("Monolog-lite", CMS-SPEC §8.4). The
 * invalidate concern inserts a row in the same transaction as the change
 * (later wave); the worker re-posts the invalidations, warms the pages,
 * purges Cloudflare, queues Telegram and marks the row done or failed.
 *
 * Nobody writes through Payload: hooks and the worker use `overrideAccess:
 * true`. The database role keeps UPDATE (status) but has no DELETE or
 * TRUNCATE on publish_events. No document locking: nobody edits these rows.
 */
export const PublishEvents: CollectionConfig = {
  slug: 'publish-events',
  labels: { singular: 'Nashr hodisasi', plural: 'Nashr hodisalari' },
  admin: {
    group: 'Tizim',
    useAsTitle: 'docId',
    defaultColumns: ['at', 'kind', 'collection', 'docId', 'status', 'attempts'],
    hidden: hiddenUnless('editor', 'eic', 'admin'),
    description: 'Nashrdan keyingi ishlar navbati: kesh yangilash, Cloudflare tozalash, Telegram.',
  },
  access: publishEventsAccess,
  lockDocuments: false,
  disableDuplicate: true,
  defaultSort: '-id',
  fields: [
    {
      name: 'at',
      label: 'Vaqt',
      type: 'date',
      required: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'collection', label: 'Toʻplam yoki global', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'docId', label: 'Hujjat ID', type: 'text', admin: { readOnly: true } },
    {
      name: 'kind',
      label: 'Turi',
      type: 'select',
      required: true,
      options: [
        { label: 'Birinchi nashr', value: 'publish_first' },
        { label: 'Oʻzgarish nashri', value: 'publish_change' },
        { label: 'Nashrdan olindi', value: 'unpublish' },
        { label: 'Olib qoʻyildi', value: 'withdraw' },
        { label: 'Tiklandi', value: 'restore' },
        { label: 'Oʻchirildi', value: 'delete' },
        { label: 'Global oʻzgarishi', value: 'global_change' },
        { label: 'Rejali nashr', value: 'schedule_run' },
      ] satisfies { label: string; value: PublishEventKind }[],
      admin: { readOnly: true },
    },
    {
      name: 'changeKind',
      label: 'Oʻzgarish turi',
      type: 'select',
      options: [
        { label: 'Kichik tahrir', value: 'minor' },
        { label: 'Yangilanish', value: 'update' },
        { label: 'Tuzatish', value: 'correction' },
        { label: 'Aniqlik kiritish', value: 'clarification' },
        { label: 'Tahririyat izohi', value: 'editors_note' },
      ],
      admin: { readOnly: true, description: 'Nashr qilingan maqoladagi oʻzgarish turi (§5.6).' },
    },
    { name: 'actorId', label: 'Foydalanuvchi ID', type: 'number', admin: { readOnly: true } },
    {
      name: 'targets',
      label: 'Nishonlar',
      type: 'json',
      admin: { readOnly: true, description: 'Kesh teglari, ichki yoʻllar va tozalanadigan URL manzillar (§8.5).' },
    },
    {
      name: 'status',
      label: 'Holat',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Navbatda', value: 'pending' },
        { label: 'Bajarildi', value: 'done' },
        { label: 'Xato', value: 'failed' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'attempts',
      label: 'Urinishlar',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'lastError', label: 'Oxirgi xato', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'processedAt',
      label: 'Bajarilgan vaqt',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
  hooks: hooksFor('publish-events'),
}
