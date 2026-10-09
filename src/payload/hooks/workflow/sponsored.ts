import type { PayloadRequest } from 'payload'

import { hasRole } from '../../access/roles'
import { REL } from '../../fields/relations'
import { richTextStrings } from './hash'
import type { Save } from './save'
import { type Doc, fieldError, forbidden, type Id, idOf, isBlank, isolated, nowIso, pendingFor, TRANSLATED } from './shared'

/**
 * Sponsored-content guard (CMS-SPEC §5.9). SP-7 (settings label), SP-8
 * (where sponsored items may appear) and SP-10 (a warning) belong to the
 * validation concern and the read layer; SP-11 is in ./editing.
 */

/** Phrases that promise a return (SP-5). `editorial-rules.expectedReturnPhrases` adds to these; it never removes one. */
export const EXPECTED_RETURN_DEFAULTS: { locale: 'uz' | 'ru' | 'en'; pattern: string }[] = [
  { locale: 'uz', pattern: 'kafolatlangan daromad' },
  { locale: 'uz', pattern: 'foyda kafolati' },
  { locale: 'uz', pattern: 'yillik \\d+\\s?% daromad' },
  { locale: 'ru', pattern: 'гарантированн\\w+ доход' },
  { locale: 'ru', pattern: 'доходность до' },
  { locale: 'en', pattern: 'guaranteed return' },
]

const FINANCIAL = ['financial_service', 'bank_deposit', 'investment_securities', 'insurance_takaful']
const RETAIN_YEARS = 3

/**
 * SP-1: a story created by commercial is sponsored, with the commercial
 * byline, whatever was sent. The byline is the author profile linked to the
 * commercial account if it is a commercial byline, otherwise the team's
 * commercial byline. Runs before every other rule, so they see the forced values.
 */
export async function forceCommercialCreate(req: PayloadRequest, data: Doc): Promise<void> {
  if (!hasRole(req, 'commercial')) return
  const { docs } = await req.payload.find({
    collection: REL.authors,
    where: { and: [{ commercial: { equals: true } }, { active: { not_equals: false } }] },
    depth: 0,
    limit: 50,
    overrideAccess: true,
    req: isolated(req),
  })
  const bylines = docs as unknown as Doc[]
  const own = bylines.find((a) => String(idOf(a.user)) === String(req.user?.id))
  const byline = own ?? bylines.find((a) => a.isTeam) ?? bylines[0]
  if (!byline) throw forbidden('Tijorat imzosi topilmadi: administrator tijorat muallifini yaratishi kerak.')
  data.sponsored = { ...((data.sponsored as Doc | undefined) ?? {}), enabled: true }
  data.authors = [byline.id as Id]
}

/** Every save: SP-2 (bylines match the kind of story) and SP-9 (sponsorship is never cleared after publication). */
export async function sponsoredRules(s: Save): Promise<void> {
  const before = Boolean((s.original.sponsored as Doc | undefined)?.enabled)
  const after = s.sponsored()
  if (before && !after) {
    if (s.role !== 'eic' && !s.system) throw forbidden('Homiylik belgisini faqat bosh muharrir olib tashlay oladi.')
    if (s.original.firstPublishedAt || (await s.mainPublished())) {
      throw fieldError(s.req, 'sponsored.enabled', 'Chop etilgan homiylik materialidan homiylik belgisi olib tashlanmaydi (SP-9).')
    }
  }
  const authors = await s.authorDocs()
  if (!authors.length) return
  if (after && authors.some((a) => !a.commercial)) {
    throw fieldError(s.req, 'authors', 'Homiylik materialida faqat tijorat imzosi boʻladi (SP-2).')
  }
  if (!after && authors.some((a) => a.commercial)) {
    throw fieldError(s.req, 'authors', 'Tahririyat materialida tijorat imzosi boʻlmaydi (SP-2).')
  }
}

/** The text of one locale: from this save for the saving locale, from storage for the others. */
function localeDoc(s: Save, all: Doc, locale: string): Doc {
  if (s.locale === locale) return s.merged
  const pick = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc)[locale] : undefined)
  const sp = (all.sponsored ?? {}) as Doc
  return {
    title: pick(all.title),
    lead: pick(all.lead),
    body: pick(all.body),
    translation: pick(all.translation),
    sponsored: { disclosure: pick(sp.disclosure), riskWarning: pick(sp.riskWarning), keyTerms: pick(sp.keyTerms) },
  }
}

