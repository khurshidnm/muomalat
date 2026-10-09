import { defineMessages } from '../messages'

/**
 * /biz-haqimizda: mission, scope (what we do / don't), the name, editorial
 * policy (#tahririyat-siyosati), corrections (#tuzatishlar), team and imprint.
 * Lists that the page iterates in a fixed order are keyed objects.
 */
const uz = {
  metaTitle: 'Biz haqimizda',
  metaDescription:
    'Muomalat — Oʻzbekistonda islom moliyasiga ixtisoslashgan birinchi moliyaviy-biznes nashri. Missiya, tahririyat siyosati, tuzatishlar tartibi, jamoa va nashr maʼlumotlari.',
  kicker: 'Nashr haqida',
  title: 'Biz haqimizda',
  standfirst:
    'Muomalat — Oʻzbekistonda islom moliyasiga ixtisoslashgan birinchi nashr. Biz moliya va biznes haqida yozamiz: bozor, regulyatsiya, litsenziyalar, mahsulotlar, bitimlar va odamlar haqidagi faktlarni xabar qilamiz.',
  facts: {
    label: 'Muomalat qisqacha',
    type: 'Nashr turi',
    typeValue: 'Moliyaviy-iqtisodiy internet nashri',
    beat: 'Mavzu',
    beatValue: 'Islom moliyasi bozori, biznes va regulyatsiya',
    founded: 'Asos solingan',
    foundedValue: (year: number) => `${year}-yil`,
    editions: 'Nashr tillari',
    editionsValue: 'Oʻzbekcha — lotin va kirill yozuvida; interfeys rus va ingliz tillarida ham bor',
    telegram: 'Telegram kanal',
  },
  toc: 'Ushbu sahifada',
  mission: {
    title: 'Missiyamiz',
    short: 'Missiya',
    lead: 'Islom moliyasi Oʻzbekistonda endigina shakllanayotgan bozor. Tadbirkor, bankir va mijozga bu bozor haqida aniq, tekshirilgan va tushunarli maʼlumot kerak — Muomalat aynan shuni beradi.',
    paragraphs: [
      'Biz bu bozorni boshqa har qanday moliya sohasi kabi yoritamiz: hujjatlarni oʻqiymiz, raqamlarni tekshiramiz, bozor ishtirokchilari, regulyator va mustaqil ekspertlar bilan gaplashamiz, mahsulotlar shartlarini taqqoslaymiz.',
      'Islom moliyasini iqtisodiy hodisa sifatida koʻrib chiqamiz: shartnoma tuzilmasi, narx, tavakkal, soliq va qonunchilik nuqtai nazaridan. Muomalat diniy nashr emas va diniy masalalarda fikr bildirmaydi.',
    ],
    beatTitle: 'Nimalarni yoritamiz',
    beat: {
      market: { title: 'Bozor', text: 'Aktivlar, ulushlar, oʻsish surʼati va bozor ishtirokchilarining moliyaviy natijalari.' },
      regulation: { title: 'Regulyatsiya', text: 'Qonunlar, regulyator qarorlari, standartlar va ularning bozorga taʼsiri.' },
      licences: { title: 'Litsenziyalar', text: 'Kim ariza topshirdi, kim ruxsat oldi va qaysi arizalar hali koʻrib chiqilmoqda.' },
      products: { title: 'Mahsulotlar', text: 'Murobaha, ijora, takaful va boshqa mahsulotlarning shartlari, narxi va tavakkallari.' },
      deals: { title: 'Bitimlar', text: 'Moliyalash bitimlari, sukuk chiqarilishi, hamkorliklar va investitsiyalar.' },
      people: { title: 'Odamlar', text: 'Tayinlovlar, intervyular, kadrlar bozori va sohani shakllantirayotgan mutaxassislar.' },
    },
    audienceTitle: 'Kimlar uchun yozamiz',
    audience: [
      'Moliyalash izlayotgan tadbirkorlar va kompaniya rahbarlari',
      'Bank, lizing, mikromoliya va sugʻurta tashkilotlari xodimlari',
      'Yuristlar, auditorlar va moliyaviy maslahatchilar',
      'Investorlar, tahlilchilar va xalqaro hamkorlar',
      'Sohani oʻrganayotgan talaba va oʻqituvchilar',
    ],
  },
  scope: {
    title: 'Biz nima qilamiz va nima qilmaymiz',
    short: 'Nima qilamiz',
    lead: 'Muomalat — moliyaviy-biznes nashri, diniy tashkilot emas. Bu chegara har bir materialimizda saqlanadi.',
    doTitle: 'Qilamiz',
    do: [
      'Faktlarni xabar qilamiz va har birining manbasini koʻrsatamiz',
      'Hujjatlar, statistika va moliyaviy hisobotlarni tahlil qilamiz',
      'Mahsulot shartlarini — narx, muddat, toʻlov va tavakkalni — tushuntiramiz va taqqoslaymiz',
      'Shariat kengashlarining eʼlon qilingan xulosalarini kimga tegishli ekanini koʻrsatib xabar qilamiz',
      'Bozor ishtirokchilari, regulyator va ekspertlarning turli nuqtai nazarlarini beramiz',
    ],
    dontTitle: 'Qilmaymiz',
    dont: [
      'Fatvo yoki boshqa diniy hukm chiqarmaymiz',
      'Mahsulot yoki bitimning shariatga muvofiqligi haqida oʻz xulosamizni bermaymiz',
      'Bank, mahsulot yoki investitsiyani tavsiya qilmaymiz',
      'Moliyaviy, yuridik yoki diniy maslahat bermaymiz',
      'Haq evaziga tahririyat materiallarini yozmaymiz va oʻzgartirmaymiz',
    ],
    boardTitle: 'Shariatga muvofiqlik haqidagi xulosa kimga tegishli?',
    boardText:
      'Moliya mahsulotining shariat talablariga muvofiqligi haqida xulosa berish — mahsulotni taklif qilayotgan tashkilot shariat kengashining vakolati va masʼuliyati. Biz bunday xulosalarni xabar qilganda, ular qaysi kengashga tegishli ekanini aniq yozamiz.',
    inGlossary: 'Lugʻatda',
  },
  name: {
    title: 'Nega «Muomalat»?',
    short: 'Nom haqida',
    lead: 'Nashr nomi uning mavzusini bildiradi.',
    syllables: 'Boʻgʻinlar',
    pos: 'ot',
    entries: {
      uzbek: {
        label: 'Oʻzbek tilida',
        senses: [
          'kishilar oʻrtasidagi munosabat, oʻzaro aloqa',
          'oldi-berdi, savdo-sotiq, bitim',
          'pul va qimmatli qogʻozlarning aylanishi',
        ],
        examples: ['pul muomalasi', 'muomalaga chiqarish'],
      },
      origin: {
        label: 'Kelib chiqishi',
        text: 'arab tilidan; odamlar oʻrtasidagi shartnomalar, savdo va moliyaviy munosabatlar sohasini anglatadi.',
      },
      spelling: {
        label: 'Imlosi',
        text: '«o» harfi bilan — oʻzbek lotin imlosiga va lugʻatdagi «muomala» shakliga muvofiq. Xalqaro transliteratsiyada bu soʻz odatda «muamalat» deb yoziladi.',
      },
    },
    compareOurs: 'Oʻzbek imlosi',
    compareIntl: 'Xalqaro transliteratsiya',
    meaningTitle: 'Nom nimani anglatadi',
    meaning:
      'Muomalat — bitimlar va shartnomalar, pul aylanishi va moliyaviy munosabatlar haqidagi nashr. Boshqacha aytganda, biznes haqida.',
  },
  policy: {
    title: 'Tahririyat siyosati',
    short: 'Tahririyat siyosati',
    lead: 'Quyidagi qoidalar Muomalatda eʼlon qilinadigan barcha materiallarga — xabar, tahlil, intervyu va izohlarga — tegishli. Ularga rioya etilishi uchun bosh muharrir javobgar.',
    accuracy: {
      title: 'Aniqlik va manbalar',
      text: [
        'Har bir faktni tekshiramiz. Raqamlar, sanalar va iqtiboslarni birlamchi manba — hujjat, hisobot, rasmiy bayonot yoki suhbat yozuvi — bilan solishtiramiz.',
        'Har bir material oxirida «Manbalar» roʻyxati bor. Unda biz foydalangan hujjatlar, hisobotlar va suhbatlar sanasi bilan koʻrsatiladi; ochiq hujjatlarga havola beriladi.',
        'Fakt va fikrni ajratamiz. Baho va prognozlar kimga tegishli ekani har doim koʻrsatiladi.',
      ],
    },
    independence: {
      title: 'Mustaqillik',
      text: [
        'Tahririyat qarorlarini faqat tahririyat qabul qiladi. Reklama beruvchilar, hamkorlar va bozor ishtirokchilari mavzu tanlash, matn va sarlavhalarga taʼsir oʻtkaza olmaydi.',
        'Materiallarni eʼlon qilishdan oldin ularning qahramonlariga koʻrsatmaymiz. Iqtibos va raqamlarning aniqligini tekshirish uchungina ularga qayta murojaat qilishimiz mumkin.',
      ],
    },
    commercial: {
      title: 'Tijorat materiallari',
      intro: 'Tahririyat va tijorat materiallari bir-biridan aniq ajratiladi. Saytda uch xil belgi ishlatiladi:',
      editorialLabel: 'Tahlil',
      editorial: 'Tahririyat materiali. Rubrika nomi yashil harflar bilan, fonsiz yoziladi. Uni jurnalistlarimiz tayyorlaydi.',
      sponsored:
        'Hamkor buyurtmasi bilan tayyorlangan material. Uni tijorat boʻlimi yozadi; tahririyat jamoasi uni yozish va tahrir qilishda ishtirok etmaydi. Sahifada hamkor kimligi koʻrsatiladi.',
      advert: 'Reklama beruvchining eʼloni. Kulrang shtrixli maydonda chiqadi va tahririyat bloklariga oʻxshatilmaydi.',
      after: 'Tijorat materiallari «Koʻp oʻqilgan» roʻyxatiga va haftalik dayjestning tahririyat qismiga kiritilmaydi.',
      authorLink: 'Hamkorlik materiallari',
      advertiseLink: 'Reklama va hamkorlik shartlari',
    },
    conflicts: {
      title: 'Manfaatlar toʻqnashuvi',
      text: [
        'Jurnalistlarimiz oʻzlari yoritadigan tashkilotlardan sovgʻa, haq yoki imtiyoz qabul qilmaydi va bu tashkilotlarning qimmatli qogʻozlari bilan savdo qilmaydi.',
        'Muallifning material qahramoni bilan shaxsiy yoki moliyaviy aloqasi boʻlsa, mavzu boshqa jurnalistga beriladi. Buning iloji boʻlmasa, aloqa matnda ochiq koʻrsatiladi.',
        'Muomalat klubi tadbirlari va tijorat loyihalari tahririyat materiallarining mazmuniga taʼsir qilmaydi.',
      ],
    },
    anonymity: {
      title: 'Nomi oshkor etilmagan manbalar',
      text: [
        'Manbalarni ism-sharifi va lavozimi bilan keltiramiz. Nomi oshkor etilmagan manbadan faqat maʼlumot muhim boʻlsa va uni boshqa yoʻl bilan tasdiqlab boʻlmasa foydalanamiz.',
        'Bunday manbaning kimligini kamida bitta muharrir biladi. Matnda manba nega nomini oshkor etmagani va maʼlumotdan qanday xabardor ekani tushuntiriladi.',
        'Nomi oshkor etilmagan manbalarning boshqa shaxslar haqidagi baholari va ayblovlarini eʼlon qilmaymiz.',
      ],
    },
    estimates: {
      title: 'Taxminlar va toʻldiriladigan maʼlumotlar',
      text: [
        'Rasmiy statistika boʻlmagan hollarda oʻz hisob-kitoblarimizni beramiz. Bunday raqamlar «taxmin» yoki «hisob-kitoblarga koʻra» deb belgilanadi, usul va dastlabki maʼlumotlar koʻrsatiladi.',
        'Soʻrovnoma natijalari ishtirokchilar soni va oʻtkazilgan sanasi bilan beriladi. Bunday natijalar butun bozorni aks ettirmasligi alohida qayd etiladi.',
      ],
      placeholderText:
        'Sayt sinov rejimida ishlamoqda. Hali tasdiqlanmagan maʼlumotlar — nashr rekvizitlari, kontaktlar, obunachilar soni — shunday ramkada koʻrsatiladi:',
      placeholderSample: 'toʻldiriladi',
    },
  },
  corrections: {
    title: 'Tuzatishlar',
    short: 'Tuzatishlar',
    lead: 'Xato qilsak, uni ochiq tan olamiz va tezda tuzatamiz.',
    text: [
      'Faktik xato aniqlansa, matn tuzatiladi va material oxiriga sanasi koʻrsatilgan «Tuzatish» eslatmasi qoʻshiladi: unda nima notoʻgʻri boʻlgani va toʻgʻri maʼlumot yoziladi. Sarlavha ostida esa tuzatish kiritilgani haqida belgi paydo boʻladi.',
      'Xatolarni izsiz oʻchirmaymiz. Imlo va uslubga oid mayda tuzatishlar eslatmasiz kiritiladi.',
      'Agar xato muhim boʻlsa va material Telegram kanalida eʼlon qilingan boʻlsa, tuzatish kanalda ham eʼlon qilinadi.',
    ],
    sampleTitle: 'Eslatma qanday koʻrinadi',
    sampleFrom: 'Material',
    reportTitle: 'Xatoni qanday xabar qilish mumkin',
    steps: [
      'Material havolasini yuboring',
      'Qaysi jumla yoki raqam notoʻgʻri ekanini yozing',
      'Iloji boʻlsa, toʻgʻri maʼlumot manbasini ilova qiling',
    ],
    reportText:
      'Xabarni «Aloqa» sahifasidagi forma orqali yuboring. Har bir murojaatni muharrir koʻrib chiqadi; tuzatish kiritilsa ham, kiritilmasa ham, javob beramiz.',
    cta: 'Xato haqida xabar berish',
  },
  team: {
    title: 'Jamoa',
    short: 'Jamoa',
    lead: 'Har bir material muallif imzosi bilan chiqadi. Muallif sahifasida uning barcha materiallari jamlangan.',
    editorInChief: 'Bosh muharrir',
    editorNote: 'Tahririyat siyosatiga rioya etilishi va tuzatishlar uchun javobgar.',
    authors: 'Mualliflar',
    stories: (n: number) => `${n} ta material`,
    bylines: 'Jamoaviy imzolar',
    bylinesText: 'Muallifi koʻrsatilmagan materiallar «Muomalat tahririyati», tijorat materiallari esa «Hamkorlik loyihalari» imzosi bilan chiqadi.',
  },
  legal: {
    title: 'Nashr maʼlumotlari va aloqa',
    short: 'Nashr maʼlumotlari',
    lead: 'Muomalat ommaviy axborot vositasi sifatida roʻyxatdan oʻtkaziladi. Rekvizitlar roʻyxatdan oʻtish hujjatlari asosida toʻldiriladi.',
    contacts: 'Bogʻlanish',
    contact: 'Tahririyatga yozish',
    advertise: 'Reklama va hamkorlik',
  },
} as const

