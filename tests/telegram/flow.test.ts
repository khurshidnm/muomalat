import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { alertFor } from '@/payload/audit/alerts'
import { deliveryEnv } from '@/payload/delivery/env'
import { createBotClient } from '@/payload/telegram/client'
import { KV, pollUpdates, runChannelChecks } from '@/payload/telegram/monitor'
import { telegramForEvent } from '@/payload/telegram/outbox'
import { processDuePosts, type SenderOptions } from '@/payload/telegram/sender'
import { resetTelegramStartup, telegramMayRun } from '@/payload/telegram/startup'
import { processOutbox } from '@/worker/jobs/outbox'
import { testPayload } from '../helpers/payload'
import { as, cookieOf, goOk, live, publishedStory, rejects, rest, story, team, type Doc, type Team, type U } from '../workflow/helpers'
import { botMember, CHANNEL, CHAT_ID, fail, ownerMember, startMockBotApi, TOKEN, type MockBotApi } from './mockBotApi'

/**
 * Acceptance group I (CMS-SPEC §16, Telegram) end to end: the outbox step
 * prepares the rows, people approve them through the admin endpoint, the
 * worker's send pass talks to a local mock of the Bot API (never
 * api.telegram.org), and the monitor reads updates from it.
 *
 * One file on purpose: the posting switch, the rights state and the update
 * offset are shared settings, and a second file running in parallel would
 * flip them under this one.
 */

let payload: Awaited<ReturnType<typeof testPayload>>
let mock: MockBotApi
let t: Team
const alerts: { subject: string; text: string }[] = []
const SITE = () => deliveryEnv().siteUrl
const saved: Record<string, string | undefined> = {}
const ENV = { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHANNEL: CHANNEL, ALERTS_BOT_TOKEN: undefined, ALERTS_CHAT_ID: undefined, ALERTS_EMAIL: 'off', CMS_READ_ONLY: undefined }

const capture: SenderOptions['alert'] = async (_p, subject, text) => void alerts.push({ subject, text })
const noDelivery = {
  revalidate: async () => {},
  warm: async () => [],
  purge: async () => ({ skipped: true, requests: 0, urls: 0, prefixes: 0, everything: false }),
}

/** The outbox pass for one story's events (the Telegram step among them). */
const outbox = (id: number) => processOutbox(payload, noDelivery, { and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(id) } }] })

/** The send pass for one story's rows, `ahead` ms in the future (the 3-minute delay). */
const sendPass = (id: number, ahead = 0, extra: Partial<SenderOptions> = {}) =>
  processDuePosts(payload, { scope: { article: { equals: id } }, now: () => Date.now() + ahead, alert: capture, ...extra })

const postsFor = async (id: number): Promise<Doc[]> =>
  (await payload.find({ collection: 'telegram-posts', where: { article: { equals: id } }, sort: 'id', depth: 0, limit: 50, overrideAccess: true })).docs as Doc[]
const post = async (id: number): Promise<Doc> => (await payload.findByID({ collection: 'telegram-posts', id, depth: 0, overrideAccess: true })) as Doc

const act = async (u: U, id: number, action: string, body: Doc = {}) =>
  rest('POST', `/api/telegram-posts/${id}/action`, { cookie: await cookieOf(u), body: { action, ...body } })
const actOk = async (u: U, id: number, action: string, body: Doc = {}) => {
  const r = await act(u, id, action, body)
  if (r.status !== 200) throw new Error(`${action} by ${u.tag}: ${r.status} ${JSON.stringify(r.json)}`)
  return r
}

async function setPosting(enabled: boolean) {
  const s = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as Doc
  await payload.updateGlobal({ slug: 'site-settings', data: { telegram: { ...(s.telegram ?? {}), postingEnabled: enabled, delayMinutes: 3 } } as never, overrideAccess: true })
}

/** Audit rows of one action written after `since` (an id). */
async function auditRows(action: string, since: number): Promise<Doc[]> {
  const { docs } = await payload.find({ collection: 'audit-log', where: { and: [{ action: { equals: action } }, { id: { greater_than: since } }] }, sort: 'id', limit: 50, depth: 0, overrideAccess: true })
  return docs as Doc[]
}
const auditHead = async () => ((await payload.find({ collection: 'audit-log', sort: '-id', limit: 1, depth: 0, overrideAccess: true })).docs[0]?.id as number) ?? 0
const ruleCtx = () => ({ payload, settings: async () => ({}) })

