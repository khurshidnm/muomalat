import type { Rubric, RubricSlug } from '../types'

/**
 * The five rubrics. This is the single source for rubric names and
 * descriptions: src/content/index.ts serves them (getRubrics / getRubric) and
 * the interface messages (commonMessages.rubrics) are built from them, so a CMS
 * can replace this file without touching components.
 */
export const rubrics: Rubric[] = [
  {
    slug: 'yangiliklar',
    order: 1,
    name: 'Yangiliklar',
    description: 'Bozor, regulyator va kompaniyalar haqidagi tezkor xabarlar.',
    translations: {
      ru: { name: 'Новости', description: 'Оперативные сообщения о рынке, регуляторе и компаниях.' },
      en: { name: 'News', description: 'Fast reporting on the market, the regulator and companies.' },
    },
  },
  {
    slug: 'tahlil',
    order: 2,
    name: 'Tahlil',
    description: 'Raqamlar, hujjatlar va bozor tendensiyalarining chuqur tahlili.',
    translations: {
      ru: { name: 'Аналитика', description: 'Глубокий разбор цифр, документов и рыночных тенденций.' },
      en: { name: 'Analysis', description: 'In-depth reading of numbers, documents and market trends.' },
    },
  },
  {
    slug: 'intervyu',
    order: 3,
    name: 'Intervyu',
    description: 'Bankirlar, tadbirkorlar va ekspertlar bilan suhbatlar.',
    translations: {
      ru: { name: 'Интервью', description: 'Беседы с банкирами, предпринимателями и экспертами.' },
      en: { name: 'Interviews', description: 'Conversations with bankers, entrepreneurs and experts.' },
    },
  },
  {
    slug: 'izoh',
    order: 4,
    name: 'Izoh',
    description: 'Murakkab mavzular sodda tilda: islom moliyasi qanday ishlaydi.',
    translations: {
      ru: { name: 'Разъяснения', description: 'Сложные темы простым языком: как работают исламские финансы.' },
      en: { name: 'Explainers', description: 'Complex topics in plain language: how Islamic finance works.' },
    },
  },
  {
    slug: 'dunyo',
    order: 5,
    name: 'Dunyo',
    description: 'Xalqaro islom moliyasi bozorlari va ularning Oʻzbekiston uchun ahamiyati.',
    translations: {
      ru: { name: 'Мир', description: 'Международные рынки исламских финансов и их значение для Узбекистана.' },
      en: { name: 'World', description: 'Global Islamic finance markets and what they mean for Uzbekistan.' },
    },
  },
]

/** Rubric names and descriptions in one language (Uzbek Latin source, or a translation). */
export function rubricText(lang: 'uz' | 'ru' | 'en'): Record<RubricSlug, { name: string; description: string }> {
  return Object.fromEntries(
    rubrics.map((r) => {
      const tr = lang === 'uz' ? undefined : r.translations?.[lang]
      return [r.slug, { name: tr?.name ?? r.name, description: tr?.description ?? r.description }]
    }),
  ) as Record<RubricSlug, { name: string; description: string }>
}
