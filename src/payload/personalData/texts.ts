import { defineMessages, pick } from '../../i18n/messages'
import type { Locale } from '../../i18n/config'

/**
 * Privacy texts (CMS-SPEC §13.2): the consent text each form shows, the
 * notice, the confirmation e-mails and the pages of the personal-data routes.
 * Written in uz, ru and en; the Cyrillic edition (`kr`) is transliterated
 * from uz by pick(). Brand names stay Latin through {en:…}.
 *
 * The consent texts are a record: each submission stores the version it was
 * given under (CONSENT_VERSIONS). Change a consent or notice text and you
 * must bump that version; old records keep theirs. tests/personaldata checks
 * the fingerprints in consent.ts, and that the texts here are the ones the
 * forms really show.
 */

const uz = {
  /** What the person agreed to, word for word as the form shows it. */
  consent: {
    club: 'Shaxsga doir maʼlumotlarimni ushbu soʻrovni koʻrib chiqish uchun qayta ishlashga roziman.',
    contact: 'Shaxsga doir maʼlumotlarimni ushbu soʻrovni koʻrib chiqish uchun qayta ishlashga roziman.',
    advertising: 'Shaxsga doir maʼlumotlarimni ushbu soʻrovni koʻrib chiqish uchun qayta ishlashga roziman.',
    /** The digest form has no checkbox: its note, then the confirmation e-mail (double opt-in). */
    digest: 'Har hafta bitta xat. Obunani istalgan vaqtda bekor qilish mumkin.',
    digestConfirm:
      'Tasdiqlash tugmasini bossangiz, elektron pochta manzilingizni faqat haftalik dayjestni yuborish uchun saqlashimizga rozilik bildirasiz.',
  },
  /** The notice: who, where, who else, rights, whom to ask. */
  notice: {
    controller: (founder: string) => `Maʼlumotlaringizni Muomalat nashrining muassisi — ${founder} qayta ishlaydi.`,
    storage: 'Maʼlumotlar Yevropa Ittifoqida, Litvadagi serverlarda saqlanadi.',
    processors:
      'Ularni biz uchun faqat xizmat koʻrsatuvchilar qayta ishlaydi: xosting ({en:Hostinger}, Litva), elektron pochta xizmati (Yevropa Ittifoqi) va {en:Cloudflare} (sayt tarmogʻi va himoyasi).',
    noSharing:
      'Maʼlumotlaringizni reklama beruvchilar, homiylar yoki boshqa uchinchi shaxslarga bermaymiz va sotmaymiz. Klub roʻyxati homiylarga faqat alohida yozma roziligingiz bilan beriladi.',
    noIp: 'Shakllar {en:IP} manzilingizni saqlamaydi.',
    rights:
      'Istalgan vaqtda roziligingizni qaytarib olishingiz, maʼlumotlaringiz nusxasini olishingiz, ularni tuzatish, oʻchirish yoki qayta ishlashni toʻxtatishni soʻrashingiz mumkin.',
    howTo:
      'Soʻrovni shu sahifadagi shakl orqali yoki masʼul shaxsga elektron pochta orqali yuboring. 10 ish kuni ichida javob berishga harakat qilamiz.',
    officer: 'Shaxsga doir maʼlumotlar uchun masʼul shaxs',
  },
  /** Per form: what is stored, why, for how long (§13.1; periods are proposals for counsel). */
  purposes: {
    club: {
      title: 'Muomalat klubiga ariza',
      data: 'Ism, kompaniya, soha, kompaniya hajmi, telefon, elektron pochta, qiziqishlar va xabar.',
      purpose: 'Arizangizni koʻrib chiqish, siz bilan bogʻlanish va klub uchrashuvlariga taklif qilish.',
      retention: 'Oxirgi aloqadan keyin 24 oy; rad etilgan arizalar 6 oydan keyin oʻchiriladi.',
    },
    digest: {
      title: 'Haftalik dayjest',
      data: 'Elektron pochta manzili va sayt tili.',
      purpose: 'Haftalik dayjestni yuborish.',
      retention:
        'Tasdiqlanmagan obuna 7 kundan keyin oʻchiriladi. Obunani bekor qilsangiz, manzil 30 kundan keyin oʻchiriladi; sizga qayta xat yubormaslik uchun undan faqat qaytarib boʻlmaydigan xesh ({en:SHA-256}) qoladi.',
    },
    contact: {
      title: 'Aloqa shakli',
      data: 'Ism, elektron pochta, maqola havolasi va xabar.',
      purpose: 'Xabaringizga javob berish va uni tegishli boʻlimga yetkazish. Tuzatish soʻrovlari murojaatlar reyestriga yoziladi.',
      retention: '24 oy. Tuzatish soʻrovi reyestrdagi yozuv bilan birga, qarordan keyin 3 yil saqlanadi.',
    },
    advertising: {
      title: 'Reklama soʻrovi',
      data: 'Ism, kompaniya, elektron pochta, telefon, reklama formati, byudjet va xabar.',
      purpose: 'Reklama boʻyicha taklif tayyorlash va siz bilan bogʻlanish.',
      retention: '12 oy; shartnoma tuzilsa, 3 yil.',
    },
    rights: {
      title: 'Maʼlumotlar boʻyicha soʻrov',
      data: 'Elektron pochta manzili va soʻrov turi.',
      purpose: 'Soʻrovingizni bajarish va qonun talab qiladigan hisobni yuritish.',
      retention: 'Qarordan keyin 3 yil.',
    },
  },
  /** Rights-request kinds (§13.3). */
  rightsKinds: {
    delete: 'Maʼlumotlarimni oʻchirish',
    suspend: 'Maʼlumotlarimni qayta ishlashni toʻxtatish',
    access: 'Maʼlumotlarim nusxasini olish',
  },
  mail: {
    signoff: 'Muomalat tahririyati',
    notYou: 'Agar bu shaklni siz yubormagan boʻlsangiz, xatga eʼtibor bermang: hech narsa qilish shart emas.',
    privacy: 'Maʼlumotlaringiz qanday saqlanishi va ularni oʻchirishni qanday soʻrash mumkinligi:',
    linkHint: 'Tugma ishlamasa, havolani brauzerga nusxalang:',
    digestConfirm: {
      subject: 'Muomalat dayjestiga obunani tasdiqlang',
      lead: 'Muomalatning haftalik dayjestiga obuna boʻlish soʻrovi keldi.',
      action: 'Obunani tasdiqlash',
      expiry: 'Havola 7 kun amal qiladi. Tasdiqlamasangiz, manzilingiz 7 kundan keyin oʻchiriladi.',
    },
    received: {
      club: {
        subject: 'Muomalat klubiga arizangiz qabul qilindi',
        lead: 'Muomalat klubiga arizangizni oldik. Tijorat boʻlimi siz bilan telefon yoki elektron pochta orqali bogʻlanadi.',
      },
      contact: {
        subject: 'Xabaringiz Muomalat tahririyatiga yetib keldi',
        lead: 'Aloqa shakli orqali yuborgan xabaringizni oldik. Javob kerak boʻlsa, shu manzilga yozamiz.',
      },
      advertising: {
        subject: 'Reklama soʻrovingiz qabul qilindi',
        lead: 'Reklama boʻyicha soʻrovingizni oldik. Tijorat boʻlimi siz bilan bogʻlanadi.',
      },
    },
    rightsVerify: {
      subject: 'Maʼlumotlar boʻyicha soʻrovingizni tasdiqlang',
      lead: (kind: string) => `Muomalat saytida shu elektron pochta manzili nomidan soʻrov yuborildi: «${kind}».`,
      action: 'Soʻrovni tasdiqlash',
      expiry: 'Havola 48 soat amal qiladi. Soʻrov faqat tasdiqlangandan keyin roʻyxatga olinadi.',
    },
    rightsReceived: {
      subject: 'Soʻrovingiz roʻyxatga olindi',
      lead: (kind: string) => `Soʻrovingizni roʻyxatga oldik: «${kind}».`,
      next: 'Uni 10 ish kuni ichida koʻrib chiqishga harakat qilamiz va natijasini shu manzilga yozamiz.',
    },
  },
  pages: {
    privacy: {
      metaTitle: 'Maxfiylik va shaxsga doir maʼlumotlar',
      metaDescription:
        'Muomalat shakllari qanday maʼlumot yigʻadi, ular qayerda va qancha saqlanadi, maʼlumotlaringizni oʻchirish yoki qayta ishlashni toʻxtatishni qanday soʻrash mumkin.',
      kicker: 'Maxfiylik',
      title: 'Shaxsga doir maʼlumotlar',
      lead: 'Muomalat faqat shakllarda oʻzingiz yuborgan maʼlumotlarni saqlaydi va ulardan faqat shu sahifada yozilgan maqsadlarda foydalanadi.',
      who: 'Kim qayta ishlaydi va qayerda saqlanadi',
      forms: 'Shakllar orqali nima saqlaymiz',
      rights: 'Sizning huquqlaringiz',
      data: 'Maʼlumotlar',
      purpose: 'Maqsad',
      retention: 'Saqlash muddati',
      version: 'Rozilik matni versiyasi',
      officerPending: 'Masʼul shaxs ismi eʼlon qilinadi',
    },
    rightsForm: {
      title: 'Maʼlumotlar boʻyicha soʻrov',
      intro: 'Elektron pochta manzilingizni va soʻrov turini kiriting. Manzilingizga tasdiqlash havolasini yuboramiz: soʻrov faqat shundan keyin qabul qilinadi.',
      email: 'Elektron pochta',
      kindLabel: 'Soʻrov turi',
      kindPrompt: 'Tanlang',
      submit: 'Soʻrovni yuborish',
      success: 'Rahmat! Soʻrovni tasdiqlash uchun pochtangizga havola yubordik.',
      choose: 'Soʻrov turini tanlang.',
      note: 'Shakllarda koʻrsatgan manzilingizni kiriting: maʼlumotlarni shu manzil boʻyicha qidiramiz.',
    },
    rightsConfirm: {
      metaTitle: 'Soʻrovni tasdiqlash',
      title: 'Soʻrovni tasdiqlang',
      lead: (kind: string, email: string) => `«${kind}» soʻrovi ${email} manzili uchun roʻyxatga olinadi.`,
      button: 'Tasdiqlayman',
      done: 'Soʻrovingiz roʻyxatga olindi. Natijasini elektron pochtangizga yozamiz.',
      already: 'Bu soʻrov allaqachon roʻyxatga olingan.',
      invalid: 'Havola notoʻgʻri yoki muddati oʻtgan. Soʻrovni maxfiylik sahifasidan qaytadan yuboring.',
    },
    digestConfirm: {
      metaTitle: 'Obunani tasdiqlash',
      title: 'Obunani tasdiqlang',
      lead: 'Haftalik dayjestga obunani tasdiqlash uchun tugmani bosing.',
      button: 'Obunani tasdiqlash',
      done: 'Obuna tasdiqlandi. Dayjest har juma soat 18:00 da keladi.',
      invalid: 'Havola notoʻgʻri, muddati oʻtgan yoki allaqachon ishlatilgan. Obuna boʻlish uchun formani qaytadan toʻldiring.',
    },
    unsubscribe: {
      metaTitle: 'Obunani bekor qilish',
      title: 'Obunani bekor qilish',
      lead: 'Haftalik dayjestni olishni toʻxtatish uchun tugmani bosing.',
      button: 'Obunani bekor qilish',
      done: 'Obuna bekor qilindi. Endi sizga dayjest yuborilmaydi.',
      invalid: 'Havola notoʻgʻri. Xatdagi havolani toʻliq nusxalang yoki tahririyatga yozing.',
    },
    common: {
      sending: 'Yuborilmoqda…',
      busy: 'Hozir soʻrovni bajarib boʻlmadi. Birozdan keyin qayta urinib koʻring.',
      privacyLink: 'Maxfiylik va shaxsga doir maʼlumotlar',
      digestLink: 'Dayjest sahifasi',
    },
  },
} as const

