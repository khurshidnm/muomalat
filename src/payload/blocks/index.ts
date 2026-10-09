import { callout } from './callout'
import { chart } from './chart'
import { factbox } from './factbox'
import { figure } from './figure'
import { qa } from './qa'
import { quote } from './quote'
import { table } from './table'
import { term } from './term'

/** The eight article body blocks, in the order the editor's block menu lists them (CMS-SPEC §3.4). */
export const articleBlocks = [figure, table, chart, quote, qa, factbox, callout, term]

export { callout, chart, factbox, figure, qa, quote, table, term }
export { glossaryLink, inlineBlocks, inlineEditor, keepLatin } from './inline'
