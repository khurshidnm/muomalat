import type { Article } from '../../types'
import { img } from '../images'

export const tahlil: Article[] = [
  // ── th-01 ────────────────────────────────────────────────────────────────
  {
    id: 'th-01',
    slug: 'islom-oynalari-qonun-kuchga-kirganidan-keyingi-tort-oy',
    rubric: 'tahlil',
    kicker: 'Bozor sharhi',
    title: 'Islom oynalari: qonun kuchga kirganidan keyingi toʻrt oy',
    lead: 'Iyundan buyon 17 tashkilot islom moliyasi boʻyicha litsenziya soʻrab murojaat qildi, oltitasi ruxsat oldi. Endi bozor rivoji kadrlar, IT tizimlari va soliq masalalariga bogʻliq.',
    authors: ['jasur-toshmatov', 'aziza-rahimova'],
    publishedAt: '2026-10-07T08:00:00+05:00',
    updatedAt: '2026-10-08T14:30:00+05:00',
    image: img('bankHall', {
      caption: 'Bank filialidagi mijozlarga xizmat koʻrsatish zali. Islom oynalarining aksariyati mavjud filiallar ichida ochilmoqda',
    }),
    tags: ['islom-oynasi', 'litsenziyalash', 'bozor-korsatkichlari', 'shariat-kengashi'],
    terms: ['islom-oynasi', 'murobaha', 'ijora', 'investitsiya-hisobvaragi', 'shariat-kengashi', 'mushoraka', 'muzoraba', 'aaoifi', 'takaful'],
    related: ['th-02', 'th-05'],
    featured: true,
    views: 15200,
    body: [
      {
        type: 'callout',
        title: 'Yangilandi',
        text: '8-oktabr kuni regulyator Tijorat banki E ga islom oynasi ochish uchun litsenziya berdi. Jadval va matndagi raqamlar shu maʼlumot asosida yangilandi, Islom banki A filiali haqidagi maʼlumot ham qoʻshildi.',
      },
      {
        type: 'p',
        text: 'Islom bank faoliyati toʻgʻrisidagi qonun iyun oyida kuchga kirganidan beri oʻtgan toʻrt oyda bozor eʼlonlar bosqichidan amaliy ishga oʻtdi. Muomalat hisob-kitobiga koʻra, 8-oktabr holatiga 21 ta tashkilot islom moliyasi xizmatlarini koʻrsatish niyatini ochiq eʼlon qilgan. Ulardan 17 tasi regulyatorga rasmiy ariza topshirgan, oltitasi litsenziya olgan.',
      },
      {
        type: 'p',
        text: 'Raqamlar bozor tuzilmasini ham koʻrsatib turibdi. Ishtirokchilarning toʻqqiztasi — anʼanaviy tijorat banklari ochayotgan [[islom-oynasi|islom oynalari]]. Toʻliq islom banki maqomiga uchta tashkilot daʼvogarlik qilmoqda, qolgan toʻqqiztasi mikromoliya, lizing va takaful sohalariga toʻgʻri keladi. Bozor geografiyasi ham kengaymoqda: ishtirokchilarning 13 tasi Toshkentda, sakkiztasi esa poytaxtdan tashqarida — Samarqand, Namangan, Fargʻona, Buxoro, Andijon, Qarshi va Nukusda joylashgan.',
      },
      { type: 'h2', text: 'Kim ariza berdi, kim litsenziya oldi' },
      {
        type: 'p',
        text: 'Toʻliq islom banklari orasida hozircha faqat Islom banki A litsenziyaga ega: regulyator unga 18-sentabrda ruxsat berdi. Islom banki B ning arizasi koʻrib chiqilmoqda, xorijiy sarmoyadorlar ishtirokidagi Islom banki C esa faqat niyatini eʼlon qilgan. Uchala tashkilot ham Toshkentda roʻyxatdan oʻtgan.',
      },
      {
        type: 'p',
        text: 'Islom oynalari orasida birinchi litsenziyani 20-avgustda Tijorat banki D oldi va bozordagi ilk oynani ochdi. 8-oktabrda ikkinchi litsenziyani Tijorat banki E qoʻlga kiritdi. Tijorat banki F, Tijorat banki G va Fargʻonadagi Tijorat banki T arizalari koʻrib chiqish bosqichida. Samarqanddagi Tijorat banki H va Namangandagi Tijorat banki I hujjat topshirgan, Tijorat banki J va Buxorodagi Tijorat banki U esa hozircha niyat bildirgan.',
      },
      {
        type: 'p',
        text: 'Bozordagi ilk litsenziya esa bank boʻlmagan sektorga toʻgʻri keldi: 22-iyulda uni Toshkentdagi Lizing kompaniyasi N oldi. Keyinroq Samarqanddagi Lizing kompaniyasi O va Andijondagi Mikromoliya tashkiloti K ham ruxsat olgan. Qarshidagi Mikromoliya tashkiloti L hujjatlari koʻrib chiqilmoqda, Nukusdagi Mikromoliya tashkiloti M va Toshkentdagi Lizing kompaniyasi P ariza topshirgan. Takaful yoʻnalishida hali birorta litsenziya berilmagan: Takaful operatori Q ning arizasi koʻrib chiqilmoqda, Takaful operatori R hujjat topshirgan, Takaful operatori S niyat eʼlon qilgan.',
      },
      {
        type: 'table',
        caption: 'Islom moliyasi bozori ishtirokchilari: tur va maqom boʻyicha',
        columns: [
          { label: 'Tashkilot turi' },
          { label: 'Litsenziya berilgan', align: 'right' },
          { label: 'Koʻrib chiqilmoqda', align: 'right' },
          { label: 'Ariza topshirgan', align: 'right' },
          { label: 'Niyat eʼlon qilgan', align: 'right' },
          { label: 'Jami', align: 'right' },
        ],
        rows: [
          ['Toʻliq islom banklari', 1, 1, 0, 1, 3],
          ['Islom oynalari', 2, 3, 2, 2, 9],
          ['Mikromoliya tashkilotlari', 1, 1, 1, 0, 3],
          ['Lizing kompaniyalari', 2, 0, 1, 0, 3],
          ['Takaful operatorlari', 0, 1, 1, 1, 3],
          ['Jami', 6, 6, 5, 4, 21],
        ],
        note: '8-oktabr holatiga. «Koʻrib chiqilmoqda» — regulyator arizani qabul qilib, ekspertizani boshlagan holat.',
        source: 'Regulyator xabarlari, kompaniyalar eʼlonlari, Muomalat hisob-kitoblari',
      },
      {
        type: 'p',
        text: 'Arizalar deyarli bir maromda kelib tushdi. Qonun kuchga kirgan iyun oyida toʻrtta tashkilot hujjat topshirgan, iyul va avgustda ham har oy toʻrttadan ariza qoʻshildi. Sentabrda arizalar soni beshtaga yetdi, ular orasida Samarqand, Namangan va Nukusdagi tashkilotlar bor. Oktabrning birinchi haftasida esa yangi ariza tushmagan. Bozor ishtirokchilari sentabrdagi oʻsishni ilk litsenziyalar berilgach regulyator talablari aniqroq boʻlgani bilan izohlaydi: keyingi arizachilar hujjatlarini birinchi tashkilotlar tajribasiga tayanib tayyorlagan.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'line',
          title: 'Regulyatorga topshirilgan arizalar soni',
          subtitle: 'jamlanma, oy oxiriga',
          unit: 'ta',
          xLabels: ['Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr*'],
          series: [{ name: 'Arizalar, jamlanma', values: [4, 8, 12, 17, 17] }],
          source: 'Muomalat hisob-kitoblari',
          note: '* 8-oktabr holatiga. Faqat niyat eʼlon qilgan, ammo ariza topshirmagan toʻrtta tashkilot kiritilmagan.',
        },
      },
      {
        type: 'p',
        text: 'Ariza topshirilgandan litsenziya berilgunga qadar oʻtgan vaqt ham eʼtiborga loyiq. Bozor ishtirokchilari maʼlumotiga koʻra, ilk litsenziyalar uchun bu muddat bir yarim oydan uch oygacha boʻlgan. Regulyator arizachilardan biznes-reja va kapital yetarliligidan tashqari shariat kengashi tarkibi, ichki nazorat tartibi va islom moliyasi operatsiyalarini anʼanaviy faoliyatdan ajratish rejasini ham talab qilmoqda.',
      },
      { type: 'h2', text: 'Qanday mahsulotlar chiqdi' },
      {
        type: 'p',
        text: 'Bozordagi mahsulotlar hozircha cheklangan va asosan korporativ mijozlarga moʻljallangan. Tijorat banki D oynasi kichik va oʻrta biznes uchun uskuna hamda xomashyo xaridini [[murobaha|murobaha]] asosida moliyalashdan boshladi. Bank maʼlumotiga koʻra, 6-oktabr holatiga oyna jami 61,4 mlrd soʻmlik 148 ta murobaha shartnomasi tuzgan. Mablagʻ jalb qilish uchun [[muzoraba|muzoraba]] tamoyiliga asoslangan [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]] ochilgan: ularda daromad oldindan belgilangan foiz sifatida emas, oyna faoliyatidan olingan foydaning kelishilgan ulushi sifatida hisoblanadi. Bu hisobvaraqlardagi qoldiq 74,5 mlrd soʻmga yetgan.',
      },
      {
        type: 'p',
        text: 'Islom banki A litsenziya olgach, dastlab faqat bosh ofisda korporativ mijozlar bilan ishladi. 7-oktabrda bank Toshkentning Chilonzor tumanida birinchi filialini ochdi. Bank xabariga koʻra, filialda jismoniy shaxslar va kichik biznesga hisobvaraq ochish, investitsiya hisobvaraqlari va murobaha asosida moliyalash xizmatlari taklif etiladi. Yil oxirigacha Toshkentda yana bitta, 2027-yilda esa viloyatlarda filiallar ochish rejalashtirilgan.',
      },
      {
        type: 'p',
        text: 'Lizing kompaniyalari oʻz ixtisosligi doirasida ishlamoqda. Lizing kompaniyasi N qishloq xoʻjaligi va ishlab chiqarish uskunalarini, Lizing kompaniyasi O esa avtotransportni [[ijora|ijora]] shartnomasi asosida bermoqda. Andijondagi Mikromoliya tashkiloti K hunarmandlar uchun xomashyo va asbob-uskuna xaridini kichik hajmdagi murobaha asosida moliyalashni yoʻlga qoʻydi. Tijorat banki G esa 2027-yildan ijora asosida uy-joy moliyalashni boshlashni rejalashtirmoqda, ammo buning uchun avval litsenziya olishi kerak.',
      },
      {
        type: 'figure',
        image: img('facadeLattice', {
          caption: 'Toshkentdagi ofis binolaridan biri. Islom moliyasi bozoridagi 21 ishtirokchining 13 tasi poytaxtda joylashgan',
        }),
      },
      {
        type: 'p',
        text: 'Chakana segment, xususan uy-joy va avtomobil moliyalash, hali boshlangʻich bosqichda. Bozor ishtirokchilari buni tashkilotlarning ehtiyotkorligi bilan izohlaydi: aholiga moʻljallangan mahsulotlar koʻproq tushuntirish ishini, standart hujjatlarni va mijoz bilan bevosita ishlaydigan tayyor xodimlarni talab qiladi. Risklarni taqsimlashga asoslangan [[mushoraka|mushoraka]] asosidagi moliyalash esa hozircha faqat rejalarda: masalan, Islom banki B uni loyiha moliyasi uchun taklif qilishni moʻljallamoqda.',
      },
      {
        type: 'p',
        text: 'Talab bilan bogʻliq savollar ham bor. Bozor ishtirokchilari baholashicha, islom moliyasi mahsulotlariga qiziqish bildirgan mijozlarning katta qismi kichik va oʻrta biznes vakillari. Ular uchun asosiy mezon — narx va rasmiylashtirish tezligi. Tijorat banki D maʼlumotiga koʻra, murobaha bitimini rasmiylashtirish muddati dastlabki haftalardagi oʻrtacha 9 ish kunidan 5 ish kuniga qisqargan. Bank vakillarining aytishicha, bu hali ham anʼanaviy kreditga qaraganda uzoqroq, chunki bank uskunani yetkazib beruvchidan alohida oldi-sotdi shartnomasi asosida sotib olishi kerak.',
      },
      { type: 'h2', text: 'Toʻrtta toʻsiq' },
      {
        type: 'p',
        text: 'Muomalat suhbatlashgan bank, lizing va konsalting kompaniyalari vakillari bozor rivojini sekinlashtirayotgan toʻrtta asosiy omilni sanab oʻtdi.',
      },
      {
        type: 'list',
        ordered: true,
        items: [
          '**Shariat kengashlari uchun kadrlar.** Har bir tashkilotda mahsulotlarni koʻrib chiqib, tasdiqlaydigan [[shariat-kengashi|shariat kengashi]] boʻlishi kerak. Regulyator 5-oktabrda eʼlon qilgan malaka talablariga koʻra, kengashda kamida uch aʼzo boʻladi, bir kishi esa koʻpi bilan uchta tashkilot kengashida ishlay oladi. Bozordagi 21 ishtirokchi uchun bu kamida 63 ta oʻrin demakdir. Bozor ishtirokchilari baholashicha, tajribali nomzodlar soni esa 20–25 nafardan oshmaydi.',
          '**IT tizimlari.** Anʼanaviy bank tizimlari foiz hisoblashga moʻljallangan. Islom oynasi uchun alohida balans, foyda taqsimoti moduli va mablagʻlarni anʼanaviy aktivlardan ajratib hisobga olish imkoniyati kerak. Bank vakillarining aytishicha, tizimlarni dasturiy taʼminot yetkazib beruvchilari bilan birgalikda moslashtirish 6–9 oy davom etadi.',
          '**Hisob standartlari.** Banklar milliy talablar va moliyaviy hisobotning xalqaro standartlari asosida hisobot beradi, islom moliyasi bitimlari esa xalqaro amaliyotda koʻpincha [[aaoifi|AAOIFI]] moliyaviy hisob standartlari boʻyicha aks ettiriladi. Ikki tizim oʻrtasidagi farqlar boʻyicha regulyatorning batafsil tushuntirishlari hali kutilmoqda.',
          '**Qayta sotishdagi soliq.** Murobahada bank aktivni avval oʻzi sotib oladi, keyin mijozga sotadi. Agar bu ikki bosqich soliq maqsadida ikki alohida savdo deb qaralsa, ustamaga qoʻshilgan qiymat soligʻi hisoblanishi va mol-mulkni qayta roʻyxatdan oʻtkazish xarajatlari paydo boʻlishi mumkin. Bozor ishtirokchilari soliq neytralligi masalasi hali toʻliq hal etilmaganini taʼkidlamoqda.',
        ],
      },
      {
        type: 'quote',
        text: 'Litsenziya olish — yoʻlning yarmi. Asosiy ish undan keyin boshlanadi: odamlar, tizimlar va hujjatlar.',
        cite: 'Lola Tojiboyeva',
        role: 'islom moliyasi boʻyicha mustaqil maslahatchi',
      },
      {
        type: 'p',
        text: 'Islom moliyasi boʻyicha mustaqil maslahatchi Lola Tojiboyevaning soʻzlariga koʻra, litsenziya olgan tashkilotlarning ilk mahsulotlari oddiy tuzilmalardan iborat boʻlishi tabiiy. «Murobaha va ijora — bozor uchun eng tushunarli shartnomalar. Foyda va zararni taqsimlashga asoslangan mahsulotlar uchun kuchliroq risk boshqaruvi va bir necha yillik tajriba kerak», — dedi u.',
      },
      { type: 'h2', text: 'Yil oxirigacha nimalar hal boʻladi' },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: 'Niyat eʼlon qilgan tashkilotlar', value: '21' },
          { label: 'Regulyatorga topshirilgan arizalar', value: '17' },
          { label: 'Berilgan litsenziyalar', value: '6' },
          { label: 'Koʻrib chiqilayotgan arizalar', value: '6' },
          { label: 'Litsenziyalangan takaful operatorlari', value: '0' },
        ],
        note: '8-oktabr holatiga. Manba: Muomalat hisob-kitoblari.',
      },
      {
        type: 'p',
        text: 'Yil oxirigacha bozor uchun uchta masala muhim boʻladi. Birinchisi — koʻrib chiqilayotgan oltita ariza, jumladan, Islom banki B va Takaful operatori Q arizalari boʻyicha qarorlar. Takaful operatori Q litsenziya olsa, bozorda birinchi [[takaful|takaful]] operatori paydo boʻladi va islom oynalari mijozlari moliyalangan aktivlarni takaful asosida sugʻurta qila oladi. Regulyator takaful faoliyati qoidalari loyihasini 8-oktabrda jamoatchilik muhokamasiga qoʻydi, takliflar 7-noyabrgacha qabul qilinadi.',
      },
      {
        type: 'p',
        text: 'Ikkinchisi — soliq neytralligi boʻyicha tushuntirishlar. Murobaha va ijora mahsulotlari anʼanaviy kreditlar bilan narx boʻyicha teng sharoitda raqobatlasha olishi shunga bogʻliq. Uchinchisi — yangi mahsulotlar bozorga qanchalik tez chiqishi. Tijorat banki E oynasi ilk operatsiyalarni dekabrda boshlashni rejalashtirmoqda, Islom banki A esa 7-oktabrda ochilgan filiali orqali chakana mijozlarga xizmat koʻrsata boshladi. Ikki tashkilotning birinchi oylardagi natijalari aholi va kichik biznes talabini baholash imkonini beradi.',
      },
      {
        type: 'p',
        text: 'Muomalat litsenziyalash jarayonini [islom moliyasi xaritasi](/xarita) boʻlimida muntazam yangilab boradi.',
      },
    ],
    sources: [
      { title: 'Regulyatorning rasmiy xabari', publisher: 'Bank regulyatori', date: '2026-10-08', type: 'press' },
      { title: 'Islom bank faoliyati toʻgʻrisidagi qonun', publisher: 'Qonunchilik maʼlumotlari milliy bazasi', type: 'document' },
      { title: 'Bank maʼlumotlari', publisher: 'Tijorat banki D', date: '2026-10-06', type: 'report' },
      { title: 'Bank xabari', publisher: 'Islom banki A', date: '2026-10-07', type: 'press' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-10-05', type: 'interview' },
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-10-08', type: 'data' },
    ],
  },

  // ── th-02 ────────────────────────────────────────────────────────────────
  {
    id: 'th-02',
    slug: 'murobaha-narxi-qatiy-stavkali-kredit-bilan-deyarli-teng',
    rubric: 'tahlil',
    kicker: 'Mahsulotlar narxi',
    title: 'Murobaha narxi qatʼiy stavkali kredit bilan deyarli teng, asosiy nomaʼlum — soliq',
    lead: 'Muomalat 300 mln soʻmlik uskunani 24 oyga moliyalashning toʻrt variantini taqqosladi. Ustamaga QQS qoʻllansa, murobaha xarajati 9,5 mln soʻmga oshadi va u eng qimmat variantga aylanadi.',
    authors: ['jasur-toshmatov', 'aziza-rahimova'],
    publishedAt: '2026-10-02T09:00:00+05:00',
    image: img('workshop', {
      caption: 'Kichik ishlab chiqarish sexi. Uskuna xaridini moliyalash islom oynalarining ilk mahsulotlaridan biri',
    }),
    tags: ['murobaha', 'islom-oynasi', 'kichik-biznes'],
    terms: ['murobaha', 'ribo', 'rahn', 'vad', 'daromadni-tozalash', 'kafolat', 'islom-oynasi'],
    related: ['th-01'],
    views: 9800,
    body: [
      {
        type: 'p',
        text: 'Birinchi [[islom-oynasi|islom oynasi]] ish boshlagach, tadbirkorlar oldida amaliy savol paydo boʻldi: [[murobaha|murobaha]] orqali uskuna sotib olish odatdagi bank kreditidan qimmatga tushadimi yoki yoʻqmi. Muomalat bir xil sharoitdagi toʻrt moliyalash variantini taqqosladi: qatʼiy stavkali kredit, suzuvchi stavkali kreditning ikki ssenariysi va ustamasi oldindan belgilanadigan murobaha.',
      },
      {
        type: 'p',
        text: 'Hisob-kitob shartlari quyidagicha: kichik ishlab chiqarish korxonasi qiymati 300 mln soʻm boʻlgan dastgoh sotib oladi, moliyalash muddati — 24 oy, toʻlovlar har oy teng ulushlarda amalga oshiriladi. Mijozning oʻz hissasi, imtiyozli dasturlar va subsidiyalar hisobga olinmagan. Stavka va yigʻimlar bozordagi takliflarga yaqin qilib olingan, biroq ular tasviriy boʻlib, biror bankning tarifini aks ettirmaydi.',
      },
      { type: 'h2', text: 'Qatʼiy ustama va suzuvchi stavka' },
      {
        type: 'p',
        text: 'Anʼanaviy kreditda bank mijozga pul qarz beradi va undan foiz oladi. Murobahada esa bank mijoz tanlagan uskunani yetkazib beruvchidan oʻzi sotib oladi va uni mijozga kelishilgan ustama bilan, toʻlovni boʻlib-boʻlib toʻlash sharti bilan sotadi. Sotish narxi shartnoma imzolangan paytda qatʼiy belgilanadi va keyinchalik oʻzgarmaydi. Bu tuzilma pul qarzi evaziga [[ribo|foiz (ribo)]] olishni istisno qilish va bitimni real aktivga bogʻlash tamoyiliga asoslanadi.',
      },
      {
        type: 'p',
        text: 'Hisob-kitobda qatʼiy stavkali kredit uchun yillik 23 foiz olindi. Suzuvchi stavkali kredit asosiy stavkaga bogʻlangan va 21 foizdan boshlanadi. Uning ikki varianti koʻrib chiqildi: stavka butun muddat davomida oʻzgarmaydi yoki ettinchi oydan 4 foiz bandga oshadi. Murobaha ustamasi yillik 23,5 foizga teng qilib belgilandi. Bozor ishtirokchilarining aytishicha, islom oynalari ilk bosqichda narxni anʼanaviy mahsulotlarga yaqin, ammo biroz yuqoriroq qoʻyadi, chunki aktivni sotib olish va qayta rasmiylashtirish qoʻshimcha operatsion xarajat talab qiladi.',
      },
      {
        type: 'p',
        text: 'Yana bir jihat bor: islom oynalari ustamani belgilashda bozordagi stavkalarni mezon sifatida ishlatadi. Bu xalqaro amaliyotda keng tarqalgan va bitim tuzilmasini oʻzgartirmaydi — shartnomada pul qarzi va foiz emas, aktivning sotish narxi qayd etiladi. Ammo natijada murobaha narxi bozor stavkalaridan uzoqlashmaydi, shuning uchun uni kredit bilan bevosita solishtirish mumkin.',
      },
      {
        type: 'table',
        caption: 'Moliyalash xarajatlari: 300 mln soʻmlik uskuna, 24 oy (mln soʻm)',
        columns: [
          { label: 'Koʻrsatkich' },
          { label: 'Kredit, qatʼiy 23%', align: 'right' },
          { label: 'Kredit, suzuvchi 21%', align: 'right' },
          { label: 'Kredit, suzuvchi 21% → 25%', align: 'right' },
          { label: 'Murobaha, ustama 23,5%', align: 'right' },
        ],
        rows: [
          ['Foiz yoki ustama, jami', 77.1, 70.0, 78.3, 78.9],
          ['Komissiya va hujjatlashtirish', 3.0, 3.0, 3.0, 1.5],
          ['Garovni baholash va notarius', 1.2, 1.2, 1.2, 1.2],
          ['Garov sugʻurtasi, 2 yil', 3.6, 3.6, 3.6, 3.6],
          ['Jami moliyalash xarajati', 84.9, 77.8, 86.1, 85.2],
          ['Oylik toʻlov, 1–6-oylar', 15.71, 15.42, 15.42, 15.79],
          ['Oylik toʻlov, 7–24-oylar', 15.71, 15.42, 15.88, 15.79],
          ['Samarali yillik qiymat, %', 25.6, 23.6, 25.8, 25.6],
        ],
        note: 'Toʻlovlar annuitet usulida. Samarali yillik qiymat komissiya, baholash va sugʻurta xarajatlarini hisobga olgan holda pul oqimlari asosida hisoblangan. Murobaha ustamasiga QQS qoʻllanmaydi deb faraz qilingan.',
        source: 'Muomalat hisob-kitoblari',
      },
      {
        type: 'p',
        text: 'Natijalarga koʻra, bazaviy sharoitda murobaha qatʼiy stavkali kredit bilan deyarli teng: jami xarajatlardagi farq 0,3 mln soʻm. Murobahada ustama 1,8 mln soʻmga yuqori, ammo komissiya va hujjatlashtirish yigʻimlari ikki baravar past boʻlgani uchun farq deyarli qoplanadi. Stavka oʻzgarmasa, suzuvchi stavkali kredit eng arzon variant boʻlib qoladi — mijoz murobahaga nisbatan 7,4 mln soʻm tejaydi. Biroq stavka ettinchi oydan 4 foiz bandga oshsa, bu ustunlik yoʻqoladi va kredit murobahadan 0,9 mln soʻm qimmatga tushadi.',
      },
      {
        type: 'p',
        text: 'Mijoz 20 foiz boshlangʻich toʻlov qilsa, moliyalash summasi 240 mln soʻmga tushadi va barcha variantlarda xarajatlar kamayadi, ammo ular oʻrtasidagi nisbat deyarli oʻzgarmaydi.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'bar',
          title: 'Moliyalashning samarali yillik qiymati',
          subtitle: '300 mln soʻm, 24 oy, komissiya va sugʻurta bilan',
          unit: '%',
          data: [
            { label: 'Kredit, suzuvchi stavka oʻzgarmasa', value: 23.6 },
            { label: 'Murobaha', value: 25.6, highlight: true },
            { label: 'Kredit, qatʼiy stavka', value: 25.6 },
            { label: 'Kredit, suzuvchi stavka 4 bandga oshsa', value: 25.8 },
            { label: 'Murobaha, ustamaga QQS qoʻllansa', value: 28.2 },
          ],
          source: 'Muomalat hisob-kitoblari',
          note: 'Tasviriy hisob-kitob. Aniq shartlar har bir bank va mijozda farq qiladi.',
        },
      },
      { type: 'h2', text: 'Soliq omili' },
      {
        type: 'p',
        text: 'Hisob-kitobdagi eng katta nomaʼlum — soliq. Murobahada uskunaga egalik huquqi avval bankka, soʻng mijozga oʻtadi. Agar bankning ustamasi soliq maqsadida tovar sotishdan olingan daromad deb qaralsa, unga 12 foizlik qoʻshilgan qiymat soligʻi qoʻllanishi mumkin. Muomalat misolida bu taxminan 9,5 mln soʻm qoʻshimcha xarajat demakdir: jami xarajat 94,6 mln soʻmga, samarali yillik qiymat esa 28,2 foizga chiqadi.',
      },
      {
        type: 'p',
        text: 'QQS toʻlovchisi boʻlgan korxona bu summani oʻz soliq majburiyatidan chegirishi mumkin, aylanmadan soliq toʻlaydigan kichik biznes uchun esa u toʻgʻridan-toʻgʻri qoʻshimcha xarajatga aylanadi. Bozor ishtirokchilarining aytishicha, islom moliyasi bitimlariga anʼanaviy kreditlar bilan teng soliq rejimi qoʻllanishi — soliq neytralligi — mahsulot narxining raqobatbardoshligi uchun hal qiluvchi ahamiyatga ega. Xalqaro amaliyotda islom moliyasi rivojlangan koʻplab mamlakatlar murobaha va ijora bitimlarini soliq maqsadida moliyalash operatsiyasi sifatida koʻrib, ikki marta soliq solinishining oldini olgan.',
      },
      {
        type: 'quote',
        text: 'Mijoz uchun asosiy farq narxda emas, oldindan bilishda: murobahada umumiy toʻlov shartnoma imzolangan kuniyoq maʼlum boʻladi.',
        cite: 'Doniyor Qahhorov',
        role: 'korporativ moliya boʻyicha tahlilchi',
      },
      {
        type: 'p',
        text: 'Korporativ moliya boʻyicha tahlilchi Doniyor Qahhorovning fikricha, stavkalar oʻzgaruvchan davrda bu omil koʻplab korxonalar uchun bir necha million soʻmlik farqdan muhimroq. «Eksport shartnomasi yoki uzoq muddatli buyurtma asosida ishlaydigan korxona xarajatlarini oldindan rejalashtirishi kerak. Suzuvchi stavka arzonroq boʻlishi mumkin, ammo uning riski toʻliq mijoz zimmasida», — dedi u.',
      },
      { type: 'h2', text: 'Garov, kechikish va muddatidan oldin toʻlash' },
      {
        type: 'p',
        text: 'Taʼminot talablari ikkala mahsulotda oʻxshash. Banklar odatda sotib olinayotgan uskunaning oʻzini garovga oladi, murobahada bu [[rahn|rahn]] deb ataladi. Kichik korxonalardan qoʻshimcha ravishda taʼsischining kafilligi yoki uchinchi shaxs [[kafolat|kafolati]] talab qilinishi mumkin. Bundan tashqari, murobahada mijoz bank uskunani sotib olishidan oldin uni bankdan xarid qilish boʻyicha [[vad|vaʼda]] beradi. Mijoz keyin bitimdan voz kechsa, bankning haqiqiy zarari shu vaʼda asosida qoplanadi.',
      },
      {
        type: 'p',
        text: 'Toʻlov kechiktirilganda farq yaqqol koʻrinadi. Anʼanaviy kreditda muddati oʻtgan summaga penya hisoblanadi va u bank daromadiga aylanadi. Islom oynalari shartnomalarida esa odatda mijoz kechiktirilgan har bir kun uchun kelishilgan summani xayriya maqsadlariga yoʻnaltirish majburiyatini oladi. Bank bu mablagʻni daromad sifatida tan olmaydi va alohida hisobvaraq orqali xayriyaga oʻtkazadi — bu [[daromadni-tozalash|daromadni tozalash]] amaliyotining bir koʻrinishi. Bank faqat undiruv bilan bogʻliq haqiqiy xarajatlarni qoplashi mumkin. Shu tariqa kechikish bank uchun daromad manbai boʻlmaydi, mijoz uchun esa moliyaviy majburiyat boʻlib qolaveradi.',
      },
      {
        type: 'p',
        text: 'Muddatidan oldin toʻlashda ham tafovut bor. Kreditda qarzdor qolgan asosiy qarzni toʻlab, kelgusi foizlardan ozod boʻladi. Murobahada sotish narxi qatʼiy boʻlgani uchun qolgan ustamadan chegirma berish bankning ixtiyorida. Muomalat suhbatlashgan bankirlarning aytishicha, bunday chegirma odatda bankning ichki siyosati asosida beriladi, ammo shartnomaga majburiyat sifatida kiritilmaydi.',
      },
      { type: 'h2', text: 'Kimga qaysi variant mos' },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: 'Murobaha va qatʼiy kredit xarajatlari farqi', value: '0,3 mln soʻm' },
          { label: 'Stavka oʻzgarmasa, suzuvchi kredit afzalligi', value: '7,4 mln soʻm' },
          { label: 'Ustamaga QQS qoʻllansa, qoʻshimcha xarajat', value: '9,5 mln soʻm' },
          { label: 'Murobaha boʻyicha oylik toʻlov', value: '15,79 mln soʻm' },
        ],
        note: '300 mln soʻm, 24 oy. Manba: Muomalat hisob-kitoblari.',
      },
      {
        type: 'p',
        text: 'Hisob-kitob natijalarini quyidagicha umumlashtirish mumkin. Stavkalar barqaror qolsa, suzuvchi stavkali kredit arzonroq. Stavkalar oshish ehtimoli yuqori boʻlsa yoki korxona toʻlov jadvalini oldindan aniq bilishni istasa, murobaha raqobatbardosh variantga aylanadi. Qatʼiy stavkali kredit bilan solishtirganda esa ikki mahsulot amalda teng.',
      },
      {
        type: 'p',
        text: 'Korxona turi ham ahamiyatga ega. Eksport yoki yirik buyurtmachilar bilan uzoq muddatli shartnomalar asosida ishlaydigan korxona uchun toʻlovlarni oldindan bilish muhimroq. Mavsumiy daromadga ega korxonalar uchun toʻlov jadvalini moslashtirish imkoniyati birinchi oʻringa chiqadi — murobahada ham, kreditda ham bu bankning ichki qoidalariga bogʻliq. QQS toʻlovchisi boʻlmagan kichik korxonalar uchun esa soliq masalasi aniq boʻlgunga qadar murobaha qimmatroq tushishi mumkin.',
      },
      {
        type: 'p',
        text: 'Islom oynalari narx boʻyicha anʼanaviy banklar bilan teng sharoitda raqobatlasha olishi koʻp jihatdan soliq qoidalariga bogʻliq. Ikkinchi omil — hajm: oynalar portfeli kattalashgani sari aktivni sotib olish va rasmiylashtirish xarajatlari kamayadi va ustamani pasaytirish uchun imkon paydo boʻladi.',
      },
      {
        type: 'callout',
        title: 'Maʼlumot uchun',
        text: 'Hisob-kitob tasviriy boʻlib, moliyaviy maslahat hisoblanmaydi. Real takliflarda boshlangʻich toʻlov, garov talablari va yigʻimlar farq qiladi. Mahsulotlarni solishtirishda toʻliq toʻlov jadvali va barcha yigʻimlar roʻyxatini soʻrash mumkin.',
      },
    ],
    sources: [
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-09-30', type: 'data' },
      { title: 'AAOIFI Shariat standarti № 8 «Murobaha»', publisher: 'AAOIFI', type: 'document' },
      { title: 'Kompaniya taqdimoti', publisher: 'Tijorat banki D', date: '2026-09-15', type: 'report' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-29', type: 'interview' },
    ],
  },

  // ── th-03 ────────────────────────────────────────────────────────────────
  {
    id: 'th-03',
    slug: 'sukuk-birinchi-emissiya-uchun-beshta-shart',
    rubric: 'tahlil',
    kicker: 'Kapital bozori',
    title: 'Sukuk: birinchi emissiya uchun beshta shart',
    lead: 'Bozor ishtirokchilari Oʻzbekistondagi ilk sukukni eng erta 2027-yilning ikkinchi yarmida kutmoqda. Unga qadar maxsus maqsadli kompaniyalar, soliq, aktivlar, investorlar va listing boʻyicha masalalar hal qilinishi kerak.',
    authors: ['jasur-toshmatov'],
    publishedAt: '2026-09-28T10:00:00+05:00',
    image: img('financialDistrict', {
      caption: 'Xorijiy moliya markazidagi bank binolari. Global sukuk emissiyasining asosiy qismi Fors koʻrfazi mamlakatlari va Janubi-Sharqiy Osiyoga toʻgʻri keladi',
    }),
    tags: ['sukuk', 'kapital-bozori', 'qonunchilik', 'soliq'],
    terms: ['sukuk', 'ijora', 'muzoraba', 'vakola', 'aaoifi', 'murobaha', 'investitsiya-hisobvaragi', 'takaful'],
    related: ['th-04'],
    views: 6400,
    body: [
      {
        type: 'p',
        text: '[[sukuk|Sukuk]] — islom moliyasida obligatsiyaga eng yaqin vosita, ammo u muhim jihati bilan farq qiladi: investor emitentning qarz majburiyatiga emas, aniq aktiv yoki loyihadagi ulushga egalik qiladi va daromadni shu aktivdan oladi. Xalqaro bozor sharhlariga koʻra, dunyoda sukukning yillik emissiyasi 200 mlrd dollardan oshadi. Oʻzbekistonda esa hali birorta sukuk chiqarilmagan.',
      },
      {
        type: 'p',
        text: 'Islom oynalari va banklar ochilishi bilan bu masala amaliy tus oldi. Ularga jalb qilingan mablagʻlarni joylashtirish uchun likvid va islom moliyasi tamoyillariga mos vositalar kerak. Anʼanaviy banklar ortiqcha likvidlikni davlat obligatsiyalari yoki depozit auksionlariga joylashtiradi. Islom oynalari uchun bu yoʻl yopiq: ular foizli vositalarga mablagʻ joylashtirmaydi.',
      },
      {
        type: 'p',
        text: 'Natijada oynalar ortiqcha mablagʻni daromadsiz naqd pul yoki vakillik hisobvaraqlarida saqlashga majbur. Muomalat hisob-kitobiga koʻra, likvid aktivlar islom oynasi balansining 15 foizini tashkil etsa va ulardan daromad olinmasa, [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]] egalariga taqsimlanadigan daromad yiliga 2–3 foiz bandga kamayadi. Bu esa oynalarning jamgʻarma mahsulotlari bozoridagi raqobatbardoshligini pasaytiradi.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'line',
          title: 'Global sukuk emissiyasi',
          subtitle: 'yillik hajm, yaxlitlangan',
          unit: 'mlrd dollar',
          xLabels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
          series: [
            { name: 'Jami emissiya', values: [160, 170, 185, 170, 195, 205, 215] },
            { name: 'Shundan xorijiy valutada', values: [40, 45, 50, 45, 60, 70, 75] },
          ],
          source: 'Xalqaro bozor sharhlari asosida Muomalat hisob-kitoblari',
          note: 'Tasviriy, yaxlitlangan maʼlumotlar. Turli manbalarda baholar farq qiladi.',
        },
      },
      {
        type: 'p',
        text: 'Global bozor 2022-yildagi pasayishdan keyin yana oʻsishga qaytdi, xorijiy valutadagi emissiyalar ulushi esa 2019-yildagi 25 foizdan 35 foizga oshdi. Bu Oʻzbekiston uchun muhim: mamlakat hukumati va yirik kompaniyalar xalqaro bozorda anʼanaviy yevroobligatsiyalar joylashtirish tajribasiga ega. Sukuk ular uchun investorlar bazasini kengaytirish vositasi boʻlishi mumkin. Ammo xalqaro emissiyadan oldin ichki bozorda huquqiy va texnik asos shakllanishi kerak.',
      },
      { type: 'h2', text: 'Beshta shart' },
      {
        type: 'p',
        text: 'Muomalat suhbatlashgan yuristlar, bankirlar va kapital bozori ishtirokchilari birinchi emissiyadan oldin hal qilinishi kerak boʻlgan beshta masalani sanab oʻtdi.',
      },
      { type: 'h3', text: '1. Maxsus maqsadli kompaniya' },
      {
        type: 'p',
        text: 'Sukuk tuzilmalarining aksariyatida aktiv emitent balansidan maxsus maqsadli kompaniyaga (SPV) oʻtkaziladi. Bu kompaniya investorlar nomidan aktivga egalik qiladi va undan tushgan daromadni ularga taqsimlaydi. Amaldagi qonunchilikda bunday kompaniyalar uchun alohida huquqiy rejim yoʻq. Ularni oddiy masʼuliyati cheklangan jamiyat sifatida tuzish mumkin, ammo emitent bankrot boʻlgan holatda aktiv uning kreditorlaridan himoyalanganmi yoki yoʻqmi — bu aniq belgilanmagan.',
      },
      { type: 'h3', text: '2. Soliq neytralligi' },
      {
        type: 'p',
        text: 'Aktiv SPVga oʻtkazilganda va muddat oxirida emitentga qaytarilganda har bir bosqich soliq nuqtai nazaridan alohida bitim deb qaralishi mumkin. Bu qoʻshilgan qiymat soligʻi, mol-mulkni qayta roʻyxatdan oʻtkazish yigʻimlari va foyda soligʻi bilan bogʻliq xarajatlarni keltirib chiqaradi. Anʼanaviy obligatsiyada bunday bosqichlar yoʻq. Muomalat hisob-kitobiga koʻra, soliq imtiyozlari boʻlmasa, besh yillik [[ijora|ijora]] sukukida aktivni ikki marta oʻtkazish emissiya qiymatini yiliga 1,5–2 foiz bandga oshirishi mumkin.',
      },
      { type: 'h3', text: '3. Aktivlar reyestri' },
      {
        type: 'p',
        text: 'Ijora sukuki uchun egalik huquqi aniq va yuklamalardan xoli aktivlar kerak: koʻchmas mulk, infratuzilma obyektlari, uskunalar. Bozor ishtirokchilarining aytishicha, potensial emitentlar aktivlarining katta qismi allaqachon bank kreditlari boʻyicha garovda turibdi yoki ular boʻyicha kadastr hujjatlari toʻliq emas. Davlat sukuki haqida gap ketganda, qaysi davlat aktivlari bunday bitimga jalb qilinishi mumkinligini belgilovchi tartib ham zarur.',
      },
      { type: 'h3', text: '4. Investorlar bazasi' },
      {
        type: 'p',
        text: 'Mahalliy talab hozircha kichik. Islom oynalaridagi investitsiya hisobvaraqlari endi shakllanmoqda, [[takaful|takaful]] operatorlari esa hali litsenziya olmagan. Muomalat hisob-kitobiga koʻra, 2027-yil oxiriga borib islom moliyasi tashkilotlarining sukukka yoʻnaltirishi mumkin boʻlgan likvid mablagʻlari 1,5–2,5 trln soʻm atrofida boʻladi. Birinchi emissiya uchun bu yetarli, ammo bozorni kengaytirish uchun xorijiy investorlar ham kerak. Ular esa valyuta riski va uni boshqarish vositalari masalasini koʻtaradi.',
      },
      {
        type: 'p',
        text: 'Investorlar uchun yana bir savol — daromad qanday soliqqa tortilishi. Anʼanaviy obligatsiyalar boʻyicha foiz daromadiga ayrim hollarda imtiyozlar qoʻllanadi. Sukuk daromadi ijora toʻlovi yoki foyda ulushi sifatida qaralsa, u boshqacha tartibda soliqqa tortilishi mumkin. Bozor ishtirokchilarining taʼkidlashicha, ikki vosita uchun teng soliq rejimi belgilanmasa, investorlar anʼanaviy obligatsiyani tanlaydi.',
      },
      { type: 'h3', text: '5. Listing va savdo' },
      {
        type: 'p',
        text: 'Sukuk ikkilamchi bozorda savdo qilinmasa, investor uni muddat oxirigacha ushlab turishga majbur boʻladi. Mahalliy fond birjasi va depozitariy qoidalarida sukuk alohida qimmatli qogʻoz turi sifatida ajratilmagan. Listing talablari, axborotni oshkor qilish tartibi va daromadni hisoblash usullari obligatsiyalarga moʻljallangan. Xalqaro standartlarga koʻra, sukukning qayta sotilishi tarkibidagi real aktivlar ulushiga ham bogʻliq, buni birja qoidalarida aks ettirish kerak boʻladi.',
      },
      { type: 'h2', text: 'Qaysi tuzilma birinchi boʻladi' },
      {
        type: 'p',
        text: 'Xalqaro bozorda eng koʻp qoʻllaniladigan tuzilmalar — ijora, [[muzoraba|muzoraba]] va [[vakola|vakola]] sukuklari. Ular asosidagi aktiv, daromad manbai va investor riski boʻyicha farq qiladi. [[aaoifi|AAOIFI]] ning 17-sonli «Investitsion sukuk» Shariat standarti bu tuzilmalarning asosiy talablarini belgilaydi va koʻplab mamlakatlarda milliy qoidalar uchun asos boʻlib xizmat qiladi.',
      },
      {
        type: 'table',
        caption: 'Asosiy sukuk tuzilmalari',
        columns: [
          { label: 'Tuzilma' },
          { label: 'Asosidagi aktiv' },
          { label: 'Investor daromadi' },
          { label: 'Investor riski' },
          { label: 'Mahalliy bozorga tayyorlik' },
        ],
        rows: [
          [
            'Ijora sukuki',
            'Koʻchmas mulk, uskuna, infratuzilma',
            'Ijora toʻlovlari: qatʼiy yoki benchmarkka bogʻlangan',
            'Emitent riskiga yaqin, aktiv sifati muhim',
            'Yuqori: ijora shartnomalari bozorda allaqachon qoʻllanmoqda',
          ],
          [
            'Muzoraba sukuki',
            'Loyiha yoki biznes faoliyati',
            'Foydaning kelishilgan ulushi',
            'Yuqori: moliyaviy zarar kapital egasiga tushadi',
            'Past: foyda hisobi va audit talablari murakkab',
          ],
          [
            'Vakola sukuki',
            'Aralash aktivlar portfeli: ijora, murobaha va boshqalar',
            'Portfel daromadi, vakil boshqaruv haqi oladi',
            'Portfel tarkibi va vakil sifatiga bogʻliq',
            'Oʻrta: portfel uchun yetarli hajmdagi aktivlar kerak',
          ],
        ],
        source: 'AAOIFI Shariat standarti № 17, Muomalat tahlili',
      },
      {
        type: 'p',
        text: 'Bozor ishtirokchilarining aksariyati birinchi emissiya uchun ijora sukukini eng real variant deb hisoblaydi. Uning tuzilmasi tushunarli, daromadi oldindan hisoblanadi va anʼanaviy obligatsiyalar investorlariga ham tanish. Vakola sukuki islom oynalari portfeli yetarli hajmga yetgandan keyin, ehtimol, ikki-uch yil ichida paydo boʻladi.',
      },
      {
        type: 'p',
        text: 'Muzoraba sukuki esa uzoqroq istiqbol. U investorni loyiha natijasiga bevosita sherik qiladi va energetika yoki infratuzilma loyihalarini moliyalash uchun qiziqarli boʻlishi mumkin. Biroq bunday tuzilma loyihaning foydasini mustaqil hisoblash, muntazam audit va investorlarga batafsil hisobot berishni talab qiladi. Mahalliy bozorda bunday amaliyot hali shakllanmagan.',
      },
      {
        type: 'quote',
        text: 'Birinchi sukuk texnik loyiha emas, namunaviy hujjat boʻladi. Keyingi har bir emissiya shu yoʻldan yuradi.',
        cite: 'Ulugʻbek Rahmonov',
        role: 'kapital bozori boʻyicha yurist',
      },
      {
        type: 'p',
        text: 'Kapital bozori boʻyicha yurist Ulugʻbek Rahmonovning fikricha, birinchi emissiya katta boʻlishi shart emas. «300–500 mlrd soʻmlik ijora sukuki yaxshi boshlanish boʻladi. Muhimi — SPV, soliq va listing boʻyicha qoidalar sinovdan oʻtadi va keyingi emitentlar uchun tayyor yoʻl paydo boʻladi», — dedi u.',
      },
      { type: 'h2', text: 'Muddatlar va kutilmalar' },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: 'Oʻzbekistondagi sukuk emissiyalari', value: '0' },
          { label: 'Global yillik emissiya, 2025 (taxminan)', value: '215 mlrd dollar' },
          { label: 'Ilk emissiyaning mumkin boʻlgan hajmi', value: '300–500 mlrd soʻm' },
          { label: 'Islom moliyasi tashkilotlarining likvid mablagʻlari, 2027 (baho)', value: '1,5–2,5 trln soʻm' },
        ],
        note: 'Manba: Muomalat hisob-kitoblari, xalqaro bozor sharhlari.',
      },
      {
        type: 'p',
        text: 'Muomalat suhbatlashgan mutaxassislar birinchi emissiyani eng erta 2027-yilning ikkinchi yarmida kutmoqda. Ularning fikricha, unga qadar SPV va soliq neytralligi boʻyicha qonunosti hujjatlari qabul qilinishi, birja va depozitariy qoidalariga tegishli oʻzgartirishlar kiritilishi lozim. Bu ishlar parallel olib borilsa, muddat qisqarishi mumkin. Taqqoslash uchun: islom moliyasi boʻyicha qonun qabul qilgan boshqa mamlakatlarda birinchi sukuk odatda qonun kuchga kirganidan ikki-uch yil oʻtib chiqarilgan, shu maʼnoda 2027-yil optimistik muddat hisoblanadi.',
      },
      {
        type: 'p',
        text: 'Emitent kim boʻlishi hozircha ochiq savol. Bir guruh mutaxassislar davlat sukuki bozor uchun etalon daromadlilikni belgilashini va keyingi korporativ emissiyalarni osonlashtirishini taʼkidlaydi. Boshqalar ijora asosida ishlayotgan lizing kompaniyalari yoki infratuzilma loyihalari tashabbuskorlarini kichikroq, ammo tezroq amalga oshiriladigan variant sifatida koʻradi.',
      },
      {
        type: 'p',
        text: 'Har qanday holatda sukuk umumiy muammoga duch keladi: mahalliy qarz qimmatli qogʻozlari bozori hali kichik. Bozor ishtirokchilari baholashicha, muomaladagi korporativ obligatsiyalar hajmi bank kreditlari portfelining bir foizidan ham kam. Investorlar ham, emitentlar ham bunday vositalarga hali koʻnikmagan, shuning uchun birinchi sukukning muvaffaqiyati koʻp jihatdan uni joylashtirish va tushuntirish ishlariga bogʻliq boʻladi.',
      },
    ],
    sources: [
      { title: 'Islom bank faoliyati toʻgʻrisidagi qonun', publisher: 'Qonunchilik maʼlumotlari milliy bazasi', type: 'document' },
      { title: 'AAOIFI Shariat standarti № 17 «Investitsion sukuk»', publisher: 'AAOIFI', type: 'document' },
      { title: 'Global sukuk bozori boʻyicha ochiq sharhlar', publisher: 'Xalqaro bozor tadqiqotlari', type: 'report' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-24', type: 'interview' },
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-09-26', type: 'data' },
    ],
  },

  // ── th-04 ────────────────────────────────────────────────────────────────
  {
    id: 'th-04',
    slug: 'takaful-bozori-kapital-mijoz-va-qayta-sugurta',
    rubric: 'tahlil',
    kicker: 'Sugʻurta',
    title: 'Takaful bozori: kapital, mijoz va qayta sugʻurta',
    lead: 'Muomalat hisob-kitobiga koʻra, 2030-yilga borib takaful badallari bazaviy ssenariyda yiliga 540 mlrd soʻmga yetishi mumkin. Asosiy cheklov talabda emas, kapital va qayta takaful sigʻimida.',
    authors: ['jasur-toshmatov'],
    publishedAt: '2026-09-25T09:30:00+05:00',
    image: img('cityStreet', {
      caption: 'Shahar koʻchasidagi ofislar va doʻkonlar. Avtotransport va mulk takafuli bozorning eng katta segmentlari boʻlishi kutilmoqda',
    }),
    tags: ['takaful', 'bozor-korsatkichlari', 'xalqaro-bozorlar'],
    terms: ['takaful', 'retakaful', 'vakola', 'qarzi-hasan', 'ifsb', 'maysir', 'garar', 'muzoraba', 'murobaha', 'ijora'],
    related: ['th-03'],
    views: 4700,
    body: [
      {
        type: 'p',
        text: 'Islom moliyasi bozorida hozircha litsenziya olgan birorta [[takaful|takaful]] operatori yoʻq. Toshkentdagi Takaful operatori Q ning arizasi regulyatorda koʻrib chiqilmoqda, Takaful operatori R hujjat topshirgan, Takaful operatori S esa bozorga kirish niyatini eʼlon qilgan. Shunga qaramay, sugʻurta bozori ishtirokchilari takafulni islom moliyasi zanjirining zarur boʻgʻini deb hisoblaydi: murobaha va ijora asosida moliyalangan har bir avtomobil, uskuna yoki uy sugʻurta qilinishi kerak.',
      },
      {
        type: 'p',
        text: 'Takaful anʼanaviy sugʻurtadan tuzilmasi bilan farq qiladi. Ishtirokchilar umumiy fondga badal toʻlaydi va bir-birining zararini shu fond hisobidan qoplashga kelishadi. Operator fondni boshqaradi va buning uchun haq oladi, lekin sugʻurta riskini oʻz zimmasiga olmaydi. Shartnomalarda qimorga oʻxshash tavakkal ([[maysir|maysir]]) va haddan tashqari noaniqlik ([[garar|gʻarar]]) boʻlmasligi kerak. Yil yakunida fondda ortiqcha mablagʻ qolsa, u kelishilgan qoidalar asosida ishtirokchilarga qaytarilishi yoki zaxiraga oʻtkazilishi mumkin.',
      },
      { type: 'h2', text: 'Bozor qancha boʻlishi mumkin' },
      {
        type: 'p',
        text: 'Bozor ishtirokchilari baholashicha, Oʻzbekistonda yillik sugʻurta mukofotlari 2025-yilda taxminan 9 trln soʻmni tashkil etgan. Yillik oʻsish 15 foiz atrofida saqlansa, 2030-yilga borib bozor 18 trln soʻmga yaqinlashadi. Muomalat shu bozordagi takaful ulushi boʻyicha uchta ssenariyni hisobladi.',
      },
      {
        type: 'table',
        caption: 'Takaful bozori ssenariylari, 2030-yil',
        columns: [
          { label: 'Ssenariy' },
          { label: 'Bozordagi ulush', align: 'right', unit: '%' },
          { label: 'Yillik badallar', align: 'right', unit: 'mlrd soʻm' },
          { label: 'Faol operatorlar', align: 'right', unit: 'ta' },
          { label: 'Qayta takafulga beriladi', align: 'right', unit: 'mlrd soʻm' },
        ],
        rows: [
          ['Pessimistik', 1.5, 270, 2, 95],
          ['Bazaviy', 3, 540, 3, 162],
          ['Optimistik', 6, 1080, 5, 270],
        ],
        note: 'Umumiy sugʻurta bozori 2030-yilda 18 trln soʻm deb faraz qilingan. Qayta takafulga beriladigan ulush ssenariylar boʻyicha 35, 30 va 25 foiz.',
        source: 'Muomalat hisob-kitoblari',
      },
      {
        type: 'p',
        text: 'Pessimistik ssenariy faqat islom moliyasi mijozlari — [[murobaha|murobaha]] va [[ijora|ijora]] orqali moliyalangan aktivlar egalari — talabiga tayanadi. Bazaviy ssenariyda takaful bundan tashqari islom oynalari mijozlari boʻlmagan, ammo shu tuzilmani afzal koʻradigan kichik biznes va oilalarni ham jalb qiladi. Optimistik ssenariyda esa takaful chakana segmentda, xususan avtotransport va mulk sugʻurtasida anʼanaviy sugʻurta bilan toʻgʻridan-toʻgʻri raqobatlashadi. Islom moliyasi rivojlangan mamlakatlarda takafulning ulushi bundan ham yuqori, ammo bunga oʻn yildan ortiq vaqt ichida erishilgan.',
      },
      {
        type: 'p',
        text: 'Sotuv kanali ham natijaga taʼsir qiladi. Bozor ishtirokchilari takaful mahsulotlarining asosiy qismi islom oynalari va lizing kompaniyalari orqali sotilishini kutmoqda: moliyalash shartnomasi tuzilayotganda mijozga aktivni sugʻurta qilish taklif etiladi. Bu sotuv xarajatlarini kamaytiradi, ammo operatorni bir nechta yirik hamkorga bogʻliq qilib qoʻyadi. Avtotransport egalarining fuqarolik javobgarligini majburiy sugʻurta qilish kabi ommaviy mahsulotlarda esa takaful operatorlari anʼanaviy sugʻurtachilar bilan bir xil shartlarda raqobatlashishi kerak boʻladi.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'bar',
          title: 'Takaful badallari segmentlar boʻyicha',
          subtitle: 'bazaviy ssenariy, 2030-yil',
          unit: 'mlrd soʻm',
          data: [
            { label: 'Avtotransport takafuli', value: 190 },
            { label: 'Kredit takafuli', value: 140, highlight: true },
            { label: 'Mulk takafuli', value: 120 },
            { label: 'Hayot va oila takafuli', value: 90 },
          ],
          source: 'Muomalat hisob-kitoblari',
        },
      },
      {
        type: 'p',
        text: 'Bazaviy ssenariyda eng katta segment — avtotransport takafuli. Ikkinchi oʻrinda kredit takafuli turadi: u islom moliyasi portfelining oʻsishiga bevosita bogʻliq. Hisob-kitobda islom moliyasi portfeli 2030-yilga borib 14 trln soʻmga yetishi, mijozning hayoti va toʻlov qobiliyatini himoyalovchi kredit takafuli boʻyicha yillik badallar esa portfelning taxminan 1 foiziga teng boʻlishi faraz qilingan. Hayot va oila takafuli uzoq muddatli jamgʻarma mahsuloti boʻlgani uchun sekinroq oʻsadi, ammo vaqt oʻtishi bilan eng barqaror segmentga aylanishi mumkin.',
      },
      { type: 'h2', text: 'Kapital: ikki xil fond' },
      {
        type: 'p',
        text: 'Takaful operatori kamida ikki fondni alohida yuritadi: aksiyadorlar fondi va ishtirokchilar risk fondi. Operatorning oʻz kapitali regulyatorning minimal talablarini bajarish, IT tizimlari va xodimlarni moliyalash uchun kerak. Risk fondi esa ishtirokchilar badallaridan shakllanadi. Fonddagi zararlar badallardan oshib ketsa, operator fondni foizsiz qarz — [[qarzi-hasan|qarzi hasan]] — bilan qoʻllab-quvvatlaydi. Bu qarz keyingi yillardagi ortiqcha mablagʻ hisobidan qaytariladi.',
      },
      {
        type: 'p',
        text: 'Muomalat hisob-kitobiga koʻra, bazaviy ssenariydagi uchta operatorning har biriga birinchi besh yilda minimal kapitaldan tashqari 60–80 mlrd soʻm qoʻshimcha mablagʻ kerak boʻladi. Bu mablagʻ IT tizimlari, aktuar hisob-kitoblar, sotuv tarmogʻi va qarzi hasan zaxirasiga sarflanadi. Uchala operator uchun bu jami 180–240 mlrd soʻm demakdir. Bozor ishtirokchilari asosiy model sifatida [[vakola|vakola]] modelini koʻrmoqda: operator badallardan oldindan belgilangan ulushni boshqaruv haqi sifatida oladi, fond mablagʻlarini investitsiya qilishda esa [[muzoraba|muzoraba]] tamoyili boʻyicha daromad ulushini olishi mumkin.',
      },
      {
        type: 'p',
        text: 'Ortiqcha mablagʻni taqsimlash mijoz uchun takafulning amaliy afzalligi boʻlishi mumkin. Muomalat hisob-kitobiga koʻra, zararlar darajasi badallarning 55–60 foizi atrofida boʻlgan avtotransport segmentida operator haqi va qayta takaful xarajatlari chegirilgach, ishtirokchilarga badalning 5–8 foizi miqdorida mablagʻ qaytarilishi mumkin. Ammo bu kafolatlanmaydi: zarari koʻp boʻlgan yilda ortiqcha mablagʻ qolmaydi.',
      },
      {
        type: 'p',
        text: 'Operatorlarni boshqarish boʻyicha xalqaro talablar asosan Islom moliyaviy xizmatlari kengashi — [[ifsb|IFSB]] standartlarida belgilangan. Ular fondlarni ajratish, ortiqcha mablagʻni taqsimlash va operator bilan ishtirokchilar oʻrtasidagi manfaatlar toʻqnashuvini boshqarish masalalarini qamrab oladi.',
      },
      {
        type: 'quote',
        text: 'Takaful uchun mijoz topish qiyin emas — murobaha va ijora mijozlari tayyor turibdi. Qiyini har bir yirik riskni kim qayta sugʻurta qilishini hal qilish.',
        cite: 'Munisa Valiyeva',
        role: 'aktuariy, sugʻurta bozori boʻyicha mustaqil ekspert',
      },
      { type: 'h2', text: 'Qayta takaful: sigʻim yetishmaydi' },
      {
        type: 'p',
        text: 'Kichik operator yirik risklarni — masalan, sanoat korxonasi mulkini yoki yuk avtomobillari parkini — oʻz fondida ushlab tura olmaydi. Anʼanaviy sugʻurtachilar bunday risklarni qayta sugʻurtachilarga beradi. Takaful operatori uchun esa sherik ham takaful tamoyillari asosida ishlashi — [[retakaful|retakaful]] — talab etiladi. Mahalliy bozorda retakaful sigʻimi yoʻq, shuning uchun risklarni xorijga, asosan Fors koʻrfazi mamlakatlari va Malayziyadagi retakaful kompaniyalariga berishga toʻgʻri keladi.',
      },
      {
        type: 'p',
        text: 'Bu uch muammoni keltirib chiqaradi. Birinchidan, xorijiy retakaful kompaniyalari yangi bozordagi risklarni baholash uchun tarixiy zarar statistikasini soʻraydi, bunday maʼlumot esa hali yoʻq. Ikkinchidan, valyutadagi toʻlovlar operator xarajatlarini oshiradi. Uchinchidan, regulyator chet elga beriladigan risk ulushi va sheriklarning moliyaviy barqarorligiga talablar qoʻyishi kutilmoqda. Bazaviy ssenariyda yiliga 162 mlrd soʻm badal qayta takafulga beriladi — bu xorijiy sheriklar uchun ham eʼtiborga loyiq hajm.',
      },
      {
        type: 'p',
        text: 'Aktuariy Munisa Valiyevaning soʻzlariga koʻra, bozorning ilk yillarida operatorlar risklarni kichik ulushlarda bir nechta xorijiy sherikka taqsimlashga majbur boʻladi. «Mahalliy retakaful sigʻimi bozor 500 mlrd soʻmdan oshgandan keyin paydo boʻlishi mumkin. Unga qadar operatorlar riskni oʻzida qanchalik koʻp ushlab tursa, kapitalga talab shunchalik yuqori boʻladi», — dedi u. Retakaful mavjud boʻlmagan hollarda anʼanaviy qayta sugʻurtadan vaqtincha foydalanish masalasi esa har bir operatorning shariat kengashi va regulyator qaroriga bogʻliq.',
      },
      { type: 'h2', text: 'Birinchi operator qachon chiqadi' },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: 'Litsenziya olgan takaful operatorlari', value: '0' },
          { label: 'Bozorga kirish niyatidagi operatorlar', value: '3' },
          { label: 'Bazaviy ssenariy badallari, 2030', value: '540 mlrd soʻm' },
          { label: 'Qayta takafulga beriladigan ulush, bazaviy', value: '30 foiz' },
        ],
        note: 'Manba: Muomalat hisob-kitoblari.',
      },
      {
        type: 'p',
        text: 'Takaful operatori Q vakillarining Muomalatga maʼlum qilishicha, kompaniya litsenziya olgach, avval mol-mulk takafulini taklif qilishni rejalashtirmoqda: u islom oynalari va lizing kompaniyalari bilan hamkorlikda moliyalangan aktivlarni sugʻurtalashga qaratiladi. Oilaviy takaful ham kompaniyaning dastlabki mahsulotlari qatorida. Hujjat topshirgan Takaful operatori R esa kompaniya eʼlon qilgan rejaga koʻra umumiy va avtotransport takafuliga ixtisoslashmoqchi. Bozor ishtirokchilari birinchi litsenziya 2026-yil oxiri yoki 2027-yil boshida berilishi mumkinligini taxmin qilmoqda.',
      },
      {
        type: 'p',
        text: 'Mijozlarning xabardorligi ham hal qiluvchi omil boʻladi. Anʼanaviy sugʻurtaning oʻzi ham aholi orasida hali keng tarqalmagan: ixtiyoriy mulk va hayot sugʻurtasining ulushi past. Takaful operatorlari mahsulot tuzilmasini — badal, umumiy fond va ortiqcha mablagʻni qaytarish tartibini — mijozga sodda tilda tushuntira olishi kerak. Aks holda takaful anʼanaviy sugʻurtadan faqat nomi bilan farq qiladigan mahsulot sifatida qabul qilinishi mumkin.',
      },
    ],
    sources: [
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-09-22', type: 'data' },
      { title: 'Kompaniya taqdimoti', publisher: 'Takaful operatori Q', date: '2026-09-10', type: 'report' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-23', type: 'interview' },
      { title: 'Takaful operatorlarini boshqarish boʻyicha standartlar', publisher: 'IFSB', type: 'document' },
    ],
  },

  // ── th-05 ────────────────────────────────────────────────────────────────
  {
    id: 'th-05',
    slug: 'kadrlar-tanqisligi-40-tashkilot-195-mutaxassis-izlamoqda',
    rubric: 'tahlil',
    kicker: 'Soʻrovnoma',
    title: 'Kadrlar tanqisligi: 40 tashkilot bir yilda 195 mutaxassis izlamoqda',
    lead: 'Muomalat soʻrovida qatnashganlarning 78 foizi kadrlarni asosiy toʻsiq deb atadi. Hozir 96 ta oʻrin boʻsh, eng yuqori oylik mahsulot menejerlari va shariat auditorlariga taklif qilinmoqda.',
    authors: ['jasur-toshmatov'],
    publishedAt: '2026-09-30T08:30:00+05:00',
    image: img('meetingTable', {
      caption: 'Muzokaralar stoli. Bozor ishtirokchilari mutaxassislarni asosan ichki qayta tayyorlash orqali topishga harakat qilmoqda',
    }),
    tags: ['kadrlar', 'shariat-kengashi', 'standartlar'],
    terms: ['shariat-kengashi', 'aaoifi', 'shariat-skriningi', 'murobaha', 'ijora', 'muzoraba', 'takaful'],
    related: ['th-01'],
    views: 7300,
    body: [
      {
        type: 'p',
        text: 'Islom moliyasi tashkilotlari litsenziya olish va mahsulotlarni ishga tushirishga tayyorlanar ekan, ular uchun eng katta toʻsiq kadrlar boʻlib qolmoqda. Muomalat sentabr oyida 40 bozor ishtirokchisi orasida soʻrov oʻtkazdi. Respondentlarning 31 tasi, yaʼni 78 foizi malakali xodim topishni faoliyatdagi uchta asosiy toʻsiq qatoriga kiritdi. Keyingi oʻrinlarda IT tizimlarini moslashtirish (19 ta javob) va soliq qoidalarining noaniqligi (15 ta javob) turibdi.',
      },
      {
        type: 'callout',
        title: 'Soʻrov haqida',
        text: 'Soʻrov 2026-yil 8–22-sentabr kunlari oʻtkazildi. Unda 10 ta bank va islom oynasi, 6 ta mikromoliya va lizing tashkiloti, 3 ta takaful operatori, 11 ta audit va konsalting kompaniyasi hamda 10 ta yuridik firma va IT yetkazib beruvchi ishtirok etdi. Natijalar statistik jihatdan butun bozorni aks ettirmaydi va bozor ishtirokchilarining kayfiyatini koʻrsatuvchi tasviriy maʼlumot sifatida berilmoqda.',
      },
      { type: 'h2', text: 'Qaysi lavozimlarga talab katta' },
      {
        type: 'p',
        text: 'Eng koʻp boʻsh oʻrin moliyalash tahlilchilari uchun ochilgan. Ular [[murobaha|murobaha]] va [[ijora|ijora]] arizalarini koʻrib chiqadi, mijozning toʻlov qobiliyatini va moliyalanayotgan aktivni baholaydi. Bu lavozimga anʼanaviy kredit tahlilchilarini qayta tayyorlash mumkin, shuning uchun ish haqi nisbatan past. Eng yuqori oylik esa mahsulot menejerlari, shariat auditorlari va IT tizim tahlilchilariga taklif qilinmoqda: bunday mutaxassislar bozorda eng kam uchraydi.',
      },
      {
        type: 'p',
        text: 'Ehtiyoj tashkilot turiga qarab farq qiladi. Banklar va islom oynalari birinchi navbatda mahsulot menejerlari va IT tahlilchilarini izlamoqda, mikromoliya va lizing tashkilotlari esa moliyalash tahlilchilari va buxgalterlarga muhtoj. Takaful operatorlari uchun eng qiyin topiladigan mutaxassis — aktuariy. Audit va konsalting kompaniyalari mijozlar soni ortishini kutib, shariat auditi boʻyicha jamoalarni shakllantirmoqda.',
      },
      {
        type: 'table',
        caption: 'Respondentlardagi boʻsh ish oʻrinlari',
        columns: [
          { label: 'Lavozim' },
          { label: 'Hozir ochiq', align: 'right', unit: 'ta' },
          { label: '12 oylik yollash rejasi', align: 'right', unit: 'ta' },
          { label: 'Taklif qilinayotgan oylik, median', align: 'right', unit: 'mln soʻm' },
        ],
        rows: [
          ['Moliyalash tahlilchisi (murobaha, ijora)', 21, 46, 15],
          ['AAOIFI standartlari boʻyicha buxgalter', 16, 31, 17],
          ['Shariat nazorati mutaxassisi', 14, 29, 22],
          ['Islom moliyasi mahsulot menejeri', 12, 25, 26],
          ['IT tizim tahlilchisi', 11, 20, 23],
          ['Shariat auditori', 9, 18, 24],
          ['Komplayens va risk mutaxassisi', 8, 17, 19],
          ['Takaful aktuariysi va anderrayteri', 5, 9, 21],
          ['Jami', 96, 195, null],
        ],
        note: '12 oylik reja hozir ochiq oʻrinlarni ham oʻz ichiga oladi. Oylik — soliqlar ushlab qolinguncha.',
        source: 'Muomalat soʻrovi, 2026-yil sentabr, 40 respondent',
      },
      {
        type: 'p',
        text: 'Ish haqi farqi sezilarli. Respondentlar maʼlumotiga koʻra, mahsulot menejeriga taklif qilinayotgan median oylik — 26 mln soʻm — anʼanaviy bankdagi oʻxshash lavozimdan taxminan 30 foiz yuqori. Shariat auditori va IT tizim tahlilchisi uchun ham ustama 20–25 foiz atrofida. Kadrlar boʻyicha maslahatchilar bu farqni bozordagi raqobat bilan izohlaydi: bir nechta tashkilot bir vaqtda bir xil, cheklangan nomzodlar doirasidan xodim izlamoqda.',
      },
      {
        type: 'p',
        text: 'Shariat kengashlari alohida masala. Kengash aʼzolari odatda shtatdagi xodim emas, balki shartnoma asosida ishlaydigan mustaqil mutaxassislar boʻladi, shuning uchun ular jadvalga kiritilmagan. Regulyator litsenziya arizalarini koʻrib chiqishda kengash aʼzolari va asosiy xodimlarning malakasini ham baholaydi: respondentlarning 12 tasi shu talab tufayli ariza topshirishni kechiktirganini aytdi. Xalqaro amaliyotda [[shariat-kengashi|shariat kengashi]] kamida uch aʼzodan iborat boʻladi. Bozordagi 21 ishtirokchining barchasi faoliyat boshlasa, kamida 63 ta oʻrin kerak boʻladi. Respondentlar esa bunday vazifaga tayyor nomzodlar soni 20–25 nafardan oshmaydi, deb hisoblaydi. Bir mutaxassis bir necha kengashda ishlashi mumkin, ammo manfaatlar toʻqnashuvi sababli raqobatchi tashkilotlarda bir vaqtda ishlash odatda cheklanadi.',
      },
      {
        type: 'p',
        text: 'Xodimlarni ushlab qolish ham muammoga aylanmoqda. Respondentlarning 18 tasi, yaʼni 45 foizi soʻnggi uch oyda oʻzi tayyorlagan kamida bitta xodimini raqobatchi tashkilotga yoki xorijga boy berganini maʼlum qildi. Ayrim tashkilotlar bunga javoban oʻqitish xarajatlarini qoplash shartini mehnat shartnomasiga kiritmoqda: xodim kurs tugaganidan keyin belgilangan muddatdan oldin ketsa, xarajatning bir qismini qaytaradi.',
      },
      {
        type: 'p',
        text: 'Shariat kengashi aʼzolarining haqi odatda yillik shartnoma asosida yoki har bir yigʻilish uchun toʻlanadi. Respondentlarning aytishicha, tajribali xorijiy mutaxassislar bilan ishlash xarajati mahalliy nomzodlarnikidan sezilarli darajada yuqori. Shu sababli koʻp tashkilotlar kengashni aralash tarkibda — bir-ikki xorijiy va mahalliy aʼzolardan — shakllantirmoqda.',
      },
      { type: 'h2', text: 'Qaysi koʻnikmalar yetishmaydi' },
      {
        type: 'chart',
        chart: {
          kind: 'bar',
          title: 'Eng koʻp tilga olingan koʻnikma boʻshliqlari',
          subtitle: 'respondentlar ulushi, uchtagacha javob',
          unit: '%',
          data: [
            { label: 'AAOIFI moliyaviy hisob standartlari', value: 65, highlight: true },
            { label: 'Shartnoma tuzilmalari va hujjatlashtirish', value: 58 },
            { label: 'Ichki shariat auditi', value: 48 },
            { label: 'Mahsulot narxlash va risk boshqaruvi', value: 43 },
            { label: 'Bank tizimlarini moslashtirish', value: 35 },
            { label: 'Mahsulotni mijozga tushuntirish', value: 30 },
            { label: 'Takaful aktuar hisob-kitoblari', value: 20 },
          ],
          source: 'Muomalat soʻrovi, 2026-yil sentabr',
          note: 'Respondentlar uchtagacha javob tanlashi mumkin edi, shuning uchun ulushlar yigʻindisi 100 foizdan oshadi.',
        },
      },
      {
        type: 'p',
        text: 'Respondentlarning 65 foizi eng katta boʻshliq sifatida [[aaoifi|AAOIFI]] moliyaviy hisob standartlarini bilishni koʻrsatdi. Buxgalterlar milliy standartlar va moliyaviy hisobotning xalqaro standartlari bilan ishlashga oʻrgangan. Islom moliyasi bitimlarini hisobda aks ettirish esa boshqacha yondashuvni talab qiladi: masalan, murobahada bank daromadi foiz emas, savdo ustamasi sifatida tan olinadi, ijorada esa aktiv muddat oxirigacha bank balansida qoladi.',
      },
      {
        type: 'p',
        text: 'Ikkinchi oʻrinda shartnoma tuzilmalari va hujjatlashtirish turibdi. Yuristlar va mahsulot menejerlari anʼanaviy kredit shartnomasini murobaha, ijora yoki muzoraba hujjatiga aylantirishda bosqichlar ketma-ketligi muhimligini taʼkidlaydi: bank aktivni sotib olmasdan uni sota olmaydi. Uchinchi oʻrinda ichki shariat auditi: bu vazifa mahsulotlar shariat kengashi maʼqullagan shartlarga amalda mos kelishini tekshiradi. Investitsiya portfellari uchun esa [[shariat-skriningi|shariat skriningi]], yaʼni kompaniyalarni faoliyat turi va moliyaviy koʻrsatkichlari boʻyicha saralash koʻnikmasi kerak.',
      },
      {
        type: 'quote',
        text: 'Bizga islom moliyasi nazariyasini yoddan biladigan emas, bank ishini biladigan va uni yangi shartnomalar asosida qayta qura oladigan odamlar kerak.',
        cite: 'Kamola Yoqubova',
        role: 'kadrlar boʻyicha konsalting kompaniyasi rahbari',
      },
      { type: 'h2', text: 'Kadrlar qayerdan keladi' },
      {
        type: 'p',
        text: 'Respondentlar mutaxassislarni topishning toʻrtta asosiy yoʻlini koʻrsatdi. Ularning aksariyati bir vaqtning oʻzida bir nechta yoʻldan foydalanmoqda.',
      },
      {
        type: 'list',
        items: [
          '**Ichki qayta tayyorlash.** Respondentlarning 70 foizi anʼanaviy bank xodimlarini qayta oʻqitishni asosiy yoʻl deb biladi. Banklar 3–6 oylik ichki kurslar tashkil qilmoqda, ularning bir qismi xorijiy oʻquv markazlari bilan hamkorlikda oʻtkaziladi.',
          '**Xalqaro sertifikatlar.** AAOIFI va boshqa xalqaro tashkilotlar islom moliyasi boʻyicha buxgalter, auditor va shariat mutaxassislari uchun sertifikatlash dasturlarini taklif qiladi. Respondentlarning fikricha, tayyorgarlik 6–12 oy davom etgani uchun bu tez yechim emas, ammo oʻrta muddatda malaka standartini belgilaydi.',
          '**Xorijiy mutaxassislar.** Malayziya, Turkiya, Fors koʻrfazi mamlakatlari va Qozogʻistondan mutaxassis taklif qilish tez natija beradi, lekin qimmat: respondentlar baholashicha, bunday xodim xarajati mahalliy mutaxassisnikidan 3–4 baravar yuqori. Bundan tashqari, ularga mahalliy qonunchilik va soliq tizimini oʻrganish uchun vaqt kerak.',
          '**Oliy taʼlim.** Bir qator oliy taʼlim muassasalari islom moliyasi boʻyicha tanlov fanlari va magistratura dasturlarini ochishni eʼlon qilgan. Ularning birinchi bitiruvchilari 2028–2029-yillardan oldin bozorga chiqmaydi.',
        ],
      },
      {
        type: 'p',
        text: 'Kamola Yoqubovaning soʻzlariga koʻra, yaqin ikki yilda bozor ehtiyojining asosiy qismi ichki qayta tayyorlash hisobidan yopiladi. «Xorijiy mutaxassislar birinchi mahsulotlarni ishga tushirish va jamoani oʻqitish uchun kerak. Ammo uzoq muddatda ularning oʻrnini mahalliy kadrlar egallashi kerak, aks holda mahsulotlar narxi pasaymaydi», — dedi u.',
      },
      { type: 'h2', text: 'Raqamlar nimani koʻrsatadi' },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: 'Soʻrov ishtirokchilari', value: '40' },
          { label: 'Hozir ochiq ish oʻrinlari', value: '96' },
          { label: '12 oylik yollash rejasi', value: '195' },
          { label: 'Shariat kengashlari uchun kerakli oʻrinlar', value: 'kamida 63' },
          { label: 'Kadrlarni asosiy toʻsiq deb ataganlar', value: '78 foiz' },
        ],
        note: 'Manba: Muomalat soʻrovi, 2026-yil sentabr.',
      },
      {
        type: 'p',
        text: 'Soʻrov natijalari bozorning keyingi bosqichi uchun muhim xulosa beradi: litsenziyalar soni ortishi bilan kadrlar uchun raqobat kuchayadi. Muomalat hisob-kitobiga koʻra, 12 oylik yollash rejalari bajarilsa, respondentlardagi islom moliyasi xodimlari soni qariyb ikki baravar oshadi. Bu ehtiyojni qondirish uchun ichki oʻquv dasturlari, xalqaro sertifikatlar va oliy taʼlim bir vaqtda ishlashi kerak boʻladi.',
      },
      {
        type: 'p',
        text: 'Uzoqroq muddatda ehtiyoj bundan ham katta. Muomalat hisob-kitobiga koʻra, litsenziya soʻragan yoki niyat bildirgan 21 tashkilotning barchasi faoliyat boshlasa, 2027-yil oxiriga borib ularda islom moliyasi boʻyicha ixtisoslashgan xodimlar soni 400–500 nafarga yetishi kerak boʻladi. Bu hisob-kitobga audit, yuridik va IT kompaniyalaridagi mutaxassislar kiritilmagan.',
      },
    ],
    sources: [
      { title: 'Muomalat soʻrovi: islom moliyasi bozorida kadrlarga talab', publisher: 'Muomalat', date: '2026-09-22', type: 'data' },
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-09-28', type: 'data' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-09-25', type: 'interview' },
      { title: 'AAOIFI boshqaruv standartlari', publisher: 'AAOIFI', type: 'document' },
    ],
  },

  // ── th-06 ────────────────────────────────────────────────────────────────
  {
    id: 'th-06',
    slug: 'salam-va-fermer-qishloq-xojaligini-oldindan-moliyalash',
    rubric: 'tahlil',
    kicker: 'Agromoliya',
    title: 'Salam va fermer: qishloq xoʻjaligini oldindan moliyalash',
    lead: 'Salam fermerga hosil pulini ekishdan oldin olish imkonini beradi. Mikromoliya tashkiloti L uni gʻalla xoʻjaliklarida sinashni, Lizing kompaniyasi N bilan esa salam va ijorani birga taklif qilishni rejalashtirmoqda.',
    authors: ['jasur-toshmatov'],
    publishedAt: '2026-10-05T10:00:00+05:00',
    image: img('agriField', {
      caption: 'Sugʻoriladigan ekin maydonlari. Kuzgi bugʻdoy asosan oktabrda ekiladi',
    }),
    tags: ['qishloq-xojaligi', 'mikromoliya', 'lizing'],
    terms: ['salam', 'garar', 'vakola', 'ijora', 'murobaha', 'takaful', 'kafolat'],
    related: ['th-02'],
    views: 5600,
    body: [
      {
        type: 'p',
        text: 'Qishloq xoʻjaligida pulga ehtiyoj va daromad vaqt jihatidan bir-biriga mos kelmaydi. Fermer urugʻ, oʻgʻit, yoqilgʻi va ish haqi uchun xarajatni kuz, bahor va yozda qiladi, daromadni esa hosil yigʻilib, sotilgandan keyin oladi. Bu boʻshliqni odatda qisqa muddatli bank krediti yopadi. Islom moliyasida buning uchun alohida shartnoma bor — [[salam|salam]].',
      },
      { type: 'h2', text: 'Salam qanday ishlaydi' },
      {
        type: 'p',
        text: 'Salamda xaridor — bank, mikromoliya tashkiloti yoki boshqa moliyachi — kelajakda yetkazib beriladigan mahsulot uchun toʻliq narxni oldindan toʻlaydi. Fermer esa kelishilgan muddatda belgilangan miqdor va sifatdagi mahsulotni yetkazib berish majburiyatini oladi. Bu kredit emas, balki narxi oldindan toʻlangan oldi-sotdi: moliyachi pul emas, mahsulot oladi va daromadni uni sotishdan topadi.',
      },
      {
        type: 'p',
        text: 'Bitimda haddan tashqari noaniqlik — [[garar|gʻarar]] — boʻlmasligi uchun shartnomada barcha muhim shartlar aniq yoziladi: mahsulot turi va navi, sifat koʻrsatkichlari (masalan, bugʻdoy uchun namlik va oqsil miqdori), miqdori, yetkazib berish sanasi va joyi. Yana bir muhim shart: salam aniq bir dala hosiliga emas, belgilangan talablarga javob beradigan mahsulotga tuziladi. Agar faqat bitta dalaning hosili shart qilib qoʻyilsa, hosil nobud boʻlganda shartnomani bajarib boʻlmaydi.',
      },
      {
        type: 'p',
        text: 'Salam narxi ham shartnoma tuzilgan kuni aniq belgilanadi. Narxni «yigʻim-terim paytidagi bozor narxidan 15 foiz past» tarzida belgilash noaniqlik tugʻdiradi va salam tuzilmasiga mos kelmaydi. Shu sababli tomonlar narxni ekish paytidagi bozor kutilmalari asosida kelishadi va keyingi narx oʻzgarishi riski moliyachiga oʻtadi.',
      },
      {
        type: 'list',
        ordered: true,
        items: [
          'Moliyachi va fermer mahsulot, sifat, miqdor, narx, yetkazib berish sanasi va joyini kelishib oladi.',
          'Moliyachi shartnoma imzolangan kuni narxni toʻliq toʻlaydi.',
          'Fermer mablagʻni mavsumiy xarajatlarga sarflaydi va hosilni yetishtiradi.',
          'Kelishilgan sanada mahsulot moliyachiga yoki uning nomidan qabul qiluvchi korxonaga topshiriladi.',
          'Moliyachi mahsulotni qayta ishlovchi korxona yoki eksportchiga sotadi. Koʻpincha bu oldindan tuzilgan parallel salam yoki [[vakola|vakola]] shartnomasi orqali amalga oshiriladi.',
        ],
      },
      { type: 'h2', text: 'Mavsumiy ehtiyoj: gʻalla, paxta va meva' },
      {
        type: 'p',
        text: 'Turli ekinlarda pulga ehtiyoj turli oylarga toʻgʻri keladi. Muomalat hisob-kitobiga koʻra, 1 gektar bugʻdoy uchun yillik aylanma mablagʻ ehtiyoji taxminan 10,8 mln soʻm, paxta uchun 20,2 mln soʻm, meva bogʻi uchun esa 23,2 mln soʻmni tashkil etadi.',
      },
      {
        type: 'chart',
        chart: {
          kind: 'line',
          title: 'Fermer xoʻjaligining oylik aylanma mablagʻ ehtiyoji',
          subtitle: '1 gektar hisobida',
          unit: 'mln soʻm',
          xLabels: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
          series: [
            { name: 'Bugʻdoy', values: [0.4, 0.8, 1.2, 1.5, 1.0, 1.8, 0.2, 0.2, 0.8, 2.0, 0.6, 0.3] },
            { name: 'Paxta', values: [0.3, 0.6, 1.5, 2.5, 2.0, 2.6, 2.8, 2.2, 2.5, 2.0, 1.0, 0.2] },
            { name: 'Meva bogʻi', values: [0.5, 1.0, 2.0, 2.5, 3.0, 3.5, 3.0, 2.5, 2.5, 1.5, 0.8, 0.4] },
          ],
          source: 'Muomalat hisob-kitoblari, fermer xoʻjaliklari maʼlumotlari asosida',
          note: 'Tasviriy. Yer ijarasi va texnika boʻyicha toʻlovlar kiritilmagan.',
        },
      },
      {
        type: 'p',
        text: 'Bugʻdoyda ehtiyoj ikki choʻqqiga ega: oktabrdagi ekish va iyundagi yigʻim-terim. Paxtada xarajatlar apreldan oktabrgacha deyarli bir tekis yuqori boʻladi. Meva bogʻlarida eng katta ehtiyoj may–iyul oylariga, yaʼni hosilni yigʻish, saralash va saqlashga toʻgʻri keladi.',
      },
      {
        type: 'p',
        text: 'Bu farq salam qaysi ekinga koʻproq mos kelishini ham belgilaydi. Bugʻdoy va paxta standart sifat koʻrsatkichlariga ega, ularni saqlash va tashish nisbatan oson, ulgurji xaridorlari — un kombinatlari va paxta-toʻqimachilik klasterlari — oldindan maʼlum. Meva esa tez buziladi va sifatini oldindan aniq belgilash qiyin. Bozor ishtirokchilarining fikricha, meva yetishtiruvchilar uchun salamdan koʻra urugʻlik, oʻgʻit va qadoqlash materiallari xaridini [[murobaha|murobaha]] orqali, sovutgichli omborlarni esa [[ijora|ijora]] asosida moliyalash qulayroq.',
      },
      {
        type: 'p',
        text: 'Paxtada vaziyat boshqacha. Fermerlarning aksariyati paxta-toʻqimachilik klasterlari bilan shartnoma asosida ishlaydi, klasterlarning oʻzi ham ekish mavsumida fermerlarga avans beradi. Bozor ishtirokchilarining fikricha, bu yerda salam bevosita fermerga emas, klasterga moʻljallanishi mumkin: moliyachi klasterdan kelajakdagi tola yoki ipni oldindan sotib oladi, klaster esa olingan mablagʻni fermerlarga avans sifatida yoʻnaltiradi.',
      },
      { type: 'h2', text: 'Salam va anʼanaviy kreditning farqi' },
      {
        type: 'table',
        caption: 'Salam va hosil oldi krediti: asosiy farqlar',
        columns: [{ label: 'Koʻrsatkich' }, { label: 'Salam' }, { label: 'Anʼanaviy kredit' }],
        rows: [
          ['Fermer nima oladi', 'Kelajakdagi mahsulot uchun toʻliq narxni oldindan', 'Qarz mablagʻi'],
          ['Qaytarish shakli', 'Mahsulot yetkazib berish', 'Pul: asosiy qarz va foiz'],
          ['Moliyachi daromadi', 'Salam narxi va sotish narxi oʻrtasidagi farq', 'Foiz'],
          ['Narx riski', 'Moliyachida', 'Fermerda'],
          ['Taʼminot', 'Kafolat, garov, hosil sugʻurtasi yoki takaful', 'Garov, kafillik, sugʻurta'],
          ['Hosil yetishmasa', 'Muddat uzaytiriladi yoki toʻlangan narx qaytariladi, qoʻshimcha foyda talab qilinmaydi', 'Qarz qayta tuziladi, penya hisoblanadi'],
          ['Hujjatlar', 'Sifat va yetkazib berish shartlari batafsil yoziladi', 'Standart kredit shartnomasi'],
        ],
        source: 'Muomalat tahlili',
      },
      {
        type: 'callout',
        title: 'Misol: 50 gektar bugʻdoy',
        text: 'Qashqadaryodagi fermer xoʻjaligi 50 gektar bugʻdoy ekadi, kutilayotgan hosil — gektariga 5 tonna, jami 250 tonna. Moliyachi riskni kamaytirish uchun hosilning 60 foizi, yaʼni 150 tonna uchun salam tuzadi. Kelishilgan narx — tonnasi 2,75 mln soʻm, fermer oktabrda 412,5 mln soʻm oladi. Bu xoʻjalikning yillik aylanma mablagʻ ehtiyojining (540 mln soʻm) qariyb toʻrtdan uch qismini qoplaydi. Iyulda bugʻdoyning bozor narxi tonnasi uchun 3,2 mln soʻm boʻlsa, moliyachi mahsulotni 480 mln soʻmga sotadi va 67,5 mln soʻm yalpi daromad oladi. Bu toʻqqiz oy uchun 16,4 foiz yoki yillik hisobda taxminan 22 foizga teng. Hisob-kitob tasviriy.',
      },
      {
        type: 'p',
        text: 'Misoldagi daromadlilik kichik biznes kreditlari stavkalariga yaqin. Farq riskning taqsimlanishida: anʼanaviy kreditda bugʻdoy narxi tushsa, zarar fermerga tushadi, salamda esa moliyachiga. Agar iyulda narx tonnasi uchun 2,6 mln soʻmgacha pasaysa, moliyachi 150 tonnani 390 mln soʻmga sotadi va 22,5 mln soʻm zarar koʻradi. Shu sababli moliyachilar salam bilan bir vaqtda un kombinati bilan parallel salam tuzishga harakat qiladi: masalan, tonnasi 3,05 mln soʻmdan sotish kelishilsa, daromad 45 mln soʻmga qisqaradi, ammo narx riski deyarli yoʻqoladi.',
      },
      { type: 'h2', text: 'Risklar va ishtirokchilar rejalari' },
      {
        type: 'p',
        text: 'Narx riskidan tashqari moliyachi yetkazib berish riskini ham oʻz zimmasiga oladi: qurgʻoqchilik, doʻl yoki zararkunandalar hosilni kamaytirishi mumkin. Bu risk hosil sugʻurtasi yoki [[takaful|takaful]], uchinchi shaxs [[kafolat|kafolati]] va ehtiyot miqdori — hosilning bir qismini salamga kiritmaslik — orqali kamaytiriladi. Sifat riski esa qabul qilish punktidagi laboratoriya tahlili bilan nazorat qilinadi. Hosilni sugʻurta qilish alohida masala: bozorda hali takaful operatori yoʻq, anʼanaviy agrosugʻurta esa fermerlar orasida keng tarqalmagan. Shuning uchun dastlabki bosqichda moliyachilar riskni asosan ehtiyot miqdori va kafolatlar orqali boshqarishi kutilmoqda.',
      },
      {
        type: 'p',
        text: 'Qarshidagi Mikromoliya tashkiloti L ning arizasi regulyatorda koʻrib chiqilmoqda. Tashkilot boshqaruvi raisining oʻrinbosari Farhod Normatovning Muomalatga aytishicha, litsenziya olingach, Qashqadaryo viloyatidagi kichik fermer xoʻjaliklari uchun bugʻdoy boʻyicha salam mahsuloti sinovdan oʻtkaziladi. Birinchi mavsumda 30–40 xoʻjalik bilan har biri 50–500 mln soʻmlik shartnomalar tuzish rejalashtirilgan. Paxta boʻyicha salam klasterlar bilan shartnoma tizimi tufayli keyingi bosqichga qoldirilgan.',
      },
      {
        type: 'p',
        text: 'Toshkentdagi Lizing kompaniyasi N litsenziyaga ega va qishloq xoʻjaligi texnikasi hamda tomchilatib sugʻorish uskunalarini ijora asosida beradi. Kompaniya vakilining Muomalatga maʼlum qilishicha, ijora toʻlovlarini hosil yigʻim mavsumiga moslab, yiliga ikki marta qabul qilish imkoniyati oʻrganilmoqda. Ikki kompaniya bitta xoʻjalikka kompleks yechim taklif qilish boʻyicha muzokara olib bormoqda: texnika uchun ijora, aylanma mablagʻ uchun salam.',
      },
      {
        type: 'quote',
        text: 'Fermer uchun eng muhimi — pulni ekish vaqtida olish. Salamda u hosilning bir qismini oldindan sotadi va narx tushishidan xavotir olmaydi.',
        cite: 'Farhod Normatov',
        role: 'Mikromoliya tashkiloti L boshqaruvi raisining oʻrinbosari',
      },
      {
        type: 'factbox',
        title: 'Raqamlarda',
        items: [
          { label: '1 gektar bugʻdoy uchun yillik aylanma mablagʻ', value: '10,8 mln soʻm' },
          { label: '1 gektar paxta uchun yillik aylanma mablagʻ', value: '20,2 mln soʻm' },
          { label: 'Misoldagi salam summasi, 150 tonna', value: '412,5 mln soʻm' },
          { label: 'Moliyachining yillik daromadliligi, misolda', value: 'taxminan 22 foiz' },
        ],
        note: 'Manba: Muomalat hisob-kitoblari.',
      },
      {
        type: 'p',
        text: 'Bozor ishtirokchilarining fikricha, salam qishloq xoʻjaligini moliyalashda kreditning oʻrnini toʻliq bosmaydi, ammo uni toʻldirishi mumkin. Buning uchun moliyachilarga mahsulotni qabul qilish, saqlash va sotish infratuzilmasi, fermerlarga esa shartnoma shartlarini tushuntiradigan maslahat xizmati kerak boʻladi. Mikromoliya tashkiloti L litsenziyani kuzgi ekish mavsumida olsa, birinchi natijalar 2027-yil yozida, kuzgi bugʻdoy hosili yigʻilgandan keyin maʼlum boʻladi.',
      },
    ],
    sources: [
      { title: 'Kompaniya taqdimoti', publisher: 'Mikromoliya tashkiloti L', date: '2026-09-29', type: 'report' },
      { title: 'Kompaniya taqdimoti', publisher: 'Lizing kompaniyasi N', date: '2026-09-18', type: 'report' },
      { title: 'Muomalat bilan suhbat', publisher: 'Muomalat', date: '2026-10-01', type: 'interview' },
      { title: 'Muomalat hisob-kitoblari', publisher: 'Muomalat', date: '2026-10-03', type: 'data' },
    ],
  },
]
