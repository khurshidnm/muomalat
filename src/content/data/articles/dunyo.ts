import type { Article } from '../../types'
import { img } from '../images'

/** «Dunyo» rubric: international Islamic finance markets and their relevance for Uzbekistan. */
export const dunyo: Article[] = [
  {
    id: 'dn-01',
    slug: 'sukuk-emissiyasi-toqqiz-oyda-oshdi',
    rubric: 'dunyo',
    kicker: 'Sukuk bozori',
    title: 'Jahon sukuk emissiyasi 2026-yilning toʻqqiz oyida 8,6 foizga oshdi',
    lead: 'Bozor ishtirokchilari baholashicha, yanvar–sentabrda dunyo boʻyicha 201 mlrd dollarlik sukuk chiqarildi. Oʻsishni Fors koʻrfazi va Janubi-Sharqiy Osiyodagi suveren emitentlar hamda yashil sukuklar taʼminladi.',
    authors: ['bekzod-nazarov'],
    publishedAt: '2026-10-08T12:10:00+05:00',
    image: img('chartCandles', {
      caption: 'Qimmatli qogʻozlar kotirovkalari grafigi. Sukuk bozori yil boshidan buyon oʻsib bormoqda.',
    }),
    tags: ['sukuk', 'xalqaro-bozorlar', 'kapital-bozori', 'bozor-korsatkichlari'],
    terms: ['sukuk', 'ijora', 'vakola', 'aaoifi'],
    related: ['dn-06', 'dn-03'],
    views: 8420,
    body: [
      {
        type: 'p',
        text: 'Jahon [[sukuk|sukuk]] bozorida 2026-yilning yanvar–sentabr oylarida emissiya hajmi qariyb 201 mlrd dollarni tashkil etdi. Bu oʻtgan yilning shu davridagi 185 mlrd dollardan 8,6 foiz koʻp. Mazkur baho xalqaro bozor ishtirokchilari va investitsiya kompaniyalari tahlilchilarining hisob-kitoblariga asoslanadi; boshqa manbalarda raqamlar hisoblash uslubiga qarab farq qilishi mumkin.',
      },
      { type: 'term', slug: 'sukuk' },
      {
        type: 'p',
        text: 'Tahlilchilar oʻsishning asosiy omili sifatida suveren emitentlarni koʻrsatmoqda. Fors koʻrfazi davlatlari hukumatlari byudjet ehtiyojlarini qoplash va avval chiqarilgan qarz majburiyatlarini qayta moliyalashtirish uchun bozorga muntazam chiqdi. Janubi-Sharqiy Osiyoda Malayziya va Indoneziya ichki va xalqaro bozorlardagi rejali emissiya dasturlarini davom ettirdi. Bozor ishtirokchilari baholashicha, toʻqqiz oydagi jami hajmning qariyb 60 foizi suveren va kvazisuveren emitentlarga toʻgʻri keladi.',
      },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: 'Toʻqqiz oylik emissiya', value: '201 mlrd dollar' },
          { label: '2025-yilning shu davriga nisbatan', value: '+8,6 foiz' },
          { label: 'Suveren va kvazisuveren emitentlar ulushi', value: 'qariyb 60 foiz' },
          { label: 'Yashil va barqaror rivojlanish sukuklari', value: 'taxminan 13 mlrd dollar' },
        ],
        note: 'Bozor ishtirokchilari baholari; raqamlar taxminiy.',
      },
      { type: 'h2', text: 'Mintaqalar kesimida' },
      {
        type: 'p',
        text: 'Fors koʻrfazi davlatlari emissiya hajmi boʻyicha yetakchiligini saqlab qolmoqda: hisob-kitoblarga koʻra, umumiy hajmning 44 foizi shu mintaqaga toʻgʻri keladi. Ikkinchi oʻrinda Janubi-Sharqiy Osiyo turibdi. Turkiya hukumati va banklari asosan ichki bozorda [[ijora|ijora]] tuzilmasidagi qimmatli qogʻozlarni chiqarishda davom etmoqda, Afrika va Janubiy Osiyoda esa suveren emitentlar bozorga vaqti-vaqti bilan chiqmoqda.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'bar',
          title: 'Sukuk emissiyasi mintaqalar boʻyicha',
          subtitle: '2026-yil yanvar–sentabr',
          unit: 'mlrd dollar',
          data: [
            { label: 'Fors koʻrfazi davlatlari', value: 88, highlight: true },
            { label: 'Janubi-Sharqiy Osiyo', value: 74 },
            { label: 'Turkiya', value: 16 },
            { label: 'Afrika', value: 9 },
            { label: 'Janubiy Osiyo', value: 7 },
            { label: 'Boshqa mintaqalar', value: 7 },
          ],
          source: 'Bozor ishtirokchilari baholari asosida Muomalat hisob-kitobi',
          note: 'Raqamlar taxminiy va yaxlitlangan; ichki va xalqaro emissiyalar birga hisoblangan.',
        },
      },
      { type: 'h2', text: 'Yashil sukuk va korporativ emitentlar' },
      {
        type: 'p',
        text: 'Bozorning tez oʻsayotgan qismi — yashil va barqaror rivojlanish sukuklari. Bunday qimmatli qogʻozlardan tushgan mablagʻ qayta tiklanadigan energetika, suv taʼminoti va energiyani tejaydigan qurilish loyihalariga yoʻnaltiriladi. Tahlilchilar hisob-kitobiga koʻra, toʻqqiz oyda bunday emissiyalar hajmi taxminan 13 mlrd dollarni tashkil etgan va uning katta qismini suveren emitentlar chiqargan.',
      },
      {
        type: 'p',
        text: 'Korporativ segmentda banklarning kapitalni mustahkamlash uchun chiqargan sukuklari hamda koʻchmas mulk va infratuzilma kompaniyalarining emissiyalari ajralib turdi. Tuzilmalar orasida ijora va [[vakola|vakola]] modellari ustunlik qilmoqda: birinchisida investorlar daromadi aktivni ijaraga berishdan, ikkinchisida vakil boshqaradigan aktivlar portfelidan shakllanadi.',
      },
      {
        type: 'p',
        text: '«Investorlar sukukni birinchi navbatda emitentning kredit sifatiga qarab baholaydi. Tuzilma esa uni kim sotib olishi mumkinligini belgilaydi: islom banklari va fondlari uchun bu hal qiluvchi omil», — dedi Muomalatga xalqaro investitsiya kompaniyasi tahlilchisi Zarina Ochilova.',
      },
      {
        type: 'quote',
        text: 'Investorlar sukukni birinchi navbatda emitentning kredit sifatiga qarab baholaydi.',
        cite: 'Zarina Ochilova',
        role: 'xalqaro investitsiya kompaniyasi tahlilchisi',
      },
      { type: 'h2', text: 'Xavf omillari' },
      {
        type: 'p',
        text: 'Tahlilchilar yilning qolgan qismi uchun ehtiyotkor prognoz bermoqda. Neft narxining pasayishi Fors koʻrfazi davlatlarining qarz mablagʻlariga ehtiyojini oshirishi, ammo ayrim kvazisuveren emitentlarning bozorga chiqishini kechiktirishi mumkin. Jahon bozorlaridagi foiz stavkalari darajasi ham sukuk va anʼanaviy obligatsiyalar daromadliligiga birdek taʼsir qiladi. Bundan tashqari, emitentlar tuzilmani [[aaoifi|AAOIFI]] standartlariga, xususan № 17 «Investitsion sukuk» standartiga muvofiqlashtirish uchun qoʻshimcha vaqt va maslahatchilar xarajatini hisobga olishi kerak.',
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun iyun oyida kuchga kirdi, biroq mahalliy sukuk bozori hali shakllanmagan. Bozor ishtirokchilari fikricha, xalqaro bozorning oʻsishi va investorlarning yangi emitentlarga qiziqishi kelgusida suveren yoki korporativ sukuk chiqarish uchun qulay sharoit yaratadi. Ularning taʼkidlashicha, buning uchun kapital bozori qonunchiligi, aktivlarni maxsus kompaniyaga oʻtkazish tartibi va soliq masalalarida qoʻshimcha qarorlar kerak boʻladi. Litsenziya olayotgan islom banklari va oynalari uchun sukuk likvidlikni boshqarishning asosiy vositalaridan biriga aylanishi mumkin: hozircha ular ortiqcha mablagʻni joylashtirish uchun mos mahalliy vositalarga ega emas.',
      },
    ],
    sources: [
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-10-08', type: 'data' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-10-07', type: 'interview' },
      { title: 'AAOIFI Shariat standarti № 17 «Investitsion sukuk»', publisher: 'AAOIFI', type: 'document' },
    ],
  },
  {
    id: 'dn-02',
    slug: 'markaziy-osiyo-qoshnilarida-islom-moliyasi-osmoqda',
    rubric: 'dunyo',
    kicker: 'Mintaqa',
    title: 'Markaziy Osiyo qoʻshnilarida islom moliyasi oynalar va mikromoliya orqali oʻsmoqda',
    lead: 'Qozogʻiston, Qirgʻiziston va Tojikistonda soha qonunchiligi ancha oldin shakllangan, biroq islom moliyasining bank sektoridagi ulushi hamon kichik. Qoʻshnilar tajribasi qaysi yondashuvlar samara berganini koʻrsatadi.',
    authors: ['bekzod-nazarov'],
    publishedAt: '2026-10-06T15:20:00+05:00',
    image: img('globe', {
      caption: 'Meridian va parallellar toʻri tushirilgan globus. Markaziy Osiyo davlatlari islom moliyasini turli modellar asosida rivojlantirmoqda.',
    }),
    tags: ['xalqaro-bozorlar', 'islom-oynasi', 'mikromoliya', 'qonunchilik'],
    terms: ['islom-oynasi', 'sukuk', 'takaful', 'murobaha', 'ijora', 'mushoraka', 'shariat-kengashi'],
    related: ['dn-03', 'dn-05'],
    views: 5310,
    body: [
      {
        type: 'p',
        text: 'Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun 2026-yil iyun oyida kuchga kirgan boʻlsa, qoʻshni davlatlar bu yoʻlni ancha oldin boshlagan. Qozogʻiston, Qirgʻiziston va Tojikiston tajribasi bir-biriga oʻxshamaydi, biroq umumiy manzara aniq: qonun qabul qilish faqat birinchi qadam, bozor esa uzoq vaqt tor segmentlarda — mikromoliya, chakana savdo va kichik biznesni moliyalashtirishda — rivojlanadi.',
      },
      { type: 'h2', text: 'Qozogʻiston: qonun va moliya markazi' },
      {
        type: 'p',
        text: 'Qozogʻiston islom bank faoliyatini tartibga soluvchi qoidalarni mintaqada birinchilardan boʻlib 2000-yillarning oxirida qabul qilgan. Keyingi yillarda qonunchilikka islom moliyasi vositalari, jumladan [[sukuk|sukuk]] va [[takaful|takaful]] boʻyicha qoʻshimchalar kiritildi. Mamlakatda alohida huquqiy rejimga ega xalqaro moliya markazi tashkil etilgan boʻlib, u islom moliyasi kompaniyalari va qimmatli qogʻozlari uchun ham maydoncha vazifasini bajaradi.',
      },
      {
        type: 'p',
        text: 'Shunga qaramay, bozor ishtirokchilari baholashicha, islom moliyasi muassasalarining bank sektori aktivlaridagi ulushi bir foizdan oshmaydi. Tahlilchilar buning sabablari sifatida toʻliq islom banklari sonining kamligi, soliq qoidalarining anʼanaviy kreditga moslashtirilgani va malakali mutaxassislar yetishmasligini koʻrsatadi.',
      },
      { type: 'h2', text: 'Qirgʻiziston: oynalar modeli' },
      {
        type: 'p',
        text: 'Qirgʻizistonda islom moliyasi 2000-yillarning ikkinchi yarmida tajriba loyihasi sifatida boshlangan va keyinchalik doimiy tartibga oʻtgan. Mamlakat modelining oʻziga xos jihati — [[islom-oynasi|islom oynalari]]: anʼanaviy banklar alohida hisob yuritiladigan boʻlinmalar orqali [[murobaha|murobaha]], [[ijora|ijora]] va [[mushoraka|mushoraka]] mahsulotlarini taklif qiladi. Bu yoʻl bank uchun alohida kapital va infratuzilma talab qiladigan toʻliq islom bankini ochishdan arzonroq tushadi.',
      },
      { type: 'term', slug: 'islom-oynasi' },
      {
        type: 'p',
        text: 'Bozor ishtirokchilarining taʼkidlashicha, Qirgʻizistonda bunday mahsulotlarga talab asosan viloyatlardagi kichik tadbirkorlar va fermerlar orasida yuqori. Mikromoliya tashkilotlari chorva, qishloq xoʻjaligi texnikasi va savdo uchun tovar sotib olishni murobaha asosida moliyalashtiradi.',
      },
      { type: 'h2', text: 'Tojikiston: mikromoliyadan boshlangan bozor' },
      {
        type: 'p',
        text: 'Tojikistonda islom bank faoliyatiga oid alohida qonun 2010-yillarning oʻrtalarida qabul qilingan. Mamlakatda islom moliyasi xizmatlari asosan mikromoliya sektori va cheklangan miqdordagi bank muassasalari orqali koʻrsatiladi. Mahalliy bozorda xorijdan keladigan pul oʻtkazmalari hisobiga shakllangan aholi jamgʻarmalarini jalb qilish va ularni kichik biznesga yoʻnaltirish asosiy yoʻnalish hisoblanadi.',
      },
      { type: 'h2', text: 'Umumiy saboqlar' },
      { type: 'p', text: 'Uch mamlakat tajribasidan tahlilchilar bir nechta umumiy xulosa chiqaradi.' },
      {
        type: 'list',
        items: [
          '**Soliq neytralligi.** Murobahada bank tovarni avval sotib oladi, keyin mijozga sotadi. Agar soliq qoidalari moslashtirilmasa, bitta bitim uchun qoʻshilgan qiymat soligʻi ikki marta hisoblanishi mumkin.',
          '**Oynalar — bozorga tezroq kirish yoʻli.** Anʼanaviy banklarning islom oynalari bozorni toʻliq islom banklariga qaraganda tezroq kengaytiradi, lekin mablagʻlarni ajratish va alohida hisobot yuritish talablari qatʼiy nazorat qilinishi kerak.',
          '**Shariat boshqaruvi.** Har bir muassasada [[shariat-kengashi|shariat kengashi]] boʻlishi va milliy darajada yagona yondashuv mavjudligi mahsulotlar boʻyicha turli talqinlarni kamaytiradi.',
          '**Kadrlar.** Islom moliyasi boʻyicha malakali mutaxassislar yetishmasligi uch davlatda ham oʻsishni cheklovchi omil boʻlib qolmoqda.',
        ],
      },
      {
        type: 'p',
        text: '«Qoʻshnilar tajribasi shuni koʻrsatadiki, qonun qabul qilinganidan keyin ham bozor oʻz-oʻzidan oʻsmaydi. Soliq, buxgalteriya hisobi va kadrlar masalasi birinchi yillardayoq hal qilinishi kerak», — dedi Toshkentdagi konsalting kompaniyasining islom moliyasi boʻyicha maslahatchisi Feruza Abdullayeva.',
      },
      {
        type: 'quote',
        text: 'Qonun qabul qilinganidan keyin ham bozor oʻz-oʻzidan oʻsmaydi.',
        cite: 'Feruza Abdullayeva',
        role: 'konsalting kompaniyasining islom moliyasi boʻyicha maslahatchisi',
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Oʻzbekiston aholi soni boʻyicha mintaqadagi eng yirik bozor, shu sababli mahalliy banklar va xorijiy investorlar bu yerda tezroq natija kutmoqda. Avgust oyida Tijorat banki D islom oynasi uchun litsenziya oldi, sentabrda esa Islom banki A mamlakatdagi birinchi toʻliq islom banki sifatida ruxsatnomaga ega boʻldi. Mikromoliya tashkiloti K, Lizing kompaniyasi N va Lizing kompaniyasi O ham litsenziya olgan, yana bir qator muassasalarning arizalari koʻrib chiqilmoqda. Qoʻshnilar tajribasi soliq neytralligi, oynalar uchun hisobot talablari va mutaxassislar tayyorlash masalalarini birinchi bosqichda hal qilish muhimligini koʻrsatadi. Litsenziyalar holatini Muomalatning [bozor xaritasida](/xarita) kuzatish mumkin.',
      },
    ],
    sources: [
      { title: 'Islom bank faoliyati toʻgʻrisidagi qonun', publisher: 'Qonunchilik maʼlumotlari milliy bazasi', type: 'document' },
      { title: 'Qoʻshni davlatlarning ochiq qonunchilik maʼlumotlari', publisher: 'Qozogʻiston, Qirgʻiziston va Tojikiston qonunchilik bazalari', type: 'document' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-10-05', type: 'interview' },
      { title: 'Litsenziyalar xaritasi', publisher: 'Muomalat', url: '/xarita', type: 'data' },
    ],
  },
  {
    id: 'dn-03',
    slug: 'fors-korfazi-banklari-markaziy-osiyoni-organmoqda',
    rubric: 'dunyo',
    kicker: 'Investitsiyalar',
    title: 'Fors koʻrfazidagi bir nechta bank Markaziy Osiyo bozorini oʻrganmoqda',
    lead: 'Bozor ishtirokchilari maʼlumotiga koʻra, Koʻrfaz banklari oʻzbek banklari bilan korrespondentlik munosabatlari, savdoni moliyalashtirish va mahalliy muassasalardan ulush olish imkoniyatini muhokama qilmoqda.',
    authors: ['bekzod-nazarov'],
    publishedAt: '2026-10-04T10:40:00+05:00',
    image: img('containers', {
      caption: 'Logistika terminalidagi yuk konteynerlari. Savdoni moliyalashtirish Koʻrfaz banklari qiziqayotgan asosiy yoʻnalishlardan biri.',
    }),
    tags: ['xalqaro-bozorlar', 'investitsiyalar', 'islom-oynasi'],
    terms: ['islom-oynasi', 'murobaha', 'kafolat', 'vakola', 'tavarruq', 'aaoifi', 'shariat-kengashi', 'ijora'],
    related: ['dn-02', 'dn-06'],
    views: 11240,
    body: [
      {
        type: 'p',
        text: 'Fors koʻrfazidagi bir nechta bank Oʻzbekiston va qoʻshni davlatlar bozorini oʻrganmoqda. Bu haqda Muomalatga muzokaralardan xabardor uchta bozor ishtirokchisi maʼlum qildi. Ularning soʻzlariga koʻra, muhokamalar dastlabki bosqichda: hozircha hech qanday bitim imzolanmagan, banklarning nomi oshkor qilinmagan.',
      },
      {
        type: 'p',
        text: 'Suhbatdoshlar qiziqishni Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun iyun oyida kuchga kirgani bilan bogʻlamoqda. Sentabrda Islom banki A birinchi boʻlib toʻliq islom banki litsenziyasini oldi, Tijorat banki D esa avgust oyida [[islom-oynasi|islom oynasini]] ochishga ruxsat olgan edi. Bozor ishtirokchilari fikricha, xorijiy hamkorlar uchun aynan shunday aniq qadamlar — berilgan litsenziyalar va amalda ishlayotgan mahsulotlar — muhim signal hisoblanadi.',
      },
      { type: 'h2', text: 'Uchta yoʻnalish' },
      { type: 'p', text: 'Bozor ishtirokchilarining aytishicha, Koʻrfaz banklari uchta yoʻnalishni koʻrib chiqmoqda.' },
      {
        type: 'list',
        ordered: true,
        items: [
          '**Korrespondentlik munosabatlari.** Oʻzbek banklari uchun xorijiy valyutadagi toʻlov va hisob-kitoblarni islom moliyasi tamoyillariga muvofiq yuritish imkoniyati. Hozir mahalliy banklar bunday operatsiyalarni asosan anʼanaviy xorijiy banklar orqali amalga oshiradi.',
          '**Savdoni moliyalashtirish.** Import va eksport bitimlarini [[murobaha|murobaha]] asosida moliyalashtirish, akkreditivlar ochish va bank [[kafolat|kafolatlarini]] berish. Koʻrfaz mamlakatlari bilan savdo aylanmasi oʻsib borayotgan bir paytda bu kompaniyalar uchun yangi moliyalashtirish manbai boʻlishi mumkin.',
          '**Kapitalda ishtirok.** Litsenziya olayotgan yoki olishni rejalashtirayotgan mahalliy muassasalardan ulush sotib olish yoki yangi loyihalarda hamkor sifatida qatnashish.',
        ],
      },
      {
        type: 'p',
        text: 'Banklararo likvidlikni boshqarish ham muhokama qilinayotgan mavzular qatorida. Islom banklari va oynalari ortiqcha mablagʻni foizli depozitlarga joylashtira olmaydi, shu sababli xorijiy hamkorlar bilan [[vakola|vakola]] yoki [[tavarruq|tovar murobahasi]] kabi tuzilmalar orqali qisqa muddatli joylashtirish imkoniyati mahalliy bozor uchun dolzarb.',
      },
      {
        type: 'p',
        text: '«Koʻrfaz banklari uchun Markaziy Osiyo — yangi, lekin tushunarli bozor. Ular bu yerda avvalo savdo oqimlarini kuzatadi: import qiluvchi kompaniyalarga moliyalashtirish taklif qilish bozorga kirishning eng kam xavfli usuli», — dedi Toshkentdagi investitsiya kompaniyasi hamkori Javohir Mirzayev.',
      },
      {
        type: 'quote',
        text: 'Import qiluvchi kompaniyalarga moliyalashtirish taklif qilish bozorga kirishning eng kam xavfli usuli.',
        cite: 'Javohir Mirzayev',
        role: 'investitsiya kompaniyasi hamkori',
      },
      { type: 'h2', text: 'Toʻsiqlar' },
      {
        type: 'p',
        text: 'Suhbatdoshlar muzokaralar tez yakunlanishini kutmayotganini taʼkidladi. Xorijiy banklar uchun mahalliy hamkorlarni har tomonlama tekshirish, jinoiy daromadlarni legallashtirishga qarshi kurash talablariga muvofiqlikni baholash va valyuta konvertatsiyasi bilan bogʻliq xavflarni oʻrganish bir necha oy vaqt oladi.',
      },
      {
        type: 'p',
        text: 'Yana bir masala — standartlar. Koʻrfaz banklari asosan [[aaoifi|AAOIFI]] standartlari va oʻz [[shariat-kengashi|shariat kengashlari]] qarorlariga tayanadi. Hamkorlik uchun oʻzbek muassasalarining mahsulotlari va hujjatlari ham shunga oʻxshash talablarga javob berishi kerak boʻladi. Bundan tashqari, xorijiy sheriklar murobaha va [[ijora|ijora]] shartnomalarining mahalliy sudlarda qanday talqin qilinishini, soliq qoidalari bunday bitimlarga qanday qoʻllanishini aniqlashtirmoqchi.',
      },
      {
        type: 'p',
        text: 'Bozor ishtirokchilari xorijiy kapital ishtirokida tashkil etilishi eʼlon qilingan Islom banki C loyihasini ham kuzatayotganini aytdi, biroq u bilan bogʻliq muzokaralar haqida maʼlumot bermadi.',
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Koʻrfaz banklari bilan korrespondentlik va savdoni moliyalashtirish aloqalari mahalliy islom banklari va oynalari uchun xorijiy valyutadagi resurslar manbalarini kengaytiradi, importchi va eksportchi kompaniyalarga esa islom moliyasi tamoyillariga mos yangi vositalarni taklif qiladi. Kapitalda ishtirok xorijiy tajriba va boshqaruv amaliyotini olib kirishi mumkin. Biroq bozor ishtirokchilari taʼkidlashicha, buning uchun mahalliy muassasalar xalqaro standartlarga mos hisobot, ochiq korporativ boshqaruv va mustaqil shariat nazoratini yoʻlga qoʻyishi kerak.',
      },
    ],
    sources: [
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-10-03', type: 'interview' },
      { title: 'Regulyatorning rasmiy xabari', publisher: 'Bank regulyatori', date: '2026-09-18', type: 'press' },
      { title: 'Islom bank faoliyati toʻgʻrisidagi qonun', publisher: 'Qonunchilik maʼlumotlari milliy bazasi', type: 'document' },
    ],
  },
  {
    id: 'dn-04',
    slug: 'malayziya-takaful-modeli-uchta-saboq',
    rubric: 'dunyo',
    kicker: 'Takaful',
    title: 'Malayziya takaful modeli: Oʻzbekiston bozori uchun uchta saboq',
    lead: 'Malayziya aniq regulyatsiya, bank tarmogʻi orqali sotuv va oilaviy takafulga tayanib, sohaning yirik bozorlaridan birini yaratdi. Oʻzbekistonda esa hali birorta takaful operatori litsenziya olmagan.',
    authors: ['bekzod-nazarov'],
    publishedAt: '2026-10-01T13:00:00+05:00',
    image: img('glassTower', {
      caption: 'Shisha jabhali ofis minorasi. Malayziyada takaful operatorlari bank tarmogʻi bilan yaqin hamkorlikda ishlaydi.',
    }),
    tags: ['takaful', 'xalqaro-bozorlar', 'regulyator'],
    terms: ['takaful', 'vakola', 'muzoraba', 'qarzi-hasan', 'ifsb', 'murobaha', 'ijora', 'shariat-skriningi', 'shariat-kengashi', 'retakaful'],
    related: ['dn-05', 'dn-02'],
    views: 3870,
    body: [
      {
        type: 'p',
        text: 'Malayziya [[takaful|takaful]] — ishtirokchilarning oʻzaro yordamiga asoslangan sugʻurta — boʻyicha dunyodagi eng rivojlangan bozorlardan biri hisoblanadi. Mamlakatda bu soha bir necha oʻn yil davomida anʼanaviy sugʻurta bilan yonma-yon rivojlandi va bugun aholining keng qatlami uchun odatiy moliyaviy xizmatga aylandi. Oʻzbekistonda takaful operatorlari bozorga kirishga endi tayyorlanayotgan bir paytda Malayziya tajribasi uchta yoʻnalishda eʼtiborga loyiq.',
      },
      { type: 'term', slug: 'takaful' },
      { type: 'h2', text: '1. Aniq regulyatsiya va ajratilgan fondlar' },
      {
        type: 'p',
        text: 'Malayziya modelining asosi — ishtirokchilar fondi va operator mablagʻlarini qatʼiy ajratish. Ishtirokchilar badallari risk fondiga tushadi va zararlar shu fonddan qoplanadi, operator esa fondni boshqargani uchun haq oladi. Eng keng tarqalgan sxema — [[vakola|vakola]] modeli: operator ishtirokchilarning vakili sifatida ishlaydi va badallardan oldindan belgilangan ulushni haq sifatida ushlab qoladi. Ayrim mahsulotlarda [[muzoraba|muzoraba]] yoki ikki modelning aralash koʻrinishi qoʻllanadi. Har bir operatorda [[shariat-kengashi|shariat kengashi]] faoliyat yuritadi va mahsulotlarni bozorga chiqarishdan oldin koʻrib chiqadi.',
      },
      {
        type: 'p',
        text: 'Agar risk fondida mablagʻ yetishmasa, operator unga [[qarzi-hasan|qarzi hasan]] — foizsiz qarz beradi va u keyingi yillardagi ortiqcha mablagʻ hisobidan qaytariladi. Fondda ortiqcha mablagʻ qolsa, u qoidalarga koʻra ishtirokchilar oʻrtasida taqsimlanishi yoki zaxiraga yoʻnaltirilishi mumkin. 2013-yilda qabul qilingan qonun kompozit operatorlarni oilaviy va umumiy takaful boʻyicha alohida kompaniyalarga ajratishni talab qildi. Bu har bir yoʻnalishning kapitali va xavflarini alohida nazorat qilish imkonini berdi. Xalqaro miqyosda [[ifsb|IFSB]] takaful operatorlarini boshqarish boʻyicha standartlar eʼlon qilgan va ular koʻplab mamlakatlarda regulyatsiya uchun asos boʻlib xizmat qiladi.',
      },
      { type: 'h2', text: '2. Bank tarmogʻi orqali sotuv' },
      {
        type: 'p',
        text: 'Malayziyada takaful mahsulotlarining katta qismi banklar orqali sotiladi — bu model bankatakaful deb ataladi. Bank [[murobaha|murobaha]] asosida avtomobil xaridini yoki [[ijora|ijora]] asosida uy-joyni moliyalashtirayotganda mijozga takaful polisini ham taklif qiladi: polis moliyalashtirilgan aktivni, shuningdek mijozning hayoti va mehnat qobiliyatini qoplaydi. Bozor ishtirokchilari baholashicha, oilaviy takaful boʻyicha yangi badallarning qariyb yarmi bank kanallariga toʻgʻri keladi.',
      },
      { type: 'h2', text: '3. Oilaviy takaful' },
      {
        type: 'p',
        text: 'Malayziya bozorining yana bir oʻziga xos jihati — oilaviy takafulning yuqori ulushi. Bu mahsulot hayotni himoya qilish va uzoq muddatli jamgʻarishni birlashtiradi: badalning bir qismi risk fondiga, qolgani ishtirokchining investitsiya hisobiga yoʻnaltiriladi va [[shariat-skriningi|shariat skriningidan]] oʻtgan aktivlarga joylashtiriladi. Bozor ishtirokchilari hisob-kitobiga koʻra, oilaviy takaful yigʻilgan jami badallarning taxminan uchdan ikki qismini tashkil etadi.',
      },
      {
        type: 'table',
        caption: 'Malayziya takaful modelining asosiy xususiyatlari',
        columns: [{ label: 'Xususiyat' }, { label: 'Malayziya amaliyoti' }, { label: 'Oʻzbekiston uchun xulosa' }],
        rows: [
          ['Huquqiy asos', 'Islom moliyasi xizmatlari boʻyicha alohida qonun, takaful operatorlari uchun alohida litsenziya', 'Takaful faoliyatini sugʻurta qonunchiligida aniq belgilash'],
          ['Fondlarni ajratish', 'Ishtirokchilar risk fondi va operator mablagʻlari alohida hisobda', 'Hisob va audit talablarini birinchi kundan joriy etish'],
          ['Operator modeli', 'Asosan vakola, ayrim mahsulotlarda muzoraba yoki aralash model', 'Operator haqi va ortiqcha mablagʻ taqsimotini ochiq eʼlon qilish'],
          ['Yoʻnalishlar', 'Oilaviy va umumiy takaful alohida kompaniyalarda', 'Bozor hali kichik, shu sababli dastlab bitta kompaniyada alohida fondlar bilan ishlash mumkin'],
          ['Sotuv kanallari', 'Bank tarmogʻi, agentlar, raqamli platformalar', 'Islom oynalari va lizing kompaniyalari bilan hamkorlik'],
          ['Qayta sugʻurtalash', 'Mahalliy va xalqaro retakaful operatorlari', 'Dastlab xorijiy retakaful hamkorlariga tayanish'],
          ['Shariat boshqaruvi', 'Har bir operatorda shariat kengashi, milliy darajada yagona yondashuv', 'Operatorlarda mustaqil shariat kengashini talab qilish'],
        ],
        note: 'Xulosalar bozor ishtirokchilari bilan suhbatlar asosida tayyorlangan.',
        source: 'Ochiq manbalar asosida Muomalat tayyorladi',
      },
      {
        type: 'p',
        text: '«Malayziyada takaful bank mahsulotining tabiiy davomiga aylangan. Mijoz uy yoki avtomobil uchun moliyalashtirish olayotganda polisni ham shu yerning oʻzida rasmiylashtiradi. Oʻzbekistonda islom oynalari ochilishi bilan xuddi shunday talab paydo boʻladi», — dedi sugʻurta sohasida 15 yillik tajribaga ega aktuariy Rustam Normatov.',
      },
      {
        type: 'quote',
        text: 'Malayziyada takaful bank mahsulotining tabiiy davomiga aylangan.',
        cite: 'Rustam Normatov',
        role: 'aktuariy',
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Oʻzbekistonda takaful bozori hali shakllanmagan: regulyator Takaful operatori Q arizasini koʻrib chiqmoqda, Takaful operatori R ariza topshirgan, Takaful operatori S esa bozorga kirish niyatini eʼlon qilgan. Islom banklari va oynalari murobaha va ijora mahsulotlarini kengaytirgani sari moliyalashtirilgan aktivlarni sugʻurtalashga talab ortadi. Malayziya tajribasi fondlarni ajratish va operator haqini oshkor qilish boʻyicha aniq qoidalar hamda bank kanallari orqali sotuv bozorning tez oʻsishiga yordam berishini koʻrsatadi. Dastlabki yillarda mahalliy operatorlar yirik xavflarni xorijiy [[retakaful|retakaful]] hamkorlariga oʻtkazishiga toʻgʻri keladi.',
      },
    ],
    sources: [
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-30', type: 'interview' },
      { title: 'Takaful bozori boʻyicha ochiq statistik maʼlumotlar', publisher: 'Malayziya moliya regulyatori', type: 'report' },
      { title: 'Takaful operatorlarini boshqarish boʻyicha standart', publisher: 'IFSB', type: 'document' },
    ],
  },
  {
    id: 'dn-05',
    slug: 'turkiya-ishtirok-banklari-ulushini-ikki-barobar-oshirdi',
    rubric: 'dunyo',
    kicker: 'Turkiya',
    title: 'Turkiya ishtirok banklari aktivlardagi ulushini oʻn yilda deyarli ikki barobar oshirdi',
    lead: 'Hisob-kitoblarga koʻra, ishtirok banklarining sektor aktivlaridagi ulushi 2015-yildagi 4,9 foizdan 2025-yilda 9,2 foizga yetdi. Ularning omonat mahsulotlari islom oynalari uchun namuna boʻlishi mumkin.',
    authors: ['bekzod-nazarov'],
    publishedAt: '2026-09-29T09:45:00+05:00',
    image: img('financialDistrict', {
      caption: 'Xorijiy moliya tumanidagi bank binolari. Turkiyada ishtirok banklari filiallar tarmogʻini kengaytirib bormoqda.',
    }),
    tags: ['xalqaro-bozorlar', 'islom-oynasi', 'bozor-korsatkichlari'],
    terms: ['ijora', 'sukuk', 'investitsiya-hisobvaragi', 'foyda-va-zarar-taqsimoti', 'murobaha', 'mushoraka', 'islom-oynasi'],
    related: ['dn-04', 'dn-02'],
    views: 6950,
    body: [
      {
        type: 'p',
        text: 'Turkiyada islom moliyasi tamoyillari asosida ishlovchi banklar «ishtirok banklari» deb ataladi. Ular 1980-yillarning oʻrtalarida maxsus moliya institutlari sifatida paydo boʻlgan, 2000-yillarning oʻrtalarida esa bank qonunchiligiga koʻra boshqa banklar bilan teng maqomga ega boʻlgan. Bugun sektor Turkiya bank tizimining kichik, lekin barqaror oʻsib borayotgan qismi hisoblanadi.',
      },
      { type: 'h2', text: 'Oʻsish yoʻli' },
      {
        type: 'p',
        text: 'Bozor ishtirokchilari maʼlumotlariga asoslangan hisob-kitoblarga koʻra, oʻtgan oʻn yilda ishtirok banklarining sektor aktivlaridagi ulushi deyarli ikki barobar oshdi. Oʻsishni bir nechta omil taʼminladi: 2010-yillarning oʻrtalarida davlat kapitali ishtirokidagi ishtirok banklarining tashkil etilishi, filiallar tarmogʻining kengayishi, hukumatning sohani rivojlantirish strategiyasi va [[ijora|ijora]] tuzilmasidagi davlat qimmatli qogʻozlarining muntazam chiqarilishi.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'line',
          title: 'Ishtirok banklarining Turkiya bank sektoridagi ulushi',
          subtitle: '2015–2025, yil yakuniga',
          unit: '%',
          xLabels: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
          series: [
            { name: 'Aktivlardagi ulushi', values: [4.9, 5.1, 5.0, 5.3, 6.3, 6.6, 7.0, 7.5, 8.1, 8.6, 9.2] },
            { name: 'Omonatlardagi ulushi', values: [5.6, 5.8, 5.7, 6.1, 7.4, 7.9, 8.4, 9.0, 9.6, 10.2, 10.9] },
          ],
          source: 'Bozor ishtirokchilari maʼlumotlari asosida Muomalat hisob-kitobi',
          note: 'Raqamlar taxminiy.',
        },
      },
      {
        type: 'p',
        text: 'Grafikdan koʻrinib turibdiki, oʻsish bir tekis kechmagan: 2015–2018-yillarda ulush deyarli oʻzgarmagan, keyingi yillarda esa davlat kapitali ishtirokidagi banklar va yangi filiallar hisobiga tezlashgan. Omonatlardagi ulush aktivlardagi ulushdan doimo yuqori boʻlgan. Bu ishtirok banklari resurslarining asosiy qismini aholi va kompaniyalarning mablagʻlari tashkil etishini koʻrsatadi.',
      },
      { type: 'h2', text: 'Omonat mahsulotlari' },
      {
        type: 'p',
        text: 'Ishtirok banklarining asosiy resurs bazasi — foyda taqsimotiga asoslangan hisobvaraqlar. Mijoz mablagʻini muayyan muddatga [[investitsiya-hisobvaragi|investitsiya hisobvaragiga]] joylashtiradi, bank uni moliyalashtirish operatsiyalarida ishlatadi va olingan daromad oldindan kelishilgan nisbatda taqsimlanadi. Bunday hisobvaraqlarda daromad miqdori oldindan belgilanmaydi: u [[foyda-va-zarar-taqsimoti|foyda va zarar taqsimoti]] tamoyiliga bogʻliq.',
      },
      {
        type: 'p',
        text: 'Bundan tashqari, banklar daromad toʻlanmaydigan joriy hisobvaraqlar, oltin hisobvaraqlari va maqsadli jamgʻarish mahsulotlarini taklif qiladi. Oltin hisobvaraqlari aholining anʼanaviy jamgʻarish odatiga mos kelgani uchun ayniqsa ommalashgan. Ishtirok hisobvaraqlari omonatlarni sugʻurtalash tizimi bilan ham qamrab olingan, bu mijozlar ishonchini oshirishda muhim rol oʻynagan.',
      },
      {
        type: 'p',
        text: 'Aktivlar tomonida [[murobaha|murobaha]] asosida tovar va uskunalarni moliyalashtirish ustunlik qiladi, keyingi yillarda esa ijora va [[mushoraka|mushoraka]] asosidagi loyiha moliyalashtirish ulushi ortib bormoqda.',
      },
      {
        type: 'p',
        text: '«Turkiyada mijozlar avval omonat mahsulotlariga ishonch hosil qildi, keyin moliyalashtirishga oʻtdi. Daromad qanday hisoblanishi va taqsimlanishini sodda tilda tushuntirish — ishtirok banklarining asosiy tajribasi», — dedi Istanbuldagi moliya kompaniyasida ishlagan bank maslahatchisi Shoxrux Qosimov.',
      },
      {
        type: 'quote',
        text: 'Mijozlar avval omonat mahsulotlariga ishonch hosil qildi, keyin moliyalashtirishga oʻtdi.',
        cite: 'Shoxrux Qosimov',
        role: 'bank maslahatchisi',
      },
      { type: 'h2', text: 'Islom oynalari uchun saboqlar' },
      {
        type: 'p',
        text: 'Turkiyada oʻsish asosan toʻliq ishtirok banklari hisobiga boʻldi, keyingi yillarda esa ayrim anʼanaviy bank guruhlari alohida shoʻba ishtirok banklarini tashkil etdi. Bozor ishtirokchilari Oʻzbekistondagi [[islom-oynasi|islom oynalari]] uchun bir nechta saboqni ajratadi.',
      },
      {
        type: 'list',
        items: [
          'Mablagʻlarni ajratish va alohida hisobot yuritish — mijoz ishonchining asosi.',
          'Daromad taqsimoti nisbatini va oldingi davrlardagi haqiqiy daromadlilikni ochiq eʼlon qilish zarur.',
          'Hisobvaraqni raqamli kanallar orqali ochish imkoniyati kichik shaharlardagi mijozlarni jalb qilishga yordam beradi.',
          'Likvidlikni boshqarish uchun davlat ijora [[sukuk|sukuklari]] kabi vositalar kerak.',
        ],
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Oʻzbekistonda avgust oyida Tijorat banki D islom oynasini ochish uchun birinchi boʻlib litsenziya oldi, yana bir qator banklarning arizalari koʻrib chiqilmoqda. Ular uchun eng murakkab vazifa — resurs bazasini shakllantirish. Turkiya tajribasi omonatchilar foyda taqsimotiga asoslangan hisobvaraqlarni tushunishi va ularga ishonishi uchun vaqt va ochiqlik kerakligini koʻrsatadi. Ijora asosida uy-joy moliyalashtirishni rejalashtirayotgan Tijorat banki G kabi banklar uchun esa uzoq muddatli resurslar va likvidlik vositalari masalasi dolzarb boʻlib qoladi.',
      },
    ],
    sources: [
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-09-28', type: 'data' },
      { title: 'Turkiya bank sektori boʻyicha ochiq statistik maʼlumotlar', publisher: 'Turkiya bank regulyatori', type: 'data' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-26', type: 'interview' },
    ],
  },
  {
    id: 'dn-06',
    slug: 'sukuk-listingi-uchun-maydoncha-tanlash',
    rubric: 'dunyo',
    kicker: 'Kapital bozori',
    title: 'Sukuk listingi uchun maydoncha tanlash: oʻzbek emitenti nimalarni hisobga oladi',
    lead: 'London, Dubay, Kuala-Lumpur va Istanbul investorlar bazasi, huquqiy muhit, xarajatlar va tayyorgarlik muddati boʻyicha farq qiladi. Biroq mutaxassislar fikricha, birinchi emissiyada hujjatlarning huquqiy asosi muhimroq.',
    authors: ['bekzod-nazarov'],
    publishedAt: '2026-09-26T11:30:00+05:00',
    image: img('gulfSkyline', {
      caption: 'Xalqaro moliya markazidagi osmonoʻpar binolar. Sukuk listingi uchun maydonchalar investorlar bazasi va xarajatlar boʻyicha farq qiladi.',
    }),
    tags: ['sukuk', 'kapital-bozori', 'xalqaro-bozorlar'],
    terms: ['sukuk', 'ijora', 'vakola', 'aaoifi', 'shariat-kengashi'],
    related: ['dn-01', 'dn-03'],
    views: 4180,
    body: [
      {
        type: 'p',
        text: 'Oʻzbekistonda islom moliyasi bozori shakllanib borar ekan, bozor ishtirokchilari kelgusida suveren yoki korporativ [[sukuk|sukuk]] chiqarish imkoniyatini tobora koʻproq muhokama qilmoqda. Emitent oldida turgan amaliy savollardan biri — qimmatli qogʻozni qaysi maydonchada listingdan oʻtkazish. Muomalat bilan suhbatlashgan mutaxassislar oʻzbek emitenti uchun toʻrtta asosiy variantni tilga oladi: London, Dubay, Kuala-Lumpur va Istanbul.',
      },
      {
        type: 'p',
        text: 'Listing — sukukni birja roʻyxatiga kiritish — joylashtirishning oʻzi emas. Investorlar sukukni odatda tashkilotchi banklar sindikati orqali sotib oladi, listing esa oshkoralik talablarini belgilaydi va koʻplab institutsional investorlar uchun shart hisoblanadi: ayrim fondlar faqat tan olingan maydonchada roʻyxatga olingan qimmatli qogʻozlarni sotib olishi mumkin.',
      },
      { type: 'h2', text: 'Toʻrt maydoncha' },
      {
        type: 'p',
        text: '**London** — anʼanaviy xalqaro obligatsiyalar markazi. Bu yerda Yevropa, Fors koʻrfazi va Osiyodagi institutsional investorlarga keng chiqish mumkin. Xalqaro sukuk hujjatlarining aksariyati ingliz huquqiga asoslanadi, shu sababli yuridik maslahatchilar va ishonchli boshqaruvchilar bozori ham shu yerda rivojlangan.',
      },
      {
        type: 'p',
        text: '**Dubay** Fors koʻrfazidagi islom banklari va investitsiya fondlariga yaqinligi bilan ajralib turadi. Shahardagi xalqaro moliya markazi umumiy huquq tamoyillariga asoslangan alohida yurisdiksiya va sudlarga ega. Bozor ishtirokchilari baholashicha, listingdagi sukuklar hajmi boʻyicha Dubay dunyoda yetakchilar qatorida.',
      },
      {
        type: 'p',
        text: '**Kuala-Lumpur** dunyodagi eng yirik ichki sukuk bozorlaridan biriga ega: bu yerda islom moliyasi mutaxassislari, shariat maslahatchilari va mahalliy investorlar bazasi chuqur. Biroq bozorning katta qismi milliy valyutadagi emissiyalarga toʻgʻri keladi, dollardagi sukuk uchun investorlar doirasi torroq.',
      },
      {
        type: 'p',
        text: '**Istanbul** asosan Turkiya emitentlari va mahalliy ishtirok banklari uchun maydoncha hisoblanadi. Xorijiy emitent uchun bu yerda investorlar bazasi cheklangan, ammo Turkiya bilan savdo va investitsiya aloqalari kuchli kompaniyalar uchun bu variant qiziqarli boʻlishi mumkin.',
      },
      {
        type: 'table',
        caption: 'Sukuk listingi maydonchalarini qiyosiy baholash',
        columns: [{ label: 'Mezon' }, { label: 'London' }, { label: 'Dubay' }, { label: 'Kuala-Lumpur' }, { label: 'Istanbul' }],
        rows: [
          ['Asosiy investorlar', 'Global institutsional investorlar', 'Koʻrfaz islom banklari va fondlari', 'Osiyo islom fondlari, mahalliy investorlar', 'Asosan mahalliy ishtirok banklari'],
          ['Huquqiy asos', 'Ingliz huquqi', 'Umumiy huquqqa asoslangan moliya markazi', 'Mahalliy huquq, xalqaro emissiyalarda ingliz huquqi', 'Turkiya huquqi'],
          ['Asosiy valyuta', 'Dollar va yevro', 'Dollar', 'Milliy valyuta', 'Lira'],
          ['Xarajatlar darajasi', 'Yuqori', 'Oʻrtacha', 'Oʻrtacha', 'Oʻrtacha'],
          ['Tayyorgarlik muddati', 'Oʻrtacha', 'Oʻrtacha', 'Oʻrtacha–uzoq', 'Oʻrtacha–uzoq'],
          ['Birinchi emitent uchun afzallik', 'Investorlarga tanish hujjatlar', 'Islom investorlariga yaqinlik', 'Chuqur shariat ekspertizasi', 'Turkiya bilan aloqalar'],
        ],
        note: 'Bozor ishtirokchilarining sifat baholari. Aniq xarajat va muddat emissiya hajmi, tuzilmasi va maslahatchilar tarkibiga bogʻliq.',
        source: 'Muomalat suhbatlari asosida',
      },
      { type: 'h2', text: 'Huquq, xarajat va vaqt' },
      {
        type: 'p',
        text: 'Bozor ishtirokchilarining taʼkidlashicha, emitent uchun maydoncha tanlovidan koʻra hujjatlar qaysi huquq asosida tuzilishi muhimroq. Xalqaro investorlar ingliz huquqiga asoslangan hujjatlarni afzal koʻradi, chunki nizolarni hal qilish amaliyoti yaxshi maʼlum. Biroq sukuk tuzilmasidagi aktivlar — masalan, [[ijora|ijora]] sukukida ijaraga beriladigan mulk — emitent mamlakatida joylashgan boʻladi va ularga mahalliy qonunchilik qoʻllanadi. Shu sababli mahalliy yuridik xulosa ham talab qilinadi. Moddiy aktivlar yetarli boʻlmaganda [[vakola|vakola]] tuzilmasi koʻrib chiqiladi, biroq unda ham aktivlar portfeli tarkibiga talablar qoʻyiladi.',
      },
      {
        type: 'p',
        text: 'Xarajatlarning asosiy qismini listing toʻlovi emas, balki yuridik maslahatchilar, kredit reytingi, shariat ekspertizasi va tashkilotchi banklarning haqi tashkil etadi. Tuzilmaning [[aaoifi|AAOIFI]] standartlariga, jumladan № 17 «Investitsion sukuk» standartiga muvofiqligi tashkilotchi banklar [[shariat-kengashi|shariat kengashlarining]] xulosasi bilan tasdiqlanadi. Bozor ishtirokchilari baholashicha, birinchi marta chiqayotgan emitent uchun tayyorgarlik odatda kamida 4–6 oy davom etadi: shu vaqt ichida aktivlar aniqlanadi, hujjatlar tayyorlanadi va investorlar bilan uchrashuvlar oʻtkaziladi.',
      },
      {
        type: 'p',
        text: '«Birinchi emissiyada eng muhim narsa — investorlarga tanish boʻlgan hujjatlar va tuzilma. Maydoncha ikkinchi darajali masala, koʻp emitentlar sukukni bir vaqtning oʻzida ikki maydonchada roʻyxatga oladi», — dedi Toshkentdagi yuridik firma hamkori Kamola Yoʻldosheva.',
      },
      {
        type: 'quote',
        text: 'Birinchi emissiyada eng muhim narsa — investorlarga tanish boʻlgan hujjatlar va tuzilma.',
        cite: 'Kamola Yoʻldosheva',
        role: 'yuridik firma hamkori',
      },
      { type: 'h2', text: 'Oʻzbekiston uchun ahamiyati' },
      {
        type: 'p',
        text: 'Oʻzbekiston hukumati va yirik kompaniyalari 2019-yildan buyon xalqaro bozorlarda yevroobligatsiyalar joylashtirib kelmoqda, shu sababli ingliz huquqiga asoslangan hujjatlar bilan ishlash tajribasi mavjud. Bozor ishtirokchilari fikricha, birinchi oʻzbek sukuki uchun London yoki Dubay eng maqbul variant boʻlishi mumkin: birinchisi mavjud investorlar bazasi, ikkinchisi Fors koʻrfazidagi islom investorlariga yaqinligi bilan. Ikkala maydonchada parallel listing ham koʻrib chiqilishi mumkin. Mahalliy sukuk bozori shakllanishi uchun esa soliq neytralligi, aktivlarni maxsus kompaniyaga oʻtkazish tartibi va islom banklarining sukukdan likvidlik vositasi sifatida foydalanish qoidalari kerak boʻladi.',
      },
    ],
    sources: [
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-24', type: 'interview' },
      { title: 'AAOIFI Shariat standarti № 17 «Investitsion sukuk»', publisher: 'AAOIFI', type: 'document' },
      { title: 'Xalqaro sukuk emissiyalari prospektlari', publisher: 'Emitentlarning ochiq hujjatlari', type: 'document' },
    ],
  },
]
