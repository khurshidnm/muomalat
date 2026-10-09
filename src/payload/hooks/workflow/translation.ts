import { createHash } from 'node:crypto'

import type { CollectionBeforeChangeHook, Field, PayloadRequest } from 'payload'

import { hasRole } from '../../access/roles'
import { nonLocalizedChanges } from './diff'
import { translationHash } from './hash'
import type { Save } from './save'
import {
  canonical,
  type Doc,
  fieldError,
  forbidden,
  type Id,
  idOf,
  isBlank,
  isolatedWrite,
  nowIso,
  TRANSLATED,
  wctx,
} from './shared'

/**
 * Translation status and gating (CMS-SPEC §6.3) for every collection with a
 * `translation` group (articles, glossary terms, club events). The status of
 * a locale is written by this hook and by nobody else:
 *
 * - only an editor or the editor-in-chief approves, and never their own
 *   translation (`translatedBy`); a machine draft passes through `in_edit`;
 * - approval records `reviewedBy`, `approvedAt` and the locale's content hash;
 * - a later change to that locale's text sets it back to `in_edit`, unless the
 *   reviewer makes it, in which case the hash is refreshed;
 * - any other `approved` that arrives (a copied status, a forged value) is
 *   refused, so the read gate (`status === 'approved'` and a matching hash)
 *   never opens for unreviewed text.
 *
 * Corrections and updates of the uz source mark approved translations
 * `outdated` after the publish (./changeKind → markTranslationsOutdated);
 * after a correction the hash is cleared too, so the read gate hides them.
 */

type HashOf = (doc: Doc, locale: 'ru' | 'en') => string

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** For collections other than articles: every localized content field except the translation group and SEO. */
export const localizedContentHash =
  (fieldNames: string[]): HashOf =>
  (doc) =>
    sha256(canonical(Object.fromEntries(fieldNames.map((n) => [n, doc[n] ?? null]))))

interface GateArgs {
  req: PayloadRequest
  data: Doc
  original: Doc
  locale: string
  hashOf: HashOf
  /** Extra approval checks (articles: corrections text in this locale). */
  onApprove?: (locale: 'ru' | 'en') => { path: string; message: string }[]
}

export function translationGate({ req, data, original, locale, hashOf, onApprove }: GateArgs): void {
  if (!(TRANSLATED as string[]).includes(locale)) return
  const l = locale as 'ru' | 'en'
  const ctx = wctx(req)
  const actor = req.user?.id as Id | undefined
  const prev = (original.translation ?? {}) as Doc
  const next: Doc = { ...((data.translation as Doc | undefined) ?? prev) }
  const prevStatus = (prev.status as string | undefined) ?? 'missing'
  const nextStatus = (next.status as string | undefined) ?? prevStatus
  const merged = { ...original, ...data }
  const contentNow = hashOf(merged, l)
  const contentChanged = contentNow !== hashOf(original, l)

  if (ctx.copyFromUz) {
    next.translatedBy = actor ?? null
    next.status = ctx.copyFromUz.machine ? 'machine_draft' : 'in_edit'
    next.machine = { ...((next.machine as Doc | undefined) ?? {}), used: ctx.copyFromUz.machine || Boolean((next.machine as Doc | undefined)?.used) }
    next.contentHash = null
    data.translation = next
    return
  }

  if (nextStatus === 'approved' && prevStatus !== 'approved') {
    if (!hasRole(req, 'editor', 'eic')) throw forbidden('Tarjimani faqat muharrir yoki bosh muharrir tasdiqlaydi.')
    const translator = idOf(prev.translatedBy) ?? idOf(next.translatedBy)
    if (translator !== undefined && String(translator) === String(actor)) throw forbidden('Oʻz tarjimangizni tasdiqlay olmaysiz.')
    if (prevStatus === 'machine_draft' && (prev.machine as Doc | undefined)?.used) {
      throw fieldError(req, 'translation.status', 'Mashina tarjimasi avval «Tahrirda» bosqichidan oʻtishi kerak.')
    }
    const errors = [
      ...(['title', 'lead'] as const)
        .filter((k) => k in merged && isBlank(merged[k]))
        .map((k) => ({ path: k, message: `Tasdiqlangan tarjimada ${k === 'title' ? 'sarlavha' : 'lid'} boʻsh boʻlmasligi kerak (ART-25).` })),
      ...(onApprove?.(l) ?? []),
    ]
    if (errors.length) throw fieldError(req, errors)
    next.reviewedBy = actor ?? null
    next.approvedAt = nowIso()
    next.contentHash = contentNow
  } else if (nextStatus === 'approved') {
    if (prev.contentHash !== contentNow) {
      if (String(idOf(prev.reviewedBy)) === String(actor)) next.contentHash = contentNow
      else {
        next.status = 'in_edit'
        next.contentHash = null
        next.translatedBy = actor ?? prev.translatedBy ?? null
      }
    }
  } else {
    if (nextStatus === 'outdated' && prevStatus !== 'outdated' && !hasRole(req, 'editor', 'eic')) {
      throw forbidden('«Eskirgan» holatini tizim belgilaydi.')
    }
    if (contentChanged) {
      next.translatedBy = actor ?? prev.translatedBy ?? null
      if (nextStatus === 'missing' || nextStatus === 'outdated') next.status = 'in_edit'
    }
    // System values never come from the client: keep the stored ones.
    next.reviewedBy = prev.reviewedBy ?? null
    next.approvedAt = prev.approvedAt ?? null
    next.contentHash = nextStatus === prevStatus ? (prev.contentHash ?? null) : null
  }
  data.translation = next
}