export const aboutMessages = defineMessages({
  uz,
  ru: {
    metaTitle: 'О нас',
    metaDescription:
      'Muomalat — первое в Узбекистане финансово-деловое издание, специализирующееся на исламских финансах. Миссия, редакционная политика, порядок исправлений, команда и выходные данные.',
    kicker: 'Об издании',
    title: 'О нас',
    standfirst:
      'Muomalat — первое в Узбекистане издание, специализирующееся на исламских финансах. Мы пишем о финансах и бизнесе: сообщаем факты о рынке, регулировании, лицензиях, продуктах, сделках и людях.',
    facts: {
      label: 'Коротко о Muomalat',
      type: 'Тип издания',
      typeValue: 'Финансово-экономическое интернет-издание',
      beat: 'Тема',
      beatValue: 'Рынок исламских финансов, бизнес и регулирование',
      founded: 'Основано',
      foundedValue: (year: number) => `в ${year} году`,
      editions: 'Языки',
      editionsValue: 'Узбекский — латиницей и кириллицей; интерфейс также на русском и английском',
      telegram: 'Telegram-канал',
    },
    toc: 'На этой странице',
    mission: {
      title: 'Наша миссия',
      short: 'Миссия',
      lead: 'Исламские финансы в Узбекистане — рынок, который только складывается. Предпринимателям, банкирам и клиентам нужна о нём точная, проверенная и понятная информация — именно её даёт Muomalat.',
      paragraphs: [
        'Мы освещаем этот рынок так же, как любую другую финансовую отрасль: читаем документы, проверяем цифры, говорим с участниками рынка, регулятором и независимыми экспертами, сравниваем условия продуктов.',
        'Мы рассматриваем исламские финансы как экономическое явление — с точки зрения структуры договора, цены, рисков, налогов и законодательства. Muomalat — не религиозное издание и не высказывается по религиозным вопросам.',
      ],
      beatTitle: 'Что мы освещаем',
      beat: {
        market: { title: 'Рынок', text: 'Активы, доли, темпы роста и финансовые результаты участников рынка.' },
        regulation: { title: 'Регулирование', text: 'Законы, решения регулятора, стандарты и их влияние на рынок.' },
        licences: { title: 'Лицензии', text: 'Кто подал заявку, кто получил разрешение и какие заявки ещё рассматриваются.' },
        products: { title: 'Продукты', text: 'Условия, цена и риски мурабахи, иджары, такафула и других продуктов.' },
        deals: { title: 'Сделки', text: 'Сделки по финансированию, выпуски сукук, партнёрства и инвестиции.' },
        people: { title: 'Люди', text: 'Назначения, интервью, рынок кадров и специалисты, которые формируют отрасль.' },
      },
      audienceTitle: 'Для кого мы пишем',
      audience: [
        'Предприниматели и руководители компаний, которым нужно финансирование',
        'Сотрудники банков, лизинговых, микрофинансовых и страховых компаний',
        'Юристы, аудиторы и финансовые консультанты',
        'Инвесторы, аналитики и международные партнёры',
        'Студенты и преподаватели, изучающие отрасль',
      ],
    },
    scope: {
      title: 'Что мы делаем и чего не делаем',
      short: 'Что мы делаем',
      lead: 'Muomalat — финансово-деловое издание, а не религиозная организация. Эта граница соблюдается в каждом нашем материале.',
      doTitle: 'Делаем',
      do: [
        'Сообщаем факты и указываем источник каждого из них',
        'Анализируем документы, статистику и финансовую отчётность',
        'Объясняем и сравниваем условия продуктов — цену, срок, платежи и риски',
        'Сообщаем об опубликованных заключениях шариатских советов, указывая, кому они принадлежат',
        'Приводим разные точки зрения участников рынка, регулятора и экспертов',
      ],
      dontTitle: 'Не делаем',
      dont: [
        'Не выносим фетв и других религиозных суждений',
        'Не даём собственных оценок того, соответствует ли продукт или сделка нормам шариата',
        'Не рекомендуем банки, продукты или инвестиции',
        'Не даём финансовых, юридических или религиозных консультаций',
        'Не пишем и не меняем редакционные материалы за плату',
      ],
      boardTitle: 'Кому принадлежит заключение о соответствии шариату?',
      boardText:
        'Заключение о том, соответствует ли финансовый продукт требованиям шариата, — компетенция и ответственность шариатского совета организации, которая предлагает продукт. Сообщая о таких заключениях, мы прямо указываем, какому совету они принадлежат.',
      inGlossary: 'В словаре',
    },
    name: {
      title: 'Почему «Muomalat»?',
      short: 'О названии',
      lead: 'Название издания говорит о его теме.',
      syllables: 'Слоги',
      pos: 'сущ.',
      entries: {
        uzbek: {
          label: 'В узбекском языке',
          senses: ['отношения, общение между людьми', 'торговые операции, сделки, купля-продажа', 'обращение денег и ценных бумаг'],
          examples: ['pul muomalasi — денежное обращение', 'muomalaga chiqarish — выпуск в обращение'],
        },
        origin: {
          label: 'Происхождение',
          text: 'из арабского; обозначает сферу договоров, торговли и финансовых отношений между людьми.',
        },
        spelling: {
          label: 'Написание',
          text: 'Через «o» — по правилам узбекской латиницы и как в словарной форме «muomala». В международной транслитерации слово обычно пишут как «muamalat».',
        },
      },
      compareOurs: 'Узбекская орфография',
      compareIntl: 'Международная транслитерация',
      meaningTitle: 'Что означает название',
      meaning:
        'Muomalat — издание о сделках и договорах, обращении денег и финансовых отношениях. Иначе говоря, о бизнесе.',
    },
    policy: {
      title: 'Редакционная политика',
      short: 'Редакционная политика',
      lead: 'Эти правила распространяются на все материалы Muomalat — новости, аналитику, интервью и разъяснения. За их соблюдение отвечает главный редактор.',
      accuracy: {
        title: 'Точность и источники',
        text: [
          'Мы проверяем каждый факт. Цифры, даты и цитаты сверяем с первоисточником — документом, отчётом, официальным заявлением или записью беседы.',
          'В конце каждого материала есть список «Источники»: в нём указаны использованные документы, отчёты и беседы с датами; на открытые документы даются ссылки.',
          'Мы отделяем факты от мнений. Всегда указано, кому принадлежат оценки и прогнозы.',
        ],
      },
      independence: {
        title: 'Независимость',
        text: [
          'Редакционные решения принимает только редакция. Рекламодатели, партнёры и участники рынка не влияют на выбор тем, тексты и заголовки.',
          'Мы не показываем материалы их героям до публикации. Повторно обратиться к ним мы можем только для проверки точности цитат и цифр.',
        ],
      },
      commercial: {
        title: 'Коммерческие материалы',
        intro: 'Редакционные и коммерческие материалы чётко разделены. На сайте используются три вида меток:',
        editorialLabel: 'Аналитика',
        editorial: 'Редакционный материал. Название рубрики набрано зелёным, без фона. Его готовят наши журналисты.',
        sponsored:
          'Материал, подготовленный по заказу партнёра. Его пишет коммерческий отдел; редакция не участвует в его написании и редактировании. На странице указано, кто партнёр.',
        advert: 'Объявление рекламодателя. Размещается в сером заштрихованном блоке и никогда не оформляется как редакционный материал.',
        after: 'Коммерческие материалы не попадают в список «Самое читаемое» и в редакционную часть еженедельного дайджеста.',
        authorLink: 'Партнёрские материалы',
        advertiseLink: 'Условия рекламы и партнёрства',
      },
      conflicts: {
        title: 'Конфликт интересов',
        text: [
          'Наши журналисты не принимают подарков, вознаграждений или льгот от организаций, о которых пишут, и не торгуют их ценными бумагами.',
          'Если у автора есть личная или финансовая связь с героем материала, тему передают другому журналисту. Если это невозможно, связь открыто указывается в тексте.',
          'Мероприятия клуба Muomalat и коммерческие проекты не влияют на содержание редакционных материалов.',
        ],
      },
      anonymity: {
        title: 'Анонимные источники',
        text: [
          'Мы называем источники по имени и должности. К анонимным источникам обращаемся, только если информация важна и её нельзя подтвердить иначе.',
          'Личность такого источника известна как минимум одному редактору. В тексте объясняется, почему источник не называет себя и откуда ему известна информация.',
          'Мы не публикуем оценки и обвинения анонимных источников в адрес других людей.',
        ],
      },
      estimates: {
        title: 'Оценки и данные, которые будут уточнены',
        text: [
          'Там, где нет официальной статистики, мы приводим собственные расчёты. Такие цифры помечены как «оценка» или «по расчётам», указаны метод и исходные данные.',
          'Результаты опросов приводятся с числом участников и датами проведения; отдельно оговаривается, что они не отражают весь рынок.',
        ],
        placeholderText:
          'Сайт работает в тестовом режиме. Ещё не подтверждённые сведения — выходные данные, контакты, число подписчиков — показаны в такой рамке:',
        placeholderSample: 'будет заполнено',
      },
    },
    corrections: {
      title: 'Исправления',
      short: 'Исправления',
      lead: 'Если мы ошибаемся, то открыто признаём это и быстро исправляем.',
      text: [
        'Если обнаружена фактическая ошибка, текст исправляется, а в конце материала появляется датированная пометка «Исправление»: что было неверно и какова верная информация. Под заголовком появляется отметка о том, что в материал внесено исправление.',
        'Мы не удаляем ошибки бесследно. Мелкие орфографические и стилистические правки вносятся без пометки.',
        'Если ошибка существенна, а материал публиковался в Telegram-канале, исправление публикуется и в канале.',
      ],
      sampleTitle: 'Как выглядит пометка',
      sampleFrom: 'Материал',
      reportTitle: 'Как сообщить об ошибке',
      steps: [
        'Пришлите ссылку на материал',
        'Укажите, какое предложение или какая цифра неверны',
        'По возможности приложите источник верной информации',
      ],
      reportText:
        'Напишите нам через форму на странице «Контакты». Каждое обращение рассматривает редактор; мы ответим, будет исправление внесено или нет.',
      cta: 'Сообщить об ошибке',
    },
    team: {
      title: 'Команда',
      short: 'Команда',
      lead: 'Каждый материал выходит с подписью автора. На странице автора собраны все его материалы.',
      editorInChief: 'Главный редактор',
      editorNote: 'Отвечает за соблюдение редакционной политики и за исправления.',
      authors: 'Авторы',
      stories: (n: number) => `Материалов: ${n}`,
      bylines: 'Коллективные подписи',
      bylinesText: 'Материалы без указания автора выходят под подписью «Редакция Muomalat», коммерческие — под подписью «Партнёрские проекты».',
    },
    legal: {
      title: 'Выходные данные и контакты',
      short: 'Выходные данные',
      lead: 'Muomalat регистрируется как средство массовой информации. Реквизиты будут заполнены на основании регистрационных документов.',
      contacts: 'Связаться с нами',
      contact: 'Написать в редакцию',
      advertise: 'Реклама и партнёрство',
    },
  },
  en: {
    metaTitle: 'About us',
    metaDescription:
      'Muomalat is Uzbekistan’s first financial and business publication dedicated to Islamic finance. Our mission, editorial policy, corrections policy, team and publisher details.',
    kicker: 'About the publication',
    title: 'About us',
    standfirst:
      'Muomalat is the first publication in Uzbekistan dedicated to Islamic finance. We are a finance and business newsroom: we report the facts on the market, regulation, licences, products, deals and people.',
    facts: {
      label: 'Muomalat at a glance',
      type: 'Type',
      typeValue: 'Online financial and business publication',
      beat: 'Beat',
      beatValue: 'The Islamic finance market, business and regulation',
      founded: 'Founded',
      foundedValue: (year: number) => `${year}`,
      editions: 'Languages',
      editionsValue: 'Uzbek, in Latin and Cyrillic script; the interface is also in Russian and English',
      telegram: 'Telegram channel',
    },
    toc: 'On this page',
    mission: {
      title: 'Our mission',
      short: 'Mission',
      lead: 'Islamic finance in Uzbekistan is a market still taking shape. Entrepreneurs, bankers and customers need accurate, verified and clear information about it — and that is what Muomalat provides.',
      paragraphs: [
        'We cover this market the way we would cover any other part of finance: we read the documents, check the numbers, talk to market participants, the regulator and independent experts, and compare product terms.',
        'We treat Islamic finance as an economic subject: in terms of contract structure, price, risk, tax and law. Muomalat is not a religious publication and does not comment on religious questions.',
      ],
      beatTitle: 'What we cover',
      beat: {
        market: { title: 'The market', text: 'Assets, market shares, growth and the financial results of market participants.' },
        regulation: { title: 'Regulation', text: 'Laws, regulator decisions, standards and their effect on the market.' },
        licences: { title: 'Licences', text: 'Who has applied, who has been licensed and which applications are still under review.' },
        products: { title: 'Products', text: 'The terms, pricing and risks of murabaha, ijara, takaful and other products.' },
        deals: { title: 'Deals', text: 'Financing deals, sukuk issues, partnerships and investments.' },
        people: { title: 'People', text: 'Appointments, interviews, the jobs market and the specialists shaping the industry.' },
      },
      audienceTitle: 'Who we write for',
      audience: [
        'Entrepreneurs and executives looking for financing',
        'Staff of banks, leasing, microfinance and insurance companies',
        'Lawyers, auditors and financial advisers',
        'Investors, analysts and international partners',
        'Students and teachers of the subject',
      ],
    },
    scope: {
      title: 'What we do — and what we don’t',
      short: 'What we do',
      lead: 'Muomalat is a financial and business publication, not a religious organisation. Every story we publish keeps to that line.',
      doTitle: 'We do',
      do: [
        'Report facts and name the source of each one',
        'Analyse documents, statistics and financial statements',
        'Explain and compare product terms: price, tenor, payments and risk',
        'Report the published opinions of Sharia boards, stating whose opinion each one is',
        'Give the different views of market participants, the regulator and experts',
      ],
      dontTitle: 'We don’t',
      dont: [
        'Issue fatwas or any other religious rulings',
        'Give our own view on whether a product or deal complies with Sharia',
        'Recommend banks, products or investments',
        'Give financial, legal or religious advice',
        'Write or change editorial content for payment',
      ],
      boardTitle: 'Whose call is Sharia compliance?',
      boardText:
        'Whether a financial product meets Sharia requirements is for the Sharia board of the institution offering it to decide: it is that board’s authority and responsibility. When we report such opinions, we say clearly which board issued them.',
      inGlossary: 'In the glossary',
    },
    name: {
      title: 'Why “Muomalat”?',
      short: 'The name',
      lead: 'The name of the publication is its beat.',
      syllables: 'Syllables',
      pos: 'n.',
      entries: {
        uzbek: {
          label: 'In Uzbek',
          senses: ['dealings between people', 'trade, transactions, buying and selling', 'the circulation of money and securities'],
          examples: ['pul muomalasi — money circulation', 'muomalaga chiqarish — to put into circulation'],
        },
        origin: {
          label: 'Origin',
          text: 'from Arabic; the sphere of contracts, trade and financial relations between people.',
        },
        spelling: {
          label: 'Spelling',
          text: 'With an “o”, following Uzbek Latin orthography and the dictionary form “muomala”. International transliteration usually spells the word “muamalat”.',
        },
      },
      compareOurs: 'Uzbek spelling',
      compareIntl: 'International transliteration',
      meaningTitle: 'What the name stands for',
      meaning:
        'Muomalat is about transactions and contracts, the circulation of money and financial relations. In other words, it is about business.',
    },
    policy: {
      title: 'Editorial policy',
      short: 'Editorial policy',
      lead: 'These rules apply to everything Muomalat publishes: news, analysis, interviews and explainers. The editor-in-chief is responsible for upholding them.',
      accuracy: {
        title: 'Accuracy and sourcing',
        text: [
          'We check every fact. Figures, dates and quotes are verified against the primary source: a document, a report, an official statement or a recording of an interview.',
          'Every story ends with a “Sources” list (“Manbalar” in Uzbek) naming the documents, reports and interviews we used, with dates; public documents are linked.',
          'We keep fact and opinion apart. Assessments and forecasts are always attributed.',
        ],
      },
      independence: {
        title: 'Independence',
        text: [
          'Editorial decisions are made by the newsroom alone. Advertisers, partners and market participants have no say in what we cover, what we write or how we headline it.',
          'We do not show stories to their subjects before publication. We may contact them again only to check the accuracy of quotes and figures.',
        ],
      },
      commercial: {
        title: 'Commercial content',
        intro: 'Editorial and commercial content are clearly separated. The site uses three kinds of label:',
        editorialLabel: 'Analysis',
        editorial: 'Editorial content. The section name is set in green, with no background. It is produced by our journalists.',
        sponsored:
          'Content produced at a partner’s request. It is written by the commercial team; the newsroom takes no part in writing or editing it. The page names the partner.',
        advert: 'An advertiser’s message. It appears in a grey hatched box and is never styled like editorial content.',
        after: 'Commercial content is excluded from the “Most read” list and from the editorial part of the weekly digest.',
        authorLink: 'Partner content',
        advertiseLink: 'Advertising and partnership terms',
      },
      conflicts: {
        title: 'Conflicts of interest',
        text: [
          'Our journalists do not accept gifts, fees or favours from organisations they cover, and do not trade in those organisations’ securities.',
          'If an author has a personal or financial link to the subject of a story, the story goes to another journalist. Where that is not possible, the link is disclosed in the text.',
          'Muomalat club events and commercial projects have no influence on the content of editorial stories.',
        ],
      },
      anonymity: {
        title: 'Anonymous sources',
        text: [
          'We name our sources and their positions. We use anonymous sources only when the information matters and cannot be confirmed another way.',
          'At least one editor knows the identity of such a source. The story explains why the source is not named and how they know what they say.',
          'We do not publish anonymous sources’ opinions of, or accusations against, other people.',
        ],
      },
      estimates: {
        title: 'Estimates and details to be confirmed',
        text: [
          'Where there are no official statistics, we publish our own calculations. Such figures are marked as an “estimate” or “by our calculations”, with the method and the underlying data.',
          'Survey results are given with the number of respondents and the fieldwork dates, and we note that they do not represent the whole market.',
        ],
        placeholderText:
          'This site is in preview. Details not yet confirmed, such as the imprint, contacts and subscriber numbers, are shown in a frame like this:',
        placeholderSample: 'to be filled',
      },
    },
    corrections: {
      title: 'Corrections',
      short: 'Corrections',
      lead: 'When we get something wrong, we say so openly and fix it quickly.',
      text: [
        'When a factual error is found, the text is corrected and a dated “Correction” note (“Tuzatish” in Uzbek) is added at the end of the story, stating what was wrong and what is right. A flag under the headline shows that the story has been corrected.',
        'We do not remove errors without trace. Minor spelling and style fixes are made without a note.',
        'If an error is significant and the story was posted on our Telegram channel, the correction is posted there too.',
      ],
      sampleTitle: 'What a correction note looks like',
      sampleFrom: 'Story',
      reportTitle: 'How to report an error',
      steps: [
        'Send us the link to the story',
        'Tell us which sentence or figure is wrong',
        'If you can, include the source of the correct information',
      ],
      reportText:
        'Write to us through the form on the contact page. An editor reviews every message, and we will reply whether or not we make a correction.',
      cta: 'Report an error',
    },
    team: {
      title: 'Our team',
      short: 'Team',
      lead: 'Every story carries its author’s byline. Each author’s page collects all of their stories.',
      editorInChief: 'Editor-in-chief',
      editorNote: 'Responsible for upholding the editorial policy and for corrections.',
      authors: 'Authors',
      stories: (n: number) => `${n} ${n === 1 ? 'story' : 'stories'}`,
      bylines: 'Shared bylines',
      bylinesText: 'Stories without a named author run under the “Muomalat newsroom” byline; commercial content runs under “Partner projects”.',
    },
    legal: {
      title: 'Publisher details and contacts',
      short: 'Publisher details',
      lead: 'Muomalat is being registered as a mass media outlet. These details will be filled in from the registration documents.',
      contacts: 'Get in touch',
      contact: 'Write to the newsroom',
      advertise: 'Advertising and partnerships',
    },
  },
  kr: {
    name: {
      entries: {
        spelling: {
          // The forms discussed are Latin spellings: keep them in Latin in the Cyrillic edition.
          text: '«o» ҳарфи билан — ўзбек лотин имлосига ва луғатдаги «muomala» шаклига мувофиқ. Халқаро транслитерацияда бу сўз одатда «muamalat» деб ёзилади.',
        },
      },
    },
  },
})
