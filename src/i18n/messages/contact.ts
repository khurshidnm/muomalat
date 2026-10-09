import { defineMessages } from '../messages'

/**
 * /aloqa — contacts, error reports, general contact form. Addresses, handles
 * and the time-zone code are constants (components/pages/contact/data.ts), so
 * /kr does not transliterate them.
 */
const uz = {
  metaTitle: 'Aloqa',
  metaDescription:
    'Muomalat tahririyati, tijorat boʻlimi va klub bilan bogʻlanish: elektron pochta, Telegram, telefon va manzil. Xato haqida xabar berish va tuzatish soʻrovi.',
  kicker: 'Tahririyat',
  title: 'Aloqa',
  lead: 'Yangilik yoki hujjat haqida xabar bermoqchimisiz, materialimizda xato topdingizmi yoki hamkorlik taklifingiz bormi — kerakli manzilni tanlang yoki quyidagi forma orqali yozing.',
  directoryTitle: 'Bogʻlanish manzillari',
  cards: {
    editorial: {
      title: 'Tahririyat',
      text: 'Yangiliklar, hujjatlar, intervyu takliflari va materiallarimiz boʻyicha savollar.',
    },
    advertising: {
      title: 'Reklama va hamkorlik',
      text: 'Reklama joylashtirish, hamkorlik materiallari va media-kit. Tijorat boʻlimi tahririyatdan alohida ishlaydi.',
      link: 'Formatlar va shartlar',
    },
    club: {
      title: 'Muomalat klubi',
      text: 'Uchrashuvlarda qatnashish, aʼzolik va spiker sifatida chiqish.',
      link: 'Klub sahifasi',
    },
    telegram: {
      title: 'Telegram',
      text: 'Asosiy xabarlar har kuni kanalimizda. Tahririyatga Telegram orqali ham yozishingiz mumkin.',
      channel: 'Kanal',
      write: 'Telegram orqali yozish',
    },
    phone: {
      title: 'Telefon va ish vaqti',
      weekdays: 'Dushanba – juma',
      weekend: 'Shanba, yakshanba',
      weekendValue: 'dam olish kunlari',
      timezone: 'Toshkent vaqti',
    },
    address: {
      title: 'Tahririyat manzili',
      text: 'Tashrifni oldindan kelishib oling: tahririyatga yozing yoki qoʻngʻiroq qiling.',
    },
  },
  correction: {
    title: 'Xato topdingizmi?',
    text: 'Fakt, raqam, ism yoki sanada xatoga yoʻl qoʻygan boʻlsak, bizga xabar bering. Har bir murojaatni tekshiramiz: xato tasdiqlansa, matn tuzatiladi va material oxirida tuzatish sanasi bilan qayd etiladi.',
    cta: 'Tuzatish soʻrovini yuborish',
    policy: 'Tuzatishlar tartibi',
  },
  religion: {
    title: 'Diniy masalalar boʻyicha',
    text: 'Muomalat — moliyaviy-iqtisodiy nashr va diniy hukm chiqarmaydi. Mahsulotning shariat talablariga muvofiqligi haqidagi savollar bilan uni taklif qilayotgan tashkilotning shariat kengashiga murojaat qiling.',
  },
  tips: {
    title: 'Tahririyatga yozayotganda',
    items: [
      'Nima, qachon va qayerda boʻlgani — qisqacha',
      'Hujjat, manba yoki havola, agar boʻlsa',
      'Siz bilan qanday bogʻlanish mumkinligi',
    ],
    confidential:
      'Maxfiy hujjat yubormoqchi boʻlsangiz, avval tahririyat pochtasiga qisqa xat yozing — xavfsiz aloqa usulini kelishib olamiz.',
  },
  form: {
    title: 'Xabar yuborish',
    intro: 'Mavzuni tanlang — xabaringiz kerakli boʻlimga yetkaziladi.',
    allRequired: 'Barcha maydonlar majburiy, ixtiyoriylari alohida belgilangan.',
    topicLabel: 'Mavzu',
    topicPrompt: 'Mavzuni tanlang',
    topics: {
      tahririyat: 'Tahririyatga xabar',
      tuzatish: 'Tuzatish soʻrovi',
      reklama: 'Reklama va hamkorlik',
      klub: 'Muomalat klubi',
      boshqa: 'Boshqa',
    },
    urlLabel: 'Maqola havolasi',
    urlHint: 'Tuzatish soʻrovi yoki muayyan material haqidagi xabar uchun.',
    urlPlaceholder: 'https://muomalat.uz/…',
    urlError: 'Havolani toʻliq kiriting, masalan: https://muomalat.uz/tahlil/…',
    honeypot: 'Bu maydonni boʻsh qoldiring',
    messageHint: 'Tuzatish soʻrovida qaysi jumla notoʻgʻri ekanini va toʻgʻri maʼlumot manbasini koʻrsating.',
    submit: 'Xabarni yuborish',
    success: 'Rahmat! Xabaringiz qabul qilindi.',
    choose: 'Roʻyxatdan birini tanlang.',
  },
} as const