export const privacyMessages = defineMessages({
  uz,
  ru: {
    consent: {
      club: 'Я согласен (согласна) на обработку моих персональных данных для рассмотрения запроса.',
      contact: 'Я согласен (согласна) на обработку моих персональных данных для рассмотрения запроса.',
      advertising: 'Я согласен (согласна) на обработку моих персональных данных для рассмотрения запроса.',
      digest: 'Одно письмо в неделю. Отписаться можно в любой момент.',
      digestConfirm:
        'Нажимая кнопку подтверждения, вы соглашаетесь, что мы храним ваш адрес электронной почты только для отправки еженедельного дайджеста.',
    },
    notice: {
      controller: (founder: string) => `Ваши данные обрабатывает учредитель издания Muomalat — ${founder}.`,
      storage: 'Данные хранятся на серверах в Европейском союзе, в Литве.',
      processors:
        'По нашему поручению их обрабатывают только поставщики услуг: хостинг (Hostinger, Литва), почтовый сервис (Европейский союз) и Cloudflare (сеть и защита сайта).',
      noSharing:
        'Мы не передаём и не продаём ваши данные рекламодателям, спонсорам и другим третьим лицам. Список участников клуба передаётся спонсорам только с вашего отдельного письменного согласия.',
      noIp: 'Формы не сохраняют ваш IP-адрес.',
      rights:
        'Вы можете в любой момент отозвать согласие, получить копию своих данных, попросить исправить или удалить их либо приостановить их обработку.',
      howTo:
        'Отправьте запрос через форму на этой странице или по электронной почте ответственному лицу. Мы стараемся ответить в течение 10 рабочих дней.',
      officer: 'Ответственный за персональные данные',
    },
    purposes: {
      club: {
        title: 'Заявка в клуб Muomalat',
        data: 'Имя, компания, отрасль, размер компании, телефон, электронная почта, интересы и сообщение.',
        purpose: 'Рассмотреть заявку, связаться с вами и приглашать на встречи клуба.',
        retention: '24 месяца после последнего контакта; отклонённые заявки удаляются через 6 месяцев.',
      },
      digest: {
        title: 'Еженедельный дайджест',
        data: 'Адрес электронной почты и язык сайта.',
        purpose: 'Отправлять еженедельный дайджест.',
        retention:
          'Неподтверждённая подписка удаляется через 7 дней. После отписки адрес удаляется через 30 дней; чтобы больше не писать вам, остаётся только его необратимый хеш (SHA-256).',
      },
      contact: {
        title: 'Форма обратной связи',
        data: 'Имя, электронная почта, ссылка на статью и сообщение.',
        purpose: 'Ответить на сообщение и передать его нужному отделу. Запросы на исправление вносятся в реестр обращений.',
        retention: '24 месяца. Запрос на исправление хранится вместе с записью в реестре — 3 года после решения.',
      },
      advertising: {
        title: 'Запрос на рекламу',
        data: 'Имя, компания, электронная почта, телефон, формат рекламы, бюджет и сообщение.',
        purpose: 'Подготовить рекламное предложение и связаться с вами.',
        retention: '12 месяцев; если заключён договор — 3 года.',
      },
      rights: {
        title: 'Запрос о данных',
        data: 'Адрес электронной почты и вид запроса.',
        purpose: 'Выполнить запрос и вести учёт, которого требует закон.',
        retention: '3 года после решения.',
      },
    },
    rightsKinds: {
      delete: 'Удалить мои данные',
      suspend: 'Приостановить обработку моих данных',
      access: 'Получить копию моих данных',
    },
    mail: {
      signoff: 'Редакция Muomalat',
      notYou: 'Если вы не отправляли эту форму, просто проигнорируйте письмо: ничего делать не нужно.',
      privacy: 'Как хранятся ваши данные и как попросить их удалить:',
      linkHint: 'Если кнопка не работает, скопируйте ссылку в браузер:',
      digestConfirm: {
        subject: 'Подтвердите подписку на дайджест Muomalat',
        lead: 'Мы получили запрос на подписку на еженедельный дайджест Muomalat.',
        action: 'Подтвердить подписку',
        expiry: 'Ссылка действует 7 дней. Если вы не подтвердите подписку, адрес будет удалён через 7 дней.',
      },
      received: {
        club: {
          subject: 'Ваша заявка в клуб Muomalat принята',
          lead: 'Мы получили вашу заявку в клуб Muomalat. Коммерческий отдел свяжется с вами по телефону или электронной почте.',
        },
        contact: {
          subject: 'Ваше сообщение получено редакцией Muomalat',
          lead: 'Мы получили сообщение, отправленное через форму обратной связи. Если понадобится ответ, мы напишем на этот адрес.',
        },
        advertising: {
          subject: 'Ваш запрос на рекламу принят',
          lead: 'Мы получили ваш запрос на рекламу. Коммерческий отдел свяжется с вами.',
        },
      },
      rightsVerify: {
        subject: 'Подтвердите запрос о ваших данных',
        lead: (kind: string) => `На сайте Muomalat от имени этого адреса электронной почты отправлен запрос: «${kind}».`,
        action: 'Подтвердить запрос',
        expiry: 'Ссылка действует 48 часов. Запрос регистрируется только после подтверждения.',
      },
      rightsReceived: {
        subject: 'Ваш запрос зарегистрирован',
        lead: (kind: string) => `Мы зарегистрировали ваш запрос: «${kind}».`,
        next: 'Мы постараемся рассмотреть его в течение 10 рабочих дней и сообщим результат на этот адрес.',
      },
    },
    pages: {
      privacy: {
        metaTitle: 'Конфиденциальность и персональные данные',
        metaDescription:
          'Какие данные собирают формы Muomalat, где и сколько они хранятся и как попросить удалить их или приостановить обработку.',
        kicker: 'Конфиденциальность',
        title: 'Персональные данные',
        lead: 'Muomalat хранит только те данные, которые вы сами отправили через формы, и использует их только для целей, описанных на этой странице.',
        who: 'Кто обрабатывает данные и где они хранятся',
        forms: 'Что мы храним из форм',
        rights: 'Ваши права',
        data: 'Данные',
        purpose: 'Цель',
        retention: 'Срок хранения',
        version: 'Версия текста согласия',
        officerPending: 'Имя ответственного лица будет опубликовано',
      },
      rightsForm: {
        title: 'Запрос о данных',
        intro: 'Укажите адрес электронной почты и вид запроса. Мы отправим на этот адрес ссылку для подтверждения: запрос принимается только после неё.',
        email: 'Электронная почта',
        kindLabel: 'Вид запроса',
        kindPrompt: 'Выберите',
        submit: 'Отправить запрос',
        success: 'Спасибо! Мы отправили ссылку для подтверждения запроса.',
        choose: 'Выберите вид запроса.',
        note: 'Укажите адрес, который вы вводили в формах: данные ищутся по нему.',
      },
      rightsConfirm: {
        metaTitle: 'Подтверждение запроса',
        title: 'Подтвердите запрос',
        lead: (kind: string, email: string) => `Запрос «${kind}» будет зарегистрирован для адреса ${email}.`,
        button: 'Подтверждаю',
        done: 'Запрос зарегистрирован. Результат мы сообщим по электронной почте.',
        already: 'Этот запрос уже зарегистрирован.',
        invalid: 'Ссылка неверна или устарела. Отправьте запрос заново со страницы о конфиденциальности.',
      },
      digestConfirm: {
        metaTitle: 'Подтверждение подписки',
        title: 'Подтвердите подписку',
        lead: 'Нажмите кнопку, чтобы подтвердить подписку на еженедельный дайджест.',
        button: 'Подтвердить подписку',
        done: 'Подписка подтверждена. Дайджест приходит каждую пятницу в 18:00.',
        invalid: 'Ссылка неверна, устарела или уже использована. Чтобы подписаться, заполните форму ещё раз.',
      },
      unsubscribe: {
        metaTitle: 'Отписка от дайджеста',
        title: 'Отписка от дайджеста',
        lead: 'Нажмите кнопку, чтобы больше не получать еженедельный дайджест.',
        button: 'Отписаться',
        done: 'Подписка отменена. Дайджест больше не будет приходить.',
        invalid: 'Ссылка неверна. Скопируйте ссылку из письма полностью или напишите в редакцию.',
      },
      common: {
        sending: 'Отправка…',
        busy: 'Сейчас не удалось выполнить запрос. Попробуйте ещё раз чуть позже.',
        privacyLink: 'Конфиденциальность и персональные данные',
        digestLink: 'Страница дайджеста',
      },
    },
  },
  en: {
    consent: {
      club: 'I agree that my personal data may be used to process this request.',
      contact: 'I agree that my personal data may be used to process this request.',
      advertising: 'I agree that my personal data may be used to process this request.',
      digest: 'One email a week. Unsubscribe at any time.',
      digestConfirm: 'By pressing the confirm button you agree that we keep your email address only to send you the weekly digest.',
    },
    notice: {
      controller: (founder: string) => `Your data is processed by the founder of Muomalat, ${founder}.`,
      storage: 'The data is stored on servers in the European Union, in Lithuania.',
      processors:
        'Only our service providers process it on our behalf: hosting (Hostinger, Lithuania), the email service (European Union) and Cloudflare (site network and protection).',
      noSharing:
        'We do not give or sell your data to advertisers, sponsors or any other third party. The club list goes to sponsors only with your separate written consent.',
      noIp: 'The forms do not store your IP address.',
      rights:
        'At any time you can withdraw your consent, get a copy of your data, and ask us to correct it, delete it or stop processing it.',
      howTo: 'Send a request with the form on this page, or by email to the person responsible. We aim to reply within 10 working days.',
      officer: 'Person responsible for personal data',
    },
    purposes: {
      club: {
        title: 'Muomalat club application',
        data: 'Name, company, sector, company size, phone, email, interests and message.',
        purpose: 'To review your application, contact you and invite you to club meetings.',
        retention: '24 months after the last contact; declined applications are deleted after 6 months.',
      },
      digest: {
        title: 'Weekly digest',
        data: 'Email address and site language.',
        purpose: 'To send you the weekly digest.',
        retention:
          'An unconfirmed subscription is deleted after 7 days. After you unsubscribe, the address is deleted after 30 days; only a one-way hash (SHA-256) is kept so that we never write to you again.',
      },
      contact: {
        title: 'Contact form',
        data: 'Name, email, article link and message.',
        purpose: 'To answer your message and pass it to the right desk. Correction requests are entered in the requests register.',
        retention: '24 months. A correction request is kept with its register entry, 3 years after the decision.',
      },
      advertising: {
        title: 'Advertising enquiry',
        data: 'Name, company, email, phone, advertising format, budget and message.',
        purpose: 'To prepare an advertising offer and contact you.',
        retention: '12 months; 3 years if a contract is signed.',
      },
      rights: {
        title: 'Request about your data',
        data: 'Email address and type of request.',
        purpose: 'To carry out your request and keep the record the law requires.',
        retention: '3 years after the decision.',
      },
    },
    rightsKinds: {
      delete: 'Delete my data',
      suspend: 'Stop processing my data',
      access: 'Send me a copy of my data',
    },
    mail: {
      signoff: 'The Muomalat newsroom',
      notYou: 'If you did not send this form, ignore this email: you do not need to do anything.',
      privacy: 'How your data is kept and how to ask us to delete it:',
      linkHint: 'If the button does not work, copy this link into your browser:',
      digestConfirm: {
        subject: 'Confirm your Muomalat digest subscription',
        lead: 'We received a request to subscribe this address to the Muomalat weekly digest.',
        action: 'Confirm subscription',
        expiry: 'The link works for 7 days. If you do not confirm, the address is deleted after 7 days.',
      },
      received: {
        club: {
          subject: 'Your Muomalat club application has been received',
          lead: 'We have received your application to the Muomalat club. The commercial team will contact you by phone or email.',
        },
        contact: {
          subject: 'Your message has reached the Muomalat newsroom',
          lead: 'We have received the message you sent through the contact form. If a reply is needed, we will write to this address.',
        },
        advertising: {
          subject: 'Your advertising enquiry has been received',
          lead: 'We have received your advertising enquiry. The commercial team will contact you.',
        },
      },
      rightsVerify: {
        subject: 'Confirm your request about your data',
        lead: (kind: string) => `A request was sent on the Muomalat site in the name of this email address: “${kind}”.`,
        action: 'Confirm request',
        expiry: 'The link works for 48 hours. The request is registered only after you confirm it.',
      },
      rightsReceived: {
        subject: 'Your request has been registered',
        lead: (kind: string) => `We have registered your request: “${kind}”.`,
        next: 'We aim to deal with it within 10 working days and will write to this address with the result.',
      },
    },
    pages: {
      privacy: {
        metaTitle: 'Privacy and personal data',
        metaDescription:
          'What the Muomalat forms collect, where and for how long it is kept, and how to ask us to delete your data or stop processing it.',
        kicker: 'Privacy',
        title: 'Personal data',
        lead: 'Muomalat keeps only the data you send us through its forms, and uses it only for the purposes on this page.',
        who: 'Who processes the data and where it is kept',
        forms: 'What we keep from the forms',
        rights: 'Your rights',
        data: 'Data',
        purpose: 'Purpose',
        retention: 'Kept for',
        version: 'Consent text version',
        officerPending: 'The name of the person responsible will be published',
      },
      rightsForm: {
        title: 'Request about your data',
        intro: 'Enter your email address and the type of request. We will send a confirmation link to that address: the request is accepted only after you use it.',
        email: 'Email',
        kindLabel: 'Type of request',
        kindPrompt: 'Choose',
        submit: 'Send request',
        success: 'Thank you! We have sent you a link to confirm the request.',
        choose: 'Choose the type of request.',
        note: 'Enter the address you used in our forms: we look up your data by it.',
      },
      rightsConfirm: {
        metaTitle: 'Confirm your request',
        title: 'Confirm your request',
        lead: (kind: string, email: string) => `The request “${kind}” will be registered for ${email}.`,
        button: 'Confirm',
        done: 'Your request has been registered. We will email you the result.',
        already: 'This request has already been registered.',
        invalid: 'The link is wrong or has expired. Send the request again from the privacy page.',
      },
      digestConfirm: {
        metaTitle: 'Confirm subscription',
        title: 'Confirm your subscription',
        lead: 'Press the button to confirm your subscription to the weekly digest.',
        button: 'Confirm subscription',
        done: 'Subscription confirmed. The digest arrives every Friday at 18:00.',
        invalid: 'The link is wrong, has expired or has already been used. To subscribe, fill in the form again.',
      },
      unsubscribe: {
        metaTitle: 'Unsubscribe',
        title: 'Unsubscribe from the digest',
        lead: 'Press the button to stop receiving the weekly digest.',
        button: 'Unsubscribe',
        done: 'You have been unsubscribed. We will not send you the digest again.',
        invalid: 'The link is wrong. Copy the whole link from the email, or write to the newsroom.',
      },
      common: {
        sending: 'Sending…',
        busy: 'We could not complete the request just now. Please try again a little later.',
        privacyLink: 'Privacy and personal data',
        digestLink: 'Digest page',
      },
    },
  },
})

/** The privacy texts for a site edition (kr is transliterated from uz). */
export const privacyText = (locale: Locale) => pick(privacyMessages, locale)

export type PrivacyMessages = ReturnType<typeof privacyText>

/** Plain text for e-mail and metadata: drops the {en:…} markers, keeps the words. */
export const plain = (text: string) => text.replace(/\{en:([^}]+)\}/g, '$1')
