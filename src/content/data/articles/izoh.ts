import type { Article } from '../../types'
import { img } from '../images'

const LAW = { title: 'Islom bank faoliyati toʻgʻrisidagi qonun', publisher: 'Qonunchilik maʼlumotlari milliy bazasi', type: 'document' } as const
const EDITORIAL = { title: 'Muomalat tahririyati maʼlumotnomasi', publisher: 'Muomalat', type: 'data' } as const

export const izoh: Article[] = [
  // ── iz-01 ────────────────────────────────────────────────────────────────
  {
    id: 'iz-01',
    slug: 'islom-oynasi-oddiy-bank-bolimidan-farqi',
    rubric: 'izoh',
    kicker: 'Islom oynalari',
    title: 'Islom oynasi nima va u oddiy bank boʻlimidan nimasi bilan farq qiladi?',
    lead: 'Islom oynasi — anʼanaviy bank ichida alohida hisob, alohida mablagʻlar va shariat kengashi nazorati bilan ishlaydigan biznes yoʻnalishi. U yangi filial ham, alohida bank ham emas.',
    authors: ['aziza-rahimova'],
    publishedAt: '2026-09-15T10:00:00+05:00',
    image: img('facadeLattice', { caption: 'Bank binosi jabhasi. Islom oynasi alohida bino emas, bank ichidagi alohida hisobga ega yoʻnalish' }),
    tags: ['islom-oynasi', 'litsenziyalash', 'regulyator'],
    terms: ['islom-oynasi', 'ribo', 'foyda-va-zarar-taqsimoti', 'murobaha', 'ijora', 'mushoraka', 'investitsiya-hisobvaragi', 'shariat-kengashi'],
    views: 13620,
    related: ['iz-02', 'iz-06', 'iv-01'],
    body: [
      {
        type: 'p',
        text: 'Islom bank faoliyati toʻgʻrisidagi qonun kuchga kirgach, Oʻzbekistonda islom moliyasi xizmatlarini koʻrsatishning ikki yoʻli paydo boʻldi: toʻliq islom banki ochish yoki mavjud tijorat banki ichida [[islom-oynasi|islom oynasi]]ni tashkil etish. Ikkinchi yoʻl tezroq va kamroq kapital talab qiladi, shuning uchun regulyatorga topshirilgan arizalarning eng katta qismi aynan oynalarga toʻgʻri keladi.',
      },
      { type: 'h2', text: 'Oyna — bu bino emas, balans' },
      {
        type: 'p',
        text: '«Oyna» soʻzi chalgʻitishi mumkin: gap bank zalidagi alohida kassa haqida emas. Islom oynasi — bankning tarkibiy boʻlinmasi boʻlib, u oʻz mahsulotlari, mablagʻlari va hisobotiga ega. Mijozlarga xizmat bankning mavjud boʻlimlari, alohida xizmat koʻrsatish nuqtalari yoki onlayn kanallar orqali koʻrsatilishi mumkin. Muhimi — oynaga tushgan har bir soʻm qayerdan kelgani va qayerga joylashtirilgani alohida hisobga olinadi.',
      },
      {
        type: 'p',
        text: 'Oddiy bank boʻlimi esa hududiy tushuncha. Filial yoki bank xizmatlari markazi bankning barcha anʼanaviy mahsulotlarini — foizli kreditlar, depozitlar, toʻlov xizmatlarini — muayyan hududda taklif qiladi. Boʻlim bankning umumiy mablagʻlari bilan ishlaydi va uning mahsulotlari foizga asoslanadi. Islom oynasida esa foiz ([[ribo|ribo]]) olinmaydi va toʻlanmaydi.',
      },
      {
        type: 'p',
        text: 'Omonatchilar uchun ham farq bor. Anʼanaviy depozitda bank oldindan kelishilgan foizni kafolatlaydi. Oynada esa mablagʻ joriy hisobvaraqda daromadsiz saqlanadi yoki investitsiya hisobvaragʻiga joylashtiriladi. Investitsiya hisobvaragʻi egasi oyna faoliyatidan olingan foydadan kelishilgan ulushni oladi, daromad esa oldindan kafolatlanmaydi — bu [[foyda-va-zarar-taqsimoti|foyda va zarar taqsimoti]] tamoyiliga asoslanadi.',
      },
      { type: 'term', slug: 'islom-oynasi' },
      { type: 'h2', text: 'Asosiy farqlar' },
      {
        type: 'table',
        caption: 'Islom oynasi va anʼanaviy bank boʻlimi',
        columns: [{ label: 'Mezon' }, { label: 'Anʼanaviy boʻlim' }, { label: 'Islom oynasi' }],
        rows: [
          ['Mahsulotlar', 'Foizli kreditlar va depozitlar', 'Murobaha, ijora, mushoraka, investitsiya hisobvaraqlari'],
          ['Mablagʻlar', 'Bankning umumiy resurslari', 'Alohida hisobga olinadi va anʼanaviy faoliyat bilan aralashmaydi'],
          ['Daromad manbai', 'Foiz', 'Savdo ustamasi, ijara toʻlovi, foyda ulushi'],
          ['Ortiqcha likvidlik', 'Foizli banklararo depozitlar', 'Faqat shariat talablariga mos vositalar'],
          ['Nazorat', 'Regulyator va ichki audit', 'Regulyator, ichki audit va shariat kengashi'],
          ['Hisobot', 'Bankning umumiy hisoboti', 'Alohida moliyaviy hisobot va shariat hisoboti'],
        ],
        source: 'Muomalat tahririyati',
      },
      {
        type: 'p',
        text: 'Eng muhim farq — mablagʻlarning ajratilishi. Agar oyna mijozlarining mablagʻi bankning foizli operatsiyalariga yoʻnaltirilsa yoki oyna anʼanaviy boʻlimdan foizli resurs olsa, oynaning mohiyati yoʻqoladi. Shuning uchun oynalar alohida hisobvaraqlar rejasi va dasturiy modullar bilan ishlaydi, [[shariat-kengashi|shariat kengashi]] esa bu ajratish amalda qanday bajarilayotganini kuzatadi.',
      },
      {
        type: 'p',
        text: 'Oynalar odatda [[murobaha|murobaha]] kabi oddiy savdo shartnomalaridan boshlaydi, keyin [[ijora|ijora]], [[mushoraka|mushoraka]] va [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]]ga oʻtadi. Har bir mahsulot ishga tushishidan oldin shariat kengashi va regulyator talablaridan oʻtishi kerak.',
      },
      {
        type: 'p',
        text: 'Xalqaro amaliyotda oyna ochish uchun bank regulyatorga oynaning biznes rejasi, boshqaruv tuzilmasi, shariat kengashi tarkibi, mablagʻlarni ajratish tartibi va axborot tizimi tavsifini taqdim etadi. Regulyator oynaning anʼanaviy faoliyatdan qanchalik ajratilganini, xodimlar tayyorgarligini va xatarlarni boshqarish tizimini baholaydi. Oʻzbekistonda ham banklar regulyatorga ariza topshirib, alohida ruxsatnoma olmoqda.',
      },
      { type: 'h2', text: 'Mijoz nimaga eʼtibor berishi kerak' },
      {
        type: 'list',
        items: [
          'Mahsulot qaysi shariat kengashi tomonidan maʼqullanganini soʻrang — bu maʼlumot ochiq boʻlishi kerak.',
          'Shartnomada bank sotuvchi yoki ijaraga beruvchi sifatida qatnashishini tekshiring: murobahada bank tovarni avval oʻzi sotib oladi.',
          'Takliflarni umumiy toʻlov summasi boʻyicha solishtiring: islom moliyasi mahsuloti avtomatik ravishda arzonroq ham, qimmatroq ham boʻlmaydi.',
          'Toʻlov kechiksa nima boʻlishini aniqlang: qarz summasi oshirilmaydi, kechiktirish toʻlovi esa odatda bank daromadiga qoʻshilmaydi.',
          'Hisobvaraq turini aniqlashtiring: joriy hisobvaraqda daromad toʻlanmaydi, investitsiya hisobvaragʻida esa daromad oldindan kafolatlanmaydi.',
        ],
      },
      {
        type: 'callout',
        title: 'Maʼlumot uchun',
        text: '15-sentabr holatiga koʻra islom oynasi uchun litsenziyani faqat bitta bank — Tijorat banki D olgan, ruxsatnoma 20-avgustda berilgan. Yana bir qator banklarning arizalari regulyatorda koʻrib chiqilmoqda yoki topshirilgan. Ishtirokchilar va ularning holati Muomalat [bozor xaritasida](/xarita) yangilab boriladi.',
      },
      {
        type: 'p',
        text: 'Oyna modeli bankka islom moliyasi bozorini katta qoʻshimcha kapitalsiz sinab koʻrish imkonini beradi. Xalqaro tajribada ayrim banklar keyinchalik oynani alohida islom bankiga aylantirgan, boshqalari esa uni bank ichidagi yoʻnalish sifatida saqlab qolgan. Qaysi yoʻl tanlanishi talab va kapital miqdoriga bogʻliq.',
      },
    ],
    sources: [
      LAW,
      { title: 'Regulyatorning rasmiy xabari', publisher: 'Bank regulyatori', date: '2026-08-20', type: 'press' },
      EDITORIAL,
    ],
  },

  // ── iz-02 ────────────────────────────────────────────────────────────────
  {
    id: 'iz-02',
    slug: 'murobaha-kreditdan-farqi-nimada',
    rubric: 'izoh',
    kicker: 'Shartnomalar',
    title: 'Murobaha: kreditdan farqi nimada?',
    lead: 'Murobahada bank pul emas, tovar sotadi: avval uni sotib oladi, keyin mijozga ochiq aytilgan ustama bilan boʻlib toʻlashga sotadi. Bu farq narxdan koʻra xatar va huquqlarga taʼsir qiladi.',
    authors: ['tahririyat'],
    publishedAt: '2026-09-17T11:00:00+05:00',
    image: img('signing', { caption: 'Murobaha shartnomasi imzolanmoqda. Narx imzolangan kuni belgilanadi va muddat oxirigacha oʻzgarmaydi' }),
    tags: ['murobaha', 'kichik-biznes', 'standartlar'],
    terms: ['murobaha', 'vad', 'aaoifi', 'ribo', 'tavarruq', 'shariat-kengashi', 'ijora', 'kamayuvchi-mushoraka'],
    views: 11240,
    related: ['iz-01', 'iv-01'],
    body: [
      {
        type: 'p',
        text: '[[murobaha|Murobaha]] — islom moliyasida eng keng tarqalgan shartnoma. Atama arabcha «foyda» maʼnosidagi oʻzakdan olingan va odatda «ustama bilan sotish» deb tushuntiriladi. Oʻzbekistondagi birinchi islom oynasi ham faoliyatini aynan shu mahsulotdan boshladi. Tashqaridan qaraganda u oddiy kreditga oʻxshaydi: mijoz bugun tovar oladi, pulini esa bir necha oy davomida toʻlaydi. Lekin bitimning huquqiy tuzilishi boshqacha.',
      },
      { type: 'term', slug: 'murobaha' },
      { type: 'h2', text: 'Murobaha qanday ishlaydi' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Mijoz kerakli tovarni va yetkazib beruvchini tanlab, bankka murojaat qiladi.',
          'Mijoz tovarni bankdan sotib olish haqida [[vad|vaʼda]] beradi.',
          'Bank tovarni yetkazib beruvchidan oʻz nomiga sotib oladi va unga egalik qiladi.',
          'Bank tovarni mijozga tannarx va oldindan kelishilgan ustama bilan sotadi, narx shartnomada qatʼiy belgilanadi.',
          'Mijoz narxni kelishilgan jadval boʻyicha boʻlib-boʻlib toʻlaydi.',
        ],
      },
      {
        type: 'p',
        text: 'Tuzilmaning asosiy sharti — ketma-ketlik: bank tovarga egalik qilmaguncha uni sota olmaydi. Bu tartib [[aaoifi|AAOIFI]]ning № 8 «Murobaha» shariat standartida batafsil tavsiflangan. Mijozning vaʼdasi bankni tovarni sotib olganidan keyin xaridorsiz qolish xataridan himoya qiladi, lekin sotish shartnomasining oʻrnini bosmaydi.',
      },
      { type: 'h2', text: 'Kredit bilan solishtiruv' },
      {
        type: 'table',
        caption: 'Bank krediti va murobaha',
        columns: [{ label: 'Mezon' }, { label: 'Kredit' }, { label: 'Murobaha' }],
        rows: [
          ['Bitim predmeti', 'Pul', 'Aniq tovar'],
          ['Bank daromadi', 'Qarz qoldigʻiga hisoblanadigan foiz', 'Sotish narxiga kiritilgan ustama'],
          ['Narx', 'Suzuvchi stavkada oʻzgarishi mumkin', 'Imzolangan kuni qatʼiy belgilanadi'],
          ['Toʻlov kechiksa', 'Qoʻshimcha foiz va penya bank daromadi boʻladi', 'Qarz oshmaydi, kechiktirish toʻlovi xayriyaga yoʻnaltiriladi'],
          ['Tovar xatari', 'Bank tovarga egalik qilmaydi', 'Sotilgunga qadar xatar bankda'],
          ['Nimani moliyalashtirish mumkin', 'Har qanday maqsad, shu jumladan naqd pul', 'Faqat real tovar va mulk'],
        ],
        source: 'Muomalat tahririyati',
      },
      {
        type: 'p',
        text: 'Kechiktirish masalasi alohida eʼtiborga loyiq. Murobaha narxi mijozning qarziga aylanadi, islom moliyasi tamoyillariga koʻra esa qarz ustiga vaqt uchun haq qoʻshish [[ribo|ribo]] hisoblanadi. Shu sababli koʻp tashkilotlar shartnomaga kechiktirish toʻlovini kiritadi, lekin uni oʻz daromadi sifatida tan olmaydi: mablagʻ tashkilotning shariat kengashi belgilagan tartibda xayriya maqsadlariga yoʻnaltiriladi.',
      },
      { type: 'h2', text: 'Hisob-kitob misoli' },
      {
        type: 'p',
        text: 'Tadbirkor 120 mln soʻmlik uskuna sotib olmoqchi. Bank uskunani yetkazib beruvchidan 120 mln soʻmga sotib oladi va tadbirkorga 12 oylik muddatga 15 foiz ustama bilan, yaʼni 138 mln soʻmga sotadi. Tadbirkor har oy 11,5 mln soʻm toʻlaydi. Bu summa shartnoma oxirigacha oʻzgarmaydi — bozordagi stavkalar oshsa ham, pasaysa ham.',
      },
      {
        type: 'p',
        text: 'Agar tadbirkor uchinchi oyda toʻlovni bir hafta kechiktirsa, shartnoma boʻyicha umumiy summa 138 mln soʻmligicha qoladi. Shartnomada kechiktirish toʻlovi nazarda tutilgan boʻlsa, u alohida undiriladi va bank daromadiga qoʻshilmaydi. Qarz muddatidan oldin toʻlansa, bank ustamaning bir qismidan oʻz ixtiyori bilan voz kechishi mumkin, lekin odatda bu shartnomada majburiyat sifatida yozilmaydi.',
      },
      {
        type: 'callout',
        title: 'Muhim nuqta',
        text: 'Murobaha ustamasi koʻpincha bozordagi stavkalarga qarab belgilanadi, shuning uchun umumiy xarajat oddiy kreditga yaqin boʻlishi mumkin. Murobaha avtomatik ravishda arzon degani emas. Takliflarni nomiga qarab emas, umumiy toʻlov summasiga qarab solishtirish kerak.',
      },
      {
        type: 'p',
        text: 'Murobahaning naqd pul olish uchun ishlatiladigan koʻrinishi — [[tavarruq|tavarruq]] — alohida mavzu. Unda mijoz tovarni muddatli toʻlovga sotib oladi va darhol uchinchi shaxsga naqd pulga sotadi. Bu tuzilmaga turli tashkilotlarning [[shariat-kengashi|shariat kengashlari]] turlicha yondashadi, koʻplari uni faqat cheklangan holatlarda qoʻllashga yoʻl qoʻyadi.',
      },
      { type: 'h2', text: 'Murobaha qayerda qoʻllaniladi' },
      {
        type: 'p',
        text: 'Murobaha qisqa va oʻrta muddatli moliyalashtirish uchun qulay: aylanma mablagʻ uchun tovar, xomashyo, uskuna, transport vositasi, maishiy texnika. Uy-joy kabi uzoq muddatli moliyalashtirishda koʻproq [[ijora|ijora]] yoki [[kamayuvchi-mushoraka|kamayuvchi mushoraka]] ishlatiladi, chunki muddat uzun boʻlganda qatʼiy narx ikki tomon uchun ham xatarli. Ish haqi toʻlash yoki mavjud qarzni qayta moliyalashtirish kabi ehtiyojlar murobaha bilan moliyalashtirilmaydi — ular uchun boshqa shartnomalar qoʻllaniladi.',
      },
    ],
    sources: [
      { title: 'AAOIFI Shariat standarti № 8 «Murobaha»', publisher: 'AAOIFI', type: 'document' },
      LAW,
      EDITORIAL,
    ],
  },

  // ── iz-03 ────────────────────────────────────────────────────────────────
  {
    id: 'iz-03',
    slug: 'ijora-lizingning-islom-moliyasidagi-shakli',
    rubric: 'izoh',
    kicker: 'Shartnomalar',
    title: 'Ijora: lizingning islom moliyasidagi shakli',
    lead: 'Ijorada uskuna yoki mulk muddat davomida moliya tashkilotiga tegishli boʻlib qoladi, mijoz esa undan foydalanish uchun ijara toʻlaydi. Anʼanaviy lizingdan asosiy farq — xatar va majburiyatlar taqsimotida.',
    authors: ['tahririyat'],
    publishedAt: '2026-09-21T10:30:00+05:00',
    image: img('vehicles', { caption: 'Yuk avtomobillari qatori. Transport vositalari ijora asosida moliyalashtiriladigan asosiy aktivlardan biri' }),
    tags: ['ijora', 'lizing', 'kichik-biznes'],
    terms: ['ijora', 'ijora-muntahiya-bittamlik', 'vad', 'aaoifi', 'takaful', 'istisno', 'rahn'],
    views: 7380,
    related: ['iz-07', 'iv-02'],
    body: [
      {
        type: 'p',
        text: '[[ijora|Ijora]] — mulkni haq evaziga foydalanishga berish shartnomasi. Islom moliyasida u uskuna, transport va koʻchmas mulkni moliyalashtirishning asosiy vositalaridan biri hisoblanadi. Oʻzbekistonda islom moliyasi xizmatlari uchun litsenziya olayotgan lizing kompaniyalari ham aynan shu shartnoma asosida ishlaydi. Anʼanaviy lizing mamlakatda yaxshi tanish boʻlgani uchun ijora islom moliyasining eng tez tushuniladigan mahsulotlaridan biri boʻlishi kutilmoqda.',
      },
      { type: 'h2', text: 'Ijora qanday tuziladi' },
      {
        type: 'p',
        text: 'Moliya tashkiloti mijoz tanlagan uskunani sotib oladi va uni muayyan muddatga ijaraga beradi. Muddat davomida mulk egasi tashkilot boʻlib qoladi. Mijoz uskunadan foydalanadi va kelishilgan jadval boʻyicha ijara toʻlovini toʻlaydi. Toʻlov qatʼiy boʻlishi yoki shartnomada oldindan kelishilgan tartibda, masalan, har yili qayta koʻrib chiqilishi mumkin.',
      },
      {
        type: 'p',
        text: 'Koʻp hollarda shartnoma muddat oxirida mulkni mijozga oʻtkazish bilan yakunlanadi. Bu shakl [[ijora-muntahiya-bittamlik|ijora muntahiya bittamlik]] deb ataladi. Muhim jihat: mulkni oʻtkazish ijara shartnomasining sharti sifatida yozilmaydi, balki alohida [[vad|vaʼda]], hadya yoki sotish shartnomasi orqali rasmiylashtiriladi. Bu tartib [[aaoifi|AAOIFI]]ning № 9 «Ijora» shariat standartida tavsiflangan.',
      },
      { type: 'term', slug: 'ijora-muntahiya-bittamlik' },
      { type: 'h2', text: 'Anʼanaviy lizingdan farqi' },
      {
        type: 'table',
        caption: 'Anʼanaviy moliyaviy lizing va ijora',
        columns: [{ label: 'Mezon' }, { label: 'Moliyaviy lizing' }, { label: 'Ijora' }],
        rows: [
          ['Mulk xatari', 'Koʻpincha toʻliq lizing oluvchiga oʻtadi', 'Mulk egasi — moliya tashkiloti zimmasida'],
          ['Yirik taʼmir', 'Odatda lizing oluvchi hisobidan', 'Mulk egasi hisobidan'],
          ['Toʻlov boshlanishi', 'Shartnomaga koʻra, baʼzan yetkazishdan oldin', 'Mulk foydalanishga topshirilgandan keyin'],
          ['Mulk yaroqsiz boʻlib qolsa', 'Toʻlov majburiyati saqlanishi mumkin', 'Mijoz aybi boʻlmasa, ijara toʻlovi toʻxtatiladi'],
          ['Kechikish', 'Penya lizing beruvchi daromadi', 'Kechiktirish toʻlovi xayriyaga yoʻnaltiriladi'],
          ['Sugʻurta', 'Odatda lizing oluvchi toʻlaydi', 'Mulk egasi taʼminlaydi, imkon boʻlsa takaful orqali'],
        ],
        source: 'Muomalat tahririyati, AAOIFI № 9 standartining umumiy qoidalari asosida',
      },
      {
        type: 'p',
        text: 'Amalda bu farqlar sezilarli. Ijorada moliya tashkiloti haqiqiy mulkdor sifatida xatarni oʻz zimmasiga oladi: agar uskuna mijozning aybisiz ishdan chiqsa, uni tiklash yoki almashtirish tashkilotning vazifasi. Mijoz esa kundalik texnik xizmat va mulkdan ehtiyotkorlik bilan foydalanish uchun javob beradi. Uskuna shartnomada koʻrsatilmagan maqsadda ishlatilsa yoki unga ehtiyotsizlik bilan zarar yetkazilsa, xarajatlar mijozga yuklanadi. Shu sababli ijora shartnomalarida majburiyatlar bandma-band yoziladi. Mulkni sugʻurtalash ham mulk egasining ishi — bozorda [[takaful|takaful]] operatorlari paydo boʻlgach, bu yoʻnalish ular orqali amalga oshirilishi kutilmoqda.',
      },
      { type: 'h2', text: 'Ijara toʻlovi qanday hisoblanadi' },
      {
        type: 'p',
        text: 'Ijara toʻlovi tashkilotning uskunaga sarflagan mablagʻini qoplaydigan va unga kelishilgan daromad keltiradigan qilib hisoblanadi. Masalan, lizing kompaniyasi 500 mln soʻmlik uskunani sotib olib, uni uch yilga ijaraga bersa, mijoz avval 20 foiz — 100 mln soʻm boshlangʻich toʻlov qiladi, qolgan qism va kompaniya daromadi 36 oylik ijara toʻlovlariga taqsimlanadi. Uzoq muddatli shartnomalarda toʻlov davriy qayta koʻrib chiqilishi mumkin: yangi miqdor oldindan kelishilgan mezon asosida belgilanadi va faqat kelgusi davrlarga qoʻllaniladi, oʻtgan davr toʻlovlari oʻzgarmaydi.',
      },
      {
        type: 'p',
        text: 'Ijora boshqa shartnomalar bilan birga ham ishlatiladi. Masalan, hali qurilmagan obyekt uchun avval [[istisno|istisno]] — buyurtma asosida ishlab chiqarish yoki qurish shartnomasi tuziladi, obyekt tayyor boʻlgach esa u mijozga ijaraga beriladi.',
      },
      { type: 'h2', text: 'Kimlar uchun mos' },
      {
        type: 'list',
        items: [
          'Dastgoh, uskuna va qishloq xoʻjaligi texnikasiga ehtiyoj sezayotgan ishlab chiqaruvchilar.',
          'Yuk yoki yoʻlovchi tashish uchun transport vositasi olayotgan tadbirkorlar.',
          'Koʻchmas mulkni bosqichma-bosqich sotib olmoqchi boʻlgan jismoniy va yuridik shaxslar — bu yoʻnalishda ayrim banklar mahsulot tayyorlayotganini maʼlum qilgan.',
          'Garovga qoʻyadigan koʻchmas mulki boʻlmagan kichik korxonalar: asosiy taʼminot — ijaraga berilgan mulkning oʻzi, qoʻshimcha [[rahn|garov]] har doim ham talab qilinmaydi.',
        ],
      },
      {
        type: 'callout',
        title: 'Maʼlumot uchun',
        text: 'Ijora boʻyicha xizmat koʻrsatayotgan va litsenziya kutayotgan tashkilotlar roʻyxati Muomalat [bozor xaritasida](/xarita) keltirilgan. Har bir tashkilotning litsenziya holati va taklif qilayotgan mahsulotlari uning kartochkasida koʻrsatiladi.',
      },
    ],
    sources: [
      { title: 'AAOIFI Shariat standarti № 9 «Ijora»', publisher: 'AAOIFI', type: 'document' },
      LAW,
      EDITORIAL,
    ],
  },

  // ── iz-04 ────────────────────────────────────────────────────────────────
  {
    id: 'iz-04',
    slug: 'sukuk-va-obligatsiya-beshta-asosiy-farq',
    rubric: 'izoh',
    kicker: 'Kapital bozori',
    title: 'Sukuk va obligatsiya: beshta asosiy farq',
    lead: 'Sukuk koʻpincha «islomiy obligatsiya» deb ataladi, lekin bu taʼrif aniq emas: obligatsiya egasi qarz talabiga, sukuk egasi esa aktivlardagi ulushga ega boʻladi.',
    authors: ['tahririyat'],
    publishedAt: '2026-09-25T12:00:00+05:00',
    image: img('chartCandles', { caption: 'Birja kotirovkalari grafigi. Sukukning ikkilamchi bozorda sotilishi uning aktivlar tarkibiga bogʻliq' }),
    tags: ['sukuk', 'kapital-bozori', 'xalqaro-bozorlar'],
    terms: ['sukuk', 'murobaha', 'ijora', 'mushoraka', 'muzoraba', 'vakola', 'aaoifi', 'shariat-kengashi'],
    views: 5130,
    body: [
      {
        type: 'p',
        text: '[[sukuk|Sukuk]] — xalqaro islom moliyasi bozorining eng yirik segmentlaridan biri. Bu soʻz arabcha «sakk» (hujjat, sertifikat) soʻzining koʻplik shakli. Sukuk xalqaro bozorda bir necha oʻn yildan beri chiqariladi. Bozor ishtirokchilari baholashicha, muomaladagi sukuklar hajmi yuzlab milliard dollarni tashkil etadi. Chiqaruvchilar orasida hukumatlar, banklar va yirik kompaniyalar bor. Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun kuchga kirgach, bozor ishtirokchilari mahalliy sukuk bozori qachon va qanday shakllanishini muhokama qilmoqda.',
      },
      { type: 'term', slug: 'sukuk' },
      { type: 'h2', text: 'Beshta farq' },
      {
        type: 'list',
        ordered: true,
        items: [
          '**Egalik.** Obligatsiya egasi emitentga qarz bergan kreditor hisoblanadi. Sukuk egasi esa muayyan aktiv, loyiha yoki xizmatdagi taqsimlanmagan ulushga ega boʻladi va shu aktiv bilan bogʻliq xatarlarni ham koʻtaradi.',
          '**Daromad manbai.** Obligatsiya boʻyicha foiz toʻlanadi. Sukuk boʻyicha daromad asosiy aktivdan keladi: ijara toʻlovi, savdo ustamasi yoki loyiha foydasi.',
          '**Aktiv talabi.** Obligatsiya chiqarish uchun aniq aktiv shart emas. Sukuk har doim aniqlangan aktivlarga yoki shartnomaga tayanadi: bino, yer, uskuna yoki ularning ijara huquqi.',
          '**Ikkilamchi bozor.** Obligatsiyalar erkin sotiladi. Sukukning sotilishi uning tarkibiga bogʻliq: agar u asosan qarz talablaridan, masalan, [[murobaha|murobaha]] boʻyicha toʻlovlardan iborat boʻlsa, uni nominaldan farqli narxda sotish cheklanadi.',
          '**Mablagʻdan foydalanish.** Sukukdan tushgan mablagʻ faqat shariat talablariga mos maqsadlarga yoʻnaltirilishi mumkin va bu emissiya hujjatlarida koʻrsatiladi. Obligatsiyada bunday cheklov yoʻq.',
        ],
      },
      {
        type: 'table',
        caption: 'Sukuk va obligatsiya: qisqacha',
        columns: [{ label: 'Mezon' }, { label: 'Obligatsiya' }, { label: 'Sukuk' }],
        rows: [
          ['Investor huquqi', 'Qarz talabi', 'Aktivdagi ulush'],
          ['Daromad', 'Foiz (kupon)', 'Aktivdan tushgan daromad'],
          ['Asosiy aktiv', 'Shart emas', 'Majburiy'],
          ['Ikkilamchi bozor', 'Erkin', 'Aktiv tarkibiga bogʻliq'],
          ['Shariat xulosasi', 'Talab qilinmaydi', 'Shariat kengashi xulosasi talab qilinadi'],
        ],
        source: 'Muomalat tahririyati',
      },
      { type: 'h2', text: 'Sukuk turlari' },
      {
        type: 'p',
        text: 'Eng keng tarqalgan tuzilma — ijora sukuki. Emitent aktivni maxsus maqsadli kompaniyaga sotadi, kompaniya uni emitentga qaytadan [[ijora|ijaraga]] beradi, ijara toʻlovlari esa investorlar oʻrtasida taqsimlanadi. [[mushoraka|Mushoraka]] va [[muzoraba|muzoraba]] sukuklarida investorlar loyiha foydasi va zararida ishtirok etadi, [[vakola|vakola]] sukukida esa mablagʻ vakil tomonidan aktivlar portfeliga joylashtiriladi. Sukuk turlari [[aaoifi|AAOIFI]]ning № 17 «Investitsion sukuk» shariat standartida tasniflangan.',
      },
      {
        type: 'p',
        text: 'Tuzilma tanlovi emitentning aktivlariga bogʻliq. Yer va binolarga ega davlat yoki kompaniya uchun ijora sukuki qulay. Aniq aktivlari kam, lekin savdo operatsiyalari koʻp kompaniya esa vakola tuzilmasini tanlashi mumkin — bunda portfel tarkibida real aktivlarning maʼlum ulushi saqlanishi talab qilinadi.',
      },
      { type: 'h2', text: 'Amalda farq qanchalik katta' },
      {
        type: 'p',
        text: 'Bozor ishtirokchilari baholashicha, koʻp sukuklar «aktivga asoslangan» tuzilmada chiqariladi: investorlar aktivga rasmiy ulushga ega boʻlsa-da, emitent muddat oxirida aktivni nominal qiymatda qaytarib sotib olish majburiyatini oladi. Natijada bunday sukukning xatari obligatsiyanikiga yaqinlashadi. «Aktiv bilan taʼminlangan» sukukda esa investorlar haqiqatan ham aktivga tayanadi va emitent toʻlovga qodir boʻlmasa, aktiv hisobidan qoplanish huquqiga ega.',
      },
      {
        type: 'p',
        text: 'Shuning uchun investor uchun sukukning nomidan koʻra emissiya hujjatlari muhimroq: aktivga kim egalik qiladi, emitent qanday majburiyatlar oladi, toʻlov qobiliyati yoʻqolganda investorlar nimaga daʼvo qila oladi.',
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Sukuk bozori ikki jihatdan muhim. Birinchidan, u islom banklari va oynalari uchun likvidlik vositasi boʻlishi mumkin: hozir ular boʻsh mablagʻni foizli vositalarga joylashtira olmaydi va koʻpincha uni daromadsiz saqlashga majbur. Ikkinchidan, sukuk infratuzilma, energetika va uy-joy loyihalari uchun foizli qarzdan qochadigan investorlar mablagʻini jalb qilish imkonini beradi. Xalqaro bozorda bunday investorlarning katta qismi Fors koʻrfazi mamlakatlari, Malayziya va Indoneziyada joylashgan.',
      },
      {
        type: 'callout',
        title: 'Maʼlumot uchun',
        text: 'Sukuk chiqarish uchun odatda maxsus maqsadli kompaniya tuziladi. U aktivlarni saqlaydi, investorlar nomidan ish yuritadi va daromadni taqsimlaydi. Bozor ishtirokchilari fikricha, Oʻzbekistonda bunday tuzilmalar uchun qonunchilikka qoʻshimcha meʼyoriy hujjatlar kerak boʻlishi mumkin. Har bir emissiya uchun [[shariat-kengashi|shariat kengashi]] xulosasi alohida beriladi.',
      },
    ],
    sources: [
      { title: 'AAOIFI Shariat standarti № 17 «Investitsion sukuk»', publisher: 'AAOIFI', type: 'document' },
      LAW,
      EDITORIAL,
    ],
  },

  // ── iz-05 ────────────────────────────────────────────────────────────────
  {
    id: 'iz-05',
    slug: 'takaful-sugurta-qanday-ishlaydi',
    rubric: 'izoh',
    kicker: 'Sugʻurta',
    title: 'Takaful qanday ishlaydi?',
    lead: 'Takafulda ishtirokchilar umumiy fondga badal qoʻshib, bir-birining zararini qoplashga kelishadi. Operator fondni boshqaradi, lekin uning egasi emas — anʼanaviy sugʻurtadan asosiy farq shunda.',
    authors: ['aziza-rahimova'],
    publishedAt: '2026-09-30T10:00:00+05:00',
    image: img('glassTower', { caption: 'Ofis minorasi. Takaful operatori fondni boshqaradi, ammo ishtirokchilar badallari uning mulkiga aylanmaydi' }),
    tags: ['takaful', 'litsenziyalash', 'standartlar'],
    terms: ['takaful', 'garar', 'maysir', 'shariat-skriningi', 'shariat-kengashi', 'vakola', 'muzoraba', 'qarzi-hasan', 'retakaful'],
    views: 3940,
    body: [
      {
        type: 'p',
        text: '[[takaful|Takaful]] — islom moliyasidagi sugʻurta modeli. Atama «kafolat» soʻzi bilan bir oʻzakdan boʻlib, «oʻzaro kafolatlash» maʼnosini beradi. Uning asosida oʻzaro yordam tamoyili yotadi: bir xil xatarga duch keladigan odamlar yoki kompaniyalar umumiy fond tuzadi va zarar koʻrgan ishtirokchiga shu fonddan tovon toʻlanadi. Oʻzbekistonda hozircha takaful boʻyicha litsenziya berilmagan, lekin bir nechta operator ariza topshirgan yoki niyatini eʼlon qilgan.',
      },
      { type: 'h2', text: 'Anʼanaviy sugʻurtadan farqi' },
      {
        type: 'p',
        text: 'Anʼanaviy sugʻurtada mijoz sugʻurta mukofotini toʻlaydi va bu pul sugʻurta kompaniyasining mulkiga aylanadi. Kompaniya xatarni oʻz zimmasiga oladi: zarar kam boʻlsa, foyda kompaniyada qoladi. Islom moliyasi tamoyillari nuqtai nazaridan bunday tuzilmada ikki unsur muammoli hisoblanadi — natijasi ortiqcha noaniq bitim ([[garar|gʻarar]]) va tasodifga bogʻliq yutuq yoki yoʻqotish ([[maysir|maysir]]). Bundan tashqari, anʼanaviy sugʻurtachilar mablagʻlarining katta qismini foizli obligatsiyalarga joylashtiradi.',
      },
      {
        type: 'p',
        text: 'Takafulda esa xatar ishtirokchilar oʻrtasida taqsimlanadi. Badallar operatorning emas, ishtirokchilar fondining mulki hisoblanadi, ishtirokchilar esa bir vaqtning oʻzida ham yordam beruvchi, ham yordam oluvchi boʻladi. Fonddan zararlar qoplanadi, boʻsh mablagʻlar esa faqat [[shariat-skriningi|shariat skriningi]]dan oʻtgan aktivlarga joylashtiriladi. Mahsulot shartlari va investitsiya siyosatini operatorning [[shariat-kengashi|shariat kengashi]] koʻrib chiqadi.',
      },
      {
        type: 'table',
        caption: 'Anʼanaviy sugʻurta va takaful',
        columns: [{ label: 'Mezon' }, { label: 'Anʼanaviy sugʻurta' }, { label: 'Takaful' }],
        rows: [
          ['Toʻlov tabiati', 'Mukofot — kompaniya mulki', 'Badal — ishtirokchilar fondiga'],
          ['Xatar', 'Sugʻurtachiga oʻtkaziladi', 'Ishtirokchilar oʻrtasida taqsimlanadi'],
          ['Fond ortiqchasi', 'Kompaniya foydasi', 'Ishtirokchilarga qaytarilishi yoki fondda qoldirilishi mumkin'],
          ['Investitsiyalar', 'Har qanday, shu jumladan foizli', 'Faqat shariat skriningidan oʻtgan aktivlar'],
          ['Operator daromadi', 'Sugʻurta va investitsiya foydasi', 'Vakola haqi yoki investitsiya foydasidan ulush'],
        ],
        source: 'Muomalat tahririyati',
      },
      { type: 'term', slug: 'takaful' },
      { type: 'h2', text: 'Operator qanday daromad oladi' },
      {
        type: 'p',
        text: 'Operator fondni boshqargani uchun haq oladi. Amalda bir nechta model qoʻllaniladi:',
      },
      {
        type: 'list',
        items: [
          '**Vakola modeli.** Operator ishtirokchilarning [[vakola|vakili]] sifatida ishlaydi va badallardan oldindan kelishilgan ulushda boshqaruv haqi oladi.',
          '**Muzoraba modeli.** Operator fond mablagʻlarini investitsiya qiladi va olingan foydadan kelishilgan ulushni oladi — bu [[muzoraba|muzoraba]] shartnomasiga asoslanadi.',
          '**Aralash model.** Sugʻurta faoliyati uchun vakola haqi, investitsiya faoliyati uchun esa foyda ulushi olinadi. Xalqaro bozorda bu model eng keng tarqalgan.',
        ],
      },
      {
        type: 'p',
        text: 'Agar yil davomida zararlar fond mablagʻidan oshib ketsa, operator fondga [[qarzi-hasan|qarzi hasan]], yaʼni foizsiz qarz beradi va u keyingi yillar ortiqchasi hisobidan qaytariladi. Qarzi hasan operatorning fond oldidagi majburiyati boʻlib, operator undan daromad olmaydi. Yirik xatarlar esa [[retakaful|retakaful]] orqali qayta sugʻurtalanadi.',
      },
      { type: 'h2', text: 'Shartli misol' },
      {
        type: 'p',
        text: 'Aytaylik, 1 000 nafar tadbirkor avtomobillarini sugʻurtalash uchun har biri 2 mln soʻmdan badal toʻladi va fondda 2 mlrd soʻm yigʻildi. Operator vakola haqi sifatida badallarning 20 foizini, yaʼni 400 mln soʻmni oladi. Yil davomida zararlar uchun 1,2 mlrd soʻm toʻlandi. Fondda qolgan 400 mln soʻm ortiqcha mablagʻ hisoblanadi: shartnomaga koʻra u ishtirokchilarga qaytarilishi, keyingi yil badallaridan chegirilishi yoki zaxira sifatida fondda qoldirilishi mumkin. Anʼanaviy sugʻurtada bu summa kompaniya foydasi boʻlardi.',
      },
      {
        type: 'p',
        text: 'Misol shartli. Amalda ortiqcha mablagʻni taqsimlash tartibi, operator haqi va zaxira miqdori har bir operatorning shartnomasi va shariat kengashi qarori bilan belgilanadi. Shuning uchun mijoz shartnomani imzolashdan oldin aynan shu bandlarni soʻrashi kerak: ortiqcha mablagʻ qanday taqsimlanadi, operator qancha haq oladi va fond yetishmasa nima boʻladi.',
      },
      {
        type: 'callout',
        title: 'Maʼlumot uchun',
        text: 'Takaful odatda ikki yoʻnalishga boʻlinadi: umumiy takaful (mulk, transport, yuk) va oilaviy takaful (hayot va sogʻliq bilan bogʻliq jamgʻarma mahsulotlari). Islom banklari va lizing kompaniyalari ijaraga berilgan mulkni sugʻurtalash uchun takaful operatorlariga ehtiyoj sezadi. Uy-joy moliyalashtirishda ham mulkni sugʻurtalash talab etiladi, shuning uchun bu bozorning rivoji butun tarmoq uchun muhim. Operatorlarning litsenziya holati [bozor xaritasida](/xarita) koʻrsatiladi.',
      },
    ],
    sources: [
      LAW,
      { title: 'AAOIFI shariat standartlari (umumiy qoidalar)', publisher: 'AAOIFI', type: 'document' },
      EDITORIAL,
    ],
  },

  // ── iz-06 ────────────────────────────────────────────────────────────────
  {
    id: 'iz-06',
    slug: 'shariat-kengashi-nima-qiladi-va-nima-qilmaydi',
    rubric: 'izoh',
    kicker: 'Shariat boshqaruvi',
    title: 'Shariat kengashi nima qiladi — va nima qilmaydi?',
    lead: 'Shariat kengashi moliya tashkiloti mahsulotlari va bitimlarining shariat standartlariga muvofiqligi haqida xulosa beradi. U bankni boshqarmaydi, regulyator oʻrnini bosmaydi va mijoz pulini kafolatlamaydi.',
    authors: ['tahririyat'],
    publishedAt: '2026-10-02T09:30:00+05:00',
    image: img('meetingTable', { caption: 'Muzokaralar stoli. Shariat kengashi yigʻilishlarida mahsulot hujjatlari bandma-band koʻrib chiqiladi' }),
    tags: ['shariat-kengashi', 'standartlar', 'regulyator'],
    terms: ['shariat-kengashi', 'aaoifi', 'ifsb', 'daromadni-tozalash'],
    views: 6810,
    related: ['iv-03', 'iz-01'],
    body: [
      {
        type: 'p',
        text: 'Islom moliyasi xizmatini koʻrsatayotgan har bir tashkilot faoliyatida [[shariat-kengashi|shariat kengashi]] markaziy oʻrin tutadi. Oʻzbekistonda litsenziya olgan tashkilotlar oʻz kengashlarini shakllantirgan, ariza topshirganlar esa bu ishni davom ettirmoqda. Biroq kengash nima uchun javob berishi va uning vakolati qayerda tugashi haqida tasavvurlar hali turlicha.',
      },
      { type: 'term', slug: 'shariat-kengashi' },
      {
        type: 'p',
        text: 'Kengash odatda uch-besh aʼzodan iborat boʻlib, ular orasida islom tijorat huquqi, moliya va buxgalteriya boʻyicha mutaxassislar bor. Yigʻilishlar bayonnoma bilan rasmiylashtiriladi, xulosalar esa asoslangan holda yoziladi.',
      },
      { type: 'h2', text: 'Kengash nima qiladi' },
      {
        type: 'list',
        items: [
          'Mahsulotlar ishga tushishidan oldin ularning tuzilmasi, shartnoma shablonlari va jarayonlarini koʻrib chiqadi, maʼqullaydi yoki oʻzgartirish talab qiladi.',
          'Tashkilot qaysi standartlarga, masalan, [[aaoifi|AAOIFI]] shariat standartlariga tayanishini belgilashda ishtirok etadi.',
          'Ichki shariat nazorati va tashqi shariat auditi hisobotlarini koʻrib chiqadi.',
          'Maʼqullangan tartib buzilgan operatsiyalardan olingan daromadni [[daromadni-tozalash|tozalash]] tartibini belgilaydi.',
          'Yil yakunida aksiyadorlar va jamoatchilik uchun shariat hisobotini tayyorlaydi.',
        ],
      },
      { type: 'h2', text: 'Kengash nima qilmaydi' },
      {
        type: 'p',
        text: 'Kengash tashkilotni boshqarmaydi: moliyalashtirish siyosati, xodimlar va strategiya ijroiya boshqaruv vakolatida. Kengash narxlarni ham belgilamaydi: ustama yoki ijara toʻlovi miqdori bozor va tashkilot siyosatiga bogʻliq, kengash faqat narxlash usuli maʼqullangan tuzilmaga mosligini koʻradi. U har bir mijozning bitimini alohida tasdiqlamaydi — kundalik nazorat ichki shariat nazorati boʻlinmasi zimmasida. Kengash xulosasi tashkilotning moliyaviy barqarorligini yoki mijoz mablagʻlari saqlanishini kafolatlamaydi: bu regulyator nazorati va tashkilot kapitali bilan bogʻliq masala. Nihoyat, kengash boshqa tashkilotlar mahsulotlari haqida xulosa bermaydi — uning vakolati oʻz tashkiloti bilan chegaralangan.',
      },
      {
        type: 'table',
        caption: 'Kim nima uchun javob beradi',
        columns: [{ label: 'Ishtirokchi' }, { label: 'Vazifasi' }],
        rows: [
          ['Shariat kengashi', 'Mahsulot va bitimlarning shariat standartlariga muvofiqligi haqida xulosa'],
          ['Ichki shariat nazorati', 'Operatsiyalar maʼqullangan tartibda bajarilishini kundalik tekshirish'],
          ['Tashkilot boshqaruvi', 'Strategiya, narxlar, xatarlar va mijozlarga xizmat koʻrsatish'],
          ['Regulyator', 'Litsenziyalash, qonun talablari va moliyaviy barqarorlik nazorati'],
          ['Tashqi auditor', 'Moliyaviy hisobot, alohida topshiriq boʻyicha shariat auditi'],
        ],
        source: 'Muomalat tahririyati',
      },
      {
        type: 'p',
        text: 'Xalqaro amaliyotda kengash mustaqilligiga alohida eʼtibor beriladi: aʼzolarni odatda aksiyadorlar yigʻilishi tayinlaydi, ular tashkilotda ijrochi lavozimda ishlamaydi. [[aaoifi|AAOIFI]]ning boshqaruv standartlari va [[ifsb|IFSB]]ning shariat boshqaruvi boʻyicha tamoyillari shu masalalarni tartibga soladi.',
      },
      { type: 'h2', text: 'Mijoz uchun ahamiyati' },
      {
        type: 'p',
        text: 'Mijoz uchun kengashning eng amaliy ahamiyati — savol va shikoyatlar uchun manzil. Agar bitim maʼqullangan tartibda bajarilmayapti deb hisoblasangiz, masalan, bank tovarni sotib olmasdan oldin sotish shartnomasini imzolashni taklif qilsa, bu haqda tashkilotning ichki shariat nazorati boʻlinmasiga yozma murojaat qilish mumkin. Koʻp tashkilotlar kengash xulosalari va yillik shariat hisobotini ochiq eʼlon qiladi. Bunday maʼlumot topilmasa, uni soʻrash oʻrinli.',
      },
      { type: 'h2', text: 'Muomalat nimani yozadi — va nimani yozmaydi' },
      {
        type: 'p',
        text: 'Muomalat — moliyaviy va ishbilarmonlik nashri. U faktlarni xabar qiladi, diniy hukm yoki diniy xulosa chiqarmaydi. Biror mahsulot yoki bitim shariat talablariga mos keladimi, degan savolga javob berish har bir tashkilotning oʻz shariat kengashi vakolatiga kiradi. Shu sababli nashr materiallarida mahsulotlarga «muvofiq» yoki «muvofiq emas» degan baho berilmaydi. Buning oʻrniga «bankning shariat kengashi mahsulotni maʼqulladi» kabi manbasi koʻrsatilgan faktlar keltiriladi.',
      },
      {
        type: 'p',
        text: 'Muomalat kengash tarkibi, xulosalar eʼlon qilingan-qilinmagani, shariat hisoboti chiqarilgani, tozalangan daromad miqdori kabi tekshirib boʻladigan maʼlumotlarni soʻraydi va eʼlon qiladi. Turli tashkilotlar kengashlari bir masalada turlicha xulosaga kelsa, nashr har birining pozitsiyasini manbasi bilan keltiradi va qaysi biri toʻgʻri ekanini baholamaydi. Bu oshkoralik masalasi, diniy baho emas.',
      },
      {
        type: 'callout',
        title: 'Tahririyat tamoyili',
        text: 'Muomalat diniy hukm chiqarmaydi va mahsulotlarning shariatga muvofiqligi haqida oʻz bahosini bermaydi. Muvofiqlik haqidagi qaror — tegishli tashkilot shariat kengashining vakolati. Savolingiz boʻlsa, mahsulotni taklif qilayotgan tashkilotdan uning shariat kengashi xulosasini soʻrang.',
      },
    ],
    sources: [
      { title: 'AAOIFI boshqaruv standartlari (umumiy qoidalar)', publisher: 'AAOIFI', type: 'document' },
      LAW,
      { title: 'Muomalat tahririyat siyosati', publisher: 'Muomalat', type: 'document' },
    ],
  },

  // ── iz-07 (hamkorlik materiali) ─────────────────────────────────────────
  {
    id: 'iz-07',
    slug: 'ijora-orqali-uskuna-ishlab-chiqaruvchi-besh-qadam',
    rubric: 'izoh',
    kicker: 'Hamkorlik materiali',
    title: 'Ijora orqali uskuna: kichik ishlab chiqaruvchi uchun besh qadam',
    lead: 'Lizing kompaniyasi N islom moliyasi tamoyillari asosida uskunani moliyalashtirish jarayonini tushuntiradi: ehtiyojni aniqlashdan mulk huquqini olishgacha.',
    authors: ['hamkorlik'],
    publishedAt: '2026-10-04T12:00:00+05:00',
    image: img('workshop', { caption: 'Kichik ishlab chiqarish sexi. Ijora asosida olingan dastgoh toʻlovlar yakunlangach mijoz mulkiga oʻtadi' }),
    tags: ['ijora', 'lizing', 'kichik-biznes'],
    terms: ['ijora', 'vad', 'ijora-muntahiya-bittamlik', 'kafolat', 'shariat-kengashi'],
    views: 2580,
    sponsored: {
      partner: 'Lizing kompaniyasi N',
      disclosure: 'Ushbu material Lizing kompaniyasi N buyurtmasi asosida tijorat boʻlimi tomonidan tayyorlangan. Tahririyat uni yozish va tahrir qilishda ishtirok etmagan.',
    },
    related: ['iz-03', 'iv-02'],
    body: [
      {
        type: 'p',
        text: 'Lizing kompaniyasi N islom moliyasi xizmatlari uchun litsenziya olgan va qishloq xoʻjaligi hamda ishlab chiqarish uskunalarini [[ijora|ijora]] asosida moliyalashtiradi. Kompaniya maʼlumotiga koʻra, murojaat qilayotgan mijozlarning aksariyati 10 dan 100 kishigacha xodimi boʻlgan kichik va oʻrta ishlab chiqaruvchilardir. Kompaniya Toshkentda joylashgan, viloyatlardagi mijozlar bilan masofadan va sayyor uchrashuvlar orqali ishlaydi.',
      },
      {
        type: 'p',
        text: 'Ijorada uskuna muddat davomida kompaniyaning mulki boʻlib qoladi, mijoz esa undan foydalanib, kelishilgan ijara toʻlovini toʻlaydi. Quyida kompaniya mutaxassislari tavsiya etgan besh qadam keltirilgan.',
      },
      { type: 'h2', text: 'Besh qadam' },
      {
        type: 'list',
        ordered: true,
        items: [
          '**Ehtiyoj va yetkazib beruvchini aniqlang.** Qaysi uskuna kerakligini va u ishlab chiqarishni qanchaga oshirishini hisoblang, kamida bitta yetkazib beruvchidan tijorat taklifini oling. Yetkazib beruvchini uskunani lizing kompaniyasi sotib olishi haqida oldindan ogohlantiring.',
          '**Ariza topshiring.** Arizaga moliyaviy hisobotlar, biznes reja va tijorat taklifi ilova qilinadi. Kompaniya mutaxassisi korxonaga borib, uskuna oʻrnatiladigan joyni koʻzdan kechiradi.',
          '**Shartlarni kelishing.** Kompaniya ijara muddati, boshlangʻich toʻlov va ijara toʻlovlari jadvalini taklif qiladi. Mijoz uskunani ijaraga olish va muddat oxirida sotib olish haqida [[vad|vaʼda]] beradi.',
          '**Kompaniya uskunani sotib oladi.** Uskuna kompaniya nomiga xarid qilinadi, yetkaziladi va oʻrnatiladi. Ijara toʻlovlari uskuna foydalanishga topshirilgandan keyin boshlanadi.',
          '**Foydalaning va mulkka ega boʻling.** Muddat davomida mijoz kundalik texnik xizmatni taʼminlaydi, kompaniya esa mulkdor sifatida yirik taʼmir va sugʻurta uchun javob beradi. Barcha toʻlovlar yakunlangach, uskuna alohida shartnoma asosida mijozga oʻtkaziladi.',
        ],
      },
      {
        type: 'p',
        text: 'Kompaniya mutaxassislari birinchi qadamga alohida eʼtibor berishni maslahat beradi: uskunaning ishlab chiqarishga taʼsirini raqamlarda koʻrsata olgan korxona arizasi tezroq koʻrib chiqiladi. Masalan, yangi dastgoh mahsulot tannarxini qanchaga kamaytirishi yoki oylik ishlab chiqarishni necha birlikka oshirishi hisoblab chiqilgan boʻlsa, toʻlov jadvalini ham shu daromadga moslash osonlashadi.',
      },
      { type: 'term', slug: 'ijora-muntahiya-bittamlik' },
      {
        type: 'callout',
        title: 'Qanday hujjatlar kerak',
        text: 'Kompaniya maʼlumotiga koʻra, ariza uchun quyidagilar talab qilinadi: korxonaning taʼsis hujjatlari va davlat roʻyxatidan oʻtganlik guvohnomasi; oxirgi ikki yillik moliyaviy va soliq hisobotlari; bank hisobvaragʻi boʻyicha oxirgi 12 oylik koʻchirma; biznes reja yoki loyihaning qisqacha iqtisodiy asoslanishi; yetkazib beruvchining tijorat taklifi; uskuna oʻrnatiladigan bino yoki sexga egalik yoxud ijara hujjati. Ayrim hollarda taʼsischining shaxsiy [[kafolat|kafolati]] soʻraladi.',
      },
      { type: 'h2', text: 'Toʻlov shartlari' },
      {
        type: 'p',
        text: 'Kompaniya maʼlumotiga koʻra, boshlangʻich toʻlov loyiha xatariga qarab uskuna qiymatining 15–30 foizi atrofida belgilanadi, ijara muddati 12 oydan 60 oygacha. Toʻlovlar odatda oylik, qishloq xoʻjaligi korxonalari uchun esa choraklik yoki hosil yigʻish davriga moslashtirilgan boʻlishi mumkin. Uskuna sugʻurtasini kompaniya mulkdor sifatida oʻzi rasmiylashtiradi, yetkazib beruvchi bilan kafolat muddati va servis xizmati shartlarini ham kelishadi.',
      },
      { type: 'h2', text: 'Jarayon qancha vaqt oladi' },
      {
        type: 'table',
        caption: 'Bosqichlar boʻyicha taxminiy muddatlar',
        columns: [{ label: 'Bosqich' }, { label: 'Taxminiy muddat' }, { label: 'Javobgar' }],
        rows: [
          ['Ariza va hujjatlarni koʻrib chiqish', '2–3 hafta', 'Lizing kompaniyasi'],
          ['Shartlarni kelishish va imzolash', '1 hafta', 'Kompaniya va mijoz'],
          ['Uskunani xarid qilish va yetkazish', '2–8 hafta', 'Kompaniya va yetkazib beruvchi'],
          ['Oʻrnatish va foydalanishga topshirish', '1–2 hafta', 'Yetkazib beruvchi va mijoz'],
        ],
        note: 'Import qilinadigan uskunalar uchun bojxona rasmiylashtiruvi muddatga qoʻshiladi.',
        source: 'Lizing kompaniyasi N maʼlumotlari',
      },
      { type: 'h2', text: 'Nimalarga eʼtibor berish kerak' },
      {
        type: 'p',
        text: 'Kompaniya mutaxassislarining taʼkidlashicha, jarayonni eng koʻp kechiktiradigan omil — yetkazib beruvchi hujjatlari. Shartnoma, hisob-faktura va bojxona hujjatlari lizing kompaniyasi nomiga rasmiylashtirilishi kerak. Ikkinchi omil — korxona hisobotlaridagi nomuvofiqlik: soliq hisobotlari va boshqaruv hisobi bir-biriga mos kelmasa, koʻrib chiqish choʻziladi. Uchinchi omil — sexning tayyorligi: elektr quvvati, maydon va poydevor uskuna talablariga javob berishini oldindan tekshirish tavsiya etiladi.',
      },
      {
        type: 'p',
        text: 'Kompaniyaning ijora shartnomalari uning [[shariat-kengashi|shariat kengashi]] tomonidan maʼqullangan. Kechiktirilgan toʻlovlar uchun shartnomada nazarda tutilgan toʻlov kompaniya daromadiga kiritilmaydi va kengash tasdiqlagan tartibda xayriya maqsadlariga yoʻnaltiriladi. Uskunani muddatidan oldin sotib olish imkoniyati va uning shartlari shartnomada alohida koʻrsatiladi.',
      },
    ],
    sources: [{ title: 'Kompaniya taqdimoti', publisher: 'Lizing kompaniyasi N', date: '2026-10-01', type: 'report' }],
  },
]
