/**
 * The inline markup of `RichText` fields (see ./types.ts):
 *
 *   **bold**   *italic*   [label](/path or https://…)   [[glossary-slug|label]]   {en:English words}
 *
 * One tokenizer for every reader and writer of the markup: the renderer
 * (components/ui/InlineText.tsx), the importer (payload/lexical/fromMarkup.ts)
 * and the serializer's round-trip check (payload/lexical/serialize.ts). The
 * markup has no escape character, so they must all split text the same way.
 *
 * `text.split(TOKEN)` returns plain text at even indexes and whole tokens at
 * odd ones. The pattern carries the `g` flag for split(); never call
 * exec() or test() on it directly (lastIndex is shared state).
 */
export const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[\[[^|\]]+\|[^\]]+\]\]|\[[^\]]+\]\([^)\s]+\)|\{en:[^}]+\})/g

/** A whole `[label](href)` token, with the label and the target as groups 1 and 2. */
export const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/
