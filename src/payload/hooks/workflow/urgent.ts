import { embargoActive } from './embargo'
import { wordCount } from './hash'
import { isAuthorOrSubmitter, type Save } from './save'
import { type Doc, fieldError, forbidden, nowIso } from './shared'
import { requiresEic } from './tiers'

/**
 * The urgent fast path "Shoshilinch" (CMS-SPEC §5.4): an editor (who may be
 * the author) publishes a short `yangiliklar` item at once, backed by an
 * official source, and a second editor reads it within 30 minutes. Every
 * condition is listed in one error so the editor can fix them together.
 *
 * Stories of an editor-in-chief tier (§5.5) cannot take the fast path unless
 * the editor-in-chief publishes them: the spec lists legal review, an
 * anonymous source and sponsorship among the conditions, and the same
 * reasoning covers legal sensitivity and declared interests.
 */
export async function checkUrgent(s: Save): Promise<void> {
  if (!s.system && s.role !== 'editor' && s.role !== 'eic') throw forbidden('Shoshilinch chop etishni faqat muharrir bajaradi.')
  const m = s.merged
  const uz = await s.uz()
  const errors: { path: string; message: string }[] = []
  if (!m.urgent) errors.push({ path: 'urgent', message: '«Shoshilinch» belgilanmagan.' })
  if ((await s.rubricSlug()) !== 'yangiliklar') errors.push({ path: 'rubric', message: 'Tezkor yoʻl faqat «Yangiliklar» rubrikasi uchun.' })
  if (s.sponsored()) errors.push({ path: 'sponsored.enabled', message: 'Homiylik materiali tezkor yoʻl bilan chop etilmaydi.' })
  if ((m.needsLegal ?? 'na') !== 'na') errors.push({ path: 'needsLegal', message: 'Yuridik koʻrik kerak boʻlgan maqola tezkor yoʻl bilan chop etilmaydi.' })
  if (m.singleAnonymousSource) errors.push({ path: 'singleAnonymousSource', message: 'Yagona anonim manbali maqola tezkor yoʻl bilan chop etilmaydi.' })
  const e = (m.embargo ?? {}) as Doc
  if (e.indefinite || e.until || embargoActive(m, s.now)) errors.push({ path: 'embargo.until', message: 'Embargoli maqola tezkor yoʻl bilan chop etilmaydi.' })
  const words = wordCount(uz.body)
  if (words > 400) errors.push({ path: 'body', message: `Matn ${words} soʻz: tezkor yoʻl uchun 400 soʻzgacha (ART-30).` })
  if (!(await hasOfficialSource(s))) {
    errors.push({ path: 'sources', message: 'Rasmiy manba kerak: turi «Hujjat», «Press-reliz» yoki «Maʼlumotlar», havolasi rasmiy domenlar roʻyxatida.' })
  }
  if (s.role !== 'eic' && (await requiresEic(s))) errors.push({ path: 'legallySensitive', message: 'Bu maqolani bosh muharrir chop etadi.' })
  if (errors.length) throw fieldError(s.req, errors)
}

async function hasOfficialSource(s: Save): Promise<boolean> {
  const rules = await s.rules()
  const domains = ((rules.officialSourceDomains as Doc[] | undefined) ?? [])
    .map((d) => String(d.domain ?? '').trim().toLowerCase().replace(/^\.+/, ''))
    .filter(Boolean)
  if (!domains.length) return false
  return ((s.merged.sources as Doc[] | undefined) ?? []).some((src) => {
    if (!['press', 'document', 'data'].includes(String(src.type))) return false
    try {
      const host = new URL(String(src.url ?? '')).hostname.toLowerCase()
      return domains.some((d) => host === d || host.endsWith(`.${d}`))
    } catch {
      return false
    }
  })
}

/**
 * The second read (§5.4): set by the fast path and by an update published by
 * its author-editor. The reader must not be an author; `doneBy` and `doneAt`
 * are stamped when the outcome is entered.
 */
export async function secondReadRules(s: Save): Promise<void> {
  const next = (s.merged.secondRead ?? {}) as Doc
  const prev = (s.original.secondRead ?? {}) as Doc
  if ((next.outcome ?? null) === (prev.outcome ?? null)) return
  if (s.transition?.id === 'secondRead') return
  if (!next.outcome) {
    // Clearing the outcome reopens nothing: the record stays as it was.
    s.data.secondRead = { ...((s.data.secondRead as Doc | undefined) ?? {}), outcome: prev.outcome ?? null }
    return
  }
  if (!prev.required) throw forbidden('Bu maqola uchun ikkinchi oʻqish talab qilinmagan.')
  if (prev.doneAt) throw forbidden('Ikkinchi oʻqish allaqachon bajarilgan.')
  if (!s.system && s.role !== 'editor' && s.role !== 'eic') throw forbidden('Ikkinchi oʻqishni muharrir bajaradi.')
  if (!s.system && (await isAuthorOrSubmitter(s, s.actor))) throw forbidden('Ikkinchi oʻqishni muallif boʻlmagan muharrir bajaradi.')
  s.data.secondRead = { ...((s.data.secondRead as Doc | undefined) ?? {}), doneBy: s.actor ?? null, doneAt: nowIso() }
}
