import type { Payload } from 'payload'

import type { ImageRef, RubricSlug } from '../../content/types'
import { editorNodes, type ImportCtx } from '../lexical/fromMarkup'
import type { Id, ImportLog } from './shared'

/**
 * The lookups fromMarkup needs (CMS-SPEC §11.3): glossary slugs, Media items
 * and internal link targets, resolved to the ids this import wrote.
 */
export interface Refs {
  glossary: Map<string, Id>
  /** `rubric/slug` → article id. */
  articles: Map<string, Id>
  media(ref: Pick<ImageRef, 'src' | 'alt'>): Id | undefined
}

const RUBRICS: RubricSlug[] = ['yangiliklar', 'tahlil', 'intervyu', 'izoh', 'dunyo']
const TERM_PATH = /^\/lugat\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
const ARTICLE_PATH = new RegExp(`^/(${RUBRICS.join('|')})/([a-z0-9]+(?:-[a-z0-9]+)*)$`)

export function markupCtx(payload: Payload, refs: Refs, log: ImportLog, where: string): ImportCtx {
  const { articleNodes, inlineNodes } = editorNodes(payload)
  return {
    articleNodes,
    inlineNodes,
    glossaryId: (slug) => refs.glossary.get(slug),
    mediaId: (src) => refs.media({ src, alt: '' }),
    internalDoc(path) {
      const term = TERM_PATH.exec(path)
      if (term) {
        const id = refs.glossary.get(term[1])
        return id === undefined ? undefined : { relationTo: 'glossary-terms', value: id }
      }
      const article = ARTICLE_PATH.exec(path)
      if (article) {
        const id = refs.articles.get(`${article[1]}/${article[2]}`)
        return id === undefined ? undefined : { relationTo: 'articles', value: id }
      }
      return undefined
    },
    warn: (msg) => log.warn(`${where}: ${msg}`),
  }
}
