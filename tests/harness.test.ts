import { afterAll, describe, expect, it } from 'vitest'

import { addOfficialDomains, staff, testPayload } from './helpers/payload'

describe('test harness', () => {
  it('boots Payload against a test database as the data-only role', async () => {
    const payload = await testPayload()
    const reporter = await staff('reporter')
    expect(reporter.role).toBe('reporter')
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    expect(totalDocs).toBeGreaterThan(0)
  })

  it('adds to the shared official-domains list without losing a concurrent addition', async () => {
    const payload = await testPayload()
    const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const mine = Array.from({ length: 6 }, (_, i) => `h${i}-${run}.uz`)
    // Side by side, as parallel test files do: each read-merge-write waits for the one before it.
    await Promise.all(mine.map((d) => addOfficialDomains([d])))
    const rules = (await payload.findGlobal({ slug: 'editorial-rules', depth: 0, overrideAccess: true })) as { officialSourceDomains?: { domain: string }[] | null }
    expect((rules.officialSourceDomains ?? []).map((d) => d.domain)).toEqual(expect.arrayContaining(mine))
  })
  afterAll(async () => (await testPayload()).destroy())
})
