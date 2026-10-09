import type { Field } from 'payload'

/**
 * Image rights (CMS-SPEC §3.12), Grid-style categories. The publish checks
 * (ART-13/14/15: uz alt unless decorative, a credit, a category other than
 * `unknown`, `usableUntil` not passed, no sponsored-only image in editorial
 * stories) live in the validation concern.
 */
export const rightsCategoryOptions = [
  { label: 'Tahririyat xodimi', value: 'staff' },
  { label: 'Buyurtma asosida', value: 'commissioned' },
  { label: 'Axborot agentligi', value: 'agency' },
  { label: 'Rasmiy tarqatma', value: 'official_handout' },
  { label: 'Hamkor taqdim etgan', value: 'partner_supplied' },
  { label: 'Creative Commons', value: 'creative_commons' },
  { label: 'Jamoat mulki', value: 'public_domain' },
  { label: 'Ekrandan olingan kadr', value: 'screengrab' },
  { label: 'Ijtimoiy tarmoq', value: 'social_media' },
  { label: 'Nomaʼlum', value: 'unknown' },
]

/** Text that appears with the image: caption and credit (localized), and the decorative switch. */
export const displayFields = (): Field[] => [
  {
    name: 'decorative',
    label: 'Bezak uchun',
    type: 'checkbox',
    admin: { description: 'Rasm hech qanday maʼlumot bermasa belgilang: saytda alt="" bilan chiqadi va muqobil matn talab qilinmaydi.' },
  },
  {
    name: 'caption',
    label: 'Izoh',
    type: 'text',
    localized: true,
    admin: { description: 'Standart izoh; maqola yoki rasm bloki oʻz izohini bera oladi.' },
  },
  {
    name: 'credit',
    label: 'Muallif / manba',
    type: 'text',
    localized: true,
    admin: { description: 'Masalan «Foto: Muomalat» yoki «Illyustratsiya: Muomalat». Oʻzbekchasi chop etish uchun shart.' },
  },
]

/** Who made the image and on what terms it may be used. */
export const rightsFields = (): Field[] => [
  { name: 'creator', label: 'Yaratuvchi', type: 'text', admin: { description: 'Fotograf yoki rassom ismi.' } },
  {
    name: 'rightsCategory',
    label: 'Huquq toifasi',
    type: 'select',
    required: true,
    defaultValue: 'unknown',
    options: rightsCategoryOptions,
    admin: { description: '«Nomaʼlum» toifadagi rasm chop etilmaydi.' },
  },
  {
    name: 'licenceUrl',
    label: 'Litsenziya havolasi',
    type: 'text',
    admin: {
      description: 'Creative Commons uchun shart, masalan https://creativecommons.org/licenses/by/4.0/.',
      condition: (_, sibling) => sibling?.rightsCategory === 'creative_commons',
    },
  },
  { name: 'copyrightNotice', label: 'Mualliflik huquqi belgisi', type: 'text', admin: { description: 'Masalan «© Muomalat, 2026». JSON-LD copyrightNotice sifatida chiqadi.' } },
  {
    name: 'usableUntil',
    label: 'Foydalanish muddati',
    type: 'date',
    admin: { description: 'Shu sanadan keyin rasm maqolalarda ishlatilmaydi.', date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
  },
  { name: 'restrictions', label: 'Cheklovlar', type: 'textarea', admin: { description: 'Masalan «faqat shu maqola uchun» yoki «Telegramda ishlatilmasin».' } },
  { name: 'evidence', label: 'Ruxsat hujjati', type: 'text', admin: { description: 'Litsenziya yoki ruxsatnomaga havola yoxud uning raqami.' } },
  {
    name: 'sponsoredOnly',
    label: 'Faqat homiylik materiallari uchun',
    type: 'checkbox',
    admin: { description: 'Tijorat boʻlimi yuklagan rasmlarda avtomatik belgilanadi; bunday rasm tahririyat maqolalarida ishlatilmaydi.' },
  },
]
