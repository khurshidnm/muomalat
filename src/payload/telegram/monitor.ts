import type { CollectionSlug, Payload } from 'payload'

import { sendOperationalAlert } from '../audit/alerts'
import { recordSystemAudit } from '../audit/writer'
import { deliveryEnv } from '../delivery/env'
import { entitiesToHtml, siteLinksIn, splitSponsored } from './caption'
import { isConflict, TelegramError, type BotClient, type TgChat, type TgChatMember, type TgMessage, type TgUpdate } from './client'
import { botIdOf, redact, telegramEnv } from './env'
import { adminEntry, checkRights, describeAdminDiff, describeRights, diffAdmins, involvesAdmin, isEmptyDiff, type AdminDiff, type AdminEntry, type RightsResult } from './rights'
import { deliveredCaption, messageLink, nowIso, POSTS, systemContext, telegramSettings, withHistory, type Doc, type Id } from './shared'

/**
 * Watching the bot and the channel (CMS-SPEC §10.5, §10.6; tests I7, I8).
 *
 * - **Rights** (`verifyRights`): `getChatMember(channel, bot)` through the
 *   allow-list of ./rights.ts, before every send pass and in the hourly
 *   check. A failure is recorded as `telegram.rights_check_failed` (an
 *   immediate alert) once per distinct problem, and pauses posting:
 *   `site-settings.telegram.postingEnabled` is switched off, and only a
 *   person switches it on again, after looking at the channel.
 * - **Hourly** (`runChannelChecks`, also at worker start): getMe, getChat
 *   (the numeric `-100…` id goes to `site-settings.telegram.channelChatId`),
 *   the rights, and `getChatAdministrators` compared with the snapshot kept
 *   in Payload's key-value store. The comparison catches admin changes the
 *   update stream lost (Telegram keeps updates for at most 24 h).
 * - **Updates** (`pollUpdates`): long polling, no webhook, so nothing public
 *   sits behind Cloudflare. `chat_member` changes that involve an
 *   administrator or the creator, and every `my_chat_member` change (the
 *   bot's own), are recorded as `telegram.channel_admin_change`, which alerts
 *   the editor-in-chief and the founder at once. Ordinary subscribers joining
 *   or leaving are ignored. Manual posts and edits are recorded as
 *   telegram-posts rows, matched to stories by their muomalat.uz link. A
 *   `409 Conflict` (a webhook, or another process polling with our token) is
 *   `telegram.token_conflict`, alerted at most once an hour.
 */

export const ALLOWED_UPDATES = ['channel_post', 'edited_channel_post', 'chat_member', 'my_chat_member']

export const KV = {
  rights: 'muomalat:telegram:rights',
  admins: 'muomalat:telegram:admins',
  updates: 'muomalat:telegram:updates',
  conflict: 'muomalat:telegram:conflict',
  check: 'muomalat:telegram:check',
} as const

const CONFLICT_ALERT_EVERY_MS = 60 * 60 * 1000
const ACTOR = 'system:telegram'

export type RightsGate = RightsResult & { error?: string }
type SavedRights = { ok: boolean; at: string; summary: string }

const errorText = (error: unknown) => redact(error instanceof Error ? error.message : String(error))

// ── rights ──────────────────────────────────────────────────────────────────

/** Switches `postingEnabled` off (a system write, audited like any settings change). */
export async function pausePosting(payload: Payload, reason: string): Promise<boolean> {
  try {
    const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as { telegram?: Doc | null }
    const telegram = (settings.telegram ?? {}) as Doc
    if (telegram.postingEnabled !== true) return false
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { telegram: { ...telegram, postingEnabled: false } } as never,
      depth: 0,
      overrideAccess: true,
      context: { trustedInternal: true, auditActor: ACTOR, audit: { summary: `Telegramga avtomatik joylash toʻxtatildi: ${reason}`.slice(0, 900) } },
    })
    return true
  } catch (error) {
    // The send pass checks the rights again before every message, so posting stays paused regardless.
    payload.logger.error({ err: error, msg: 'telegram: could not switch posting off in site-settings' })
    return false
  }
}

/**
 * The allow-list check against the live channel. A network failure answers
 * "not ok" for this pass only (nothing is sent) and is not alerted; a real
 * rights problem is.
 */