/** Article saves: the translator row of §4.2 and the gate. */
export async function articleTranslationRules(s: Save, fields: Field[]): Promise<void> {
  if (!(TRANSLATED as string[]).includes(s.locale)) return
  if (s.role === 'reporter' && !s.system) {
    const changed = nonLocalizedChanges(fields, s.original, s.data).filter((p) => !p.startsWith('corrections'))
    if (changed.length) {
      throw forbidden(`Tarjimon faqat ${s.locale} tilidagi matnni oʻzgartiradi; umumiy maydonlar oʻzgarmaydi (${changed.slice(0, 5).join(', ')}).`)
    }
  }
  translationGate({
    req: s.req,
    data: s.data,
    original: s.original,
    locale: s.locale,
    hashOf: (doc, l) => translationHash(doc, l),
    onApprove: (l) =>
      ((s.merged.corrections as Doc[] | undefined) ?? [])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => isBlank(r.publicText))
        .map(({ i }) => ({ path: `corrections.${i}.publicText`, message: `Tuzatish matnini ${l} tilida ham yozing.` })),
  })
}

/** The gate for glossary terms and club events, keyed on their localized content fields. */
export const translationHookFor = (fieldNames: string[]): CollectionBeforeChangeHook => {
  const hashOf = localizedContentHash(fieldNames)
  return ({ data, originalDoc, req }) => {
    const ctx = wctx(req)
    if (ctx.workflowSync || ctx.importing) return data
    translationGate({ req, data: data as Doc, original: (originalDoc ?? {}) as Doc, locale: (req.locale as string) ?? 'uz', hashOf })
    return data
  }
}

/**
 * After a correction or an update of the uz source is published (§5.6),
 * every ru/en translation that is approved (or already outdated) becomes
 * `outdated`. After a correction the stored hash is cleared as well: the read
 * gate shows an outdated translation (with the "original updated" notice)
 * only after an update, never after a correction.
 *
 * Each locale is written in its own call (an update with `locale: 'all'`
 * writes nothing localized, PHASE0 item 6), as a publish of the version just
 * written, through an isolated request so the outer save's locale and
 * context are untouched (payloadcms#18246). The workflow hooks skip these
 * writes (`workflowSync`).
 */
export async function markTranslationsOutdated(req: PayloadRequest, id: Id, hidden: boolean): Promise<void> {
  const all = (await req.payload.findByID({
    collection: 'articles',
    id,
    draft: true,
    locale: 'all',
    depth: 0,
    overrideAccess: true,
    req: isolatedWrite(req),
  })) as unknown as Doc
  const tr = (all.translation ?? {}) as Record<string, Doc | undefined>
  for (const l of TRANSLATED) {
    const status = tr[l]?.status
    if (status !== 'approved' && status !== 'outdated') continue
    if (status === 'outdated' && (!hidden || !tr[l]?.contentHash)) continue
    await req.payload.update({
      collection: 'articles',
      id,
      locale: l,
      draft: false,
      data: { _status: 'published', translation: { ...tr[l], status: 'outdated', ...(hidden ? { contentHash: null } : {}) } } as never,
      overrideAccess: true,
      req: isolatedWrite(req),
      context: { workflowSync: 'translation-outdated' },
    })
  }
}
