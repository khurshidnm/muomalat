import type { Field, PayloadRequest } from 'payload'

import type { Finding } from '../../../content/rules'
import { REL } from '../../fields/relations'
import { deepMerge, idOf, idsOf, isolated, LOCALES, ruleSettings, saveLocale, type Doc, type Locale } from './shared'
import { textFindings, textItems } from './text'

/**
 * Rules on the globals (CMS-SPEC §3.16, §7.2):
 * - SET-1, the launch gate: the demo notice cannot be switched off while a
 *   legal imprint line is still a placeholder;
 * - SP-7: the advertising labels name the advertisement in each language;
 * - HOME-1 / HOME-2: the home page shows no sponsored or withdrawn story in an
 *   editorial slot, and only published stories;
 * - the text rules (errors) on the public texts of every global.
 */

/** SP-7: the word each locale's label must contain (Advertising Law: an advert says it is one). */
const AD_WORD: Record<Locale, string> = { uz: 'Reklama', ru: 'Реклама', en: 'Advertisement' }

const LEGAL_LINES = ['registrationNumber', 'registrationDate', 'registrar', 'founder', 'editorInChief', 'address', 'postalIndex', 'email', 'phone', 'ageMark']

/** SET-1 on the settings as they will be stored. */
export function launchGate(settings: Doc): Finding[] {
  const demo = (settings.demo ?? {}) as { noticeEnabled?: boolean | null }
  if (demo.noticeEnabled !== false) return []
  const legal = (settings.legal ?? {}) as Record<string, { placeholder?: boolean | null } | undefined>
  const open = LEGAL_LINES.filter((k) => legal[k]?.placeholder !== false)
  return open.length
    ? [
        {
          rule: 'SET-1',
          level: 'error',
          path: 'demo.noticeEnabled',
          message: `Demo ogohlantirishini oʻchirishdan oldin chiqish maʼlumotlarini toʻldiring: ${open.length} ta qator hali namuna (${open.join(', ')})`,
        },
      ]
    : []
}

/** SP-7 on the labels of one locale (or of every locale, in a document read with `locale: 'all'`). */
export function labelRules(labels: unknown, locale: Locale | 'all'): Finding[] {
  const out: Finding[] = []
  const l = (labels ?? {}) as Record<string, unknown>
  for (const name of ['sponsored', 'advert'] as const) {
    const v = l[name]
    const values: [Locale, unknown][] = locale === 'all' ? LOCALES.map((loc) => [loc, (v as Record<string, unknown> | undefined)?.[loc]]) : [[locale, v]]
    for (const [loc, text] of values) {
      if (typeof text !== 'string' || !text.trim()) continue // empty: the site falls back to the default label
      if (!text.includes(AD_WORD[loc])) out.push({ rule: 'SP-7', level: 'error', path: `labels.${name}`, message: `${loc} belgisida «${AD_WORD[loc]}» soʻzi boʻlishi shart` })
    }
  }
  return out
}

/**
 * HOME-1 and HOME-2 against the current published state of every referenced
 * story. Editorial slots (lead, secondary, pinned, breaking, interview,
 * most-read) never hold a sponsored or withdrawn story; the sponsored teaser
 * holds nothing else.
 */
export async function homeRules(req: PayloadRequest, home: Doc): Promise<Finding[]> {
  const refs: { path: string; id: string | number; slot: string }[] = []
  const push = (path: string, slot: string, v: unknown) => {
    const id = idOf(v)
    if (id !== undefined) refs.push({ path, id, slot })
  }
  push('lead', 'lead', home.lead)
  idsOf(home.secondary).forEach((id) => push('secondary', 'secondary', id))
  ;((home.pinned ?? []) as { article?: unknown }[]).forEach((row, i) => push(`pinned.${i}.article`, 'pinned', row?.article))
  push('breaking.article', 'breaking', (home.breaking as { article?: unknown } | undefined)?.article)
  push('interviewFeature', 'interviewFeature', home.interviewFeature)
  idsOf(home.mostReadOverride).forEach((id) => push('mostReadOverride', 'mostReadOverride', id))
  push('sponsoredTeaser', 'sponsoredTeaser', home.sponsoredTeaser)
  if (!refs.length) return []
  const ids = [...new Set(refs.map((r) => String(r.id)))]
  const { docs } = await req.payload.find({
    collection: REL.articles,
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    pagination: false,
    draft: false,
    trash: true,
    overrideAccess: true,
    req: isolated(req),
    select: { title: true, _status: true, deletedAt: true, sponsored: true, withdrawal: true, workflowStatus: true } as never,
  })
  const byId = new Map((docs as Doc[]).map((d) => [String(d.id), d]))
  const out: Finding[] = []
  for (const r of refs) {
    const a = byId.get(String(r.id))
    const name = a?.title ? `«${String(a.title)}»` : 'Tanlangan maqola'
    if (!a || a.deletedAt || a._status !== 'published') {
      out.push({ rule: 'HOME-2', level: 'error', path: r.path, message: `${name} chop etilmagan yoki oʻchirilgan: bosh sahifada faqat chop etilgan maqola turadi` })
      continue
    }
    const sponsored = Boolean((a.sponsored as { enabled?: boolean } | undefined)?.enabled)
    const withdrawn = Boolean((a.withdrawal as { at?: unknown } | undefined)?.at) || a.workflowStatus === 'withdrawn'
    if (withdrawn) out.push({ rule: 'HOME-1', level: 'error', path: r.path, message: `${name} olib tashlangan: bosh sahifada koʻrsatilmaydi` })
    else if (r.slot === 'sponsoredTeaser' ? !sponsored : sponsored)
      out.push({
        rule: 'HOME-1',
        level: 'error',
        path: r.path,
        message: r.slot === 'sponsoredTeaser' ? `${name} homiylik materiali emas: bu joyga faqat homiylik materiali qoʻyiladi` : `${name} homiylik (reklama) materiali: tahririyat joylariga qoʻyilmaydi`,
      })
  }
  return out
}

/** Global texts that are not published prose. */
const SKIP: Record<string, string[]> = {
  'site-settings': ['name', 'domain', 'legal', 'telegram', 'policies', 'operations'],
  'ad-slots': ['slots.advertiserName', 'slots.contractRef'],
}

export interface GlobalCheckInput {
  req: PayloadRequest
  slug: string
  fields: Field[]
  data: Doc
  originalDoc?: Doc
  /** The save makes this content public (home-page, navigation and ad-slots have drafts). */
  publishing: boolean
}

/** Errors that block the save of a global. Warnings have nowhere to be shown on globals and are left out. */
export async function checkGlobalDoc({ req, slug, fields, data, originalDoc, publishing }: GlobalCheckInput): Promise<Finding[]> {
  const merged = deepMerge(originalDoc, data)
  const out: Finding[] = []
  if (slug === 'site-settings') {
    out.push(...launchGate(merged), ...labelRules(merged.labels, saveLocale(req)))
  }
  if (!publishing) return out
  if (slug === 'home-page') out.push(...(await homeRules(req, merged)))
  if (saveLocale(req) === 'uz') {
    const { demoMode, rules } = await ruleSettings(req)
    const items = textItems(fields, merged, { skip: new Set(SKIP[slug] ?? []) })
    out.push(...textFindings(items, () => ({ demoMode, extra: rules, realOrgs: false })))
  }
  return out.filter((f) => f.level === 'error')
}