/** A publishable JPEG (alt, credit, rights set). Not tests/validate/fixtures: that one boots Payload without the other concerns. */
async function media(): Promise<number> {
  const buf = await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 40, g: 120, b: 200 } } }).jpeg().toBuffer()
  const doc = await payload.create({
    collection: 'media',
    data: { alt: 'Toshkentdagi bank binosi', credit: 'Foto: Muomalat', rightsCategory: 'staff' } as never,
    file: { data: buf, mimetype: 'image/jpeg', name: `tg-${Math.random().toString(36).slice(2)}.jpg`, size: buf.length },
    overrideAccess: true,
  })
  return doc.id as number
}

/** A published story with an image and its approved, sent channel post. */
async function sentStory(extra: Doc = {}) {
  const image = await media()
  const id = await publishedStory(t, { image, ...extra })
  await outbox(id)
  const [p] = await postsFor(id)
  await actOk(t.editorA, p.id, 'approve')
  const out = await sendPass(id, 4 * 60_000)
  expect(out.sent).toEqual([p.id])
  return { id, post: await post(p.id) }
}

beforeAll(async () => {
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  mock = await startMockBotApi()
  process.env.TELEGRAM_API_BASE = mock.url
  payload = await testPayload()
  t = await team('tg')
  await setPosting(true)
  await payload.kv.delete(KV.rights)
  await payload.kv.delete(KV.admins)
  await payload.kv.delete(KV.updates)
  await payload.kv.delete(KV.conflict)
})

afterAll(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  delete process.env.TELEGRAM_API_BASE
  await mock?.close()
  await payload?.destroy()
})

beforeEach(() => {
  mock.reset()
  alerts.length = 0
})

describe('first publication → draft → approval → delay → sent (§10.3 steps 1–3, I2)', () => {
  it('the outbox prepares one draft from the template; nothing is sent before approval', async () => {
    const image = await media()
    const id = await publishedStory(t, { image })
    await outbox(id)
    await outbox(id)
    const rows = await postsFor(id)
    expect(rows).toHaveLength(1)
    const story = await live(id)
    expect(rows[0]).toMatchObject({ kind: 'article', status: 'draft', requestedBy: null, approvedBy: null, sponsored: false, photo: image })
    expect(rows[0].captionHtml).toBe(`<b>${story.title}</b>\n\n${story.lead}\n\n${SITE()}/t/${story.shortCode}\n\n#tahlil`)
    expect((await sendPass(id, 10 * 60_000)).sent).toEqual([])
    expect(mock.calls).toEqual([])
  })

  it('an approved post waits out the delay, then goes out once with its photo; every step is audited', async () => {
    const head = await auditHead()
    const image = await media()
    const id = await publishedStory(t, { image })
    await outbox(id)
    const [p] = await postsFor(id)
    await actOk(t.editorA, p.id, 'approve')
    const queued = await post(p.id)
    expect(queued).toMatchObject({ status: 'queued', approvedBy: t.editorA.id })
    const wait = new Date(queued.sendAt).getTime() - Date.now()
    expect(wait).toBeGreaterThan(2.9 * 60_000)
    expect(wait).toBeLessThanOrEqual(3 * 60_000)

    expect((await sendPass(id)).sent).toEqual([])
    expect(mock.of('sendPhoto')).toHaveLength(0)
    const out = await sendPass(id, 3 * 60_000 + 5_000)
    expect(out.sent).toEqual([p.id])
    const calls = mock.of('sendPhoto')
    expect(calls).toHaveLength(1)
    expect(calls[0].params).toMatchObject({ caption: p.captionHtml, parse_mode: 'HTML' })
    // The numeric id once the hourly check has stored it, the @name before.
    expect([CHANNEL, String(CHAT_ID)]).toContain(calls[0].params.chat_id)
    expect(calls[0].files.photo).toMatchObject({ type: 'image/jpeg' })
    const sent = await post(p.id)
    expect(sent).toMatchObject({ status: 'sent', imageFileId: 'big-file-id-uploaded', lastError: null })
    expect(Number(sent.messageId)).toBeGreaterThan(0)
    expect(sent.history.map((h: Doc) => h.action)).toEqual(['created', 'approved', 'sent'])
    expect(sent.history.at(-1).captionHtml).toBe(p.captionHtml)
    // Sent rows are not due again.
    expect((await sendPass(id, 10 * 60_000)).sent).toEqual([])
    expect(mock.of('sendPhoto')).toHaveLength(1)

    expect((await auditRows('telegram.approve', head)).map((r) => [r.docId, r.actorEmail])).toEqual([[String(p.id), t.editorA.email]])
    expect((await auditRows('telegram.send', head)).map((r) => [r.docId, r.actorEmail])).toEqual([[String(p.id), 'system:telegram']])
  })

  it('cancelling inside the window prevents sending; commercial cannot cancel', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    await actOk(t.editorA, p.id, 'approve')
    // Commercial does not even see an editorial post.
    expect([403, 404]).toContain((await act(t.commercial, p.id, 'cancel')).status)
    await actOk(t.eic, p.id, 'cancel')
    expect(await post(p.id)).toMatchObject({ status: 'cancelled' })
    expect((await sendPass(id, 10 * 60_000)).sent).toEqual([])
    expect(mock.calls.filter((c) => c.method.startsWith('send'))).toEqual([])
  })

  it('a later time chosen at approval wins over the delay; a story without an image goes as text', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    const later = new Date(Date.now() + 20 * 60_000).toISOString()
    await actOk(t.editorA, p.id, 'approve', { sendAt: later })
    expect(new Date((await post(p.id)).sendAt).getTime()).toBe(new Date(later).getTime())
    expect((await sendPass(id, 5 * 60_000)).sent).toEqual([])
    expect((await sendPass(id, 21 * 60_000)).sent).toEqual([p.id])
    expect(mock.of('sendMessage')[0].params).toMatchObject({ text: p.captionHtml, parse_mode: 'HTML' })
  })
})

