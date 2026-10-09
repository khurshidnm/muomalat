import { defineMessages } from '../messages'

/** Russian plural form for n: one (1, 21), few (2–4, 22–24), many (5–20, 25…). */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const uz = {
  meta: {
    indexTitle: 'Lugʻat: islom moliyasi atamalari',
    indexDescription:
      'Islom moliyasi atamalarining izohli lugʻati: shartnomalar, tamoyillar, institutlar, bozor vositalari va standartlar — taʼrif, kelib chiqishi, amaliyot va raqamli misollar bilan.',
    termTitle: (term: string) => `${term} — atama taʼrifi va misol`,
    setName: 'Muomalat lugʻati: islom moliyasi atamalari',
  },
  index: {
    title: 'Lugʻat',
    intro:
      'Islom moliyasi atamalari oddiy tilda: shartnomalar, tamoyillar, institutlar, bozor vositalari va xalqaro standartlar. Har bir atama — taʼrifi, kelib chiqishi, amaliyoti va raqamli misoli bilan.',
    note: 'Lugʻatdagi taʼriflar maʼlumot uchun: ular atamaning moliyaviy va huquqiy mazmunini tushuntiradi, diniy xulosa emas.',
    count: (n: number) => `${n} ta atama`,
    /** Per-letter count template for the client filter. */
    termsIn: '{0} ta',
  },
  categories: {
    shartnoma: {
      name: 'Shartnoma',
      plural: 'Shartnomalar',
      description: 'Savdo, ijara, sheriklik, qarz va kafolat bitimlarining turlari.',
    },
    tamoyil: {
      name: 'Tamoyil',
      plural: 'Tamoyillar',
      description: 'Shartnomalar qanday tuzilishini belgilaydigan asosiy qoidalar va cheklovlar.',
    },
    institut: {
      name: 'Institut',
      plural: 'Institutlar',
      description: 'Islom moliyasi xizmatlarini koʻrsatadigan va ularni nazorat qiladigan tuzilmalar.',
    },
    bozor: {
      name: 'Bozor',
      plural: 'Bozor',
      description: 'Qimmatli qogʻozlar, sugʻurta va investitsiya mahsulotlari.',
    },
    standart: {
      name: 'Standart',
      plural: 'Standartlar',
      description: 'Standartlar ishlab chiquvchi xalqaro tashkilotlar va ularning hujjatlari.',
    },
  },
  filter: {
    searchLabel: 'Lugʻatdan qidirish',
    searchPlaceholder: 'Masalan: ijora yoki lease',
    searchHint: 'Atama nomi, uning inglizcha yoki ruscha shakli boʻyicha',
    submit: 'Qidirish',
    clearQuery: 'Soʻrovni tozalash',
    categories: 'Turkum',
    all: 'Barchasi',
    alphabet: 'Alifbo boʻyicha koʻrsatkich',
    alphabetTitle: 'Alifbo',
    /** {0} shown, {1} total. Templates, not functions: they are passed to a client component. */
    shown: '{1} ta atamadan {0} tasi koʻrsatilmoqda',
    none: '«{0}» boʻyicha lugʻatda atama topilmadi.',
    noneCategory: 'Bu turkumda atama topilmadi.',
    siteSearch: '«{0}» soʻzini butun saytdan qidirish',
    reset: 'Filtrni tozalash',
  },
  aside: {
    aboutTitle: 'Lugʻat haqida',
    aboutText:
      'Lugʻatni Muomalat tahririyati tuzadi va yangi atamalar bilan toʻldirib boradi. Maqolalarda nuqtali chiziq bilan belgilangan soʻzlar shu lugʻatga olib keladi.',
    categoriesTitle: 'Turkumlar',
    suggest: 'Kerakli atamani topmadingizmi?',
    suggestLink: 'Tahririyatga yozing',
  },
  term: {
    aliases: 'Boshqa tillarda',
    langs: { en: 'Inglizcha', ru: 'Ruscha', ar: 'Arabcha transliteratsiya' },
    codes: { en: 'EN', ru: 'RU', ar: 'AR' },
    definition: 'Taʼrif',
    origin: 'Atamaning kelib chiqishi',
    practice: 'Amalda qanday ishlaydi',
    steps: 'Bosqichma-bosqich',
    example: 'Misol',
    exampleNote: 'Raqamlar shartli: ular hisob-kitob tartibini koʻrsatish uchun keltirilgan.',
    related: 'Bogʻliq atamalar',
    articles: 'Mavzuga oid maqolalar',
    moreArticles: (n: number) => `Yana ${n} ta maqola`,
    noArticles: 'Bu atama tilga olingan maqolalar hali eʼlon qilinmagan.',
    editorial:
      'Lugʻatdagi taʼriflar maʼlumot uchun beriladi. Mahsulotlarning shariatga muvofiqligi boʻyicha xulosalar har bir tashkilotning shariat kengashi vakolatiga kiradi.',
    nav: 'Lugʻat boʻylab',
    prev: 'Oldingi atama',
    next: 'Keyingi atama',
    all: 'Barcha atamalar',
    share: 'Atamani ulashish',
    onThisPage: 'Sahifa mazmuni',
    sameCategory: 'Shu turkumdagi atamalar',
  },
} as const

