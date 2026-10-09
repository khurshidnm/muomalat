import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

/**
 * G2 (CMS-SPEC §16): `scripts/validate-content.ts` prints byte for byte what it
 * printed before its rules moved into src/content/rules.ts. The golden files
 * are the script's output on the mock data, recorded with the pre-move script
 * for the full run and for every scope argument.
 */
const run = promisify(execFile)
const root = path.resolve(__dirname, '../..')
const SCOPES = ['all', 'articles', 'glossary', 'market', 'club', 'messages', 'kr']

describe('validator script on the mock data', () => {
  for (const scope of SCOPES) {
    it(`${scope}: output unchanged, 0 errors and 0 warnings`, async () => {
      const args = ['tsx', 'scripts/validate-content.ts', ...(scope === 'all' ? [] : [scope])]
      const { stdout } = await run('npx', args, { cwd: root, env: { ...process.env, DATABASE_URL: '' } })
      expect(stdout).toBe(readFileSync(path.join(__dirname, 'golden', `validate-${scope}.txt`), 'utf8'))
      expect(stdout).toContain('0 errors, 0 warnings')
    }, 120_000)
  }
})
