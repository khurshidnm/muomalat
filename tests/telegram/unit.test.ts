import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  appendNote,
  articleCaption,
  CAPTION_LIMIT,
  captionHtmlProblem,
  captionLength,
  correctionNote,
  correctionReplyText,
  entitiesToHtml,
  escapeHtml,
  hashtagFor,
  retractionCaption,
  siteLinksIn,
  splitSponsored,
  sponsoredEditProblem,
  truncateText,
} from '@/payload/telegram/caption'
import { createBotClient, isBadFileId, isCannotDelete, isConflict, isNotModified, TelegramError } from '@/payload/telegram/client'
import { botIdOf, redact, telegramStartupFindings, type TelegramEnv } from '@/payload/telegram/env'
import { checkRights, diffAdmins, involvesAdmin, type AdminEntry } from '@/payload/telegram/rights'
import { approvalProblem, type ArticleFacts } from '@/payload/telegram/shared'
import { BOT_ID, botMember, fail, startMockBotApi, TOKEN, type MockBotApi } from './mockBotApi'

/**
 * The parts of the Telegram integration that need no database (CMS-SPEC §10):
 * templates and the caption counter (I3, I4), the rights allow-list (I7),
 * the startup check (I9), and the Bot API client's timeouts and retries,
 * against the local mock server (never api.telegram.org).
 */

const SHORT = 'https://muomalat.uz/t/abc123'

describe('templates (§10.4)', () => {
  it('builds bold headline, lead, bare short link and the rubric hashtag; escapes only <, > and &', () => {
    const html = articleCaption({ title: 'Sukuk & ijara: <yangi> qoida', lead: 'Markaziy bank "ijara" qoidasini eʼlon qildi.', shortUrl: SHORT, rubricSlug: 'tahlil' })
    expect(html).toBe(`<b>Sukuk &amp; ijara: &lt;yangi&gt; qoida</b>\n\nMarkaziy bank "ijara" qoidasini eʼlon qildi.\n\n${SHORT}\n\n#tahlil`)
    expect(html).not.toMatch(/<a /)
    expect(captionHtmlProblem(html)).toBeNull()
  })

  it('the sponsored template starts with «Reklama · partner» and ends with #reklama (I4)', () => {
    const html = articleCaption({ title: 'Omonat', lead: 'Lid.', shortUrl: SHORT, rubricSlug: 'tahlil', sponsored: true, partner: 'Hamkor bank' })
    expect(html).toBe(`<b>Reklama</b> · Hamkor bank\n\n<b>Omonat</b>\n\nLid.\n\n${SHORT}\n\n#reklama`)
    expect(articleCaption({ title: 'T', shortUrl: SHORT, sponsored: true }).split('\n')[0]).toBe('<b>Reklama</b> · Hamkorlik materiali')
  })

  it('a long lead is cut at a word with «…» so the caption fits; title, link and hashtag stay', () => {
    const lead = 'soʻz '.repeat(400).trim()
    const html = articleCaption({ title: 'Sarlavha', lead, shortUrl: SHORT, rubricSlug: 'yangiliklar' })
    expect(captionLength(html)).toBeLessThanOrEqual(CAPTION_LIMIT)
    expect(html).toMatch(/…\n\nhttps:\/\/muomalat\.uz\/t\/abc123\n\n#yangiliklar$/)
    expect(html.startsWith('<b>Sarlavha</b>\n\n')).toBe(true)
  })

  it('hashtags take letters, digits and _ only', () => {
    expect(hashtagFor('islom-moliyasi')).toBe('#islom_moliyasi')
    expect(hashtagFor('')).toBeUndefined()
    expect(hashtagFor('2026')).toBeUndefined()
  })

  it('corrections: "Tuzatish (dd.mm): …" in Tashkent time, and the TUZATISH reply text', () => {
    // 20:00 UTC on 10 October is 01:00 on 11 October in Tashkent.
    expect(correctionNote('correction', 'Tuzatildi: 4,5 emas, 5,4 mlrd.', '2026-10-10T20:00:00.000Z')).toBe('Tuzatish (11.10): Tuzatildi: 4,5 emas, 5,4 mlrd.')
    expect(correctionNote('clarification', 'x', '2026-10-01T05:00:00.000Z')).toBe('Aniqlik (01.10): x')
    expect(correctionNote('editors_note', 'a < b', '2026-10-01T05:00:00.000Z')).toBe('Tahririyat izohi (01.10): a &lt; b')
    expect(correctionReplyText('Raqam: 5,4 & 4,5', SHORT)).toBe(`TUZATISH: Raqam: 5,4 &amp; 4,5\n${SHORT}`)
  })

  it('appendNote keeps the note whole and shortens the lead to stay within the limit', () => {
    const base = articleCaption({ title: 'Sarlavha', lead: 'x'.repeat(30) + ' ' + 'soʻz '.repeat(180), shortUrl: SHORT, rubricSlug: 'tahlil' })
    const note = correctionNote('correction', 'Tuzatildi: '.padEnd(200, 'y'), Date.now())
    const out = appendNote(base, note)!
    expect(captionLength(out)).toBeLessThanOrEqual(CAPTION_LIMIT)
    expect(out.endsWith(`\n\n${note}`)).toBe(true)
    expect(out).toContain(SHORT)
    expect(out).toContain('#tahlil')
    expect(appendNote('<b>T</b>', 'n'.repeat(2000))).toBeUndefined()
  })

  it('a retraction caption keeps an ad’s first line', () => {
    expect(retractionCaption({ notice: 'Olib tashlandi.', shortUrl: SHORT })).toBe(`<b>Material olib tashlandi</b>\n\nOlib tashlandi.\n\n${SHORT}`)
    expect(retractionCaption({ sponsored: true, partner: 'Bank' }).split('\n')[0]).toBe('<b>Reklama</b> · Bank')
  })

  it('truncateText never leaves half a surrogate pair', () => {
    const t = truncateText('a'.repeat(48) + '😀'.repeat(10), 50)
    expect(t.endsWith('…')).toBe(true)
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(t)).toBe(false)
  })
})