// Explicit type argument: with the kr override present, inference would widen
// the tree to MessageTree and lose the key types the pages rely on.
export const glossaryMessages = defineMessages<typeof uz>({
  uz,
  // Transliteration fix: the English example "lease" must stay in Latin.
  kr: {
    filter: { searchPlaceholder: 'Масалан: ижора ёки lease' },
  },
  ru: {
    meta: {
      indexTitle: 'Словарь исламских финансов',
      indexDescription:
        'Толковый словарь терминов исламских финансов на узбекском языке: договоры, принципы, институты, рынок и стандарты — с определениями, происхождением, практикой и примерами расчётов.',
      termTitle: (term: string) => `${term} — определение и пример`,
      setName: 'Словарь Muomalat: термины исламских финансов',
    },
    index: {
      title: 'Словарь',
      intro:
        'Термины исламских финансов простым языком: договоры, принципы, институты, рыночные инструменты и международные стандарты. Для каждого термина — определение, происхождение, практика и пример с цифрами.',
      note: 'Определения в словаре носят справочный характер: они объясняют финансовый и правовой смысл термина и не являются религиозным заключением.',
      count: (n: number) => `${n} ${ruPlural(n, 'термин', 'термина', 'терминов')}`,
      termsIn: '{0}',
    },
    categories: {
      shartnoma: {
        name: 'Договор',
        plural: 'Договоры',
        description: 'Виды сделок купли-продажи, аренды, партнёрства, займа и поручительства.',
      },
      tamoyil: {
        name: 'Принцип',
        plural: 'Принципы',
        description: 'Базовые правила и ограничения, которые определяют устройство договоров.',
      },
      institut: {
        name: 'Институт',
        plural: 'Институты',
        description: 'Структуры, которые оказывают услуги исламского финансирования и контролируют их.',
      },
      bozor: {
        name: 'Рынок',
        plural: 'Рынок',
        description: 'Ценные бумаги, страхование и инвестиционные продукты.',
      },
      standart: {
        name: 'Стандарт',
        plural: 'Стандарты',
        description: 'Международные организации, разрабатывающие стандарты, и их документы.',
      },
    },
    filter: {
      searchLabel: 'Поиск по словарю',
      searchPlaceholder: 'Например: иджара или lease',
      searchHint: 'По названию термина, его английскому или русскому варианту',
      submit: 'Найти',
      clearQuery: 'Очистить запрос',
      categories: 'Категория',
      all: 'Все',
      alphabet: 'Алфавитный указатель',
      alphabetTitle: 'Алфавит',
      shown: 'Показано {0} из {1}',
      none: 'По запросу «{0}» в словаре ничего не найдено.',
      noneCategory: 'В этой категории терминов нет.',
      siteSearch: 'Искать «{0}» по всему сайту',
      reset: 'Сбросить фильтр',
    },
    aside: {
      aboutTitle: 'О словаре',
      aboutText:
        'Словарь составляет редакция Muomalat и регулярно пополняет его новыми терминами. Слова, подчёркнутые в статьях пунктиром, ведут в этот словарь.',
      categoriesTitle: 'Категории',
      suggest: 'Не нашли нужный термин?',
      suggestLink: 'Напишите редакции',
    },
    term: {
      aliases: 'На других языках',
      langs: { en: 'Английский', ru: 'Русский', ar: 'Арабская транслитерация' },
      codes: { en: 'EN', ru: 'RU', ar: 'AR' },
      definition: 'Определение',
      origin: 'Происхождение термина',
      practice: 'Как это работает на практике',
      steps: 'По шагам',
      example: 'Пример',
      exampleNote: 'Цифры условные: они показывают порядок расчёта.',
      related: 'Связанные термины',
      articles: 'Материалы по теме',
      moreArticles: (n: number) => `Ещё ${n} ${ruPlural(n, 'материал', 'материала', 'материалов')}`,
      noArticles: 'Материалов, где упоминается этот термин, пока нет.',
      editorial:
        'Определения в словаре приводятся для справки. Заключения о соответствии продуктов нормам шариата входят в компетенцию шариатского совета каждой организации.',
      nav: 'Навигация по словарю',
      prev: 'Предыдущий термин',
      next: 'Следующий термин',
      all: 'Все термины',
      share: 'Поделиться термином',
      onThisPage: 'На этой странице',
      sameCategory: 'Другие термины категории',
    },
  },
  en: {
    meta: {
      indexTitle: 'Glossary of Islamic finance terms',
      indexDescription:
        'An explanatory glossary of Islamic finance terms in Uzbek: contracts, principles, institutions, markets and standards, with definitions, origins, practice and worked examples.',
      termTitle: (term: string) => `${term}: definition and example`,
      setName: 'Muomalat glossary of Islamic finance terms',
    },
    index: {
      title: 'Glossary',
      intro:
        'Islamic finance terms in plain language: contracts, principles, institutions, market instruments and international standards. Each entry comes with a definition, its origin, how it works in practice and a worked example.',
      note: 'Glossary definitions are for information: they explain the financial and legal meaning of a term and are not religious opinions.',
      count: (n: number) => `${n} ${n === 1 ? 'term' : 'terms'}`,
      termsIn: '{0}',
    },
    categories: {
      shartnoma: {
        name: 'Contract',
        plural: 'Contracts',
        description: 'Sale, lease, partnership, loan and guarantee structures.',
      },
      tamoyil: {
        name: 'Principle',
        plural: 'Principles',
        description: 'The core rules and restrictions that shape how contracts are built.',
      },
      institut: {
        name: 'Institution',
        plural: 'Institutions',
        description: 'Bodies that provide Islamic financial services and oversee them.',
      },
      bozor: {
        name: 'Market',
        plural: 'Markets',
        description: 'Securities, insurance and investment products.',
      },
      standart: {
        name: 'Standard',
        plural: 'Standards',
        description: 'International standard-setting organisations and their documents.',
      },
    },
    filter: {
      searchLabel: 'Search the glossary',
      searchPlaceholder: 'For example: ijara or lease',
      searchHint: 'By term, or by its English or Russian name',
      submit: 'Search',
      clearQuery: 'Clear search',
      categories: 'Category',
      all: 'All',
      alphabet: 'A–Z index',
      alphabetTitle: 'A–Z',
      shown: 'Showing {0} of {1}',
      none: 'No glossary terms match “{0}”.',
      noneCategory: 'No terms in this category.',
      siteSearch: 'Search the whole site for “{0}”',
      reset: 'Clear filters',
    },
    aside: {
      aboutTitle: 'About the glossary',
      aboutText:
        'The glossary is compiled by the Muomalat newsroom and grows with new terms. Words with a dotted underline in our stories link here.',
      categoriesTitle: 'Categories',
      suggest: 'Can’t find a term?',
      suggestLink: 'Write to the editors',
    },
    term: {
      aliases: 'In other languages',
      langs: { en: 'English', ru: 'Russian', ar: 'Arabic transliteration' },
      codes: { en: 'EN', ru: 'RU', ar: 'AR' },
      definition: 'Definition',
      origin: 'Origin of the term',
      practice: 'How it works in practice',
      steps: 'Step by step',
      example: 'Worked example',
      exampleNote: 'The figures are illustrative and show how the calculation works.',
      related: 'Related terms',
      articles: 'Related stories',
      moreArticles: (n: number) => `${n} more ${n === 1 ? 'story' : 'stories'}`,
      noArticles: 'No stories mention this term yet.',
      editorial:
        'Glossary definitions are provided for information. Opinions on whether a product complies with Sharia are the responsibility of each institution’s own Sharia board.',
      nav: 'Glossary navigation',
      prev: 'Previous term',
      next: 'Next term',
      all: 'All terms',
      share: 'Share this term',
      onThisPage: 'On this page',
      sameCategory: 'More in this category',
    },
  },
})
