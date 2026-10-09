import { expect } from 'vitest'

import { handleEndpoints, type Payload } from 'payload'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'
import { setNoticeTransport } from '@/payload/hooks/workflow/notify'
import type { StaffNotice } from '@/payload/hooks/workflow/shared'
import { testPayload } from '../helpers/payload'

/**
 * Fixtures for the workflow tests. Every test file runs in its own process
 * against the same test database, possibly in parallel, so each file passes
 * its own `prefix`: accounts, bylines and stories never collide.
 */

export const CMS = process.env.CMS_URL || 'http://cms.localhost:3000'

/** Every notice the workflow sends in this process (the Telegram/email transport is replaced). */
export const notices: StaffNotice[] = []
setNoticeTransport(async (n) => {
  notices.push(n)
})

export type Doc = Record<string, any>
export type U = { id: number; email: string; role: Role; password: string; tag: string } & Doc

const cookies = new Map<string, string>()
let ip = 1

/**
 * A REST call through handleEndpoints (the code the /api route runs). The
 * admin always sends `?locale=`; without it, with `fallback: false`, Payload
 * leaves req.locale null and writes no localized field, so `locale=uz` is
 * added unless the path names a locale.
 */
export async function rest(method: string, path: string, opts: { body?: unknown; cookie?: string; origin?: string | null } = {}) {
  await testPayload()
  if (path.startsWith('/api/articles') && !/[?&]locale=/.test(path)) path += `${path.includes('?') ? '&' : '?'}locale=uz`
  const headers = new Headers()
  const origin = opts.origin === undefined ? CMS : opts.origin
  if (origin) headers.set('Origin', origin)
  if (opts.cookie) headers.set('Cookie', opts.cookie)
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json')
  const res = await handleEndpoints({
    config,
    request: new Request(CMS + path, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }),
  })
  const text = await res.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie?.() ?? [] }
}

/** An active staff account, created once per tag. */
export async function account(role: Role, tag: string): Promise<U> {
  const payload = await testPayload()
  const email = `wf-${tag}@test.muomalat.local`
  const password = `wf-password-${tag}-0123456789`
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
  const user =
    found.docs[0] ??
    (await payload.create({ collection: 'users', data: { email, name: `WF ${tag}`, role, active: true, password } as never, overrideAccess: true }))
  return { ...(user as Doc), role, password, tag } as U
}

/** The `muomalat-token` cookie of an account (one login per account per process). */
export async function cookieOf(u: U): Promise<string> {
  const cached = cookies.get(u.email)
  if (cached) return cached
  const r = await handleEndpoints({
    config,
    request: new Request(`${CMS}/api/users/login`, {
      method: 'POST',
      headers: { Origin: CMS, 'Content-Type': 'application/json', 'cf-connecting-ip': `203.0.113.${ip++ % 250}` },
      body: JSON.stringify({ email: u.email, password: u.password }),
    }),
  })
  const c = r.headers.getSetCookie().find((s) => s.startsWith('muomalat-token='))
  if (!c) throw new Error(`login failed for ${u.email}: ${r.status} ${await r.text()}`)
  const pair = c.split(';')[0]
  cookies.set(u.email, pair)
  return pair
}

export async function rubric(slug: 'yangiliklar' | 'tahlil' | 'intervyu' | 'izoh' | 'dunyo'): Promise<number> {
  const payload = await testPayload()
  const find = async () => (await payload.find({ collection: 'rubrics', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })).docs[0]
  const existing = await find()
  if (existing) return existing.id as number
  try {
    const r = await payload.create({ collection: 'rubrics', data: { slug, order: 1, name: slug, description: 'Sinov rubrikasi.', _status: 'published' } as never, overrideAccess: true })
    return r.id as number
  } catch {
    return (await find())!.id as number // another test file created it first
  }
}

/** A published byline, optionally linked to a staff account. */
export async function byline(name: string, opts: { user?: U; commercial?: boolean; isTeam?: boolean } = {}): Promise<number> {
  const payload = await testPayload()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const found = await payload.find({ collection: 'authors', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) return found.docs[0].id as number
  const a = await payload.create({
    collection: 'authors',
    data: { name, slug, role: 'muxbir', bio: 'Sinov uchun muallif.', commercial: Boolean(opts.commercial), isTeam: Boolean(opts.isTeam), active: true, user: opts.user?.id, _status: 'published' } as never,
    overrideAccess: true,
  })
  return a.id as number
}

export function lexical(...paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
      })),
    },
  }
}

/** Adds these to the official source domains (never removes: test files share the global). */
export async function officialDomains(domains: string[]) {
  const payload = await testPayload()
  const current = ((await payload.findGlobal({ slug: 'editorial-rules', depth: 0, overrideAccess: true })) as Doc).officialSourceDomains as { domain: string }[] | undefined
  const all = [...new Set([...(current ?? []).map((d) => d.domain), ...domains])]
  await payload.updateGlobal({ slug: 'editorial-rules', data: { officialSourceDomains: all.map((domain) => ({ domain })) } as never, overrideAccess: true })
}

export const as = (u: U) => ({ user: u as never, overrideAccess: false as const })

let seq = 0
/**
 * A new story created by `by` (a reporter, editor or commercial), with
 * everything submit needs, moved from `idea` to `draft` (pass `idea: true` to
 * leave it an idea).
 */
