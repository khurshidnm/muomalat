import type { CollectionConfig, Field } from 'payload'

import { auditLogAccess, hiddenUnless } from '../access/system'
import { hooksFor } from '../hooks'

/** Every audit field is read-only in the admin; rows are inserted by hooks only. */
const ro = <F extends Field>(field: F): F => ({ ...field, admin: { ...field.admin, readOnly: true } })

/**
 * Append-only audit log (CMS-SPEC §9.1, PHASE0-FINDINGS §1.3).
 *
 * - One table and nothing else: no array, relationship or hasMany fields,
 *   because each adds a child table that would need its own INSERT grant.
 *   Users and documents are stored as plain ids and snapshots.
 * - `timestamps: true`: Payload's create sends one INSERT … RETURNING and one
 *   SELECT, and sets created_at and updated_at in the INSERT (confirmed under
 *   an INSERT+SELECT-only role in Phase 0).
 * - `lockDocuments: false`, so Payload's document-lock table never references
 *   an audit row.
 * - No role may create, update or delete through Payload. Hooks insert with
 *   `overrideAccess: true` (the audit concern, later wave), and the database
 *   role has no UPDATE, DELETE or TRUNCATE on audit_log (REVOKE in the
 *   core_schema migration; a migration that re-creates the table repeats it).
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Audit yozuvi', plural: 'Audit jurnali' },
  admin: {
    group: 'Tizim',
    useAsTitle: 'action',
    defaultColumns: ['at', 'action', 'actorEmail', 'collection', 'docTitle', 'summary'],
    hidden: hiddenUnless('eic', 'admin'),
    description: 'Oʻzgarmas jurnal: yozuvlarni hech kim tahrirlay yoki oʻchira olmaydi.',
  },
  access: auditLogAccess,
  timestamps: true,
  lockDocuments: false,
  disableDuplicate: true,
  defaultSort: '-id',
  indexes: [{ fields: ['collection', 'docId'] }],
  fields: [
    ro({
      name: 'at',
      label: 'Vaqt',
      type: 'date',
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    }),
    ro({
      name: 'actorId',
      label: 'Foydalanuvchi ID',
      type: 'number',
      index: true,
      admin: { description: 'Ichki chaqiruvlarda boʻsh; actorEmail «system:worker» yoki «system:import» boʻladi.' },
    }),
    ro({ name: 'actorEmail', label: 'Foydalanuvchi', type: 'text' }),
    ro({ name: 'actorRole', label: 'Rol', type: 'text' }),
    ro({ name: 'action', label: 'Amal', type: 'text', required: true, index: true }),
    ro({ name: 'collection', label: 'Toʻplam', type: 'text' }),
    ro({ name: 'docId', label: 'Hujjat ID', type: 'text' }),
    ro({
      name: 'docTitle',
      label: 'Hujjat sarlavhasi',
      type: 'text',
      admin: { description: 'Yozilgan paytdagi sarlavha. Shaxsiy maʼlumotlar hujjatlarida boʻsh.' },
    }),
    ro({ name: 'locale', label: 'Til', type: 'text' }),
    ro({ name: 'versionId', label: 'Versiya ID', type: 'text' }),
    ro({ name: 'summary', label: 'Qisqacha', type: 'text' }),
    ro({
      name: 'changedPaths',
      label: 'Oʻzgargan maydonlar',
      type: 'json',
      admin: { description: 'Faqat maydon yoʻllari, qiymatlarsiz.' },
    }),
    ro({ name: 'before', label: 'Oldin', type: 'json' }),
    ro({ name: 'after', label: 'Keyin', type: 'json' }),
    ro({
      name: 'ip',
      label: 'IP manzil',
      type: 'text',
      admin: { description: '90 kundan keyin /24 gacha qisqartiriladi.' },
    }),
    ro({ name: 'country', label: 'Mamlakat', type: 'text' }),
    ro({ name: 'userAgent', label: 'Brauzer', type: 'text' }),
    ro({ name: 'requestId', label: 'Soʻrov ID', type: 'text' }),
    ro({ name: 'prevHash', label: 'Oldingi xesh', type: 'text' }),
    ro({
      name: 'hash',
      label: 'Xesh',
      type: 'text',
      admin: { description: 'sha256(prevHash + canonicalJSON(yozuv)); zanjir har tunda tekshiriladi.' },
    }),
  ],
  hooks: hooksFor('audit-log'),
}