export async function verifyRights(payload: Payload, client: BotClient, chatId: string | number): Promise<RightsGate> {
  const empty: RightsGate = { ok: false, status: 'unknown', unexpected: [], missing: [], granted: [] }
  const botId = botIdOf(telegramEnv().token)
  if (botId === undefined) return { ...empty, error: 'TELEGRAM_BOT_TOKEN is not a bot token' }
  let member: TgChatMember
  try {
    member = await client.getChatMember(chatId, botId)
  } catch (error) {
    // A bot removed from the channel gets a 400/403 here: that is a rights failure, not a network one.
    if (error instanceof TelegramError && (error.status === 400 || error.status === 403)) member = { status: 'left', user: { id: botId, is_bot: true, first_name: 'bot' } }
    else {
      payload.logger.warn(`telegram: rights check not possible now: ${errorText(error)}`)
      return { ...empty, error: errorText(error) }
    }
  }
  const result = checkRights(member)
  const summary = describeRights(result)
  const previous = await payload.kv.get<SavedRights>(KV.rights)
  await payload.kv.set(KV.rights, { ok: result.ok, at: nowIso(), summary } satisfies SavedRights)
  if (!result.ok && (previous?.ok !== false || previous.summary !== summary)) {
    payload.logger.error(`telegram: ${summary} Posting is paused.`)
    await recordSystemAudit(
      payload,
      {
        action: 'telegram.rights_check_failed',
        summary,
        after: { status: result.status, unexpected: result.unexpected, missing: result.missing, granted: result.granted },
      },
      ACTOR,
    )
    await pausePosting(payload, summary)
  } else if (result.ok && previous?.ok === false) {
    payload.logger.info('telegram: bot rights pass again; posting stays off until the editor-in-chief or an admin switches it on')
  }
  return result
}

// ── the hourly check ────────────────────────────────────────────────────────

async function rememberChatId(payload: Payload, chatId: string) {
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as { telegram?: Doc | null }
  const telegram = (settings.telegram ?? {}) as Doc
  if (telegram.channelChatId === chatId) return
  try {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { telegram: { ...telegram, channelChatId: chatId } } as never,
      depth: 0,
      overrideAccess: true,
      context: { trustedInternal: true, auditActor: ACTOR, audit: { summary: 'Bot tekshiruvi kanalning chat ID raqamini yozdi' } },
    })
  } catch (error) {
    payload.logger.warn({ err: error, msg: 'telegram: channel chat id not stored in site-settings; TELEGRAM_CHANNEL is used instead' })
  }
}

export type AdminCheck = { baseline: boolean; diff?: AdminDiff; admins: AdminEntry[] }

/** `getChatAdministrators` against the stored snapshot. `silent` refreshes the snapshot without a row (after an update already recorded the change). */
export async function checkAdmins(payload: Payload, client: BotClient, chatId: string | number, { silent = false } = {}): Promise<AdminCheck> {
  const admins = (await client.getChatAdministrators(chatId)).map(adminEntry).sort((a, b) => a.id - b.id)
  const saved = await payload.kv.get<{ admins: AdminEntry[]; at: string }>(KV.admins)
  await payload.kv.set(KV.admins, { admins, at: nowIso() })
  if (!saved) {
    payload.logger.info(`telegram: channel admin snapshot started (${admins.length} admin(s))`)
    return { baseline: true, admins }
  }
  const diff = diffAdmins(saved.admins, admins)
  if (!isEmptyDiff(diff) && !silent) {
    await recordSystemAudit(
      payload,
      {
        action: 'telegram.channel_admin_change',
        summary: `Kanal adminlari oʻzgardi (soatlik tekshiruv): ${describeAdminDiff(diff)}`,
        before: { admins: saved.admins },
        after: { admins },
      },
      ACTOR,
    )
  }
  return { baseline: false, diff, admins }
}

export type ChannelCheck = { chatId: string; botUsername?: string; rights: RightsGate; admins?: AdminCheck }

export async function runChannelChecks(payload: Payload, client: BotClient): Promise<ChannelCheck> {
  const env = telegramEnv()
  const me = await client.getMe()
  if (me.id !== botIdOf(env.token)) payload.logger.warn('telegram: getMe answered for another bot id than the token names')
  const chat = await client.getChat(env.channel)
  if (chat.type !== 'channel') payload.logger.error(`telegram: TELEGRAM_CHANNEL is a ${chat.type}, not a channel`)
  const chatId = String(chat.id)
  await rememberChatId(payload, chatId)
  const rights = await verifyRights(payload, client, chatId)
  let admins: AdminCheck | undefined
  try {
    admins = await checkAdmins(payload, client, chatId)
  } catch (error) {
    payload.logger.warn(`telegram: admin list not read: ${errorText(error)}`)
  }
  await payload.kv.set(KV.check, { at: nowIso(), ok: rights.ok, summary: describeRights(rights), bot: me.username ?? null, chatId, title: chat.title ?? null })
  return { chatId, botUsername: me.username, rights, admins }
}

