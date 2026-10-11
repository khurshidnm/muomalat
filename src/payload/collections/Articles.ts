import { randomInt } from 'node:crypto'

import type { CollectionConfig, Field, FieldHook, PayloadRequest, Where } from 'payload'
import { isolateObjectProperty } from 'payload'

import {
  articlesCreate,
  articlesDelete,
  articlesRead,
  articlesReadVersions,
  articlesUpdate,
  editorialField,
  eicField,
  publishersField,
  sourceNotesField,
  sponsoredInternalReadField,
  sponsoredWriteField,
} from '../access/articles'
import { staffField } from '../access/editorial'
import { dateTime, timestamp, validateIsoDay } from '../fields/dates'
import { livePreviewFor } from '../fields/preview'
import { REL } from '../fields/relations'
import { seoGroup } from '../fields/seo'
import { slugField } from '../fields/slug'
import { system, systemFields } from '../fields/system'
import { translationGroup } from '../fields/translation'
import { hooksFor } from '../hooks'
import { articleEndpoints } from '../endpoints'
import { articleEditor } from '../lexical/editors'
import { forEachNode, type LexicalState } from '../lexical/serialize'

// ── option lists ────────────────────────────────────────────────────────────
/** CMS-SPEC §5.1. Payload's `_status` says whether a story is public; this says where it is in the newsroom. */
export const workflowStatusOptions = [
  { label: 'Gʻoya', value: 'idea' },
  { label: 'Qoralama', value: 'draft' },
  { label: 'Tahrirda', value: 'in_edit' },
  { label: 'Tayyor', value: 'ready' },
  { label: 'Rejalashtirilgan', value: 'scheduled' },
  { label: 'Chop etilgan', value: 'published' },
  { label: 'Toʻxtatilgan', value: 'hold' },
  { label: 'Olib tashlangan', value: 'withdrawn' },
]

/** CMS-SPEC §5.6. */
export const changeKindOptions = [
  { label: 'Mayda tahrir (izsiz)', value: 'minor' },
  { label: 'Yangilanish', value: 'update' },
  { label: 'Tuzatish', value: 'correction' },
  { label: 'Aniqlik kiritish', value: 'clarification' },
  { label: 'Tahririyat izohi', value: 'editors_note' },
]

const correctionKindOptions = changeKindOptions.filter((o) => ['correction', 'clarification', 'editors_note'].includes(o.value))

/** Legal and picture desk flags. Anyone may set `required`; only the editor-in-chief sets legal `complete` (hook). */
const deskFlagOptions = [
  { label: 'Kerak emas', value: 'na' },
  { label: 'Kerak', value: 'required' },
  { label: 'Bajarildi', value: 'complete' },
]

export const sponsoredCategoryOptions = [
  { label: 'Umumiy', value: 'general' },
  { label: 'Moliyaviy xizmat', value: 'financial_service' },
  { label: 'Bank omonati', value: 'bank_deposit' },
  { label: 'Investitsiyalar va qimmatli qogʻozlar', value: 'investment_securities' },
  { label: 'Sugʻurta va takaful', value: 'insurance_takaful' },
]

const sourceTypeOptions = [
  { label: 'Hujjat', value: 'document' },
  { label: 'Hisobot', value: 'report' },
  { label: 'Suhbat', value: 'interview' },
  { label: 'Press-reliz', value: 'press' },
  { label: 'Maʼlumotlar', value: 'data' },
]

// ── derived system fields (schema-local hooks) ──────────────────────────────
type Id = string | number
const idOf = (v: unknown): Id | undefined =>
  v && typeof v === 'object' ? (v as { id?: Id }).id : v === null || v === undefined || v === '' ? undefined : (v as Id)
const idsOf = (v: unknown): Id[] => (Array.isArray(v) ? v.map(idOf).filter((x): x is Id => x !== undefined) : [])

/** Nested Local API reads share the transaction but never the locale (payloadcms#18246). */
const isolated = (req: PayloadRequest) => isolateObjectProperty(req, ['locale', 'fallbackLocale'])

/**
 * The value of a localized field in every locale during a save: the incoming
 * data for the locale being saved, the stored document for the others. With
 * `locale: 'all'` the data itself is keyed by locale.
 */
function everyLocale(
  name: string,
  { siblingData, siblingDocWithLocales, req }: { siblingData: Record<string, unknown>; siblingDocWithLocales?: Record<string, unknown>; req: PayloadRequest },
): unknown[] {
  const codes = req.payload.config.localization ? req.payload.config.localization.localeCodes : []
  if (req.locale === 'all') return codes.map((l) => (siblingData[name] as Record<string, unknown> | undefined)?.[l])
  return codes.map((l) => (l === req.locale ? siblingData[name] : (siblingDocWithLocales?.[name] as Record<string, unknown> | undefined)?.[l]))
}

/**
 * `_authorUsers`: the staff accounts linked to the bylines (authors.user), for
 * access checks. Both the live byline and its latest draft count: a link an
 * admin has saved but not yet published must already make that person an
 * author, or the two-person rule would not see them.
 */
const linkAuthorUsers: FieldHook = async ({ siblingData, req }) => {
  const authorIds = idsOf(siblingData?.authors)
  if (!authorIds.length) return []
  const users = new Set<Id>()
  for (const draft of [false, true]) {
    const { docs } = await req.payload.find({
      collection: REL.authors,
      where: { id: { in: authorIds } },
      depth: 0,
      pagination: false,
      draft,
      overrideAccess: true,
      req: isolated(req),
      select: { user: true } as never,
    })
    for (const d of docs) {
      const id = idOf((d as { user?: unknown }).user)
      if (id !== undefined) users.add(id)
    }
  }
  return [...users]
}

