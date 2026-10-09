import { defineMessages } from '../messages'

const uz = {
  metaTitle: 'Muomalat — islom moliyasi va biznes yangiliklari',
  leadLabel: 'Bosh mavzu',
  analysis: 'Tahlil',
  interviews: 'Intervyu',
  explainers: 'Izoh',
  explainersIntro: 'Islom moliyasining asosiy tushunchalari — qisqa va aniq.',
  world: 'Dunyo',
  termOfDay: 'Kun atamasi',
  termCta: 'Lugʻatda batafsil',
  glossaryAll: 'Barcha atamalar',
  market: {
    title: 'Bozor xaritasi',
    intro: 'Litsenziya olgan va ariza bergan tashkilotlar.',
    granted: 'Litsenziya olgan',
    review: 'Koʻrib chiqilmoqda',
    applied: 'Ariza bergan',
    announced: 'Rejasini eʼlon qilgan',
    cta: 'Xaritani ochish',
    asOf: (date: string) => `${date} holatiga`,
  },
  club: {
    kicker: 'Muomalat klubi',
    next: 'Navbatdagi uchrashuv',
    text: 'Tadbirkorlar uchun oylik uchrashuvlar: shariatga muvofiq moliyalashtirish amaliyoti, bank va lizing mutaxassislari bilan ochiq suhbat.',
    register: 'Roʻyxatdan oʻtish',
    about: 'Klub haqida',
    seats: (n: number) => `${n} oʻrin`,
  },
} as const

export const homeMessages = defineMessages({
  uz,
  ru: {
    metaTitle: 'Muomalat — новости исламских финансов и бизнеса',
    leadLabel: 'Главное',
    analysis: 'Аналитика',
    interviews: 'Интервью',
    explainers: 'Разъяснения',
    explainersIntro: 'Ключевые понятия исламских финансов — коротко и точно.',
    world: 'Мир',
    termOfDay: 'Термин дня',
    termCta: 'Подробнее в словаре',
    glossaryAll: 'Все термины',
    market: {
      title: 'Карта рынка',
      intro: 'Организации, получившие лицензию или подавшие заявку.',
      granted: 'Лицензия выдана',
      review: 'На рассмотрении',
      applied: 'Заявка подана',
      announced: 'Планы объявлены',
      cta: 'Открыть карту',
      asOf: (date: string) => `По состоянию на ${date}`,
    },
    club: {
      kicker: 'Клуб Muomalat',
      next: 'Следующая встреча',
      text: 'Ежемесячные встречи для предпринимателей: практика финансирования по нормам шариата, открытый разговор со специалистами банков и лизинговых компаний.',
      register: 'Зарегистрироваться',
      about: 'О клубе',
      seats: (n: number) => {
        const m10 = n % 10
        const m100 = n % 100
        const word = m10 === 1 && m100 !== 11 ? 'место' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'места' : 'мест'
        return `${n} ${word}`
      },
    },
  },
  en: {
    metaTitle: 'Muomalat — Islamic finance and business news',
    leadLabel: 'Top story',
    analysis: 'Analysis',
    interviews: 'Interviews',
    explainers: 'Explainers',
    explainersIntro: 'The core ideas of Islamic finance, briefly and precisely.',
    world: 'World',
    termOfDay: 'Term of the day',
    termCta: 'Read in the glossary',
    glossaryAll: 'All terms',
    market: {
      title: 'Market map',
      intro: 'Institutions that hold a licence or have applied for one.',
      granted: 'Licensed',
      review: 'Under review',
      applied: 'Applied',
      announced: 'Announced',
      cta: 'Open the map',
      asOf: (date: string) => `As of ${date}`,
    },
    club: {
      kicker: 'Muomalat Club',
      next: 'Next meeting',
      text: 'Monthly meetings for entrepreneurs: how Sharia-compliant financing works in practice, in open conversation with bank and leasing specialists.',
      register: 'Register',
      about: 'About the club',
      seats: (n: number) => `${n} ${n === 1 ? 'seat' : 'seats'}`,
    },
  },
})
