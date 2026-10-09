import type { GlobalSlug, Payload } from 'payload'

import { DEFAULT_LIMITS } from '../../content/rules'
import { paths } from '../../lib/routes'
import { AD_SLOT_IDS, AD_SLOTS } from '../globals/AdSlots'
import { NAV_PAGES } from '../globals/Navigation'
import { type Counter, IMPORT_CONTEXT, type Id, type ImportLog, TRANSLATED } from './shared'
import { type MockCorpus, site } from './source'

/**
 * Steps 10 and 11 of CMS-SPEC §11.2: the globals, from src/content/data/site.ts
 * and from what the site's code does today.
 *
 * - `site-settings`: identity, the legal imprint with its placeholder flags
 *   (all still placeholders), the demo notice on, the Telegram channel, the
 *   advertising labels in every locale and the policy pages.
 * - `navigation`: the header as the site draws it (the five rubrics, then
 *   the glossary, the market map and the club). The footer is left empty, so
 *   the site keeps its coded footer (see the report: /maxfiylik is not an
 *   allowed menu path yet).
 * - `home-page`: today's lead (the newest featured story that is not
 *   sponsored); nothing is pinned, every other slot keeps its automatic choice.
 * - `ad-slots`: every slot the site renders, disabled, with its format.
 * - `editorial-rules`: the length limits of src/content/rules.ts. The lists
 *   only add to the rules in code, which always apply, so they start empty;
 *   the transliteration dictionary stays in src/i18n/translit.ts (LATER in §3.16).
 *
 * Only the keys listed here are written: a re-run leaves the rest of each
 * global (an editor's additions, alert recipients) as it is.
 */

const write = async (payload: Payload, slug: string, locale: 'uz' | 'ru' | 'en', data: Record<string, unknown>, draft = false) =>
  payload.updateGlobal({ slug: slug as GlobalSlug, locale, data: data as never, draft, depth: 0, overrideAccess: true, context: IMPORT_CONTEXT })

const LABELS = {
  uz: { sponsored: 'Reklama · Hamkorlik materiali', advert: 'Reklama' },
  ru: { sponsored: 'Реклама · Партнёрский материал', advert: 'Реклама' },
  en: { sponsored: 'Advertisement · Partner content', advert: 'Advertisement' },
} as const

export async function importGlobals(
  payload: Payload,
  corpus: MockCorpus,
  counter: Counter,
  opts: { rubrics: Map<string, Id>; articles: Map<string, Id>; log: ImportLog },
): Promise<void> {
  // ── site-settings ────────────────────────────────────────────────────────
  const legal = Object.fromEntries(Object.entries(site.legal).map(([k, v]) => [k, { value: v.value, placeholder: v.placeholder }]))
  await write(payload, 'site-settings', 'uz', {
    name: site.name,
    domain: site.domain,
    email: site.email,
    foundedYear: site.foundedYear,
    legal: { ...legal, postalIndex: { value: '', placeholder: true } },
    demo: { noticeEnabled: true },
    labels: LABELS.uz,
    telegram: { channelHandle: site.telegram.handle, channelUrl: site.telegram.url },
    policies: { correctionsPolicyUrl: paths.corrections(), privacyPolicyUrl: paths.privacy() },
  })
  for (const l of TRANSLATED) await write(payload, 'site-settings', l, { labels: LABELS[l] })
  counter.updated++

  // ── navigation ───────────────────────────────────────────────────────────
  const rubricItems = [...corpus.rubrics]
    .sort((a, b) => a.order - b.order)
    .map((r) => ({ kind: 'rubric', rubric: opts.rubrics.get(r.slug), visible: true }))
  const pageItems = (['lugat', 'xarita', 'klub'] as const satisfies readonly (typeof NAV_PAGES)[number][]).map((page) => ({ kind: 'page', page, visible: true }))
  await write(payload, 'navigation', 'uz', { header: [...rubricItems, ...pageItems], _status: 'published' })
  counter.updated++

  // ── home-page ────────────────────────────────────────────────────────────
  const lead = corpus.articles.find((a) => a.featured && !a.sponsored) ?? corpus.articles[0]
  const leadId = lead ? opts.articles.get(lead.id) : undefined
  if (lead && leadId === undefined) opts.log.warn(`home-page: lead story ${lead.id} not imported`)
  await write(payload, 'home-page', 'uz', { lead: leadId ?? null, pinned: [], _status: 'published' })
  counter.updated++

  // ── ad-slots ─────────────────────────────────────────────────────────────
  await write(payload, 'ad-slots', 'uz', { slots: AD_SLOT_IDS.map((slotId) => ({ slotId, format: AD_SLOTS[slotId], enabled: false })), _status: 'published' })
  counter.updated++

  // ── editorial-rules ──────────────────────────────────────────────────────
  await write(payload, 'editorial-rules', 'uz', { limits: { ...DEFAULT_LIMITS } })
  counter.updated++
}