/**
 * `mediaRefs`: every media item the story uses (hero, interviewee portrait,
 * figures in the body and the SEO image, in every locale). Media's `usedIn`
 * join reads it. It must stay a top-level hasMany relationship (PHASE0 item 13).
 */
const collectMediaRefs: FieldHook = ({ siblingData, siblingDocWithLocales, req }) => {
  const refs = new Set<Id>()
  const add = (v: unknown) => {
    const id = idOf(v)
    if (id !== undefined) refs.add(id)
  }
  add(siblingData?.image)
  add((siblingData?.interviewee as { portrait?: unknown } | undefined)?.portrait)
  const args = { siblingData: siblingData ?? {}, siblingDocWithLocales, req }
  for (const body of everyLocale('body', args)) {
    forEachNode(body as LexicalState, (n) => {
      const f = n.fields as { blockType?: string; image?: unknown } | undefined
      if (n.type === 'block' && f?.blockType === 'figure') add(f.image)
    })
  }
  for (const meta of everyLocale('meta', args)) add((meta as { image?: unknown } | undefined)?.image)
  return [...refs]
}

/** `terms`: the hand-picked list plus every term the body references (glossary links, term cards, links to /lugat). */
const mergeBodyTerms: FieldHook = ({ value, siblingData, siblingDocWithLocales, req }) => {
  const terms = idsOf(value)
  const seen = new Set(terms.map(String))
  const add = (v: unknown) => {
    const id = idOf(v)
    if (id !== undefined && !seen.has(String(id))) {
      seen.add(String(id))
      terms.push(id)
    }
  }
  for (const body of everyLocale('body', { siblingData: siblingData ?? {}, siblingDocWithLocales, req })) {
    forEachNode(body as LexicalState, (n) => {
      const f = (n.fields ?? {}) as { blockType?: string; term?: unknown; linkType?: string; doc?: { relationTo?: string; value?: unknown } }
      if ((n.type === 'inlineBlock' && f.blockType === 'glossaryLink') || (n.type === 'block' && f.blockType === 'term')) add(f.term)
      if ((n.type === 'link' || n.type === 'autolink') && f.linkType === 'internal' && f.doc?.relationTo === REL.glossaryTerms) add(f.doc.value)
    })
  }
  return terms
}

/** Crockford base32 in lower case: no i, l, o or u, so a code read aloud or retyped stays unambiguous. */
const SHORT_CODE_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'
const newShortCode = () => Array.from({ length: 6 }, () => SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)]).join('')

/** `shortCode` for /t/<code>: set once, on the first save. */
const ensureShortCode: FieldHook = async ({ value, req }) => {
  if (typeof value === 'string' && value !== '') return value
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newShortCode()
    const { totalDocs } = await req.payload.count({
      collection: REL.articles,
      where: { shortCode: { equals: code } },
      trash: true,
      overrideAccess: true,
      req: isolated(req),
    })
    if (totalDocs === 0) return code
  }
  throw new Error('shortCode: no free code after 5 attempts')
}

/** `kr.checkedBy` / `kr.checkedAt` follow the "checked" box. */
const stampKrCheck =
  (kind: 'by' | 'at'): FieldHook =>
  ({ siblingData, previousSiblingDoc, req, value }) => {
    if (!siblingData?.checked) return null
    if (previousSiblingDoc?.checked && value) return value
    return kind === 'by' ? (req.user?.id ?? null) : new Date().toISOString()
  }

// ── admin components (CMS-SPEC §3.3, §5.2, §5.10, §6.3, §7.3) ────────────────
// `ui` fields render a component and store nothing: no column, no migration, no generated type.
const ADMIN = '/payload/admin'
const workflowPanels: Field[] = [
  // Panels, not data: labelled in Uzbek and kept out of the list's column picker.
  { name: 'workflowActions', label: 'Ish jarayoni', type: 'ui', admin: { position: 'sidebar', disableListColumn: true, components: { Field: `${ADMIN}/WorkflowActions#WorkflowActions` } } },
  { name: 'checksPanel', label: 'Tekshiruv natijalari', type: 'ui', admin: { position: 'sidebar', disableListColumn: true, components: { Field: `${ADMIN}/ChecksPanel#ChecksPanel` } } },
]

