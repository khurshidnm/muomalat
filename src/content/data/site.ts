/**
 * Site-wide constants. Values in `legal` are placeholders: every registered
 * Uzbek outlet must publish them, and the real values come from the
 * registration certificate. They render with a visible placeholder style.
 */
export const site = {
  name: 'Muomalat',
  domain: 'muomalat.uz',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muomalat.uz',
  telegram: {
    handle: '@muomalatuz',
    url: 'https://t.me/muomalatuz',
  },
  email: 'info@muomalat.uz',
  foundedYear: 2026,
  legal: {
    registrationNumber: { value: '№ 0000', placeholder: true },
    registrationDate: { value: 'KK.OO.YYYY', placeholder: true },
    registrar: { value: 'Ommaviy kommunikatsiyalar sohasidagi vakolatli organ', placeholder: true },
    founder: { value: '«Muassis nomi» MChJ', placeholder: true },
    editorInChief: { value: 'Familiya Ism Sharif', placeholder: true },
    address: { value: '100000, Toshkent sh., tuman, koʻcha, uy', placeholder: true },
    email: { value: 'info@muomalat.uz', placeholder: true },
    phone: { value: '+998 00 000-00-00', placeholder: true },
    ageMark: { value: '16+', placeholder: true },
  },
} as const

export type LegalField = { value: string; placeholder: boolean }
