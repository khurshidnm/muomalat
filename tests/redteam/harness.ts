import { expect } from 'vitest'

import { handleEndpoints, isolateObjectProperty, type Payload, type PayloadRequest } from 'payload'

import config from '@payload-config'
import type { Role } from '@/payload/access/roles'
import { testPayload } from '../helpers/payload'

/**
 * Red-team harness (CMS-SPEC §16). Every attack goes through one of two real
 * paths:
 *  - `rest()` runs the request through `handleEndpoints`, the same code the
 *    Next `/api/[...slug]` route runs, so CSRF, cookie auth, access control
 *    and the collection hooks are the production ones. No HTTP server starts.
 *  - the Local API (`testPayload()`), used for fixtures and for the attacks a
 *    malicious in-process caller (a careless script) could make.
 *
 * Fixtures are written with `overrideAccess: true` and `context.importing`,
 * the way the importer writes them: the point of each test is whether a role
 * may do a thing, not how the fixture got there.
 */

export const CMS = process.env.CMS_URL || 'http://cms.localhost:3000'

export type Doc = Record<string, any>
export type U = { id: number; email: string; role: Role; password: string; tag: string } & Doc

let ipCounter = 100

export type RestOptions = {
  body?: unknown
  cookie?: string
  /** `null` sends no Origin header. */
  origin?: string | null
  headers?: Record<string, string>
}

export async function rest(method: string, path: string, opts: RestOptions = {}) {
  await testPayload()
  const headers = new Headers(opts.headers ?? {})
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
  return { status: res.status, json, headers: res.headers, setCookie: res.headers.getSetCookie?.() ?? [] }
}

export const password = (tag: string) => `rt-password-${tag}-0123456789`

/** An active staff account, created once per tag (its own email so files never collide). */
export async function account(role: Role, tag: string): Promise<U> {
  const payload = await testPayload()
  const email = `rt-${tag}@test.muomalat.local`
  const find = async () => (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })).docs[0]
  const found = await find()
  const user =
    found ??
    (await payload
      .create({ collection: 'users', data: { email, name: `RT ${tag}`, role, active: true, password: password(tag) } as never, overrideAccess: true })
      .catch(async (e) => (await find()) ?? Promise.reject(e)))
  return { ...(user as Doc), role, password: password(tag), tag } as U
}

export async function login(email: string, pass: string, headers: Record<string, string> = {}): Promise<string> {
  const r = await rest('POST', '/api/users/login', { body: { email, password: pass }, headers: { 'cf-connecting-ip': `203.0.113.${ipCounter++ % 250}`, ...headers } })
  const cookie = r.setCookie.find((s) => s.startsWith('muomalat-token='))
  if (!cookie) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.json)}`)
  return cookie.split(';')[0]
}

export async function cookieOf(u: U): Promise<string> {
  return login(u.email, u.password)
}

export async function rubric(slug: string): Promise<number> {
  const payload = await testPayload()
  const find = async () => (await payload.find({ collection: 'rubrics', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })).docs[0]
  const existing = await find()
  if (existing) return existing.id as number
  try {
    const r = await payload.create({ collection: 'rubrics', data: { slug, order: 1, name: slug, description: 'Sinov rubrikasi.', _status: 'published' } as never, overrideAccess: true })
    return r.id as number
  } catch {
    return (await find())!.id as number
  }
}

export async function byline(name: string, opts: { user?: U; commercial?: boolean } = {}): Promise<number> {
  const payload = await testPayload()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const found = await payload.find({ collection: 'authors', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  if (found.docs[0]) return found.docs[0].id as number
  const a = await payload.create({
    collection: 'authors',
    data: { name, slug, role: 'muxbir', bio: 'Sinov uchun muallif.', commercial: Boolean(opts.commercial), active: true, user: opts.user?.id, _status: 'published' } as never,
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

let seq = 0
/** A draft story written straight into the DB the way the importer does. `publish` makes it live. */
export async function makeStory(authors: number[], extra: Doc = {}, publish = false): Promise<Doc> {
  const payload = await testPayload()
  seq++
  const rubricId = extra.rubric ?? (await rubric('tahlil'))
  const title = (extra.title as string) ?? `RT maqola ${seq} ${Date.now()}`
  return (await payload.create({
    collection: 'articles',
    draft: !publish,
    overrideAccess: true,
    context: { importing: true },
    data: {
      title,
      lead: 'Bank 4,5 mlrd soʻm ajratdi.',
      body: lexical('Markaziy bank 2026-yilda 4,5 mlrd soʻm ajratdi.'),
      rubric: rubricId,
      authors,
      sources: [{ title: 'Hisobot', publisher: 'Markaziy bank', url: 'https://cbu.uz/hisobot', type: 'document' }],
      workflowStatus: publish ? 'published' : 'draft',
      _status: publish ? 'published' : 'draft',
      firstPublishedAt: publish ? new Date().toISOString() : undefined,
      publishedAt: publish ? new Date().toISOString() : undefined,
      ...extra,
    } as never,
  })) as Doc
}

export async function findArticle(id: number, opts: { draft?: boolean; locale?: string } = {}): Promise<Doc | null> {
  const payload = await testPayload()
  return (await payload.findByID({
    collection: 'articles',
    id,
    draft: opts.draft ?? true,
    depth: 0,
    locale: (opts.locale ?? 'uz') as 'uz',
    overrideAccess: true,
    disableErrors: true,
  })) as Doc | null
}

/** A Local API request bound to a user, the way a careless in-process script would act "as" someone. */
export function reqAs(u: U, payload: Payload): { user: any; overrideAccess: false } {
  return { user: u as never, overrideAccess: false }
}

/** The combined message of a REST error response (top message + each field error). */
export const restError = (json: any): string =>
  [json?.errors?.[0]?.message, ...((json?.errors?.[0]?.data?.errors as { message: string }[] | undefined)?.map((e) => e.message) ?? [])].filter(Boolean).join(' | ')

/** The combined message of a thrown Local API error. */
export function errMsg(e: unknown): string {
  const err = e as { message?: string; data?: { errors?: { message?: string }[] } }
  return [err?.message, ...(err?.data?.errors?.map((x) => x.message) ?? [])].filter(Boolean).join(' | ')
}

/** Expects a Local API promise to reject; returns its message. */
export async function rejects(p: Promise<unknown>): Promise<string> {
  let caught: unknown
  try {
    await p
  } catch (e) {
    caught = e
  }
  expect(caught, 'expected the call to be refused').toBeDefined()
  return errMsg(caught)
}

export { isolateObjectProperty, type Payload, type PayloadRequest }
