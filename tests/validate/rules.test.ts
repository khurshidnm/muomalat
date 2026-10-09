import { describe, expect, it } from 'vitest'

import {
  checkArticle,
  checkKr,
  checkMedia,
  checkText,
  countWords,
  fixOkina,
  fixQuotes,
  fixTutuq,
  telegramCaptionLength,
  type ArticleCheckView,
  type Finding,
  type TextCheckOptions,
} from '@/content/rules'
import { labelRules, launchGate } from '@/payload/hooks/validate/globals'

/**
 * G1 (CMS-SPEC §16): every rule of §7.2 that is a pure function has one
 * passing and one failing example here. Rules that need the database (ART-19
 * to ART-22 on stored trees, ART-25, ART-26, ART-31, GL-1, INST-1, MS-1,
 * CLUB-1, HOME-1/2, SP-10) are in cms.test.ts.
 */

const demo: TextCheckOptions = { demoMode: true }
const rules = (fs: Finding[]) => fs.map((f) => `${f.rule}:${f.level}`)
const has = (fs: Finding[], rule: string, level?: Finding['level']) => fs.some((f) => f.rule === rule && (!level || f.level === level))

describe('TXT rules (checkText)', () => {
  const pass = 'Oʻzbekiston banklari 2026-yil 8-oktabrda yangi hisobot topshirdi.'
  it('a clean sentence gives nothing', () => expect(checkText(pass, 'p', demo)).toEqual([]))

  it('TXT-1: oʻ/gʻ with a wrong mark is an error with a one-click fix', () => {
    const [f] = checkText("o'zbek tili", 'p', demo).filter((x) => x.rule === 'TXT-1')
    expect(f.level).toBe('error')
    expect(f.message).toContain("o'zbek")
    expect(f.fix?.to).toBe('oʻzbek tili')
    for (const bad of ['g‘alla', 'O’zbekiston', 'o`quv', 'oʼzbek', 'gʽoya']) expect(has(checkText(bad, 'p', demo), 'TXT-1', 'error')).toBe(true)
    expect(has(checkText('oʻzbek gʻalla', 'p', demo), 'TXT-1')).toBe(false)
  })

  it('TXT-2: an apostrophe as the tutuq belgisi is a warning with a fix to ʼ (U+02BC)', () => {
    const [f] = checkText("ma'lumot", 'p', demo).filter((x) => x.rule === 'TXT-2')
    expect(f.level).toBe('warning')
    expect(f.fix?.to).toBe('maʼlumot')
    expect(has(checkText('maʻlumot', 'p', demo), 'TXT-2')).toBe(true) // ʻ after a letter other than o/g
    expect(has(checkText('maʼlumot', 'p', demo), 'TXT-2')).toBe(false)
    expect(has(checkText("ma'lumot https://x.uz", 'p', demo), 'TXT-2')).toBe(false) // a URL in the text: skipped, as before
    expect(fixTutuq("o'z ma'no")).toBe("o'z maʼno") // after o/g it is TXT-1's
  })

  it('TXT-3: banned religious terms (and editorial-rules additions) are errors', () => {
    for (const bad of ['Qurʼon oyati', 'hadis rivoyati', 'paygʻambar', 'namoz vaqti', 'masjid qurilishi', 'Alloh'])
      expect(has(checkText(bad, 'p', demo), 'TXT-3', 'error')).toBe(true)
    expect(has(checkText('Murobaha shartnomasi', 'p', demo), 'TXT-3')).toBe(false)
    const extra = { bannedTerms: [{ pattern: 'tafsir' }] }
    expect(has(checkText('tafsir kitobi', 'p', { demoMode: true, extra }), 'TXT-3', 'error')).toBe(true)
    expect(has(checkText('tafsir kitobi', 'p', demo), 'TXT-3')).toBe(false)
  })

  it('TXT-4: ruling-like words warn unless in the disclaimer form', () => {
    expect(has(checkText('Bu mahsulot halol', 'p', demo), 'TXT-4', 'warning')).toBe(true)
    expect(has(checkText('Muomalat fatvo chiqarmaydi', 'p', demo), 'TXT-4')).toBe(false)
    expect(has(checkText('bu joiz', 'p', { demoMode: true, extra: { reviewTerms: [{ pattern: 'mustahab' }] } }), 'TXT-4')).toBe(true)
    expect(has(checkText('mustahab', 'p', { demoMode: true, extra: { reviewTerms: [{ pattern: 'mustahab' }] } }), 'TXT-4')).toBe(true)
  })

  it('TXT-5: real organisation names warn in demo mode; outside it only when untagged', () => {
    expect(has(checkText('Kapitalbank islom oynasini ochdi', 'p', demo), 'TXT-5', 'warning')).toBe(true)
    expect(has(checkText('Yangi alifbo darsligi', 'p', demo), 'TXT-5')).toBe(false) // alifbo is not Alif
    const untagged = checkText('Kapitalbank islom oynasini ochdi', 'p', { demoMode: false, tagged: [] })
    expect(untagged.find((f) => f.rule === 'TXT-5')?.message).toContain('belgilab qoʻyasizmi')
    expect(has(checkText('Kapitalbank islom oynasini ochdi', 'p', { demoMode: false, tagged: ['Kapitalbank ATB'] }), 'TXT-5')).toBe(false)
    expect(has(checkText('Kapitalbank', 'p', { demoMode: false }), 'TXT-5')).toBe(false) // no tags to compare with (glossary, club)
    expect(has(checkText('Kapitalbank', 'p', { demoMode: true, realOrgs: false }), 'TXT-5')).toBe(false) // an institution's own name
    expect(has(checkText('Sharq Lizing', 'p', { demoMode: true, extra: { realOrgNames: [{ name: 'sharq lizing' }] } }), 'TXT-5')).toBe(true)
  })

  it('TXT-6: double space and a space before punctuation warn', () => {
    expect(has(checkText('ikki  boʻsh joy', 'p', demo), 'TXT-6', 'warning')).toBe(true)
    expect(has(checkText('vergul , oldidan', 'p', demo), 'TXT-6', 'warning')).toBe(true)
    expect(has(checkText('narx 3 .', 'p', demo), 'TXT-6')).toBe(false)
    expect(has(checkText('toza gap, toza gap.', 'p', demo), 'TXT-6')).toBe(false)
  })

  it('TXT-7: straight double quotes warn with a fix to «…»', () => {
    const [f] = checkText('"Muomalat" nashri', 'p', demo).filter((x) => x.rule === 'TXT-7')
    expect(f.level).toBe('warning')
    expect(f.fix?.to).toBe('«Muomalat» nashri')
    expect(fixQuotes('a "b" "c')).toBe('a «b» "c')
    expect(has(checkText('«Muomalat» nashri', 'p', demo), 'TXT-7')).toBe(false)
  })

  it('TXT-8: Russian month spellings are errors', () => {
    expect(has(checkText('8-oktyabr', 'p', demo), 'TXT-8', 'error')).toBe(true)
    expect(has(checkText("yanvar'da", 'p', demo), 'TXT-8', 'error')).toBe(true)
    expect(has(checkText('8-oktabr', 'p', demo), 'TXT-8')).toBe(false)
  })

  it('TXT-9: year and day without a hyphen warn', () => {
    expect(has(checkText('2026 yil', 'p', demo), 'TXT-9', 'warning')).toBe(true)
    expect(has(checkText('8 oktabr', 'p', demo), 'TXT-9', 'warning')).toBe(true)
    expect(has(checkText('2026-yil 8-oktabr', 'p', demo), 'TXT-9')).toBe(false)
  })

  it('TXT-10: house spellings from editorial-rules warn on whole words', () => {
    const extra = { houseSpellings: [{ wrong: 'som', right: 'soʻm' }] }
    expect(checkText('100 som', 'p', { demoMode: true, extra }).find((f) => f.rule === 'TXT-10')?.message).toContain('soʻm')
    expect(has(checkText('100 soʻm, somsa', 'p', { demoMode: true, extra }), 'TXT-10')).toBe(false)
  })

  it('TXT-11: Arabic script at the level the caller asks for', () => {
    expect(has(checkText('مرابحة', 'p', { demoMode: true, arabic: 'error' }), 'TXT-11', 'error')).toBe(true)
    expect(has(checkText('مرابحة', 'p', { demoMode: true, arabic: 'warning' }), 'TXT-11', 'warning')).toBe(true)
    expect(has(checkText('murobaha', 'p', { demoMode: true, arabic: 'error' }), 'TXT-11')).toBe(false)
  })

  it('the fixes', () => {
    expect(fixOkina("O'zbekiston g'alla o‘quv")).toBe('Oʻzbekiston gʻalla oʻquv')
  })
})