/** At every publish of a sponsored story: SP-3, SP-4, SP-5 and SP-6. */
export async function sponsoredPublishRules(s: Save): Promise<void> {
  if (!s.sponsored()) return
  if (!s.system && s.role !== 'eic') throw forbidden('Homiylik materialini faqat bosh muharrir chop etadi (SP-6).')
  const sp = (s.merged.sponsored ?? {}) as Doc
  const all = await s.allLocales()
  const uz = localeDoc(s, all, 'uz')
  const uzSp = (uz.sponsored ?? {}) as Doc
  const errors: { path: string; message: string }[] = []
  // SP-3
  if (isBlank(sp.partner)) errors.push({ path: 'sponsored.partner', message: 'Hamkor nomini yozing (SP-3).' })
  if (isBlank(uzSp.disclosure)) errors.push({ path: 'sponsored.disclosure', message: 'Oshkor qilish matnini oʻzbekcha yozing (SP-3).' })
  if (isBlank(sp.contractRef)) errors.push({ path: 'sponsored.contractRef', message: 'Shartnoma raqamini yozing (SP-3).' })
  for (const l of TRANSLATED) {
    const d = localeDoc(s, all, l)
    if ((d.translation as Doc | undefined)?.status === 'approved' && isBlank((d.sponsored as Doc | undefined)?.disclosure)) {
      errors.push({ path: 'sponsored.disclosure', message: `${l} tarjimasi tasdiqlangan: oshkor qilish matnini ${l} tilida ham yozing (SP-3).` })
    }
  }
  // SP-4
  const category = (sp.category as string | undefined) ?? 'general'
  if (FINANCIAL.includes(category)) {
    if (isBlank(sp.licenceNumber)) errors.push({ path: 'sponsored.licenceNumber', message: 'Moliyaviy reklama uchun litsenziya raqami shart (SP-4).' })
    if (category !== 'bank_deposit' && isBlank(uzSp.riskWarning)) {
      errors.push({ path: 'sponsored.riskWarning', message: 'Xavf haqida ogohlantirishni oʻzbekcha yozing (SP-4).' })
    }
    if (isBlank(uzSp.keyTerms)) errors.push({ path: 'sponsored.keyTerms', message: 'Asosiy shartlarni oʻzbekcha yozing (SP-4).' })
  }
  // SP-5
  const rules = await s.rules()
  const patterns = [
    ...EXPECTED_RETURN_DEFAULTS,
    ...(((rules.expectedReturnPhrases as Doc[] | undefined) ?? []).map((p) => ({ locale: (p.locale as string) || 'uz', pattern: p.pattern as string }))),
  ]
  const caption = ((s.merged.telegram ?? {}) as Doc).captionOverride
  // The editor-in-chief may override SP-5 with a reason (the phrase sits in a disclaimer, not a promise); the
  // fields are theirs alone (field access), and each publish that relies on it is audited.
  const overrideReason = sp.returnPhraseOverride && !isBlank(sp.returnPhraseOverrideReason) ? String(sp.returnPhraseOverrideReason).trim() : undefined
  if (sp.returnPhraseOverride && !overrideReason) {
    errors.push({ path: 'sponsored.returnPhraseOverrideReason', message: 'Daromad vaʼdasi tekshiruvini chetlab oʻtish sababini yozing (SP-5).' })
  }
  const phraseHits: string[] = []
  for (const l of ['uz', 'ru', 'en']) {
    const d = localeDoc(s, all, l)
    const texts = [d.title, d.lead, ...richTextStrings(d.body), caption].filter((t): t is string => typeof t === 'string' && t !== '')
    for (const p of patterns) {
      let re: RegExp
      try {
        re = new RegExp(p.pattern, 'iu')
      } catch {
        continue
      }
      const hit = texts.find((t) => re.test(t))
      if (hit) {
        const phrase = hit.match(re)?.[0]
        phraseHits.push(`${l}: «${phrase}»`)
        if (!overrideReason) {
          errors.push({
            path: l === s.locale ? 'body' : 'title',
            message: `Daromad vaʼdasi taqiqlangan iborasi (${l}): «${phrase}» (SP-5). Bu vaʼda boʻlmasa, bosh muharrir «Tijorat» boʻlimida sababi bilan chetlab oʻtadi.`,
          })
        }
        break
      }
    }
  }
  if (errors.length) throw fieldError(s.req, errors)
  if (overrideReason && phraseHits.length) {
    pendingFor(s.req, s.id).events.push({
      action: 'sponsored.return_phrase_override',
      summary: `SP-5: ${phraseHits.join('; ')}`.slice(0, 1000),
      after: { phrases: phraseHits, reason: overrideReason },
    })
  }
  // SP-6 and the retention record (Art. 15): three years from the latest publication.
  const retain = new Date(s.now)
  retain.setUTCFullYear(retain.getUTCFullYear() + RETAIN_YEARS)
  s.data.sponsored = { ...((s.data.sponsored as Doc | undefined) ?? {}), approvedBy: s.actor ?? null, approvedAt: nowIso(), retainUntil: retain.toISOString() }
}
