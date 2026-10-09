import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Unit and integration tests. Integration tests boot Payload through the Local
 * API against a database made by scripts/test-db.sh; set DATABASE_URL to the
 * line it prints, e.g.
 *   DATABASE_URL=$(scripts/test-db.sh mine | cut -d= -f2-) npm test
 */
export default defineConfig({
  resolve: {
    alias: {
      '@payload-config': path.resolve('src/payload.config.ts'),
      '@': path.resolve('src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    setupFiles: ['tests/helpers/env.ts'],
  },
})
