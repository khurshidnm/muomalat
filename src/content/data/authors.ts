import type { Author } from '../types'

/**
 * Bylines. Names are fictional placeholders until the newsroom roster is
 * confirmed; they do not refer to real people. `translations` carries the
 * role and bio for the ru/en editions (personal names stay as written; the
 * two team bylines translate their name too).
 */
export const authors: Author[] = [
  {
    slug: 'aziza-rahimova',
    name: 'Aziza Rahimova',
    role: 'Bank sektori sharhlovchisi',
    bio: 'Tijorat banklari, islom oynalari va chakana moliya mahsulotlarini yoritadi. Avval iqtisodiy nashrlarda bank sohasi muxbiri boʻlib ishlagan.',
    email: 'a.rahimova@muomalat.uz',
    translations: {
      ru: {
        role: 'Обозреватель банковского сектора',
        bio: 'Пишет о коммерческих банках, исламских окнах и розничных финансовых продуктах. Раньше работала банковским корреспондентом в экономических изданиях.',
      },
      en: {
        role: 'Banking correspondent',
        bio: 'Covers commercial banks, Islamic windows and retail finance products. Previously a banking reporter at business publications.',
      },
    },
  },
  {
    slug: 'jasur-toshmatov',
    name: 'Jasur Toshmatov',
    role: 'Tahlil boʻlimi muharriri',
    bio: 'Bozor maʼlumotlari, regulyativ hujjatlar va moliyaviy hisobotlar tahlili bilan shugʻullanadi.',
    email: 'j.toshmatov@muomalat.uz',
    translations: {
      ru: {
        role: 'Редактор отдела аналитики',
        bio: 'Анализирует рыночные данные, нормативные документы и финансовую отчётность.',
      },
      en: {
        role: 'Analysis editor',
        bio: 'Analyses market data, regulatory documents and financial statements.',
      },
    },
  },
  {
    slug: 'malika-yusupova',
    name: 'Malika Yusupova',
    role: 'Muxbir, regulyatsiya va litsenziyalar',
    bio: 'Qonunchilik, litsenziyalash jarayoni va regulyator qarorlarini kuzatadi.',
    email: 'm.yusupova@muomalat.uz',
    translations: {
      ru: {
        role: 'Корреспондент, регулирование и лицензии',
        bio: 'Следит за законодательством, процессом лицензирования и решениями регулятора.',
      },
      en: {
        role: 'Reporter, regulation and licensing',
        bio: 'Follows legislation, the licensing process and the regulator’s decisions.',
      },
    },
  },
  {
    slug: 'bekzod-nazarov',
    name: 'Bekzod Nazarov',
    role: '«Dunyo» boʻlimi muharriri',
    bio: 'Xalqaro islom moliyasi bozorlari, sukuk emissiyalari va standartlashtirish tashkilotlari haqida yozadi.',
    email: 'b.nazarov@muomalat.uz',
    translations: {
      ru: {
        role: 'Редактор раздела «Мир»',
        bio: 'Пишет о международных рынках исламских финансов, выпусках сукук и организациях по стандартизации.',
      },
      en: {
        role: 'World editor',
        bio: 'Writes about international Islamic finance markets, sukuk issuance and standard-setting bodies.',
      },
    },
  },
  {
    slug: 'nilufar-qodirova',
    name: 'Nilufar Qodirova',
    role: 'Intervyu va klub loyihalari muharriri',
    bio: 'Bozor ishtirokchilari bilan suhbatlar tayyorlaydi va Muomalat klubi uchrashuvlarini yuritadi.',
    email: 'n.qodirova@muomalat.uz',
    translations: {
      ru: {
        role: 'Редактор интервью и клубных проектов',
        bio: 'Готовит интервью с участниками рынка и ведёт встречи клуба Muomalat.',
      },
      en: {
        role: 'Interviews and club editor',
        bio: 'Interviews market participants and hosts Muomalat Club meetings.',
      },
    },
  },
  {
    slug: 'tahririyat',
    name: 'Muomalat tahririyati',
    role: 'Tahririyat',
    bio: 'Imzosiz izohlar va maʼlumotnoma materiallari tahririyat tomonidan tayyorlanadi va bosh muharrir tomonidan tasdiqlanadi.',
    translations: {
      ru: {
        name: 'Редакция Muomalat',
        role: 'Редакция',
        bio: 'Неподписанные разъяснения и справочные материалы готовит редакция, их утверждает главный редактор.',
      },
      en: {
        name: 'Muomalat newsroom',
        role: 'Newsroom',
        bio: 'Unsigned explainers and reference material are prepared by the newsroom and approved by the editor-in-chief.',
      },
    },
  },
  {
    slug: 'hamkorlik',
    name: 'Hamkorlik loyihalari',
    role: 'Tijorat boʻlimi',
    bio: 'Hamkorlik materiallari Muomalat tijorat boʻlimi tomonidan hamkor buyurtmasiga koʻra tayyorlanadi. Tahririyat jamoasi ularni yozish va tahrir qilishda ishtirok etmaydi.',
    translations: {
      ru: {
        name: 'Партнёрские проекты',
        role: 'Коммерческий отдел',
        bio: 'Партнёрские материалы готовит коммерческий отдел Muomalat по заказу партнёра. Редакция не участвует в их написании и редактировании.',
      },
      en: {
        name: 'Partner projects',
        role: 'Commercial team',
        bio: 'Partner content is produced by Muomalat’s commercial team at the partner’s request. The newsroom takes no part in writing or editing it.',
      },
    },
  },
]