export const contactMessages = defineMessages({
  uz,
  ru: {
    metaTitle: 'Контакты',
    metaDescription:
      'Как связаться с редакцией Muomalat, коммерческим отделом и клубом: электронная почта, Telegram, телефон и адрес. Сообщить об ошибке и запросить исправление.',
    kicker: 'Редакция',
    title: 'Контакты',
    lead: 'Хотите сообщить о новости или документе, нашли ошибку в нашем материале или у вас есть предложение о партнёрстве — выберите нужный адрес или напишите через форму ниже.',
    directoryTitle: 'Адреса для связи',
    cards: {
      editorial: {
        title: 'Редакция',
        text: 'Новости, документы, предложения интервью и вопросы по нашим материалам.',
      },
      advertising: {
        title: 'Реклама и партнёрство',
        text: 'Размещение рекламы, партнёрские материалы и медиакит. Коммерческий отдел работает отдельно от редакции.',
        link: 'Форматы и условия',
      },
      club: {
        title: 'Клуб Muomalat',
        text: 'Участие во встречах, членство и выступления в качестве спикера.',
        link: 'Страница клуба',
      },
      telegram: {
        title: 'Telegram',
        text: 'Главные новости каждый день в нашем канале. Написать редакции можно и через Telegram.',
        channel: 'Канал',
        write: 'Написать в Telegram',
      },
      phone: {
        title: 'Телефон и часы работы',
        weekdays: 'Понедельник – пятница',
        weekend: 'Суббота, воскресенье',
        weekendValue: 'выходные',
        timezone: 'Ташкентское время',
      },
      address: {
        title: 'Адрес редакции',
        text: 'Визит согласовывается заранее: напишите или позвоните в редакцию.',
      },
    },
    correction: {
      title: 'Нашли ошибку?',
      text: 'Если мы ошиблись в факте, цифре, имени или дате, сообщите нам. Мы проверяем каждое обращение: если ошибка подтвердится, текст исправят, а в конце материала появится отметка об исправлении с датой.',
      cta: 'Отправить запрос на исправление',
      policy: 'Порядок исправлений',
    },
    religion: {
      title: 'О религиозных вопросах',
      text: 'Muomalat — финансово-экономическое издание и не выносит религиозных суждений. С вопросами о соответствии продукта нормам шариата обращайтесь в шариатский совет организации, которая его предлагает.',
    },
    tips: {
      title: 'Когда пишете в редакцию',
      items: [
        'Что, когда и где произошло — коротко',
        'Документ, источник или ссылка, если есть',
        'Как с вами связаться',
      ],
      confidential:
        'Если хотите передать конфиденциальный документ, сначала напишите короткое письмо на почту редакции — мы договоримся о безопасном способе связи.',
    },
    form: {
      title: 'Написать нам',
      intro: 'Выберите тему — сообщение попадёт в нужный отдел.',
      allRequired: 'Все поля обязательны, кроме отмеченных.',
      topicLabel: 'Тема',
      topicPrompt: 'Выберите тему',
      topics: {
        tahririyat: 'Сообщение в редакцию',
        tuzatish: 'Запрос на исправление',
        reklama: 'Реклама и партнёрство',
        klub: 'Клуб Muomalat',
        boshqa: 'Другое',
      },
      urlLabel: 'Ссылка на материал',
      urlHint: 'Для запроса на исправление или сообщения о конкретном материале.',
      urlPlaceholder: 'https://muomalat.uz/…',
      urlError: 'Укажите полную ссылку, например: https://muomalat.uz/tahlil/…',
      honeypot: 'Оставьте это поле пустым',
      messageHint: 'В запросе на исправление укажите, какая фраза неверна, и источник верных данных.',
      submit: 'Отправить сообщение',
      success: 'Спасибо! Ваше сообщение получено.',
      choose: 'Выберите вариант из списка.',
    },
  },
  en: {
    metaTitle: 'Contact',
    metaDescription:
      'How to reach Muomalat’s newsroom, commercial team and club: email, Telegram, phone and address. Report an error or request a correction.',
    kicker: 'Newsroom',
    title: 'Contact',
    lead: 'Want to tell us about a story or a document, found a mistake in our reporting, or have a partnership proposal? Pick the right address below or write to us through the form.',
    directoryTitle: 'Contact addresses',
    cards: {
      editorial: {
        title: 'Newsroom',
        text: 'News tips, documents, interview proposals and questions about our stories.',
      },
      advertising: {
        title: 'Advertising and partnerships',
        text: 'Advertising, partner content and the media kit. The commercial team works separately from the newsroom.',
        link: 'Formats and terms',
      },
      club: {
        title: 'Muomalat Club',
        text: 'Attending meetings, membership and speaking at the club.',
        link: 'Club page',
      },
      telegram: {
        title: 'Telegram',
        text: 'The key news every day on our channel. You can also message the newsroom on Telegram.',
        channel: 'Channel',
        write: 'Message us on Telegram',
      },
      phone: {
        title: 'Phone and office hours',
        weekdays: 'Monday – Friday',
        weekend: 'Saturday, Sunday',
        weekendValue: 'closed',
        timezone: 'Tashkent time',
      },
      address: {
        title: 'Editorial office',
        text: 'Visits by appointment only: write or call the newsroom first.',
      },
    },
    correction: {
      title: 'Spotted a mistake?',
      text: 'If we got a fact, a figure, a name or a date wrong, please tell us. We check every report: if the error is confirmed, the text is corrected and a dated correction note is added at the end of the story.',
      cta: 'Request a correction',
      policy: 'Corrections policy',
    },
    religion: {
      title: 'On religious questions',
      text: 'Muomalat is a financial and business publication and does not issue religious rulings. Questions about whether a product complies with Sharia should go to the Sharia board of the institution that offers it.',
    },
    tips: {
      title: 'When you write to the newsroom',
      items: [
        'What happened, when and where — briefly',
        'A document, source or link, if you have one',
        'How we can reach you',
      ],
      confidential:
        'If you want to share a confidential document, first send a short note to the newsroom address and we will agree a secure way to talk.',
    },
    form: {
      title: 'Send us a message',
      intro: 'Choose a topic and your message will reach the right team.',
      allRequired: 'All fields are required unless marked optional.',
      topicLabel: 'Topic',
      topicPrompt: 'Choose a topic',
      topics: {
        tahririyat: 'Message to the newsroom',
        tuzatish: 'Correction request',
        reklama: 'Advertising and partnerships',
        klub: 'Muomalat Club',
        boshqa: 'Something else',
      },
      urlLabel: 'Link to the story',
      urlHint: 'For a correction request or a message about a specific story.',
      urlPlaceholder: 'https://muomalat.uz/…',
      urlError: 'Please enter the full link, for example https://muomalat.uz/tahlil/…',
      honeypot: 'Leave this field empty',
      messageHint: 'For a correction, quote the sentence that is wrong and give the source for the correct information.',
      submit: 'Send message',
      success: 'Thank you! Your message has been received.',
      choose: 'Please choose an option from the list.',
    },
  },
})