describe('I1: who may approve', () => {
  it('not an author of the story, and not the person who wrote the caption', async () => {
    const s = await story(t.authorEditor, [t.authorEditorByline])
    await goOk(t.authorEditor, s.id, { action: 'submit' })
    await goOk(t.editorA, s.id, { action: 'approve' })
    await goOk(t.editorB, s.id, { action: 'publish' })
    await outbox(s.id)
    const [p] = await postsFor(s.id)
    const own = await act(t.authorEditor, p.id, 'approve')
    expect(own.status).toBe(403)
    expect(JSON.stringify(own.json)).toMatch(/muallifi/)
    expect((await act(t.reporter, p.id, 'approve')).status).toBe(403)

    // editorA rewrites the caption: now editorA requested it and cannot release it.
    await payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: `${p.captionHtml}\n\n<i>Qoʻshimcha</i>` } as never, ...as(t.editorA) })
    expect(await post(p.id)).toMatchObject({ requestedBy: t.editorA.id, status: 'draft' })
    const requester = await act(t.editorA, p.id, 'approve')
    expect(requester.status).toBe(403)
    expect(JSON.stringify(requester.json)).toMatch(/soʻragan/)
    await actOk(t.editorB, p.id, 'approve')
    expect(await post(p.id)).toMatchObject({ status: 'queued', approvedBy: t.editorB.id })
    // Once queued the caption is locked until someone cancels.
    await rejects(payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: '<b>Boshqa</b>' } as never, ...as(t.editorB) }), /Bekor qilish/)
  })

  it('the panel’s state names the actions each user has, and why not', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    const state = async (u: U) => (await rest('GET', `/api/telegram-posts/${p.id}/state`, { cookie: await cookieOf(u) })).json
    const editor = await state(t.editorA)
    expect(editor).toMatchObject({ status: 'draft', statusLabel: 'Qoralama', limit: 4096, posting: { configured: true, enabled: true, delayMinutes: 3, readOnly: false } })
    expect(editor.actions.map((a: Doc) => [a.id, a.label])).toEqual([
      ['approve', 'Tasdiqlash va navbatga qoʻyish'],
      ['cancel', 'Bekor qilish'],
    ])
    const author = await state(t.reporter)
    expect(author.actions).toEqual([])
    expect(author.hint).toMatch(/faqat muharrir/)
    expect((await rest('GET', `/api/telegram-posts/${p.id}/state`)).status).toBe(401)
  })

  it('a post made by hand is the maker’s request; only for a live story', async () => {
    const id = await publishedStory(t)
    const created = (await payload.create({ collection: 'telegram-posts', data: { article: id } as never, depth: 0, ...as(t.editorA) })) as Doc
    expect(created).toMatchObject({ kind: 'article', status: 'draft', requestedBy: t.editorA.id })
    expect(created.captionHtml).toContain('<b>')
    expect((await act(t.editorA, created.id, 'approve')).status).toBe(403)
    const draft = await story(t.reporter, [t.reporterByline])
    await rejects(payload.create({ collection: 'telegram-posts', data: { article: draft.id } as never, ...as(t.editorA) }), /chop etilmagan/)
    await rejects(payload.create({ collection: 'telegram-posts', data: { article: id, kind: 'retraction' } as never, ...as(t.editorA) }), /faqat maqola posti/)
  })
})