describe('I3: the caption counter (§10.2)', () => {
  it('counts UTF-16 units after removing tags and decoding entities', () => {
    expect(captionLength(`<b>${'a'.repeat(1024)}</b>`)).toBe(1024)
    expect(captionLength('a'.repeat(1025))).toBe(1025)
    expect(captionLength('<b>x</b> &amp; &lt;y&gt; <a href="https://muomalat.uz">z</a>')).toBe('x & <y> z'.length)
    // An emoji is two UTF-16 units: the conservative bound (Telegram counts one code point).
    expect(captionLength('😀')).toBe(2)
  })
})

describe('caption markup Telegram parses', () => {
  it('accepts <b>, <i>, <a href="https://…"> and the four entities', () => {
    expect(captionHtmlProblem('<b>a</b> <i>b</i> <a href="https://muomalat.uz/t/abc123">c</a> &lt;&gt;&amp;&quot;')).toBeNull()
  })
  it.each([
    ['<u>a</u>', /<u> tegi ishlatilmaydi/],
    ['<b>a', /yopilmagan/],
    ['<b><i>a</b></i>', /tartibi/],
    ['a < b', /«<»/],
    ['a > b', /«>»/],
    ['AT&T', /«&»/],
    ['&#123;', /«&»/],
    ['<a href="javascript:alert(1)">x</a>', /href/],
    ['<a href="https://x"><a href="https://y">z</a></a>', /ichida/],
    ['<b class="x">a</b>', /atribut/],
  ])('refuses %s', (html, reason) => {
    expect(captionHtmlProblem(html)).toMatch(reason)
  })
})

describe('I4: the sponsored first line', () => {
  const stored = articleCaption({ title: 'Omonat', lead: 'Lid.', shortUrl: SHORT, sponsored: true, partner: 'Hamkor bank' })
  it('cannot be removed, and the rest cannot change; the partner can', () => {
    expect(sponsoredEditProblem(stored, stored.split('\n').slice(2).join('\n'))).toMatch(/birinchi qatori/)
    expect(sponsoredEditProblem(stored, stored.replace('<b>Reklama</b>', '<b>Hamkorlik</b>'))).toMatch(/birinchi qatori/)
    expect(sponsoredEditProblem(stored, stored.replace('Lid.', 'Boshqa lid.'))).toMatch(/oʻzgartirilmaydi/)
    expect(sponsoredEditProblem(stored, stored.replace('Hamkor bank', 'Hamkor bank ATB'))).toBeNull()
    expect(splitSponsored(stored)?.partner).toBe('Hamkor bank')
  })
})

