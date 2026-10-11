import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Unit and integration tests. Integration tests boot Payload through the Local
 * API against a database made by scripts/test-db.sh; set DATABASE_URL to the
 * line it prints, e.g.
 *   DATABASE_URL=$(scripts/test-db.sh mine | cut -d= -f2-) npm test
 */
/**
 * The home page is one document shared by every test file in a run. These
 * files write it (some park an invalid draft in it on purpose), and Payload
 * validates the whole document on each write, so they run one after another,
 * after the parallel files (Vitest runs a single-worker project last).
 * tests/adapter/labels.test.ts runs here too: it sets the site-settings labels
 * and reads them back. Everything else runs in parallel, including
 * tests/import/import.test.ts, which writes a home page in a database of its
 * own: it is the slowest file, and running it last added three minutes.
 */
const HOME_PAGE_FILES = [
  'tests/adapter/labels.test.ts',
  'tests/delivery/pipeline.test.ts',
  'tests/redteam/home2.test.ts',
  'tests/redteam/proxy2.test.ts',
  'tests/redteam/write2.test.ts',
  'tests/security/auth.test.ts',
  'tests/security/readonly.test.ts',
  'tests/validate/cms.test.ts',
  'tests/workflow/globals.test.ts',
]

const common = {
  environment: 'node' as const,
  pool: 'forks' as const,
  testTimeout: 60_000,
  hookTimeout: 120_000,
  setupFiles: ['tests/helpers/env.ts'],
}

export default defineConfig({
  resolve: {
    alias: {
      '@payload-config': path.resolve('src/payload.config.ts'),
      '@': path.resolve('src'),
    },
  },
  test: {
    projects: [
      { extends: true, test: { ...common, name: 'parallel', include: ['tests/**/*.test.ts'], exclude: HOME_PAGE_FILES } },
      { extends: true, test: { ...common, name: 'home-page', include: HOME_PAGE_FILES, fileParallelism: false } },
    ],
  },
})
