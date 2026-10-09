// Normalise Uzbek date orthography in content data files:
//   oktyabr/sentyabr → oktabr/sentabr · "8 oktabr" → "8-oktabr" · "2026 yil" → "2026-yil"
// Usage: node scripts/normalize-dates.mjs <file...>
import { readFileSync, writeFileSync } from 'node:fs'
const MONTHS = 'yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr'
let total = 0
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8')
  let out = src
    .replace(/([Oo])ktyabr/g, '$1ktabr')
    .replace(/([Ss])entyabr/g, '$1entabr')
    .replace(new RegExp(`\\b(\\d{1,2}) (${MONTHS})(?=[a-zʻʼ]*\\b)`, 'g'), '$1-$2')
    .replace(/\b(\d{4}) (yil)(?=[a-zʻʼ]*\b)/g, '$1-$2')
  const n = [...src].length === [...out].length && src === out ? 0 : 1
  if (out !== src) {
    writeFileSync(file, out)
    const diff = src.split('\n').filter((l, i) => l !== out.split('\n')[i]).length
    console.log(`${file}: ${diff} lines changed`)
    total += diff
  }
}
console.log(`done, ${total} lines changed`)
