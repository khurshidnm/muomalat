import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createLocalReq } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { deliverAlerts } from '@/payload/audit/alerts'
import { checkChain, verifyChain } from '@/payload/audit/chain'
import { directoryTarget, exportAuditDays, exportLine } from '@/payload/audit/export'
import { canonicalJSON, hashRow } from '@/payload/audit/hash'
import { truncateOldIps } from '@/payload/audit/retention'
import { recordAudit, recordSystemAudit } from '@/payload/audit/writer'
import { createHash } from 'node:crypto'
import { testPayload } from '../helpers/payload'
import { asApp, asOwner, drainAlerts, mockTransport, rows, tag } from './helpers'

/**
 * The append-only table and its hash chain (CMS-SPEC §9.1): J2, J3, the
 * nightly export and IP truncation. Tests in this file run in order: the
 * last ones tamper with rows as the owner role.
 */
describe('audit chain', () => {
  afterAll(async () => (await testPayload()).destroy())

  it('chains every row, from the writer and from a direct create', async () => {
    const payload = await testPayload()
    const req = await createLocalReq({ context: { trustedInternal: true } }, payload)
    const a = await recordAudit(req, { action: 'ops.backup_ok', summary: tag('chain') })
    // Another concern writing the collection directly still gets the chain (the audit-log hook).
    const b = await payload.create({ collection: 'audit-log', data: { action: 'ops.backup_ok', summary: tag('direct') }, overrideAccess: true })
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(b.prevHash).toBeTruthy()
    expect(hashRow(a)).toBe(a.hash)
    expect(hashRow(b)).toBe(b.hash)
    expect(a.actorEmail).toBe('system:worker')
  })

  it('keeps one chain under concurrent writers (no fork)', async () => {
    const payload = await testPayload()
    const marker = tag('burst')
    await Promise.all(Array.from({ length: 12 }, (_, i) => recordSystemAudit(payload, { action: 'ops.backup_ok', summary: `${marker}-${i}` })))
    const mine = await rows({ summary: { like: marker } })
    expect(new Set(mine.map((r) => r.prevHash)).size).toBe(12)
    // Every row in the burst's range (other files write in between) links to the one before it.
    const range = await rows({ and: [{ id: { greater_than_equal: mine[0].id - 1 } }, { id: { less_than_equal: mine[mine.length - 1].id } }] })
    for (let i = 1; i < range.length; i++) {
      expect(range[i].prevHash).toBe(range[i - 1].hash)
      expect(hashRow(range[i])).toBe(range[i].hash)
    }
  })

  it('J2: the app role cannot UPDATE, DELETE or TRUNCATE audit_log', async () => {
    await asApp(async (db) => {
      for (const statement of ['UPDATE audit_log SET summary = $1', 'DELETE FROM audit_log WHERE summary = $1', 'TRUNCATE audit_log']) {
        const params = statement.includes('$1') ? ['tamper'] : []
        await expect(db.query(statement, params)).rejects.toMatchObject({ code: '42501' })
      }
      // INSERT and SELECT stay allowed.
      const { rows: r } = await db.query('SELECT count(*)::int AS n FROM audit_log')
      expect(r[0].n).toBeGreaterThan(0)
    })
    // Through Payload the operation is refused before it reaches the database.
    const payload = await testPayload()
    const [row] = await rows({ action: { equals: 'ops.backup_ok' } })
    await expect(payload.update({ collection: 'audit-log', id: row.id, data: { summary: 'x' }, overrideAccess: true })).rejects.toThrow()
    await expect(payload.delete({ collection: 'audit-log', id: row.id, overrideAccess: true })).rejects.toThrow()
  })

  it('exports completed days as JSONL that verifies without the database', async () => {
    const payload = await testPayload()
    const dir = await mkdtemp(path.join(tmpdir(), 'audit-export-'))
    const stateKey = `test:${tag('export')}`
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const written = await exportAuditDays(payload, directoryTarget(dir), { stateKey, now: tomorrow })
    expect(written.length).toBeGreaterThan(0)
    const files = (await readdir(dir)).sort()
    const jsonl = files.find((f) => f.endsWith('.jsonl'))!
    const manifest = JSON.parse(await readFile(path.join(dir, jsonl.replace('.jsonl', '.manifest.json')), 'utf8'))
    const body = await readFile(path.join(dir, jsonl), 'utf8')
    expect(createHash('sha256').update(body).digest('hex')).toBe(manifest.sha256)
    const lines = body.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>)
    expect(lines.length).toBe(manifest.rows)
    // Rows tampered with by an earlier run of the J3 tests on the same database fail, as they should.
    const known = new Set((await verifyChain(payload)).breaks.map((b) => `${b.id}:${b.reason}`))
    for (const [i, line] of lines.entries()) {
      const { id, hash, ...rest } = line
      if (!known.has(`${id}:hash`)) expect(createHash('sha256').update(String(rest.prevHash ?? '')).update(canonicalJSON(rest)).digest('hex')).toBe(hash)
      if (i > 0 && !known.has(`${id}:link`)) expect(rest.prevHash).toBe(lines[i - 1].hash)
      // Only the network leaves the server.
      if (typeof rest.ip === 'string') expect(rest.ip).toMatch(/\/(24|48)$/)
    }
    expect(exportLine((await rows({ id: { equals: lines[0].id as number } }))[0])).toBe(body.split('\n')[0])
    // A second run exports only rows written since (other test files keep writing), never the same row again.
    const lastId = Math.max(...lines.map((l) => l.id as number))
    await exportAuditDays(payload, directoryTarget(dir), { stateKey, now: tomorrow })
    for (const file of (await readdir(dir)).filter((f) => f.startsWith(jsonl) && f !== jsonl)) {
      const again = (await readFile(path.join(dir, file), 'utf8')).trim().split('\n').map((l) => JSON.parse(l) as { id: number })
      expect(again.every((l) => l.id > lastId)).toBe(true)
    }
  })

  it('§9.5: truncating IPs to their network keeps the chain valid', async () => {
    const payload = await testPayload()
    const req = await createLocalReq({ context: { trustedInternal: true } }, payload)
    ;(req as { headers: Headers }).headers = new Headers({ 'cf-connecting-ip': '198.51.100.23' })
    const v4 = await recordAudit(req, { action: 'ops.backup_ok', summary: tag('ipv4') })
    ;(req as { headers: Headers }).headers = new Headers({ 'cf-connecting-ip': '2001:db8:abcd:12::7' })
    const v6 = await recordAudit(req, { action: 'ops.backup_ok', summary: tag('ipv6') })
    expect(v4.ip).toBe('198.51.100.23')
    // The retention function's expression, applied by the owner as the function would.
    await asOwner((db) =>
      db.query(
        `UPDATE audit_log SET ip = network(set_masklen(ip::inet, CASE WHEN family(ip::inet) = 4 THEN 24 ELSE 48 END))::text WHERE id = ANY($1)`,
        [[v4.id, v6.id]],
      ),
    )
    const after = await rows({ id: { in: [v4.id, v6.id] } })
    expect(after.map((r) => r.ip)).toEqual(['198.51.100.0/24', '2001:db8:abcd::/48'])
    for (const row of after) expect(hashRow(row)).toBe(row.hash)
    const { breaks } = await verifyChain(payload)
    expect(breaks.filter((b) => b.id === v4.id || b.id === v6.id)).toEqual([])
    // The owner function (migration wave2) runs as the app role and leaves rows younger than 90 days alone.
    ;(req as { headers: Headers }).headers = new Headers({ 'cf-connecting-ip': '198.51.100.99' })
    const fresh = await recordAudit(req, { action: 'ops.backup_ok', summary: tag('fresh') })
    expect(typeof (await truncateOldIps(payload))).toBe('number')
    expect((await rows({ id: { equals: fresh.id } }))[0].ip).toBe('198.51.100.99')
  })

  it('J3: altering a row as the owner makes the nightly check record ops.chain_break and alert', async () => {
    const payload = await testPayload()
    const stateKey = `test:${tag('chain')}`
    const cursorPrefix = `test:${tag('alerts')}`
    const mock = mockTransport()
    await deliverAlerts(payload, { transports: [mock], cursorPrefix })
    await checkChain(payload, { stateKey })
    expect((await checkChain(payload, { stateKey })).fresh).toEqual([])

    const victim = await recordSystemAudit(payload, { action: 'ops.backup_ok', summary: tag('victim') })
    await recordSystemAudit(payload, { action: 'ops.backup_ok', summary: tag('after-victim') })
    // The row right after the victim (other test files write in parallel, so not necessarily ours).
    const [next] = await rows({ id: { greater_than: victim.id } })
    await asOwner((db) => db.query(`UPDATE audit_log SET summary = 'rewritten' WHERE id = $1`, [victim.id]))
    const first = await checkChain(payload, { stateKey })
    expect(first.fresh).toContainEqual({ id: victim.id, reason: 'hash' })
    const [breakRow] = await rows({ and: [{ action: { equals: 'ops.chain_break' } }, { docId: { equals: String(first.fresh[0].id) } }] })
    expect(breakRow).toMatchObject({ actorEmail: 'system:worker', collection: 'audit-log' })

    // Rewriting the hash as well moves the break to the next row's link.
    await asOwner((db) => db.query(`UPDATE audit_log SET hash = $1 WHERE id = $2`, ['f'.repeat(64), victim.id]))
    const second = await checkChain(payload, { stateKey })
    expect(second.fresh).toContainEqual({ id: next.id, reason: 'link' })
    // A break already reported is not reported again.
    expect((await checkChain(payload, { stateKey })).fresh).toEqual([])

    const sent = await drainAlerts(payload, { transports: [mock], cursorPrefix })
    expect(sent.mock.filter((a) => a.kind === 'chain_break').length).toBeGreaterThanOrEqual(2)
    expect(mock.sent.find((a) => a.kind === 'chain_break')!.text).toContain('Audit jurnali zanjiri buzilgan')
  })

  it('J3: a row deleted by the owner breaks the link of the row after it', async () => {
    const payload = await testPayload()
    const stateKey = `test:${tag('chain')}`
    await checkChain(payload, { stateKey })
    const gone = await recordSystemAudit(payload, { action: 'ops.backup_ok', summary: tag('deleted') })
    await recordSystemAudit(payload, { action: 'ops.backup_ok', summary: tag('follower') })
    await asOwner((db) => db.query(`DELETE FROM audit_log WHERE id = $1`, [gone.id]))
    const result = await checkChain(payload, { stateKey })
    // The row right after the gap (other test files write in parallel, so not necessarily ours).
    const [after] = await rows({ id: { greater_than: gone.id } })
    expect(result.fresh).toContainEqual({ id: after.id, reason: 'link' })
  })
})
