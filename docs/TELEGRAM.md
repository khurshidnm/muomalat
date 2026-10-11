# Telegram publishing

How stories reach the @muomalatuz channel (CMS-SPEC §10), how to set up the
bot, and what the alerts mean. Code: `src/payload/telegram/`,
`src/payload/hooks/telegram/`, `src/worker/jobs/telegram*.ts`; tests:
`tests/telegram/` (they talk to a local mock of the Bot API, never to
Telegram).

## How it works

1. **A story is published for the first time** (with "Kanalga avtomatik
   joylash" on, the default). The worker makes a **draft** post in
   *Tarqatish → Telegram postlar*: bold headline, lead, the bare short link
   `muomalat.uz/t/<code>`, and the rubric hashtag, with the story's image.
   Sponsored stories get the ad template, whose first line is
   «**Reklama** · partner» and which ends with `#reklama`.
2. **Someone approves it** in the post's sidebar panel. It must be an editor
   or the editor-in-chief who is not an author of the story and did not write
   the caption. Ads, and the removal of posts, are approved by the
   editor-in-chief only. Whoever edits a caption becomes its "requester" and
   needs a colleague to approve it.
3. **The post waits 3 minutes** (site settings → Telegram → delay). The panel
   shows a countdown and a **Bekor qilish** (cancel) button. Then the worker
   checks again (story still published, not withdrawn, no embargo, posting
   switched on, bot rights in order, CMS not in read-only mode) and sends it.
4. **A correction** (also a clarification or an editor's note) published on
   the story turns the channel post into **Tahrir kutilmoqda**: the caption
   plus "Tuzatish (dd.mm): …". Approving it edits the post in place; for a
   factual correction it also queues a «TUZATISH: …» reply under the post
   (edits do not notify subscribers; the reply does).
5. **Withdrawing a story** makes a removal task for the editor-in-chief. Posts
   younger than 48 hours are deleted by the bot. Older ones cannot be deleted
   by a bot, so their text is replaced with a removal notice, and an alert
   asks the channel owner to delete them by hand. Afterwards press **Qoʻlda
   oʻchirildi** on the removal post.
6. **Failures** (Telegram refused, no answer) mark the post **Xato** with the
   reason and send an alert. Nothing is ever resent automatically: check the
   channel, then approve again or cancel.

Manual posts made in the Telegram app are recorded too, and linked to the
story whose muomalat.uz link they contain.

## Bot setup (do this once, for production and again for staging)

1. **Create the bot.** In Telegram open **@BotFather** → `/newbot`. Name it
   (e.g. "Muomalat"), pick a username ending in `bot` (e.g.
   `muomalat_kanal_bot`). Keep it separate from the staff alerts bot.
   BotFather replies with the **token**: `123456789:AA…`. Then, still in
   BotFather: `/setjoingroups` → choose the bot → **Disable**, so nobody can
   add it to a group. Leave inline mode off.
2. **Keep the token secret.** Put it only in the server environment file
   (`/etc/muomalat/muomalat.env`, docs/DEPLOY.md) as `TELEGRAM_BOT_TOKEN=…`, next to
   `TELEGRAM_CHANNEL=@muomalatuz`. Never in the CMS, in Git, in a chat or in a
   screenshot. Only the worker needs it. Do not set `TELEGRAM_API_BASE`
   (it is for tests; production refuses to start with it).
3. **Record the bot's id.** The digits before the colon of the token are the
   bot's public id. Put them into `PRODUCTION_BOT_ID` in
   `src/payload/telegram/env.ts` and commit: from then on staging and
   development refuse to run with the production token. (The id is not
   secret; the token is.)
4. **Make the bot a channel admin with as few rights as possible.** In the
   Telegram app: the channel → Manage channel → Administrators → Add Admin →
   find the bot. Switch **everything off except "Post messages"**, and, for
   now, "Edit messages of others" and "Delete messages of others". In
   particular: no "Change channel info", no "Invite users via link", no "Add
   new admins", no stories, no live streams. The worker checks this every
   hour and before every post: any other right pauses posting and alerts.
   ("Manage channel" is shown for every admin and is allowed.)
   *Least privilege:* "Post messages" alone lets the bot post, edit and
   delete its own posts. Once the staging checks below pass with only that
   right, you can switch the other two off in production as well.
5. **Restart the worker** (`sudo mctl up -d worker`, docs/DEPLOY.md). Its log
   should show `telegram: posting to @muomalatuz` and `telegram: hourly
   check: @… in -100…; rights ok`.
6. **Switch posting on.** CMS → Sozlamalar (site settings) → Telegram →
   «Kanalga avtomatik joylash yoqilgan». The editor-in-chief or an admin can
   switch it off at any time (emergency stop); posts then wait in the queue.

### Staging (§10.8)

Use a **different bot** (repeat step 1, e.g. `muomalat_sinov_bot`) and a
**private test channel**. For a private channel `TELEGRAM_CHANNEL` is its
numeric id: open the channel in web.telegram.org, the address ends in
`#-100…`; that number is the id. Outside production the worker refuses
`@muomalatuz` and (once step 3 is done) the production bot's token.

Checks to run once in staging (they confirm Telegram behaviour our tests can
only simulate): a correction edits a day-old post and the TUZATISH reply
attaches to it (I5); withdrawing a post older than 48 hours edits it instead
of deleting it (I6); adding a person as channel admin produces an alert
within seconds (I8). Repeat I5 and I6 with only "Post messages" switched on.

## Alerts and what to do

They arrive in the staff alerts group (and by e-mail to the alert
recipients), as audit-log rows:

- **«Telegram boti huquqlari tekshiruvdan oʻtmadi»** (rights check failed):
  someone changed the bot's admin rights, or removed it. Posting is now
  switched off. Fix the rights in the channel (step 4), find out who changed
  them (channel → Recent actions), then switch posting on again.
- **«Telegram kanali adminlari oʻzgardi»** (channel admins changed): an admin
  was added, removed or given other rights, or the bot's own status changed.
  If nobody on staff did it, treat it as a takeover: docs/RUNBOOKS.md,
  runbook 4 (screenshot "Recent actions" first: Telegram keeps it about
  48 hours).
- **«Telegram boti tokeni boshqa joyda ishlatilmoqda»** (token in use
  elsewhere): another program is reading the bot's updates, or a webhook was
  set. Assume the token leaked: BotFather → `/revoke`, put the new token in
  the server environment, restart the worker (runbook 7).
- **«Telegram posti yuborilmadi»** / **«Telegram: postni qoʻlda oʻchiring»**:
  a post failed, or an old post needs deleting by hand; the alert says which.

## Limits

- Captions are counted as Telegram counts them after removing tags, in
  UTF-16 units, which is slightly stricter than Telegram for emoji. 1024 with
  a photo, 4096 for a text post.
- Only `<b>`, `<i>` and `<a href="https://…">` are allowed in captions.
- The channel has one edition: captions are Uzbek Latin.
- An unpublished (not withdrawn) story's sent post stays; its short link then
  answers 404. Pending posts are cancelled.
- The bot never creates invite links; the channel owner makes them in the app
  and an admin pastes them into site settings (§10.7).
