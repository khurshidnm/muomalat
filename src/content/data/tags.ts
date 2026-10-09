import type { Tag } from '../types'

/**
 * Controlled tag vocabulary. Articles reference tags by slug. `labels` gives
 * the topic name in the ru/en editions; the Cyrillic edition transliterates
 * `label`.
 */
export const tags: Tag[] = [
  { slug: 'islom-oynasi', label: 'Islom oynalari', labels: { ru: 'Исламские окна', en: 'Islamic windows' } },
  { slug: 'litsenziyalash', label: 'Litsenziyalash', labels: { ru: 'Лицензирование', en: 'Licensing' } },
  { slug: 'qonunchilik', label: 'Qonunchilik', labels: { ru: 'Законодательство', en: 'Legislation' } },
  { slug: 'regulyator', label: 'Regulyator', labels: { ru: 'Регулятор', en: 'Regulator' } },
  { slug: 'murobaha', label: 'Murobaha', labels: { ru: 'Мурабаха', en: 'Murabaha' } },
  { slug: 'ijora', label: 'Ijora', labels: { ru: 'Иджара', en: 'Ijara' } },
  { slug: 'lizing', label: 'Lizing', labels: { ru: 'Лизинг', en: 'Leasing' } },
  { slug: 'sukuk', label: 'Sukuk', labels: { ru: 'Сукук', en: 'Sukuk' } },
  { slug: 'takaful', label: 'Takaful', labels: { ru: 'Такафул', en: 'Takaful' } },
  { slug: 'mikromoliya', label: 'Mikromoliya', labels: { ru: 'Микрофинансы', en: 'Microfinance' } },
  { slug: 'kichik-biznes', label: 'Kichik biznes', labels: { ru: 'Малый бизнес', en: 'Small business' } },
  { slug: 'standartlar', label: 'Standartlar', labels: { ru: 'Стандарты', en: 'Standards' } },
  { slug: 'shariat-kengashi', label: 'Shariat kengashlari', labels: { ru: 'Шариатские советы', en: 'Sharia boards' } },
  { slug: 'kadrlar', label: 'Kadrlar va taʼlim', labels: { ru: 'Кадры и образование', en: 'Talent and education' } },
  { slug: 'investitsiyalar', label: 'Investitsiyalar', labels: { ru: 'Инвестиции', en: 'Investment' } },
  { slug: 'kapital-bozori', label: 'Kapital bozori', labels: { ru: 'Рынок капитала', en: 'Capital markets' } },
  { slug: 'bozor-korsatkichlari', label: 'Bozor koʻrsatkichlari', labels: { ru: 'Рыночные показатели', en: 'Market data' } },
  { slug: 'xalqaro-bozorlar', label: 'Xalqaro bozorlar', labels: { ru: 'Международные рынки', en: 'International markets' } },
  { slug: 'raqamli-moliya', label: 'Raqamli moliya', labels: { ru: 'Цифровые финансы', en: 'Digital finance' } },
  { slug: 'qishloq-xojaligi', label: 'Qishloq xoʻjaligi', labels: { ru: 'Сельское хозяйство', en: 'Agriculture' } },
  { slug: 'uy-joy', label: 'Uy-joy', labels: { ru: 'Жильё', en: 'Housing' } },
  { slug: 'soliq', label: 'Soliq', labels: { ru: 'Налоги', en: 'Tax' } },
  { slug: 'muomalat-klubi', label: 'Muomalat klubi', labels: { ru: 'Клуб Muomalat', en: 'Muomalat Club' } },
]
