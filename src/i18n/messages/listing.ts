import { defineMessages } from '../messages'

/** Rubric, topic (/mavzu) and author (/muallif) listings. */

/** Russian noun forms: 1 материал, 2 материала, 5 материалов. */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const uz = {
  count: (n: number) => `${n} ta material`,
  latest: 'Eng yangi material',
  rss: 'RSS',
  rssTitle: 'Muomalat RSS lentasi',
  rubricsNav: 'Barcha rubrikalar',
  topStories: 'Soʻnggi materiallar',
  earlier: 'Avvalroq',
  page: (n: number) => `${n}-sahifa`,
  pageTitle: (name: string, n: number) => `${name}, ${n}-sahifa`,
  interviewWith: 'Suhbatdosh',
  mostReadScope: {
    rubric: (name: string) => `«${name}» rubrikasida`,
    tag: (label: string) => `«${label}» mavzusida`,
    author: 'Shu imzo bilan chiqqan materiallar orasida',
    site: 'Butun sayt boʻyicha',
  },
  contacts: 'Aloqa',
  rubricsNavIntro: 'Boshqa rubrikalarni ham koʻring',
  currentRubric: 'Siz shu rubrikadasiz',
  flags: {
    corrected: 'Tuzatish kiritilgan',
    updated: 'Yangilandi',
  },
  pagination: {
    label: 'Sahifalar',
    prev: 'Oldingi',
    next: 'Keyingi',
    prevPage: 'Oldingi sahifa',
    nextPage: 'Keyingi sahifa',
    goTo: (n: number) => `${n}-sahifaga oʻtish`,
    current: (n: number, total: number) => `${n}-sahifa, jami ${total} ta sahifa`,
  },
  tag: {
    kicker: 'Mavzu',
    metaTitle: (label: string) => `${label}: barcha materiallar`,
    description: (label: string) => `«${label}» mavzusidagi yangiliklar, tahlillar, intervyular va izohlar.`,
    related: 'Yaqin mavzular',
  },
  author: {
    kicker: 'Muallif',
    email: 'Elektron pochta',
    telegram: 'Telegram',
    metaDescription: (name: string, role: string) => `${name} — ${role}. Muomalat nashridagi barcha materiallari.`,
    sample: 'Namunaviy profil: ism va maʼlumotlar tahririyat tarkibi tasdiqlangach almashtiriladi',
    newsroomNote: 'Bu umumiy imzo: u bitta jurnalistga emas, butun tahririyat jamoasiga tegishli.',
    commercialNote: (label: string) =>
      `Bu imzo tahririyatga emas, Muomalat tijorat boʻlimiga tegishli. Bu yerdagi har bir material «${label}» belgisi bilan chiqadi va tahririyat materiallaridan alohida ajratiladi.`,
    policyLink: 'Tahririyat siyosati',
    advertiseLink: 'Reklama va hamkorlik shartlari',
  },
  empty: {
    title: 'Hozircha material yoʻq',
    rubric: 'Bu rubrikada hali material eʼlon qilinmagan. Yangi materiallar chiqishi bilan shu yerda paydo boʻladi.',
    tag: 'Bu mavzuda hali material eʼlon qilinmagan. Yangi materiallar chiqishi bilan shu yerda paydo boʻladi.',
    author: 'Bu imzo bilan hali material eʼlon qilinmagan.',
    otherTopics: 'Boshqa mavzular',
    latest: 'Soʻnggi yangiliklar',
  },
} as const

