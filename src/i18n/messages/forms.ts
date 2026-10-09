import { defineMessages } from '../messages'

/** Shared form strings: labels, validation and status messages. */
const uz = {
  required: 'majburiy',
  optional: 'ixtiyoriy',
  name: 'Ism va familiya',
  email: 'Elektron pochta',
  emailPlaceholder: 'siz@kompaniya.uz',
  phone: 'Telefon',
  phonePlaceholder: '+998 __ ___-__-__',
  company: 'Kompaniya',
  position: 'Lavozim',
  message: 'Xabar',
  consent: 'Shaxsga doir maʼlumotlarimni ushbu soʻrovni koʻrib chiqish uchun qayta ishlashga roziman.',
  errors: {
    summary: 'Formada xatolar bor. Iltimos, belgilangan maydonlarni tekshiring.',
    required: 'Ushbu maydonni toʻldiring.',
    email: 'Elektron pochta manzilini toʻgʻri kiriting.',
    phone: 'Telefon raqamini +998 bilan boshlab kiriting.',
    consent: 'Davom etish uchun roziligingiz kerak.',
  },
  /** Not about one field (lib/forms FormError): too many attempts, or the store is unreachable. */
  formErrors: {
    rate: 'Juda koʻp urinish boʻldi. Birozdan keyin qayta yuboring.',
    unavailable: 'Hozir yuborib boʻlmadi. Birozdan keyin qayta urinib koʻring yoki «Aloqa» sahifasidagi elektron pochtaga yozing.',
  },
  success: 'Rahmat! Soʻrovingiz qabul qilindi.',
  /** Under the consent box: where the privacy notice is (CMS-SPEC §13.2). */
  privacyNote: 'Maʼlumotlaringiz qanday saqlanishi va qachon oʻchirilishi:',
  privacyLink: 'maxfiylik siyosati',
  /** Label of the hidden spam-trap field (never shown; bots fill it). */
  honeypot: 'Bu maydonni boʻsh qoldiring',
} as const

export const formMessages = defineMessages({
  uz,
  ru: {
    required: 'обязательно',
    optional: 'необязательно',
    name: 'Имя и фамилия',
    email: 'Электронная почта',
    emailPlaceholder: 'name@company.uz',
    phone: 'Телефон',
    phonePlaceholder: '+998 __ ___-__-__',
    company: 'Компания',
    position: 'Должность',
    message: 'Сообщение',
    consent: 'Я согласен (согласна) на обработку моих персональных данных для рассмотрения запроса.',
    errors: {
      summary: 'В форме есть ошибки. Проверьте отмеченные поля.',
      required: 'Заполните это поле.',
      email: 'Введите корректный адрес электронной почты.',
      phone: 'Введите номер телефона, начиная с +998.',
      consent: 'Для продолжения нужно ваше согласие.',
    },
    formErrors: {
      rate: 'Слишком много попыток. Повторите чуть позже.',
      unavailable: 'Сейчас отправить не удалось. Попробуйте чуть позже или напишите на почту со страницы «Контакты».',
    },
    success: 'Спасибо! Ваш запрос принят.',
    privacyNote: 'Как мы храним и когда удаляем ваши данные:',
    privacyLink: 'политика конфиденциальности',
    honeypot: 'Оставьте это поле пустым',
  },
  en: {
    required: 'required',
    optional: 'optional',
    name: 'Full name',
    email: 'Email',
    emailPlaceholder: 'you@company.uz',
    phone: 'Phone',
    phonePlaceholder: '+998 __ ___-__-__',
    company: 'Company',
    position: 'Job title',
    message: 'Message',
    consent: 'I agree that my personal data may be used to process this request.',
    errors: {
      summary: 'There are errors in the form. Please check the marked fields.',
      required: 'Please fill in this field.',
      email: 'Please enter a valid email address.',
      phone: 'Please enter a phone number starting with +998.',
      consent: 'We need your consent to continue.',
    },
    formErrors: {
      rate: 'Too many attempts. Please try again in a little while.',
      unavailable: 'We could not send this just now. Please try again later, or write to the email address on our contact page.',
    },
    success: 'Thank you! Your request has been received.',
    privacyNote: 'How we store your data and when we delete it:',
    privacyLink: 'privacy policy',
    honeypot: 'Leave this field empty',
  },
})
