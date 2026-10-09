import type { CollectionConfig } from 'payload'

import { CONTACT_TOPICS, type ContactTopic } from '../../components/pages/contact/options'
import {
  contactMessagesAccess,
  personalDataFields,
  personalDataHidden,
  submittedFieldAccess,
} from '../access/personalData'
import { fieldRoles } from '../access/system'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'

const TOPIC_LABELS = {
  tahririyat: 'Tahririyatga xabar',
  tuzatish: 'Tuzatish soʻrovi',
  reklama: 'Reklama va hamkorlik',
  klub: 'Muomalat klubi',
  boshqa: 'Boshqa',
} satisfies Record<ContactTopic, string>

/**
 * Messages from the /aloqa form (CMS-SPEC §3.14). Each role sees only its
 * topics: editors the newsroom ones (`tahririyat`, `tuzatish`), commercial
 * `reklama` and `klub`, the editor-in-chief and admin all of them. Only they
 * can move a message to another topic, because a move changes who sees it.
 * A `tuzatish` message also opens a `requests` item (personal-data concern,
 * later wave).
 */
export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Aloqa xabari', plural: 'Aloqa xabarlari' },
  admin: {
    group: 'Shaxsiy maʼlumotlar',
    useAsTitle: 'name',
    defaultColumns: ['name', 'topic', 'status', 'assignedTo', 'createdAt'],
    hidden: personalDataHidden.contactMessages,
    description: 'Aloqa shaklidan kelgan xabarlar. Har bir boʻlim faqat oʻz mavzularini koʻradi.',
  },
  access: contactMessagesAccess,
  disableDuplicate: true,
  fields: [
    {
      name: 'topic',
      label: 'Mavzu',
      type: 'select',
      required: true,
      index: true,
      options: CONTACT_TOPICS.map((value) => ({ label: TOPIC_LABELS[value], value })),
      access: { create: fieldRoles('eic', 'admin'), update: fieldRoles('eic', 'admin') },
      admin: { position: 'sidebar', description: 'Mavzuni faqat bosh muharrir va administrator oʻzgartira oladi.' },
    },
    { name: 'name', label: 'Ism', type: 'text', required: true, access: submittedFieldAccess },
    { name: 'email', label: 'E-pochta', type: 'email', required: true, index: true, access: submittedFieldAccess },
    { name: 'url', label: 'Maqola havolasi', type: 'text', access: submittedFieldAccess },
    { name: 'message', label: 'Xabar', type: 'textarea', required: true, access: submittedFieldAccess },
    {
      name: 'article',
      label: 'Maqola',
      type: 'relationship',
      relationTo: REL.articles,
      admin: { description: 'Havola muomalat.uz maqolasiga olib borsa, avtomatik topiladi.' },
    },
    ...personalDataFields(
      [
        { label: 'Yangi', value: 'new' },
        { label: 'Ishlanmoqda', value: 'in_progress' },
        { label: 'Yopildi', value: 'closed' },
      ],
      'new',
    ),
  ],
  hooks: hooksFor('contact-messages'),
}