describe('I3: the caption limit after entity parsing', () => {
  it('1,025 visible units are refused with a photo; 1,024 plus <b> tags are accepted', async () => {
    const image = await media()
    const id = await publishedStory(t, { image })
    await outbox(id)
    const [p] = await postsFor(id)
    await rejects(payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: 'a'.repeat(1025) } as never, ...as(t.editorA) }), /1025 belgi/)
    const ok = (await payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: `<b>${'a'.repeat(1024)}</b>` } as never, ...as(t.editorA) })) as Doc
    expect(ok.captionHtml).toHaveLength(1031)
    await rejects(payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: '<b>a' } as never, ...as(t.editorA) }), /yopilmagan/)
  })
})

describe('I4: sponsored posts', () => {
  async function sponsoredLive(): Promise<number> {
    const s = await story(t.commercial, [t.commercialByline], {
      sponsored: { enabled: true, partner: 'Hamkor bank', disclosure: 'Material Hamkor bank buyurtmasi bilan tayyorlandi.', contractRef: 'SH-2026-99', category: 'general' },
    })
    await goOk(t.commercial, s.id, { action: 'submit' })
    await goOk(t.eic, s.id, { action: 'approve' })
    await goOk(t.eic, s.id, { action: 'publish' })
    return s.id as number
  }

  it('the template starts with «Reklama»; that line stays, only the partner on it may change; only the editor-in-chief approves', async () => {
    const id = await sponsoredLive()
    await outbox(id)
    const [p] = await postsFor(id)
    expect(p.sponsored).toBe(true)
    expect(p.captionHtml.split('\n')[0]).toBe('<b>Reklama</b> · Hamkor bank')
    expect(p.captionHtml.endsWith('\n\n#reklama')).toBe(true)

    await rejects(payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: p.captionHtml.split('\n').slice(2).join('\n') } as never, ...as(t.editorA) }), /birinchi qatori/)
    await rejects(payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: p.captionHtml.replace('#reklama', '#tahlil') } as never, ...as(t.eic) }), /oʻzgartirilmaydi/)
    await payload.update({ collection: 'telegram-posts', id: p.id, data: { captionHtml: p.captionHtml.replace('Hamkor bank', 'Hamkor bank ATB') } as never, ...as(t.eic) })
    expect(await post(p.id)).toMatchObject({ requestedBy: null })

    const editor = await act(t.editorA, p.id, 'approve')
    expect(editor.status).toBe(403)
    expect(JSON.stringify(editor.json)).toMatch(/bosh muharrir/)
    await actOk(t.eic, p.id, 'approve')
    expect(await post(p.id)).toMatchObject({ status: 'queued', approvedBy: t.eic.id })
  })

  it('commercial proposes posts for sponsored stories only', async () => {
    const id = await sponsoredLive()
    const own = (await payload.create({ collection: 'telegram-posts', data: { article: id, captionHtml: '<b>Reklama</b> · Hamkor bank (aksiya)' } as never, depth: 0, ...as(t.commercial) })) as Doc
    expect(own).toMatchObject({ sponsored: true, requestedBy: t.commercial.id, status: 'draft' })
    expect(own.captionHtml.split('\n')[0]).toBe('<b>Reklama</b> · Hamkor bank (aksiya)')
    const editorial = await publishedStory(t)
    await rejects(payload.create({ collection: 'telegram-posts', data: { article: editorial } as never, ...as(t.commercial) }), /faqat homiylik/)
  })
})

