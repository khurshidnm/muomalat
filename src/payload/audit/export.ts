import { createHash, createHmac } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'

import { canonicalJSON, hashable } from './hash'
import { tashkentDay, tashkentDayStart } from './time'
import { AUDIT_SLUG, type AuditRow } from './writer'

/**
 * Nightly off-server copy of the audit log (CMS-SPEC §9.3): every completed
 * Tashkent day's rows as JSONL, written once and never overwritten. In
 * production the target is the backup bucket with object lock, so an attacker
 * with root on the server can delete local rows but cannot hide that they did.
 *
 * Each line is canonical JSON of `{ id, hash, ...row }` with exactly the
 * hashed fields (src/payload/audit/hash.ts), the IP address already reduced to
 * its network. To verify a file without the database: drop `id` and `hash`
 * from a line, then `sha256(prevHash + canonicalJSON(rest))` must equal
 * `hash`, and each line's `prevHash` the previous line's `hash`. A
 * `.manifest.json` next to each file gives the row count, the id range, the
 * last hash and the file's SHA-256.
 *
 * Target, from AUDIT_EXPORT_TARGET:
 * - a directory (default `.data/audit-export`; `file:///…` also accepted);
 * - `s3://bucket/prefix`: an S3-compatible bucket, path-style, signed with
 *   SigV4 using write-only credentials: AUDIT_S3_ENDPOINT, AUDIT_S3_REGION,
 *   AUDIT_S3_ACCESS_KEY_ID, AUDIT_S3_SECRET_ACCESS_KEY. Objects are written
 *   with `If-None-Match: *` (never replace) and Content-MD5 (required by
 *   object-lock buckets).
 */

export interface ExportTarget {
  describe: string
  /** Write a new object; an existing one with the same name is never replaced. */
  write(name: string, body: string, contentType: string): Promise<void>
}

const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')

/** A local directory; files are created read-only and never overwritten. */
export function directoryTarget(dir: string): ExportTarget {
  return {
    describe: dir,
    async write(name, body) {
      await mkdir(dir, { recursive: true })
      const file = path.join(dir, name)
      try {
        await writeFile(file, body, { flag: 'wx', mode: 0o440 })
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
        // Already written by an earlier run (the cursor was lost): fine when identical, else keep both.
        if (sha256(await readFile(file)) === sha256(body)) return
        await writeFile(`${file}.${Date.now()}`, body, { flag: 'wx', mode: 0o440 })
      }
    },
  }
}

// ── S3 (SigV4) ──────────────────────────────────────────────────────────────

const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest()
const encodePath = (p: string) => p.split('/').map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/')

export type SigV4Request = {
  method: string
  url: string
  region: string
  service?: string
  accessKeyId: string
  secretAccessKey: string
  headers?: Record<string, string>
  payloadHash: string
  now?: Date
}

/** AWS Signature Version 4 headers for one request (tested against the AWS documentation's example). */
export function signV4(r: SigV4Request): Record<string, string> {
  const url = new URL(r.url)
  const amzDate = (r.now ?? new Date()).toISOString().replace(/[-:]|\.\d{3}/g, '')
  const day = amzDate.slice(0, 8)
  const service = r.service ?? 's3'
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(r.headers ?? {})) headers[k.toLowerCase()] = v
  headers.host = url.host
  headers['x-amz-date'] = amzDate
  headers['x-amz-content-sha256'] = r.payloadHash
  const names = Object.keys(headers).sort()
  const canonicalHeaders = names.map((n) => `${n}:${headers[n].trim().replace(/\s+/g, ' ')}\n`).join('')
  const signedHeaders = names.join(';')
  const query = [...url.searchParams.entries()]
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const canonical = [r.method, encodePath(decodeURIComponent(url.pathname)), query, canonicalHeaders, signedHeaders, r.payloadHash].join('\n')
  const scope = `${day}/${r.region}/${service}/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
  const key = hmac(hmac(hmac(hmac(`AWS4${r.secretAccessKey}`, day), r.region), service), 'aws4_request')
  const signature = createHmac('sha256', key).update(toSign).digest('hex')
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${r.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

export type S3Config = { bucket: string; prefix: string; endpoint: string; region: string; accessKeyId: string; secretAccessKey: string }

export function s3Target(c: S3Config): ExportTarget {
  return {
    describe: `s3://${c.bucket}/${c.prefix}`,
    async write(name, body, contentType) {
      const key = `${c.prefix ? `${c.prefix.replace(/\/+$/, '')}/` : ''}${name}`
      const url = `${c.endpoint.replace(/\/+$/, '')}/${c.bucket}/${key}`
      const bytes = Buffer.from(body, 'utf8')
      const headers = signV4({
        method: 'PUT',
        url,
        region: c.region,
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
        payloadHash: sha256(bytes),
        headers: {
          'content-type': contentType,
          'content-md5': createHash('md5').update(bytes).digest('base64'),
          'if-none-match': '*',
        },
      })
      delete headers.host
      const res = await fetch(url, { method: 'PUT', headers, body: bytes, signal: AbortSignal.timeout(60_000) })
      // 412: the object already exists (an earlier run); it is never replaced.
      if (res.ok || res.status === 412) return
      throw new Error(`audit export: PUT ${key} → ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`)
    },
  }
}

