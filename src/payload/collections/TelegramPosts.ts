import type { CollectionConfig } from 'payload'

import { systemFieldAccess, telegramPostsAccess } from '../access/system'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'

/**
 * Telegram channel posts (CMS-SPEC §10.2). Schema only: Telegram is Phase 2,
 * and the template, caption counter, approval (¬author, ≠ requester), the
 * cancellable delay and the worker are built then. `history` keeps every
 * caption ever sent or edited (Advertising Law Art. 15: 3 years for ads),
 * which is why posts are never deleted.
 */
export const TelegramPosts: CollectionConfig = {
  slug: 'telegram-posts',
  labels: { singular: 'Telegram post', plural: 'Telegram postlar' },
  admin: {
    group: 'Tarqatish',
    useAsTitle: 'captionHtml',
    defaultColumns: ['article', 'kind', 'status', 'sendAt', 'sentAt'],
    description: 'Kanalga yuboriladigan postlar. Har bir postni muallif boʻlmagan muharrir tasdiqlaydi.',
  },
  access: telegramPostsAccess,
  disableDuplicate: true,
  fields: [
    { name: 'article', label: 'Maqola', type: 'relationship', relationTo: REL.articles, index: true },
    {
      name: 'kind',
      label: 'Turi',
      type: 'select',
      required: true,
      defaultValue: 'article',
      options: [
        { label: 'Maqola posti', value: 'article' },
        { label: 'Tuzatish (javob xabari)', value: 'correction_reply' },
        { label: 'Qaytarib olish', value: 'retraction' },
      ],
    },
    {
      name: 'status',
      label: 'Holat',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Qoralama', value: 'draft' },
        { label: 'Tasdiqlangan', value: 'approved' },
        { label: 'Navbatda', value: 'queued' },
        { label: 'Yuborildi', value: 'sent' },
        { label: 'Tahrir kutilmoqda', value: 'edit_pending' },
        { label: 'Tahrirlandi', value: 'edited' },
        { label: 'Bekor qilindi', value: 'cancelled' },
        { label: 'Qaytarib olindi', value: 'retracted' },
        { label: 'Xato', value: 'failed' },
      ],
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true, description: 'Faqat tasdiqlash va bekor qilish tugmalari orqali oʻzgaradi.' },
    },
    {
      name: 'captionHtml',
      label: 'Matn (HTML)',
      type: 'textarea',
      admin: {
        description:
          'Faqat <b>, <i>, <a>. Teglarsiz uzunlik: rasm bilan 1024, matn bilan 4096 belgigacha (UTF-16 hisobi; Telegram chegarasidan qatʼiyroq).',
      },
    },
    {
      name: 'photo',
      label: 'Rasm',
      type: 'upload',
      relationTo: REL.media,
      admin: { description: 'Boʻsh boʻlsa, asosiy rasmning og oʻlchami ishlatiladi.' },
    },
    {
      name: 'imageFileId',
      label: 'Telegram file_id',
      type: 'text',
      access: systemFieldAccess,
      admin: { readOnly: true },
    },
    { name: 'silent', label: 'Ovozsiz yuborish', type: 'checkbox', admin: { position: 'sidebar' } },
    {
      name: 'sponsored',
      label: 'Reklama posti',
      type: 'checkbox',
      index: true,
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true, description: 'Maqoladan nusxa; reklama shablonini majburiy qiladi.' },
    },
    {
      name: 'requestedBy',
      label: 'Soʻragan',
      type: 'relationship',
      relationTo: 'users',
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'approvedBy',
      label: 'Tasdiqlagan',
      type: 'relationship',
      relationTo: 'users',
      access: systemFieldAccess,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'sendAt',
      label: 'Yuborish vaqti',
      type: 'date',
      timezone: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Tasdiqdan keyin kamida kechikish muddati oʻtadi (odatda 3 daqiqa).',
      },
    },
    { name: 'chatId', label: 'Chat ID', type: 'text', access: systemFieldAccess, admin: { readOnly: true } },
    { name: 'messageId', label: 'Xabar ID', type: 'text', access: systemFieldAccess, admin: { readOnly: true } },
    {
      name: 'sentAt',
      label: 'Yuborilgan vaqt',
      type: 'date',
      access: systemFieldAccess,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'replyTo',
      label: 'Javob beriladigan xabar',
      type: 'text',
      admin: { description: 'Tuzatish javob qilib yuboriladigan kanal xabarining message_id raqami.' },
    },
    {
      name: 'history',
      label: 'Tarix',
      type: 'array',
      access: systemFieldAccess,
      admin: { readOnly: true, description: 'Yuborilgan va tahrirlangan har bir matn.' },
      fields: [
        { name: 'at', label: 'Vaqt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'action', label: 'Amal', type: 'text' },
        { name: 'captionHtml', label: 'Matn (HTML)', type: 'textarea' },
      ],
    },
    { name: 'lastError', label: 'Oxirgi xato', type: 'textarea', access: systemFieldAccess, admin: { readOnly: true } },
  ],
  hooks: hooksFor('telegram-posts'),
}