describe('I5: a correction edits the caption and replies to the original post', () => {
  it('edit_pending with "Tuzatish (dd.mm): …", a TUZATISH reply to the message id; one approval releases both', async () => {
    const { id, post: original } = await sentStory()
    const story = await live(id)
    const text = 'Tuzatildi: 1-xatboshida 4,5 mlrd emas, 5,4 mlrd soʻm.'
    await payload.update({
      collection: 'articles',
      id,
      draft: true,
      data: { changeNote: { kind: 'correction' }, corrections: [{ kind: 'correction', publicText: text, location: '1-xatboshi' }], _status: 'draft' } as never,
      ...as(t.editorB),
    })
    await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(t.editorB) })
    await outbox(id)
    await outbox(id)

    const rows = await postsFor(id)
    const edit = rows.find((r) => r.id === original.id)!
    const reply = rows.filter((r) => r.kind === 'correction_reply')
    expect(reply).toHaveLength(1)
    expect(edit.status).toBe('edit_pending')
    expect(edit.captionHtml).toMatch(new RegExp(`^${original.captionHtml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\nTuzatish \\(\\d\\d\\.\\d\\d\\): ${text}$`))
    expect(reply[0]).toMatchObject({ status: 'draft', replyTo: original.messageId })
    expect(reply[0].captionHtml).toBe(`TUZATISH: ${text}\n${SITE()}/t/${story.shortCode}`)

    // The editor who published the correction is not an author: they may approve the Telegram edit.
    await actOk(t.editorB, edit.id, 'approve')
    expect(await post(edit.id)).toMatchObject({ status: 'approved' })
    expect(await post(reply[0].id)).toMatchObject({ status: 'queued', approvedBy: t.editorB.id })

    const first = await sendPass(id, 5_000)
    expect(first.edited).toEqual([edit.id])
    expect(mock.of('editMessageCaption')[0].params).toMatchObject({ message_id: Number(original.messageId), caption: edit.captionHtml, parse_mode: 'HTML' })
    expect(mock.of('sendMessage')).toHaveLength(0)
    expect(await post(edit.id)).toMatchObject({ status: 'edited' })

    const second = await sendPass(id, 4 * 60_000)
    expect(second.sent).toEqual([reply[0].id])
    expect(mock.of('sendMessage')[0].params).toMatchObject({ reply_parameters: { message_id: Number(original.messageId), allow_sending_without_reply: false } })
    expect((await live(id)).corrections[0].telegramAction).toBe('reply_posted')
  })

  it('a clarification edits the caption only', async () => {
    const { id, post: original } = await sentStory()
    await payload.update({
      collection: 'articles',
      id,
      draft: true,
      data: { changeNote: { kind: 'clarification' }, corrections: [{ kind: 'clarification', publicText: 'Aniqlik: manba hisoboti 2026-yilniki.' }], _status: 'draft' } as never,
      ...as(t.eic),
    })
    // A clarification is the editor-in-chief's to publish (§5.6).
    await payload.update({ collection: 'articles', id, data: { _status: 'published' } as never, ...as(t.eic) })
    await outbox(id)
    const rows = await postsFor(id)
    expect(rows.filter((r) => r.kind === 'correction_reply')).toEqual([])
    expect(rows[0].captionHtml).toMatch(/\n\nAniqlik \(\d\d\.\d\d\): Aniqlik: manba/)
    // Cancelling the edit puts the caption the channel shows back.
    await actOk(t.editorA, original.id, 'cancel')
    expect(await post(original.id)).toMatchObject({ status: 'sent', captionHtml: original.captionHtml })
  })
})

