/**
 * Lexical JSON → the front-end contract (CMS-SPEC §3.4): `ArticleBlock[]` for
 * the article body and the `RichText` inline markup everywhere else. A pure
 * function with no I/O: the caller loads the document, the media and the link
 * targets, and passes them in `ctx`.
 *
 *   serializeBody(state, ctx): ArticleBlock[]
 *   serializeInline(nodes, ctx): RichText            one paragraph
 *   serializeParagraphs(state, ctx): RichText[]      qa.answer, glossary definition…
 *
 * Findings go through `ctx.warn(code, message)` with the rule ids of §7.2; the
 * caller decides their level (ART-20 and ART-21 are errors for some cases).
 * The serializer itself never throws: extra format bits and element `format`
 * (alignment from a paste) are ignored, as the spec requires.
 */
import { TOKEN } from '../../content/markup'
import type { ArticleBlock, ChartSpec, ImageRef, RichText, TableColumn } from '../../content/types'

type Id = string | number
type Loc = 'uz' | 'ru' | 'en'
export type LexicalNode = { type: string; children?: LexicalNode[]; [k: string]: unknown }
export type LexicalState = { root: LexicalNode } | null | undefined
type Localized<T> = T | Partial<Record<Loc, T>>

/** A media document as read with `locale: 'all'` (localized fields keyed by locale) or in one locale. */
export interface MediaDoc {
  id: Id
  url?: string | null
  width?: number | null
  height?: number | null
  alt?: Localized<string | null>
  credit?: Localized<string | null>
  caption?: Localized<string | null>
}

export interface SerializeCtx {
  locale: Loc
  /**
   * A populated document or a bare id → its public path, slug and whether it is
   * published. Returns undefined for a target that is not visible: at depth ≥ 1
   * a bare id means the target is unpublished or deleted (CMS-SPEC §6.5).
   */
  resolveDoc(rel: { relationTo: string; value: unknown }): { path: string; slug: string; published: boolean } | undefined
  mediaById: Map<Id, MediaDoc>
  warn(code: string, message: string): void
}

const BOLD = 1
const ITALIC = 2

const idOf = (v: unknown): Id | undefined =>
  v && typeof v === 'object' ? ((v as { id?: Id }).id ?? undefined) : ((v as Id | undefined) ?? undefined)

function pick<T>(v: Localized<T> | undefined, locale: Loc): T | undefined {
  if (v === null || v === undefined) return undefined
  if (typeof v === 'object' && !Array.isArray(v) && ('uz' in (v as object) || 'ru' in (v as object) || 'en' in (v as object))) {
    return ((v as Partial<Record<Loc, T>>)[locale] ?? undefined) as T | undefined
  }
  return v as T
}

/** Drop undefined / null / '' so the output matches hand-written mock objects. */
function clean<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) {
    const v = o[k]
    if (v === undefined || v === null || v === '') delete o[k]
  }
  return o
}

export function plainText(nodes: LexicalNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'text') return n.text as string
      if (n.type === 'linebreak' || n.type === 'tab') return ' '
      if (n.type === 'inlineBlock') {
        const f = n.fields as Record<string, unknown>
        return (f.blockType === 'glossaryLink' ? f.label : f.text) as string
      }
      return plainText(n.children)
    })
    .join('')
}

/**
 * Visits every node of a stored tree, including the rich text nested in block
 * fields (qa.answer, callout.text). Used by the hooks that derive `terms` and
 * `mediaRefs` from the body.
 */
export function forEachNode(state: LexicalState, visit: (node: LexicalNode) => void): void {
  const walk = (node: LexicalNode) => {
    visit(node)
    if ((node.type === 'block' || node.type === 'inlineBlock') && node.fields && typeof node.fields === 'object') {
      for (const v of Object.values(node.fields as Record<string, unknown>)) {
        if (v && typeof v === 'object' && 'root' in (v as object)) walk((v as { root: LexicalNode }).root)
      }
    }
    for (const c of node.children ?? []) walk(c)
  }
  if (state?.root) walk(state.root)
}

// ── inline ──────────────────────────────────────────────────────────────────
type Seg = { kind: 'text'; format: number; text: string } | { kind: 'raw'; text: string; token: boolean }

/** Wrap with markers, keeping edge whitespace outside so the TOKEN pattern still matches. */
function wrap(text: string, marker: string): string {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  return m[2] ? `${m[1]}${marker}${m[2]}${marker}${m[3]}` : text
}

