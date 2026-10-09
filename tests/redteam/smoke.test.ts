import { beforeAll, describe, expect, it } from 'vitest'

import { account, cookieOf, rest, type U } from './harness'

describe('redteam smoke', () => {
  let reporter: U
  beforeAll(async () => {
    reporter = await account('reporter', 'smoke-reporter')
  })

  it('a reporter can log in and read published articles', async () => {
    const cookie = await cookieOf(reporter)
    const r = await rest('GET', '/api/articles?depth=0', { cookie })
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.docs)).toBe(true)
  })

  it('GraphQL is disabled on every verb', async () => {
    for (const method of ['GET', 'POST']) {
      const r = await rest(method, '/api/graphql', { body: method === 'POST' ? { query: '{ Articles { docs { id } } }' } : undefined })
      expect([method, r.status === 404 || r.status === 400 || r.status >= 500]).toEqual([method, true])
    }
    const playground = await rest('GET', '/api/graphql-playground')
    expect(playground.status === 404 || playground.status === 400).toBe(true)
  })
})
