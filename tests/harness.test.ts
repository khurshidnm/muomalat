import { afterAll, describe, expect, it } from 'vitest'

import { staff, testPayload } from './helpers/payload'

describe('test harness', () => {
  it('boots Payload against a test database as the data-only role', async () => {
    const payload = await testPayload()
    const reporter = await staff('reporter')
    expect(reporter.role).toBe('reporter')
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    expect(totalDocs).toBeGreaterThan(0)
  })
  afterAll(async () => (await testPayload()).destroy())
})
