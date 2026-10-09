import type { Article } from '../../types'
import { img } from '../images'

export const intervyu: Article[] = [
  // ── iv-01 ────────────────────────────────────────────────────────────────
  {
    id: 'iv-01',
    slug: 'mijoz-bitimni-oz-sozlari-bilan-aytib-berishi-kerak',
    rubric: 'intervyu',
    kicker: 'Islom oynalari',
    title: '«Mijoz bitimni oʻz soʻzlari bilan aytib bera olishi kerak»',
    lead: 'Tijorat banki D islom oynasi rahbari Dilnoza Karimovaning aytishicha, murojaatlarning uchdan ikki qismi kichik va oʻrta biznesdan tushmoqda. U murobahani tushuntirish va mablagʻlarni ajratish tajribasi haqida gapirdi.',
    authors: ['nilufar-qodirova'],
    publishedAt: '2026-10-06T09:00:00+05:00',
    image: img('bankHall', { caption: 'Bank zalidagi mijozlarga xizmat koʻrsatish oynalari. Islom oynasi bankning mavjud boʻlimlari orqali ham ishlashi mumkin' }),
    interviewee: {
      name: 'Dilnoza Karimova',
      role: 'islom oynasi rahbari',
      organisation: 'Tijorat banki D',
      portrait: img('portrait06', { alt: 'Dilnoza Karimova' }),
    },
    tags: ['islom-oynasi', 'murobaha', 'kichik-biznes'],
    terms: ['islom-oynasi', 'murobaha', 'vad', 'vakola', 'shariat-kengashi', 'daromadni-tozalash', 'ijora', 'muzoraba', 'investitsiya-hisobvaragi'],
    views: 9840,
    related: ['iv-04'],
    body: [
      {
        type: 'p',
        text: 'Tijorat banki D regulyatordan [[islom-oynasi|islom oynasi]] uchun litsenziya olgan birinchi tijorat banki boʻldi: ruxsatnoma 20-avgustda berilgan. Oyna mijozlarga xizmat koʻrsata boshlaganiga hali ikki oy ham boʻlgani yoʻq, lekin bozorning boshqa ishtirokchilari uning tajribasini diqqat bilan kuzatmoqda — yana bir qator banklarning arizalari regulyatorda koʻrib chiqilmoqda.',
      },
      {
        type: 'p',
        text: 'Oyna rahbari Dilnoza Karimova Muomalat bilan suhbatda dastlabki haftalar, kichik va oʻrta biznes talabi, [[murobaha|murobaha]]ni mijozlarga qanday tushuntirishi hamda oyna mablagʻlarini bankning anʼanaviy faoliyatidan ajratib hisobga olish tizimi haqida gapirib berdi.',
      },
      {
        type: 'qa',
        question: 'Oyna ishga tushganiga koʻp vaqt boʻlgani yoʻq. Dastlabki haftalar qanday oʻtdi?',
        answer: [
          'Kutganimizdan koʻra koʻproq savol bilan. Murojaatlar birinchi kundan boshlandi, lekin ularning katta qismi tayyor bitim emas, balki tushuntirish soʻrovi edi: islom oynasi nima, kreditdan farqi qayerda, qanday hujjat kerak. Shuning uchun dastlabki haftalarda xodimlarimiz ish vaqtining yarmidan koʻpini maslahatga sarfladi.',
          'Men buni yomon belgi deb hisoblamayman. Mijoz savol berayotgan boʻlsa, demak u qaror qabul qilishdan oldin tushunmoqchi. Bizning vazifamiz — shu bosqichda uni yoʻqotmaslik va imzolashga shoshiltirmaslik.',
        ],
      },
      {
        type: 'qa',
        question: 'Murojaat qilayotganlar kimlar — jismoniy shaxslarmi yoki biznes?',
        answer: [
          'Hozircha asosiy talab kichik va oʻrta biznesdan. Bizning hisobimizga koʻra, murojaatlarning taxminan uchdan ikki qismi tadbirkorlardan tushmoqda. Eng faol tarmoqlar — ulgurji va chakana savdo, yengil sanoat, qurilish materiallari va qishloq xoʻjaligi texnikasi. Odatda ular aylanma mablagʻni toʻldirish uchun tovar yoki ishlab chiqarish uchun uskuna xaridini moliyalashtirmoqchi.',
          'Bitim hajmi turlicha: 100 mln soʻmdan 2 mlrd soʻmgacha boʻlgan murojaatlar koʻp. Jismoniy shaxslar orasida avtomobil va maishiy texnikaga qiziqish bor, lekin chakana yoʻnalishni biz bosqichma-bosqich ochmoqdamiz.',
          'Viloyatlardan, ayniqsa Samarqand va Fargʻona vodiysidan ham murojaatlar koʻp. Hozircha oyna xizmatlari Toshkentdagi boʻlimlarimizda koʻrsatilmoqda, viloyatlardagi mijozlar bilan esa dastlabki muloqot masofadan olib boriladi.',
        ],
      },
      {
        type: 'qa',
        question: 'Nega aynan murobahadan boshladingiz?',
        answer: [
          'Chunki bu eng tushunarli va nazorat qilish oson boʻlgan tuzilma. Murobahada bank tovarni yetkazib beruvchidan sotib oladi, unga egalik qiladi, keyin esa mijozga tannarx va oldindan ochiq aytilgan ustama bilan muddatli toʻlovga sotadi. Narx imzolangan kuni belgilanadi va shartnoma oxirigacha oʻzgarmaydi.',
          'Bundan tashqari, tadbirkorlar tovar sotib olish mantiqini yaxshi biladi. Ular har kuni shunday bitimlar tuzadi, faqat bu safar sotuvchi oʻrnida bank turibdi. Shuning uchun murobaha birinchi mahsulot sifatida tabiiy tanlov boʻldi.',
        ],
      },
      {
        type: 'qa',
        question: 'Mijozga murobahani qanday tushuntirasiz? Koʻpchilik uni «boshqacha nomlangan kredit» deb oʻylaydi.',
        answer: [
          'Bu savolni deyarli har kuni eshitamiz va uni chetlab oʻtmaymiz. Avvalo farqni raqam bilan emas, ketma-ketlik bilan koʻrsatamiz: kreditda bank pul beradi va pul uchun haq oladi, murobahada esa bank aniq tovarni sotadi. Bank tovarni sotib olmaguncha mijoz bilan sotish shartnomasi tuzilmaydi. Mijoz oldindan faqat tovarni sotib olish haqida [[vad|vaʼda]] beradi.',
          'Keyin oqibatlarini tushuntiramiz. Narx qatʼiy: toʻlov kechiksa, qarz ustiga qarz qoʻshilmaydi. Shartnomadagi kechiktirish toʻlovi bank daromadi hisoblanmaydi, u shariat kengashi tasdiqlagan tartibda xayriya maqsadlariga yoʻnaltiriladi. Lekin mijozga ochiq aytamiz: murobaha avtomatik ravishda arzon degani emas, umumiy toʻlov summasini boshqa takliflar bilan solishtirish kerak.',
          'Yana bir oddiy usulimiz bor. Imzolashdan oldin mijozdan bitimni oʻz soʻzlari bilan aytib berishni soʻraymiz: kim nimani kimdan qachon sotib oladi va qancha toʻlaydi. Agar u buni aytib bera olmasa, imzolashni keyinga qoldiramiz.',
        ],
      },
      {
        type: 'quote',
        text: 'Mijoz bitimni oʻz soʻzlari bilan aytib bera olmasa, biz imzolashga shoshilmaymiz.',
        cite: 'Dilnoza Karimova',
        role: 'Tijorat banki D islom oynasi rahbari',
      },
      {
        type: 'qa',
        question: 'Bank tovarga haqiqatan egalik qilishini qanday taʼminlaysiz?',
        answer: [
          'Bu tuzilmaning asosi, shuning uchun nazorat ham shu yerda eng qatʼiy. Odatda biz yetkazib beruvchiga toʻgʻridan-toʻgʻri toʻlaymiz va tovar bank nomiga rasmiylashtiriladi. Ayrim hollarda mijozni tovarni bank nomidan qabul qilish uchun [[vakola|vakil]] etib tayinlaymiz, ammo bunday holatlarni ataylab cheklaganmiz: vakolat shartnomasi alohida tuziladi, mijozga naqd pul berilmaydi.',
          'Har bir bitimda ichki shariat nazorati xodimi hujjatlar sanasini tekshiradi. Xarid shartnomasi va topshirish-qabul dalolatnomasi sotish shartnomasidan oldin boʻlishi shart. Ketma-ketlik buzilgan boʻlsa, bitim oʻtkazilmaydi.',
        ],
      },
      {
        type: 'qa',
        question: 'Buxgalteriya va axborot tizimlari tomonida eng qiyini nima boʻldi?',
        answer: [
          'Mablagʻlarni ajratish. Islom oynasi bank ichida ishlaydi, lekin uning mablagʻlari va daromadlari anʼanaviy faoliyat bilan aralashmasligi kerak. Buning uchun alohida hisobvaraqlar rejasi, alohida balans va alohida hisobot shakllarini joriy qildik. Oynaga jalb qilingan mablagʻ faqat oyna aktivlariga yoʻnaltiriladi.',
          'Asosiy bank tizimida murobaha uchun alohida modul sozlandi. Anʼanaviy kredit modulida foiz har kuni hisoblanadi, bizga esa bunday mantiq kerak emas edi: murobahada ustama shartnoma imzolangan kuni maʼlum boʻladi, daromad esa muddat davomida taqsimlab tan olinadi. Oyna hisobvaraqlarida foiz hisoblash funksiyasi umuman oʻchirib qoʻyilgan.',
          'Yana bir nozik jihat — ortiqcha likvidlik. Anʼanaviy bank boʻsh mablagʻni foizli banklararo depozitga joylashtira oladi, oyna esa yoʻq. Hozircha boʻsh mablagʻni foizsiz vakillik hisobvaraqlarida saqlayapmiz, bu bizga maʼlum xarajat. Bozorda shariat talablariga mos likvidlik vositalari paydo boʻlishi biz uchun muhim.',
        ],
      },
      {
        type: 'qa',
        question: 'Shariat kengashi kundalik ishda qanday ishtirok etadi?',
        answer: [
          '[[shariat-kengashi|Shariat kengashi]] mahsulotni ishga tushirishdan oldin koʻrib chiqdi va maʼqulladi: shartnoma shablonlari, jarayon sxemasi, kechiktirish toʻlovi tartibi. Bundan keyin kengash har bir bitimni alohida tasdiqlamaydi — bu uning vazifasi emas. Kundalik nazorat ichki shariat nazorati boʻlinmasi zimmasida, u kengashga muntazam hisobot beradi.',
          'Agar biror operatsiya maʼqullangan tartibdan chetga chiqsa, undan olingan daromad [[daromadni-tozalash|tozalanadi]], yaʼni bank foydasiga qoʻshilmaydi. Hozircha bunday holat boʻlmadi, lekin tartib oldindan yozib qoʻyilgan.',
        ],
      },
      {
        type: 'qa',
        question: 'Mutaxassislar yetarlimi?',
        answer: [
          'Bu bozordagi eng tor joy. Jamoani asosan bankning oʻz xodimlaridan shakllantirdik va ularni qayta oʻqitdik. Kredit boʻyicha tajribali mutaxassis uchun eng qiyini — lugʻatni oʻzgartirish. «Foiz stavkasi», «kredit liniyasi» degan iboralar beixtiyor tilga keladi. Mijozga notoʻgʻri soʻz bilan tushuntirsangiz, u mahsulotni ham notoʻgʻri tushunadi.',
          'Shuning uchun oynaning har bir xodimi ichki oʻquv kursi va sinovdan oʻtadi. Mijozlar bilan ishlash uchun oddiy tilda yozilgan qoʻllanma ham tayyorladik.',
        ],
      },
      {
        type: 'qa',
        question: 'Mijoz oynaga onlayn murojaat qila oladimi?',
        answer: [
          'Ariza berish va dastlabki maslahat onlayn ishlaydi: mijoz bank ilovasi orqali soʻrov qoldiradi, keyin u bilan oyna menejeri bogʻlanadi. Lekin shartnoma hozircha faqat boʻlimda imzolanadi. Buning sababi texnik emas: birinchi bitimda mijoz bilan yuzma-yuz gaplashib, shartnomani birga koʻrib chiqishni muhim deb hisoblaymiz.',
          'Keyingi bosqichda takroriy mijozlar uchun masofadan imzolashni joriy qilmoqchimiz. Mijoz bitim mantiqini bir marta tushunib olgan boʻlsa, ikkinchi bitimni ilova orqali rasmiylashtirishi mumkin boʻladi. Buning uchun tizimga tovar xaridi va sotish ketma-ketligini avtomatik tekshiradigan nazorat nuqtalarini qoʻshish kerak.',
        ],
      },
      {
        type: 'qa',
        question: 'Mijozlar eng koʻp nimadan norozi?',
        answer: [
          'Muddatdan. Murobaha bitimi oddiy kreditga qaraganda biroz koʻproq vaqt oladi, chunki oraliqda bank tovarni sotib olishi va qabul qilishi kerak. Yetkazib beruvchi hisob-faktura yoki boshqa hujjatni kechiktirsa, butun zanjir toʻxtaydi. Muddatni qisqartirish uchun yirik yetkazib beruvchilar bilan oldindan kelishuvlar tuzmoqdamiz.',
          'Ikkinchi savol — soliq. Bank tovarni sotib olib, qayta sotganda ayrim soliq masalalari yuzaga keladi. Bu boʻyicha aniqlik kiritish uchun tegishli idoralar bilan muloqot davom etmoqda. Yakuniy yechim boʻlmaguncha mijozga hisob-kitobni toʻliq koʻrsatib beramiz.',
        ],
      },
      {
        type: 'qa',
        question: 'Navbatdagi mahsulotlar qaysilar?',
        answer: [
          'Navbatda uskuna uchun [[ijora|ijora]] turibdi — ishlab chiqaruvchi tadbirkorlar orasida bunga talab katta. Keyin jismoniy va yuridik shaxslar uchun [[muzoraba|muzoraba]] asosidagi [[investitsiya-hisobvaragi|investitsiya hisobvaraqlari]]ni ochishni rejalashtirganmiz. Har bir mahsulot shariat kengashi va regulyatordan oʻtgandan keyingina ishga tushadi, shuning uchun aniq sanalarni oldindan aytmayman.',
        ],
      },
      {
        type: 'qa',
        question: 'Islom moliyasi mahsulotlarini koʻrib chiqayotgan tadbirkorga nima maslahat berasiz?',
        answer: [
          'Uchta narsa. Birinchisi — shartnomani oxirigacha oʻqing va tushunmagan har bir band haqida soʻrang. Ikkinchisi — takliflarni nomiga qarab emas, umumiy toʻlov summasiga qarab solishtiring. Uchinchisi — tovar va yetkazib beruvchi boʻyicha hujjatlarni oldindan tayyorlang: bu bitimni ikki-uch hafta tezlashtiradi.',
          'Bizga yorliq uchun emas, shartnoma mantiqi maʼqul boʻlgani uchun kelgan mijoz kerak. Bunday mijoz uzoq muddatli hamkorga aylanadi.',
        ],
      },
    ],
    sources: [{ title: 'Muomalat bilan suhbat', publisher: 'Muomalat', type: 'interview', date: '2026-10-02' }],
  },

  // ── iv-02 ────────────────────────────────────────────────────────────────
  {
    id: 'iv-02',
    slug: 'ijorada-eng-kop-vaqtni-yetkazib-berish-oldi',
    rubric: 'intervyu',
    kicker: 'Kichik biznes',
    title: '«Ijorada eng koʻp vaqtni hujjatlar emas, yetkazib berish oldi»',
    lead: 'Namanganlik mebel ishlab chiqaruvchi Botirjon Yoʻldoshev ikkita CNC dastgohini Lizing kompaniyasi N bilan ijora shartnomasi asosida oldi. U hujjatlar, muddatlar va yoʻl qoʻygan xatolari haqida gapirdi.',
    authors: ['nilufar-qodirova'],
    publishedAt: '2026-10-01T10:00:00+05:00',
    image: img('workshop', { caption: 'Mebel sexidagi dastgohlar. Ijora muddati davomida uskuna lizing kompaniyasining mulki boʻlib qoladi' }),
    interviewee: {
      name: 'Botirjon Yoʻldoshev',
      role: 'asoschi va rahbar',
      organisation: 'Oilaviy mebel korxonasi (Namangan)',
      portrait: img('portrait05', { alt: 'Botirjon Yoʻldoshev' }),
    },
    tags: ['ijora', 'lizing', 'kichik-biznes'],
    terms: ['ijora', 'vad', 'takaful', 'ijora-muntahiya-bittamlik', 'kafolat'],
    views: 6420,
    related: ['iz-03', 'iz-07'],
    body: [
      {
        type: 'p',
        text: 'Namanganlik tadbirkor Botirjon Yoʻldoshevning oilaviy mebel korxonasi Lizing kompaniyasi N bilan [[ijora|ijora]] shartnomasi tuzib, raqamli dastur bilan boshqariladigan ikkita frezer dastgohini (CNC) oldi. Korxona oʻn yil oldin oilaviy ustaxona sifatida ochilgan, bugun unda 38 kishi ishlaydi. Asosiy mahsulot — oshxona va ofis mebellari, buyurtmachilarning katta qismi Fargʻona vodiysi va Toshkentda.',
      },
      {
        type: 'p',
        text: 'Islom bank faoliyati toʻgʻrisidagi qonun kuchga kirgach, ijorani amalda sinab koʻrgan dastlabki tadbirkorlardan biri Muomalatga hujjatlar, muddatlar va kutilmagan qiyinchiliklar haqida soʻzlab berdi. Suhbat korxona sexida, dastgohlar ishga tushirilganidan uch hafta oʻtib yozib olindi.',
      },
      {
        type: 'qa',
        question: 'Nega dastgohlarni aynan ijora orqali olishga qaror qildingiz?',
        answer: [
          'Ikki sabab bor edi. Birinchisi — shaxsiy. Oilada foizli qarzdan iloji boricha qochib kelganmiz, korxonani ham asosan oʻz mablagʻimiz hisobidan kengaytirdik. Lekin zamonaviy dastgoh uchun yillab pul yigʻish kerak edi, bozor esa kutib turmaydi.',
          'Ikkinchisi — hisob-kitob. Ijorada dastgoh lizing kompaniyasining mulki boʻlib qoladi, biz undan foydalanamiz va belgilangan ijara toʻlovini toʻlaymiz. Toʻlov jadvali boshidan maʼlum, muddat oxirida esa dastgoh bizga oʻtadi. Bu biznes rejamizga toʻgʻri keldi.',
        ],
      },
      {
        type: 'qa',
        question: 'Lizing kompaniyasini qanday topdingiz?',
        answer: [
          'Toshkentdagi koʻrgazmada dastgoh yetkazib beruvchisi bilan gaplashib turganimizda, u islom moliyasi asosida ishlaydigan lizing kompaniyalari borligini aytdi. Keyin qaysi kompaniya litsenziya olgani, kim hali ariza bosqichida ekanini oʻzim surishtirib bildim. Lizing kompaniyasi N ishlab chiqarish uskunalari bilan ishlashini bilib, toʻgʻridan-toʻgʻri ularga murojaat qildim.',
          'Ochigʻi, dastlab ishonchsizlik ham bor edi. «Islom moliyasi» degan soʻzni koʻp eshitamiz, lekin amalda nima ekanini tushunmasdik. Birinchi uchrashuvda kompaniya mutaxassisi sxemani qogʻozga chizib berdi: dastgohni kim sotib oladi, kimning nomiga rasmiylashtiriladi, toʻlov qachon boshlanadi. Shundan keyin qaror qabul qilish osonlashdi.',
        ],
      },
      {
        type: 'qa',
        question: 'Qanday hujjatlar talab qilindi?',
        answer: [
          'Roʻyxat oddiy kredit uchun soʻraladigan hujjatlardan unchalik farq qilmadi: taʼsis hujjatlari, oxirgi ikki yillik moliyaviy va soliq hisobotlari, bank hisobvaragʻidan koʻchirma, biznes reja va yetkazib beruvchining tijorat taklifi. Qoʻshimcha ravishda dastgoh oʻrnatiladigan sex boʻyicha hujjat soʻraldi, chunki uskuna kompaniyaning mulki boʻlib qoladi va kompaniya uning qayerda turishini bilishi kerak.',
          'Eng koʻp vaqtni hisobotlarni tartibga keltirish oldi. Kichik korxonalarda buxgalteriya koʻpincha soliq uchun yuritiladi, boshqaruv uchun emas. Kompaniya mahsulot turlari boʻyicha sotuv va tannarxni koʻrmoqchi edi, biz bu maʼlumotlarni qaytadan yigʻib berdik. Kompaniya mutaxassisi sexga ikki marta keldi: birinchi safar ishlab chiqarishni koʻrish uchun, ikkinchi safar dastgohlar oʻrnatiladigan joyni oʻlchash uchun.',
        ],
      },
      {
        type: 'qa',
        question: 'Arizadan dastgohlar ishga tushguncha qancha vaqt oʻtdi?',
        answer: [
          'Qariyb olti hafta. Kompaniya litsenziya olganidan bir necha kun oʻtib ariza topshirdik — biz ularning birinchi mijozlaridan boʻldik. Arizani va moliyaviy holatimizni ikki haftada koʻrib chiqishdi. Shundan keyin ijora shartlari kelishildi va biz dastgohni ijaraga olish hamda muddat oxirida sotib olish haqida [[vad|vaʼda]] hujjatini imzoladik. Keyin kompaniya dastgohlarni yetkazib beruvchidan oʻz nomiga sotib oldi.',
          'Eng koʻp vaqtni yetkazib berish va bojxona rasmiylashtiruvi oldi — qariyb uch hafta. Dastgohlar Turkiyadan keldi. Ijara toʻlovi esa dastgohlar sexga oʻrnatilib, ishga tushirilgandan keyin boshlandi. Bu biz uchun muhim edi: hali ishlamayotgan uskuna uchun toʻlamadik. Dastgohlar ishga tushirilgan kuni topshirish-qabul dalolatnomasi imzolandi, toʻlov jadvali ham shu sanadan hisoblana boshladi.',
        ],
      },
      {
        type: 'qa',
        question: 'Shartnomada sizni nima ajablantirdi?',
        answer: [
          'Majburiyatlarning taqsimlanishi. Kompaniya dastgohning mulkdori boʻlgani uchun yirik taʼmir va sugʻurta uning zimmasida. Biz esa kundalik texnik xizmat — moylash, kesuvchi asboblarni almashtirish, operatorlarni oʻqitish uchun javob beramiz. Shartnomada bu bandma-band yozilgan. Agar dastgoh bizning aybimizsiz ishdan chiqsa, uni tiklash davrida ijara toʻlovi toʻxtatiladi.',
          'Sugʻurtani kompaniya oʻzi rasmiylashtirdi. Kompaniya vakillarining aytishicha, bozorda hali litsenziyalangan [[takaful|takaful]] operatori yoʻqligi sababli dastgohlar hozircha anʼanaviy sugʻurta kompaniyasida sugʻurtalangan, takaful operatorlari paydo boʻlgach, ularga oʻtish rejalashtirilgan.',
          'Kechiktirilgan toʻlov uchun ham jarima bor, lekin u kompaniya daromadiga oʻtmaydi, xayriyaga yoʻnaltiriladi. Ochigʻi, bu intizomni yengillashtirmaydi: kechiktirish baribir qimmatga tushadi, faqat pul kompaniyaga emas, boshqa joyga ketadi.',
        ],
      },
      {
        type: 'qa',
        question: 'Boshlangʻich toʻlov qancha boʻldi va xarajat oddiy lizingga nisbatan qanday chiqdi?',
        answer: [
          'Ikki dastgohning umumiy qiymati qariyb 1,4 mlrd soʻm. Boshlangʻich toʻlov 20 foiz boʻldi, qolgan qismi 36 oylik ijara toʻlovlariga taqsimlangan. Umumiy xarajatni ikki bank va bitta anʼanaviy lizing kompaniyasi takliflari bilan solishtirdik. Farq katta emas edi — u yoki bu tomonga bir necha foiz.',
          'Ijara toʻlovi har oy bir xil. Kompaniya bozor sharoitiga qarab yiliga bir marta qayta koʻrib chiqiladigan variantni ham taklif qildi, lekin biz qatʼiy toʻlovni tanladik: kichik korxona uchun oldindan maʼlumlik muhimroq.',
          'Shuning uchun men hech kimga «ijora albatta arzon» demayman. Biz uchun hal qiluvchi omil narx emas, shartnomaning tuzilishi boʻldi.',
        ],
      },
      {
        type: 'qa',
        question: 'Jarayonda qanday xatolarga yoʻl qoʻydingiz?',
        answer: [
          'Eng kattasi — yetkazib beruvchini oldindan tayyorlamaganimiz. Ijorada xaridor biz emas, lizing kompaniyasi. Demak, shartnoma, hisob-faktura va bojxona hujjatlari kompaniya nomiga rasmiylashtirilishi kerak. Yetkazib beruvchi dastlab hujjatlarni bizning nomimizga tayyorlab qoʻydi, ularni qayta rasmiylashtirishga bir hafta ketdi.',
          'Ikkinchi xato — elektr quvvatini hisobga olmaganimiz. Dastgohlar uchun sexdagi elektr tarmogʻini kuchaytirishga toʻgʻri keldi. Bu ijora bilan bogʻliq emas, lekin muddatni choʻzdi.',
        ],
      },
      {
        type: 'quote',
        text: 'Ijorada xaridor biz emas, lizing kompaniyasi. Yetkazib beruvchiga buni birinchi kunning oʻzida tushuntiring.',
        cite: 'Botirjon Yoʻldoshev',
        role: 'mebel korxonasi asoschisi, Namangan',
      },
      {
        type: 'qa',
        question: 'Dastgohlar ishlab chiqarishga qanday taʼsir qildi?',
        answer: [
          'Ular ishlayotganiga uch hafta boʻldi, shuning uchun xulosa chiqarishga erta. Lekin farq hozirdanoq koʻrinib turibdi. Avval bitta shkaf korpusini qoʻlda kesish va teshish uchun ikki usta yarim kun sarflardi, hozir dastgoh buni bir soatdan kamroq vaqtda qiladi va aniqlik ancha yuqori. Chiqindi kamaydi, plita tejalmoqda.',
          'Ilgari mehmonxona va ofis loyihalarida aniq oʻlchamlar talab qilingani uchun ularda qatnasha olmasdik. Endi shunday bir tanlovga ariza topshirdik. Dastgohlar uchun ikki yosh operatorni ishga oldik, ularni yetkazib beruvchining mutaxassislari bir hafta davomida oʻqitdi.',
        ],
      },
      {
        type: 'qa',
        question: 'Dastgoh qachon va qanday qilib sizning mulkingizga oʻtadi?',
        answer: [
          'Shartnoma [[ijora-muntahiya-bittamlik|ijora muntahiya bittamlik]] shaklida tuzilgan. Mulkni oʻtkazish ijara shartnomasining shartiga kiritilmagan, alohida vaʼda bilan rasmiylashtirilgan: barcha ijara toʻlovlari toʻlab boʻlingach, kompaniya dastgohni ramziy narxda bizga sotadi. Kompaniya vakillari bu ikki hujjat nega alohida ekanini tushuntirdi — standartlar shuni talab qiladi.',
          'Amalda bu shuni anglatadiki, uch yil davomida dastgoh kompaniya balansida turadi, biz esa undan foydalanuvchimiz. Muddatidan oldin sotib olish imkoniyati ham bor, shartlari shartnomada koʻrsatilgan.',
        ],
      },
      {
        type: 'qa',
        question: 'Garov yoki kafolat talab qilindimi?',
        answer: [
          'Asosiy taʼminot — dastgohning oʻzi, chunki u kompaniyaning mulki. Qoʻshimcha ravishda men taʼsischi sifatida shaxsiy [[kafolat|kafolat]] berdim. Uy yoki boshqa koʻchmas mulkni garovga qoʻyish talab qilinmadi. Biz kabi kichik korxona uchun bu katta yengillik. Kompaniya dastgohlarning bozor qiymati va korxonaning toʻlov qobiliyatini baholadi, bu yerda ikki yillik tartibli hisobotlarimiz yordam berdi.',
        ],
      },
      {
        type: 'qa',
        question: 'Namangandagi boshqa ishlab chiqaruvchilar qiziqish bildiryaptimi?',
        answer: [
          'Ha, juda. Dastgohlarni koʻrgani qoʻshni sexlardan kelishdi. Asosiy savollar ikkita: «bu oddiy lizingdan nimasi bilan farq qiladi» va «hujjat koʻpmi». Men oʻz tajribamni aytaman: hujjat koʻp emas, lekin tartibli boʻlishi kerak. Hisobotingiz tartibsiz boʻlsa, hech qaysi moliya tashkiloti bilan tez ishlay olmaysiz.',
          'Viloyatlarda bunday xizmatlar haqida maʼlumot hali kam. Lizing kompaniyasining ofisi Toshkentda, muloqot asosan masofadan va safarlar orqali boʻldi. Joylarda maslahat beradigan mutaxassislar boʻlsa, qiziqish ancha koʻp boʻlardi.',
        ],
      },
      {
        type: 'qa',
        question: 'Ijorani koʻrib chiqayotgan tadbirkorlarga qanday maslahat berasiz?',
        answer: [
          'Birinchisi — hisobotlaringizni kamida oxirgi ikki yil boʻyicha tartibga keltiring. Ikkinchisi — uskunani tanlashdan oldin yetkazib beruvchi lizing kompaniyasi bilan ishlashga tayyormi, aniqlab oling. Uchinchisi — shartnomadagi har bir bandni, ayniqsa taʼmir, sugʻurta va muddatidan oldin sotib olish haqidagi qismlarni oʻqing. Tushunmagan joyingizni soʻrashdan uyalmang. Toʻrtinchisi — sexni oldindan tayyorlang: elektr quvvati, maydon, shamollatish. Biz bunga ketadigan vaqtni notoʻgʻri hisoblagan edik. Biznes sizniki, qaror ham sizniki.',
        ],
      },
    ],
    sources: [{ title: 'Muomalat bilan suhbat', publisher: 'Muomalat', type: 'interview', date: '2026-09-26' }],
  },

  // ── iv-03 ────────────────────────────────────────────────────────────────
  {
    id: 'iv-03',
    slug: 'muvofiqlik-xulosasi-kengashniki-jurnalistniki-emas',
    rubric: 'intervyu',
    kicker: 'Shariat boshqaruvi',
    title: '«Muvofiqlik haqidagi xulosa — kengashniki, jurnalistniki emas»',
    lead: 'Kuala-Lumpurdagi maslahatchi Hamid Rashidov shariat kengashlari mustaqilligi qanday taʼminlanishi, shariat auditi nimani tekshirishi va nega media mahsulotlarga baho bermasligi kerakligini tushuntirdi.',
    authors: ['nilufar-qodirova'],
    publishedAt: '2026-09-29T09:00:00+05:00',
    image: img('financialDistrict', { caption: 'Xorijiy moliya markazidagi bank binolari. Turli mamlakatlarda shariat boshqaruvining turli modellari shakllangan' }),
    interviewee: {
      name: 'Hamid Rashidov',
      role: 'boshqaruvchi hamkor',
      organisation: 'Shariat boshqaruvi boʻyicha maslahat firmasi (Kuala-Lumpur)',
      portrait: img('portrait03', { alt: 'Hamid Rashidov' }),
    },
    tags: ['shariat-kengashi', 'standartlar', 'xalqaro-bozorlar'],
    terms: ['shariat-kengashi', 'aaoifi', 'ifsb', 'murobaha', 'daromadni-tozalash', 'tavarruq', 'vad'],
    views: 4310,
    related: ['iz-06'],
    body: [
      {
        type: 'p',
        text: 'Hamid Rashidov yigirma yildan ortiq vaqtdan beri Malayziya, Fors koʻrfazi mamlakatlari va Markaziy Osiyodagi moliya tashkilotlariga shariat boshqaruvi tizimini yoʻlga qoʻyish boʻyicha maslahat beradi. U Kuala-Lumpurda joylashgan maslahat firmasining boshqaruvchi hamkori.',
      },
      {
        type: 'p',
        text: 'Oʻzbekistonda birinchi toʻliq islom banki litsenziya olgan va bir qator banklar islom oynalarini ochishga tayyorlanayotgan paytda Muomalat u bilan [[shariat-kengashi|shariat kengashlari]] qanday ishlashi, ularning mustaqilligi, shariat auditi va ommaviy axborot vositalarining roli haqida suhbatlashdi. Suhbat ingliz tilida boʻlib oʻtdi, matn tarjima qilingan va qisqartirilgan.',
      },
      {
        type: 'qa',
        question: 'Shariat kengashi aslida nima ish qiladi? Koʻpchilik uni «tasdiq muhri» deb tasavvur qiladi.',
        answer: [
          'Bu tasavvur qisman toʻgʻri, lekin juda tor. Kengash moliya tashkilotining mahsulotlari, shartnomalari va jarayonlari tashkilot qabul qilgan shariat standartlariga mos kelishini koʻrib chiqadi va bu haqda xulosa beradi. Mahsulot ishga tushishidan oldin kengash uning tuzilmasini, shartnoma shablonlarini, hatto mijozga beriladigan tushuntirish materiallarini ham oʻrganadi.',
          'Ammo ish shu bilan tugamaydi. Mahsulot ishga tushgach, u amalda haqiqatan maʼqullangan tartibda bajarilayotganini tekshirish kerak. Shu sababli kengash ichki shariat nazorati va auditorlar hisobotlarini koʻrib chiqadi, yil yakunida esa aksiyadorlarga hisobot beradi. Muhr — bu jarayonning faqat koʻzga koʻrinadigan qismi.',
        ],
      },
      {
        type: 'qa',
        question: 'Kengashga kimlar kiradi?',
        answer: [
          'Odatda uch-besh kishi. Ular orasida islom tijorat huquqi boʻyicha mutaxassislar boʻlishi shart, lekin bugungi amaliyotda moliya, buxgalteriya yoki huquq sohasida tajribaga ega aʼzolar ham koʻproq kiritilmoqda. Murakkab tuzilmani baholash uchun faqat shartnomalar nazariyasini bilish yetmaydi: pul oqimi qayerdan qayerga ketayotganini, buxgalteriyada qanday aks etishini tushunish kerak.',
          'Mahalliy qonunchilikni bilish ham muhim. Xorijiy mutaxassis yaxshi standartlarni olib keladi, lekin mamlakatning fuqarolik va soliq qonunchiligini bilmasa, shartnoma qogʻozda toʻgʻri, amalda esa ijro etib boʻlmaydigan boʻlib qolishi mumkin.',
        ],
      },
      {
        type: 'qa',
        question: 'Mustaqillik qanday taʼminlanadi? Axir kengash aʼzolariga tashkilotning oʻzi haq toʻlaydi.',
        answer: [
          'Bu juda oʻrinli savol. Xalqaro amaliyotda bir nechta himoya mexanizmi bor. Birinchidan, kengash aʼzolarini ijroiya boshqaruv emas, aksiyadorlarning umumiy yigʻilishi tayinlaydi va ularning haqi ham shu yerda tasdiqlanadi. Ikkinchidan, aʼzo tashkilotda ijrochi lavozimda ishlamasligi, uning yirik aksiyadori yoki mijozi boʻlmasligi kerak. Uchinchidan, kengash qarorlari bayonnomada qayd etiladi va asoslanadi.',
          '[[aaoifi|AAOIFI]]ning boshqaruv standartlari va [[ifsb|IFSB]]ning shariat boshqaruvi boʻyicha tamoyillari aynan shu masalalarga katta eʼtibor beradi. Lekin hech qanday standart tashkilot madaniyatining oʻrnini bosa olmaydi. Agar boshqaruv kengashning salbiy xulosasini toʻsiq deb qabul qilsa, mustaqillik qogʻozda qoladi.',
        ],
      },
      {
        type: 'qa',
        question: 'Bir kishi bir nechta tashkilot kengashida ishlashi mumkinmi?',
        answer: [
          'Mumkin, lekin koʻp mamlakatlarda bunga cheklov bor. Mutaxassislar kam boʻlgan bozorlarda bir kishining bir nechta kengashda ishlashi tabiiy, lekin bu ikki xatar tugʻdiradi. Birinchisi — manfaatlar toʻqnashuvi, chunki raqobatchi tashkilotlar maʼlumotlari bir qoʻlda toʻplanadi. Ikkinchisi — vaqt yetishmovchiligi. Shu sababli regulyatorlar bir aʼzo bir vaqtning oʻzida ishlashi mumkin boʻlgan kengashlar sonini belgilab qoʻyadi.',
          'Oʻzbekiston kabi yangi bozorda dastlab mutaxassislar yetishmasligi aniq. Menimcha, bu yerda eng muhimi — oshkoralik: kim qaysi kengashda ishlayotgani ochiq eʼlon qilinishi kerak.',
        ],
      },
      {
        type: 'qa',
        question: 'Shariat auditi moliyaviy auditdan nimasi bilan farq qiladi?',
        answer: [
          'Moliyaviy audit raqamlar toʻgʻri aks ettirilganini tekshiradi. Shariat auditi esa operatsiyalar kengash maʼqullagan tartibda bajarilganini tekshiradi. Masalan, [[murobaha|murobaha]] boʻyicha auditor tanlab olingan bitimlarda tashkilot tovarni mijozga sotishdan oldin haqiqatan sotib olgan-olmaganini, hujjatlar toʻgʻri ketma-ketlikda tuzilganini koʻradi.',
          'Odatda ikki daraja bor: ichki shariat nazorati, yaʼni kundalik tekshiruv, va mustaqil firma tomonidan oʻtkaziladigan tashqi shariat auditi. Qoidabuzarlik aniqlansa, kengash shu operatsiyadan olingan daromadni qanday [[daromadni-tozalash|tozalash]] kerakligini belgilaydi. Bu daromad tashkilot foydasiga qoʻshilmaydi.',
        ],
      },
      {
        type: 'qa',
        question: 'Turli mamlakatlarda kengashlar bir masalada turlicha xulosaga kelishi mumkinmi?',
        answer: [
          'Ha, va bu sir emas. Masalan, [[tavarruq|tavarruq]] yoki ayrim [[vad|vaʼda]] tuzilmalariga yondashuv yurisdiksiyalar orasida farq qiladi. Shuning uchun baʼzi mamlakatlar markazlashgan modelni tanlagan: milliy darajadagi kengash asosiy masalalarda yagona pozitsiyani belgilaydi, tashkilotlar kengashlari esa shu doirada ishlaydi. Boshqa mamlakatlarda har bir tashkilot kengashi koʻproq mustaqillikka ega.',
          'Har ikki modelning afzalligi va kamchiligi bor. Markazlashgan model bozorga bir xillik va bashorat qilinuvchanlik beradi, markazlashmagan model esa yangi mahsulotlarga moslashuvchanroq. Yangi bozor uchun kamida asosiy masalalarda yagona asos boʻlgani maʼqul: mijoz har bir bankda boshqa qoidaga duch kelmasligi kerak.',
        ],
      },
      {
        type: 'qa',
        question: 'Siz ommaviy axborot vositalari mahsulotlarga baho bermasligi kerak, degan fikrni koʻp aytasiz. Nega?',
        answer: [
          'Chunki bu ish uchun zarur maʼlumot ham, masʼuliyat ham boshqa joyda. Kengash xulosa berishdan oldin shartnomaning toʻliq matnini, pul oqimi sxemasini, buxgalteriya yozuvlarini koʻradi, savol beradi, oʻzgartirish talab qiladi. Jurnalist odatda bularning hech birini koʻrmaydi. Reklama bukleti yoki press-reliz asosida mahsulotni «muvofiq» yoki «muvofiq emas» deb yozish oʻquvchini chalgʻitadi.',
          'Ikkinchi sabab — vazifalar taqsimoti. Muvofiqlik haqida xulosa beradigan tuzilma bor, qonuniylikni nazorat qiladigan regulyator bor. Mediadan esa jamiyat boshqa narsani kutadi: kim qanday qaror qabul qilgani, uning asoslari nima va amalda nima boʻlayotganini aniq va xolis yetkazishni. Nashr oʻzini qaror chiqaruvchi deb hisoblasa, kuzatuvchi sifatidagi ishonchni yoʻqotadi.',
        ],
      },
      {
        type: 'quote',
        text: 'Jurnalistning vazifasi — kim qanday xulosa berganini aniq yetkazish, xulosaning oʻzini chiqarish emas.',
        cite: 'Hamid Rashidov',
        role: 'shariat boshqaruvi boʻyicha maslahatchi',
      },
      {
        type: 'qa',
        question: 'Unda jurnalist nimani soʻrashi kerak?',
        answer: [
          'Juda koʻp narsani. Mahsulot qaysi kengash tomonidan maʼqullangan? Xulosa eʼlon qilinganmi? Kengash aʼzolari kimlar, ular yana qayerda ishlaydi? Ichki shariat nazorati bormi, tashqi auditni kim oʻtkazadi? Yillik shariat hisoboti eʼlon qilinadimi? Tozalangan daromad qancha va qayerga yoʻnaltirilgan? Bularning barchasi faktlar va ularni tekshirish mumkin.',
          'Yaxshi jurnalistika kengashga bosim oʻtkazmaydi, balki oshkoralikka ragʻbat beradi. Agar tashkilot yillik shariat hisobotini eʼlon qilmasa, bu ham yangilik.',
        ],
      },
      {
        type: 'qa',
        question: 'Kengashlar ishida koʻp uchraydigan xatolar qaysilar?',
        answer: [
          'Uchtasini aytaman. Birinchisi — xulosalarning umumiyligi: «mahsulot muvofiq» deyiladi, lekin qaysi shartlar bilan, qaysi standartga tayanib — yozilmaydi. Ikkinchisi — kengash yiliga bir-ikki marta yigʻiladi va operatsiyalarni amalda kuzatmaydi. Uchinchisi — kengash aʼzolari tashkilot ichidagi maʼlumotlardan toʻliq foydalana olmaydi. Uchala holatda ham kengash nomigagina ishlaydi.',
        ],
      },
      {
        type: 'qa',
        question: 'Oʻzbekistondagi tashkilotlarga hozir nimani tavsiya qilasiz?',
        answer: [
          'Birinchidan, kengashni mahsulot tayyor boʻlgandan keyin emas, eng boshida jalb qilish kerak. Koʻp tashkilotlar xatoni shu yerda qiladi: avval axborot tizimi, jarayonlar va marketing tayyorlanadi, keyin hammasi kengashga «tasdiqlang» deb olib boriladi. Kengash oʻzgartirish talab qilsa, ishni qaytadan boshlashga toʻgʻri keladi.',
          'Ikkinchidan, ichki shariat nazoratiga yetarli resurs ajratish lozim. Bu boʻlinma kichik boʻlsa ham, mustaqil boʻlishi va bevosita shariat kengashi hamda kuzatuv kengashiga hisobot berishi kerak. Uchinchidan, xodimlarni oʻqitish. Shariat boshqaruvi faqat kengashning ishi emas: mijoz bilan gaplashayotgan har bir xodim shartnoma mantiqini tushunishi kerak.',
        ],
      },
      {
        type: 'quote',
        text: 'Kengashni mahsulot tayyor boʻlgandan keyin emas, eng boshida jalb qilish kerak.',
        cite: 'Hamid Rashidov',
        role: 'shariat boshqaruvi boʻyicha maslahatchi',
      },
      {
        type: 'qa',
        question: 'Kengash aʼzosi uchun qanday malaka kerak va Oʻzbekistonda bunday mutaxassislarni qayerdan topish mumkin?',
        answer: [
          'Xalqaro amaliyotda aʼzolardan islom tijorat huquqi boʻyicha chuqur bilim, moliya sohasida amaliy tajriba va kamida bitta asosiy standartlar toʻplamini yaxshi bilish talab qilinadi. Koʻp mamlakatlarda regulyator nomzodlarni oldindan koʻrib chiqadi va ularning malakasini baholaydi.',
          'Oʻzbekistonda dastlabki bosqichda tashkilotlarning xorijiy mutaxassislarni mahalliy aʼzolar bilan birga jalb qilishi tabiiy. Lekin bu vaqtinchalik yechim boʻlishi kerak. Mahalliy universitetlar va kasbiy birlashmalar bilan birga sertifikatlash dasturlarini yoʻlga qoʻyish lozim. Agar bozor besh-olti yil ichida oʻz mutaxassislarini tayyorlay olmasa, kengashlar tashqi maslahatga qaram boʻlib qoladi.',
        ],
      },
      {
        type: 'qa',
        question: 'Mijoz kengashga toʻgʻridan-toʻgʻri murojaat qila oladimi?',
        answer: [
          'Koʻp tashkilotlarda buning uchun rasmiy kanal bor: mijoz murojaati ichki shariat nazorati orqali kengashga yetkaziladi. Oʻzbekistondagi tashkilotlar buni boshidanoq yoʻlga qoʻysa yaxshi boʻlardi. Mijoz bitimi maʼqullangan tartibda bajarilmaganini sezsa, shikoyati qayerga borishini bilishi kerak. Bu ishonchni oshiradi va kengashga amaliyotdagi muammolarni erta koʻrish imkonini beradi.',
        ],
      },
    ],
    sources: [{ title: 'Muomalat bilan suhbat', publisher: 'Muomalat', type: 'interview', date: '2026-09-23' }],
  },

  // ── iv-04 ────────────────────────────────────────────────────────────────
  {
    id: 'iv-04',
    slug: 'qarzi-hasan-yordam-vositasi-biznes-modeli-emas',
    rubric: 'intervyu',
    kicker: 'Mikromoliya',
    title: '«Qarzi hasan — yordam vositasi, biznes modeli emas»',
    lead: 'Mikromoliya tashkiloti K ijrochi direktori Nodira Xolmatovaning aytishicha, murojaatlarning 60 foizi ayollardan tushmoqda. U toʻlov intizomi va qarzi hasan nega cheklangan hajmda berilishi haqida gapirdi.',
    authors: ['nilufar-qodirova'],
    publishedAt: '2026-09-24T11:00:00+05:00',
    image: img('cityStreet', { caption: 'Viloyat shahridagi savdo koʻchasi. Mikromurobaha mijozlarining aksariyati kichik ustaxona va uy sharoitida ishlaydi' }),
    interviewee: {
      name: 'Nodira Xolmatova',
      role: 'ijrochi direktor',
      organisation: 'Mikromoliya tashkiloti K',
      portrait: img('portrait04', { alt: 'Nodira Xolmatova' }),
    },
    tags: ['mikromoliya', 'murobaha', 'kichik-biznes'],
    terms: ['murobaha', 'qarzi-hasan', 'vad', 'vakola', 'shariat-kengashi', 'muzoraba'],
    views: 5260,
    related: ['iv-01'],
    body: [
      {
        type: 'p',
        text: 'Andijondagi Mikromoliya tashkiloti K 2-sentabrda islom moliyasi xizmatlari uchun litsenziya oldi. Tashkilot hunarmandlar va uyda ishlaydigan kichik ishlab chiqaruvchilar uchun xomashyo va asbob-uskunani oʻzi sotib olib, ularga [[murobaha|mikromurobaha]] asosida muddatli toʻlovga sotadi. Mahsulot hozir sinov tariqasida ishlamoqda, oktabr oyida uni tashkilotning barcha ofislarida taklif etish rejalashtirilgan. Tashkilot bir necha yildan beri viloyatda mikromoliya xizmatlarini koʻrsatib keladi, islom moliyasi yoʻnalishi uchun esa alohida jamoa va alohida hisob tizimi tuzilgan.',
      },
      {
        type: 'p',
        text: 'Tashkilot ijrochi direktori Nodira Xolmatova Muomalat bilan suhbatda mikromurobaha qanday ishlashi, toʻlov intizomi, ayol tadbirkorlar bilan ishlash va [[qarzi-hasan|qarzi hasan]]ning chegaralari haqida gapirdi. Suhbat tashkilotning Andijondagi bosh ofisida boʻlib oʻtdi.',
      },
      {
        type: 'qa',
        question: 'Mikromurobaha oddiy murobahadan nimasi bilan farq qiladi?',
        answer: [
          'Mohiyatan farq qilmaydi: biz tovarni sotib olamiz, unga egalik qilamiz va mijozga tannarx hamda oldindan kelishilgan ustama bilan boʻlib-boʻlib toʻlashga sotamiz. Farq miqyos va jarayonda. Mahsulot shartlariga koʻra, moliyalashtirish summasi 5 mln soʻmdan 50 mln soʻmgacha, muddati 3 oydan 18 oygacha. Sinov bosqichidagi dastlabki bitimlarda oʻrtacha summa 15–20 mln soʻm atrofida boʻldi. Bunday summada katta korporativ hujjatlar toʻplamini talab qilsangiz, rasmiylashtirish xarajati mijoz uchun ham, tashkilot uchun ham oʻzini oqlamaydi.',
          'Shuning uchun jarayonni soddalashtirdik. Shartnomalar standart va bir necha sahifadan iborat, tovarlar esa asosan oldindan kelishib olingan yetkazib beruvchilardan olinadi: tikuvchilik uchun mato va ip, duradgorlik uchun asboblar, kulolchilik uchun gil va xumdon.',
        ],
      },
      {
        type: 'qa',
        question: 'Murobahada tovarni avval tashkilot sotib olishi kerak. Kichik summalarda bu qanday ishlaydi?',
        answer: [
          'Bu bizning eng katta tashkiliy vazifamiz boʻldi. Har bir bitim boʻyicha tovarni omborga olib kelish imkonsiz. Shu sababli yetkazib beruvchilar bilan uzoq muddatli bosh shartnomalar tuzdik. Mijoz kerakli tovarni tanlaydi va uni sotib olish haqida [[vad|vaʼda]] beradi, biz yetkazib beruvchiga toʻlaymiz, tovar tashkilot nomiga rasmiylashtiriladi va topshirish-qabul dalolatnomasi tuziladi. Shundan keyingina mijoz bilan sotish shartnomasini imzolaymiz.',
          'Ayrim hollarda mijozni tovarni bizning nomimizdan qabul qilishga [[vakola|vakil]] qilamiz. Lekin bu yerda nazorat qatʼiy: naqd pul berilmaydi, toʻlov faqat yetkazib beruvchining hisobvaragʻiga oʻtkaziladi.',
        ],
      },
      {
        type: 'qa',
        question: 'Toʻlov intizomi qanday? Mikromoliyada kechikishlar koʻp boʻladi, deyishadi.',
        answer: [
          'Islom moliyasi boʻyicha portfelimiz hali juda yosh — litsenziya olganimizga bir oy ham boʻlgani yoʻq, shuning uchun bu yoʻnalishda kechikish statistikasi haqida gapirishga erta. Anʼanaviy mikromoliya boʻyicha koʻp yillik tajribamizda esa 30 kundan ortiq kechikkan toʻlovlar ulushi odatda portfelning 2–3 foizi atrofida boʻlgan. Mikromurobaha boʻyicha haqiqiy manzara bir-ikki yildan keyin aniq boʻladi.',
          'Tajriba shuni koʻrsatadiki, intizomni asosan uch narsa ushlab turadi. Birinchisi — toʻlov jadvalini mijozning daromad olish davriga moslash: mavsumiy ishlaydigan hunarmandga har oy bir xil toʻlov belgilash notoʻgʻri. Ikkinchisi — kichik guruhlar: bir mahalladagi uch-besh tadbirkor bir-birini taniydi va qoʻllab-quvvatlaydi. Bu rasmiy oʻzaro kafolat emas, lekin masʼuliyatni oshiradi. Uchinchisi — narxning qatʼiyligi. Umumiy summa boshidan maʼlum va oʻzgarmaydi, mijoz qarzi oʻsib ketishidan qoʻrqmaydi.',
        ],
      },
      {
        type: 'qa',
        question: 'Agar mijoz baribir toʻlay olmasa-chi?',
        answer: [
          'Avvalo sababini aniqlaymiz. Agar mijoz kasal boʻlib qolgan, buyurtmasi bekor boʻlgan yoki boshqa jiddiy qiyinchilikka duch kelgan boʻlsa, toʻlov muddatini qayta koʻrib chiqamiz. Muhim jihat: muddat uzaytirilsa ham, qarz summasi oshirilmaydi. Bu murobahaning asosiy tamoyillaridan biri, tashkilotimizning [[shariat-kengashi|shariat kengashi]] ham buni alohida qayd etgan.',
          'Ataylab toʻlamaslik holatlari uchun shartnomada kechiktirish toʻlovi nazarda tutilgan. Bu mablagʻ tashkilot daromadiga kirmaydi va xayriya maqsadlariga yoʻnaltiriladi. Uning vazifasi daromad emas, intizom.',
        ],
      },
      {
        type: 'quote',
        text: 'Muddat uzaytirilsa ham, qarz summasi oshirilmaydi. Mijoz buni bilgani uchun bizga ishonadi.',
        cite: 'Nodira Xolmatova',
        role: 'Mikromoliya tashkiloti K ijrochi direktori',
      },
      {
        type: 'qa',
        question: 'Murojaat qilayotganlarning qancha qismi ayollar?',
        answer: [
          'Dastlabki haftalarda kelgan murojaatlarning taxminan 60 foizi ayollardan tushdi. Bu tasodif emas. Viloyatimizda uyda tikuvchilik, kashtachilik, pishiriq tayyorlash bilan shugʻullanadigan ayollar koʻp. Ularning koʻpchiligi rasmiy ish joyiga ega emas, kredit tarixi yoʻq va bankka borishga ikkilanadi. Ayrim oilalar esa foizli qarz olishni umuman istamaydi. Mikromurobaha ular uchun moliya bilan birinchi tanishuv boʻlmoqda.',
          'Ayollar bilan ishlash uchun alohida yondashuv ishlab chiqdik: ayol maslahatchilar guruhi, uyda yoki mahalla markazida uchrashuv, oddiy tilda tushuntirish. Har bir yangi mijoz bilan avval qisqa moliyaviy savodxonlik mashgʻuloti oʻtkaziladi: daromad va xarajatni qanday yozib borish, mahsulot tannarxini qanday hisoblash.',
        ],
      },
      {
        type: 'qa',
        question: 'Qarzi hasan ham taklif qilasizmi?',
        answer: [
          'Ha, lekin juda cheklangan hajmda. Qarzi hasan — foizsiz va ustamasiz qarz: mijoz qancha olgan boʻlsa, shuncha qaytaradi. Tashkilot undan daromad olmaydi, faqat rasmiylashtirish bilan bogʻliq haqiqiy xarajatlarni qoplashi mumkin. Bu sof yordam vositasi. Unda ham hujjatlashtirish bor — qaytarish jadvali yoziladi, lekin kechiktirish toʻlovi qoʻllanilmaydi.',
          'Qarzi hasan uchun alohida fond ajratilgan va u umumiy portfelning kichik qismini tashkil etadi. Undan favqulodda holatlarda foydalanish nazarda tutilgan: masalan, yongʻin yoki suv toshqini tufayli ustaxonasi zarar koʻrgan hunarmandga yoki kasallik sababli vaqtincha ishlay olmay qolgan mijozga.',
        ],
      },
      {
        type: 'qa',
        question: 'Talab katta boʻlsa, nega qarzi hasanni kengaytirmaysiz?',
        answer: [
          'Talab katta boʻlgani uchun ham ehtiyot boʻlishimiz kerak. Qarzi hasan daromad keltirmaydi, tashkilotning esa xarajatlari bor: xodimlar maoshi, ijara, axborot tizimi. Agar portfelning katta qismini daromadsiz qarz tashkil etsa, tashkilot bir necha yilda yopiladi va hech kimga yordam bera olmaydi.',
          'Qarzi hasan — yordam vositasi, biznes modeli emas. Uni barqaror kengaytirish faqat maqsadli manbalar hisobidan mumkin, masalan, xayriya fondlari yoki homiylar aynan shu maqsad uchun mablagʻ ajratsa. Bunday hamkorlar bilan muzokaralar olib boryapmiz, lekin natija haqida gapirishga hali erta.',
        ],
      },
      {
        type: 'quote',
        text: 'Portfelning katta qismini daromadsiz qarz tashkil etsa, tashkilot bir necha yilda yopiladi va hech kimga yordam bera olmaydi.',
        cite: 'Nodira Xolmatova',
        role: 'Mikromoliya tashkiloti K ijrochi direktori',
      },
      {
        type: 'qa',
        question: 'Ustama qanday belgilanadi? Mijozlar narxni qimmat deb hisoblamaydimi?',
        answer: [
          'Ustama tovar turi va muddatga bogʻliq. Biz uni bozor sharoiti, mablagʻ jalb qilish xarajatlari va kichik bitimlarga xizmat koʻrsatishning yuqori tannarxidan kelib chiqib belgilaymiz. Mikromoliyada bitta mijozga ketadigan ish vaqti yirik bankdagiga qaraganda koʻp, buni yashirib boʻlmaydi.',
          'Lekin mijozga ikki narsani aniq koʻrsatamiz: tovarning tannarxi va ustama summasi. Mijoz umumiy toʻlovni biladi va uni boshqa takliflar bilan solishtira oladi. Koʻpchilik uchun narxdan ham muhimi — hammasi oldindan maʼlum boʻlishi.',
        ],
      },
      {
        type: 'qa',
        question: 'Mablagʻni qayerdan jalb qilasiz?',
        answer: [
          'Hozircha asosan taʼsischilar kapitali va islom moliyasi tamoyillari asosida berilgan maqsadli mablagʻlar hisobidan. Mikromoliya tashkiloti sifatida biz aholidan omonat qabul qilmaymiz. Kelajakda litsenziya olgan islom banklari va oynalari bilan [[muzoraba|muzoraba]] yoki vakola asosidagi hamkorlikni koʻrib chiqyapmiz: ular mablagʻ beradi, biz mijozlar bilan ishlashni taʼminlaymiz. Bu model bizga mablagʻ manbaini kengaytiradi, bankka esa oʻzi yetib bora olmaydigan mijozlarga chiqish imkonini beradi. Dastlabki muzokaralar boshlangan.',
        ],
      },
      {
        type: 'qa',
        question: 'Mijozlar toʻlovni qanday amalga oshiradi?',
        answer: [
          'Koʻpchilik mobil ilovalar va toʻlov terminallari orqali toʻlaydi, bu xarajatlarimizni ancha kamaytirdi. Lekin keksaroq mijozlar va olis qishloqlardagi hunarmandlar hali ham naqd pulni afzal koʻradi, shuning uchun tuman markazlarida haftada bir kun qabul kuni tashkil qilamiz.',
          'Har bir toʻlovdan keyin mijozga qisqa xabar yuboriladi: qancha toʻlandi, qancha qoldi. Bu oddiy narsa, lekin ishonch uchun juda muhim. Mijoz qarzining aniq qoldigʻini koʻrib turadi va u kutilmaganda oʻzgarmasligiga amin boʻladi.',
        ],
      },
      {
        type: 'qa',
        question: 'Regulyatordan nimani kutasiz?',
        answer: [
          'Ikki narsani. Birinchisi — mikromoliya tashkilotlari uchun hisobot shakllarini moslashtirish. Hozir koʻp hisobotlarni anʼanaviy shakllarda topshiramiz, ularda «foiz daromadi» degan qatorlar bor va murobaha ustamasini qayerda koʻrsatishni har safar alohida tushuntirishga toʻgʻri keladi.',
          'Ikkinchisi — kredit byurosi maʼlumotlarida islom moliyasi bitimlarini toʻgʻri aks ettirish. Mijozning bizdagi yaxshi toʻlov tarixi keyinchalik bankka murojaat qilganida unga yordam berishi kerak.',
        ],
      },
      {
        type: 'qa',
        question: 'Hunarmand yoki ayol tadbirkorga qanday maslahat berasiz?',
        answer: [
          'Kichikdan boshlang. Birinchi bitimni ishlab chiqarishingizni haqiqatan oshiradigan narsaga sarflang — yangi tikuv mashinasi yoki xomashyo partiyasiga. Toʻlov jadvalini tuzishda daromadingiz qachon tushishini ochiq ayting. Daromad va xarajatni yozib boring, oddiy daftar ham yetarli: bunday yozuvlari bor mijozga keyingi bitimda kattaroq summa ajratish ancha oson. Eng muhimi — shartnomani tushunmaguningizcha imzolamang. Biz har bir mijozga savol berishi uchun vaqt ajratamiz, chunki shartnomani tushungan mijoz kamdan-kam hollarda muammoli mijozga aylanadi.',
        ],
      },
    ],
    sources: [{ title: 'Muomalat bilan suhbat', publisher: 'Muomalat', type: 'interview', date: '2026-09-19' }],
  },
]
