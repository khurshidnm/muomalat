import type { GlossaryTerm } from '../types'

/**
 * Islom moliyasi lugʻati (/lugat). 28 ta atama, `term` boʻyicha alifbo tartibida.
 * Matnlar moliyaviy-huquqiy tushuntirish: diniy hukm yoki xulosa emas.
 * Muvofiqlik toʻgʻrisidagi xulosalarni muassasalarning oʻz shariat kengashlari beradi.
 */
export const glossary: GlossaryTerm[] = [
  {
    slug: 'aaoifi',
    term: 'AAOIFI',
    aliases: {
      en: 'Accounting and Auditing Organization for Islamic Financial Institutions',
      ru: 'ААОИФИ, Организация бухгалтерского учёта и аудита исламских финансовых институтов',
      other: ['Islom moliya institutlari uchun buxgalteriya hisobi va audit tashkiloti'],
    },
    category: 'standart',
    short: 'Islom moliya institutlari uchun shariat, buxgalteriya hisobi, audit va boshqaruv standartlarini ishlab chiquvchi xalqaro notijorat tashkilot.',
    definition: [
      'AAOIFI — islom moliya institutlari uchun standartlar ishlab chiquvchi xalqaro notijorat tashkilot. U shariat standartlari, buxgalteriya hisobi, audit, korporativ boshqaruv va kasbiy etika standartlarini nashr etadi. Bu hujjatlar [[murobaha|murobaha]], [[ijora|ijora]], [[mushoraka|mushoraka]], [[sukuk|sukuk]] va boshqa shartnomalar qanday tuzilishi hamda hisobda qanday aks ettirilishini belgilaydi.',
      'AAOIFI standartlari tavsiyaviy xususiyatga ega: ularni majburiy qilish yoki qilmaslikni har bir mamlakat regulyatori oʻzi hal qiladi. Ayrim mamlakatlarda standartlar toʻliq qabul qilingan, boshqalarida esa ulardan milliy qoidalarni ishlab chiqishda asos sifatida foydalaniladi.',
    ],
    origin:
      'Qisqartma tashkilotning inglizcha nomi — {en:Accounting and Auditing Organization for Islamic Financial Institutions} («Islom moliya institutlari uchun buxgalteriya hisobi va audit tashkiloti») — soʻzlarining bosh harflaridan tuzilgan. Tashkilot 1990-yillar boshida tashkil etilgan, qarorgohi Bahraynda joylashgan.',
    practice: [
      'Islom banklari va [[islom-oynasi|islom oynalari]] mahsulot ishlab chiqishda koʻpincha AAOIFI shariat standartlariga tayanadi. Eng koʻp tilga olinadiganlari — № 8 «Murobaha», № 9 «Ijora», № 12 «Mushoraka», № 13 «Muzoraba» va № 17 «Investitsion sukuk». Muassasaning [[shariat-kengashi|shariat kengashi]] mahsulot hujjatlarini shu standartlar bilan solishtirib, oʻz xulosasini beradi.',
      'Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun 2026-yil iyunda kuchga kirgach, bozor ishtirokchilari xalqaro standartlar milliy amaliyotda qanday qoʻllanishiga eʼtibor qaratmoqda. Bank, lizing va sugʻurta mutaxassislari uchun AAOIFI sertifikatlash dasturlari kadrlar tayyorlashning keng tarqalgan yoʻllaridan biri hisoblanadi.',
      'AAOIFI hujjatlari [[ifsb|IFSB]] standartlaridan farq qiladi: AAOIFI asosan shartnoma, hisob va audit masalalarini qamrab oladi, IFSB esa regulyatorlar uchun kapital yetarliligi va risklarni boshqarish boʻyicha prudensial standartlar chiqaradi.',
    ],
    related: ['ifsb', 'shariat-kengashi', 'murobaha', 'sukuk'],
  },
  {
    slug: 'daromadni-tozalash',
    term: 'Daromadni tozalash',
    aliases: { en: 'income purification', ru: 'очищение дохода', ar: 'tathir', other: ['purification'] },
    category: 'tamoyil',
    short: 'Islom moliyasi tamoyillariga mos kelmaydigan manbadan kelgan daromad qismini aniqlab, uni xayriyaga yoʻnaltirish amaliyoti.',
    definition: [
      'Daromadni tozalash — islom moliyasi tamoyillariga mos kelmaydigan manbadan kelgan daromad qismini hisoblab chiqish va uni oʻz foydasiga olmasdan xayriya maqsadlariga oʻtkazish. Bu tartibni moliya muassasalari ham, xususiy investorlar ham qoʻllaydi. Bunday daromad, masalan, foizli depozitdan, kechikkan toʻlov uchun undirilgan jarimadan yoki asosiy faoliyati mezonlarga mos kompaniyaning qisman nomuvofiq tushumidan kelib chiqishi mumkin.',
      'Qaysi daromad tozalanishi, u qanday hisoblanishi va mablagʻ qayerga yoʻnaltirilishini muassasaning [[shariat-kengashi|shariat kengashi]] belgilaydi. Bu shartnoma va buxgalteriya hisobi darajasidagi tartib: tozalangan summa muassasa daromadi sifatida tan olinmaydi.',
    ],
    origin:
      'Oʻzbekcha atama inglizcha «{en:purification}» va arabcha «tathir» — «tozalash» — soʻzlarining tarjimasi sifatida qoʻllanadi.',
    practice: [
      'Bankda daromadni tozalash koʻpincha kechikkan toʻlovlar bilan bogʻliq. [[murobaha|Murobaha]] yoki [[ijora|ijora]] shartnomasida mijoz toʻlovni kechiktirsa, unga jarima qoʻllanishi mumkin, lekin bu summa bank daromadiga qoʻshilmaydi: u alohida hisobvaraqda yigʻiladi va shariat kengashi maʼqullagan xayriya maqsadlariga oʻtkaziladi.',
      'Investitsiya fondlari va xususiy investorlar [[shariat-skriningi|shariat skriningi]]dan oʻtgan aksiyalar boʻyicha dividendning bir qismini tozalaydi. Masalan, kompaniya tushumining 3 foizi foizli daromad boʻlsa, dividendning ham 3 foizi xayriyaga oʻtkaziladi. Fond hisobotlarida tozalangan summa alohida koʻrsatiladi.',
      'Oʻzbekistonda islom moliyasi xizmatlari asosan anʼanaviy banklarning [[islom-oynasi|islom oynalari]] orqali yoʻlga qoʻyilayotgani uchun bu tartib alohida ahamiyatga ega: oyna mablagʻlari vaqtincha foizli aktivlarga joylashtirilsa yoki texnik sabablarga koʻra ularga foiz hisoblansa, bu daromad islom portfeli foydasiga qoʻshilmaydi. Bunday holatlarni ichki audit va shariat kengashi alohida tekshiradi.',
    ],
    steps: [
      'Shariat kengashi tozalanadigan daromad turlari va ularni hisoblash usulini tasdiqlaydi.',
      'Nomuvofiq tushumlar alohida hisobvaraqda hisobga olinadi va muassasa daromadiga qoʻshilmaydi.',
      'Davriy ravishda tozalanadigan summa hisoblanadi — masalan, dividendning nomuvofiq tushum ulushiga teng qismi.',
      'Mablagʻ shariat kengashi maʼqullagan xayriya maqsadlariga oʻtkaziladi.',
      'Tozalangan summa yillik hisobot va shariat auditi xulosasida koʻrsatiladi.',
    ],
    example: {
      title: 'Dividendni tozalash',
      text: 'Investor skriningdan oʻtgan kompaniya aksiyalaridan 40 mln soʻm dividend oldi. Kompaniya hisobotiga koʻra, tushumining 3 foizi bank depozitlari boʻyicha olingan foizdan iborat. Investor 1,2 mln soʻmni (40 mln × 3 foiz) xayriya fondiga oʻtkazadi va oʻz daromadini 38,8 mln soʻm deb hisoblaydi.',
    },
    related: ['shariat-kengashi', 'shariat-skriningi', 'ribo', 'investitsiya-hisobvaragi'],
  },
  {
    slug: 'foyda-va-zarar-taqsimoti',
    term: 'Foyda va zarar taqsimoti',
    aliases: {
      en: 'profit and loss sharing (PLS)',
      ru: 'разделение прибыли и убытков',
      other: ['PLS', 'foyda va zararni taqsimlash'],
    },
    category: 'tamoyil',
    short: 'Kapital egasi va tadbirkor loyiha natijasini birga koʻtaradigan tamoyil: foyda kelishilgan nisbatda, zarar esa kapital ulushiga koʻra taqsimlanadi.',
    definition: [
      'Foyda va zarar taqsimoti — islom moliyasining asosiy tamoyillaridan biri: kapital egasi oldindan belgilangan qatʼiy daromad emas, balki loyihaning haqiqiy natijasidan ulush oladi. Foyda tomonlar kelishgan nisbatda taqsimlanadi, zarar esa, qoida tariqasida, har bir tomonning kapitaldagi ulushiga mutanosib ravishda koʻtariladi.',
      'Tamoyil [[mushoraka|mushoraka]] va [[muzoraba|muzoraba]] shartnomalarida eng toʻliq namoyon boʻladi. U [[ribo|ribo]] taqiqi bilan bevosita bogʻliq: islom moliyasi yondashuviga koʻra pul oʻz-oʻzidan daromad manbai emas, daromad olish huquqi tavakkal va real iqtisodiy faoliyatda ishtirok etish bilan birga keladi.',
    ],
    origin:
      'Atama inglizcha «{en:profit and loss sharing}» (PLS) iborasining tarjimasi. Islom tijorat huquqida unga yaqin qoida arabcha «al-gʻunm bil-gʻurm» — «foyda tavakkalga yarasha» — tarzida ifodalanadi.',
    practice: [
      'Amalda banklar foyda va zarar taqsimotiga asoslangan shartnomalarni savdo va ijara mahsulotlariga qaraganda kamroq qoʻllaydi: ular loyihani chuqur baholash, hisobotlarni muntazam nazorat qilish va koʻproq kapital talab qiladi. Shu sababli xalqaro bozorda islom banklari portfelida [[murobaha|murobaha]] va [[ijora|ijora]] ustun turadi.',
      'Tamoyil bank passivida koʻproq uchraydi: [[investitsiya-hisobvaragi|investitsiya hisobvaragʻi]] egalari bank bilan muzoraba asosida foyda ulushini oladi, kafolatlangan foiz olmaydi. Oʻzbekistonda birinchi islom oynalari litsenziya olgan hozirgi bosqichda bozor ishtirokchilari bunday hisobvaraqlar boʻyicha daromad qanday hisoblanishi va mijozlarga qanday tushuntirilishini asosiy masalalardan biri deb hisoblaydi.',
      'Regulyatorlar uchun bu tamoyil alohida risk toifasini yuzaga keltiradi: investitsiya hisobvaragʻi egalari zarar koʻrishi mumkinligi ularga oshkor qilinishi kerak, bank esa foyda taqsimotini barqarorlashtirish uchun zaxiralar shakllantirishi mumkin. [[ifsb|IFSB]] standartlari aynan shu masalalarni tartibga soladi.',
    ],
    example: {
      title: 'Sheriklik natijasi: ikki yil',
      text: 'Bank tadbirkor bilan 1 mlrd soʻmlik loyihaga birga kiradi: bank 800 mln, tadbirkor 200 mln soʻm qoʻyadi, foyda 50:50 taqsimlanadi. Birinchi yili sof foyda 300 mln soʻm boʻldi — har bir tomon 150 mln soʻmdan oldi. Ikkinchi yili 100 mln soʻm zarar koʻrildi va u kapital ulushiga mutanosib boʻlindi: bank 80 mln, tadbirkor 20 mln soʻm. Anʼanaviy kreditda esa bank har ikki yilda ham loyiha natijasidan qatʼi nazar kelishilgan foizni olgan boʻlardi.',
    },
    related: ['mushoraka', 'muzoraba', 'investitsiya-hisobvaragi', 'ribo'],
  },
  {
    slug: 'garar',
    term: 'Gʻarar',
    aliases: { en: 'gharar (excessive uncertainty)', ru: 'гарар (чрезмерная неопределённость)', ar: 'gharar' },
    category: 'tamoyil',
    short: 'Shartnomadagi ortiqcha noaniqlik: predmet, narx, miqdor yoki muddat aniq boʻlmagani sababli tomonlardan biri asossiz tavakkal qilishi.',
    definition: [
      'Gʻarar — shartnoma shartlaridagi ortiqcha noaniqlik. Agar sotilayotgan narsa, uning miqdori, sifati, narxi yoki yetkazib berish muddati aniq boʻlmasa, tomonlardan biri nima olishini bilmagan holda majburiyat oladi. Islom moliyasi tamoyillariga koʻra bunday shartnomalardan qochish talab etiladi.',
      'Kichik va bartaraf qilib boʻlmaydigan noaniqlik — masalan, sotilayotgan bino poydevorining aniq holati — odatda gʻarar hisoblanmaydi; muammo noaniqlik shartnoma mohiyatiga taʼsir qiladigan darajada katta boʻlganda yuzaga keladi. Bu tamoyil [[ribo|ribo]] va [[maysir|maysir]] bilan birga islom moliyasining uchta asosiy cheklovidan biri sanaladi.',
    ],
    origin: 'Arabcha «gʻarar» soʻzidan olingan boʻlib, «xavf», «aldanish ehtimoli», «noaniq holat» degan maʼnolarni bildiradi.',
    practice: [
      'Gʻarar talabi amaliyotda shartnoma hujjatlarining batafsilligida koʻrinadi: [[salam|salam]] va [[istisno|istisno]] shartnomalarida tovarning navi, miqdori, sifati, yetkazish joyi va muddati aniq yoziladi; [[murobaha|murobaha]]da esa narx, tannarx va ustama shartnomada aniq koʻrsatiladi.',
      'Sugʻurta sohasida gʻarar masalasi [[takaful|takaful]] modeli paydo boʻlishiga sabab boʻlgan. Anʼanaviy sugʻurta badal evaziga himoya sotib olinadigan ayirboshlash shartnomasi sifatida qaraladi: unda sugʻurta toʻlovi olinadimi-yoʻqmi va qancha boʻlishi oldindan nomaʼlum. Takafulda ishtirokchilar umumiy fondga badal qoʻshib, tavakkalni oʻzaro taqsimlaydi.',
      'Hosilaviy moliyaviy vositalar — opsionlar, fyucherslar va ularga asoslangan spekulyativ bitimlar — gʻarar va [[maysir|maysir]] bilan bogʻliq xavotirlar sababli islom moliyasida cheklangan. Xedjlash ehtiyoji koʻpincha [[vad|vaʼd]] asosidagi tuzilmalar orqali hal qilinadi.',
    ],
    example: {
      title: 'Noaniq va aniq shartnoma',
      text: 'Noaniq variant: «Kelasi yil dalamdan qancha hosil chiqsa, hammasini 300 mln soʻmga sotaman». Bunda xaridor qancha va qanday sifatdagi mahsulot olishini bilmaydi. Aniq variant — salam: «2027-yil 1-oktabrgacha 1-navli bugʻdoydan 100 tonna, tonnasi 3 mln soʻmdan, jami 300 mln soʻm, toʻlov shartnoma kuni toʻliq; yetkazish joyi — xaridor ombori». Ikkinchi shartnomada ham tavakkal bor, lekin shartnoma predmeti va tavakkal chegaralari aniq.',
    },
    related: ['ribo', 'maysir', 'salam', 'takaful'],
  },
  {
    slug: 'ifsb',
    term: 'IFSB',
    aliases: {
      en: 'Islamic Financial Services Board',
      ru: 'Совет по исламским финансовым услугам',
      other: ['Islom moliyaviy xizmatlari kengashi'],
    },
    category: 'standart',
    short: 'Islom moliyaviy xizmatlari uchun prudensial va nazorat standartlarini ishlab chiquvchi xalqaro tashkilot; aʼzolari asosan regulyatorlar.',
    definition: [
      'IFSB — islom bank ishi, kapital bozori va [[takaful|takaful]] sohalari uchun prudensial standartlar va nazorat tamoyillarini ishlab chiquvchi xalqaro tashkilot. Uning hujjatlari kapital yetarliligi, risklarni boshqarish, korporativ boshqaruv, shaffoflik va likvidlik kabi masalalarni qamrab oladi.',
      'IFSB aʼzolari asosan moliya regulyatorlari va nazorat organlari, shuningdek xalqaro tashkilotlar va bozor ishtirokchilaridir. Standartlar tavsiyaviy: ularni milliy qoidalarga qanday kiritishni har bir mamlakat regulyatori oʻzi hal qiladi.',
    ],
    origin:
      'Inglizcha {en:Islamic Financial Services Board} («Islom moliyaviy xizmatlari kengashi») nomining qisqartmasi. Tashkilot 2000-yillar boshida tuzilgan, qarorgohi Kuala-Lumpurda (Malayziya) joylashgan.',
    practice: [
      '[[aaoifi|AAOIFI]] mahsulot va hisob darajasidagi qoidalarni belgilasa, IFSB regulyator nuqtai nazaridan ishlaydi: masalan, [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]] bilan bogʻliq risklar kapital yetarliligini hisoblashda qanday inobatga olinishi yoki [[shariat-kengashi|shariat kengashi]] faoliyati boshqaruv tizimiga qanday kiritilishi kerakligini koʻrsatadi.',
      'Yangi islom moliya bozorlarida regulyatorlar milliy prudensial talablarni ishlab chiqishda odatda IFSB standartlariga tayanadi. Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun kuchga kirgach, bozor ishtirokchilari regulyatorning [[islom-oynasi|islom oynalari]] uchun kapital, hisobot va mablagʻlarni ajratish boʻyicha talablari qanday shakllanishini kuzatmoqda.',
    ],
    related: ['aaoifi', 'shariat-kengashi', 'islom-oynasi', 'investitsiya-hisobvaragi'],
  },
  {
    slug: 'ijora',
    term: 'Ijora',
    aliases: { en: 'ijarah (lease)', ru: 'иджара (аренда)', ar: 'ijara', other: ['ijarah'] },
    category: 'shartnoma',
    short: 'Aktivdan foydalanish huquqini kelishilgan muddat va haq evaziga berish shartnomasi; aktiv va unga bogʻliq asosiy tavakkal mulkdorda qoladi.',
    definition: [
      'Ijora — ijara shartnomasi: mulkdor (bank yoki lizing kompaniyasi) oʻziga tegishli aktivdan — uskuna, transport vositasi yoki koʻchmas mulkdan — foydalanish huquqini mijozga kelishilgan muddatga va haq evaziga beradi. Daromad pul qarzi uchun emas, aktivdan foydalanish uchun olinadi.',
      'Ijoraning asosiy sharti shundaki, aktiv shartnoma davomida mulkdorning mulki boʻlib qoladi va unga bogʻliq asosiy tavakkallarni — aktivning nobud boʻlishi, yirik taʼmir va sugʻurta xarajatlarini — mulkdor koʻtaradi. Ijarachi esa aktivdan ehtiyotkorlik bilan foydalanish va kundalik texnik xizmat uchun javob beradi. Ijara haqi har bir davr uchun oldindan kelishiladi; uzoq muddatli shartnomalarda u aniq belgilangan koʻrsatkich asosida keyingi davrlar uchun qayta koʻrib chiqilishi mumkin.',
    ],
    origin:
      'Arabcha «ijara» soʻzidan olingan boʻlib, «ijaraga berish», «xizmat yoki foydalanish uchun haq» degan maʼnoni bildiradi. Oʻzbek tilidagi «ijara» soʻzi ham shu ildizdan.',
    practice: [
      'Ijora lizingga yaqin boʻlgani uchun bozor ishtirokchilari uni Oʻzbekistonda eng tez joriy etilayotgan islom moliyasi mahsulotlaridan biri deb hisoblaydi. Masalan, Toshkentdagi Lizing kompaniyasi N qishloq xoʻjaligi texnikasi va ishlab chiqarish uskunalarini, Samarqanddagi Lizing kompaniyasi O esa transport vositalarini ijora asosida taklif qiladi; har ikki kompaniya litsenziya olgan.',
      'Anʼanaviy moliyaviy lizingdan asosiy farqi — tavakkal taqsimotida. Ijorada aktiv ijarachining aybisiz nobud boʻlsa yoki foydalanib boʻlmaydigan holga kelsa, ijara haqi toʻxtatiladi, mulkdor esa yirik taʼmir va sugʻurta xarajatlarini koʻtaradi. Mulkdor sugʻurta — koʻpincha [[takaful|takaful]] — xarajatini ijara haqi hisob-kitobiga kiritishi mumkin, lekin shartnoma boʻyicha javobgarlik unda qoladi.',
      'Aktiv muddat oxirida mijozga oʻtishi kerak boʻlsa, [[ijora-muntahiya-bittamlik|ijora muntahiya bittamlik]] tuzilmasi qoʻllanadi. Ijora shartnomalari [[sukuk|sukuk]] chiqarishda ham asosiy aktiv sifatida keng ishlatiladi. Asosiy qoidalar AAOIFI shariat standarti № 9 «Ijora»da bayon etilgan.',
    ],
    steps: [
      'Mijoz kerakli aktivni tanlaydi va bank yoki lizing kompaniyasiga uni ijaraga olish niyatini bildiradi.',
      'Bank yoki lizing kompaniyasi aktivni sotib oladi va mulk huquqini oʻz nomiga rasmiylashtiradi.',
      'Tomonlar ijora shartnomasini tuzadi: muddat, ijara haqi, toʻlov jadvali, texnik xizmat va sugʻurta majburiyatlari belgilanadi.',
      'Ijarachi aktivdan foydalanadi va davriy ijara haqini toʻlaydi; yirik taʼmir va sugʻurta mulkdor zimmasida qoladi.',
      'Muddat oxirida aktiv mulkdorga qaytariladi, ijara uzaytiriladi yoki aktiv alohida shartnoma bilan sotiladi.',
    ],
    example: {
      title: 'Traktor ijorasi',
      text: 'Lizing kompaniyasi 600 mln soʻmga traktor sotib olib, uni fermer xoʻjaligiga 3 yilga ijaraga beradi. Oylik ijara haqi — 22 mln soʻm, 36 oyda jami 792 mln soʻm. Traktorning sugʻurtasi va yirik taʼmiri kompaniya zimmasida, kundalik texnik xizmat va yoqilgʻi — fermer zimmasida. Agar traktor fermer aybisiz ishdan chiqsa va almashtirilmasa, ijara haqi toʻxtatiladi. Muddat oxirida fermer traktorni qaytaradi yoki uni alohida shartnoma bilan qoldiq qiymatda sotib oladi.',
    },
    related: ['ijora-muntahiya-bittamlik', 'murobaha', 'sukuk', 'takaful', 'vad'],
  },
  {
    slug: 'ijora-muntahiya-bittamlik',
    term: 'Ijora muntahiya bittamlik',
    aliases: {
      en: 'ijarah muntahia bittamleek (lease ending in ownership)',
      ru: 'иджара мунтахия биттамлик (аренда с переходом права собственности)',
      ar: 'ijara muntahiya bittamlik',
      other: ['IMB', 'ijara wa iqtina'],
    },
    category: 'shartnoma',
    short: 'Muddat oxirida aktivga egalik ijarachiga oʻtishi bilan yakunlanadigan ijora; mulk alohida vaʼd asosida sotiladi yoki hadya qilinadi.',
    definition: [
      'Ijora muntahiya bittamlik — [[ijora|ijora]]ning shunday turi, unda ijara muddati tugagach aktivga egalik huquqi ijarachiga oʻtadi. Iqtisodiy jihatdan u moliyaviy lizingga yaqin, lekin huquqiy tuzilmasi boshqacha: ijara shartnomasi va mulkni oʻtkazish alohida hujjatlar bilan rasmiylashtiriladi.',
      'Mulk oʻtishi ijara shartnomasining oʻziga avtomatik shart sifatida kiritilmaydi. Buning oʻrniga mulkdor alohida [[vad|vaʼd]] beradi: muddat oxirida aktivni ramziy yoki qoldiq narxda sotish yoxud hadya qilish. Shu tufayli shartnoma davomida mulk va unga bogʻliq tavakkal mulkdorda qoladi.',
    ],
    origin:
      'Arabcha ibora: «ijara» — ijaraga berish, «muntahiya» — tugaydigan, yakunlanadigan, «bittamlik» (bi-t-tamlik) — mulkka aylantirish bilan. Tom maʼnoda «mulkka oʻtish bilan yakunlanadigan ijara». Ayrim mamlakatlarda «ijara va iqtino» («ijara va egalik qilish») deb ham ataladi.',
    practice: [
      'Bu tuzilma uy-joy, transport va qimmat uskunalarni moliyalashtirishda keng qoʻllanadi. Oʻzbekistonda Lizing kompaniyasi N uni uskuna ijorasi mahsulotlari qatorida taklif qiladi, Tijorat banki G esa islom oynasi orqali uy-joyni shu tuzilma asosida moliyalashtirishni rejalashtirmoqda; bankning arizasini regulyator koʻrib chiqmoqda.',
      'Muhim jihat — aktiv mulkdor mulkida turgan davrdagi majburiyatlar. Uy-joyni moliyalashtirishda bank mulk sugʻurtasi va yirik taʼmir uchun javob beradi, ijarachi esa kommunal toʻlovlar va joriy xizmatni oʻz zimmasiga oladi. Shuning uchun shartnomada toʻlov toʻxtagan, aktiv nobud boʻlgan yoki mijoz uni muddatidan oldin sotib olmoqchi boʻlgan holatlar tartibi aniq yozilishi kerak.',
      'Asosiy shartlar AAOIFI shariat standarti № 9 «Ijora»da belgilangan. Soliq va roʻyxatdan oʻtkazish masalalari ham muhim: aktiv avval bankka, soʻng mijozga oʻtgani uchun bozor ishtirokchilari qonunchilikda ikki marta soliq solinmasligini taʼminlashni zarur deb hisoblaydi.',
    ],
    steps: [
      'Mijoz aktivni tanlaydi; bank uni sotib olib, oʻz nomiga rasmiylashtiradi.',
      'Tomonlar ijora shartnomasini tuzadi: muddat, oylik ijara haqi va majburiyatlar taqsimoti belgilanadi.',
      'Bank alohida hujjatda muddat oxirida aktivni sotish yoki hadya qilish haqida vaʼd beradi.',
      'Mijoz ijara haqini toʻlaydi; aktiv shu davrda bank mulki boʻlib qoladi.',
      'Oxirgi toʻlovdan soʻng alohida shartnoma bilan mulk huquqi mijozga oʻtkaziladi.',
    ],
    example: {
      title: 'Kvartirani ijora asosida moliyalashtirish',
      text: 'Bank 800 mln soʻmlik kvartirani sotib olib, uni mijozga 10 yilga ijaraga beradi. Oylik ijara haqi — 12,5 mln soʻm, 120 oyda jami 1,5 mlrd soʻm. Shu davrda kvartira bank mulki: mulk sugʻurtasi va yirik taʼmir bank zimmasida, kommunal toʻlovlar — mijoz zimmasida. Bankning vaʼdiga koʻra, oxirgi toʻlovdan keyin kvartira mijozga 1 mln soʻmlik ramziy narxda sotiladi.',
    },
    related: ['ijora', 'vad', 'kamayuvchi-mushoraka', 'murobaha'],
  },
  {
    slug: 'investitsiya-hisobvaragi',
    term: 'Investitsiya hisobvaragʻi',
    aliases: {
      en: 'profit-sharing investment account (PSIA)',
      ru: 'инвестиционный счёт с разделением прибыли',
      other: ['PSIA', 'investitsion depozit'],
    },
    category: 'bozor',
    short: 'Mijoz mablagʻi kafolatlangan foiz evaziga emas, bank investitsiyalari natijasidan foyda ulushi olish sharti bilan joylashtiriladigan hisobvaraq.',
    definition: [
      'Investitsiya hisobvaragʻi — islom banki yoki [[islom-oynasi|islom oynasi]]da ochiladigan, anʼanaviy muddatli depozit oʻrnini bosuvchi hisobvaraq. Mijoz mablagʻi odatda [[muzoraba|muzoraba]] yoki [[vakola|vakola]] asosida qabul qilinadi va bank uni moliyalashtirish portfeliga yoʻnaltiradi. Mijoz haqiqiy foydadan kelishilgan nisbatda ulush oladi.',
      'Daromad oldindan kafolatlanmaydi: bank faqat kutilayotgan daromadni eʼlon qilishi mumkin. Muzoraba asosidagi hisobvaraqda zarar mijoz kapitaliga tushadi, bank esa faqat oʻz ehtiyotsizligi yoki shartnomani buzishi natijasidagi zararni qoplaydi. Bu xususiyat [[foyda-va-zarar-taqsimoti|foyda va zarar taqsimoti]] tamoyilidan kelib chiqadi.',
    ],
    origin:
      'Inglizcha «{en:investment account}», toʻliqroq «{en:profit-sharing investment account}» (PSIA) iborasining oʻzbekcha tarjimasi. «Hisobvaraq» — bank hisobi maʼnosidagi oʻzbekcha atama.',
    practice: [
      'Islom oynalari uchun investitsiya hisobvaragʻi — asosiy mablagʻ jalb qilish vositasi. Mijozga foyda taqsimoti nisbati (masalan, 70:30), portfelga qaysi aktivlar kirishi, daromad qanday hisoblanishi va zarar yuz bersa nima boʻlishi tushunarli shaklda oshkor qilinishi kerak.',
      'Daromadning keskin tebranishini yumshatish uchun banklar odatda ikki turdagi zaxira shakllantiradi: foydani tenglashtirish zaxirasi (profit equalisation reserve) va investitsiya riski zaxirasi (investment risk reserve). Zaxiralarga ajratmalar tartibi shartnomada koʻrsatiladi, uni [[shariat-kengashi|shariat kengashi]] maʼqullaydi.',
      'Regulyator nuqtai nazaridan bunday hisobvaraqlar anʼanaviy depozitdan farq qiladi: ular boʻyicha tavakkal qisman mijozga tushadi. Bu kapital yetarliligini hisoblash va mijozlarga axborot berishda alohida yondashuvni talab qiladi; [[ifsb|IFSB]] standartlari bu masalaga alohida eʼtibor qaratadi.',
    ],
    steps: [
      'Mijoz hisobvaraq shartnomasini imzolaydi: muddat, foyda taqsimoti nisbati va zaxira qoidalari belgilanadi.',
      'Mablagʻ bankning islom aktivlari portfeliga — murobaha, ijora va boshqa moliyalashtirish shartnomalariga — yoʻnaltiriladi.',
      'Davr yakunida portfelning haqiqiy daromadi hisoblanadi va xarajatlar chegiriladi.',
      'Foyda kelishilgan nisbatda mijoz va bank oʻrtasida taqsimlanadi; zaxiralarga ajratmalar shartnomaga muvofiq amalga oshiriladi.',
      'Muddat oxirida mablagʻ va foyda ulushi mijozga qaytariladi yoki hisobvaraq yangilanadi.',
    ],
    example: {
      title: '100 mln soʻmlik investitsiya hisobvaragʻi',
      text: 'Mijoz islom oynasida 100 mln soʻmni 12 oylik investitsiya hisobvaragʻiga joylashtiradi; foyda nisbati 70:30 (mijoz : bank). Portfel yil davomida xarajatlar chegirilgandan keyin 20 foiz daromad keltirsa, mijoz 14 mln soʻm, bank esa boshqaruvchi (muzorib) ulushi sifatida 6 mln soʻm oladi. Daromad 10 foizga tushsa, mijozga 7 mln soʻm tegadi. Kutilayotgan daromad eʼlon qilinishi mumkin, lekin u kafolat emas.',
    },
    related: ['muzoraba', 'vakola', 'foyda-va-zarar-taqsimoti', 'islom-oynasi'],
  },
  {
    slug: 'islom-oynasi',
    term: 'Islom oynasi',
    aliases: { en: 'Islamic window', ru: 'исламское окно', ar: 'nafidha islamiya', other: ['islom bank xizmatlari boʻlinmasi'] },
    category: 'institut',
    short: 'Anʼanaviy bank ichida islom moliyasi xizmatlarini alohida hisob, boshqaruv va shariat nazorati bilan koʻrsatadigan boʻlinma.',
    definition: [
      'Islom oynasi — anʼanaviy (foizli) bank ichida tashkil etilgan, islom moliyasi tamoyillariga asoslangan mahsulotlarni taklif qiluvchi boʻlinma. Bank alohida islom banki ochmasdan, mavjud filiallar tarmogʻi, kapitali va texnologiyalaridan foydalangan holda [[murobaha|murobaha]], [[ijora|ijora]], [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]] kabi xizmatlarni koʻrsatadi.',
      'Islom oynasiga qoʻyiladigan asosiy talab — ajratish: oyna mablagʻlari bankning foizli faoliyati bilan aralashmasligi, oynaning alohida buxgalteriya hisobi va hisoboti yuritilishi hamda uning faoliyati [[shariat-kengashi|shariat kengashi]] nazoratida boʻlishi kerak.',
    ],
    origin:
      'Inglizcha «{en:Islamic window}» iborasining oʻzbekcha tarjimasi. «Oyna» soʻzi bu yerda koʻchma maʼnoda — bank ichidagi alohida xizmat yoʻnalishi maʼnosida ishlatiladi.',
    practice: [
      'Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun 2026-yil iyunda kuchga kirgach, bir qator tijorat banklari islom oynasi ochish uchun regulyatorga murojaat qildi. Birinchi litsenziyani 2026-yil 20-avgustda Tijorat banki D oldi va mamlakatdagi birinchi islom oynasini ochdi; 2026-yil 8-oktabrda Tijorat banki E ham litsenziya oldi. Boshqa arizalar holati [bozor xaritasi](/xarita)da kuzatib boriladi.',
      'Xalqaro amaliyotda oyna anʼanaviy bank uchun bozorni sinab koʻrishning arzonroq yoʻli hisoblanadi: alohida yuridik shaxs tashkil etish va toʻliq hajmdagi ustav kapitali talab qilinmaydi. Biroq mijozlar va investorlar ajratish qanchalik qatʼiy ekaniga eʼtibor beradi — likvidlik qanday boshqariladi, ortiqcha mablagʻ qayerga joylashtiriladi, umumiy xarajatlar qanday taqsimlanadi.',
      'Oyna toʻliq islom bankidan farq qiladi: islom banki butun faoliyatini islom moliyasi tamoyillari asosida yuritadi. Oʻzbekistonda bunday litsenziyani 2026-yil 18-sentabrda Islom banki A oldi. Xalqaro tajribada ayrim oynalar vaqt oʻtishi bilan alohida shoʻba islom bankiga aylantirilgan.',
    ],
    steps: [
      'Bank islom oynasi strategiyasini, mahsulotlar roʻyxatini va shariat kengashi tarkibini tayyorlaydi.',
      'Bank regulyatorga ariza beradi va litsenziya oladi.',
      'Oyna uchun alohida hisob, hisobot va mablagʻlarni ajratish tizimi joriy etiladi.',
      'Xodimlar oʻqitiladi, shariat kengashi maʼqullagan mahsulotlar filiallar orqali sotuvga chiqariladi.',
      'Muvofiqlik shariat auditi va regulyatorga taqdim etiladigan hisobotlar orqali muntazam tekshiriladi.',
    ],
    related: ['shariat-kengashi', 'investitsiya-hisobvaragi', 'murobaha', 'ifsb', 'daromadni-tozalash'],
  },
  {
    slug: 'istisno',
    term: 'Istisno',
    aliases: {
      en: 'istisna (manufacturing contract)',
      ru: 'истисна (договор на изготовление)',
      ar: 'istisna',
      other: ['istisnaa'],
    },
    category: 'shartnoma',
    short: 'Hali mavjud boʻlmagan aktivni — bino, uskuna yoki mahsulotni — buyurtma asosida tayyorlab berish shartnomasi; toʻlov bosqichma-bosqich boʻlishi mumkin.',
    definition: [
      'Istisno — buyurtmachi va ishlab chiqaruvchi (pudratchi) oʻrtasidagi shartnoma: ishlab chiqaruvchi kelishilgan tavsifdagi aktivni belgilangan muddatda tayyorlab beradi, buyurtmachi esa narxni toʻlaydi. Shartnoma predmeti tuzilish paytida hali mavjud emas — u ishlab chiqariladi yoki quriladi.',
      'Narx oldindan qatʼiy belgilanadi, toʻlov esa oldindan, bosqichma-bosqich yoki aktiv topshirilgach amalga oshirilishi mumkin. Shu jihati bilan istisno [[salam|salam]]dan farq qiladi: salamda narx shartnoma tuzilgan paytda toʻliq toʻlanadi.',
    ],
    origin:
      'Arabcha «istisnaʼ» soʻzidan olingan, «sanaʼa» — «yasamoq, ishlab chiqarmoq» — feʼliga borib taqaladi va «buyurtma berib yasatish» degan maʼnoni bildiradi. Oʻzbek tilidagi «sanoat» va «sanʼat» soʻzlari ham shu ildizdan. Atama «bundan istisno» iborasidagi «istisno» soʻzi bilan bir xil yoziladi, lekin u boshqa arabcha ildizdan kelib chiqqan.',
    practice: [
      'Istisno qurilish va ishlab chiqarishni moliyalashtirishda qoʻllanadi. Odatda bank ikki shartnoma tuzadi: mijoz bilan istisno (bank — ishlab chiqaruvchi tomon sifatida) va pudratchi bilan parallel istisno (bank — buyurtmachi sifatida). Bank daromadi ikki narx oʻrtasidagi farqdan iborat, mijoz oldida esa sifat va muddat uchun bank javob beradi.',
      'Bozor ishtirokchilari fikricha, Oʻzbekistonda bu tuzilma uy-joy qurilishi, omborlar va buyurtma asosida tayyorlanadigan uskunalarni moliyalashtirishda talab topishi mumkin. Bunda qurilish bosqichlarini mustaqil nazorat qilish va pudratchi tavakkalini [[kafolat|kafolat]] yoki [[takaful|takaful]] orqali qoplash muhim.',
      'Qurilish tugagach, aktiv koʻpincha [[ijora|ijora]] yoki [[murobaha|murobaha]] orqali mijozga oʻtkaziladi: istisno qurilish davrini, keyingi shartnoma esa toʻlov davrini qamrab oladi.',
    ],
    steps: [
      'Mijoz bankka aktivning batafsil texnik tavsifi bilan buyurtma beradi.',
      'Bank mijoz bilan istisno shartnomasini tuzadi: narx, topshirish muddati va toʻlov jadvali qatʼiy belgilanadi.',
      'Bank pudratchi yoki ishlab chiqaruvchi bilan parallel istisno shartnomasini tuzadi.',
      'Bank pudratchiga ish bosqichlari boʻyicha toʻlaydi va ijroni nazorat qiladi.',
      'Tayyor aktiv mijozga topshiriladi; mijoz kelishilgan jadval boʻyicha toʻlovni amalga oshiradi.',
    ],
    example: {
      title: 'Omborni buyurtma asosida qurish',
      text: 'Logistika kompaniyasi bankka 4,8 mlrd soʻmga ombor qurib berishni buyurtma qiladi va toʻlovni ombor topshirilgandan keyin 24 oy davomida amalga oshirishga kelishadi. Bank pudratchi bilan 4,2 mlrd soʻmlik parallel istisno shartnomasini tuzadi va unga qurilish bosqichlari boʻyicha toʻlaydi. Ombor topshirilgach, kompaniya bankka har oy 200 mln soʻmdan toʻlaydi. Bank daromadi — 600 mln soʻm farq; buning evaziga u qurilish sifati va muddati uchun mijoz oldida javob beradi.',
    },
    related: ['salam', 'ijora', 'murobaha', 'kafolat'],
  },
  {
    slug: 'kafolat',
    term: 'Kafolat (kafola)',
    aliases: { en: 'kafalah (guarantee)', ru: 'кафала (поручительство, гарантия)', ar: 'kafala', other: ['kafalah', 'bank kafolati'] },
    category: 'shartnoma',
    short: 'Qarzdor majburiyatini bajarmasa, uchinchi shaxs uni oʻz zimmasiga olishi haqidagi shartnoma; bank kafolatlari va akkreditivlarning asosi.',
    definition: [
      'Kafolat (kafola) — kafil (koʻpincha bank) qarzdor oʻz majburiyatini bajarmasa, uni bajarishni kreditor oldida oʻz zimmasiga oladigan shartnoma. Kafil toʻlovni amalga oshirsa, bu summa qarzdorning kafil oldidagi qarziga aylanadi.',
      'Islom moliyasi tamoyillariga koʻra kafolat foyda olish uchun emas, yordam koʻrsatish uchun beriladigan shartnoma hisoblanadi. Shu sababli kafolat summasiga bogʻliq foyda olinmaydi; kafil hujjatlarni rasmiylashtirish va xizmat koʻrsatish bilan bogʻliq haqiqiy xarajatlar uchun haq olishi mumkin. Bu masalada yondashuvlar farq qiladi va yakuniy qoidani muassasaning [[shariat-kengashi|shariat kengashi]] belgilaydi.',
    ],
    origin:
      'Arabcha «kafala» soʻzidan olingan, «kafil boʻlish», «javobgarlikni oʻz zimmasiga olish» degan maʼnoni bildiradi. Oʻzbek tilidagi «kafolat» va «kafil» soʻzlari ham, [[takaful|takaful]] atamasi ham shu oʻzakdan.',
    practice: [
      'Bank amaliyotida kafolat tender, avans qaytarilishi va shartnoma ijrosi kafolatlari, shuningdek akkreditivlar shaklida uchraydi. Islom banklari va [[islom-oynasi|islom oynalari]] bunday xizmatlarda kafolatni koʻpincha [[vakola|vakola]] bilan birga qoʻllaydi: bank mijoz nomidan ish yuritgani uchun vakola haqi oladi.',
      'Kafolat [[rahn|rahn]] (garov) bilan birga moliyalashtirish taʼminotining ikki asosiy usulidan biri: rahnda qarz aktiv bilan, kafolatda esa uchinchi shaxsning majburiyati bilan taʼminlanadi. Bozor ishtirokchilari Oʻzbekistonda kichik biznesni moliyalashtirishda uchinchi shaxs kafilligi islom mahsulotlarida ham keng qoʻllanishini kutmoqda.',
    ],
    steps: [
      'Mijoz bankdan kreditor yoki buyurtmachi foydasiga kafolat berishni soʻraydi.',
      'Bank mijozning moliyaviy holatini baholaydi, zarur boʻlsa qarshi taʼminot (rahn) talab qiladi.',
      'Bank kafolat xatini beradi: summa, muddat va toʻlov shartlari koʻrsatiladi.',
      'Mijoz majburiyatni bajarsa, kafolat muddati tugagach oʻz kuchini yoʻqotadi.',
      'Majburiyat bajarilmasa, bank kreditorga toʻlaydi va bu summani mijozdan qarz sifatida undiradi.',
    ],
    example: {
      title: 'Shartnoma ijrosi kafolati',
      text: 'Qurilish kompaniyasi tenderda gʻolib chiqdi va buyurtmachi undan 3 mlrd soʻmlik shartnoma ijrosi kafolatini talab qildi. Islom oynasi 12 oylik kafolat beradi va hujjatlarni tayyorlash hamda xizmat koʻrsatish uchun 9 mln soʻm qatʼiy haq oladi — bu haq kafolat summasiga foiz koʻrinishida hisoblanmaydi. Kompaniya shartnomani bajarmasa, bank buyurtmachiga 3 mlrd soʻm toʻlaydi va bu summa kompaniyaning bankka qarzi sifatida qayd etiladi.',
    },
    related: ['rahn', 'vakola', 'takaful', 'qarzi-hasan'],
  },
  {
    slug: 'kamayuvchi-mushoraka',
    term: 'Kamayuvchi mushoraka',
    aliases: {
      en: 'diminishing musharakah',
      ru: 'убывающая мушарака',
      ar: 'musharaka mutanaqisa',
      other: ['diminishing partnership'],
    },
    category: 'shartnoma',
    short: 'Bank va mijoz aktivni birga sotib oladigan, soʻng mijoz bank ulushini bosqichma-bosqich sotib olib, aktivning toʻliq egasiga aylanadigan sheriklik.',
    definition: [
      'Kamayuvchi mushoraka — [[mushoraka|mushoraka]]ning bir turi: bank va mijoz aktivga (koʻpincha uy-joy yoki tijorat koʻchmas mulkiga) birgalikda egalik qiladi, mijoz esa bankning ulushini kelishilgan jadval boʻyicha qismlab sotib oladi. Bank ulushi kamaygan sari mijoz ulushi oshib boradi va oxirida aktiv toʻliq mijozga oʻtadi.',
      'Odatda aktivdan mijoz foydalanadi va bank ulushidan foydalangani uchun unga [[ijora|ijora]] haqi toʻlaydi. Shu sababli oylik toʻlov ikki qismdan iborat boʻladi: bank ulushining bir qismini sotib olish va bank ulushi uchun ijara haqi. Bank ulushi kamaygani sayin ijara qismi ham kamayadi.',
    ],
    origin:
      'Arabcha «musharaka mutanaqisa» iborasining oʻzbekcha tarjimasi: «musharaka» — sheriklik, «mutanaqisa» — kamayib boruvchi.',
    practice: [
      'Xalqaro amaliyotda kamayuvchi mushoraka uy-joyni moliyalashtirishning asosiy islom modellaridan biri. U [[ijora-muntahiya-bittamlik|ijora muntahiya bittamlik]]dan shunisi bilan farq qiladiki, mijoz boshidanoq aktivning qisman mulkdori boʻladi va uning ulushi har bir toʻlov bilan ortib boradi.',
      'Bank uchun muhim masalalar — aktivni roʻyxatdan oʻtkazish, sheriklar oʻrtasida xarajatlarni taqsimlash va mijoz toʻlovni toʻxtatgan holatdagi tartib. Ulushlarni sotib olish narxi va tartibi alohida [[vad|vaʼd]] bilan belgilanadi; bu borada AAOIFI shariat standarti № 12 «Mushoraka»da qoidalar mavjud, har bir mahsulot boʻyicha yakuniy yondashuvni esa muassasaning [[shariat-kengashi|shariat kengashi]] tasdiqlaydi.',
      'Oʻzbekistonda islom oynalari uy-joyni moliyalashtirish mahsulotlarini tayyorlamoqda va bozor ishtirokchilari kamayuvchi mushorakani ijora asosidagi modelga muqobil sifatida koʻrib chiqmoqda. Tanlovga soliq, mulkni roʻyxatdan oʻtkazish va notarial xarajatlar sezilarli taʼsir koʻrsatadi.',
    ],
    steps: [
      'Mijoz va bank aktiv qiymatini oʻz ulushlariga koʻra birgalikda toʻlaydi — masalan, 30 va 70 foiz.',
      'Bank ulushi teng birliklarga boʻlinadi va ularni sotib olish jadvali kelishiladi.',
      'Mijoz aktivdan foydalanadi va bank ulushi uchun ijara haqi toʻlaydi.',
      'Har davrda mijoz bank ulushidan bir yoki bir necha birlikni sotib oladi; ijara haqi mutanosib ravishda kamayadi.',
      'Bank ulushi toʻliq sotib olingach, aktiv mijoz mulkiga oʻtadi.',
    ],
    example: {
      title: '1 mlrd soʻmlik uy',
      text: 'Mijoz va bank 1 mlrd soʻmlik uyni birga sotib oladi: mijoz 300 mln soʻm (30 foiz), bank 700 mln soʻm (70 foiz) qoʻshadi. Bank ulushi har biri 10 mln soʻmlik 70 birlikka boʻlinadi, uyning oylik ijara qiymati esa 10 mln soʻm deb baholanadi. Birinchi oyda mijoz 10 mln soʻmga bitta birlik sotib oladi va bank ulushi (70 foiz) uchun 7 mln soʻm ijara toʻlaydi — jami 17 mln soʻm. Bank ulushi 35 foizga tushganda ijara 3,5 mln soʻmni tashkil qiladi. 70 oydan keyin uy toʻliq mijozga oʻtadi.',
    },
    related: ['mushoraka', 'ijora', 'ijora-muntahiya-bittamlik', 'vad'],
  },
  {
    slug: 'maysir',
    term: 'Maysir',
    aliases: { en: 'maysir (gambling, speculation)', ru: 'майсир (азартная игра, спекуляция)', ar: 'maysir', other: ['qimor'] },
    category: 'tamoyil',
    short: 'Daromad mehnat yoki real iqtisodiy faoliyatdan emas, tasodifdan kelib chiqadigan qimorga oʻxshash bitimlar; islom moliyasida ulardan qochiladi.',
    definition: [
      'Maysir — natijasi asosan tasodifga bogʻliq boʻlgan, bir tomonning yutugʻi boshqa tomonning yoʻqotishi hisobiga shakllanadigan bitimlar. Bunday bitimda qiymat yaratilmaydi: pul bir ishtirokchidan boshqasiga tasodifiy hodisa natijasiga koʻra oʻtadi.',
      'Islom moliyasi tamoyillariga koʻra maysir xususiyatiga ega faoliyat va bitimlardan qochish talab etiladi. Tamoyil [[garar|gʻarar]]ga yaqin, lekin u bilan bir xil emas: gʻarar shartnomadagi noaniqlikka, maysir esa tasodifga tikilgan pul yoki tavakkalga tegishli.',
    ],
    origin:
      'Arabcha «maysir» soʻzidan olingan, «yusr» — «yengillik» — oʻzagiga borib taqaladi va «oson yoʻl bilan, mehnatsiz qoʻlga kiritilgan boylik» degan maʼnoni anglatadi. Tarixan qimor oʻyinlari shu soʻz bilan atalgan.',
    practice: [
      'Amaliyotda maysir tamoyili ikki darajada qoʻllanadi. Birinchidan, [[shariat-skriningi|shariat skriningi]]da qimor biznesi bilan shugʻullanadigan kompaniyalar investitsiya portfeliga kiritilmaydi. Ikkinchidan, moliyaviy vositalar darajasida sof spekulyativ hosilaviy bitimlar — masalan, aktivni yetkazib berish niyatisiz narx farqiga tikish — cheklanadi.',
      'Anʼanaviy sugʻurtaga nisbatan maysir va gʻarar bilan bogʻliq eʼtirozlar [[takaful|takaful]] modelini ishlab chiqishga turtki boʻlgan. Xedjlash, yaʼni haqiqiy biznes tavakkalini kamaytirish, spekulyatsiyadan farqlanadi: ayrim muassasalarning shariat kengashlari [[vad|vaʼd]] asosidagi xedjlash tuzilmalarini maʼqullagan.',
    ],
    related: ['garar', 'ribo', 'takaful', 'shariat-skriningi'],
  },
  {
    slug: 'murobaha',
    term: 'Murobaha',
    aliases: { en: 'murabaha (cost-plus sale)', ru: 'мурабаха (продажа с наценкой)', ar: 'murabaha', other: ['murabahah'] },
    category: 'shartnoma',
    short: 'Bank aktivni sotib olib, mijozga tannarx va oshkor qilingan ustama bilan muddatli toʻlovga sotadigan savdo shartnomasi.',
    definition: [
      'Murobaha — savdo shartnomasi: sotuvchi (bank) tovarning tannarxini va unga qoʻshilgan ustamani xaridorga ochiq aytadi. Islom moliyasida murobaha odatda muddatli toʻlov bilan qoʻllanadi: bank mijoz soʻragan aktivni sotib oladi va uni oldindan kelishilgan narxda, boʻlib-boʻlib toʻlash sharti bilan mijozga sotadi.',
      'Shartnomaning anʼanaviy kreditdan farqi — bank pul emas, aktiv sotadi va sotishdan oldin uni qisqa muddatga boʻlsa ham oʻz mulkiga oladi. Narx shartnoma tuzilganda qatʼiy belgilanadi va keyin oshirilmaydi: mijoz toʻlovni kechiktirsa ham qarz miqdori koʻpaymaydi. Bu [[ribo|ribo]] taqiqi bilan bogʻliq.',
    ],
    origin: 'Arabcha «murabaha» soʻzidan olingan, «ribh» — «foyda» — oʻzagidan yasalgan va «foyda bilan sotish» degan maʼnoni bildiradi.',
    practice: [
      'Xalqaro bozorda murobaha islom banklarining moliyalashtirish portfelida odatda eng katta ulushni egallaydi: u tushunarli, qisqa va oʻrta muddatli ehtiyojlarga mos keladi hamda anʼanaviy bank tizimlariga oson joriy etiladi. Murobaha uskuna, xomashyo, transport vositalari va tovar zaxiralarini moliyalashtirishda qoʻllanadi.',
      'Oʻzbekistonda murobaha [[islom-oynasi|islom oynalari]] va mikromoliya tashkilotlarining dastlabki mahsulotlari qatorida. Masalan, Andijondagi Mikromoliya tashkiloti K hunarmandlar uchun mikromurobaha mahsulotini taklif qiladi: tashkilot asbob-uskuna yoki xomashyoni sotib olib, hunarmandga ustama bilan muddatli toʻlovga sotadi.',
      'Amaliy masalalar — aktivni bank mulkiga rasmiylashtirish, soliq (aktiv ikki marta sotilgani uchun) va kechikkan toʻlovlar. Kechikish uchun jarima qoʻllansa, u bank daromadiga qoʻshilmaydi va [[daromadni-tozalash|daromadni tozalash]] tartibida xayriyaga yoʻnaltiriladi. Asosiy qoidalar AAOIFI shariat standarti № 8 «Murobaha»da bayon etilgan.',
    ],
    steps: [
      'Mijoz kerakli aktivni va yetkazib beruvchini tanlab, bankka murojaat qiladi.',
      'Mijoz aktivni bankdan sotib olishga vaʼd beradi; bu hali savdo shartnomasi emas.',
      'Bank aktivni yetkazib beruvchidan sotib oladi va unga egalik huquqini rasmiylashtiradi.',
      'Bank aktivni mijozga tannarx va oshkor qilingan ustama bilan sotadi; narx va toʻlov jadvali qatʼiy belgilanadi.',
      'Mijoz narxni kelishilgan muddatlarda boʻlib-boʻlib toʻlaydi; qarz miqdori keyinchalik oshirilmaydi.',
    ],
    example: {
      title: 'Dastgohni murobaha asosida xarid qilish',
      text: 'Mebel ishlab chiqaruvchi korxonaga 200 mln soʻmlik dastgoh kerak. Bank dastgohni yetkazib beruvchidan 200 mln soʻmga sotib olib, oʻz nomiga rasmiylashtiradi va uni korxonaga 252 mln soʻmga — 52 mln soʻm (26 foiz) ustama bilan — sotadi. Korxona summani 18 oy davomida har oy 14 mln soʻmdan toʻlaydi. Narx shartnoma imzolangan kuni qatʼiy belgilanadi: bozor stavkalari oʻzgarsa ham, 252 mln soʻm oʻzgarmaydi.',
    },
    related: ['vad', 'tavarruq', 'ijora', 'ribo', 'daromadni-tozalash'],
  },
  {
    slug: 'mushoraka',
    term: 'Mushoraka',
    aliases: { en: 'musharakah (partnership)', ru: 'мушарака (партнёрство)', ar: 'musharaka', other: ['musharakah', 'shirka'] },
    category: 'shartnoma',
    short: 'Ikki yoki undan ortiq tomon loyihaga kapital qoʻshadigan sheriklik: foyda kelishilgan nisbatda, zarar kapital ulushiga koʻra taqsimlanadi.',
    definition: [
      'Mushoraka — sheriklik shartnomasi: tomonlar umumiy loyiha yoki biznesga kapital qoʻshadi va uning natijasini birga koʻtaradi. Foyda shartnomada kelishilgan nisbatda taqsimlanadi — bu nisbat kapital ulushidan farq qilishi mumkin, masalan, loyihani boshqaradigan sherik uchun yuqoriroq. Zarar esa har bir sherikning kapitaldagi ulushiga mutanosib taqsimlanadi.',
      'Barcha sheriklar boshqaruvda qatnashish huquqiga ega, lekin amalda boshqaruv koʻpincha bir sherikka — odatda tadbirkorga — topshiriladi. Sheriklardan hech biri boshqasiga kapital qaytishini yoki maʼlum foydani kafolatlay olmaydi: bu [[foyda-va-zarar-taqsimoti|foyda va zarar taqsimoti]] tamoyilining mohiyati.',
    ],
    origin:
      'Arabcha «musharaka» soʻzidan olingan, «shirka» — «sheriklik» — oʻzagidan yasalgan. Oʻzbek tilidagi «sherik» va «shirkat» soʻzlari ham shu ildizdan.',
    practice: [
      'Banklar mushorakani loyihalarni moliyalashtirish, aylanma mablagʻni toʻldirish va qoʻshma investitsiyalarda qoʻllaydi. Bu mahsulot savdo shartnomalariga qaraganda murakkabroq: bank loyihaning biznes-rejasi, hisobotlari va boshqaruv sifatini doimiy kuzatib borishi kerak. Shu sababli islom banklari portfelida mushoraka ulushi odatda [[murobaha|murobaha]] va [[ijora|ijora]]nikidan kichik.',
      'Uy-joy va koʻchmas mulkni moliyalashtirishda mushorakaning [[kamayuvchi-mushoraka|kamayuvchi]] turi keng tarqalgan. Bank passivida esa sheriklik tamoyili [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]] orqali amal qiladi.',
      'Oʻzbekistonda bozor ishtirokchilari mushorakani kichik va oʻrta biznesning yangi loyihalarini moliyalashtirish vositasi sifatida koʻrib chiqmoqda, ammo buning uchun korxonalarda shaffof buxgalteriya hisobi va mustaqil audit zarur. Asosiy qoidalar AAOIFI shariat standarti № 12 «Mushoraka»da bayon etilgan.',
    ],
    steps: [
      'Sheriklar loyiha, kapital ulushlari va boshqaruv tartibini kelishadi.',
      'Foyda taqsimoti nisbati va zararning kapital ulushiga koʻra taqsimlanishi shartnomada yoziladi.',
      'Sheriklar kapitalni pul yoki aktiv shaklida kiritadi.',
      'Loyiha natijalari boʻyicha davriy hisobot tayyorlanadi va haqiqiy foyda hisoblanadi.',
      'Foyda yoki zarar kelishilgan qoidalar boʻyicha taqsimlanadi; muddat tugagach sheriklik tugatiladi yoki ulushlar sotiladi.',
    ],
    example: {
      title: 'Yangi ishlab chiqarish liniyasi',
      text: 'Qurilish materiallari ishlab chiqaruvchi korxona yangi liniya uchun 5 mlrd soʻm jalb qilmoqchi. Korxona 2 mlrd soʻm, bank 3 mlrd soʻm kiritadi (40:60). Loyihani korxona boshqargani uchun foyda 50:50 taqsimlanadi. Yil yakunida sof foyda 1,2 mlrd soʻm boʻlsa, har bir tomon 600 mln soʻmdan oladi. Agar 400 mln soʻm zarar koʻrilsa, u kapital ulushiga mutanosib boʻlinadi: bank 240 mln, korxona 160 mln soʻm.',
    },
    related: ['kamayuvchi-mushoraka', 'muzoraba', 'foyda-va-zarar-taqsimoti', 'investitsiya-hisobvaragi'],
  },
  {
    slug: 'muzoraba',
    term: 'Muzoraba',
    aliases: { en: 'mudarabah', ru: 'мудараба', ar: 'mudaraba', other: ['mudarabah', 'qirad'] },
    category: 'shartnoma',
    short: 'Bir tomon kapital, ikkinchisi boshqaruv va mehnat qoʻshadigan sheriklik: foyda kelishilgan nisbatda boʻlinadi, moliyaviy zararni kapital egasi koʻtaradi.',
    definition: [
      'Muzoraba — kapital egasi va boshqaruvchi (muzorib) oʻrtasidagi sheriklik shartnomasi. Kapital egasi mablagʻ beradi, muzorib uni oʻz bilimi va mehnati bilan kelishilgan faoliyatga yoʻnaltiradi. Foyda shartnomada oldindan belgilangan nisbatda taqsimlanadi.',
      'Faoliyat zarar bilan yakunlansa, moliyaviy yoʻqotishni kapital egasi koʻtaradi, muzorib esa sarflagan mehnati uchun haq olmaydi. Muzoribning ehtiyotsizligi, qasddan qilgan harakati yoki shartnoma shartlarini buzish holatlari bundan mustasno: bunday holatda zararni u qoplaydi. Muzorib kapital qaytishini yoki maʼlum foydani kafolatlay olmaydi.',
    ],
    origin:
      'Arabcha «mudaraba» soʻzidan olingan, «darb» — «yoʻlga chiqish, safar qilish» — oʻzagiga borib taqaladi: tarixan bunday sheriklik savdo safarlari uchun tuzilgan. Arabcha «d» tovushining bu turi oʻzbek tilida anʼanaviy ravishda «z» deb talaffuz qilinadi, shuning uchun «muzoraba» shakli qoʻllanadi. Ayrim mintaqalarda «qiroz» deb ham atalgan.',
    practice: [
      'Islom banklarida muzoraba koʻpincha passiv tomonda qoʻllanadi: [[investitsiya-hisobvaragi|investitsiya hisobvaragʻi]] egalari kapital egasi, bank esa muzorib vazifasini bajaradi. Bank mablagʻni moliyalashtirish portfeliga yoʻnaltiradi va foydaning kelishilgan ulushini oladi.',
      'Aktiv tomonda muzoraba — bank tadbirkorga kapital berib, foyda ulushini olishi — kamroq uchraydi, chunki bank boshqaruvga aralasha olmaydi va tadbirkor hisobotiga tayanadi. Bunday mahsulotlar savdo, xizmat koʻrsatish va qisqa muddatli loyihalar uchun mos, lekin ishonchli hisob va audit talab qiladi.',
      'Oʻzbekistonda islom oynalari mablagʻ jalb qilish mahsulotlarini ishlab chiqmoqda; bozor ishtirokchilari uchun muzoraba asosidagi hisobvaraqlar boʻyicha foyda qanday hisoblanishi va mijozlarga qanday oshkor qilinishi asosiy masalalardan biri boʻlib qolmoqda. Asosiy qoidalar AAOIFI shariat standarti № 13 «Muzoraba»da bayon etilgan.',
    ],
    steps: [
      'Kapital egasi va muzorib faoliyat turi, muddat va foyda taqsimoti nisbatini kelishadi.',
      'Kapital egasi mablagʻni muzoribga topshiradi.',
      'Muzorib mablagʻni kelishilgan faoliyatga yoʻnaltiradi va uni mustaqil boshqaradi.',
      'Davr yakunida haqiqiy foyda hisoblanadi va kelishilgan nisbatda taqsimlanadi.',
      'Zarar boʻlsa, u kapital egasiga tushadi; muzoribning aybi isbotlansa, zararni u qoplaydi.',
    ],
    example: {
      title: 'Savdo kompaniyasiga kapital',
      text: 'Bank savdo kompaniyasiga 1 mlrd soʻm kapital beradi, kompaniya esa tovar savdosini boshqaradi. Foyda 40:60 (bank : kompaniya) nisbatida taqsimlanadi. Olti oyda 250 mln soʻm sof foyda olinsa, bank 100 mln, kompaniya 150 mln soʻm oladi. Agar faoliyat 100 mln soʻm zarar bilan yakunlansa va bunga kompaniyaning aybi boʻlmasa, bankka 900 mln soʻm qaytadi, kompaniya esa mehnati uchun hech narsa olmaydi.',
    },
    related: ['mushoraka', 'investitsiya-hisobvaragi', 'foyda-va-zarar-taqsimoti', 'vakola'],
  },
  {
    slug: 'qarzi-hasan',
    term: 'Qarzi hasan',
    aliases: { en: 'qard hasan (benevolent loan)', ru: 'кард хасан (беспроцентный заём)', ar: 'qard hasan', other: ['qard al-hasan'] },
    category: 'shartnoma',
    short: 'Qarz oluvchi faqat asosiy summani qaytaradigan ustamasiz qarz; qarz beruvchi qarz miqdori yoki muddatiga bogʻliq foyda olmaydi.',
    definition: [
      'Qarzi hasan — ustamasiz qarz: qarz oluvchi kelishilgan muddatda faqat olgan summasini qaytaradi. Qarz beruvchi qarz miqdori yoki muddatiga bogʻliq foyda, ustama yoki qoʻshimcha haq talab qilmaydi.',
      'Islom moliyasida qarzi hasan foyda olish vositasi emas, yordam va hamkorlik shartnomasi hisoblanadi. Qarz beruvchi qarzni rasmiylashtirish va yuritish bilan bogʻliq haqiqiy maʼmuriy xarajatlarni qoplashi mumkin, lekin bu haq qarz summasiga bogʻlanmasligi kerak — aks holda u [[ribo|ribo]]dan farq qilmay qoladi.',
    ],
    origin:
      'Arabcha «qard hasan» iborasidan olingan: «qard» — qarz (oʻzbekcha «qarz» soʻzi ham shundan), «hasan» — «yaxshi, chiroyli». Tom maʼnoda «yaxshi qarz». Oʻzbekcha «qarzi hasan» shakli forscha izofa qolipi asosida yasalgan.',
    practice: [
      'Islom banklarida qarzi hasan ikki shaklda uchraydi. Birinchisi — joriy hisobvaraqlar: mijozlar mablagʻi bankka qarzi hasan sifatida joylashtirilgan deb qaraladi, bank uni talab boʻyicha qaytarish majburiyatini oladi, lekin unga foyda toʻlamaydi. Ikkinchisi — xodimlar, talabalar yoki ijtimoiy dasturlar uchun ustamasiz qarzlar.',
      'Mikromoliya tashkilotlari qarzi hasandan kam taʼminlangan tadbirkorlarga boshlangʻich mablagʻ berishda foydalanadi: masalan, Andijondagi Mikromoliya tashkiloti K mahsulotlari qatorida qarzi hasan ham bor. Bunday dasturlar tashkilotga foyda keltirmagani uchun koʻpincha grantlar, homiylik mablagʻlari yoki xayriya fondlari hisobidan moliyalashtiriladi.',
      'Oʻzbekistonda islom oynalari joriy hisobvaraq mahsulotlarini qarzi hasan yoki boshqa model asosida tuzishni tanlashi mumkin. Bu tanlov mijoz mablagʻining qaytarilishi kafolatiga va bank uni qanday ishlatishi mumkinligiga taʼsir qiladi.',
    ],
    steps: [
      'Qarz oluvchi qarz summasi va qaytarish muddatini qarz beruvchi bilan kelishadi.',
      'Shartnomada faqat asosiy summani qaytarish majburiyati qayd etiladi.',
      'Zarur boʻlsa, qarz kafolat yoki rahn bilan taʼminlanadi.',
      'Qarz oluvchi muddat oxirida yoki jadval boʻyicha aynan olgan summasini qaytaradi.',
    ],
    example: {
      title: 'Boshlangʻich mablagʻ uchun qarz',
      text: 'Mikromoliya tashkiloti tikuvchilik ustaxonasi ochmoqchi boʻlgan tadbirkorga 6 oyga 24 mln soʻm qarzi hasan beradi. Tadbirkor olti oy davomida har oy 4 mln soʻmdan qaytaradi — jami 24 mln soʻm. Tashkilot hujjatlarni rasmiylashtirish uchun 150 000 soʻm qatʼiy maʼmuriy haq oladi; bu haq qarz summasi yoki muddatiga bogʻliq emas.',
    },
    related: ['ribo', 'kafolat', 'rahn', 'takaful'],
  },
  {
    slug: 'rahn',
    term: 'Rahn',
    aliases: { en: 'rahn (pledge, collateral)', ru: 'рахн (залог)', ar: 'rahn', other: ['garov'] },
    category: 'shartnoma',
    short: 'Qarz yoki toʻlov majburiyatini taʼminlash uchun aktivni garovga qoʻyish shartnomasi; majburiyat bajarilmasa, garov sotilib qarz undiriladi.',
    definition: [
      'Rahn — garov shartnomasi: qarzdor oʻz majburiyatini taʼminlash uchun aktivni — koʻchmas mulk, transport vositasi, uskuna, qimmatbaho metall yoki qimmatli qogʻozni — kreditor foydasiga garovga qoʻyadi. Majburiyat bajarilmasa, kreditor garovni sotib, oʻz haqini undiradi, ortib qolgan summani esa garov egasiga qaytaradi.',
      'Garov aktivi garov beruvchining mulki boʻlib qoladi. Islom moliyasi tamoyillariga koʻra kreditor garovdan oʻz foydasiga daromad olmasligi kerak; garovni saqlash xarajatlari va undan foydalanish tartibi shartnomada alohida belgilanadi.',
    ],
    origin: 'Arabcha «rahn» soʻzidan olingan, «garovga qoʻyish», «ushlab turish» degan maʼnoni bildiradi. Oʻzbek tilidagi zamonaviy muqobili — «garov».',
    practice: [
      'Rahn alohida moliyalashtirish usuli emas, balki [[murobaha|murobaha]], [[istisno|istisno]], [[ijora-muntahiya-bittamlik|ijora muntahiya bittamlik]] va boshqa shartnomalardagi toʻlov majburiyatini taʼminlash vositasi. Masalan, murobahada mijoz toʻlov majburiyatini sotib olingan aktivning oʻzi yoki boshqa mulki bilan taʼminlashi mumkin.',
      'Garov munosabatlari Oʻzbekiston fuqarolik qonunchiligida tartibga solingan, shuning uchun islom oynalari rahnni mavjud huquqiy tartib orqali rasmiylashtira oladi. Bozor ishtirokchilari asosiy farqni garovni undirish va kechikkan toʻlovlar bosqichida koʻradi: undirilgan summadan qarz va haqiqiy xarajatlardan ortiq foyda olinmaydi.',
      'Ayrim mamlakatlarda rahn asosida chakana mahsulotlar ham taklif qilinadi: mijoz tilla buyumini garovga qoʻyib, [[qarzi-hasan|qarzi hasan]] oladi, bank esa garovni saqlagani uchun haq undiradi.',
    ],
    steps: [
      'Tomonlar asosiy shartnomani tuzadi — masalan, murobaha yoki ijora.',
      'Qarzdor taʼminot sifatida aktivni garovga qoʻyadi; garov qonunchilikda belgilangan tartibda rasmiylashtiriladi.',
      'Garov aktivi qarzdor mulkida qoladi; kreditor undan foyda olmaydi.',
      'Majburiyat bajarilgach, garov bekor qilinadi.',
      'Majburiyat bajarilmasa, garov sotiladi, qarz va haqiqiy xarajatlar undiriladi, ortgan summa egasiga qaytariladi.',
    ],
    example: {
      title: 'Ombor garovi',
      text: 'Kompaniya murobaha asosida xomashyoni 460 mln soʻmga muddatli toʻlov bilan sotib oladi va toʻlov majburiyatini taʼminlash uchun 600 mln soʻm qiymatdagi omborini garovga qoʻyadi. Ombor kompaniya mulkida qoladi va undan foydalanish davom etadi. Agar toʻlovlar toʻxtab, qolgan qarz 250 mln soʻm boʻlsa va kelishuvga erishilmasa, ombor belgilangan tartibda sotiladi: bank 250 mln soʻm qarz va undirish xarajatlarini oladi, qolgan mablagʻ kompaniyaga qaytariladi.',
    },
    related: ['kafolat', 'murobaha', 'qarzi-hasan', 'ijora-muntahiya-bittamlik'],
  },
  {
    slug: 'retakaful',
    term: 'Retakaful',
    aliases: { en: 'retakaful (Islamic reinsurance)', ru: 'ретакафул (исламское перестрахование)', ar: 'iadat at-takaful', other: ['re-takaful'] },
    category: 'bozor',
    short: 'Takaful fondlari oʻz tavakkalining bir qismini oʻtkazadigan qayta sugʻurta; takaful tamoyillari asosida tashkil etiladi.',
    definition: [
      'Retakaful — takaful fondlari uchun qayta sugʻurta. [[takaful|Takaful]] operatori boshqaruvidagi fond yirik yoki toʻplangan tavakkallarni yolgʻiz koʻtarmaslik uchun ularning bir qismini retakaful operatoriga oʻtkazadi va buning uchun badal toʻlaydi. Yirik zarar yuz bersa, uning kelishilgan qismini retakaful fondi qoplaydi.',
      'Retakaful ham takaful kabi oʻzaro yordam tamoyiliga hamda [[vakola|vakola]] yoki [[muzoraba|muzoraba]] modellariga asoslanadi: retakaful fondi unda ishtirok etuvchi takaful fondlariga tegishli, operator esa uni boshqargani uchun haq oladi.',
    ],
    origin:
      'Inglizcha «{en:reinsurance}» (qayta sugʻurta) soʻzidagi «{en:re-}» qoʻshimchasi va arabcha «takaful» soʻzidan yasalgan. Arabcha muqobili — «iʼodat at-takaful», yaʼni «qayta takaful».',
    practice: [
      'Yangi takaful bozorida retakaful hal qiluvchi ahamiyatga ega: yosh operatorning fondi kichik boʻladi va bitta yirik zarar uni tugatib qoʻyishi mumkin. Shu sababli operatorlar mol-mulk, qurilish va transport tavakkallarining katta qismini xalqaro retakaful bozoriga oʻtkazadi.',
      'Retakaful sigʻimi cheklangan bozorlarda ayrim operatorlar oʻz [[shariat-kengashi|shariat kengashi]] ruxsati bilan anʼanaviy qayta sugʻurtachilardan ham foydalanadi. Bu odatda vaqtinchalik chora sifatida koʻriladi va hisobotlarda oshkor qilinadi.',
      '2026-yil oktabr holatiga Oʻzbekistonda birorta takaful operatori hali litsenziya olmagan, shuning uchun mahalliy retakaful bozori ham mavjud emas. Bozor ishtirokchilari fikricha, birinchi operatorlarning sigʻimi koʻp jihatdan xorijiy retakaful hamkorlariga bogʻliq boʻladi.',
    ],
    steps: [
      'Takaful operatori fond qancha tavakkalni oʻzida saqlashini belgilaydi.',
      'Retakaful operatori bilan shartnoma tuziladi: oʻtkaziladigan ulush yoki zarar chegarasi, badal va muddat kelishiladi.',
      'Takaful fondi retakaful badalini toʻlaydi.',
      'Zarar yuz bersa, fond oʻz ulushini, retakaful fondi esa kelishilgan qismni qoplaydi.',
    ],
    example: {
      title: 'Yirik obyekt boʻyicha himoya',
      text: 'Takaful fondi savdo markaziga 20 mlrd soʻmgacha takaful himoyasini berdi. Fond har bir hodisa boʻyicha birinchi 5 mlrd soʻm zararni oʻzi qoplashga, undan ortiq qismini retakaful operatoriga oʻtkazishga qaror qiladi va buning uchun yiliga 400 mln soʻm retakaful badali toʻlaydi. Obyektda 12 mlrd soʻmlik zarar yuz bersa, 5 mlrd soʻmni takaful fondi, 7 mlrd soʻmni retakaful fondi qoplaydi.',
    },
    related: ['takaful', 'vakola', 'muzoraba', 'shariat-kengashi'],
  },
  {
    slug: 'ribo',
    term: 'Ribo',
    aliases: { en: 'riba (interest, usury)', ru: 'риба (ростовщический процент)', ar: 'riba' },
    category: 'tamoyil',
    short: 'Qarz summasi yoki muddatiga bogʻlab oldindan belgilanadigan qoʻshimcha toʻlov; islom moliyasining markaziy taqiqi.',
    definition: [
      'Ribo — qarz summasi yoki uning muddatiga bogʻlab oldindan belgilanadigan qoʻshimcha toʻlov, shuningdek bir turdagi qimmatliklarni teng boʻlmagan miqdorda ayirboshlash. Zamonaviy moliyada bu tushuncha koʻproq bank foizi bilan bogʻlanadi.',
      'Islom moliyasi tamoyillariga koʻra foiz olish va toʻlash taqiqlanadi. Shu sababli islom banklari pul qarzi berib foiz olmaydi: daromad savdo ([[murobaha|murobaha]]), ijara ([[ijora|ijora]]) yoki sheriklik ([[mushoraka|mushoraka]], [[muzoraba|muzoraba]]) orqali, yaʼni real aktiv yoki biznes natijasi bilan bogʻliq holda olinadi.',
    ],
    origin: 'Arabcha «riba» soʻzidan olingan, «oʻsish», «ortish», «koʻpayish» degan maʼnoni bildiradi.',
    practice: [
      'Ribo taqiqi islom moliyasi mahsulotlarining tuzilishini belgilaydi. Masalan, murobahada narx shartnoma tuzilganda qatʼiy belgilanadi va toʻlov kechiksa ham qarz oshirilmaydi. Kechikish uchun jarima qoʻllansa, u bank daromadiga qoʻshilmaydi va [[daromadni-tozalash|daromadni tozalash]] tartibida xayriyaga yoʻnaltiriladi.',
      'Islom banklari moliyalashtirish narxini belgilashda bozor foiz stavkalarini moʻljal sifatida ishlatishi mumkin — bu xalqaro amaliyotda keng tarqalgan va munozaralarga ham sabab boʻladi. Narx darajasi oʻxshash boʻlishi mumkin, lekin shartnoma tuzilmasi boshqacha: bank aktivni sotib oladi va unga bogʻliq tavakkalni koʻtaradi, qarz miqdori esa keyinchalik oshirilmaydi.',
      'Oʻzbekistonda [[islom-oynasi|islom oynalari]] anʼanaviy banklar ichida ochilayotgani uchun oyna mablagʻlarini foizli operatsiyalardan ajratish ularning faoliyatidagi asosiy talablardan biri hisoblanadi.',
    ],
    example: {
      title: 'Kredit va murobaha: farq qayerda',
      text: 'Anʼanaviy kredit: bank korxonaga 100 mln soʻm beradi, yillik 24 foiz bilan 12 oyda 124 mln soʻm qaytarilishi kerak; toʻlov kechiksa, qarzga qoʻshimcha foiz hisoblanadi. Murobaha: bank 100 mln soʻmlik uskunani sotib olib, korxonaga 124 mln soʻmga 12 oylik muddatli toʻlov bilan sotadi. Raqamlar yaqin boʻlishi mumkin, lekin murobahada bank avval aktivga egalik qiladi va uning tavakkalini koʻtaradi, 124 mln soʻm esa kechikish boʻlsa ham oshmaydi.',
    },
    related: ['garar', 'maysir', 'murobaha', 'daromadni-tozalash', 'qarzi-hasan'],
  },
  {
    slug: 'salam',
    term: 'Salam',
    aliases: { en: 'salam (forward sale with prepayment)', ru: 'салам (форвардная продажа с предоплатой)', ar: 'salam', other: ['salaf', 'bay salam'] },
    category: 'shartnoma',
    short: 'Xaridor narxni toʻliq oldindan toʻlab, aniq tavsifdagi tovarni kelajakda belgilangan sanada oladigan oldi-sotdi shartnomasi.',
    definition: [
      'Salam — oldindan toʻlov bilan tuziladigan oldi-sotdi shartnomasi: xaridor narxni shartnoma tuzilgan paytda toʻliq toʻlaydi, sotuvchi esa tovarni kelishilgan sanada yetkazib beradi. Tovar shartnoma tuzilganda sotuvchida boʻlmasligi mumkin — masalan, hali yetishtirilmagan hosil.',
      '[[garar|Gʻarar]]ni kamaytirish uchun tovarning turi, navi, sifati, miqdori, yetkazish sanasi va joyi shartnomada aniq belgilanadi. Salam odatda standart tavsifga ega tovarlar — don, paxta, metall — uchun qoʻllanadi.',
    ],
    origin: 'Arabcha «salam» soʻzidan olingan, «oldindan toʻlash», «topshirish» degan maʼnoni bildiradi; maʼnodoshi — «salaf» («oldindan berilgan»).',
    practice: [
      'Salam qishloq xoʻjaligi va xomashyo ishlab chiqaruvchilarini mavsumiy moliyalashtirish vositasi sifatida qoʻllanadi: fermer bahorda urugʻ, oʻgʻit va yoqilgʻi uchun mablagʻ oladi, kuzda esa hosil bilan hisob-kitob qiladi. Qishloq xoʻjaligi Oʻzbekiston iqtisodiyotida katta oʻrin tutgani uchun bozor ishtirokchilari bu shartnomani istiqbolli deb hisoblaydi. Masalan, Qarshidagi Mikromoliya tashkiloti L fermerlar uchun salam mahsulotini taklif qilmoqchi; tashkilot arizasini regulyator koʻrib chiqmoqda.',
      'Bank tovarni omborda saqlab turmaslik uchun odatda parallel salam yoki alohida oldi-sotdi shartnomasi tuzadi va tovarni yetkazib berish sanasida qayta ishlovchi korxonaga sotadi. Ikki shartnoma bir-biriga shart qilib bogʻlanmasligi kerak: fermer tovarni yetkazmasa ham, bank ikkinchi shartnoma boʻyicha oʻz majburiyatini bajaradi.',
      'Salamdagi asosiy tavakkallar — hosil yetishmasligi, sifat va narx oʻzgarishi. Ular [[kafolat|kafolat]], [[rahn|rahn]] va [[takaful|takaful]] himoyasi orqali kamaytiriladi.',
    ],
    steps: [
      'Tomonlar tovarning turi, navi, miqdori, yetkazish sanasi va joyini aniq belgilaydi.',
      'Xaridor (bank) narxni shartnoma tuzilgan kuni toʻliq toʻlaydi.',
      'Sotuvchi tovarni yetishtiradi yoki tayyorlaydi; zarur boʻlsa, majburiyat kafolat yoki garov bilan taʼminlanadi.',
      'Belgilangan sanada tovar xaridorga topshiriladi.',
      'Bank tovarni parallel salam yoki alohida shartnoma orqali uchinchi tomonga sotadi.',
    ],
    example: {
      title: 'Bugʻdoy uchun bahorgi moliyalashtirish',
      text: 'Bank 1-aprel kuni fermer xoʻjaligiga 600 mln soʻm toʻlab, 1-oktabrgacha 200 tonna 1-navli bugʻdoy yetkazib berish haqida salam shartnomasini tuzadi (tonnasi 3 mln soʻmdan). Alohida shartnoma bilan bank shu bugʻdoyni oktabrda don qayta ishlash korxonasiga tonnasi 3,4 mln soʻmdan — jami 680 mln soʻmga sotishga kelishadi. 80 mln soʻm farq bankning tovar va narx tavakkali uchun daromadi hisoblanadi.',
    },
    related: ['istisno', 'garar', 'murobaha', 'takaful'],
  },
  {
    slug: 'shariat-kengashi',
    term: 'Shariat kengashi',
    aliases: {
      en: 'Sharia supervisory board (SSB)',
      ru: 'шариатский совет',
      ar: 'hayat ar-raqaba ash-shariya',
      other: ['SSB', 'shariat nazorati kengashi'],
    },
    category: 'institut',
    short: 'Moliya muassasasi huzuridagi mustaqil mutaxassislar kengashi: mahsulot va operatsiyalarning islom moliyasi tamoyillariga muvofiqligi boʻyicha xulosa beradi.',
    definition: [
      'Shariat kengashi — islom banki, islom oynasi, takaful, lizing yoki mikromoliya tashkiloti huzurida tuziladigan mutaxassislar organi. U islom tijorat huquqi va moliya boʻyicha malakali aʼzolardan iborat boʻlib, muassasa mahsulotlari, shartnoma hujjatlari va operatsiyalari islom moliyasi tamoyillariga mos kelishini koʻrib chiqadi va xulosa beradi.',
      'Muvofiqlik toʻgʻrisidagi xulosalarni muassasaning oʻz shariat kengashi chiqaradi. Ommaviy axborot vositalari, jumladan Muomalat, bunday xulosa bermaydi: nashr kengash qarorlarini institutsional fakt sifatida xabar qiladi — masalan, «bankning shariat kengashi mahsulotni maʼqulladi».',
    ],
    origin:
      '«Shariat» soʻzi arabcha «shariʼa» — «yoʻl», «qoidalar majmui» — soʻzidan, «kengash» esa oʻzbekcha. Atama arabcha «hayʼat ar-raqaba ash-sharʼiyya» va inglizcha «{en:Sharia supervisory board}» iboralarining oʻzbekcha muqobili sifatida qoʻllanadi.',
    practice: [
      'Xalqaro amaliyotda kengash odatda kamida uch aʼzodan iborat boʻladi va muassasa boshqaruvidan mustaqil ishlaydi. U yangi mahsulotni ishga tushirishdan oldin uning tuzilmasi va hujjatlarini maʼqullaydi, ichki shariat nazorati va audit natijalarini koʻrib chiqadi, [[daromadni-tozalash|daromadni tozalash]] tartibini belgilaydi va yillik hisobotda oʻz xulosasini eʼlon qiladi.',
      'Kengash qarorlari koʻpincha [[aaoifi|AAOIFI]] shariat standartlariga tayanadi, kengash faoliyatini boshqaruv tizimiga kiritish tartibini esa [[ifsb|IFSB]] standartlari tavsiflaydi. Ayrim mamlakatlarda regulyator huzurida milliy shariat kengashi ham faoliyat yuritadi va muassasalar kengashlari uning qarorlariga amal qiladi.',
      'Oʻzbekistonda litsenziya olayotgan islom banklari, [[islom-oynasi|islom oynalari]], mikromoliya, lizing va takaful tashkilotlari oʻz shariat kengashlarini shakllantirmoqda. Bozor ishtirokchilari bu sohada malakali mutaxassislar yetishmasligini asosiy cheklovlardan biri deb hisoblaydi; kengashlarga xorijiy mutaxassislarni jalb qilish ham koʻrib chiqilmoqda.',
    ],
    steps: [
      'Muassasa yangi mahsulot tuzilmasi va shartnoma hujjatlarini kengashga taqdim etadi.',
      'Kengash hujjatlarni koʻrib chiqadi va zarur oʻzgartirishlarni talab qiladi.',
      'Kengash mahsulotni maʼqullaydi yoki rad etadi; qaror yozma ravishda rasmiylashtiriladi.',
      'Ichki shariat nazorati mahsulot amalda tasdiqlangan shartlar asosida qoʻllanishini tekshiradi.',
      'Kengash yillik hisobotda muassasa faoliyati boʻyicha xulosa beradi.',
    ],
    related: ['aaoifi', 'ifsb', 'daromadni-tozalash', 'islom-oynasi', 'shariat-skriningi'],
  },
  {
    slug: 'shariat-skriningi',
    term: 'Shariat skriningi',
    aliases: { en: 'Sharia screening', ru: 'шариатский скрининг', other: ['shariat filtri'] },
    category: 'bozor',
    short: 'Kompaniya yoki qimmatli qogʻozni faoliyat turi va moliyaviy koʻrsatkichlari boʻyicha islom moliyasi investitsiya mezonlariga solishtirib saralash.',
    definition: [
      'Shariat skriningi — investitsiya obyektini islom moliyasi mezonlari boʻyicha tekshirish va saralash jarayoni. U ikki bosqichdan iborat: faoliyat turi boʻyicha skrining va moliyaviy koʻrsatkichlar boʻyicha skrining.',
      'Birinchi bosqichda asosiy daromadi alkogol, tamaki, qimor biznesi, anʼanaviy foizli moliya va shu kabi sohalardan keladigan kompaniyalar chiqarib tashlanadi. Ikkinchi bosqichda kompaniyaning foizli qarzi, foizli aktivlari va nomuvofiq daromadi ulushi belgilangan chegaralardan oshmasligi tekshiriladi.',
    ],
    origin: 'Inglizcha «{en:screening}» — «saralash», «tekshiruvdan oʻtkazish» — soʻzidan olingan; «shariat» soʻzi arabcha «shariʼa» — «qoidalar majmui» — maʼnosida.',
    practice: [
      'Skrining mezonlarini metodika muallifi — indeks provayderi, fond yoki muassasa belgilaydi, natijani esa uning [[shariat-kengashi|shariat kengashi]] tasdiqlaydi. Keng tarqalgan metodikalardan birida chegaralar quyidagicha: foizli qarz bozor kapitalizatsiyasining 30 foizidan, foizli depozitlar va qimmatli qogʻozlar ham 30 foizidan, nomuvofiq daromad esa jami tushumning 5 foizidan oshmasligi kerak. Boshqa metodikalarda kapitalizatsiya oʻrniga jami aktivlar yoki 33 foizlik chegara qoʻllanadi.',
      'Koʻrsatkichlar odatda har chorakda qayta hisoblanadi: kompaniya chegaradan chiqsa, fond uning aksiyalarini maʼlum muddatda sotishi kerak boʻladi. Skriningdan oʻtgan kompaniyadan olingan dividendning nomuvofiq qismi [[daromadni-tozalash|daromadni tozalash]] tartibida xayriyaga yoʻnaltiriladi.',
      'Oʻzbekistonda kapital bozori kichik boʻlgani sababli skrining hozircha asosan xorijiy aksiya va fondlarga sarmoya kirituvchilar uchun dolzarb. Bozor ishtirokchilari mahalliy emitentlar uchun ham skrining roʻyxatlari va metodikalari paydo boʻlishini kutmoqda.',
    ],
    steps: [
      'Kompaniyaning asosiy faoliyat turi va daromad manbalari tahlil qilinadi.',
      'Metodikada cheklangan sohalardan asosiy daromad oladigan kompaniyalar chiqarib tashlanadi.',
      'Moliyaviy koʻrsatkichlar — foizli qarz, foizli aktivlar va nomuvofiq daromad ulushi — hisoblanadi.',
      'Koʻrsatkichlar metodika chegaralari bilan solishtiriladi; natijani shariat kengashi tasdiqlaydi.',
      'Koʻrsatkichlar muntazam qayta hisoblanadi, dividendning nomuvofiq qismi tozalanadi.',
    ],
    example: {
      title: 'Kompaniyani skrining qilish',
      text: 'Kompaniyaning bozor kapitalizatsiyasi 500 mlrd soʻm. Foizli qarzi 120 mlrd soʻm (24 foiz), foizli depozitlari 40 mlrd soʻm (8 foiz), jami tushumining 3 foizi depozitlar boʻyicha foizdan keladi. 30/30/5 chegaralari boʻyicha kompaniya skriningdan oʻtadi. Biroq investor undan olgan dividendning 3 foizini tozalashi kerak: 40 mln soʻm dividenddan 1,2 mln soʻm xayriyaga yoʻnaltiriladi.',
    },
    related: ['daromadni-tozalash', 'shariat-kengashi', 'maysir', 'sukuk'],
  },
  {
    slug: 'sukuk',
    term: 'Sukuk',
    aliases: { en: 'sukuk (Islamic investment certificates)', ru: 'сукук (исламские ценные бумаги)', ar: 'sukuk', other: ['sakk', 'islom obligatsiyalari'] },
    category: 'bozor',
    short: 'Aktiv, loyiha yoki biznes faoliyatidagi ulushga egalikni tasdiqlovchi investitsiya sertifikatlari; daromad shu aktiv natijasidan toʻlanadi.',
    definition: [
      'Sukuk — investorlarning muayyan aktiv, loyiha yoki biznes faoliyatidagi ulushga egaligini tasdiqlovchi investitsiya sertifikatlari. Ular koʻpincha «islom obligatsiyalari» deb ataladi, lekin farqi bor: obligatsiya qarz majburiyatini ifodalaydi, sukuk esa aktivga egalik ulushini ifodalaydi va daromad shu aktivdan — ijara toʻlovlari, savdo foydasi yoki sheriklik natijasidan — toʻlanadi.',
      'Asosida yotgan shartnomaga koʻra [[ijora|ijora]], murobaha, mushoraka, muzoraba, [[vakola|vakola]] va istisno sukuklari farqlanadi. Xalqaro bozorda ijora va vakola tuzilmalari keng tarqalgan. AAOIFI shariat standarti № 17 «Investitsion sukuk» sukukning asosiy turlari va shartlarini belgilaydi.',
    ],
    origin: 'Arabcha «sukuk» — «sakk» soʻzining koʻplik shakli boʻlib, «hujjat», «guvohnoma», «yozma majburiyat» degan maʼnoni bildiradi.',
    practice: [
      'Sukuk chiqarishda odatda maxsus maqsadli kompaniya (SPV) tashkil etiladi: u investorlardan mablagʻ jalb qiladi, aktivni sotib oladi yoki ijaraga oladi va aktivdan tushgan daromadni sertifikat egalariga taqsimlaydi. Muddat oxirida aktiv emitentga oldindan kelishilgan tartibda qaytarib sotiladi va sertifikatlar soʻndiriladi.',
      'Sukuk hukumatlar, davlat kompaniyalari va korporatsiyalar uchun xorijiy investorlarni jalb qilish vositasi sifatida ishlatiladi. Aktiv bilan taʼminlangan (asset-backed) va aktivga asoslangan (asset-based) tuzilmalar oʻrtasidagi farq investor himoyasi uchun muhim: birinchisida investorlar aktivga haqiqiy egalik huquqiga ega boʻladi, ikkinchisida esa asosan emitentning toʻlov qobiliyatiga tayanadi.',
      'Oʻzbekistonda islom bank faoliyati toʻgʻrisidagi qonun kuchga kirgach, bozor ishtirokchilari sukuk chiqarish uchun soliq va qimmatli qogʻozlar qonunchiligiga ham oʻzgartirishlar zarurligini taʼkidlamoqda. Ularning fikricha, lizing kompaniyalarining [[ijora|ijora]] portfellari sukuk uchun tabiiy aktiv bazasi boʻlishi mumkin.',
    ],
    steps: [
      'Emitent sukukka asos boʻladigan aktivlarni ajratadi.',
      'Maxsus maqsadli kompaniya (SPV) tashkil etiladi va sertifikatlar investorlarga sotiladi.',
      'SPV jalb qilingan mablagʻga aktivlarni sotib oladi va ularni emitentga ijaraga beradi yoki boshqa shartnoma asosida ishlatadi.',
      'Aktivdan tushgan daromad davriy ravishda sertifikat egalariga taqsimlanadi.',
      'Muddat oxirida aktivlar kelishilgan tartibda qaytarib sotiladi va sertifikatlar soʻndiriladi.',
    ],
    example: {
      title: 'Ijora sukuki: shartli misol',
      text: 'Lizing kompaniyasi uskunalar portfeli asosida 50 mlrd soʻmlik ijora sukuki chiqaradi: investorlarga nominali 1 mln soʻm boʻlgan 50 000 ta sertifikat sotiladi. SPV jalb qilingan mablagʻga uskunalarni kompaniyadan sotib olib, ularni 3 yilga kompaniyaga qayta ijaraga beradi. Ijara toʻlovlaridan investorlarga kutilayotgan yillik 18 foiz daromad — har bir sertifikatga yiliga 180 000 soʻm — taqsimlanadi. Muddat oxirida kompaniya uskunalarni 50 mlrd soʻmga qaytarib sotib oladi va sertifikatlar soʻndiriladi.',
    },
    related: ['ijora', 'vakola', 'mushoraka', 'aaoifi', 'shariat-skriningi'],
  },
  {
    slug: 'takaful',
    term: 'Takaful',
    aliases: { en: 'takaful (Islamic insurance)', ru: 'такафул (исламское страхование)', ar: 'takaful', other: ['islom sugʻurtasi'] },
    category: 'bozor',
    short: 'Ishtirokchilar umumiy fondga badal qoʻshib, bir-birining zararini birgalikda qoplaydigan oʻzaro sugʻurta modeli; fondni operator boshqaradi.',
    definition: [
      'Takaful — islom moliyasi tamoyillariga asoslangan sugʻurta modeli. Ishtirokchilar umumiy takaful fondiga badal qoʻshadi; ishtirokchilardan biri zarar koʻrsa, fond uni qoplaydi. Fond ishtirokchilarga tegishli, uni esa takaful operatori boshqaradi.',
      'Anʼanaviy sugʻurtadan asosiy farqi — tavakkal sugʻurta kompaniyasiga sotilmaydi, balki ishtirokchilar oʻrtasida taqsimlanadi. Bu tuzilma anʼanaviy sugʻurta shartnomasidagi [[garar|gʻarar]] va [[maysir|maysir]] bilan bogʻliq masalalarni hal qilish uchun ishlab chiqilgan. Fond mablagʻlari islom moliyasi talablariga mos aktivlarga joylashtiriladi.',
    ],
    origin: 'Arabcha «takaful» soʻzidan olingan, «kafala» bilan bir oʻzakdan boʻlib, «oʻzaro kafolat», «bir-birini qoʻllab-quvvatlash» degan maʼnoni bildiradi.',
    practice: [
      'Operator fondni odatda [[vakola|vakola]] (boshqaruv uchun qatʼiy haq), [[muzoraba|muzoraba]] (investitsiya daromadidan ulush) yoki ularning aralash modeli asosida boshqaradi. Operator va fond hisoblari alohida yuritiladi. Yil yakunida toʻlovlar va xarajatlardan keyin ortib qolgan mablagʻ shartnomaga koʻra ishtirokchilarga qaytarilishi yoki zaxiraga oʻtkazilishi mumkin; fond mablagʻi yetmasa, operator unga [[qarzi-hasan|qarzi hasan]] beradi.',
      'Takaful islom moliyasi infratuzilmasining zarur qismi: [[ijora|ijora]] va [[murobaha|murobaha]] asosida moliyalashtirilgan aktivlar, garov va kafolatlar sugʻurta himoyasini talab qiladi. Yirik tavakkallar [[retakaful|retakaful]] orqali qayta taqsimlanadi.',
      'Oʻzbekistonda takaful bozori shakllanish bosqichida: Toshkentdagi Takaful operatori Q arizasini regulyator koʻrib chiqmoqda, Takaful operatori R ariza bergan, Takaful operatori S esa niyatini eʼlon qilgan. Bozor ishtirokchilari taʼkidlashicha, operatorlar ish boshlaguncha islom oynalari va lizing kompaniyalari aktivlarni anʼanaviy sugʻurta orqali himoya qilishiga toʻgʻri keladi.',
    ],
    steps: [
      'Ishtirokchi takaful shartnomasini tuzadi va fondga badal toʻlaydi.',
      'Operator fondni vakola yoki muzoraba asosida boshqaradi va oʻz haqini oladi.',
      'Fond mablagʻlari islom moliyasi talablariga mos aktivlarga joylashtiriladi.',
      'Ishtirokchilardan biri zarar koʻrsa, toʻlov fonddan amalga oshiriladi.',
      'Yil yakunida ortgan mablagʻ shartnomaga koʻra taqsimlanadi yoki zaxiraga oʻtkaziladi.',
    ],
    example: {
      title: 'Kichik biznes uchun takaful fondi',
      text: 'Fondga 2 000 nafar kichik biznes egasi har biri yiliga 3 mln soʻmdan badal toʻlaydi — jami 6 mlrd soʻm. Operator vakola haqi sifatida badallarning 20 foizini — 1,2 mlrd soʻmni oladi. Yil davomida ishtirokchilarga 3,9 mlrd soʻm toʻlov amalga oshiriladi, retakaful xarajati 0,3 mlrd soʻmni tashkil etadi. Qolgan 0,6 mlrd soʻm shartnomaga koʻra ishtirokchilarga qaytariladi yoki zaxiraga oʻtkaziladi.',
    },
    related: ['retakaful', 'vakola', 'muzoraba', 'qarzi-hasan', 'garar'],
  },
  {
    slug: 'tavarruq',
    term: 'Tavarruq',
    aliases: { en: 'tawarruq (commodity murabaha)', ru: 'таваррук', ar: 'tawarruq', other: ['commodity murabaha'] },
    category: 'shartnoma',
    short: 'Mijoz tovarni muddatli toʻlovga sotib olib, uni darhol uchinchi tomonga naqd pulga sotadigan bitimlar zanjiri; naqd mablagʻ olish uchun qoʻllanadi.',
    definition: [
      'Tavarruq — naqd mablagʻ olish uchun tuziladigan ikki savdo bitimi: mijoz tovarni (koʻpincha metallni) bankdan [[murobaha|murobaha]] asosida muddatli toʻlovga sotib oladi, soʻng uni bankdan boshqa uchinchi tomonga darhol naqd pulga sotadi. Natijada mijozda naqd pul va bank oldida muddatli qarz paydo boʻladi.',
      'Tavarruq likvidlikni boshqarish va naqd moliyalashtirish uchun qulay boʻlsa-da, islom moliyasida eng koʻp muhokama qilinadigan vositalardan biri. Ayniqsa, barcha bosqichlarini bank oldindan tashkil etadigan «tashkillashtirilgan tavarruq» (organised tawarruq) tanqid qilinadi, chunki uning iqtisodiy natijasi pul qarziga yaqin. AAOIFI standartlari tavarruqqa qatʼiy shartlar qoʻyadi va undan faqat zarurat boʻlganda foydalanishni tavsiya etadi.',
    ],
    origin: 'Arabcha «tavarruq» soʻzidan olingan, «variq» — «kumush tanga», kengroq maʼnoda «naqd pul» — oʻzagidan yasalgan. Tom maʼnoda «naqd pulga aylantirish».',
    practice: [
      'Banklararo bozorda tavarruq — koʻpincha «tovar murobahasi» (commodity murabaha) nomi bilan — islom banklarining ortiqcha likvidligini joylashtirish va qisqa muddatli mablagʻ jalb qilishning asosiy vositasi hisoblanadi. Bitimlar xalqaro tovar bozorlarida metall orqali, brokerlar ishtirokida amalga oshiriladi.',
      'Ayrim mamlakatlarda chakana naqd moliyalashtirish ham tavarruq asosida taklif qilinadi. Muassasaning [[shariat-kengashi|shariat kengashi]] odatda tovar haqiqatan mavjud boʻlishi, egalik huquqi ketma-ket oʻtishi va mijoz tovarni kimga sotishni oʻzi hal qilishi kabi shartlarni talab qiladi.',
      'Oʻzbekistonda islom likvidlik vositalari hali kam boʻlgani uchun tavarruq [[islom-oynasi|islom oynalari]] likvidligini boshqarishda qoʻl kelishi mumkin. Biroq bozor ishtirokchilari tavarruqqa haddan tashqari tayanish real aktivga asoslangan moliyalashtirish gʻoyasini susaytirishi mumkinligini taʼkidlaydi.',
    ],
    steps: [
      'Bank tovarni (masalan, metallni) yetkazib beruvchidan naqd pulga sotib oladi.',
      'Bank tovarni mijozga murobaha asosida muddatli toʻlovga, ustama bilan sotadi.',
      'Mijoz tovarni oʻzi yoki mustaqil vakil orqali uchinchi tomonga naqd pulga sotadi.',
      'Mijoz naqd mablagʻni oladi va bankka murobaha narxini jadval boʻyicha toʻlaydi.',
    ],
    example: {
      title: 'Aylanma mablagʻ uchun tavarruq',
      text: 'Kompaniyaga 500 mln soʻm naqd aylanma mablagʻ kerak. Bank 500 mln soʻmlik metall sotib olib, uni kompaniyaga 12 oylik muddatli toʻlov bilan 590 mln soʻmga sotadi. Kompaniya metallni mustaqil broker orqali uchinchi tomonga darhol 500 mln soʻmga sotadi va naqd pul oladi. Natijada kompaniyada 500 mln soʻm naqd mablagʻ va bank oldida 590 mln soʻmlik toʻlov majburiyati paydo boʻladi.',
    },
    related: ['murobaha', 'vakola', 'ribo', 'shariat-kengashi'],
  },
  {
    slug: 'vakola',
    term: 'Vakola',
    aliases: { en: 'wakalah (agency)', ru: 'вакала (агентский договор)', ar: 'wakala', other: ['wakalah'] },
    category: 'shartnoma',
    short: 'Vakil ikkinchi tomon nomidan va uning hisobidan maʼlum ishni kelishilgan haq evaziga bajaradigan agentlik shartnomasi.',
    definition: [
      'Vakola — agentlik shartnomasi: mijoz vakilga maʼlum ishni — investitsiya qilish, tovar sotib olish yoki fondni boshqarishni — oʻz nomidan va oʻz hisobidan bajarishni topshiradi. Vakil buning uchun oldindan kelishilgan haq oladi.',
      'Natija mijozga tegishli: foyda ham, zarar ham uning hisobiga tushadi. Vakil faqat oʻz ehtiyotsizligi yoki shartnomani buzishi tufayli yetkazilgan zarar uchun javob beradi. Vakil haqi natijaga bogʻliq emasligi bilan vakola [[muzoraba|muzoraba]]dan farq qiladi.',
    ],
    origin: 'Arabcha «vakala» soʻzidan olingan, «ishonib topshirish», «vakil qilish» degan maʼnoni bildiradi. Oʻzbek tilidagi «vakil» va «vakolat» soʻzlari ham shu ildizdan.',
    practice: [
      'Banklar vakolani mablagʻ jalb qilishda qoʻllaydi: mijoz investitsiya vakolasi asosida mablagʻni bankka topshiradi, bank uni moliyalashtirish portfeliga joylashtiradi va qatʼiy vakola haqi oladi. Kutilganidan ortiq daromad ragʻbatlantirish haqi sifatida bankda qolishi mumkin — bu shart shartnomada oldindan yoziladi.',
      '[[takaful|Takaful]] operatorlari fondni vakola asosida boshqaradi, [[murobaha|murobaha]]da esa bank mijozni aktivni bank nomidan sotib olish uchun vakil qilib tayinlashi mumkin. Vakola [[sukuk|sukuk]] tuzilmalarida ham keng qoʻllanadi.',
      'Oʻzbekistonda islom oynalari korporativ mijozlarning boʻsh mablagʻlarini joylashtirish uchun investitsiya vakolasini muzoraba asosidagi [[investitsiya-hisobvaragi|investitsiya hisobvaragʻi]]ga muqobil sifatida taklif qilishi mumkin: vakolada bank haqi oldindan maʼlum boʻladi.',
    ],
    steps: [
      'Mijoz va vakil topshiriladigan ish, muddat va vakola haqini kelishadi.',
      'Mijoz mablagʻ yoki aktivni vakilga topshiradi.',
      'Vakil ishni mijoz nomidan va uning hisobidan bajaradi.',
      'Vakil kelishilgan haqni oladi; natija — foyda yoki zarar — mijozga tegishli.',
      'Vakil oʻz aybi bilan yetkazilgan zararni qoplaydi.',
    ],
    example: {
      title: 'Investitsiya vakolasi',
      text: 'Kompaniya boʻsh turgan 2 mlrd soʻmni 6 oyga islom oynasiga investitsiya vakolasi asosida topshiradi. Bank kutilayotgan daromadni yillik 16 foiz deb eʼlon qiladi va yillik 2 foiz vakola haqi oladi. Portfel 6 oyda 180 mln soʻm daromad keltirsa, bank 20 mln soʻm vakola haqini oladi, kompaniyaga esa 160 mln soʻm — yillik 16 foizga teng daromad tegadi. Daromad kamroq boʻlsa, kompaniya ham kamroq oladi: kutilgan daromad kafolat emas.',
    },
    related: ['muzoraba', 'takaful', 'investitsiya-hisobvaragi', 'kafolat', 'sukuk'],
  },
  {
    slug: 'vad',
    term: 'Vaʼd',
    aliases: { en: 'waad (unilateral promise)', ru: 'ваад (одностороннее обещание)', ar: 'wad', other: ['waad'] },
    category: 'shartnoma',
    short: 'Bir tomonning kelajakda maʼlum harakatni — masalan, aktivni sotib olish yoki sotishni — amalga oshirish haqidagi bir tomonlama vaʼdasi.',
    definition: [
      'Vaʼd — bir tomonlama vaʼda: bir tomon kelajakda maʼlum shartnomani tuzish yoki harakatni bajarish majburiyatini oladi, ikkinchi tomon esa hech qanday majburiyat olmaydi. Vaʼd shartnomaning oʻzi emas: u kelajakdagi shartnomaga zamin yaratadi.',
      'Islom moliyasi amaliyotida vaʼd koʻpincha bajarilishi majburiy deb qabul qilinadi: vaʼd bergan tomon uni buzsa, ikkinchi tomonga yetkazilgan haqiqiy zararni qoplaydi. Ikki tomon bir-biriga oʻzaro majburiy vaʼda bersa (muvoada), bu kelajakdagi shartnomaning oʻzi deb qaralishi mumkin, shuning uchun bunday tuzilmalar cheklanadi.',
    ],
    origin: 'Arabcha «waʼd» soʻzidan olingan boʻlib, «vaʼda», «ahd» degan maʼnoni bildiradi. Oʻzbek tilidagi «vaʼda» soʻzi ham shu ildizdan kelgan.',
    practice: [
      'Vaʼd koʻplab islom moliyasi mahsulotlarining tarkibiy qismi. [[murobaha|Murobaha]]da mijoz bank aktivni xarid qilgach, uni bankdan sotib olishga oldindan vaʼd beradi; [[ijora-muntahiya-bittamlik|ijora muntahiya bittamlik]]da bank muddat oxirida aktivni mijozga sotish yoki hadya qilishga vaʼd beradi; [[kamayuvchi-mushoraka|kamayuvchi mushoraka]]da mijoz bank ulushini bosqichma-bosqich sotib olishga vaʼd beradi.',
      'Xalqaro bozorda vaʼd valyuta va foyda stavkasi tavakkalini xedjlash tuzilmalarida ham qoʻllanadi. Bu yerda u anʼanaviy hosilaviy vositalar oʻrnini bosadi, ammo bunday tuzilmalarni har bir muassasaning [[shariat-kengashi|shariat kengashi]] alohida koʻrib chiqadi.',
      'Vaʼd buzilgan holatda faqat haqiqiy zarar qoplanadi, kutilgan foyda emas. Zararni qoplashni taʼminlash uchun bank mijozdan oldindan zakalat — arabcha «hamish jiddiyya» — olishi mumkin; bitim amalga oshsa, bu summa narx hisobiga oʻtkaziladi.',
    ],
    steps: [
      'Tomonlar asosiy bitim tuzilmasini kelishadi — masalan, murobaha yoki ijora.',
      'Bir tomon kelajakdagi harakat haqida yozma vaʼd beradi: nima, qachon va qanday narxda.',
      'Vaʼd olgan tomon unga tayanib harakat qiladi — masalan, aktivni sotib oladi.',
      'Belgilangan vaqtda alohida shartnoma tuziladi; vaʼd buzilsa, haqiqiy zarar qoplanadi.',
    ],
    example: {
      title: 'Murobahada vaʼd buzilsa',
      text: 'Mijoz bank 200 mln soʻmlik dastgohni sotib olsa, uni 252 mln soʻmga sotib olishga vaʼd beradi. Bank dastgohni sotib olgach, mijoz vaʼdasidan qaytadi va bank uni boshqa xaridorga 190 mln soʻmga sotadi. Mijoz bankning haqiqiy zarari — 10 mln soʻmni qoplaydi; bank kutgan 52 mln soʻm foydani undira olmaydi.',
    },
    related: ['murobaha', 'ijora-muntahiya-bittamlik', 'kamayuvchi-mushoraka', 'kafolat'],
  },
]