export const listingMessages = defineMessages({
  uz,
  ru: {
    count: (n: number) => `${n} ${ruPlural(n, 'материал', 'материала', 'материалов')}`,
    latest: 'Самый свежий материал',
    rss: 'RSS',
    rssTitle: 'RSS-лента Muomalat',
    rubricsNav: 'Все рубрики',
    topStories: 'Последние материалы',
    earlier: 'Ранее',
    page: (n: number) => `Страница ${n}`,
    pageTitle: (name: string, n: number) => `${name}, страница ${n}`,
    interviewWith: 'Собеседник',
    mostReadScope: {
      rubric: (name: string) => `В рубрике «${name}»`,
      tag: (label: string) => `По теме «${label}»`,
      author: 'Среди материалов под этой подписью',
      site: 'По всему сайту',
    },
    contacts: 'Контакты',
    rubricsNavIntro: 'Загляните и в другие рубрики',
    currentRubric: 'Вы в этой рубрике',
    flags: {
      corrected: 'Внесено исправление',
      updated: 'Обновлено',
    },
    pagination: {
      label: 'Страницы',
      prev: 'Назад',
      next: 'Вперёд',
      prevPage: 'Предыдущая страница',
      nextPage: 'Следующая страница',
      goTo: (n: number) => `Перейти на страницу ${n}`,
      current: (n: number, total: number) => `Страница ${n} из ${total}`,
    },
    tag: {
      kicker: 'Тема',
      metaTitle: (label: string) => `${label}: все материалы`,
      description: (label: string) => `Новости, аналитика, интервью и разъяснения по теме «${label}».`,
      related: 'Близкие темы',
    },
    author: {
      kicker: 'Автор',
      email: 'Электронная почта',
      telegram: 'Telegram',
      metaDescription: (name: string, role: string) => `${name} — ${role}. Все материалы автора в издании Muomalat.`,
      sample: 'Образец профиля: имя и данные будут заменены после утверждения состава редакции',
      newsroomNote: 'Это общая подпись: она принадлежит не отдельному журналисту, а всей редакции.',
      commercialNote: (label: string) =>
        `Эта подпись принадлежит не редакции, а коммерческому отделу Muomalat. Каждый материал здесь выходит с пометкой «${label}» и отделён от редакционных текстов.`,
      policyLink: 'Редакционная политика',
      advertiseLink: 'Условия рекламы и партнёрства',
    },
    empty: {
      title: 'Материалов пока нет',
      rubric: 'В этой рубрике ещё нет материалов. Новые публикации появятся здесь.',
      tag: 'По этой теме ещё нет материалов. Новые публикации появятся здесь.',
      author: 'Под этой подписью ещё нет материалов.',
      otherTopics: 'Другие темы',
      latest: 'Последние новости',
    },
  },
  en: {
    count: (n: number) => `${n} ${n === 1 ? 'story' : 'stories'}`,
    latest: 'Newest story',
    rss: 'RSS',
    rssTitle: 'Muomalat RSS feed',
    rubricsNav: 'All sections',
    topStories: 'Latest stories',
    earlier: 'Earlier',
    page: (n: number) => `Page ${n}`,
    pageTitle: (name: string, n: number) => `${name}, page ${n}`,
    interviewWith: 'Interviewee',
    mostReadScope: {
      rubric: (name: string) => `In ${name}`,
      tag: (label: string) => `On ${label}`,
      author: 'Among stories under this byline',
      site: 'Across the site',
    },
    contacts: 'Contact',
    rubricsNavIntro: 'Explore the other sections',
    currentRubric: 'You are in this section',
    flags: {
      corrected: 'Corrected',
      updated: 'Updated',
    },
    pagination: {
      label: 'Pages',
      prev: 'Previous',
      next: 'Next',
      prevPage: 'Previous page',
      nextPage: 'Next page',
      goTo: (n: number) => `Go to page ${n}`,
      current: (n: number, total: number) => `Page ${n} of ${total}`,
    },
    tag: {
      kicker: 'Topic',
      metaTitle: (label: string) => `${label}: all stories`,
      description: (label: string) => `News, analysis, interviews and explainers on ${label}.`,
      related: 'Related topics',
    },
    author: {
      kicker: 'Author',
      email: 'Email',
      telegram: 'Telegram',
      metaDescription: (name: string, role: string) => `${name}, ${role}. All stories on Muomalat.`,
      sample: 'Sample profile: the name and details will be replaced once the newsroom roster is confirmed',
      newsroomNote: 'This is a shared byline: it belongs to the whole newsroom rather than to a single journalist.',
      commercialNote: (label: string) =>
        `This byline belongs to Muomalat’s commercial team, not to the newsroom. Every item here carries the “${label}” label and is kept separate from our journalism.`,
      policyLink: 'Editorial policy',
      advertiseLink: 'Advertising and partnership terms',
    },
    empty: {
      title: 'No stories yet',
      rubric: 'Nothing has been published in this section yet. New stories will appear here.',
      tag: 'Nothing has been published on this topic yet. New stories will appear here.',
      author: 'Nothing has been published under this byline yet.',
      otherTopics: 'Other topics',
      latest: 'Latest news',
    },
  },
})
