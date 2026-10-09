import { defineMessages } from '../messages'

/**
 * Search page (/qidiruv) and the 404 page.
 *
 * Templates use {0}, {1} for the user's query: the placeholders survive the
 * automatic Cyrillic transliteration, so the query itself is never altered.
 * Fill them with `fillTemplate` / `<Template>` from components/search.
 */

/** Russian plural form: one (1, 21), few (2–4, 22–24), many (5–20, 25–30). */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const d = n % 10
  const h = n % 100
  if (d === 1 && h !== 11) return one
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few
  return many
}

const uz = {
  search: {
    title: 'Qidiruv',
    metaTitle: '«{0}» — qidiruv natijalari',
    description: 'Muomalat maqolalari, islom moliyasi lugʻati va bozor xaritasi boʻyicha qidiruv.',
    intro: 'Maqolalar, lugʻatdagi atamalar va bozor xaritasidagi tashkilotlar orasidan qidiring.',
    status: {
      results: (n: number) => `«{0}» boʻyicha ${n} ta natija topildi`,
      none: '«{0}» boʻyicha hech narsa topilmadi',
      tooShort: 'Qidirish uchun kamida ikkita harf kiriting.',
      converted: '«{0}» boʻyicha natija yoʻq. Quyida «{1}» boʻyicha natijalar koʻrsatilgan.',
      merged: 'Natijalarga «{1}» yozuvi boʻyicha topilganlar ham qoʻshildi.',
    },
    groups: {
      articles: 'Maqolalar',
      terms: 'Lugʻat',
      institutions: 'Bozor xaritasi',
    },
    jumpLabel: 'Natijalar turlari',
    exactMatch: 'Lugʻatdagi atama',
    termPage: 'Atama sahifasi',
    allTerms: 'Barcha atamalar',
    moreArticles: (n: number) => `Yana ${n} ta maqola`,
    shownOf: (shown: number, total: number) => `${total} ta maqoladan ${shown} tasi koʻrsatilgan`,
    moreInstitutions: (n: number) => `Yana ${n} ta tashkilot bozor xaritasida`,
    openMap: 'Bozor xaritasini ochish',
    coverage: 'Maqola',
    asOf: (date: string) => `${date} holatiga`,
    products: 'Mahsulotlar',
    types: {
      bank: 'Islom banki',
      window: 'Islom oynasi',
      microfinance: 'Mikromoliya tashkiloti',
      leasing: 'Lizing kompaniyasi',
      takaful: 'Takaful operatori',
    },
    empty: {
      title: 'Boshqacha qidirib koʻring',
      text: 'Quyidagi maslahatlar va boʻlimlar kerakli materialni topishga yordam beradi.',
      tipsTitle: 'Qanday qidirish kerak',
      tips: [
        'Soʻrovni qisqartiring: «murobaha shartnomasi» oʻrniga «murobaha» deb yozing.',
        'Lotin yoki kirill yozuvi farq qilmaydi. Oʻ va gʻ harflarini belgisiz yozsangiz ham boʻladi.',
        'Atamaning ruscha yoki inglizcha nomini kiritib koʻring — lugʻat ularni ham taniydi.',
        'Tashkilotni turi yoki mahsuloti boʻyicha izlang: «lizing», «takaful», «ijora».',
      ],
      popularTerms: 'Lugʻatdagi asosiy atamalar',
      sections: 'Boʻlimlar',
    },
    idle: {
      popular: 'Koʻp qidiriladi',
      hint: 'Masalan: atama («sukuk»), mavzu («litsenziya») yoki tashkilot turi («lizing»).',
      latest: 'Soʻnggi materiallar',
      sections: 'Boʻlimlar',
    },
  },
  notFound: {
    code: 'Xato 404',
    title: 'Sahifa topilmadi',
    text: 'Bu manzilda sahifa yoʻq. Ehtimol, havola eskirgan, sahifa boshqa manzilga koʻchirilgan yoki manzilda xato bor.',
    searchHint: 'Kerakli materialni qidiruv orqali toping.',
    start: 'Qayerdan boshlash mumkin',
    report: 'Bu sahifaga saytimizdagi havola orqali kelgan boʻlsangiz, bizga xabar bering.',
    reportLink: 'Tahririyatga yozish',
    glossary: 'Islom moliyasi atamalari: murobaha, ijora, sukuk va boshqalar.',
    market: 'Litsenziya olgan va ariza bergan tashkilotlar.',
    club: 'Tadbirkorlar uchun oylik uchrashuvlar.',
  },
} as const