// ── updates ─────────────────────────────────────────────────────────────────

const nameOf = (u?: { first_name?: string; last_name?: string; username?: string; id?: number }) =>
  u ? `${[u.first_name, u.last_name].filter(Boolean).join(' ') || u.id}${u.username ? ` (@${u.username})` : ''}` : '—'

type Ours = (chat: TgChat) => boolean

function ourChat(chatId: string | undefined): Ours {
  const channel = telegramEnv().channel.toLowerCase()
  return (chat) =>
    (chatId !== undefined && String(chat.id) === chatId) ||
    String(chat.id) === channel ||
    (Boolean(chat.username) && `@${chat.username!.toLowerCase()}` === channel)
}

async function tokenConflict(payload: Payload, error: TelegramError) {
  const webhook = /webhook/i.test(error.description ?? '')
  payload.logger.error(`telegram: getUpdates conflict: ${error.message}`)
  const last = await payload.kv.get<{ at: string }>(KV.conflict)
  if (last && Date.now() - new Date(last.at).getTime() < CONFLICT_ALERT_EVERY_MS) return
  await payload.kv.set(KV.conflict, { at: nowIso() })
  await recordSystemAudit(
    payload,
    {
      action: 'telegram.token_conflict',
      summary: webhook
        ? 'Bot uchun webhook oʻrnatilgan: biz webhookdan foydalanmaymiz. Token sizib chiqqan boʻlishi mumkin: @BotFather orqali tokenni almashtiring.'
        : 'Boshqa jarayon shu bot tokeni bilan getUpdates chaqirmoqda. Token sizib chiqqan boʻlishi mumkin: @BotFather orqali tokenni almashtiring.',
    },
    ACTOR,
  )
}

export type PollResult = { handled: number; conflict?: boolean }

/** One long poll. The offset is saved after each update, so a crash re-reads at most one. */
export async function pollUpdates(payload: Payload, client: BotClient, { timeout = 25 } = {}): Promise<PollResult> {
  const state = await payload.kv.get<{ offset?: number }>(KV.updates)
  let updates: TgUpdate[]
  try {
    updates = await client.getUpdates({ offset: state?.offset, timeout, allowedUpdates: ALLOWED_UPDATES })
  } catch (error) {
    if (isConflict(error)) {
      await tokenConflict(payload, error as TelegramError)
      return { handled: 0, conflict: true }
    }
    throw error
  }
  if (!updates.length) return { handled: 0 }
  const settings = await telegramSettings(payload)
  const ours = ourChat(settings.channelChatId)
  let handled = 0
  for (const update of [...updates].sort((a, b) => a.update_id - b.update_id)) {
    try {
      await handleUpdate(payload, client, update, ours)
      handled++
    } catch (error) {
      payload.logger.error({ err: error, msg: `telegram: update ${update.update_id} not handled` })
    }
    await payload.kv.set(KV.updates, { offset: update.update_id + 1 })
  }
  return { handled }
}

async function handleUpdate(payload: Payload, client: BotClient, u: TgUpdate, ours: Ours) {
  if (u.channel_post) return ours(u.channel_post.chat) ? recordChannelPost(payload, u.channel_post, false) : undefined
  if (u.edited_channel_post) return ours(u.edited_channel_post.chat) ? recordChannelPost(payload, u.edited_channel_post, true) : undefined
  const change = u.chat_member ?? u.my_chat_member
  if (!change) return
  const own = Boolean(u.my_chat_member)
  if (!ours(change.chat)) {
    if (own) payload.logger.warn(`telegram: the bot's status changed in another chat (${change.chat.type} ${change.chat.id}): ${change.old_chat_member.status} → ${change.new_chat_member.status}`)
    return
  }
  const before = change.old_chat_member
  const after = change.new_chat_member
  if (!own && !involvesAdmin(before.status, after.status)) return
  const subject = adminEntry(after)
  const by = { id: change.from.id, name: nameOf(change.from) }
  const summary = own
    ? `Botning kanaldagi holati oʻzgardi: ${before.status} → ${after.status}; huquqlar: ${subject.rights.join(', ') || '—'}. Oʻzgartirgan: ${by.name}.`
    : `Kanal admini oʻzgardi: ${nameOf(after.user)}: ${before.status} → ${after.status}; huquqlar: ${subject.rights.join(', ') || '—'}. Oʻzgartirgan: ${by.name}.`
  await recordSystemAudit(
    payload,
    { action: 'telegram.channel_admin_change', summary, before: { member: adminEntry(before) }, after: { member: subject, by, at: new Date(change.date * 1000).toISOString() } },
    ACTOR,
  )
  // The hourly comparison must not report the same change again.
  try {
    await checkAdmins(payload, client, change.chat.id, { silent: true })
  } catch (error) {
    payload.logger.warn(`telegram: admin snapshot not refreshed: ${errorText(error)}`)
  }
  if (own) await verifyRights(payload, client, String(change.chat.id))
}