describe('messages read back from Telegram', () => {
  it('entities become HTML, nested, with UTF-16 offsets', () => {
    const text = '😀 Sukuk bozori https://muomalat.uz/t/abc123'
    const html = entitiesToHtml(text, [
      { type: 'bold', offset: 3, length: 12 },
      { type: 'italic', offset: 9, length: 6 },
      { type: 'url', offset: 16, length: 28 },
    ])
    expect(html).toBe('😀 <b>Sukuk <i>bozori</i></b> https://muomalat.uz/t/abc123')
    expect(entitiesToHtml('a<b', [{ type: 'text_link', offset: 0, length: 3, url: 'https://x.uz/?a=1&b=2' }])).toBe('<a href="https://x.uz/?a=1&amp;b=2">a&lt;b</a>')
  })
  it('finds the site links in a message, also behind text links', () => {
    expect(siteLinksIn('Batafsil: https://muomalat.uz/t/abc123 va https://kun.uz/x', [{ type: 'text_link', offset: 0, length: 8, url: 'https://muomalat.uz/ru/tahlil/sukuk' }])).toEqual([
      '/t/abc123',
      '/ru/tahlil/sukuk',
    ])
  })
})

describe('I7: the rights check is an allow-list (§10.5)', () => {
  it('post, edit, delete and manage_chat pass; every other right is refused, including ones Telegram adds later', () => {
    expect(checkRights(botMember())).toMatchObject({ ok: true, unexpected: [], missing: [] })
    expect(checkRights(botMember({ can_invite_users: true }))).toMatchObject({ ok: false, unexpected: ['can_invite_users'] })
    expect(checkRights(botMember({ can_send_welcome_messages: true }))).toMatchObject({ ok: false, unexpected: ['can_send_welcome_messages'] })
    expect(checkRights(botMember({ can_do_something_new: true }))).toMatchObject({ ok: false, unexpected: ['can_do_something_new'] })
    expect(checkRights(botMember({ can_promote_members: 1 }))).toMatchObject({ ok: false, unexpected: ['can_promote_members'] })
  })
  it('posting is required; editing and deleting other admins’ posts are optional (least privilege)', () => {
    expect(checkRights(botMember({ can_post_messages: false }))).toMatchObject({ ok: false, missing: ['can_post_messages'] })
    expect(checkRights(botMember({ can_edit_messages: false, can_delete_messages: false }))).toMatchObject({ ok: true })
    expect(checkRights({ status: 'member' })).toMatchObject({ ok: false, missing: ['can_post_messages'] })
  })
  it('admin snapshots: added, removed and changed admins', () => {
    const a = (id: number, rights: string[], status = 'administrator'): AdminEntry => ({ id, name: `U${id}`, status, isBot: false, rights })
    const d = diffAdmins([a(1, [], 'creator'), a(2, ['can_post_messages'])], [a(1, [], 'creator'), a(2, ['can_post_messages', 'can_promote_members']), a(3, ['can_post_messages'])])
    expect(d.added.map((x) => x.id)).toEqual([3])
    expect(d.removed).toEqual([])
    expect(d.changed.map((c) => c.after.id)).toEqual([2])
    expect(involvesAdmin('member', 'administrator')).toBe(true)
    expect(involvesAdmin('left', 'member')).toBe(false)
  })
})

describe('approval rules (I1, embargo)', () => {
  const facts: ArticleFacts = {
    id: 1,
    exists: true,
    live: true,
    deleted: false,
    withdrawn: false,
    embargo: false,
    title: 'T',
    lead: '',
    sponsored: false,
    authors: [7],
    autopost: true,
    silent: false,
    corrections: [],
  }
  const post = { kind: 'article', status: 'draft', captionHtml: '<b>T</b>', requestedBy: 9, sponsored: false }
  it('not the author, not the requester; an ad and a retraction only by the editor-in-chief; never under embargo', () => {
    expect(approvalProblem({ id: 7, role: 'editor' }, post, facts)).toMatch(/muallifi/)
    expect(approvalProblem({ id: 9, role: 'editor' }, post, facts)).toMatch(/soʻragan/)
    expect(approvalProblem({ id: 5, role: 'reporter' }, post, facts)).toMatch(/faqat muharrir/)
    expect(approvalProblem({ id: 5, role: 'editor' }, post, facts)).toBeNull()
    expect(approvalProblem({ id: 5, role: 'editor' }, { ...post, sponsored: true }, facts)).toMatch(/bosh muharrir/)
    expect(approvalProblem({ id: 5, role: 'editor' }, { ...post, kind: 'retraction' }, facts)).toMatch(/bosh muharrir/)
    expect(approvalProblem({ id: 5, role: 'eic' }, post, { ...facts, embargo: true })).toMatch(/Embargo/)
    expect(approvalProblem({ id: 5, role: 'eic' }, post, { ...facts, withdrawn: true })).toMatch(/olib tashlangan/)
    expect(approvalProblem({ id: 5, role: 'eic' }, { ...post, status: 'queued' }, facts)).toMatch(/tasdiqlanmaydi/)
  })
})