export const searchMessages = defineMessages({
  uz,
  // The oʻ/gʻ search tip has no meaning in Cyrillic (arrays are replaced whole).
  kr: {
    search: {
      empty: {
        tips: [
          'Сўровни қисқартиринг: «муробаҳа шартномаси» ўрнига «муробаҳа» деб ёзинг.',
          'Лотин ёки кирилл ёзуви фарқ қилмайди: қидирув иккаласини ҳам танийди.',
          'Атаманинг русча ёки инглизча номини киритиб кўринг — луғат уларни ҳам танийди.',
          'Ташкилотни тури ёки маҳсулоти бўйича изланг: «лизинг», «такафул», «ижора».',
        ],
      },
    },
  },
  ru: {
    search: {
      title: 'Поиск',
      metaTitle: '«{0}» — результаты поиска',
      description: 'Поиск по материалам Muomalat, словарю исламских финансов и карте рынка.',
      intro: 'Ищите среди статей, терминов словаря и организаций на карте рынка.',
      status: {
        results: (n: number) =>
          `По запросу «{0}» ${ruPlural(n, 'найден', 'найдено', 'найдено')} ${n} ${ruPlural(n, 'результат', 'результата', 'результатов')}`,
        none: 'По запросу «{0}» ничего не найдено',
        tooShort: 'Введите не менее двух букв.',
        converted: 'По запросу «{0}» ничего нет. Ниже — результаты для «{1}».',
        merged: 'В результаты добавлены совпадения для написания «{1}».',
      },
      groups: {
        articles: 'Статьи',
        terms: 'Словарь',
        institutions: 'Карта рынка',
      },
      jumpLabel: 'Типы результатов',
      exactMatch: 'Термин из словаря',
      termPage: 'Статья словаря',
      allTerms: 'Все термины',
      moreArticles: (n: number) => `Ещё ${n} ${ruPlural(n, 'статья', 'статьи', 'статей')}`,
      shownOf: (shown: number, total: number) => `Показано ${shown} из ${total}`,
      moreInstitutions: (n: number) => `Ещё ${n} ${ruPlural(n, 'организация', 'организации', 'организаций')} на карте рынка`,
      openMap: 'Открыть карту рынка',
      coverage: 'Статья',
      asOf: (date: string) => `на ${date}`,
      products: 'Продукты',
      types: {
        bank: 'Исламский банк',
        window: 'Исламское окно',
        microfinance: 'Микрофинансовая организация',
        leasing: 'Лизинговая компания',
        takaful: 'Такафул-оператор',
      },
      empty: {
        title: 'Попробуйте искать иначе',
        text: 'Советы и разделы ниже помогут найти нужный материал.',
        tipsTitle: 'Как искать',
        tips: [
          'Сократите запрос: вместо «договор мурабаха» напишите «мурабаха».',
          'Латиница или кириллица — неважно. Буквы oʻ и gʻ можно писать без знака.',
          'Большинство материалов на узбекском: узбекское название термина даст больше результатов.',
          'Ищите организации по типу или продукту: «лизинг», «такафул», «иджара».',
        ],
        popularTerms: 'Основные термины словаря',
        sections: 'Разделы',
      },
      idle: {
        popular: 'Часто ищут',
        hint: 'Большинство материалов на узбекском, поэтому узбекские термины дают больше результатов.',
        latest: 'Последние материалы',
        sections: 'Разделы',
      },
    },
    notFound: {
      code: 'Ошибка 404',
      title: 'Страница не найдена',
      text: 'По этому адресу страницы нет. Возможно, ссылка устарела, страница переехала или в адресе есть опечатка.',
      searchHint: 'Найдите нужный материал через поиск.',
      start: 'С чего начать',
      report: 'Если вы пришли сюда по ссылке с нашего сайта, сообщите нам.',
      reportLink: 'Написать в редакцию',
      glossary: 'Термины исламских финансов: мурабаха, иджара, сукук и другие.',
      market: 'Организации с лицензией и подавшие заявку.',
      club: 'Ежемесячные встречи для предпринимателей.',
    },
  },
  en: {
    search: {
      title: 'Search',
      metaTitle: '“{0}” — search results',
      description: 'Search Muomalat stories, the Islamic finance glossary and the market map.',
      intro: 'Search stories, glossary terms and the institutions on the market map.',
      status: {
        results: (n: number) => `${n} ${n === 1 ? 'result' : 'results'} for “{0}”`,
        none: 'No results for “{0}”',
        tooShort: 'Type at least two letters to search.',
        converted: 'No results for “{0}”. Showing results for “{1}” instead.',
        merged: 'Matches for the spelling “{1}” are included.',
      },
      groups: {
        articles: 'Stories',
        terms: 'Glossary',
        institutions: 'Market map',
      },
      jumpLabel: 'Result types',
      exactMatch: 'Glossary term',
      termPage: 'Read the entry',
      allTerms: 'All terms',
      moreArticles: (n: number) => `${n} more ${n === 1 ? 'story' : 'stories'}`,
      shownOf: (shown: number, total: number) => `Showing ${shown} of ${total}`,
      moreInstitutions: (n: number) => `${n} more on the market map`,
      openMap: 'Open the market map',
      coverage: 'Story',
      asOf: (date: string) => `as of ${date}`,
      products: 'Products',
      types: {
        bank: 'Islamic bank',
        window: 'Islamic window',
        microfinance: 'Microfinance institution',
        leasing: 'Leasing company',
        takaful: 'Takaful operator',
      },
      empty: {
        title: 'Try a different search',
        text: 'The tips and sections below can help you find what you need.',
        tipsTitle: 'Search tips',
        tips: [
          'Use fewer words: “murobaha” rather than “murobaha contract”.',
          'Latin or Cyrillic spelling both work, and you can leave out the mark in oʻ and gʻ.',
          'Most stories are in Uzbek, so the Uzbek name of a term finds the most.',
          'Find institutions by type or product: “lizing”, “takaful”, “ijora”.',
        ],
        popularTerms: 'Key glossary terms',
        sections: 'Sections',
      },
      idle: {
        popular: 'Popular searches',
        hint: 'Most stories are in Uzbek, so Uzbek terms find the most.',
        latest: 'Latest stories',
        sections: 'Sections',
      },
    },
    notFound: {
      code: 'Error 404',
      title: 'Page not found',
      text: 'There is no page at this address. The link may be out of date, the page may have moved, or the address may contain a typo.',
      searchHint: 'Find what you need with search.',
      start: 'Where to start',
      report: 'If a link on our site brought you here, please let us know.',
      reportLink: 'Write to the newsroom',
      glossary: 'Islamic finance terms: murabaha, ijara, sukuk and more.',
      market: 'Institutions that hold a licence or have applied for one.',
      club: 'Monthly meetings for entrepreneurs.',
    },
  },
})
