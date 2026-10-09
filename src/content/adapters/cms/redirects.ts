/**
 * Old addresses (CMS-SPEC §8.8): the `redirects` collection, created from
 * `slugHistory` by the workflow concern, by the import and by hand. A
 * reference target resolves to the document's current path in the edition of
 * the old address; a custom target is used as written (a site path or https).
 */
import type { Payload } from 'payload'

import { localePath, splitLocale } from '@/i18n/config'
import { PUBLIC, readAs } from './client'
import { text, type Doc } from './locale'
import { idOf } from './media'
import type { Refs } from './refs'

/** `from` → target; a target starting with `~` is locale-free and gets the edition of `from`. */
export type RedirectMap = [string, string][]

const LOCALE_FREE = '~'

/** Trailing slashes and case of the old path do not matter. */
export const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path).toLowerCase()

export async function loadRedirects(payload: Payload, refs: Refs): Promise<RedirectMap> {
  const [{ docs }, events] = await Promise.all([
    payload.find({ collection: 'redirects', depth: 0, pagination: false, ...readAs(PUBLIC) }),
    payload.find({ collection: 'club-events', depth: 0, pagination: false, select: { slug: true }, ...readAs(PUBLIC) }),
  ])
  const club = new Map((events.docs as { id: number; slug?: string | null }[]).filter((d) => d.slug).map((d) => [String(d.id), d.slug as string]))
  const out: RedirectMap = []
  for (const r of docs as unknown as Doc[]) {
    const from = text(r.from)
    if (!from?.startsWith('/') || from.startsWith('//')) continue
    const to = (r.to ?? {}) as Doc
    let target: string | undefined
    if (to.type === 'custom') {
      const url = text(to.url)
      if (url && ((url.startsWith('/') && !url.startsWith('//')) || url.startsWith('https://'))) target = url
    } else {
      const ref = (to.reference ?? {}) as { relationTo?: string; value?: unknown }
      const id = String(idOf(ref.value))
      const path =
        ref.relationTo === 'articles'
          ? (() => {
              const a = refs.article.get(id)
              return a ? `/${a.rubric}/${a.slug}` : undefined
            })()
          : ref.relationTo === 'glossary-terms'
            ? refs.term.get(id) && `/lugat/${refs.term.get(id)}`
            : ref.relationTo === 'club-events'
              ? club.get(id) && `/klub/${club.get(id)}`
              : ref.relationTo === 'authors'
                ? refs.author.get(id) && `/muallif/${refs.author.get(id)}`
                : ref.relationTo === 'tags'
                  ? refs.tag.get(id) && `/mavzu/${refs.tag.get(id)}`
                  : undefined
      if (path) target = `${LOCALE_FREE}${path}`
    }
    if (target) out.push([normalizePath(from), target])
  }
  return out
}

/** The public path an old address redirects to, if the map has it. */
export function redirectTarget(map: RedirectMap, path: string): string | undefined {
  const found = map.find(([from]) => from === normalizePath(path))?.[1]
  if (!found) return undefined
  if (!found.startsWith(LOCALE_FREE)) return found
  const { locale } = splitLocale(path)
  return localePath(locale, found.slice(1))
}
