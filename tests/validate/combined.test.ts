import { createLocalReq, type PayloadRequest } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { checkHandler } from '@/payload/endpoints/check'
import type { StoredChecks } from '@/payload/hooks/validate/shared'
import { staff, testPayload } from '../helpers/payload'
import { p, root, run, text } from './fixtures'

/**
 * The validation concern with every other concern registered (no isolation):
 * draft saves store their findings, unloadable rich text is refused, and the
 * check endpoint's acknowledge action saves through the workflow's guards.
 * Publishing itself goes through the workflow (approval, two-person rule) and
 * is covered with the concern isolated in cms.test.ts.
 */
type Doc = Record<string, unknown>

afterAll(async () => (await testPayload()).destroy())

describe('validation alongside the other concerns', () => {
  it('the admin create view saves an empty draft for every role that writes stories', async () => {
    // Payload's create view with autosave creates the document at once, with no title and no slug
    // (views/Document: payload.create({ data: {}, draft: true, overrideAccess: false })), then redirects to it.
    const payload = await testPayload()
    for (const role of ['reporter', 'editor', 'eic', 'commercial'] as const) {
      const user = await staff(role, `combined-${role}`)
      const doc = (await payload.create({ collection: 'articles', data: {}, depth: 0, draft: true, fallbackLocale: false, locale: 'uz', overrideAccess: false, user })) as unknown as Doc
      expect([role, typeof doc.id]).toEqual([role, 'number'])
      expect(doc.workflowStatus).toBe('idea')
    }
  })


  it('a draft save stores findings; a quote node is refused; acknowledging saves a draft', async () => {
    const payload = await testPayload()
    const editor = await staff('editor')
    const created = (await payload.create({
      collection: 'articles',
      data: { title: `Birga sinov ${run}`, slug: `birga-${run}`, lead: "Lid o'z holicha.", body: root(p('Matn.')), _status: 'draft' } as never,
      draft: true,
      overrideAccess: true,
    })) as unknown as Doc
    const checks = created.validationWarnings as StoredChecks
    expect(checks.gate).toBe('draft')
    expect(checks.findings.find((f) => f.rule === 'TXT-1')).toMatchObject({ level: 'error', field: 'lead' })

    await expect(
      payload.update({
        collection: 'articles',
        id: created.id as number,
        data: { body: root({ type: 'quote', children: [text('Iqtibos')], direction: 'ltr', format: '', indent: 0, version: 1 }) } as never,
        draft: true,
        overrideAccess: true,
      }),
    ).rejects.toMatchObject({ data: { errors: [expect.objectContaining({ path: 'body' })] } })

    const warning = checks.findings.find((f) => f.level === 'warning')!
    const req = (await createLocalReq({ user: { ...editor, collection: 'users' } as never }, payload)) as PayloadRequest
    req.routeParams = { id: String(created.id) }
    req.data = { acknowledge: [warning.key] }
    const res = await checkHandler(req)
    const body = (await res.json()) as { checks?: StoredChecks; message?: string }
    expect(res.status, body.message).toBe(200)
    expect(body.checks?.findings.find((f) => f.key === warning.key)?.acknowledged).toBeTruthy()
  })
})