// ── manual posts and edits ──────────────────────────────────────────────────

/** The story a channel message links to: /t/<code>, or /<rubric>/<slug> in any edition. */
async function storyFor(payload: Payload, msg: TgMessage): Promise<Doc | undefined> {
  const text = msg.caption ?? msg.text ?? ''
  const entities = msg.caption_entities ?? msg.entities ?? []
  const hosts = [...new Set([new URL(deliveryEnv().siteUrl).host, 'muomalat.uz'])]
  for (const p of siteLinksIn(text, entities, hosts)) {
    const short = /^\/t\/([0-9a-z]{6})$/i.exec(p)
    const parts = p.split('/').filter(Boolean)
    if (['kr', 'ru', 'en'].includes(parts[0])) parts.shift()
    const where = short ? { shortCode: { equals: short[1].toLowerCase() } } : parts.length === 2 ? { slug: { equals: parts[1] } } : undefined
    if (!where) continue
    const { docs } = await payload.find({
      collection: 'articles' as CollectionSlug,
      where: where as never,
      limit: 1,
      depth: 0,
      draft: false,
      overrideAccess: true,
      select: { id: true, sponsored: true } as never,
    })
    if (docs[0]) return docs[0] as unknown as Doc
  }
  return undefined
}

async function recordChannelPost(payload: Payload, msg: TgMessage, edited: boolean) {
  const text = msg.caption ?? msg.text ?? ''
  const html = entitiesToHtml(text, msg.caption_entities ?? msg.entities ?? [])
  const { docs } = await payload.find({ collection: POSTS, where: { messageId: { equals: String(msg.message_id) } }, limit: 1, depth: 0, overrideAccess: true })
  const row = docs[0] as unknown as Doc | undefined
  if (row) {
    // Our own post (bots get no update for it) or one recorded before: only a changed text is news.
    if (!edited || html === deliveredCaption(row) || html === row.captionHtml) return
    const settled = row.status === 'sent' || row.status === 'edited'
    await payload.update({
      collection: POSTS,
      id: row.id as Id,
      data: {
        ...(settled ? { captionHtml: html, status: 'edited' } : {}),
        history: withHistory(row, { action: 'manual_edit', captionHtml: html }),
      } as never,
      depth: 0,
      overrideAccess: true,
      context: systemContext({ summary: 'Kanaldagi post qoʻlda tahrirlandi' }),
    })
    if (row.sponsored && !splitSponsored(html)) {
      await sendOperationalAlert(
        payload,
        'Telegram: reklama posti belgisiz qoldi',
        `Kanaldagi reklama posti qoʻlda tahrirlandi va birinchi qatorda «Reklama» yoʻq (Reklama toʻgʻrisidagi qonun, 6, 18-moddalar): ${messageLink(String(msg.chat.id), msg.message_id) ?? msg.message_id}`,
      )
    }
    return
  }
  const story = await storyFor(payload, msg)
  const largest = [...(msg.photo ?? [])].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  await payload.create({
    collection: POSTS,
    data: {
      article: (story?.id as Id | undefined) ?? null,
      kind: 'article',
      status: edited ? 'edited' : 'sent',
      captionHtml: html,
      chatId: String(msg.chat.id),
      messageId: String(msg.message_id),
      sentAt: new Date(msg.date * 1000).toISOString(),
      imageFileId: largest?.file_id ?? null,
      sponsored: (story?.sponsored as Doc | undefined)?.enabled === true,
      requestedBy: null,
      history: withHistory(undefined, { action: edited ? 'manual_edit' : 'manual_post', captionHtml: html }),
    } as never,
    depth: 0,
    overrideAccess: true,
    context: systemContext({ summary: `Kanalga qoʻlda joylangan post qayd etildi${story ? '' : ' (maqolaga bogʻlanmadi)'}` }),
  })
}