describe('KR rules (checkKr)', () => {
  it('KR-1: ʻ/ʼ left in Cyrillic', () => {
    expect(rules(checkKr('ўзбекʻ', 'x'))).toEqual(['KR-1:warning'])
    expect(checkKr('ўзбек', 'x')).toEqual([])
  })
  it('KR-2: a Latin word in Cyrillic text; acronyms, the brand, URLs and {en:} are fine', () => {
    expect(rules(checkKr('банк bank', 'x'))).toEqual(['KR-2:warning'])
    expect(checkKr('AAOIFI стандарти, Muomalat, muomalat.uz, {en:Islamic window}, [ҳавола](/lugat/murobaha)', 'x')).toEqual([])
  })
  it('KR-3: loanword spellings', () => {
    expect(rules(checkKr('тенденсия', 'x'))).toEqual(['KR-3:warning'])
    expect(checkKr('тенденция', 'x')).toEqual([])
  })
})

const NOW = Date.parse('2026-10-09T12:00:00+05:00')
const good: ArticleCheckView = {
  slug: 'yangi-talablar',
  rubric: 'yangiliklar',
  title: 'Regulyator yangi talablarni eʼlon qildi',
  lead: 'Regulyator islom oynalari uchun hisobot shaklini oʻzgartirdi.',
  body: [{ type: 'p', text: 'Yangi talablar kuchga kiradi.' }],
  authors: ['1'],
  tags: ['1'],
  sources: [{ title: 'Xabar', publisher: 'Regulyator' }],
  image: { src: '/x.webp', width: 1600, height: 900 },
  meta: { title: 'Yangi talablar', description: 'Hisobot shakli oʻzgardi.' },
}
const art = (over: Partial<ArticleCheckView> = {}, gate: 'draft' | 'publish' = 'publish') => checkArticle({ ...good, ...over }, { scope: 'all', now: NOW, gate })

