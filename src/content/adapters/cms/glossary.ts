/**
 * The glossary from Payload (CMS-SPEC §3.8). Rich text is serialized with the
 * inline editor's rules: `definition` and `practice` one string per
 * paragraph, `origin` and `example.text` a single paragraph. ru/en show a
 * translation only when it passes the gate (§6.3), hashed the way the
 * translation hook hashed it.
 */
import type { Payload } from 'payload'

import type { Locale } from '@/i18n/config'
import { serializeParagraphs, type LexicalState } from '@/payload/lexical/serialize'
import { localizedContentHash } from '@/payload/hooks/workflow/translation'
import type { GlossaryCategory, GlossaryTerm } from '../../types'
import type { Localized } from '../../views'
import { readAs, type Reader } from './client'
import { at, clean, contentLangOf, cyrillic, text, textAt, translationGate, type Doc, type Loc } from './locale'
import { serializeContext, slugList, type Refs } from './refs'

/** The localized fields the glossary's translation hook hashes (src/payload/hooks/concerns/workflow.ts). */
export const GLOSSARY_TRANSLATED = ['short', 'definition', 'origin', 'practice', 'steps', 'example']
const glossaryHash = localizedContentHash(GLOSSARY_TRANSLATED)

/** The value of each listed field in one locale, as the hook saw the document. */
export const localeValues = (doc: Doc, fields: string[], l: Loc): Doc => Object.fromEntries(fields.map((f) => [f, at(doc[f], l) ?? null]))

export async function fetchTermDocs(payload: Payload, reader: Reader, slug?: string): Promise<Doc[]> {
  const { docs } = await payload.find({
    collection: 'glossary-terms',
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    pagination: false,
    sort: 'term',
    select: {
      slug: true,
      term: true,
      aliases: true,
      category: true,
      short: true,
      definition: true,
      origin: true,
      practice: true,
      steps: true,
      example: true,
      related: true,
      translation: true,
    } as never,
    ...(slug ? { where: { slug: { equals: slug } } } : {}),
    ...readAs(reader),
  })
  return docs as unknown as Doc[]
}

function termGate(doc: Doc, l: 'ru' | 'en', reader: Reader) {
  if (reader.kind === 'preview') return textAt(doc.short, l) ? 'approved' : undefined
  return translationGate(at(doc.translation, l), () => glossaryHash(localeValues(doc, GLOSSARY_TRANSLATED, l), l))
}

export function termView(doc: Doc, locale: Locale, refs: Refs, reader: Reader): Localized<GlossaryTerm> | undefined {
  const slug = text(doc.slug)
  const term = text(doc.term)
  if (!slug || !term) return undefined
  const translated = locale === 'ru' || locale === 'en' ? Boolean(termGate(doc, locale, reader)) : false
  const src: Loc = translated ? (locale as 'ru' | 'en') : 'uz'
  const ctx = serializeContext(src, refs, new Map())
  const paragraphs = (v: unknown, where: string) => serializeParagraphs(at<LexicalState>(v, src), ctx, where)
  const aliases = (doc.aliases ?? {}) as Doc
  const other = Array.isArray(aliases.other) ? (aliases.other as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  const steps = ((at<Doc[]>(doc.steps, src) ?? []) as Doc[]).map((s) => text(s.text)).filter((s): s is string => Boolean(s))
  const example = (at<Doc>(doc.example, src) ?? {}) as Doc
  const exampleText = serializeParagraphs(example.text as LexicalState, ctx, 'example.text').join(' ')
  const view: GlossaryTerm = clean({
    slug,
    term,
    aliases: clean({ ru: text(aliases.ru), en: text(aliases.en), ar: text(aliases.ar), other: other.length ? other : undefined }),
    category: doc.category as GlossaryCategory,
    short: textAt(doc.short, src) ?? '',
    definition: paragraphs(doc.definition, 'definition'),
    origin: paragraphs(doc.origin, 'origin').join(' '),
    practice: paragraphs(doc.practice, 'practice'),
    steps: steps.length ? steps : undefined,
    example: text(example.title) || exampleText ? { title: text(example.title) ?? '', text: exampleText } : undefined,
    related: slugList(refs.term, doc.related),
  })
  if (!view.origin) view.origin = ''
  const out = locale === 'kr' ? cyrillic(view) : view
  return { ...out, contentLang: contentLangOf(locale, translated) }
}

/** The glossary of one edition, sorted the way the mock glossary is (Uzbek collation; Cyrillic on /kr). */
export function glossaryOf(docs: Doc[], locale: Locale, refs: Refs, reader: Reader): Localized<GlossaryTerm>[] {
  return docs
    .map((d) => termView(d, locale, refs, reader))
    .filter((t): t is Localized<GlossaryTerm> => Boolean(t))
    .sort((a, b) => a.term.localeCompare(b.term, locale === 'kr' ? 'uz-Cyrl' : 'uz'))
}
