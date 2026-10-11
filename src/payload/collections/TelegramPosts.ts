import type { CollectionConfig } from 'payload'

import { systemFieldAccess, telegramPostsAccess } from '../access/system'
import { REL } from '../fields/relations'
import { hooksFor } from '../hooks'
import { telegramEndpoints } from '../telegram/endpoints'

const ADMIN = '/payload/admin'

/**
 * Telegram channel posts (CMS-SPEC §10.2–10.4). The outbox prepares a draft
 * from the template when a story is first published, an edit and a
 * «TUZATISH:» reply when a correction is, and a retraction when it is
 * withdrawn (src/payload/telegram/outbox.ts). A person approves each row in
 * the sidebar panel: an editor or the editor-in-chief who is neither an
 * author of the story nor the one who wrote the caption; ads and
 * retractions only the editor-in-chief (src/payload/hooks/telegram). New
 * messages then wait out the cancellable delay before the worker sends them
 * (src/worker/jobs/telegram.ts). `history` keeps every caption ever sent or
 * edited (Advertising Law Art. 15: 3 years for ads), which is why posts are
 * never deleted.
 */
export const TelegramPosts: CollectionConfig = {
  slug: 'telegram-posts',
  labels: { singular: 'Telegram post', plural: 'Telegram postlar' },
  admin: {
    group: 'Tarqatish',
    useAsTitle: 'captionHtml',
    defaultColumns: ['article', 'kind', 'status', 'sendAt', 'sentAt'],
    description: 'Kanalga yuboriladigan postlar. Har bir postni muallif boʻlmagan muharrir tasdiqlaydi; reklama va olib tashlashni bosh muharrir.',
  },
  access: telegramPostsAccess,
  disableDuplicate: true,
  endpoints: telegramEndpoints,
  fields: [
    { name: 'telegramPanel', type: 'ui', admin: { position: 'sidebar', components: { Field: `${ADMIN}/TelegramPanel#TelegramPanel` } } },
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
          'Faqat <b>, <i>, <a>. Teglarsiz uzunlik: rasm bilan 1024, matn bilan 4096 belgigacha (UTF-16 hisobi; Telegram chegarasidan qatʼiyroq). Boʻsh qolsa, maqoladan shablon boʻyicha yasaladi.',
        components: { afterInput: [`${ADMIN}/TelegramCaption#TelegramCaptionCounter`] },
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
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' },
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
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' } },
    },
    {
      name: 'replyTo',
      label: 'Javob beriladigan xabar',
      type: 'text',
      access: systemFieldAccess,
      admin: { readOnly: true, description: 'Tuzatish javob qilib yuboriladigan (yoki olib tashlanadigan) kanal xabarining message_id raqami.' },
    },
    {
      name: 'history',
      label: 'Tarix',
      labels: { singular: 'Yozuv', plural: 'Yozuvlar' },
      type: 'array',
      access: systemFieldAccess,
      admin: {
        readOnly: true,
        description: 'Yuborilgan va tahrirlangan har bir matn.',
        components: { RowLabel: `${ADMIN}/TelegramCaption#TelegramHistoryLabel` },
      },
      fields: [
        { name: 'at', label: 'Vaqt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' } } },
        { name: 'action', label: 'Amal', type: 'text' },
        { name: 'captionHtml', label: 'Matn (HTML)', type: 'textarea' },
      ],
    },
    { name: 'lastError', label: 'Oxirgi xato', type: 'textarea', access: systemFieldAccess, admin: { readOnly: true } },
  ],
  hooks: hooksFor('telegram-posts'),
}