const isSiteOrHttps = (url: string) => /^https:\/\//.test(url) || /^\/(?!\/)/.test(url)

export function serializeInline(nodes: LexicalNode[] = [], ctx: SerializeCtx, where = ''): RichText {
  const segs: Seg[] = []
  const pushText = (text: string, format: number) => {
    const last = segs[segs.length - 1]
    if (last?.kind === 'text' && last.format === format) last.text += text
    else segs.push({ kind: 'text', format, text })
  }
  for (const n of nodes) {
    switch (n.type) {
      case 'text': {
        let f = (n.format as number) ?? 0
        if (f & ~(BOLD | ITALIC)) ctx.warn('ART-21', `${where}: qalin va kursivdan boshqa formatlash olib tashlandi`)
        f &= BOLD | ITALIC
        if (f === (BOLD | ITALIC)) {
          ctx.warn('ART-21', `${where}: qalin va kursiv birga ishlatilgan; saytda faqat qalin koʻrinadi`)
          f = BOLD
        }
        pushText(n.text as string, f)
        break
      }
      case 'linebreak':
        ctx.warn('ART-21', `${where}: qator koʻchirish saytda boʻsh joyga aylanadi; yangi xatboshi oching`)
        pushText(' ', 0)
        break
      case 'tab':
        pushText(' ', 0)
        break
      case 'link':
      case 'autolink': {
        const label = plainText(n.children)
        if ((n.children ?? []).some((c) => c.type === 'text' && ((c.format as number) ?? 0) !== 0)) {
          ctx.warn('ART-21', `${where}: «${label}» havolasi ichidagi formatlash olib tashlandi`)
        }
        const f = (n.fields ?? {}) as { linkType?: string; url?: string; doc?: { relationTo: string; value: unknown } }
        let href: string | undefined
        if (f.linkType === 'internal') {
          const r = f.doc ? ctx.resolveDoc(f.doc) : undefined
          if (!r) ctx.warn('ART-19', `${where}: «${label}» havolasi chop etilmagan yoki oʻchirilgan hujjatga olib boradi; havola olib tashlanib, matni qoldirildi`)
          else {
            if (!r.published) ctx.warn('ART-19', `${where}: «${label}» havolasi chop etilmagan hujjatga olib boradi`)
            href = r.path
          }
        } else {
          const url = f.url ?? ''
          if (isSiteOrHttps(url)) href = url
          else ctx.warn('ART-22', `${where}: «${label}» havolasi https:// yoki sayt ichidagi /yoʻl emas («${url}»); havola olib tashlanib, matni qoldirildi`)
        }
        if (href && /\]/.test(label)) ctx.warn('ART-20', `${where}: «${label}» havola matnida «]» bor; belgini olib tashlang`)
        if (href && /[)\s]/.test(href)) ctx.warn('ART-20', `${where}: «${href}» manzilida «)» yoki boʻsh joy bor; belgini olib tashlang`)
        segs.push({ kind: 'raw', text: href ? `[${label}](${href})` : label, token: Boolean(href) })
        break
      }
      case 'inlineBlock': {
        const f = n.fields as { blockType: string; term?: unknown; label?: string; text?: string }
        if (f.blockType === 'glossaryLink') {
          const r = ctx.resolveDoc({ relationTo: 'glossary-terms', value: f.term })
          if (!r) {
            ctx.warn('ART-19', `${where}: «${f.label}» lugʻat havolasi chop etilmagan yoki oʻchirilgan atamaga olib boradi; matni qoldirildi`)
            segs.push({ kind: 'raw', text: f.label ?? '', token: false })
          } else {
            if (!r.published) ctx.warn('ART-19', `${where}: «${f.label}» lugʻat havolasi chop etilmagan atamaga olib boradi`)
            if (/[|\]]/.test(f.label ?? '')) ctx.warn('ART-20', `${where}: «${f.label}» lugʻat havolasi matnida «|» yoki «]» bor; belgini olib tashlang`)
            segs.push({ kind: 'raw', text: `[[${r.slug}|${f.label}]]`, token: true })
          }
        } else if (f.blockType === 'keepLatin') {
          if (/\}/.test(f.text ?? '')) ctx.warn('ART-20', `${where}: «${f.text}» lotin matnida «}» bor; belgini olib tashlang`)
          segs.push({ kind: 'raw', text: `{en:${f.text}}`, token: true })
        } else ctx.warn('ART-21', `${where}: nomaʼlum ichki blok «${f.blockType}» olib tashlandi`)
        break
      }
      default:
        ctx.warn('ART-21', `${where}: «${n.type}» turidagi element qoʻllab-quvvatlanmaydi; faqat matni qoldirildi`)
        pushText(plainText(n.children ?? []), 0)
    }
  }
  const out = segs
    .map((s) => {
      if (s.kind === 'raw') return s.text
      if (s.format === BOLD) return wrap(s.text, '**')
      if (s.format === ITALIC) return wrap(s.text, '*')
      return s.text
    })
    .join('')
  // The markup has no escape, so re-tokenize the output the way InlineText
  // does and check that every intended token comes back, and nothing else.
  const expected = segs
    .map((s) => (s.kind === 'raw' ? (s.token ? s.text : null) : s.format ? wrap(s.text, s.format === BOLD ? '**' : '*').trim() : null))
    .filter((t): t is string => t !== null && t !== '')
  const actual = out.split(TOKEN).filter((_, i) => i % 2 === 1)
  if (expected.length !== actual.length || expected.some((t, i) => t !== actual[i])) {
    ctx.warn('ART-20', `${where}: belgilash buzilgan; sayt ${JSON.stringify(actual)} deb oʻqiydi, kutilgani ${JSON.stringify(expected)}`)
  }
  for (const s of segs) {
    if (s.kind === 'text' && s.text.split(TOKEN).length > 1) {
      ctx.warn('ART-20', `${where}: «${s.text.slice(0, 40)}» matnida sayt belgilash deb oʻqiydigan belgilar bor (*, [[, ](, {en:)`)
    }
  }
  return out
}