/** The configured target (AUDIT_EXPORT_TARGET). */
export function exportTargetFromEnv(env: NodeJS.ProcessEnv = process.env): ExportTarget {
  const target = env.AUDIT_EXPORT_TARGET || '.data/audit-export'
  if (target.startsWith('s3://')) {
    const [, rest] = target.split('s3://')
    const [bucket, ...prefix] = rest.split('/')
    const region = env.AUDIT_S3_REGION || 'us-east-1'
    const accessKeyId = env.AUDIT_S3_ACCESS_KEY_ID
    const secretAccessKey = env.AUDIT_S3_SECRET_ACCESS_KEY
    if (!bucket || !accessKeyId || !secretAccessKey) throw new Error('audit export: s3 target needs a bucket, AUDIT_S3_ACCESS_KEY_ID and AUDIT_S3_SECRET_ACCESS_KEY')
    return s3Target({ bucket, prefix: prefix.join('/'), endpoint: env.AUDIT_S3_ENDPOINT || `https://s3.${region}.amazonaws.com`, region, accessKeyId, secretAccessKey })
  }
  return directoryTarget(path.resolve(target.startsWith('file://') ? new URL(target).pathname : target))
}

// ── export ──────────────────────────────────────────────────────────────────

/** One JSONL line: the hashed fields plus id and hash. */
export const exportLine = (row: AuditRow) => canonicalJSON({ id: row.id, hash: row.hash ?? null, ...hashable(row) })

type ExportState = { lastId: number }
const STATE_KEY = 'muomalat:audit:export'
const PAGE = 1000

export type ExportOptions = { stateKey?: string; now?: Date }

/**
 * Export every row after the cursor whose Tashkent day has ended, one file
 * per day. The cursor moves after each day is written, so a failed upload is
 * retried from that day on the next run.
 */
export async function exportAuditDays(payload: Payload, target: ExportTarget, options: ExportOptions = {}): Promise<{ day: string; rows: number }[]> {
  const key = options.stateKey ?? STATE_KEY
  const state = (await payload.kv.get<ExportState>(key)) ?? { lastId: 0 }
  const todayStart = tashkentDayStart(tashkentDay(options.now ?? new Date())).toISOString()
  const written: { day: string; rows: number }[] = []

  let after = state.lastId
  let day: string | undefined
  let lines: string[] = []
  let firstId = 0
  let last: AuditRow | undefined
  const flush = async () => {
    if (!day || !lines.length || !last) return
    const body = `${lines.join('\n')}\n`
    await target.write(`audit-${day}.jsonl`, body, 'application/x-ndjson')
    const manifest = { day, rows: lines.length, firstId, lastId: last.id, lastHash: last.hash ?? null, sha256: sha256(body) }
    await target.write(`audit-${day}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json')
    await payload.kv.set(key, { lastId: last.id } satisfies ExportState)
    written.push({ day, rows: lines.length })
  }

  for (;;) {
    const { docs } = await payload.find({
      collection: AUDIT_SLUG,
      where: { and: [{ id: { greater_than: after } }, { at: { less_than: todayStart } }] },
      sort: 'id',
      limit: PAGE,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const row of docs) {
      const rowDay = tashkentDay(row.at ?? row.createdAt)
      if (day && rowDay !== day) {
        await flush()
        lines = []
      }
      if (!lines.length) {
        day = rowDay
        firstId = row.id
      }
      lines.push(exportLine(row))
      last = row
    }
    if (docs.length < PAGE) break
    after = docs[docs.length - 1].id
  }
  await flush()
  return written
}

