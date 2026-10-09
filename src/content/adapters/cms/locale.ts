/**
 * Read-time localisation of CMS documents (CMS-SPEC §6.4, §6.5).
 *
 * Documents are read with `locale: 'all'` and `fallbackLocale: false`, so a
 * localized field comes back as `{ uz, ru, en }` and a missing translation
 * stays empty; this module picks the values for one edition:
 * - uz: the Uzbek values;
 * - ru/en: that language when its translation passes the gate (§6.3),
 *   otherwise the Uzbek original with contentLang 'uz', as before the CMS;
 * - kr: the Uzbek values transliterated (deepCyrillic), never a Payload locale.
 */
import type { ContentLang, Locale } from '@/i18n/config'
import { deepCyrillic, setTranslitExceptions, type TranslitExceptions } from '@/i18n/translit'

export type Loc = 'uz' | 'ru' | 'en'
export type Doc = Record<string, unknown>

/** The value of a localized field in one locale, from a `locale: 'all'` read. */
export function at<T = unknown>(value: unknown, l: Loc): T | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const v = (value as Partial<Record<Loc, unknown>>)[l]
  return v === null || v === undefined ? undefined : (v as T)
}

/** A non-empty trimmed string, or undefined. */
export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

export const textAt = (value: unknown, l: Loc) => text(at(value, l))

/** The source locale of an edition: Cyrillic is made from Uzbek. */
export const sourceOf = (locale: Locale): Loc => (locale === 'kr' ? 'uz' : locale)

export function contentLangOf(locale: Locale, translated: boolean): ContentLang {
  if (locale === 'kr') return 'uz-Cyrl'
  if ((locale === 'ru' || locale === 'en') && translated) return locale
  return 'uz'
}

export type GateResult = 'approved' | 'outdated' | undefined

/**
 * The translation gate (§6.3): the ru/en text is shown only when its status
 * is `approved`, or `outdated` after an update, and the stored contentHash
 * still matches the text. After a correction the hook clears the hash, so an
 * outdated translation is hidden then. `hashOf` computes the hash the
 * translation hook stored, from this locale's values.
 *
 * `hashOf` is undefined for collections without the translation hook
 * (institutions, milestones): nothing computes a hash for them, so their
 * status alone decides.
 */
export function translationGate(translation: unknown, hashOf: (() => string) | undefined): GateResult {
  const tr = (translation ?? {}) as { status?: string | null; contentHash?: string | null }
  if (tr.status !== 'approved' && tr.status !== 'outdated') return undefined
  if (hashOf && (!tr.contentHash || tr.contentHash !== hashOf())) return undefined
  return tr.status
}

/** Drop undefined, null and empty-string values, so views match hand-written mock objects. */
export function clean<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) {
    const v = o[k]
    if (v === undefined || v === null || v === '') delete o[k]
  }
  return o
}

// ── Cyrillic ────────────────────────────────────────────────────────────────

/**
 * deepCyrillic of a Latin view, then putting back the values that are not
 * prose and that deepCyrillic does not know to skip (dates, codes and
 * numbers added for the CMS). `keep` lists their paths, e.g. 'withdrawn.at'.
 */
export function cyrillic<T extends object>(view: T, keep: string[] = []): T {
  const out = deepCyrillic(view)
  for (const path of keep) {
    const parts = path.split('.')
    let src: unknown = view
    let dst: unknown = out
    for (const p of parts.slice(0, -1)) {
      src = (src as Doc | undefined)?.[p]
      dst = (dst as Doc | undefined)?.[p]
    }
    const last = parts[parts.length - 1]
    if (src && dst && typeof src === 'object' && typeof dst === 'object' && last in (src as Doc)) {
      ;(dst as Doc)[last] = (src as Doc)[last]
    }
  }
  return out
}

/** Load the editor-maintained transliteration exceptions before Cyrillic output is made. */
export function applyTranslitRules(rules: TranslitExceptions | undefined) {
  setTranslitExceptions(rules)
}
