import type { FilterOptions, GlobalConfig, Where } from 'payload'

import { fieldRoles, homePageAccess, staffField, systemFieldAccess } from '../access/system'
import { REL } from '../fields/relations'
import { globalHooksFor } from '../hooks'

/**
 * The article picker for every editorial slot: published at least once, not
 * sponsored, not withdrawn. No `_status` filter: the admin picker queries the
 * latest version, so one would hide stories with a pending draft (PHASE0
 * item 13). HOME-1 and HOME-2 (validation concern, later wave) check the
 * current published state at save, because a picker filter alone is not a
 * guarantee: Payload validates it only on publish, and a version restore
 * skips it entirely.
 */
const editorialArticle: Where = {
  and: [
    { firstPublishedAt: { exists: true } },
    { 'sponsored.enabled': { not_equals: true } },
    { 'withdrawal.at': { exists: false } },
  ],
}

const editorialPick: FilterOptions = () => editorialArticle

const interviewPick: FilterOptions = () => ({
  and: [editorialArticle, { 'rubric.slug': { equals: 'intervyu' } }],
})

/** The editor-in-chief's sponsored teaser: sponsored items only. */
const sponsoredArticle: Where = {
  and: [
    { firstPublishedAt: { exists: true } },
    { 'sponsored.enabled': { equals: true } },
    { 'withdrawal.at': { exists: false } },
  ],
}
const sponsoredPick: FilterOptions = () => sponsoredArticle

/**
 * Home page curation ("Bosh sahifa", CMS-SPEC §3.16). Drafts on: an editor or
 * the editor-in-chief "launches" it by publishing. Every empty slot falls back
 * to today's automatic choice (`getLeadStory` and the slot picker), so an
 * unpublished or empty global changes nothing on the site.
 *
 * A sponsored story is never the lead: the pickers exclude it, and HOME-1
 * rejects it at save (later wave). A sponsored teaser never renders next to
 * an article flagged `inappropriateForSponsorship` (front end).
 *
 * Restore: a global version restore runs no hooks and no validation and
 * republishes at once (PHASE0 item 12), so it skips HOME-1 and HOME-2. The
 * `beforeOperation` restore guard that re-runs them is a later wave; until
 * then only editors and the editor-in-chief can read versions or restore.
 * System writes (scheduler, `until` expiry) pass a system user that can read
 * articles: relationship filterOptions on globals are validated as req.user.
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Bosh sahifa',
  admin: { group: 'Tahririyat', description: 'Bosh sahifa tanlovi. Boʻsh joylar avtomatik toʻldiriladi.' },
  access: homePageAccess,
  versions: { drafts: true, max: 0 },
  fields: [
    {
      name: 'lead',
      label: 'Yetakchi maqola',
      type: 'relationship',
      relationTo: REL.articles,
      filterOptions: editorialPick,
      admin: { description: 'Reklama (hamkorlik) materiali yetakchi boʻla olmaydi. Boʻsh boʻlsa, eng yangi tanlangan maqola chiqadi.' },
    },
    {
      name: 'secondary',
      label: 'Ikkinchi darajali maqolalar',
      type: 'relationship',
      relationTo: REL.articles,
      hasMany: true,
      maxRows: 3,
      filterOptions: editorialPick,
    },
    {
      name: 'pinned',
      label: 'Muhim',
      labels: { singular: 'Muhim maqola', plural: 'Muhim maqolalar' },
      type: 'array',
      maxRows: 3,
      admin: { description: 'Belgilangan muddatgacha yuqorida turadi.' },
      fields: [
        { name: 'article', label: 'Maqola', type: 'relationship', relationTo: REL.articles, required: true, filterOptions: editorialPick },
        {
          name: 'until',
          label: 'Qachongacha',
          type: 'date',
          timezone: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'breaking',
      label: 'Shoshilinch xabar',
      type: 'group',
      fields: [
        { name: 'enabled', label: 'Koʻrsatish', type: 'checkbox', defaultValue: false },
        { name: 'text', label: 'Matn', type: 'text', localized: true },
        { name: 'article', label: 'Maqola', type: 'relationship', relationTo: REL.articles, filterOptions: editorialPick },
        {
          name: 'until',
          label: 'Qachongacha',
          type: 'date',
          timezone: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'interviewFeature',
      label: 'Intervyu',
      type: 'relationship',
      relationTo: REL.articles,
      filterOptions: interviewPick,
      admin: { description: 'Faqat «Intervyu» rubrikasidagi maqola.' },
    },
    {
      name: 'sponsoredTeaser',
      label: 'Hamkorlik materiali anonsi',
      type: 'relationship',
      relationTo: REL.articles,
      filterOptions: sponsoredPick,
      access: { create: fieldRoles('eic'), update: fieldRoles('eic') },
      admin: { description: 'Faqat bosh muharrir tanlaydi. Faqat reklama (hamkorlik) materiali.' },
    },
    {
      name: 'mostReadOverride',
      label: 'Koʻp oʻqilganlar (qoʻlda)',
      type: 'relationship',
      relationTo: REL.articles,
      hasMany: true,
      maxRows: 5,
      filterOptions: editorialPick,
      admin: { description: 'Analitika ishga tushguncha. Boʻsh boʻlsa, reklamasiz eng yangi maqolalar.' },
    },
    {
      name: 'launchedBy',
      label: 'Eʼlon qilgan',
      type: 'relationship',
      relationTo: 'users',
      access: { read: staffField, ...systemFieldAccess },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'launchedAt',
      label: 'Eʼlon qilingan vaqt',
      type: 'date',
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
  hooks: globalHooksFor('home-page'),
}