// ── field groups ────────────────────────────────────────────────────────────
const sidebar: Field[] = [
  ...workflowPanels,
  {
    name: 'rubric',
    label: 'Rubrika',
    type: 'relationship',
    relationTo: REL.rubrics,
    required: true,
    admin: { position: 'sidebar' },
  },
  slugField({
    from: 'title',
    localizedSource: true,
    // Frozen at first publication (CMS-SPEC §3.1); a later change goes through the workflow with a redirect.
    isLive: ({ originalDoc }) => Boolean(originalDoc?.firstPublishedAt),
    description: 'Oʻzbekcha sarlavhadan avtomatik yasaladi. Birinchi chop etishdan keyin oʻzgarmaydi; oʻzgartirish faqat muharrir orqali, eski manzil yoʻnaltiriladi.',
  }),
  {
    name: 'authors',
    label: 'Mualliflar',
    type: 'relationship',
    relationTo: REL.authors,
    hasMany: true,
    required: true,
    minRows: 1,
    // Inactive bylines are hidden from the picker but stay valid on stories that already carry them.
    filterOptions: ({ data }): Where => {
      const chosen = idsOf((data as { authors?: unknown } | undefined)?.authors)
      const active: Where = { active: { not_equals: false } }
      return chosen.length ? { or: [active, { id: { in: chosen } }] } : active
    },
    admin: {
      position: 'sidebar',
      description: 'Homiylik materialida faqat tijorat imzosi; tahririyat materialida tijorat imzosi boʻlmaydi.',
    },
  },
  system({
    name: 'workflowStatus',
    label: 'Holat',
    type: 'select',
    required: true,
    defaultValue: 'idea',
    options: workflowStatusOptions,
    index: true,
    admin: { position: 'sidebar', description: 'Faqat ish jarayoni tugmalari orqali oʻzgaradi.' },
  }),
  {
    name: 'assignee',
    label: 'Masʼul muxbir',
    type: 'relationship',
    relationTo: REL.users,
    access: { read: staffField },
    // Whoever opens "new story" owns it at once (§4.2 "own"): a reporter can move their own idea on without
    // first filling in this field; an editor commissioning a story picks the reporter here.
    defaultValue: ({ user }) => (user as { id?: number } | null | undefined)?.id,
    admin: { position: 'sidebar', description: '«Gʻoya» va «Qoralama» bosqichlarida maqola uchun javob beradi. Yangi maqolada uni yaratgan xodim.' },
  },
  system({
    name: 'deskEditor',
    label: 'Masʼul muharrir',
    type: 'relationship',
    relationTo: REL.users,
    access: { read: staffField },
    admin: { position: 'sidebar', description: '«Tahrirga olish» bilan belgilanadi; qayta ishlashga qaytarilganda tozalanadi.' },
  }),
  dateTime({ name: 'dueAt', label: 'Muddat', access: { read: staffField }, admin: { position: 'sidebar' } }),
  {
    name: 'priority',
    label: 'Muhimlik',
    type: 'select',
    defaultValue: 'normal',
    access: { read: staffField },
    options: [
      { label: 'Oddiy', value: 'normal' },
      { label: 'Yuqori', value: 'high' },
      { label: 'Tezkor xabar', value: 'breaking' },
    ],
    admin: { position: 'sidebar' },
  },
  {
    name: 'urgent',
    label: 'Shoshilinch',
    type: 'checkbox',
    access: { read: staffField },
    admin: {
      position: 'sidebar',
      description:
        'Tezkor yoʻl: faqat «Yangiliklar», rasmiy manba havolasi, 400 soʻzgacha, embargo va yuridik koʻriksiz. Chop etilgach 30 daqiqa ichida ikkinchi oʻqish talab qilinadi.',
    },
  },
  ...systemFields(),
]

const contentTab: Field[] = [
  {
    name: 'title',
    label: 'Sarlavha',
    type: 'text',
    localized: true,
    admin: {
      description: 'Faqat oddiy matn. 80 belgidan oshsa ogohlantirish, 140 dan oshsa chop etilmaydi.',
      // The list cell shows the embargo badge in front of the title and links to the story itself.
      components: { Cell: `${ADMIN}/EmbargoBadge#TitleCell`, afterInput: [`${ADMIN}/CharCounter#CharCounter`] },
    },
  },
  {
    name: 'kicker',
    label: 'Mavzu yorligʻi',
    type: 'text',
    localized: true,
    maxLength: 40,
    admin: { description: 'Rubrika nomi oʻrniga sarlavha ustida koʻrsatiladi, masalan «Litsenziyalash». 40 belgigacha.' },
  },
  {
    name: 'lead',
    label: 'Lid',
    type: 'textarea',
    localized: true,
    admin: {
      description: 'Sarlavha ostidagi bir-ikki gap. 300 belgidan oshsa ogohlantirish, 500 dan oshsa chop etilmaydi.',
      components: { afterInput: [`${ADMIN}/CharCounter#LeadCounter`] },
    },
  },
  { name: 'body', label: 'Matn', type: 'richText', editor: articleEditor, localized: true },
  {
    name: 'image',
    label: 'Asosiy rasm',
    type: 'upload',
    relationTo: REL.media,
    admin: { description: 'Rasmda oʻzbekcha muqobil matn, muallif va huquq toifasi boʻlishi shart.' },
  },
  {
    name: 'imageCaption',
    label: 'Rasm izohi',
    type: 'text',
    localized: true,
    admin: { description: 'Shu maqola uchun; boʻsh qolsa rasm kutubxonasidagi izoh koʻrsatiladi.' },
  },
]

