import type { Locale } from './config'
import { toCyrillic } from './translit'

/**
 * Interface strings. Each section of the site keeps its own message file
 * (src/i18n/messages/*.ts) with `uz`, `ru` and `en` trees of the same shape.
 * The Cyrillic edition (`kr`) is transliterated from `uz` automatically;
 * pass `kr` overrides only where transliteration needs a human touch.
 */

type Fn = (...args: never[]) => string
export type MessageTree = { [key: string]: string | readonly string[] | Fn | MessageTree }

/** Same shape as T but with string literals widened, so ru/en can differ. */
export type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends Fn
      ? T
      : { [K in keyof T]: Widen<T[K]> }

type DeepPartial<T> = T extends string | readonly string[] | Fn ? T : { [K in keyof T]?: DeepPartial<T[K]> }

export interface MessageSet<T extends MessageTree> {
  uz: T
  ru: Widen<T>
  en: Widen<T>
  kr?: DeepPartial<Widen<T>>
}

export function defineMessages<T extends MessageTree>(set: MessageSet<T>): MessageSet<T> {
  return set
}

function cyr<T>(value: T): T {
  if (typeof value === 'string') return toCyrillic(value) as T
  if (typeof value === 'function') {
    const fn = value as unknown as (...a: unknown[]) => string
    return ((...args: unknown[]) => toCyrillic(fn(...args))) as T
  }
  if (Array.isArray(value)) return value.map(cyr) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = cyr(v)
    return out as T
  }
  return value
}

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return (over ?? base) as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    out[k] = merge((base as Record<string, unknown>)[k], v)
  }
  return out as T
}

const krCache = new WeakMap<object, unknown>()

/** Resolve a message set for a locale. */
export function pick<T extends MessageTree>(set: MessageSet<T>, locale: Locale): Widen<T> {
  if (locale === 'ru') return set.ru
  if (locale === 'en') return set.en
  if (locale === 'uz') return set.uz as unknown as Widen<T>
  let kr = krCache.get(set) as Widen<T> | undefined
  if (!kr) {
    kr = merge(cyr(set.uz) as unknown as Widen<T>, set.kr)
    krCache.set(set, kr)
  }
  return kr
}