export function serializeParagraphs(state: LexicalState, ctx: SerializeCtx, where = ''): RichText[] {
  const out: RichText[] = []
  for (const [i, n] of (state?.root?.children ?? []).entries()) {
    if (n.type !== 'paragraph') ctx.warn('ART-21', `${where}[${i}]: «${n.type}» bu maydonda qoʻllab-quvvatlanmaydi; faqat matni qoldirildi`)
    const t = n.type === 'paragraph' ? serializeInline(n.children, ctx, `${where}[${i}]`) : plainText(n.children)
    if (t.trim() !== '') out.push(t)
  }
  return out
}

// ── body ────────────────────────────────────────────────────────────────────
function image(fields: Record<string, unknown>, ctx: SerializeCtx, where: string): ImageRef | undefined {
  const id = idOf(fields.image)
  const m = id !== undefined ? ctx.mediaById.get(id) : undefined
  if (!m) {
    ctx.warn('ART-13', `${where}: rasm topilmadi (${String(id)})`)
    return undefined
  }
  const loc = ctx.locale
  const alt = pick(m.alt, loc) ?? pick(m.alt, 'uz') ?? ''
  const translations: ImageRef['translations'] = {}
  for (const l of ['ru', 'en'] as const) {
    const a = pick(m.alt, l)
    if (a) translations[l] = clean({ alt: a, credit: pick(m.credit, l) ?? undefined })
  }
  return clean({
    src: m.url ?? '',
    alt,
    width: m.width ?? 0,
    height: m.height ?? 0,
    caption: (fields.caption as string) || pick(m.caption, loc) || undefined,
    credit: pick(m.credit, loc) ?? undefined,
    translations: Object.keys(translations).length ? translations : undefined,
  })
}