describe('I6: withdrawal', () => {
  const withdraw = (id: number) => goOk(t.eic, id, { action: 'withdraw', withdrawal: { publicNotice: 'Maqola tahririyat qarori bilan olib tashlandi.', internalReason: 'Sinov' } })

  it('a post older than 48 h: the caption becomes the retraction and a manual-deletion task opens; no deleteMessage', async () => {
    const { id, post: p } = await sentStory()
    await payload.update({ collection: 'telegram-posts', id: p.id, data: { sentAt: new Date(Date.now() - 49 * 3600_000).toISOString() } as never, overrideAccess: true, context: { telegramBookkeeping: true } })
    await withdraw(id)
    await outbox(id)
    await outbox(id)
    const retractions = (await postsFor(id)).filter((r) => r.kind === 'retraction')
    expect(retractions).toHaveLength(1)
    const r = retractions[0]
    expect(r).toMatchObject({ status: 'draft', replyTo: p.messageId })
    expect((await act(t.editorA, r.id, 'approve')).status).toBe(403)
    await actOk(t.eic, r.id, 'approve')

    const out = await sendPass(id)
    expect(out.retracted).toEqual([r.id])
    expect(mock.of('deleteMessage')).toEqual([])
    const edit = mock.of('editMessageCaption')
    expect(edit).toHaveLength(1)
    expect(edit[0].params.message_id).toBe(Number(p.messageId))
    expect(String(edit[0].params.caption)).toMatch(/^<b>Material olib tashlandi<\/b>\n\nMaqola tahririyat qarori bilan olib tashlandi\./)
    expect(await post(p.id)).toMatchObject({ status: 'retracted' })
    expect(await post(r.id)).toMatchObject({ status: 'edited' })
    expect(alerts.map((a) => a.subject)).toEqual(['Telegram: postni qoʻlda oʻchiring'])
    expect(alerts[0].text).toContain(`https://t.me/${CHANNEL.slice(1)}/${p.messageId}`)

    await actOk(t.editorA, r.id, 'confirm_deleted')
    expect(await post(r.id)).toMatchObject({ status: 'retracted' })
  })

  it('a young post is deleted, at the moment of the call', async () => {
    const { id, post: p } = await sentStory()
    await withdraw(id)
    await outbox(id)
    const r = (await postsFor(id)).find((x) => x.kind === 'retraction')!
    await actOk(t.eic, r.id, 'approve')
    await sendPass(id)
    expect(mock.of('deleteMessage').map((c) => c.params.message_id)).toEqual([Number(p.messageId)])
    expect(mock.of('editMessageCaption')).toEqual([])
    expect(await post(r.id)).toMatchObject({ status: 'retracted' })
    expect(await post(p.id)).toMatchObject({ status: 'retracted' })
  })

  it('a story withdrawn before its post went out: the post is cancelled, nothing to retract', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    await actOk(t.editorA, p.id, 'approve')
    await withdraw(id)
    await outbox(id)
    expect((await postsFor(id)).map((x) => [x.kind, x.status])).toEqual([['article', 'cancelled']])
    expect((await sendPass(id, 10 * 60_000)).sent).toEqual([])
  })
})

describe('I7: rights beyond post, edit and delete pause posting', () => {
  it('an extra right stops the send, alerts and switches posting off', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    await actOk(t.editorA, p.id, 'approve')
    const head = await auditHead()
    mock.on('getChatMember', () => botMember({ can_invite_users: true }))
    const out = await sendPass(id, 4 * 60_000)
    expect(out.sent).toEqual([])
    expect(out.paused).toMatch(/rights/)
    expect(mock.calls.filter((c) => c.method.startsWith('send'))).toEqual([])
    const rows = await auditRows('telegram.rights_check_failed', head)
    expect(rows).toHaveLength(1)
    expect(rows[0].summary).toMatch(/can_invite_users/)
    expect((await alertFor(rows[0] as never, ruleCtx()))?.kind).toBe('telegram_admin')
    const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as Doc
    expect(settings.telegram.postingEnabled).toBe(false)
    expect(await post(p.id)).toMatchObject({ status: 'queued' })

    // The same problem again is not alerted twice; a right Telegram adds later is refused as well.
    await sendPass(id, 4 * 60_000)
    expect(await auditRows('telegram.rights_check_failed', head)).toHaveLength(1)
    mock.on('getChatMember', () => botMember({ can_send_welcome_messages: true }))
    await sendPass(id, 4 * 60_000)
    expect(await auditRows('telegram.rights_check_failed', head)).toHaveLength(2)

    // Fixed rights do not resume on their own: a person switches posting on.
    mock.on('getChatMember', undefined)
    expect((await sendPass(id, 4 * 60_000)).paused).toBe('posting disabled')
    await setPosting(true)
    expect((await sendPass(id, 4 * 60_000)).sent).toEqual([p.id])
  })
})

