import { createLocalReq, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { checkHandler } from '@/payload/endpoints/check'
import type { StoredChecks } from '@/payload/hooks/validate/shared'
import { staff } from '../helpers/payload'
import { isolatedPayload as testPayload } from './isolate'
import { block, draft, fixtures, goodArticle, link, list, media, p, publish, root, run, text } from './fixtures'

/**
 * The validation concern inside Payload (CMS-SPEC §7.3, acceptance group G):
 * errors block publishing at the right field, warnings are stored with the
 * version and never block, drafts save with their findings, and rich text
 * the editor cannot load is refused on every save.
 */

type Doc = Record<string, unknown>

const payload = () => testPayload()

/** A glossary term with every uz field a publish needs. */
const glossary = (slug: string) => ({
  term: slug,
  slug: `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  category: 'shartnoma',
  short: 'Qisqa taʼrif.',
  definition: root(p('Taʼrif.')),
  origin: root(p('Kelib chiqishi.')),
  practice: root(p('Amaliyot.')),
})

/** The rejection of a promise as `{ path, message }[]` (empty when it resolved). */
async function errorsOf(promise: Promise<unknown>): Promise<{ path: string; message: string }[]> {
  try {
    await promise
    return []
  } catch (e) {
    const data = (e as { data?: { errors?: { path: string; message: string }[] } }).data
    if (!data?.errors) throw e
    return data.errors
  }
}

const checksOf = async (id: number): Promise<StoredChecks> => {
  const doc = (await (await payload()).findByID({ collection: 'articles', id, draft: true, depth: 0, overrideAccess: true })) as unknown as Doc
  return doc.validationWarnings as StoredChecks
}
const rulesOf = (c: StoredChecks, level?: 'error' | 'warning') => c.findings.filter((f) => !level || f.level === level).map((f) => f.rule)

/** POST /api/articles/:id/check as a staff member. */
async function callCheck(id: number, body: Record<string, unknown>, role: 'editor' | 'reporter' = 'editor') {
  const p = await payload()
  const user = await staff(role)
  const req = (await createLocalReq({ user: { ...user, collection: 'users' } as never }, p)) as PayloadRequest
  req.routeParams = { id: String(id) }
  req.data = body
  const res = await checkHandler(req)
  return { status: res.status, json: (await res.json()) as { checks?: StoredChecks; message?: string; applied?: unknown[] } }
}

beforeAll(async () => {
  await fixtures()
})
afterAll(async () => (await payload()).destroy())

describe('drafts', () => {
  it('an incomplete draft saves, with its findings stored', async () => {
    const id = await draft({ title: 'Qoralama' })
    const c = await checksOf(id)
    expect(c.gate).toBe('draft')
    expect(c.errors).toBeGreaterThan(0)
    expect(rulesOf(c, 'error')).toEqual(expect.arrayContaining(['ART-3', 'ART-4', 'ART-5', 'REQ']))
  })

  it('submit (draft → in_edit) needs only title, lead, rubric, an author and a source', async () => {
    const b = await fixtures()
    const id = await draft({ title: 'Faqat sarlavha', workflowStatus: 'draft' })
    const errors = await errorsOf((await payload()).update({ collection: 'articles', id, data: { workflowStatus: 'in_edit' }, draft: true, overrideAccess: true }))
    expect(errors.map((e) => e.path).sort()).toEqual(['authors', 'lead', 'rubric', 'sources'])
    // A missing hero image or a long title does not stop the submit.
    const ok = await (await payload()).update({
      collection: 'articles',
      id,
      data: { workflowStatus: 'in_edit', title: 'a'.repeat(150), lead: 'Lid.', rubric: b.rubric, authors: [b.author], sources: [{ title: 'S', publisher: 'P' }] },
      draft: true,
      overrideAccess: true,
    })
    expect((ok as unknown as Doc).workflowStatus).toBe('in_edit')
  })

  it('approve (→ ready) is blocked by every error', async () => {
    const id = await draft(await goodArticle({ title: 'a'.repeat(150), workflowStatus: 'in_edit' }))
    const errors = await errorsOf((await payload()).update({ collection: 'articles', id, data: { workflowStatus: 'ready' }, draft: true, overrideAccess: true }))
    expect(errors.map((e) => e.path)).toEqual(['title'])
  })
})

describe('G3: wrong oʻ mark', () => {
  it('blocks publishing with an error on the body; the one-click fix writes oʻz', async () => {
    const id = await draft(await goodArticle({ body: root(p('Birinchi xatboshi.'), p("Bu o'z hisobidan moliyalashtiriladi.")) }))
    const errors = await errorsOf(publish(id))
    expect(errors).toHaveLength(1)
    expect(errors[0].path).toBe('body')
    expect(errors[0].message).toContain('2-xatboshi')
    expect(errors[0].message).toContain('ʻ (U+02BB)')

    const stored = await checksOf(id)
    const finding = stored.findings.find((f) => f.rule === 'TXT-1')!
    expect(finding).toMatchObject({ level: 'error', field: 'body', location: 'Matn, 2-xatboshi', fixable: true })
    const res = await callCheck(id, { fix: [finding.key] })
    expect(res.status).toBe(200)
    const doc = (await (await payload()).findByID({ collection: 'articles', id, draft: true, depth: 0, overrideAccess: true })) as unknown as Doc
    expect(JSON.stringify(doc.body)).toContain('Bu oʻz hisobidan')
    expect(res.json.checks?.fixes?.[0]).toMatchObject({ rule: 'TXT-1', field: 'body' })
    await expect(publish(id)).resolves.toMatchObject({ _status: 'published' })
  })

  it('fixes plain fields too (TXT-7 on the title)', async () => {
    const id = await draft(await goodArticle({ title: 'Regulyator "yangi" talablar haqida' }))
    const key = (await checksOf(id)).findings.find((f) => f.rule === 'TXT-7')!.key
    await callCheck(id, { fix: [key] })
    const doc = (await (await payload()).findByID({ collection: 'articles', id, draft: true, depth: 0, overrideAccess: true })) as unknown as Doc
    expect(doc.title).toBe('Regulyator «yangi» talablar haqida')
  })
})

describe('G4: banned religious terms block publishing in any collection', () => {
  it('articles', async () => {
    const id = await draft(await goodArticle({ lead: 'Maqolada hadis keltirilgan.' }))
    expect((await errorsOf(publish(id))).map((e) => e.path)).toEqual(['lead'])
  })
  it('glossary terms, institutions, tags, media and globals', async () => {
    const pl = await payload()
    const errs = await Promise.all([
      errorsOf(pl.create({ collection: 'glossary-terms', data: { ...glossary('test'), short: 'Namoz vaqtida', _status: 'published' } as never, overrideAccess: true })),
      errorsOf(pl.create({ collection: 'institutions', data: { name: 'Bank A', type: 'bank', city: 'Toshkent', status: 'applied', statusDate: '2026-01-01', note: 'Masjid yonida', _status: 'published' } as never, overrideAccess: true })),
      errorsOf(pl.create({ collection: 'tags', data: { label: `Duo ${run}`, _status: 'published' } as never, overrideAccess: true })),
      errorsOf(media({ caption: 'Qurʼon nusxasi' })),
      errorsOf(pl.updateGlobal({ slug: 'home-page', data: { breaking: { enabled: true, text: 'Imom maʼruzasi' }, _status: 'published' } as never, overrideAccess: true })),
    ])
    expect(errs.map((e) => e.map((x) => x.path))).toEqual([['short'], ['note'], ['label'], ['caption'], ['breaking.text']])
    // As a draft each of them saves.
    await expect(pl.create({ collection: 'tags', data: { label: `Duo ${run}`, _status: 'draft' } as never, draft: true, overrideAccess: true })).resolves.toBeTruthy()
  })
})

describe('G5: image alt and rights', () => {
  for (const [name, data] of [
    ['no uz alt', { alt: '' }],
    ['rights unknown', { rightsCategory: 'unknown' }],
    ['expired', { usableUntil: '2026-01-01T00:00:00.000Z' }],
  ] as const) {
    it(`a figure whose media has ${name} blocks publishing`, async () => {
      const m = await media(data)
      const id = await draft(await goodArticle({ body: root(p('Matn.'), block('figure', { image: m })) }))
      const errors = await errorsOf(publish(id))
      expect(errors.map((e) => e.path)).toEqual(['body'])
      expect(errors[0].message).toMatch(/ART|alt|huquq|muddati/)
    })
  }
  it('a decorative image needs no alt; a sponsored-only image cannot illustrate an editorial story', async () => {
    const decorative = await media({ alt: '', decorative: true })
    const ok = await draft(await goodArticle({ body: root(p('Matn.'), block('figure', { image: decorative })) }))
    await expect(publish(ok)).resolves.toBeTruthy()
    const ad = await media({ sponsoredOnly: true })
    const bad = await draft(await goodArticle({ image: ad }))
    expect((await errorsOf(publish(bad))).map((e) => e.path)).toEqual(['image'])
  })
})

describe('G6: charts and tables', () => {
  const table = (over: Record<string, unknown>) => block('table', { caption: 'Aktivlar', columns: [{ label: 'Bank' }, { label: 'Aktiv', align: 'right' }], data: 'A;12\nB;15', source: 'Regulyator', ...over })
  it('a table without a source blocks publishing', async () => {
    const id = await draft(await goodArticle({ body: root(table({ source: '' })) }))
    const errors = await errorsOf(publish(id))
    expect(errors[0]).toMatchObject({ path: 'body' })
    expect(errors[0].message).toContain('manba')
  })
  it('a chart without a source blocks publishing', async () => {
    const id = await draft(await goodArticle({ body: root(block('chart', { kind: 'bar', title: 'Ulush', unit: '%', data: 'A;4,5\nB;5', source: '' })) }))
    expect((await errorsOf(publish(id)))[0].message).toContain('manba')
  })
  it('table rows of the wrong length block publishing', async () => {
    const id = await draft(await goodArticle({ body: root(table({ data: 'A;12\nB' })) }))
    expect((await errorsOf(publish(id)))[0].message).toContain('2-qatorida 1 ta katak')
  })
  it('a chart that does not parse, or has one point, blocks publishing', async () => {
    const one = await draft(await goodArticle({ body: root(block('chart', { kind: 'bar', title: 'Ulush', unit: '%', data: 'A;4,5', source: 'M' })) }))
    expect((await errorsOf(publish(one)))[0].message).toContain('kamida ikkita')
    const nan = await draft(await goodArticle({ body: root(block('chart', { kind: 'line', title: 'Oʻsish', unit: '%', data: 'Davr;A\n2025;x\n2026;2', source: 'M' })) }))
    expect((await errorsOf(publish(nan)))[0].message).toContain('raqam boʻlmagan')
  })
  it('a correct table and chart publish', async () => {
    const id = await draft(await goodArticle({ body: root(table({}), block('chart', { kind: 'bar', title: 'Ulush', unit: '%', data: 'A;4,5\nB;5;*', source: 'M' })) }))
    await expect(publish(id)).resolves.toBeTruthy()
  })
})

describe('G7: real organisation names', () => {
  it('demo mode: a warning; demo off and untagged: the "tag it?" warning; tagged: nothing', async () => {
    const pl = await payload()
    const id = await draft(await goodArticle({ lead: 'Kapitalbank islom oynasini ochdi.' }))
    await publish(id)
    let c = await checksOf(id)
    expect(c.findings.find((f) => f.rule === 'TXT-5')?.message).toContain('demo rejimida')

    const legal = Object.fromEntries(['registrationNumber', 'registrationDate', 'registrar', 'founder', 'editorInChief', 'address', 'postalIndex', 'email', 'phone', 'ageMark'].map((k) => [k, { placeholder: false }]))
    await pl.updateGlobal({ slug: 'site-settings', data: { legal, demo: { noticeEnabled: false } } as never, overrideAccess: true })
    try {
      await pl.update({ collection: 'articles', id, data: { _status: 'draft' }, draft: true, overrideAccess: true })
      c = await checksOf(id)
      expect(c.findings.find((f) => f.rule === 'TXT-5')?.message).toContain('belgilab qoʻyasizmi')
      const inst = await pl.create({ collection: 'institutions', data: { name: 'Kapitalbank ATB', type: 'bank', city: 'Toshkent', status: 'granted', statusDate: '2026-01-01', statusSource: 'https://example.uz', _status: 'published' } as never, overrideAccess: true })
      await pl.update({ collection: 'articles', id, data: { about: inst.id, _status: 'draft' }, draft: true, overrideAccess: true })
      expect(rulesOf(await checksOf(id))).not.toContain('TXT-5')
    } finally {
      await pl.updateGlobal({ slug: 'site-settings', data: { demo: { noticeEnabled: true } } as never, overrideAccess: true })
    }
  })
})

describe('G8: warnings', () => {
  it('never block publishing and are stored with the version; acknowledgements carry over', async () => {
    const pl = await payload()
    const id = await draft(await goodArticle({ title: 'Regulyator islom oynalari uchun yangi hisobot shaklini va choraklik talablarni eʼlon qildi', tags: [] }))
    const doc = (await publish(id)) as unknown as Doc
    expect(doc._status).toBe('published')
    const live = doc.validationWarnings as StoredChecks
    expect(live.gate).toBe('publish')
    expect(rulesOf(live, 'warning')).toEqual(expect.arrayContaining(['ART-2', 'ART-17']))
    const { docs } = await pl.findVersions({ collection: 'articles', where: { parent: { equals: id } }, sort: '-createdAt', limit: 1, overrideAccess: true })
    expect(((docs[0].version as unknown as Doc).validationWarnings as StoredChecks).warnings).toBe(live.warnings)

    const tags = live.findings.find((f) => f.rule === 'ART-17')!
    const res = await callCheck(id, { acknowledge: [tags.key] })
    expect(res.json.checks?.findings.find((f) => f.key === tags.key)?.acknowledged?.byName).toBe('Test editor')
    await pl.update({ collection: 'articles', id, data: { lead: 'Yangilangan lid.', _status: 'draft' }, draft: true, overrideAccess: true })
    expect((await checksOf(id)).findings.find((f) => f.key === tags.key)?.acknowledged).toBeTruthy()
    // On-demand check without saving shows the acknowledgement too.
    const fresh = await callCheck(id, {})
    expect(fresh.json.checks?.findings.find((f) => f.key === tags.key)?.acknowledged).toBeTruthy()
  })
  it('the check endpoint needs a user', async () => {
    const pl = await payload()
    const req = (await createLocalReq({}, pl)) as PayloadRequest
    req.routeParams = { id: '1' }
    expect((await checkHandler(req)).status).toBe(401)
  })
})

describe('G9: launch gate (SET-1)', () => {
  it('turning off the demo notice while a legal field is a placeholder fails', async () => {
    const pl = await payload()
    const errors = await errorsOf(pl.updateGlobal({ slug: 'site-settings', data: { legal: { founder: { placeholder: true } }, demo: { noticeEnabled: false } } as never, overrideAccess: true }))
    expect(errors.map((e) => e.path)).toEqual(['demo.noticeEnabled'])
    expect(errors[0].message).toContain('founder')
  })
  it('SP-7: the sponsored label must say Reklama', async () => {
    const pl = await payload()
    expect((await errorsOf(pl.updateGlobal({ slug: 'site-settings', data: { labels: { sponsored: 'Hamkorlik materiali' } } as never, overrideAccess: true }))).map((e) => e.path)).toEqual(['labels.sponsored'])
    expect((await errorsOf(pl.updateGlobal({ slug: 'site-settings', locale: 'ru', data: { labels: { sponsored: 'Партнёрский материал' } } as never, overrideAccess: true }))).map((e) => e.path)).toEqual(['labels.sponsored'])
  })
})

describe('G10: slug change after publication', () => {
  it('records the old address and creates a permanent redirect', async () => {
    const pl = await payload()
    const id = await draft(await goodArticle({ slug: `eski-manzil-${Date.now()}` }))
    const first = (await publish(id)) as unknown as Doc
    const old = first.slug as string
    await pl.update({ collection: 'articles', id, data: { slug: `${old}-yangi`, _status: 'draft' }, draft: true, overrideAccess: true })
    expect((await pl.count({ collection: 'redirects', where: { from: { equals: `/yangiliklar/${old}` } }, overrideAccess: true })).totalDocs).toBe(0) // a draft changes nothing
    const doc = (await publish(id)) as unknown as Doc
    expect(doc.slug).toBe(`${old}-yangi`)
    expect(doc.slugHistory).toEqual([expect.objectContaining({ slug: old, rubric: 'yangiliklar' })])
    const { docs } = await pl.find({ collection: 'redirects', where: { from: { like: old } }, overrideAccess: true, depth: 0 })
    expect(docs.map((d) => (d as unknown as Doc).from).sort()).toEqual([`/en/yangiliklar/${old}`, `/kr/yangiliklar/${old}`, `/ru/yangiliklar/${old}`, `/yangiliklar/${old}`])
    expect(docs[0]).toMatchObject({ type: '301', to: { type: 'reference', reference: { relationTo: 'articles', value: id } } })
    // Publishing again creates no duplicates.
    await publish(id)
    expect((await pl.count({ collection: 'redirects', where: { from: { like: old } }, overrideAccess: true })).totalDocs).toBe(4)
  })
  it('ART-1: a slug another article uses is refused at create', async () => {
    const data = await goodArticle({ slug: `bir-xil-${run}` })
    await draft(data)
    const errors = await errorsOf(draft({ ...data, title: 'Boshqa sarlavha' }))
    // In the submit gate too: a create writes the main row.
    expect((await errorsOf(draft({ ...data, workflowStatus: 'in_edit' }))).map((e) => e.path)).toEqual(['slug'])
    expect(errors.map((e) => e.path)).toEqual(['slug'])
  })
})

describe('G11: rich text the editor cannot load', () => {
  for (const node of [
    { type: 'quote', children: [text('Iqtibos')], direction: 'ltr', format: '', indent: 0, version: 1 },
    { type: 'upload', relationTo: 'media', value: 1, fields: null, format: '', version: 3 },
    { type: 'horizontalrule', version: 1 },
  ]) {
    it(`a ${node.type} node is rejected on every save`, async () => {
      const pl = await payload()
      const errors = await errorsOf(draft(await goodArticle({ body: root(p('Matn.'), node) })))
      expect(errors.map((e) => e.path)).toEqual(['body'])
      const id = await draft(await goodArticle())
      expect((await errorsOf(pl.update({ collection: 'articles', id, data: { body: root(node) } as never, draft: true, overrideAccess: true }))).map((e) => e.path)).toEqual(['body'])
    })
  }
  it('an unknown block in a glossary definition is rejected too', async () => {
    const pl = await payload()
    const errors = await errorsOf(pl.create({ collection: 'glossary-terms', data: { term: 'X', slug: `x-${Date.now()}`, category: 'tamoyil', definition: root(block('figure', {})) } as never, draft: true, overrideAccess: true }))
    expect(errors.map((e) => e.path)).toEqual(['definition'])
  })
  for (const [name, body] of [
    ['javascript: link', root(p('Qarang: ', link('javascript:alert(1)', 'bu yerda')))],
    ['http: link', root(p('Qarang: ', link('http://example.uz', 'bu yerda')))],
    ['nested list', root(list([list(['ichki'])]))],
    ['checklist', root(list(['bir', 'ikki'], 'check'))],
  ] as const) {
    it(`a ${name} saves as a draft with findings and cannot be published`, async () => {
      const id = await draft(await goodArticle({ body }))
      const c = await checksOf(id)
      expect(c.findings.some((f) => f.level === 'error' && (f.rule === 'ART-21' || f.rule === 'ART-22'))).toBe(true)
      const errors = await errorsOf(publish(id))
      expect(errors.map((e) => e.path)).toContain('body')
    })
  }
})

describe('withdrawal', () => {
  it('is never blocked by a rule; republishing with the same problem is', async () => {
    const pl = await payload()
    const m = await media()
    const id = await draft(await goodArticle({ image: m }))
    await publish(id)
    await pl.update({ collection: 'media', id: m, data: { usableUntil: '2026-01-01T00:00:00.000Z' } as never, overrideAccess: true })
    expect((await errorsOf(publish(id))).map((e) => e.path)).toEqual(['image'])
    await expect(publish(id, { workflowStatus: 'withdrawn' })).resolves.toMatchObject({ workflowStatus: 'withdrawn' })
  })
})

describe('rules that need the database', () => {
  it('ART-19: a term card to an unpublished term blocks; a link to a draft story warns', async () => {
    const pl = await payload()
    const term = await pl.create({ collection: 'glossary-terms', data: { term: 'Ijara', slug: `ijara-${Date.now()}`, category: 'shartnoma', _status: 'draft' } as never, draft: true, overrideAccess: true })
    const card = await draft(await goodArticle({ body: root(p('Matn.'), block('term', { term: term.id })) }))
    expect((await errorsOf(publish(card)))[0].message).toContain('kartochka')
    const target = await draft(await goodArticle())
    const internal = { ...link('', 'maqola'), fields: { linkType: 'internal', doc: { relationTo: 'articles', value: target }, newTab: false } }
    const linking = await draft(await goodArticle({ body: root(p('Qarang: ', internal)) }))
    await publish(linking)
    expect((await checksOf(linking)).findings.find((f) => f.rule === 'ART-19')).toMatchObject({ level: 'warning', field: 'body' })
  })

  it('ART-20 / ART-21: a label that breaks the markup blocks; bold + italic only warns', async () => {
    const broken = await draft(await goodArticle({ body: root(p('Qarang: ', link('https://example.uz', 'a]b'))) }))
    expect((await errorsOf(publish(broken)))[0].path).toBe('body')
    const both = await draft(await goodArticle({ body: root(p(text('Muhim', 3), ' gap.')) }))
    await publish(both)
    expect((await checksOf(both)).findings.find((f) => f.rule === 'ART-21')?.level).toBe('warning')
  })

  it('ART-25: an approved translation with an empty title blocks publishing', async () => {
    const pl = await payload()
    const id = await draft(await goodArticle())
    await pl.update({ collection: 'articles', id, locale: 'ru', data: { lead: 'Лид.', translation: { status: 'approved' }, _status: 'draft' } as never, draft: true, overrideAccess: true })
    const errors = await errorsOf(publish(id))
    expect(errors.map((e) => e.path).sort()).toEqual(['body', 'title'])
    expect(errors.find((e) => e.path === 'title')?.message).toContain('Ruscha tarjima tasdiqlangan')
  })

  it('a ru save is checked against the stored uz values (§6.2)', async () => {
    const pl = await payload()
    const id = await draft(await goodArticle({ lead: "Lid o'z holicha." }))
    const errors = await errorsOf(pl.update({ collection: 'articles', id, locale: 'ru', data: { title: 'Заголовок', _status: 'published' }, draft: false, overrideAccess: true }))
    expect(errors.map((e) => e.path)).toEqual(['lead'])
  })

  it('ART-26: a Cyrillic override in Latin letters blocks; KR warnings on the transliteration', async () => {
    const id = await draft(await goodArticle({ kr: { title: 'Regulyator talablari' } }))
    expect((await errorsOf(publish(id))).map((e) => e.path)).toEqual(['kr.title'])
    const kr = await draft(await goodArticle({ lead: 'Regulyator konferensiya oʻtkazdi.' }))
    await publish(kr)
    expect((await checksOf(kr)).findings.find((f) => f.rule === 'KR-3')).toMatchObject({ level: 'warning', field: 'lead' })
  })

  it('§6.3: a translation in progress is not published, and the editor is told', async () => {
    const pl = await payload()
    const id = await draft(await goodArticle())
    await pl.update({ collection: 'articles', id, locale: 'en', data: { title: 'Draft', translation: { status: 'in_edit' }, _status: 'draft' } as never, draft: true, overrideAccess: true })
    await publish(id)
    expect((await checksOf(id)).findings.find((f) => f.rule === 'ART-25')).toMatchObject({ level: 'warning', message: 'en tarjima chop etilmaydi (holati: in_edit)' })
  })

  it('ART-31: a declared interest in the institution warns', async () => {
    const pl = await payload()
    const user = await pl.create({ collection: 'users', data: { email: `interested-${run}@test.muomalat.local`, name: 'Qiziqqan', role: 'reporter', active: true, password: `test-password-${run}-0123456789` } as never, overrideAccess: true })
    const inst = await pl.create({ collection: 'institutions', data: { name: 'Bank B', type: 'bank', city: 'Toshkent', status: 'applied', statusDate: '2026-01-01', _status: 'published' } as never, overrideAccess: true })
    await pl.update({ collection: 'users', id: user.id, data: { declaredInterests: [{ institution: inst.id, nature: 'family' }] } as never, overrideAccess: true })
    const author = await pl.create({ collection: 'authors', data: { slug: `qiziqqan-${Date.now()}`, name: 'Qiziqqan Muallif', role: 'muxbir', bio: 'Bio.', user: user.id, _status: 'published' } as never, overrideAccess: true })
    const id = await draft(await goodArticle({ authors: [author.id], mentions: [inst.id] }))
    await publish(id)
    expect((await checksOf(id)).findings.find((f) => f.rule === 'ART-31')?.message).toContain('Bank B')
  })

  it('ART-23 and ART-24 block publishing; ART-30 blocks a long urgent story', async () => {
    const until = new Date(Date.now() + 3_600_000).toISOString()
    const embargoed = await draft(await goodArticle({ embargo: { until, source: 'Regulyator' } }))
    expect((await errorsOf(publish(embargoed))).map((e) => e.path)).toEqual(['embargo'])
    const legal = await draft(await goodArticle({ needsLegal: 'required' }))
    expect((await errorsOf(publish(legal))).map((e) => e.path)).toEqual(['needsLegal'])
    const long = await draft(await goodArticle({ urgent: true, body: root(p(Array.from({ length: 401 }, (_, i) => `soʻz${i}`).join(' '))) }))
    expect((await errorsOf(publish(long))).map((e) => e.path)).toEqual(['body'])
  })

  it('ART-4: an unpublished byline blocks publishing', async () => {
    const pl = await payload()
    const a = await pl.create({ collection: 'authors', data: { slug: `qoralama-${Date.now()}`, name: 'Yangi Muallif', role: 'muxbir', bio: 'Bio.', _status: 'draft' } as never, draft: true, overrideAccess: true })
    const id = await draft(await goodArticle({ authors: [a.id] }))
    expect((await errorsOf(publish(id))).map((e) => e.path)).toEqual(['authors'])
  })

  it('SP-10: in a sponsored story a glossary link labelled with a review term warns', async () => {
    const pl = await payload()
    const term = await pl.create({ collection: 'glossary-terms', data: { ...glossary('halol'), _status: 'published' } as never, overrideAccess: true })
    const gl = { type: 'inlineBlock', fields: { id: 'x1', blockType: 'glossaryLink', blockName: '', term: term.id, label: 'halol mahsulot' }, version: 1 }
    const id = await draft(await goodArticle({ sponsored: { enabled: true, partner: 'Hamkor' }, body: root(p('Bu ', gl as never, ' haqida.')) }))
    await publish(id)
    expect(rulesOf(await checksOf(id), 'warning')).toContain('SP-10')
  })

  it('GL-1, INST-1, MS-1, CLUB-1', async () => {
    const pl = await payload()
    const term = await pl.create({ collection: 'glossary-terms', data: { term: 'Salam', slug: `salam-${Date.now()}`, category: 'shartnoma', _status: 'draft' } as never, draft: true, overrideAccess: true })
    const gl = await errorsOf(pl.update({ collection: 'glossary-terms', id: term.id, data: { related: [term.id], short: 'Qisqa.', definition: root(p('T.')), origin: root(p('K.')), practice: root(p('A.')), _status: 'published' } as never, overrideAccess: true }))
    expect(gl.map((e) => e.path)).toEqual(['related'])
    const inst = await errorsOf(pl.create({ collection: 'institutions', data: { name: 'Oyna', type: 'window', city: 'Toshkent', status: 'applied', statusDate: '2099-01-01', _status: 'published' } as never, overrideAccess: true }))
    expect(inst.map((e) => e.path).sort()).toEqual(['parent', 'statusDate'])
    const ms = await errorsOf(pl.create({ collection: 'milestones', data: { date: '2026', title: 'Bosqich', text: 'Matn.', status: 'done', _status: 'published' } as never, overrideAccess: true }))
    expect(ms.map((e) => e.path)).toEqual(['date'])
    const club = await errorsOf(
      pl.create({
        collection: 'club-events',
        data: { slug: `uchrashuv-${Date.now()}`, number: 9001, title: 'Uchrashuv', theme: 'Mavzu', summary: 'Qisqacha.', startsAt: '2026-11-01T14:00:00Z', endsAt: '2026-11-01T13:00:00Z', venue: { name: 'Zal', address: 'Manzil', city: 'Toshkent' }, _status: 'published' } as never,
        overrideAccess: true,
      }),
    )
    expect(club.map((e) => e.path)).toEqual(['endsAt'])
  })

  it('HOME-1 / HOME-2: no sponsored or unpublished story in an editorial slot', async () => {
    const pl = await payload()
    const sponsored = await draft(await goodArticle({ sponsored: { enabled: true, partner: 'Hamkor' } }))
    await publish(sponsored)
    const unpublished = await draft(await goodArticle())
    const errors = await errorsOf(pl.updateGlobal({ slug: 'home-page', data: { lead: sponsored, secondary: [unpublished], _status: 'published' } as never, overrideAccess: true }))
    expect(errors.map((e) => e.path).sort()).toEqual(['lead', 'secondary'])
    // As a draft the home page saves; the checks run when it is published.
    await expect(pl.updateGlobal({ slug: 'home-page', data: { lead: sponsored, _status: 'draft' } as never, draft: true, overrideAccess: true })).resolves.toBeTruthy()
    await pl.updateGlobal({ slug: 'home-page', data: { lead: null, secondary: [], _status: 'draft' } as never, draft: true, overrideAccess: true })
  })

  it('ART-29: a Telegram caption over 1024 characters (tags removed) with a photo is refused', async () => {
    const pl = await payload()
    const b = await fixtures()
    const errors = await errorsOf(pl.create({ collection: 'telegram-posts', data: { kind: 'article', photo: b.media, captionHtml: `<b>${'a'.repeat(1020)}</b> ${'&amp;'.repeat(5)}` } as never, overrideAccess: true }))
    expect(errors.map((e) => e.path)).toEqual(['captionHtml'])
    await expect(pl.create({ collection: 'telegram-posts', data: { kind: 'article', photo: b.media, captionHtml: `<b>${'a'.repeat(1000)}</b>` } as never, overrideAccess: true })).resolves.toBeTruthy()
  })
})

describe('LinkFeature url validation (PHASE0 §1.7 item 3)', () => {
  it("Payload's own rich-text validation refuses a link that is neither https:// nor a site path", async () => {
    const pl = await payload()
    const field = pl.collections.articles.config.flattenedFields.find((f) => f.name === 'body') as { validate: (v: unknown, o: unknown) => Promise<true | string> }
    const req = await createLocalReq({}, pl)
    const validate = (url: string) => field.validate(root(p('Qarang: ', link(url, 'havola'))), { req, required: false, data: {}, siblingData: {}, operation: 'update', id: 1, collectionSlug: 'articles', preferences: { fields: {} }, path: ['body'], event: 'submit' })
    for (const bad of ['javascript:alert(1)', 'http://example.uz', '//evil.example', '#anchor']) expect(await validate(bad)).not.toBe(true)
    for (const good of ['https://example.uz/a', '/xarita']) expect(await validate(good)).toBe(true)
  })
})
