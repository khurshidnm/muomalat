import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * A12 (CMS-SPEC §4.3): every Local API call passes `overrideAccess`
 * explicitly, ready for the Payload 4 default flip. A static scan of src/ and
 * scripts/: each call on a Payload instance (`payload.find(…)`,
 * `req.payload.update(…)`, …) must name `overrideAccess` in its arguments.
 * Database-adapter calls (`payload.db.*`) are not Local API calls.
 */
const ROOTS = ['src', 'scripts']
const METHODS = [
  'find',
  'findByID',
  'findDistinct',
  'create',
  'update',
  'delete',
  'duplicate',
  'count',
  'countVersions',
  'findVersions',
  'findVersionByID',
  'restoreVersion',
  'findGlobal',
  'updateGlobal',
  'findGlobalVersions',
  'findGlobalVersionByID',
  'restoreGlobalVersion',
  'countGlobalVersions',
]
const CALL = new RegExp(`\\b(?:[\\w.]*\\.)?payload\\.(${METHODS.join('|')})\\(`, 'g')

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'migrations' ? [] : files(full)
    return /\.(ts|tsx|mts)$/.test(e.name) && !e.name.endsWith('.d.ts') && e.name !== 'payload-types.ts' ? [full] : []
  })
}

/** The text of a call's argument list, from the opening parenthesis to its match. */
function argumentsAt(source: string, open: number): string {
  let depth = 0
  for (let i = open; i < source.length; i++) {
    const c = source[i]
    if (c === '(') depth++
    else if (c === ')' && --depth === 0) return source.slice(open + 1, i)
  }
  return source.slice(open + 1)
}

/** Blank out comments, keeping line numbers, so prose that quotes a call is not flagged. */
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\w])\/\/.*$/gm, '$1')

/** Calls in one file's source that leave overrideAccess to the default. */
function scan(file: string, text: string): string[] {
  const source = stripComments(text)
  const found: string[] = []
  for (const match of source.matchAll(CALL)) {
    const args = argumentsAt(source, match.index! + match[0].length - 1)
    // A spread (`...options`) or a bare options variable may carry it; the scan cannot see through one.
    if (/\boverrideAccess\b/.test(args) || /\.\.\.[\w.(]/.test(args) || /^\s*[\w.]+\s*$/.test(args)) continue
    found.push(`${file}:${source.slice(0, match.index).split('\n').length} ${match[0]}`)
  }
  return found
}

describe('A12: explicit overrideAccess', () => {
  it('no Local API call in src/ or scripts/ leaves overrideAccess to the default', () => {
    const all = ROOTS.flatMap((root) => (fs.existsSync(root) ? files(root) : []))
    expect(all.length).toBeGreaterThan(50)
    expect(all.flatMap((file) => scan(file, fs.readFileSync(file, 'utf8')))).toEqual([])
  })

  it('the scan flags a call without it and ignores comments, spreads and the adapter', () => {
    const sample = [
      "await req.payload.find({ collection: 'articles', where })",
      "await payload.update({ collection: 'tags', id, data, overrideAccess: false })",
      "// payload.create({ collection: 'audit-log' }) in a comment",
      "await payload.db.updateOne({ collection: 'users', id, data })",
      'await payload.findByID({ ...options, id })',
      "const x = await args.req.payload.findGlobal({\n  slug: 'site-settings',\n  depth: 0,\n})",
    ].join('\n')
    expect(scan('sample.ts', sample)).toEqual(['sample.ts:1 req.payload.find(', 'sample.ts:6 args.req.payload.findGlobal('])
  })
})

describe('K14 (local part): pinned Payload versions', () => {
  it('payload and every @payloadcms/* package share one exact version, at least 3.90.2', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> }
    const versions = Object.entries(pkg.dependencies).filter(([name]) => name === 'payload' || name.startsWith('@payloadcms/'))
    expect(versions.length).toBeGreaterThan(5)
    const set = new Set(versions.map(([, v]) => v))
    expect(set.size).toBe(1)
    const [version] = [...set]
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    const [major, minor, patch] = version.split('.').map(Number)
    expect(major * 1e6 + minor * 1e3 + patch).toBeGreaterThanOrEqual(3 * 1e6 + 90 * 1e3 + 2)
    // The installed packages match the pins.
    for (const [name] of versions) {
      expect([name, JSON.parse(fs.readFileSync(`node_modules/${name}/package.json`, 'utf8')).version]).toEqual([name, version])
    }
  })
})