describe('I8: channel changes', () => {
  it('a new channel admin in chat_member alerts at once; a subscriber joining does not', async () => {
    const head = await auditHead()
    const user = { id: 4242, is_bot: false, first_name: 'Begona', username: 'stranger' }
    const date = Math.floor(Date.now() / 1000)
    mock.on('getUpdates', (params) =>
      params.offset === undefined
        ? [
            {
              update_id: 100,
              chat_member: {
                chat: mock.chat,
                from: { id: 111, is_bot: false, first_name: 'Kanal' },
                date,
                old_chat_member: { status: 'member', user },
                new_chat_member: { status: 'administrator', user, can_post_messages: true, can_promote_members: true },
              },
            },
            { update_id: 101, chat_member: { chat: mock.chat, from: user, date, old_chat_member: { status: 'left', user }, new_chat_member: { status: 'member', user } } },
          ]
        : [],
    )
    mock.on('getChatAdministrators', () => [ownerMember(), botMember(), { status: 'administrator', user, can_post_messages: true, can_promote_members: true }])
    const result = await pollUpdates(payload, createBotClient(), { timeout: 0 })
    expect(result.handled).toBe(2)
    const rows = await auditRows('telegram.channel_admin_change', head)
    expect(rows).toHaveLength(1)
    expect(rows[0].summary).toMatch(/Begona \(@stranger\): member → administrator/)
    expect((await alertFor(rows[0] as never, ruleCtx()))?.kind).toBe('telegram_admin')
    const poll = mock.of('getUpdates')[0]
    expect(poll.params.allowed_updates).toEqual(['channel_post', 'edited_channel_post', 'chat_member', 'my_chat_member'])
    await pollUpdates(payload, createBotClient(), { timeout: 0 })
    expect(mock.of('getUpdates')[1].params.offset).toBe(102)

    // The hourly comparison does not report the same change again, but catches one the stream missed.
    await runChannelChecks(payload, createBotClient())
    expect(await auditRows('telegram.channel_admin_change', head)).toHaveLength(1)
    mock.on('getChatAdministrators', () => [ownerMember(), botMember()])
    const check = await runChannelChecks(payload, createBotClient())
    expect(check.chatId).toBe(String(CHAT_ID))
    const after = await auditRows('telegram.channel_admin_change', head)
    expect(after).toHaveLength(2)
    expect(after[1].summary).toMatch(/soatlik tekshiruv.*olib tashlandi: Begona/)
    expect(((await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as Doc).telegram.channelChatId).toBe(String(CHAT_ID))
  })

  it('the bot’s own demotion (my_chat_member) alerts and pauses posting', async () => {
    const head = await auditHead()
    const bot = botMember().user
    mock.on('getUpdates', (params) =>
      (params.offset as number) <= 200
        ? [{ update_id: 200, my_chat_member: { chat: mock.chat, from: { id: 111, is_bot: false, first_name: 'Kanal' }, date: 1, old_chat_member: botMember(), new_chat_member: { status: 'member', user: bot } } }]
        : [],
    )
    await payload.kv.set(KV.updates, { offset: 200 })
    mock.on('getChatMember', () => ({ status: 'member', user: bot }))
    await pollUpdates(payload, createBotClient(), { timeout: 0 })
    expect((await auditRows('telegram.channel_admin_change', head))[0].summary).toMatch(/Botning kanaldagi holati oʻzgardi: administrator → member/)
    expect(await auditRows('telegram.rights_check_failed', head)).toHaveLength(1)
    mock.on('getChatMember', undefined)
    await setPosting(true)
  })

  it('409 from getUpdates (a webhook, or another poller with our token) is a security alert, once an hour', async () => {
    const head = await auditHead()
    mock.on('getUpdates', () => fail(409, 'Conflict: terminated by other getUpdates request; make sure that only one bot instance is running'))
    expect(await pollUpdates(payload, createBotClient(), { timeout: 0 })).toMatchObject({ conflict: true })
    await pollUpdates(payload, createBotClient(), { timeout: 0 })
    const rows = await auditRows('telegram.token_conflict', head)
    expect(rows).toHaveLength(1)
    expect((await alertFor(rows[0] as never, ruleCtx()))?.kind).toBe('telegram_admin')
  })

  it('manual posts are recorded and matched to the story by its link; manual edits are kept', async () => {
    const id = await publishedStory(t)
    const story = await live(id)
    const caption = `Yangi maqola\n${SITE()}/t/${story.shortCode}`
    const mid = 900_000_000 + Math.floor(Math.random() * 99_999_999)
    await payload.kv.set(KV.updates, { offset: 300 })
    mock.on('getUpdates', (params) =>
      params.offset === 300
        ? [
            { update_id: 300, channel_post: { message_id: mid, date: 1_760_000_000, chat: mock.chat, text: caption, entities: [{ type: 'bold', offset: 0, length: 12 }] } },
            { update_id: 301, edited_channel_post: { message_id: mid, date: 1_760_000_000, edit_date: 1_760_000_100, chat: mock.chat, text: `${caption} (yangilandi)` } },
          ]
        : [],
    )
    await pollUpdates(payload, createBotClient(), { timeout: 0 })
    const [row] = (await postsFor(id)).filter((r) => r.messageId === String(mid))
    expect(row).toMatchObject({ kind: 'article', status: 'edited', chatId: String(CHAT_ID) })
    expect(row.history.map((h: Doc) => h.action)).toEqual(['manual_post', 'manual_edit'])
    expect(row.history[0].captionHtml).toBe(`<b>Yangi maqola</b>\n${SITE()}/t/${story.shortCode}`)
  })
})

describe('failures, read-only mode, no token', () => {
  it('a send that fails is not retried by itself; an editor re-queues it', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    await actOk(t.editorA, p.id, 'approve')
    mock.on('sendMessage', () => fail(400, "Bad Request: can't parse entities: unsupported start tag"))
    const out = await sendPass(id, 4 * 60_000)
    expect(out.failed.map((f) => f.id)).toEqual([p.id])
    expect(await post(p.id)).toMatchObject({ status: 'failed', lastError: expect.stringMatching(/can't parse entities/) })
    expect(alerts.map((a) => a.subject)).toEqual(['Telegram posti yuborilmadi'])
    await sendPass(id, 10 * 60_000)
    expect(mock.of('sendMessage')).toHaveLength(1)
    mock.on('sendMessage', undefined)
    await actOk(t.editorB, p.id, 'approve')
    expect((await sendPass(id, 4 * 60_000)).sent).toEqual([p.id])
  })

  it('a send without an answer is marked failed with a note to check the channel, never resent', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    await actOk(t.editorA, p.id, 'approve')
    mock.on('sendMessage', () => ({ delayMs: 600, then: { message_id: 1, date: 1, chat: mock.chat } }))
    const out = await sendPass(id, 4 * 60_000, { client: createBotClient({ timeoutMs: 150 }) })
    expect(out.failed.map((f) => f.id)).toEqual([p.id])
    expect((await post(p.id)).lastError).toMatch(/yetgan boʻlishi mumkin: kanalni tekshiring/)
    expect(mock.of('sendMessage')).toHaveLength(1)
  })

  it('read-only mode pauses sending and refuses approvals', async () => {
    const id = await publishedStory(t)
    await outbox(id)
    const [p] = await postsFor(id)
    process.env.CMS_READ_ONLY = '1'
    try {
      expect((await act(t.editorA, p.id, 'approve')).status).toBe(403)
      await payload.update({ collection: 'telegram-posts', id: p.id, data: { status: 'queued', sendAt: new Date().toISOString() } as never, overrideAccess: true, context: { telegramBookkeeping: true } })
      expect(await sendPass(id, 60_000)).toMatchObject({ paused: 'read-only', sent: [] })
      expect(mock.calls).toEqual([])
    } finally {
      delete process.env.CMS_READ_ONLY
    }
  })

  it('without a token nothing is prepared or sent', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    try {
      const id = await publishedStory(t)
      await outbox(id)
      expect(await postsFor(id)).toEqual([])
      expect(await processDuePosts(payload, { alert: capture })).toMatchObject({ paused: 'not configured' })
    } finally {
      process.env.TELEGRAM_BOT_TOKEN = TOKEN
    }
  })

  it('I9: in staging the production channel is refused at startup', async () => {
    const env = { SITE_ENV: process.env.SITE_ENV, TELEGRAM_CHANNEL: process.env.TELEGRAM_CHANNEL }
    process.env.SITE_ENV = 'staging'
    process.env.TELEGRAM_CHANNEL = '@muomalatuz'
    resetTelegramStartup()
    try {
      expect(await telegramMayRun(payload)).toBe(false)
      process.env.TELEGRAM_CHANNEL = CHANNEL
      resetTelegramStartup()
      expect(await telegramMayRun(payload)).toBe(true)
    } finally {
      process.env.SITE_ENV = env.SITE_ENV
      process.env.TELEGRAM_CHANNEL = env.TELEGRAM_CHANNEL
      resetTelegramStartup()
    }
  })

  it('the outbox step is a no-op for other collections', async () => {
    await telegramForEvent(payload, { collection: 'glossary-terms', docId: '1', kind: 'publish_first' } as never, { first: true } as never)
    expect(mock.calls).toEqual([])
  })
})