describe('ART rules (checkArticle)', () => {
  it('a good article gives nothing', () => expect(art()).toEqual([]))

  it('ART-1: slug regex', () => {
    expect(has(art({ slug: 'Yangi_Talab' }), 'ART-1', 'error')).toBe(true)
    expect(has(art({ slug: 'yangi-talab-2026' }), 'ART-1')).toBe(false)
  })
  it('ART-2: uz title present; warn above titleWarn, error above titleMax (editorial-rules limits)', () => {
    expect(has(art({ title: '' }), 'ART-2', 'error')).toBe(true)
    expect(has(art({ title: 'a'.repeat(81) }), 'ART-2', 'warning')).toBe(true)
    expect(has(art({ title: 'a'.repeat(141) }), 'ART-2', 'error')).toBe(true)
    expect(has(checkArticle({ ...good, title: 'a'.repeat(81) }, { scope: 'all', now: NOW, limits: { titleWarn: 90 } }), 'ART-2')).toBe(false)
  })
  it('ART-3: uz lead present; warn above 300, error above 500', () => {
    expect(has(art({ lead: ' ' }), 'ART-3', 'error')).toBe(true)
    expect(has(art({ lead: 'a'.repeat(301) }), 'ART-3', 'warning')).toBe(true)
    expect(has(art({ lead: 'a'.repeat(501) }), 'ART-3', 'error')).toBe(true)
  })
  it('ART-4: at least one author', () => {
    expect(has(art({ authors: [] }), 'ART-4', 'error')).toBe(true)
  })
  it('ART-5: at least one source', () => {
    expect(has(art({ sources: [] }), 'ART-5', 'error')).toBe(true)
  })
  it('ART-6: an interview needs the interviewee and a qa block', () => {
    expect(has(art({ rubric: 'intervyu' }), 'ART-6', 'error')).toBe(true)
    expect(has(art({ rubric: 'intervyu', interviewee: { name: 'Ali Valiyev' }, body: [{ type: 'qa', question: 'Savol?', answer: ['Javob.'] }] }), 'ART-6')).toBe(false)
  })
  it('ART-7: an analysis without a table or chart warns', () => {
    expect(has(art({ rubric: 'tahlil' }), 'ART-7', 'warning')).toBe(true)
    const table = { type: 'table' as const, caption: 'Jadval', columns: [{ label: 'A' }], rows: [['x']], source: 'Manba' }
    expect(has(art({ rubric: 'tahlil', body: [table] }), 'ART-7')).toBe(false)
  })
  it('ART-8: table rows and line series must match', () => {
    const table = { type: 'table' as const, caption: 'Jadval', columns: [{ label: 'A' }, { label: 'B' }], rows: [['x', 1], ['y']], source: 'Manba' }
    expect(has(art({ body: [table] }), 'ART-8', 'error')).toBe(true)
    expect(has(art({ body: [{ ...table, rows: [['x', 1]] }] }), 'ART-8')).toBe(false)
    const line = { kind: 'line' as const, title: 'T', unit: '%', source: 'M', xLabels: ['2025', '2026'], series: [{ name: 'S', values: [1] }] }
    expect(has(art({ body: [{ type: 'chart', chart: line }] }), 'ART-8', 'error')).toBe(true)
  })
  it('ART-9: chart and table need a source', () => {
    const table = { type: 'table' as const, caption: 'Jadval', columns: [{ label: 'A' }], rows: [['x']] }
    expect(has(art({ body: [table] }), 'ART-9', 'error')).toBe(true)
    const bar = { kind: 'bar' as const, title: 'T', unit: '%', data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] }
    expect(has(art({ body: [{ type: 'chart', chart: bar }] }), 'ART-9', 'error')).toBe(true)
    expect(has(art({ body: [{ type: 'chart', chart: { ...bar, source: 'Regulyator' } }] }), 'ART-9')).toBe(false)
  })
  it('ART-10: chart data parses, at least two points', () => {
    const bar = { kind: 'bar' as const, title: 'T', unit: '%', source: 'M', data: [{ label: 'a', value: 1 }] }
    expect(has(art({ body: [{ type: 'chart', chart: bar }] }), 'ART-10', 'error')).toBe(true)
    expect(has(art({ body: [{ type: 'chart', chart: { ...bar, data: [...bar.data, { label: 'b', value: NaN }] } }] }), 'ART-10', 'error')).toBe(true)
    expect(has(art({ body: [{ type: 'chart', chart: { ...bar, data: [...bar.data, { label: 'b', value: 2 }] } }] }), 'ART-10')).toBe(false)
  })
  it('ART-16: no hero, a small hero or an odd ratio warns', () => {
    expect(has(art({ image: null }), 'ART-16', 'warning')).toBe(true)
    expect(has(art({ image: { src: 'x', width: 200, height: 200 } }), 'ART-16', 'warning')).toBe(true)
    expect(has(art({ image: { src: 'x', width: 1200, height: 800 } }), 'ART-16', 'warning')).toBe(true)
    expect(has(art({ image: { src: 'x', width: 1200, height: 900 } }), 'ART-16')).toBe(false)
  })
  it('ART-17: no tags warns', () => {
    expect(has(art({ tags: [] }), 'ART-17', 'warning')).toBe(true)
  })
  it('ART-18: SEO title or description missing or too long warns', () => {
    expect(has(art({ meta: {} }), 'ART-18', 'warning')).toBe(true)
    expect(has(art({ meta: { title: 'a'.repeat(71), description: 'b' } }), 'ART-18', 'warning')).toBe(true)
    expect(has(art({ meta: { title: 'a', description: 'b'.repeat(161) } }), 'ART-18', 'warning')).toBe(true)
  })
  it('ART-23: an active embargo blocks publishing only', () => {
    const until = new Date(NOW + 3_600_000).toISOString()
    expect(has(art({ embargo: { until } }), 'ART-23', 'error')).toBe(true)
    expect(has(art({ embargo: { indefinite: true } }), 'ART-23', 'error')).toBe(true)
    expect(has(art({ embargo: { until } }, 'draft'), 'ART-23')).toBe(false)
    expect(has(art({ embargo: { until: new Date(NOW - 1000).toISOString() } }), 'ART-23')).toBe(false)
  })
  it('ART-24: legal review required', () => {
    expect(has(art({ needsLegal: 'required' }), 'ART-24', 'error')).toBe(true)
    expect(has(art({ needsLegal: 'complete' }), 'ART-24')).toBe(false)
  })
  it('ART-28: dates in order and not in the future', () => {
    expect(has(art({ publishedAt: new Date(NOW + 86_400_000).toISOString() }), 'ART-28', 'error')).toBe(true)
    expect(has(art({ publishedAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-07T10:00:00Z' }), 'ART-28', 'error')).toBe(true)
    expect(has(art({ publishedAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-09T05:00:00Z' }), 'ART-28')).toBe(false)
  })
  it('ART-30: an urgent story over 400 words', () => {
    expect(has(art({ urgent: true, bodyWords: 401 }), 'ART-30', 'error')).toBe(true)
    expect(has(art({ urgent: true, bodyWords: 400 }), 'ART-30')).toBe(false)
    expect(countWords(['Bir ikki [uch toʻrt](/x) [[murobaha|besh]]'])).toBe(5)
  })
  it('the legacy scope runs exactly the script rules', () => {
    const legacy = checkArticle({ ...good, title: 'a'.repeat(200), tags: [], publishedAt: '2026-10-08T10:00:00+05:00' }, { scope: 'legacy', now: NOW })
    expect(legacy).toEqual([])
    expect(rules(checkArticle({ ...good, publishedAt: '2026-10-08T10:00:00Z' }, { scope: 'legacy', now: NOW }))).toEqual(['ART-28:error'])
  })
})

describe('image rules (checkMedia)', () => {
  const ok = { alt: 'Bank binosi', credit: 'Foto: Muomalat', rightsCategory: 'staff' }
  const ctx = { now: NOW, sponsoredStory: false, label: 'Rasm' }
  it('a complete image gives nothing', () => expect(checkMedia(ok, 'image', ctx)).toEqual([]))
  it('ART-13: uz alt unless decorative', () => {
    expect(rules(checkMedia({ ...ok, alt: '' }, 'image', ctx))).toEqual(['ART-13:error'])
    expect(checkMedia({ ...ok, alt: '', decorative: true }, 'image', ctx)).toEqual([])
  })
  it('ART-14: credit, rights category, licence, usable-until date', () => {
    expect(rules(checkMedia({ ...ok, credit: '' }, 'image', ctx))).toEqual(['ART-14:error'])
    expect(rules(checkMedia({ ...ok, rightsCategory: 'unknown' }, 'image', ctx))).toEqual(['ART-14:error'])
    expect(rules(checkMedia({ ...ok, rightsCategory: 'creative_commons' }, 'image', ctx))).toEqual(['ART-14:error'])
    expect(rules(checkMedia({ ...ok, usableUntil: '2026-10-01T00:00:00Z' }, 'image', ctx))).toEqual(['ART-14:error'])
    expect(checkMedia({ ...ok, usableUntil: '2027-01-01T00:00:00Z' }, 'image', ctx)).toEqual([])
  })
  it('ART-15: a sponsored-only image in an editorial story', () => {
    expect(rules(checkMedia({ ...ok, sponsoredOnly: true }, 'image', ctx))).toEqual(['ART-15:error'])
    expect(checkMedia({ ...ok, sponsoredOnly: true }, 'image', { ...ctx, sponsoredStory: true })).toEqual([])
  })
})

describe('ART-29, SET-1, SP-7', () => {
  it('ART-29: the caption is counted without tags, entities decoded', () => {
    expect(telegramCaptionLength('<b>Sarlavha</b> &amp; <a href="https://x">havola</a>')).toBe('Sarlavha & havola'.length)
  })
  it('SET-1: the demo notice cannot go off while a legal line is a placeholder', () => {
    const legal = Object.fromEntries(['registrationNumber', 'registrationDate', 'registrar', 'founder', 'editorInChief', 'address', 'postalIndex', 'email', 'phone', 'ageMark'].map((k) => [k, { value: 'x', placeholder: false }]))
    expect(launchGate({ demo: { noticeEnabled: false }, legal })).toEqual([])
    expect(rules(launchGate({ demo: { noticeEnabled: false }, legal: { ...legal, founder: { placeholder: true } } }))).toEqual(['SET-1:error'])
    expect(launchGate({ demo: { noticeEnabled: true }, legal: {} })).toEqual([])
  })
  it('SP-7: the labels name the advertisement in each language', () => {
    expect(labelRules({ sponsored: 'Reklama · Hamkorlik materiali', advert: 'Reklama' }, 'uz')).toEqual([])
    expect(rules(labelRules({ sponsored: 'Hamkorlik materiali' }, 'uz'))).toEqual(['SP-7:error'])
    expect(rules(labelRules({ sponsored: { uz: 'Reklama', ru: 'Партнёрский материал', en: 'Advertisement' } }, 'all'))).toEqual(['SP-7:error'])
  })
})