export async function story(by: U, authors: number[], extra: Doc = {}): Promise<Doc> {
  const payload = await testPayload()
  seq++
  const { idea, ...fields } = extra
  const rubricId = fields.rubric ?? (await rubric('tahlil'))
  const created = (await payload.create({
    collection: 'articles',
    draft: true,
    ...as(by),
    data: {
      title: `Sinov maqolasi ${by.tag} ${seq} ${Date.now()}`,
      lead: 'Bank 4,5 mlrd soʻm ajratdi.',
      body: lexical('Markaziy bank 2026-yilda 4,5 mlrd soʻm ajratdi.', 'Ikkinchi xatboshi.'),
      rubric: rubricId,
      authors,
      assignee: by.id,
      sources: [{ title: 'Hisobot', publisher: 'Markaziy bank', url: 'https://cbu.uz/hisobot', type: 'document' }],
      _status: 'draft',
      ...fields,
    } as never,
  })) as Doc
  if (idea) return created
  await goOk(by, created.id, { action: 'start' })
  return latest(created.id)
}

/** POST /api/articles/:id/transition as `u`. */
export async function go(u: U, id: number, body: Doc) {
  return rest('POST', `/api/articles/${id}/transition`, { cookie: await cookieOf(u), body })
}

/** The same, failing the test with the server's message if it is refused. */
export async function goOk(u: U, id: number, body: Doc) {
  const r = await go(u, id, body)
  if (r.status !== 200) throw new Error(`${body.action ?? body.to} by ${u.tag}: ${r.status} ${JSON.stringify(r.json)}`)
  return r
}

export async function latest(id: number, locale = 'uz'): Promise<Doc> {
  const payload = await testPayload()
  return (await payload.findByID({ collection: 'articles', id, draft: true, depth: 0, locale: locale as 'uz', overrideAccess: true })) as Doc
}
export async function live(id: number, locale = 'uz'): Promise<Doc> {
  const payload = await testPayload()
  return (await payload.findByID({ collection: 'articles', id, draft: false, depth: 0, locale: locale as 'uz', overrideAccess: true })) as Doc
}

/** Every message of an error: the APIError message and each field error. */
export function messages(e: unknown): string {
  const err = e as { message?: string; data?: { errors?: { message?: string }[] } }
  return [err?.message, ...(err?.data?.errors?.map((x) => x.message) ?? [])].filter(Boolean).join(' | ')
}

/** Expects the promise to reject; returns the messages for further checks. */
export async function rejects(p: Promise<unknown>, pattern?: RegExp): Promise<string> {
  let caught: unknown
  try {
    await p
  } catch (e) {
    caught = e
  }
  expect(caught, 'expected a rejection').toBeDefined()
  const text = messages(caught)
  if (pattern) expect(text).toMatch(pattern)
  return text
}

/** REST error text: the first error's message and its field messages. */
export const restError = (json: any) =>
  [json?.errors?.[0]?.message, ...((json?.errors?.[0]?.data?.errors as { message: string }[] | undefined)?.map((e) => e.message) ?? [])]
    .filter(Boolean)
    .join(' | ')

export interface Team {
  reporter: U
  translator: U
  editorA: U
  editorB: U
  authorEditor: U
  eic: U
  commercial: U
  admin: U
  reporterByline: number
  authorEditorByline: number
  eicByline: number
  commercialByline: number
}

/** The newsroom of one test file. */
export async function team(prefix: string): Promise<Team> {
  const reporter = await account('reporter', `${prefix}-reporter`)
  const translator = await account('reporter', `${prefix}-translator`)
  const editorA = await account('editor', `${prefix}-editor-a`)
  const editorB = await account('editor', `${prefix}-editor-b`)
  const authorEditor = await account('editor', `${prefix}-author-editor`)
  const eic = await account('eic', `${prefix}-eic`)
  const commercial = await account('commercial', `${prefix}-commercial`)
  const admin = await account('admin', `${prefix}-admin`)
  return {
    reporter,
    translator,
    editorA,
    editorB,
    authorEditor,
    eic,
    commercial,
    admin,
    reporterByline: await byline(`WF ${prefix} Muxbir`, { user: reporter }),
    authorEditorByline: await byline(`WF ${prefix} Muharrir muallif`, { user: authorEditor }),
    eicByline: await byline(`WF ${prefix} Bosh muharrir`, { user: eic }),
    commercialByline: await byline(`WF ${prefix} Hamkorlik`, { commercial: true, isTeam: true, user: commercial }),
  }
}

/** Reporter writes, submits; editor A approves; editor B publishes. Returns the story id. */
export async function publishedStory(t: Team, extra: Doc = {}): Promise<number> {
  const s = await story(t.reporter, [t.reporterByline], extra)
  await goOk(t.reporter, s.id, { action: 'submit' })
  await goOk(t.editorA, s.id, { action: 'approve' })
  await goOk(t.editorB, s.id, { action: 'publish' })
  return s.id as number
}

/** Moves first publication into the past (the 15-minute and 2-hour windows), on the main row and in every version. */
export async function agePublication(id: number, minutes: number) {
  const payload = await testPayload()
  const { sql } = await import('@payloadcms/db-postgres')
  const at = new Date(Date.now() - minutes * 60_000).toISOString()
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
  await db.execute(sql`UPDATE "articles" SET "first_published_at" = ${at} WHERE "id" = ${id}`)
  await db.execute(sql`UPDATE "_articles_v" SET "version_first_published_at" = ${at} WHERE "parent_id" = ${id} AND "version_first_published_at" IS NOT NULL`)
}

export type { Payload }