const linksTab: Field[] = [
  { name: 'tags', label: 'Mavzular', type: 'relationship', relationTo: REL.tags, hasMany: true, admin: { description: 'Kamida bitta mavzu tanlang.' } },
  {
    name: 'terms',
    label: 'Lugʻat atamalari',
    type: 'relationship',
    relationTo: REL.glossaryTerms,
    hasMany: true,
    hooks: { beforeChange: [mergeBodyTerms] },
    admin: { description: 'Matndagi lugʻat havolalari va atama kartochkalari saqlashda avtomatik qoʻshiladi.' },
  },
  {
    name: 'about',
    label: 'Asosiy tashkilot',
    type: 'relationship',
    relationTo: REL.institutions,
    admin: { description: 'Maqola asosan qaysi tashkilot haqida.' },
  },
  { name: 'mentions', label: 'Tilga olingan tashkilotlar', type: 'relationship', relationTo: REL.institutions, hasMany: true },
  {
    name: 'related',
    label: 'Aloqador maqolalar',
    type: 'relationship',
    relationTo: REL.articles,
    hasMany: true,
    maxRows: 4,
    // The filter shapes the picker. No _status clause: the picker reads the latest version and would hide
    // stories with a pending draft (PHASE0 item 13). Links already on the story stay valid, because the
    // filter is also checked at publish: sponsored and withdrawn targets are dropped at read time (SP-8,
    // §5.8) and unpublished ones are reported by ART-19. The mock data links two stories to sponsored iz-07.
    filterOptions: ({ id, data }): Where => {
      const rules: Where[] = [
        { 'sponsored.enabled': { not_equals: true } },
        { firstPublishedAt: { exists: true } },
        { 'withdrawal.at': { exists: false } },
      ]
      const pickable: Where = { and: id ? [{ id: { not_equals: id } }, ...rules] : rules }
      const chosen = idsOf((data as { related?: unknown } | undefined)?.related).filter((x) => String(x) !== String(id))
      return chosen.length ? { or: [pickable, { id: { in: chosen } }] } : pickable
    },
    admin: { description: '4 tagacha. Homiylik materiallari, olib tashlangan va hali chop etilmagan maqolalar tanlanmaydi.' },
  },
  {
    name: 'interviewee',
    label: 'Suhbatdosh',
    type: 'group',
    admin: { description: '«Intervyu» rubrikasi uchun shart.' },
    fields: [
      { name: 'name', label: 'Ism-familiya', type: 'text' },
      { name: 'role', label: 'Lavozimi', type: 'text', admin: { description: 'Kichik harf bilan, masalan «islom oynasi rahbari».' } },
      { name: 'organisation', label: 'Tashkilot', type: 'text' },
      { name: 'portrait', label: 'Portret', type: 'upload', relationTo: REL.media },
    ],
  },
  {
    name: 'sources',
    label: 'Manbalar',
    type: 'array',
    minRows: 1,
    labels: { singular: 'Manba', plural: 'Manbalar' },
    admin: { description: 'Maqola ostidagi «Manbalar» roʻyxati. Kamida bitta manba.' },
    fields: [
      { name: 'title', label: 'Nomi', type: 'text', required: true },
      { name: 'publisher', label: 'Kim eʼlon qilgan', type: 'text', required: true },
      {
        name: 'url',
        label: 'Havola',
        type: 'text',
        validate: (value: unknown) =>
          value === undefined || value === null || value === '' || (typeof value === 'string' && /^(https:\/\/|\/(?!\/))\S*$/.test(value))
            ? true
            : 'Faqat https:// bilan boshlanadigan manzil yoki sayt ichidagi /yoʻl.',
      },
      { name: 'date', label: 'Sana', type: 'text', validate: validateIsoDay, admin: { description: 'YYYY-MM-DD, masalan 2026-10-08.' } },
      { name: 'type', label: 'Turi', type: 'select', options: sourceTypeOptions },
    ],
  },
  { name: 'featured', label: 'Bosh sahifa yetakchisiga nomzod', type: 'checkbox', admin: { description: 'Homiylik materialida eʼtiborga olinmaydi.' } },
]