function block(n: LexicalNode, ctx: SerializeCtx, where: string): ArticleBlock | undefined {
  const f = n.fields as Record<string, unknown> & { blockType: string }
  switch (f.blockType) {
    case 'figure': {
      const img = image(f, ctx, where)
      return img ? { type: 'figure', image: img } : undefined
    }
    case 'table':
      return clean({
        type: 'table' as const,
        caption: f.caption as string,
        columns: ((f.columns as Record<string, unknown>[]) ?? []).map((c) =>
          clean({ label: c.label as string, align: (c.align as TableColumn['align']) ?? undefined, unit: (c.unit as string) ?? undefined }),
        ),
        rows: (f.rows as (string | number | null)[][]) ?? [],
        note: (f.note as string) ?? undefined,
        source: (f.source as string) ?? undefined,
      })
    case 'chart': {
      const p = (f.parsed ?? {}) as Record<string, unknown>
      const common = {
        title: f.title as string,
        subtitle: (f.subtitle as string) ?? undefined,
        unit: f.unit as string,
        source: (f.source as string) ?? undefined,
        note: (f.note as string) ?? undefined,
      }
      const chart: ChartSpec =
        f.kind === 'bar'
          ? clean({ kind: 'bar', ...common, categoryLabel: (f.categoryLabel as string) ?? undefined, data: (p.data ?? []) as never })
          : clean({ kind: 'line', ...common, xLabel: (f.xLabel as string) ?? undefined, xLabels: (p.xLabels ?? []) as never, series: (p.series ?? []) as never })
      return { type: 'chart', chart }
    }
    case 'quote':
      return clean({ type: 'quote' as const, text: f.text as string, cite: (f.cite as string) ?? undefined, role: (f.role as string) ?? undefined })
    case 'qa':
      return { type: 'qa', question: f.question as string, answer: serializeParagraphs(f.answer as LexicalState, ctx, `${where}.answer`) }
    case 'factbox':
      return clean({
        type: 'factbox' as const,
        title: f.title as string,
        items: ((f.items as Record<string, unknown>[]) ?? []).map((it) => ({ label: it.label as string, value: it.value as string })),
        note: (f.note as string) ?? undefined,
      })
    case 'callout': {
      const paras = serializeParagraphs(f.text as LexicalState, ctx, `${where}.text`)
      if (paras.length > 1) ctx.warn('ART-21', `${where}: «Maʼlumot uchun» blokida ${paras.length} ta xatboshi bor; saytda bitta xatboshiga birlashtiriladi`)
      return clean({ type: 'callout' as const, title: (f.title as string) ?? undefined, text: paras.join(' ') })
    }
    case 'term': {
      const r = ctx.resolveDoc({ relationTo: 'glossary-terms', value: f.term })
      if (!r) {
        ctx.warn('ART-19', `${where}: atama kartochkasi chop etilmagan yoki oʻchirilgan atamaga olib boradi; kartochka koʻrsatilmaydi`)
        return undefined
      }
      if (!r.published) ctx.warn('ART-19', `${where}: atama kartochkasi chop etilmagan atamaga olib boradi`)
      return { type: 'term', slug: r.slug }
    }
    default:
      ctx.warn('ART-21', `${where}: nomaʼlum blok «${f.blockType}» olib tashlandi`)
      return undefined
  }
}

export function serializeBody(state: LexicalState, ctx: SerializeCtx): ArticleBlock[] {
  const out: ArticleBlock[] = []
  for (const [i, n] of (state?.root?.children ?? []).entries()) {
    const where = `body[${i}]`
    switch (n.type) {
      case 'paragraph': {
        const text = serializeInline(n.children, ctx, where)
        if (text.trim() !== '') out.push({ type: 'p', text })
        break
      }
      case 'heading': {
        const tag = n.tag as string
        if ((n.children ?? []).some((c) => c.type !== 'text' || ((c.format as number) ?? 0) !== 0)) {
          ctx.warn('ART-21', `${where}: sarlavha ichidagi formatlash va havolalar olib tashlandi`)
        }
        const text = plainText(n.children).trim()
        if (tag !== 'h2' && tag !== 'h3') ctx.warn('ART-21', `${where}: ${tag} sarlavha h3 sifatida koʻrsatiladi`)
        if (text) out.push({ type: tag === 'h2' ? 'h2' : 'h3', text })
        break
      }
      case 'list': {
        const items: RichText[] = []
        if (n.listType === 'check') ctx.warn('ART-21', `${where}: belgilash roʻyxati (checklist) qoʻllab-quvvatlanmaydi; oddiy roʻyxatga aylantiring`)
        for (const [k, li] of (n.children ?? []).entries()) {
          if ((li.children ?? []).some((c) => c.type === 'list')) {
            ctx.warn('ART-21', `${where}.items[${k}]: ichma-ich roʻyxat qoʻllab-quvvatlanmaydi; ichki roʻyxat koʻrsatilmaydi`)
          }
          const t = serializeInline((li.children ?? []).filter((c) => c.type !== 'list'), ctx, `${where}.items[${k}]`)
          if (t.trim() !== '') items.push(t)
        }
        out.push(n.listType === 'number' ? { type: 'list', ordered: true, items } : { type: 'list', items })
        break
      }
      case 'block': {
        const b = block(n, ctx, where)
        if (b) out.push(b)
        break
      }
      default:
        ctx.warn('ART-21', `${where}: «${n.type}» turidagi element qoʻllab-quvvatlanmaydi; matni xatboshi sifatida qoldirildi`)
        if (plainText(n.children).trim()) out.push({ type: 'p', text: plainText(n.children) })
    }
  }
  return out
}
