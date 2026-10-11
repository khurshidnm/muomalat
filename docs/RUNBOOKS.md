# Incident runbooks

What to do, in order, when something goes wrong (CMS-SPEC §12.10). Each
runbook fits on a page: print them and keep a copy offline, because the
incident may be that the server or your laptop is the problem. Commands run
on the VPS (see [DEPLOY.md](./DEPLOY.md) for `mctl`); CMS menu names are the
Uzbek admin labels.

1. [Read-only switch](#1-read-only-switch)
2. [Hijacked staff account](#2-hijacked-staff-account)
3. [Defaced home page or fake story](#3-defaced-home-page-or-fake-story)
4. [Telegram channel hijack](#4-telegram-channel-hijack)
5. [Offboarding a leaver](#5-offboarding-a-leaver)
6. [Restoring from backup](#6-restoring-from-backup)
7. [Rotating secrets](#7-rotating-secrets)

**Always, in every incident:**

- **One person decides and one person writes things down.** Editorial
  questions (what to unpublish, what to tell readers): the editor-in-chief.
  Technical questions (lock-out, restore, rotation): the founder. Public
  statements: both.
- **Keep a timeline** in a plain document: time (Tashkent), what was seen,
  what was done, by whom.
- **Capture evidence before you clean up:** screenshots; the CMS audit log
  (Audit jurnali), filtered by the time window and the account; Telegram's
  "Recent actions" (kept only about 48 hours: screenshot it **first**);
  `sudo mctl logs --since 24h app worker > /root/incident-<date>.log`. The
  nightly audit export in the bucket (`audit/production/`) cannot be changed
  by anyone for 30 days.
- **Tell readers in four languages** when they were affected: CMS → Sayt
  sozlamalari → Favqulodda → Favqulodda eʼlon (text in uz, ru, en; the
  Cyrillic edition is generated), level "Ogohlantirish". A correction note
  follows the template in section 3.

**Contacts** (fill in before launch and keep this page current):

| Who | For | How |
|---|---|---|
| Founder | technical decisions | `<phone>` |
| Editor-in-chief | editorial decisions | `<phone>` |
| Second admin (break-glass) | if the founder is unreachable | `<phone>` |
| Cloudflare | DDoS, account takeover | dashboard → Support; https://www.cloudflarestatus.com |
| Telegram | hijacked channel or account | https://telegram.org/support |
| UZCERT | national CERT, incident reports | https://uzcert.uz, `<phone>` |
| Access Now Digital Security Helpline | free help for media under attack | help@accessnow.org |
| Counsel | personal-data breach, legal orders | `<name, phone>` |
| SUVAN NET | domain registrar (domain hijack) | `<phone>` |
| Hostinger | VPS provider | hPanel → Help |

---

## 1. Read-only switch

**When:** you do not yet know which account or what is compromised, and want
nothing more to change while you find out. The public site keeps serving.

Effects (both switches): every create, update and delete in the CMS is
refused (except an admin turning the CMS switch back off), the scheduler and
Telegram posting pause, and a red banner shows in the admin.

**A. From the CMS (seconds; needs an admin login):** Sayt sozlamalari →
Ishlash → tick **Faqat oʻqish rejimi** → Save. Off again the same way. The
switch itself is audited (`ops.read_only_on` / `ops.read_only_off`).

**B. From the server (works even if the CMS or its database is compromised):**

```
sudo sed -i 's|^CMS_READ_ONLY=.*|CMS_READ_ONLY=1|' /etc/muomalat/muomalat.env
sudo mctl up -d app worker          # recreates both with the new setting (about a minute)
```

Off again: set `CMS_READ_ONLY=` (empty) and run the same `up -d`. While B is
on, nobody can turn it off from the CMS.

**Note:** read-only also stops you from withdrawing a story. To hide a story
while read-only is on, use the Cloudflare block in runbook 3, step 2.

**Fastest total lock-out of the CMS** (everyone, at the edge): Zero Trust →
Access → Applications → Muomalat CMS → **Revoke existing tokens**, and remove
everyone but yourself from the `staff` group. Revoked sessions stop working
within about 30 seconds. Removing people from the group alone is **not**
enough: their session lasts up to 8 hours.

## 2. Hijacked staff account

**Signs:** an alert for a login from an unusual country, `auth.edge_mismatch`,
many failed logins, a role change nobody made, or a colleague saying "that
wasn't me".

1. **Decide** (founder): whose account, since when. If unsure, turn on
   read-only (runbook 1, A).
2. **Cut the edge session:** Zero Trust → My Team → Users → the person →
   **Revoke session**. Then Access groups → `staff` → remove their address.
3. **Disable the CMS account:** CMS → Foydalanuvchilar → the person → untick
   **Faol** → Save. An inactive account can do nothing, even with a live
   cookie. To also end its sessions, set a new random password on it.
4. **Lock the Google account:** Google Admin console → Users → the person →
   Reset password and **Sign out** (ends all sessions); check Security →
   2-step verification and their registered security keys. If a key was
   stolen, remove it.
5. **Find what they did:** CMS → Audit jurnali, filter by the account and the
   time window. Note every story, setting or user they changed.
6. **Undo it:** for each story, open Versions and restore the last good
   version, or withdraw it (runbook 3). Check Sayt sozlamalari, Reklama
   joylari (ad links) and Foydalanuvchilar (any new account or role change:
   disable it).
7. **Telegram:** if they had channel rights, remove them now (runbook 4).
8. **Server access?** If the person had SSH access, or you are not sure the
   attacker stayed inside the CMS: rotate secrets (runbook 7, everything) and
   consider a rebuild onto a fresh server from backup (runbook 6).
9. **Back to normal:** read-only off; give the person a new account state
   (new password, keys re-enrolled in front of an admin, §4.4) only after you
   know how it happened. Write up the timeline.

## 3. Defaced home page or fake story

**Who decides:** the editor-in-chief (what comes down and what readers are
told); the founder (lock-out, if an account was used).

1. **If an account published it:** runbook 2, steps 2–3, for that account
   first, so it cannot republish.
2. **Hide it now** (minutes count; this works even in read-only mode):
   - Cloudflare → Security → WAF → Custom rules → create a third rule
     `Incident block`: `(http.host eq "muomalat.uz" and http.request.uri.path in {"/<rubric>/<slug>" "/kr/<rubric>/<slug>" "/ru/<rubric>/<slug>" "/en/<rubric>/<slug>"})` → Block;
   - Caching → Configuration → **Purge Cache** → Custom purge → the same
     four URLs, plus `https://muomalat.uz/`, `/kr`, `/ru`, `/en`.
3. **Take it down in the CMS:**
   - a story first published less than 15 minutes ago: open it →
     **Nashrdan olish (xato chop etilgan)**;
   - otherwise the editor-in-chief: **Olib tashlash** (withdraw), with a
     public notice. A withdrawn story keeps its address and shows the notice;
     published stories are never deleted (§5.8);
   - a defaced **home page**: Bosh sahifa → Versions → restore the last good
     version, check every slot, publish;
   - a wrong **ad link**: Reklama joylari → fix or empty the slot.
4. **Telegram:** delete the channel post if one went out (and runbook 4 if
   the post was not made by us).
5. **Readers:** if many saw it, the emergency banner (above) and a
   correction note on the story's page. Template:

   > **Tuzatish.** [Sana, soat] ushbu manzilda Muomalat tomonidan tayyorlanmagan
   > / tasdiqlanmagan material eʼlon qilindi. U olib tashlandi. Voqea yuzasidan
   > tekshiruv olib borilmoqda. Noqulaylik uchun uzr soʻraymiz.

   Russian and English versions go in the same fields of the other locales.
6. **Remove the incident WAF rule** once the CMS shows the withdrawal, so the
   address shows the notice again. Purge the URLs once more.
7. **Evidence and write-up:** audit log rows for the story, screenshots of
   the page as it was (the Cloudflare cache may still hold a copy: save it
   before purging if you can).

## 4. Telegram channel hijack

**Signs:** posts we did not write, admins we did not add, the channel name or
link changed, our bot removed.

1. **Screenshot "Recent actions" first** (channel → Manage → Recent actions):
   Telegram keeps them only about 48 hours.
2. From the **owner account** (the dedicated phone with the company SIM):
   - Settings → Devices → **Terminate all other sessions**;
   - Settings → Privacy and Security → Two-Step Verification → change the
     password; check the recovery e-mail is still ours;
   - the channel → Administrators: remove every admin you do not recognise,
     and our staff admins too until you know which account was used.
3. **The bot:** BotFather → `/revoke` for the publishing bot. Put the new token
   into `TELEGRAM_BOT_TOKEN` (runbook 7) only once the channel is clean. The
   worker stops posting by itself while the token is wrong; to be sure, turn
   on read-only (runbook 1), which pauses Telegram.
4. **Delete the rogue posts** and restore the channel name, photo, description
   and public link from your records.
5. **If you lost the owner account:** contact Telegram support at once
   (https://telegram.org/support) with proof of ownership; announce on the
   website (emergency banner, four languages) that the channel is not under
   our control and readers should ignore it; use the reserved backup channel
   name to post updates.
6. **Readers:** a short post in the channel once it is back, and the website
   banner if the hijack lasted long or posted anything harmful.
7. **Afterwards:** review active sessions of every admin phone, apply §12.9
   (at most one break-glass admin with "add admins" rights; staff admins post
   and edit only).

## 5. Offboarding a leaver

Do it on their last day, in this order (CMS-SPEC §4.4). Accounts are never
deleted in the CMS: their history stays in the audit log.

1. **CMS:** Foydalanuvchilar → the person → untick **Faol** → fill
   **offboardedAt** → Save. Reassign their open drafts to someone else.
2. **Access:** remove their address from the `staff` group, then Zero Trust →
   My Team → Users → the person → **Revoke session**.
3. **Google Workspace:** suspend the user (or transfer and delete later);
   sign out all sessions; wipe company data from their phone.
4. **Telegram:** remove their admin rights in the channel and the staff alerts
   group.
5. **Server (if they had SSH):**

   ```
   sudo sed -i 's/^AllowUsers .*/AllowUsers ops/' /etc/ssh/sshd_config.d/10-muomalat.conf   # list who stays
   sudo systemctl restart ssh
   sudo usermod --lock --expiredate 1 <their-user>
   ```

   Then rotate `PAYLOAD_SECRET` (this logs everyone out) and every secret
   they could have read in `/etc/muomalat/muomalat.env` (runbook 7).
6. **Other accounts:** remove them from Cloudflare (Members), GitHub
   (collaborators), Hostinger, Backblaze, the password manager's shared
   vault, the SMTP provider and the bank.
7. **Shared secrets they saw** but that are not on the server (Wi-Fi, the
   office safe code): change them.
8. Note the date and what was done in the ops log.

## 6. Restoring from backup

**When:** the database is damaged or lost, a migration destroyed data, the
server is gone, or it was compromised (then always onto a **new** server, with
**new** secrets).

What you need: the age private key (password manager or the safe), a
read-only bucket key (Backblaze → Application Keys → Add, Read only, prefix
`production/`), and the settings file (password manager).

**A. Same server, database damaged:**

```
sudo mctl exec backup muomalat-backup run || true    # keep a copy of the damaged state too
sudo mctl stop app worker backup                     # readers get Cloudflare's cached pages or an error page
# the age key, readable by the container user, for this run only:
sudo install -m 0400 -o 1001 -g 1001 /path/to/age-key.txt /root/age-identity
# a new, empty database next to the damaged one:
sudo mctl exec postgres /docker-entrypoint-initdb.d/create-database muomalat_restored
# put the read-only bucket key into RESTORE_S3_ACCESS_KEY_ID / RESTORE_S3_SECRET_ACCESS_KEY, then:
sudo mctl --profile restore run --rm -v /root/age-identity:/run/secrets/age-identity:ro \
  restore run --database muomalat_restored --skip-media        # add --backup <stamp> for an older one
```

Then swap the databases (the app expects the name `muomalat`):

```
sudo mctl exec postgres psql -U postgres -c "ALTER DATABASE muomalat RENAME TO muomalat_damaged_$(date +%Y%m%d)"
sudo mctl exec postgres psql -U postgres -c "ALTER DATABASE muomalat_restored RENAME TO muomalat"
sudo mctl run --rm migrate                           # newer migrations, and the grants
sudo mctl up -d
sudo shred -u /root/age-identity
```

Run the smoke tests (DEPLOY §8). Keep `muomalat_damaged_*` until you are sure,
then `sudo mctl exec postgres dropdb -U postgres muomalat_damaged_<date>`.

Uploads too (they are lost or damaged): stop `app` and `worker`, move the old
files aside or empty the volume, then run the restore with `--skip-db
--media-dir /data/media` (the folder must be empty).

**B. New server (the old one is gone or compromised):**

1. Build the server: DEPLOY §4 (new SSH keys if the old ones may be known).
2. Settings: from the password manager. If the old server was compromised,
   **generate new secrets** for every line (DEPLOY §7.1), make a new tunnel
   token, new bucket keys and a new purge token.
3. `sudo mctl pull && sudo mctl up -d postgres` (a new volume: the start-up
   scripts make the roles and an empty `muomalat` database).
4. Restore straight into it, database and uploads:

   ```
   sudo install -m 0400 -o 1001 -g 1001 /path/to/age-key.txt /root/age-identity
   sudo mctl --profile restore run --rm -v /root/age-identity:/run/secrets/age-identity:ro \
     restore run --database muomalat --media-dir /data/media
   sudo mctl run --rm migrate
   sudo mctl up -d
   sudo shred -u /root/age-identity
   ```
5. If the tunnel is new, point the two public hostnames at it (DEPLOY §5.4)
   and delete the old tunnel.
6. Smoke tests, then delete the read-only bucket key.

**Lost data** is everything after the backup's time (at most 24 hours). Ask
the editors to re-enter what they published since; the audit log export
(`audit/production/`) shows what changed.

## 7. Rotating secrets

Rotate a secret when someone who could read it leaves, when it may have
leaked, and on the schedule below. Edit `/etc/muomalat/muomalat.env`, then
restart what uses it. Keep the password manager copy in step.

| Secret | Schedule | How | Restart |
|---|---|---|---|
| `PAYLOAD_SECRET` | when someone with server access leaves | `openssl rand -base64 64 \| tr -d '\n'`. Logs everyone out; digest confirmation links already sent stop working | `sudo mctl up -d app worker` |
| `INTERNAL_REVALIDATE_SECRET` | yearly | `openssl rand -base64 32` | `sudo mctl up -d app worker` |
| Database passwords | yearly, or on leak | see below | see below |
| `CLOUDFLARE_TUNNEL_TOKEN` | on leak | Zero Trust → Tunnels → muomalat → Refresh token (or a new tunnel) | `sudo mctl up -d cloudflared` |
| `CF_API_TOKEN` (purge) | yearly | My Profile → API Tokens → Roll | `sudo mctl up -d worker` |
| Bucket keys (`BACKUP_S3_…`, `AUDIT_S3_…`) | yearly, or on leak | Backblaze: add a new write-only key, put it in, then delete the old one | `sudo mctl up -d backup worker` |
| `TELEGRAM_BOT_TOKEN` | on any suspicion | BotFather → `/revoke` | `sudo mctl up -d worker` |
| `ALERTS_BOT_TOKEN` | on any suspicion | BotFather → `/revoke` (the alerts bot) | `sudo mctl up -d app worker` |
| `SMTP_PASS` | yearly | the provider's dashboard | `sudo mctl up -d app worker` |
| GHCR read token | yearly (it expires) | GitHub → new classic token, `read:packages` | `sudo docker login ghcr.io …` again |
| age backup keys | if a private key may be lost or seen | new key pair (DEPLOY §6.3); new public keys into `BACKUP_AGE_RECIPIENTS` | `sudo mctl up -d backup` |

**Database passwords** (roles are created once, so the new password goes
into the database first, then into the file):

```
NEW=$(openssl rand -hex 32)
sudo mctl exec postgres psql -U postgres -c "ALTER ROLE muomalat_app PASSWORD '$NEW'"
sudo sed -i "s|^APP_DB_PASSWORD=.*|APP_DB_PASSWORD=$NEW|" /etc/muomalat/muomalat.env
sudo mctl up -d                                    # recreates the containers that use it
```

The same for `muomalat_owner` (`OWNER_DB_PASSWORD`), `muomalat_backup`
(`BACKUP_DB_PASSWORD`) and `postgres` (`POSTGRES_SUPERUSER_PASSWORD`). The
postgres container is recreated too, because it holds these values for its
first start: a few seconds of database restart.

**Old age keys:** keep an old private key until every backup made with it
has expired (12 months, because of the monthly copies), then destroy it.
