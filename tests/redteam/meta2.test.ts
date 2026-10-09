import { afterAll, describe, expect, it } from 'vitest'

import { account, cookieOf, rest } from './harness'
import { testPayload } from '../helpers/payload'

/**
 * Config-level guards the attacks above rely on (CMS-SPEC §3.3, §6, §12.2,
 * PHASE0 item 16): the built-in Copy-to-locale and Duplicate are off on the
 * content collections, GraphQL is disabled, and the only locale-copy path is
 * the reviewed copy-from-uz endpoint.
 */

afterAll(async () => {
  await (await testPayload()).destroy()
})

describe('built-in Copy-to-locale is disabled where it would publish or copy a status (PHASE0 item 16)', () => {
  it('articles, authors and media set disableCopyToLocale', async () => {
    const payload = await testPayload()
    for (const slug of ['articles', 'authors', 'media']) {
      expect([slug, payload.collections[slug as keyof typeof payload.collections].config.admin?.disableCopyToLocale]).toEqual([slug, true])
    }
  })

  it('there is no REST copy-data-from-locale endpoint on articles', async () => {
    const eic = await account('eic', 'meta-eic')
    const cookie = await cookieOf(eic)
    for (const path of ['/api/articles/copy-data-from-locale', '/api/articles/1/copy-data-from-locale']) {
      const r = await rest('POST', path, { cookie, body: { fromLocale: 'uz', toLocale: 'ru' } })
      expect([path, r.status]).toEqual([path, 404])
    }
  })
})

describe('Duplicate is disabled where a copy would carry a record it must not', () => {
  it('articles and requests set disableDuplicate', async () => {
    const payload = await testPayload()
    for (const slug of ['articles', 'requests']) {
      expect([slug, payload.collections[slug as keyof typeof payload.collections].config.disableDuplicate]).toEqual([slug, true])
    }
  })
})

describe('GraphQL is disabled in the config (§12.2)', () => {
  it('the config carries graphQL.disable and no schema is exposed', async () => {
    const payload = await testPayload()
    expect(payload.config.graphQL?.disable).toBe(true)
    const r = await rest('POST', '/api/graphql', { body: { query: '{ __typename }' } })
    expect(r.status === 404 || r.status === 400 || r.status >= 500).toBe(true)
  })
})

describe('articles autosave interval and version retention (§5.12)', () => {
  it('autosave is explicit at 2000 ms and maxPerDoc is 0 (no pruning, legal-hold safe)', async () => {
    const payload = await testPayload()
    const versions = payload.collections['articles'].config.versions
    expect((versions as { drafts?: { autosave?: { interval?: number } } }).drafts?.autosave?.interval).toBe(2000)
    expect((versions as { maxPerDoc?: number }).maxPerDoc).toBe(0)
  })
})