describe('I9: environments (§10.8)', () => {
  const env = (e: Partial<TelegramEnv>): TelegramEnv => ({ token: TOKEN, channel: '@muomalat_test', apiBase: 'https://api.telegram.org', siteEnv: 'staging', ...e })
  it('outside production the production channel and the production bot are refused', () => {
    expect(telegramStartupFindings(env({ channel: '@muomalatuz' }))).toEqual([expect.stringMatching(/production channel @muomalatuz outside production \(SITE_ENV=staging\)/)])
    expect(telegramStartupFindings(env({ channel: '@MuomalatUz', siteEnv: 'development' }))).toHaveLength(1)
    expect(telegramStartupFindings(env({}), BOT_ID)).toEqual([expect.stringMatching(/production bot's token outside production/)])
    expect(telegramStartupFindings(env({}))).toEqual([])
  })
  it('production posts only to @muomalatuz, with the production bot when its id is known', () => {
    expect(telegramStartupFindings(env({ siteEnv: 'production', channel: '@muomalat_test' }))).toEqual([expect.stringMatching(/not @muomalatuz/)])
    expect(telegramStartupFindings(env({ siteEnv: 'production', channel: '@muomalatuz' }), BOT_ID)).toEqual([])
    expect(telegramStartupFindings(env({ siteEnv: 'production', channel: '@muomalatuz' }), 1)).toEqual([expect.stringMatching(/not the production bot/)])
  })
  it('half a configuration is a finding; none is a no-op', () => {
    expect(telegramStartupFindings(env({ channel: '' }))).toEqual([expect.stringMatching(/without TELEGRAM_CHANNEL/)])
    expect(telegramStartupFindings(env({ token: '', channel: '' }))).toEqual([])
    expect(telegramStartupFindings(env({ token: 'nonsense' }))).toEqual([expect.stringMatching(/not a bot token/)])
  })
  it('the bot id is read from the token, which is never repeated in a message', () => {
    expect(botIdOf(TOKEN)).toBe(BOT_ID)
    expect(botIdOf('12:short')).toBeUndefined()
    expect(redact(`GET https://api.telegram.org/bot${TOKEN}/getMe failed`, TOKEN)).toBe('GET https://api.telegram.org/bot<token>/getMe failed')
    expect(redact(`x bot${TOKEN} y`, '')).toBe('x bot<token> y')
  })
})

describe('Bot API client: timeouts and retries (against the local mock)', () => {
  let mock: MockBotApi
  const sleeps: number[] = []
  const client = (extra: Parameters<typeof createBotClient>[0] = {}) =>
    createBotClient({ token: TOKEN, apiBase: mock.url, sleep: async (ms) => void sleeps.push(ms), ...extra })
  beforeAll(async () => {
    mock = await startMockBotApi()
  })
  afterAll(async () => mock.close())
  beforeEach(() => {
    mock.reset()
    sleeps.length = 0
  })

  it('sends HTML captions as JSON, with the reply attached to the post it corrects', async () => {
    const m = await client().sendMessage({ chatId: '@x', text: '<b>a</b>', replyTo: 42, silent: true })
    expect(m.message_id).toBeGreaterThan(0)
    expect(mock.of('sendMessage')[0].params).toMatchObject({
      chat_id: '@x',
      text: '<b>a</b>',
      parse_mode: 'HTML',
      disable_notification: true,
      reply_parameters: { message_id: 42, allow_sending_without_reply: false },
    })
  })

  it('uploads a photo as multipart, or reuses a file_id', async () => {
    await client().sendPhoto({ chatId: '@x', caption: 'c', photo: { data: new Uint8Array([0xff, 0xd8, 0xff]), filename: 'photo.jpg', contentType: 'image/jpeg' } })
    expect(mock.of('sendPhoto')[0].files.photo).toMatchObject({ name: 'photo.jpg', type: 'image/jpeg', size: 3 })
    expect(mock.of('sendPhoto')[0].params).toMatchObject({ caption: 'c', parse_mode: 'HTML' })
    await client().sendPhoto({ chatId: '@x', caption: 'c', photo: 'FILE-ID' })
    expect(mock.of('sendPhoto')[1].params.photo).toBe('FILE-ID')
  })

  it('a multipart caption arrives byte for byte: no "\\n" turned into "\\r\\n", UTF-8 intact', async () => {
    const caption = '<b>Sukuk</b>\n\nLid: oʻzbek tilida «matn» 😀\n\nhttps://muomalat.uz/t/abc123'
    await client().sendPhoto({ chatId: -100123, caption, silent: true, photo: { data: new Uint8Array([1, 2, 3]), filename: 'photo.jpg', contentType: 'image/jpeg' } })
    expect(mock.of('sendPhoto')[0].params).toMatchObject({ caption, chat_id: '-100123', disable_notification: 'true', parse_mode: 'HTML' })
  })

  it('waits out a 429 retry_after, even for a send (Telegram did not act)', async () => {
    let n = 0
    mock.on('sendMessage', () => (n++ === 0 ? fail(429, 'Too Many Requests: retry after 2', 2) : { message_id: 1, date: 1, chat: mock.chat }))
    await client().sendMessage({ chatId: '@x', text: 't' })
    expect(mock.of('sendMessage')).toHaveLength(2)
    expect(sleeps).toEqual([2000])
  })

  it('never retries a send that may have gone out (5xx, timeout); retries edits and reads', async () => {
    mock.on('sendMessage', () => fail(502, 'Bad Gateway'))
    const e = await client().sendMessage({ chatId: '@x', text: 't' }).catch((x) => x)
    expect(e).toBeInstanceOf(TelegramError)
    expect(e).toMatchObject({ status: 502, delivered: 'unknown' })
    expect(mock.of('sendMessage')).toHaveLength(1)

    let k = 0
    mock.on('editMessageCaption', () => (k++ < 2 ? fail(500, 'Internal Server Error') : { message_id: 1, date: 1, chat: mock.chat }))
    await client().editMessageCaption({ chatId: '@x', messageId: 1, caption: 'c' })
    expect(mock.of('editMessageCaption')).toHaveLength(3)

    mock.on('sendMessage', () => ({ delayMs: 400, then: { message_id: 1, date: 1, chat: mock.chat } }))
    const t = await client({ timeoutMs: 100 }).sendMessage({ chatId: '@x', text: 't' }).catch((x) => x)
    expect(t).toMatchObject({ status: 0, delivered: 'unknown' })
    expect(t.message).toMatch(/no answer within/)
    expect(mock.of('sendMessage')).toHaveLength(2)
  })

  it('a refusal is not retried and says why; the token never appears in an error', async () => {
    mock.on('sendMessage', () => fail(400, "Bad Request: can't parse entities: unclosed start tag"))
    const e = await client().sendMessage({ chatId: '@x', text: '<b>' }).catch((x) => x)
    expect(e).toMatchObject({ status: 400, delivered: 'no', description: "Bad Request: can't parse entities: unclosed start tag" })
    expect(mock.of('sendMessage')).toHaveLength(1)
    expect(String(e.message)).not.toContain(TOKEN)
    // A port nobody listens on: the connection is refused, so Telegram certainly did not act.
    const closed = await new Promise<number>((ok) => {
      const s = http.createServer().listen(0, '127.0.0.1', () => {
        const { port } = s.address() as AddressInfo
        s.close(() => ok(port))
      })
    })
    const unreachable = await createBotClient({ token: TOKEN, apiBase: `http://127.0.0.1:${closed}`, attempts: 2, sleep: async () => {} }).sendMessage({ chatId: '@x', text: 't' }).catch((x) => x)
    expect(unreachable).toMatchObject({ status: 0, delivered: 'no' })
    expect(unreachable.message).toMatch(/ECONNREFUSED/)
    expect(String(unreachable.message)).not.toContain(TOKEN)
  })

  it('recognises the answers the worker acts on', async () => {
    const answer = async (status: number, description: string) => {
      mock.on('deleteMessage', () => fail(status, description))
      return client({ attempts: 1 }).deleteMessage({ chatId: '@x', messageId: 1 }).catch((x) => x)
    }
    expect(isCannotDelete(await answer(400, "Bad Request: message can't be deleted"))).toBe(true)
    expect(isNotModified(await answer(400, 'Bad Request: message is not modified: specified new message content and reply markup are exactly the same'))).toBe(true)
    expect(isBadFileId(await answer(400, 'Bad Request: wrong file identifier/HTTP URL specified'))).toBe(true)
    mock.on('getUpdates', () => fail(409, 'Conflict: terminated by other getUpdates request; make sure that only one bot instance is running'))
    expect(isConflict(await client().getUpdates({ timeout: 0, allowedUpdates: [] }).catch((x) => x))).toBe(true)
  })

  it('escapeHtml escapes only <, > and &', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(`&lt;a href="x"&gt;'&amp;'&lt;/a&gt;`)
  })
})