const publishingTab: Field[] = [
  dateTime({
    name: 'publishedAt',
    label: 'Chop etilgan sana',
    index: true,
    access: { create: eicField, update: eicField },
    admin: { description: 'Birinchi chop etishda tizim belgilaydi; faqat bosh muharrir tuzata oladi.' },
  }),
  system(dateTime({ name: 'firstPublishedAt', label: 'Birinchi chop etilgan', index: true, admin: { description: 'Hech qachon oʻzgarmaydi (JSON-LD datePublished).' } })),
  system(dateTime({ name: 'significantUpdateAt', label: 'Muhim yangilanish', admin: { description: 'Yangilanish yoki tuzatish chop etilganda belgilanadi.' } })),
  dateTime({
    name: 'scheduledAt',
    label: 'Rejalashtirilgan vaqt',
    access: { read: staffField, create: publishersField, update: publishersField },
    admin: { description: 'Toshkent vaqti. «Tayyor» holatdan rejalashtiriladi; embargo tugashidan oldin boʻlmasin.' },
  }),
  {
    name: 'embargo',
    label: 'Embargo',
    type: 'group',
    access: { read: staffField },
    admin: {
      description: 'Embargo amalda boʻlsa maqola chop etilmaydi va Telegramga yuborilmaydi.',
      components: { Cell: `${ADMIN}/EmbargoBadge#EmbargoCell` },
    },
    fields: [
      dateTime({
        name: 'until',
        label: 'Embargo tugashi',
        admin: { description: 'Toshkent vaqti. «Yarim tun» noaniq: 00:00 oʻrniga 00:01 ni tanlang.' },
      }),
      { name: 'indefinite', label: 'Muddatsiz embargo', type: 'checkbox', admin: { description: 'Tugash vaqti bilan birga belgilanmaydi.' } },
      { name: 'source', label: 'Embargo manbasi', type: 'text', admin: { description: 'Embargo qoʻygan tashkilot yoki shaxs; embargo boʻlsa shart.' } },
      { name: 'note', label: 'Izoh', type: 'textarea' },
    ],
  },
  {
    type: 'collapsible',
    label: 'Ish jarayoni yozuvlari',
    admin: { initCollapsed: true },
    fields: [
      system({ name: 'submittedBy', label: 'Tahrirga yuborgan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system(timestamp({ name: 'submittedAt', label: 'Tahrirga yuborilgan vaqt', access: { read: staffField } })),
      system({ name: 'approvedBy', label: 'Tasdiqlagan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system(timestamp({ name: 'approvedAt', label: 'Tasdiqlangan vaqt', access: { read: staffField } })),
      system({ name: 'approvedContentHash', type: 'text', access: { read: staffField }, admin: { hidden: true } }),
      system({ name: 'publishedBy', label: 'Chop etgan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system({ name: 'scheduledBy', label: 'Rejalashtirgan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system({ name: 'scheduleError', label: 'Rejalashtirish xatosi', type: 'textarea', access: { read: staffField } }),
    ],
  },
  {
    name: 'secondRead',
    label: 'Ikkinchi oʻqish',
    type: 'group',
    access: { read: staffField },
    admin: { description: 'Shoshilinch chop etilgan yoki muallif-muharrir yangilagan maqolani muallif boʻlmagan muharrir oʻqib chiqadi.' },
    fields: [
      system({ name: 'required', label: 'Talab qilinadi', type: 'checkbox' }),
      dateTime({ name: 'dueAt', label: 'Muddat', access: { create: publishersField, update: publishersField } }),
      system({ name: 'doneBy', label: 'Oʻqigan', type: 'relationship', relationTo: REL.users }),
      system(timestamp({ name: 'doneAt', label: 'Oʻqilgan vaqt' })),
      // Set once by the worker when the 30 minutes pass, so a restart never alerts the editor-in-chief twice.
      system(timestamp({ name: 'escalatedAt', label: 'Bosh muharrirga yuborilgan vaqt' })),
      {
        name: 'outcome',
        label: 'Natija',
        type: 'select',
        access: { create: publishersField, update: publishersField },
        options: [
          { label: 'Kamchilik yoʻq', value: 'ok' },
          { label: 'Mayda tuzatish', value: 'minor_fix' },
          { label: 'Tuzatish kerak', value: 'correction' },
        ],
      },
    ],
  },
  {
    name: 'changeNote',
    label: 'Oʻzgarish izohi',
    type: 'group',
    access: { read: staffField },
    admin: { description: 'Chop etilgan maqoladagi oʻzgarishni chop etishda toʻldiriladi; chop etilgach tozalanadi, versiya va jurnalda qoladi.' },
    fields: [
      { name: 'kind', label: 'Oʻzgarish turi', type: 'select', options: changeKindOptions },
      { name: 'reason', label: 'Sabab', type: 'textarea' },
      {
        name: 'numbersOverride',
        label: 'Raqamlar tekshiruvini chetlab oʻtish',
        type: 'checkbox',
        access: { create: eicField, update: eicField },
        admin: { description: 'Faqat bosh muharrir, sababi bilan: masalan, faqat havola ichidagi raqam oʻzgargan boʻlsa.' },
      },
    ],
  },
  system({
    name: 'workflowHistory',
    label: 'Holatlar tarixi',
    labels: { singular: 'Holat oʻzgarishi', plural: 'Holat oʻzgarishlari' },
    type: 'array',
    access: { read: staffField },
    admin: { initCollapsed: true },
    fields: [
      { name: 'from', label: 'Avvalgi holat', type: 'select', options: workflowStatusOptions },
      { name: 'to', label: 'Yangi holat', type: 'select', options: workflowStatusOptions },
      { name: 'by', label: 'Kim', type: 'relationship', relationTo: REL.users },
      { name: 'at', label: 'Qachon', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'comment', label: 'Izoh', type: 'textarea' },
    ],
  }),
  {
    name: 'withdrawal',
    label: 'Olib tashlash',
    type: 'group',
    admin: { description: 'Faqat bosh muharrir. Sahifada sarlavha, sana va izoh qoladi; matn, rasm va roʻyxatlardan olib tashlanadi.' },
    fields: [
      system(timestamp({ name: 'at', label: 'Olib tashlangan vaqt' })),
      system({ name: 'by', label: 'Olib tashlagan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      {
        name: 'publicNotice',
        label: 'Oʻquvchilar uchun izoh',
        type: 'textarea',
        localized: true,
        access: { create: eicField, update: eicField },
      },
      { name: 'internalReason', label: 'Ichki sabab', type: 'textarea', access: { read: staffField, create: eicField, update: eicField } },
      { name: 'hideTitle', label: 'Sarlavhani yashirish', type: 'checkbox', access: { create: eicField, update: eicField } },
      { name: 'request', label: 'Murojaat', type: 'relationship', relationTo: REL.requests, access: { read: staffField, create: eicField, update: eicField } },
    ],
  },
]

const correctionsTab: Field[] = [
  {
    name: 'corrections',
    label: 'Tuzatishlar',
    type: 'array',
    labels: { singular: 'Tuzatish', plural: 'Tuzatishlar' },
    admin: {
      description:
        'Faqat qoʻshiladi: kiritilgan tuzatish oʻchirilmaydi va oʻzgartirilmaydi. Har bir yozuv maqola oxirida va tuzatishlar sahifasida chiqadi.',
    },
    fields: [
      { name: 'kind', label: 'Turi', type: 'select', defaultValue: 'correction', options: correctionKindOptions },
      {
        name: 'publicText',
        label: 'Ochiq matn',
        type: 'textarea',
        localized: true,
        admin: {
          description:
            'Nima notoʻgʻri boʻlgani va toʻgʻrisi qanday ekanini aniq yozing: «Tuzatildi: 3-xatboshida 4,5 mlrd emas, 5,4 mlrd soʻm». Tuhmat boʻlishi mumkin boʻlgan xatoni aynan takrorlamang.',
        },
      },
      { name: 'location', label: 'Joyi', type: 'text', admin: { description: 'Masalan «3-xatboshi» yoki «jadval».' } },
      { name: 'internalReason', label: 'Ichki sabab', type: 'textarea', access: { read: staffField } },
      system(timestamp({ name: 'createdAt', label: 'Kiritilgan vaqt' })),
      system({ name: 'createdBy', label: 'Kiritgan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system({ name: 'approvedBy', label: 'Tasdiqlagan', type: 'relationship', relationTo: REL.users, access: { read: staffField } }),
      system({ name: 'versionId', label: 'Versiya', type: 'text', access: { read: staffField } }),
      { name: 'request', label: 'Murojaat', type: 'relationship', relationTo: REL.requests, access: { read: staffField } },
      system({
        name: 'telegramAction',
        label: 'Telegramdagi amal',
        type: 'select',
        defaultValue: 'none',
        access: { read: staffField },
        options: [
          { label: 'Yoʻq', value: 'none' },
          { label: 'Post izohi tahrirlandi', value: 'caption_edited' },
          { label: 'Javob post joylandi', value: 'reply_posted' },
        ],
      }),
    ],
  },
]

/** Public sponsorship fields: readable by the site; written by commercial and the editor-in-chief only. */
const sponsoredWrite = { create: sponsoredWriteField, update: sponsoredWriteField }
/** Internal sponsorship fields: never public; editors may read them. */
const sponsoredInternal = { read: sponsoredInternalReadField, create: sponsoredWriteField, update: sponsoredWriteField }

const sponsoredTab: Field[] = [
  {
    name: 'sponsored',
    label: 'Homiylik',
    type: 'group',
    admin: { description: 'Tijorat boʻlimi va bosh muharrir toʻldiradi; muharrirlar faqat koʻradi.' },
    fields: [
      {
        name: 'enabled',
        label: 'Homiylik materiali',
        type: 'checkbox',
        index: true,
        access: sponsoredWrite,
        // Commercial creates sponsored stories only (§4.2). The default makes a new commercial draft readable by
        // its author at once (articlesRead); the sponsored guard that refuses anything else is the workflow concern's.
        defaultValue: ({ user }) => ((user as { role?: string } | null | undefined)?.role === 'commercial' ? true : undefined),
        admin: { description: 'Tijorat boʻlimi yaratganda avtomatik belgilanadi. Chop etilgandan keyin olib tashlanmaydi.' },
      },
      { name: 'partner', label: 'Hamkor (saytdagi nomi)', type: 'text', access: sponsoredWrite },
      { name: 'advertiserLegalName', label: 'Reklama beruvchining yuridik nomi', type: 'text', access: sponsoredInternal },
      {
        name: 'category',
        label: 'Toifa',
        type: 'select',
        defaultValue: 'general',
        options: sponsoredCategoryOptions,
        access: sponsoredWrite,
        admin: { description: '«Umumiy»dan boshqa toifalar uchun litsenziya, xavf haqida ogohlantirish va asosiy shartlar shart.' },
      },
      { name: 'licenceNumber', label: 'Litsenziya raqami', type: 'text', access: sponsoredWrite },
      { name: 'licenceIssuer', label: 'Litsenziya bergan organ', type: 'text', access: sponsoredWrite },
      { name: 'riskWarning', label: 'Xavf haqida ogohlantirish', type: 'textarea', localized: true, access: sponsoredWrite },
      { name: 'keyTerms', label: 'Asosiy shartlar', type: 'textarea', localized: true, access: sponsoredWrite },
      {
        name: 'disclosure',
        label: 'Oshkor qilish matni',
        type: 'textarea',
        localized: true,
        access: sponsoredWrite,
        admin: { description: 'Material kimning buyurtmasi bilan va kim tomonidan tayyorlanganini aytadi.' },
      },
      { name: 'contractRef', label: 'Shartnoma raqami', type: 'text', access: sponsoredInternal },
      {
        name: 'returnPhraseOverride',
        label: 'Daromad vaʼdasi tekshiruvini chetlab oʻtish',
        type: 'checkbox',
        access: { read: sponsoredInternalReadField, create: eicField, update: eicField },
        admin: {
          description:
            'Faqat bosh muharrir, sababi bilan: masalan, ibora vaʼda emas, ogohlantirish ichida kelgan boʻlsa («daromad kafolatlanmaydi»). Har bir chop etishda jurnalga yoziladi.',
        },
      },
      {
        name: 'returnPhraseOverrideReason',
        label: 'Chetlab oʻtish sababi',
        type: 'textarea',
        access: { read: sponsoredInternalReadField, create: eicField, update: eicField },
        admin: { condition: (_, sibling) => Boolean(sibling?.returnPhraseOverride) },
      },
      dateTime({ name: 'campaignStart', label: 'Kampaniya boshlanishi', access: sponsoredInternal }),
      dateTime({ name: 'campaignEnd', label: 'Kampaniya tugashi', access: sponsoredInternal }),
      system({ name: 'approvedBy', label: 'Tasdiqlagan bosh muharrir', type: 'relationship', relationTo: REL.users, access: { read: sponsoredInternalReadField } }),
      system(timestamp({ name: 'approvedAt', label: 'Tasdiqlangan vaqt', access: { read: sponsoredInternalReadField } })),
      system({
        name: 'retainUntil',
        label: 'Saqlash muddati',
        type: 'date',
        access: { read: sponsoredInternalReadField },
        admin: { description: 'Oxirgi chop etishdan 3 yil (Art. 15); shu sanagacha oʻchirilmaydi.', date: { pickerAppearance: 'dayOnly' } },
      }),
    ],
  },
]

const translationTab: Field[] = [
  { name: 'translationStatus', label: 'Tarjima holati', type: 'ui', admin: { disableListColumn: true, components: { Field: `${ADMIN}/TranslationStatus#TranslationStatus` } } },
  translationGroup(),
]

const cyrillicTab: Field[] = [
  { name: 'krPreview', label: 'Kirill koʻrinishi', type: 'ui', admin: { disableListColumn: true, components: { Field: `${ADMIN}/KrPreview#KrPreview` } } },
  {
    name: 'kr',
    label: 'Kirill nashri',
    type: 'group',
    admin: { description: 'Kirill varianti oʻzbekcha matndan avtomatik yasaladi. Bu yerda faqat qoʻlda tuzatilgan variant yoziladi; u kirill harflarida boʻlishi shart.' },
    fields: [
      { name: 'title', label: 'Sarlavha (kirill)', type: 'text' },
      { name: 'lead', label: 'Lid (kirill)', type: 'textarea' },
      { name: 'kicker', label: 'Mavzu yorligʻi (kirill)', type: 'text' },
      { name: 'checked', label: 'Kirill varianti tekshirildi', type: 'checkbox', access: { read: staffField } },
      system({ name: 'checkedBy', label: 'Tekshirgan', type: 'relationship', relationTo: REL.users, access: { read: staffField }, hooks: { beforeChange: [stampKrCheck('by')] } }),
      system(timestamp({ name: 'checkedAt', label: 'Tekshirilgan vaqt', access: { read: staffField }, hooks: { beforeChange: [stampKrCheck('at')] } })),
    ],
  },
]

const seoTab: Field[] = [
  seoGroup('meta'),
  {
    name: 'noindex',
    label: 'Qidiruv tizimlaridan yashirish (noindex)',
    type: 'checkbox',
    access: { create: publishersField, update: publishersField },
  },
  system({
    name: 'shortCode',
    label: 'Qisqa havola kodi',
    type: 'text',
    unique: true,
    index: true,
    hooks: { beforeChange: [ensureShortCode] },
    admin: { description: 'muomalat.uz/t/<kod> qisqa havolasi uchun.' },
  }),
  system({
    name: 'slugHistory',
    label: 'Avvalgi manzillar',
    labels: { singular: 'Avvalgi manzil', plural: 'Avvalgi manzillar' },
    type: 'array',
    admin: { description: 'Chop etilgandan keyin oʻzgargan manzillar; ulardan yangi manzilga yoʻnaltiriladi.' },
    fields: [
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'rubric', label: 'Rubrika', type: 'text' },
      { name: 'changedAt', label: 'Oʻzgargan vaqt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    ],
  }),
  {
    name: 'telegram',
    label: 'Telegram',
    type: 'group',
    access: { read: staffField },
    fields: [
      { name: 'autopost', label: 'Kanalga avtomatik joylash', type: 'checkbox', defaultValue: true },
      { name: 'captionOverride', label: 'Post matni (qoʻlda)', type: 'textarea', admin: { description: 'Boʻsh qolsa post sarlavha va liddan yasaladi.' } },
      { name: 'silent', label: 'Ovozsiz yuborish', type: 'checkbox' },
    ],
  },
  {
    name: 'telegramPosts',
    label: 'Telegram postlari',
    type: 'join',
    collection: REL.telegramPosts,
    on: 'article',
    defaultLimit: 10,
    admin: {
      description: 'Shu maqola boʻyicha kanalga yuborilgan va navbatdagi postlar.',
      defaultColumns: ['kind', 'status', 'sendAt', 'sentAt'],
      allowCreate: false,
    },
  },
]

const editorialRead = { read: editorialField, create: editorialField, update: editorialField }

const internalTab: Field[] = [
  {
    name: 'editorNotes',
    label: 'Tahririyat eslatmalari',
    type: 'textarea',
    access: editorialRead,
    admin: { description: 'Savol va eslatmalar. Saytda hech qachon koʻrsatilmaydi.' },
  },
  {
    name: 'sourceNotes',
    label: 'Manbalar haqida eslatma',
    type: 'textarea',
    access: { read: sourceNotesField, create: sourceNotesField, update: sourceNotesField },
    admin: { description: 'Maxfiy manbalarning ismini yozmang — faqat shartli nom. Faqat mualliflar va bosh muharrir koʻradi.' },
  },
  {
    type: 'row',
    fields: [
      {
        name: 'needsLegal',
        label: 'Yuridik koʻrik',
        type: 'select',
        defaultValue: 'na',
        options: deskFlagOptions,
        access: editorialRead,
        admin: { description: '«Kerak»ni har kim belgilaydi; «Bajarildi»ni faqat bosh muharrir.' },
      },
      {
        name: 'needsPicture',
        label: 'Rasm tayyorlash',
        type: 'select',
        defaultValue: 'na',
        options: deskFlagOptions,
        access: editorialRead,
        admin: { description: 'Maqolaga rasm topish yoki tayyorlash kerakmi.' },
      },
    ],
  },
  {
    name: 'legalSignOff',
    label: 'Yuridik tasdiq',
    type: 'group',
    access: { read: editorialField },
    fields: [
      system({ name: 'by', label: 'Tasdiqlagan', type: 'relationship', relationTo: REL.users }),
      system(timestamp({ name: 'at', label: 'Tasdiqlangan vaqt' })),
      system({ name: 'note', label: 'Izoh', type: 'textarea' }),
    ],
  },
  {
    name: 'legallySensitive',
    label: 'Yuridik jihatdan nozik',
    type: 'checkbox',
    access: editorialRead,
    admin: { description: 'Qoralamani maqolaga aloqasi yoʻq muxbirlardan yashiradi; chop etishni bosh muharrir tasdiqlaydi.' },
  },
  {
    type: 'row',
    fields: [
      {
        name: 'singleAnonymousSource',
        label: 'Yagona anonim manba',
        type: 'checkbox',
        access: editorialRead,
        admin: { description: 'Chop etishni bosh muharrir tasdiqlaydi.' },
      },
      {
        name: 'supervisor',
        label: 'Manbani biladigan rahbar',
        type: 'relationship',
        relationTo: REL.users,
        access: editorialRead,
        admin: { condition: (_, sibling) => Boolean(sibling?.singleAnonymousSource) },
      },
    ],
  },
  {
    name: 'inappropriateForSponsorship',
    label: 'Yonida reklama koʻrsatilmasin',
    type: 'checkbox',
    access: { create: editorialField, update: editorialField },
    admin: { description: 'Saytda bu maqola yonida homiylik materiali yoki reklama joyi chiqmaydi.' },
  },
  {
    name: 'ageMark',
    label: 'Yosh belgisi',
    type: 'select',
    defaultValue: 'inherit',
    access: { create: editorialField, update: editorialField },
    options: [
      { label: 'Sayt sozlamasi boʻyicha', value: 'inherit' },
      { label: '0+', value: '0+' },
      { label: '7+', value: '7+' },
      { label: '12+', value: '12+' },
      { label: '16+', value: '16+' },
      { label: '18+', value: '18+' },
    ],
  },
  {
    name: 'legalHold',
    label: 'Yuridik saqlash (legal hold)',
    type: 'checkbox',
    access: { read: editorialField, create: eicField, update: eicField },
    admin: { description: 'Faqat bosh muharrir. Belgilanganda maqola oʻchirilmaydi va boshqalar tahrir qila olmaydi.' },
  },
  system({ name: 'validationWarnings', label: 'Tekshiruv natijalari', type: 'json', access: { read: staffField }, admin: { hidden: true } }),
  system({ name: 'views', label: 'Koʻrishlar', type: 'number', defaultValue: 0, admin: { description: 'Analitika tizimi toʻldiradi.' } }),
  system({
    name: '_authorUsers',
    label: 'Muallif hisoblari',
    type: 'relationship',
    relationTo: REL.users,
    hasMany: true,
    index: true,
    // Staff account ids never reach the public read (A3); reporters' read rule filters on it as staff.
    access: { read: staffField },
    hooks: { beforeChange: [linkAuthorUsers] },
    admin: { hidden: true },
  }),
  system({
    name: 'mediaRefs',
    label: 'Ishlatilgan rasmlar',
    type: 'relationship',
    relationTo: REL.media,
    hasMany: true,
    hooks: { beforeChange: [collectMediaRefs] },
    admin: { hidden: true },
  }),
]

/**
 * Stories (CMS-SPEC §3.3). All publish rules run on the server: drafts are not
 * validated, so Payload's own checks apply at publish only, and the editorial
 * rules of §5 and §7 run in the workflow and validation concerns registered
 * through hooksFor. The hooks here only derive system fields from the
 * document itself.
 */
export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Maqola', plural: 'Maqolalar' },
  admin: {
    group: 'Tahririyat',
    useAsTitle: 'title',
    defaultColumns: ['title', 'workflowStatus', 'rubric', 'authors', 'assignee', 'dueAt', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    // The built-in Copy to locale publishes at once and copies the translation status (PHASE0 item 16).
    disableCopyToLocale: true,
    livePreview: livePreviewFor('articles'),
    components: {
      // The embargo banner, which also prefixes the browser tab title with "EMBARGO · " (§5.10).
      edit: { beforeDocumentControls: [`${ADMIN}/EmbargoBanner#EmbargoBanner`] },
    },
  },
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 0 },
  lockDocuments: { duration: 600 },
  trash: true,
  enableQueryPresets: true,
  // A copy would carry the original's publication, approval and corrections record.
  disableDuplicate: true,
  access: {
    read: articlesRead,
    readVersions: articlesReadVersions,
    create: articlesCreate,
    update: articlesUpdate,
    delete: articlesDelete,
  },
  hooks: hooksFor('articles'),
  // Workflow transitions, the copy-from-Uzbek action and the validation checks (§5.2, §3.3, §7.3).
  endpoints: articleEndpoints,
  fields: [
    ...sidebar,
    {
      type: 'tabs',
      tabs: [
        { label: 'Matn', fields: contentTab },
        { label: 'Bogʻlanishlar', fields: linksTab },
        { label: 'Nashr', fields: publishingTab },
        { label: 'Tuzatishlar', fields: correctionsTab },
        { label: 'Tijorat', fields: sponsoredTab },
        { label: 'Tarjima', fields: translationTab },
        { label: 'Kirill', fields: cyrillicTab },
        { label: 'SEO va ulashish', fields: seoTab },
        { label: 'Ichki', description: 'Saytda hech qachon koʻrsatilmaydi.', fields: internalTab },
      ],
    },
  ],
}
