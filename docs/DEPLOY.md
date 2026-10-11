# Deploying Muomalat

How to put muomalat.uz on the internet and keep it running: one Hostinger VPS
in the EU, Docker Compose, Cloudflare on the Free plan in front, and Cloudflare
Tunnel as the only way in. Written for the founder, step by step, with every
command. What and why is in [CMS-SPEC.md](./CMS-SPEC.md) §12 and §15; what to
do when something goes wrong is in [RUNBOOKS.md](./RUNBOOKS.md).

Plan a quiet day for the first deploy: about four hours, most of it waiting
for DNS and clicking through dashboards.

## Contents

1. [What you are building](#1-what-you-are-building)
2. [Before you start](#2-before-you-start)
3. [The images (GitHub)](#3-the-images-github)
4. [The server (Hostinger)](#4-the-server-hostinger)
5. [Cloudflare](#5-cloudflare)
6. [The backup bucket and keys](#6-the-backup-bucket-and-keys)
7. [First deploy](#7-first-deploy)
8. [Smoke tests](#8-smoke-tests)
9. [Updates and the weekly patch routine](#9-updates-and-the-weekly-patch-routine)
10. [Backups and the monthly restore drill](#10-backups-and-the-monthly-restore-drill)
11. [Rehearse locally](#11-rehearse-locally)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What you are building

```
readers ── https://muomalat.uz ──────┐
staff ──── https://cms.muomalat.uz ──┤   Cloudflare: cache, firewall rules,
           (security key login)      │   Access login in front of cms.*
                                     ▼
                      Cloudflare Tunnel (the VPS dials out; no open web ports)
                                     │
  Hostinger VPS ─────────────────────┼──────────────────────────────────────
   cloudflared ──► app :3000 (site + CMS)      worker (scheduler, outbox,
                     │                           alerts, purge)
                     ▼                              │
                  postgres ◄────────────────────────┘
                     ▲
                  backup ── nightly, encrypted ──► EU bucket (object lock)
```

The stack is defined in `docker/compose.prod.yml`. Seven services:

| Service | What it does |
|---|---|
| `cloudflared` | Keeps the tunnel to Cloudflare open; Cloudflare sends both hostnames to `app` |
| `postgres` | The database. Never reachable from outside; it has no internet access either |
| `migrate` | Runs once before the app on every start: database migrations, as the schema owner |
| `app` | The website and the CMS |
| `worker` | Scheduled publishing, cache refresh and purge, retention, staff alerts |
| `backup` | Every night at 01:30 Tashkent: encrypted database dump and media archive to the bucket |
| `restore` | Not running; you start it only to restore or for the restore drill |

Two images are built by GitHub from this repository: `muomalat` (app, worker,
migrate) and `muomalat-backup` (the same plus the backup tools). The server
only downloads them; it never builds anything.

## 2. Before you start

You need:

- **Two FIDO2 security keys per person** (YubiKey 5 or similar): one on your
  keyring, one in the safe. Use them for every account below (CMS-SPEC §12.9).
- **A password manager** (1Password, Bitwarden). Every secret in this guide
  goes there, nowhere else.
- **Accounts**, each with security-key two-factor login turned on:
  - GitHub (the repository `khurshidnm/muomalat`);
  - Hostinger (the VPS);
  - Cloudflare (DNS, tunnel, Access);
  - Google Workspace for `muomalat.uz` (staff sign in to the CMS with it);
    set 2-step verification to **"Security key only"** for all staff:
    Admin console → Security → Authentication → 2-step verification;
  - Backblaze B2 (the backup bucket), created in the **EU Central** region;
  - an EU SMTP provider for e-mail (for example Mailjet, Brevo or Scaleway TEM).
- **The domain** `muomalat.uz` at SUVAN NET, renewed for several years with
  auto-renew, and a login that lets you change its name servers.
- **On your laptop:** a terminal, `ssh`, `curl`, and `age` (the encryption
  tool for backups): macOS `brew install age`, Windows
  `winget install FiloSottile.age`, Ubuntu `sudo apt install age`.

In the commands below, text in `<angle brackets>` is yours to fill in. Lines
starting with `$` run on your laptop; the others run on the server.

## 3. The images (GitHub)

1. Every push to `main` runs **Actions → CI**. When it is green, the job
   **Production images** has pushed both images to GitHub's registry (GHCR).
   Open the run; its summary shows two lines like:

   ```
   MUOMALAT_IMAGE=ghcr.io/khurshidnm/muomalat@sha256:3f2a…
   MUOMALAT_BACKUP_IMAGE=ghcr.io/khurshidnm/muomalat-backup@sha256:9c1e…
   ```

   Copy them; they go into the server's settings file in step 7. A digest
   (`sha256:…`) never changes, so you always know exactly what runs.
2. **Keep the images private.** GitHub → your profile → Packages →
   `muomalat` → Package settings → Danger zone: visibility must be
   **Private**. Do the same for `muomalat-backup`. (Each image carries the
   keys Next.js generates per build for draft-mode cookies; a public image
   would hand them out.)
3. **A read-only token for the server.** GitHub → Settings → Developer
   settings → Personal access tokens → Tokens (classic) → Generate new token:
   note "muomalat VPS pull", expiration 1 year, scope **`read:packages`
   only**. Save it in the password manager; put a calendar reminder for the
   expiry.

## 4. The server (Hostinger)

### 4.1 Order the VPS

- Plan: **KVM 2** or larger (at least 2 vCPU, 8 GB RAM, 100 GB NVMe).
- Location: **Lithuania**. If it is not offered, **Germany**. Never a
  location outside the EU (CMS-RESEARCH §4.3).
- Operating system: plain **Ubuntu 24.04 LTS** (no control panel, no
  "Docker" template: Docker is installed from Docker's own packages below).
- In the panel, add **your SSH public key** before the first boot. Make one on
  your laptop if you have none; with a FIDO2 key it never leaves the key:

  ```
  $ ssh-keygen -t ed25519-sk -C "you@muomalat.uz"     # touch the key when it blinks
  $ cat ~/.ssh/id_ed25519_sk.pub                        # paste this into Hostinger
  ```

  (On a Mac, Apple's `ssh` cannot use security keys: `brew install openssh`
  first. If your key does not support `ed25519-sk`, use
  `ssh-keygen -t ed25519` with a passphrase.)
- Note the server's IP address. It is used only for SSH; nothing else points at it.

### 4.2 First login and an admin user

```
$ ssh root@<server-ip>
```

Create your own user (one per person; never share accounts), copy the key to
it, and check it works **in a second terminal before closing the first**:

```
adduser --gecos "" ops
usermod -aG sudo ops
install -d -m 700 -o ops -g ops /home/ops/.ssh
cp /root/.ssh/authorized_keys /home/ops/.ssh/authorized_keys
chown ops:ops /home/ops/.ssh/authorized_keys && chmod 600 /home/ops/.ssh/authorized_keys
```

```
$ ssh ops@<server-ip>          # in a new terminal; then: sudo -v
```

### 4.3 SSH: keys only

```
sudo tee /etc/ssh/sshd_config.d/10-muomalat.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
AuthenticationMethods publickey
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowUsers ops
EOF
sudo sshd -t && sudo systemctl restart ssh
```

Test from a new terminal that `ssh ops@<server-ip>` still works and that
`ssh root@<server-ip>` is refused. Add more people later by adding their user
to `AllowUsers` and their public key to their own `~/.ssh/authorized_keys`.

### 4.4 Updates, firewall, fail2ban

Install everything, then turn on automatic security updates with a nightly
reboot window at 03:30 Tashkent (the server clock stays on UTC: 22:30), after
the 01:30 backup and the 02:30 audit export:

```
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y unattended-upgrades ufw fail2ban python3-systemd git curl
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
sudo tee /etc/apt/apt.conf.d/52muomalat >/dev/null <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "22:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
```

Ubuntu's default list installs security updates only, which is what we want.

**Firewall.** Inbound: SSH only. The website does not need any open port:
the tunnel connects outwards.

```
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit 22/tcp
sudo ufw enable
sudo ufw status verbose
```

If you have a fixed IP address at the office, also restrict SSH to it in the
Hostinger panel's VPS firewall: allow port 22 from that address only. Docker
can open ports that bypass UFW; our compose file publishes none, and step 8
checks it.

**fail2ban** (SSH only; behind Cloudflare it could not see web clients anyway):

```
sudo tee /etc/fail2ban/jail.d/sshd.local >/dev/null <<'EOF'
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

**Swap** (a safety margin for memory peaks):

```
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4.5 Docker

From Docker's own repository (the Ubuntu `docker.io` package lags behind):

```
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true,
  "no-new-privileges": true
}
EOF
sudo systemctl restart docker
sudo docker run --rm hello-world
```

Do **not** add your user to the `docker` group: that group is equivalent to
root. Use `sudo` for every Docker command.

### 4.6 The deploy folder and the `mctl` helper

The server needs only the compose file and the database start-up scripts from
the repository. Check out the same commit the images were built from:

```
sudo git clone https://github.com/khurshidnm/muomalat.git /opt/muomalat
sudo git -C /opt/muomalat checkout <commit-sha-from-the-CI-run>
sudo install -d -m 700 /etc/muomalat
```

`mctl` saves typing the long compose command:

```
sudo tee /usr/local/sbin/mctl >/dev/null <<'EOF'
#!/bin/sh
# Muomalat production stack: docker compose with the right project, settings and file.
exec docker compose -p muomalat --env-file /etc/muomalat/muomalat.env -f /opt/muomalat/docker/compose.prod.yml "$@"
EOF
sudo chmod 755 /usr/local/sbin/mctl
```

From now on: `sudo mctl ps`, `sudo mctl logs -f worker`, and so on.

Log in to GitHub's registry with the token from step 3:

```
echo '<read:packages token>' | sudo docker login ghcr.io -u <github-username> --password-stdin
```

## 5. Cloudflare

Everything here works on the **Free** plan.

### 5.1 Add the domain

1. Cloudflare → Add a domain → `muomalat.uz` → Free plan.
2. Cloudflare shows two name servers. At SUVAN NET, replace the domain's name
   servers with those two. Wait until Cloudflare says **Active** (minutes to
   a day).
3. **DNS:** delete any A or AAAA records Cloudflare imported for
   `muomalat.uz`, `www` or `cms`. The tunnel creates its own records (5.4).
   Nothing may point at the VPS IP.
4. **DNSSEC:** DNS → Settings → Enable DNSSEC. Cloudflare shows a DS record;
   send it to SUVAN NET and ask them to publish it. Ask them also about
   transfer and update locks on the domain.
5. **CAA records** (DNS → Records → Add → CAA), so only the certificate
   authorities Cloudflare uses may issue for the domain:
   - `muomalat.uz` CAA `0 issue "letsencrypt.org"`
   - `muomalat.uz` CAA `0 issue "pki.goog"`
   - `muomalat.uz` CAA `0 issue "ssl.com"`
   - `muomalat.uz` CAA `0 iodef "mailto:<security@muomalat.uz>"`

   Cloudflare adds the records its Universal SSL needs on top of these.
6. **Certificate Transparency monitoring:** SSL/TLS → Edge Certificates →
   Certificate Transparency Monitoring → On (alerts are off by default:
   turn on the e-mail).
7. **SSL/TLS → Edge Certificates:** Always Use HTTPS **On**; Minimum TLS
   Version **1.2**; Automatic HTTPS Rewrites On. Leave Cloudflare's own HSTS
   setting off: the app already sends `Strict-Transport-Security` (1 year,
   includeSubDomains).
8. **Security → Bots:** Bot Fight Mode **Off**. It can block Telegram's link
   preview robot, and no rule can make an exception for it (§12.3).
9. **Account security:** at most two Super Administrators, each with security
   keys (My Profile → Authentication).

### 5.2 Zero Trust (Cloudflare Access)

1. Cloudflare → Zero Trust. Pick a team name (for example `muomalat`): your
   team domain becomes `muomalat.cloudflareaccess.com`. Choose the **Free**
   plan (up to 50 users). Settings → Team name and domain shows it; it goes
   into `CF_ACCESS_TEAM_DOMAIN`.
2. **Login method:** Integrations → Identity providers → Add → **Google
   Workspace**, following Cloudflare's guide
   (https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google-workspace/).
   Then open **One-time PIN** and delete it, so nobody can sign in with an
   e-mailed code.
3. **Staff list:** Access → Access groups (in the newer dashboard: Access
   controls → Rule groups) → Add a group named `staff`, Include → Emails →
   each staff address. Add a person only after their two security keys are
   enrolled on their Google account (CMS-SPEC §4.4).
4. **Security keys at the edge (check once):** Settings → Authentication (or
   Access controls → Access settings) → look for **"Allow multi-factor
   authentication (MFA)"**.
   - If it is there: turn it on, and in the application below choose
     Custom MFA settings with only **Security key** and **Biometrics**
     allowed (no authenticator codes), at most 8 hours.
   - If your Free organisation does not show it, that is expected: the
     Google Workspace "security key only" setting carries the requirement.
     Check that setting monthly, and look for the Cloudflare option again
     when you move to a paid plan (§12.3).
5. **The application** (create it now, before the tunnel sends any traffic):
   Access → Applications → Add an application → **Self-hosted**:
   - Name `Muomalat CMS`; session duration **8 hours**;
   - Public hostname: subdomain `cms`, domain `muomalat.uz`, path empty
     (the whole host: admin, API, preview, the site as staff see it);
   - Identity providers: **Google Workspace** only; Instant Auth on;
   - Policy: name `Staff`, action **Allow**, Include → Access group → `staff`;
     Require → Login methods → Google Workspace;
   - Save. Open the application again → Overview (or Basic information):
     copy the **Application Audience (AUD) Tag** for `CF_ACCESS_AUD`.

### 5.3 The tunnel

1. Zero Trust → Networks → Tunnels → Create a tunnel → **Cloudflared** →
   name `muomalat`.
2. Choose "Docker" as the environment. The page shows a command with
   `--token eyJ…`: copy **only the long token** for
   `CLOUDFLARE_TUNNEL_TOKEN`. Do not run the command; our compose file runs
   cloudflared.
3. Leave the tunnel without routes for now; step 7 adds them after the first
   admin exists.

### 5.4 Tunnel routes (do this in step 7.5)

Tunnels → `muomalat` → **Public hostnames** (newer dashboard: Published
application routes) → Add:

| Subdomain | Domain | Service |
|---|---|---|
| *(empty)* | `muomalat.uz` | `HTTP` → `app:3000` |
| `cms` | `muomalat.uz` | `HTTP` → `app:3000` |

Leave "HTTP Host Header" empty, so the app sees the real host name.
Cloudflare creates the two DNS records (proxied CNAMEs to the tunnel) itself.

### 5.5 Firewall rules (WAF custom rules)

Security → WAF → Custom rules. The Free plan allows **five** rules and no
regular expressions, so the blocks are combined into two. Use "Edit
expression" and paste:

**Rule 1: `CMS paths on the public host`**, action **Block**:

```
(http.host eq "muomalat.uz" and (
  starts_with(lower(http.request.uri.path), "/admin")
  or starts_with(lower(http.request.uri.path), "/preview")
  or starts_with(lower(http.request.uri.path), "/exit-preview")
  or ((lower(http.request.uri.path) eq "/api" or starts_with(lower(http.request.uri.path), "/api/"))
      and not (starts_with(http.request.uri.path, "/api/media/file/") and http.request.method in {"GET" "HEAD"}))
))
```

**Rule 2: `Closed on every host`**, action **Block**:

```
(starts_with(lower(http.request.uri.path), "/internal")
 or starts_with(lower(http.request.uri.path), "/api/users/first-register")
 or starts_with(lower(http.request.uri.path), "/admin/create-first-user")
 or starts_with(lower(http.request.uri.path), "/api/graphql"))
```

The app repeats every one of these rules itself (`src/proxy.ts`); the edge
rules stop the requests before they reach the server.

### 5.6 The one rate-limiting rule

Security → WAF → Rate limiting rules → Create. On Free there is one rule; it
can match the path only, counts by IP over 10 seconds and blocks for 10
seconds. The real limits are inside the app (§12.3); this rule only sheds
floods on the pages whose forms post to the server, and search:

- Name `Forms and search`;
- Expression (Edit expression):

  ```
  (http.request.uri.path in {"/aloqa" "/reklama" "/klub" "/dayjest" "/qidiruv" "/maxfiylik"
    "/kr/aloqa" "/kr/reklama" "/kr/klub" "/kr/dayjest" "/kr/qidiruv" "/kr/maxfiylik"
    "/ru/aloqa" "/ru/reklama" "/ru/klub" "/ru/dayjest" "/ru/qidiruv" "/ru/maxfiylik"
    "/en/aloqa" "/en/reklama" "/en/klub" "/en/dayjest" "/en/qidiruv" "/en/maxfiylik"})
  ```
- Characteristics: IP; **10 requests per 10 seconds**; action Block for 10 seconds.

It also counts ordinary page views of those pages (cached ones too), so keep
it generous. Tune it later from Security → Events.

### 5.7 Cache rules

Caching → Cache Rules. When several rules match, the **later** rule wins, so
create them in this order:

1. `Site pages`: `(http.host eq "muomalat.uz")` → **Eligible for cache**;
   Edge TTL: **Use cache-control header if present, bypass cache if not**;
   Browser TTL: Respect origin. (The app sends `s-maxage` of 300 s for the
   home pages, 600 s for rubrics, 3600 s for the rest, and purges each
   changed page right after a publish.)
2. `Uploads`: `(http.host eq "muomalat.uz" and starts_with(http.request.uri.path, "/api/media/file/"))`
   → Eligible for cache; Edge TTL: **Ignore cache-control header and use
   this TTL: 1 month**.
3. `No cache for sessions and RSC`:
   `(http.host eq "muomalat.uz" and (http.cookie contains "muomalat-token" or http.cookie contains "__prerender_bypass" or http.request.uri.query contains "_rsc"))`
   → **Bypass cache**.
4. `CMS never cached`: `(http.host eq "cms.muomalat.uz")` → **Bypass cache**.

After the first deploy, check on a page that is cached: `curl -sI
https://muomalat.uz/tahlil | grep -i -E 'cf-cache-status|age'` twice. The
second answer should be `HIT`. Whether Free honours the shorter `s-maxage`
of the home pages (below its own 2-hour minimum) is one of the open checks of
the spec (§8.4): note what you see.

### 5.8 A token that can only purge the cache

My Profile → API Tokens → Create Token → Custom token:

- Name `muomalat purge`;
- Permissions: **Zone → Cache Purge → Purge**;
- Zone resources: Include → Specific zone → `muomalat.uz`;
- (optional) Client IP filtering: the VPS address;
- TTL: one year (calendar reminder; rotate yearly, §12.6).

Copy the token for `CF_API_TOKEN`, and the zone's **Zone ID** (domain
Overview page, right column) for `CF_ZONE_ID`.

## 6. The backup bucket and keys

The backups go to a bucket in the EU that **locks every file for 30 days**:
nobody, not even you or an attacker with your password, can delete or
overwrite a backup during that time. The server's key can only add files.
This guide uses Backblaze B2 (EU Central, Amsterdam); any S3-compatible EU
provider with object lock works (Scaleway, OVHcloud, Wasabi EU).

### 6.1 Bucket

Backblaze → B2 Cloud Storage → Buckets → Create a Bucket:

- name: `muomalat-backups-<random letters>` (names are global);
- Files: **Private**; Default encryption: Enable;
- **Object Lock: Enable** (only possible now, at creation); after creating,
  Bucket Settings → Object Lock → Default retention **Compliance, 30 days**.

Note the bucket's **Endpoint** (for example
`s3.eu-central-003.backblazeb2.com`); the region is the part after `s3.`
(`eu-central-003`).

**Lifecycle rules** (Bucket Settings → Lifecycle Settings → Use custom
lifecycle rules). These delete old copies, so the server's key never needs
delete rights. Retention: 30 daily, 12 weekly, 12 monthly (§12.7); the audit
export is kept 5 years (§9.5):

| File path prefix | Days till hide | Days till delete |
|---|---|---|
| `production/daily/` | 31 | 1 |
| `production/weekly/` | 85 | 1 |
| `production/monthly/` | 366 | 1 |
| `audit/production/` | 1830 | 1 |

### 6.2 Application keys

Backblaze → Application Keys → Add a New Application Key. Make two now:

| Name | Bucket | File name prefix | Access | Goes into |
|---|---|---|---|---|
| `muomalat-backup-write` | the bucket | `production/` | **Write only** | `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` |
| `muomalat-audit-write` | the bucket | `audit/production/` | **Write only** | `AUDIT_S3_ACCESS_KEY_ID` / `AUDIT_S3_SECRET_ACCESS_KEY` |

The "keyID" is the access key id, the "applicationKey" (shown once) the
secret. A third key, **read only**, is made only for a restore or the drill
and deleted afterwards (step 10).

### 6.3 The encryption keys (age)

Backups are encrypted on the server with **public** keys; only the matching
**private** keys can decrypt them, and those never touch the server. Make two
on your laptop, one for you and one for the safe:

```
$ age-keygen -o muomalat-backup-key-1.txt
Public key: age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs3290gq
$ age-keygen -o muomalat-backup-key-2.txt
```

- The two **public keys** (`age1…`) go into `BACKUP_AGE_RECIPIENTS`,
  separated by a space.
- The two **files** are the private keys. Store key 1 in the password manager
  (as a file attachment) and on a USB stick; print key 2 and put it, with a
  second USB stick, in the safe. Then delete the files from the laptop.
  Without them no backup can ever be read.

## 7. First deploy

### 7.1 The settings file

```
sudo cp /opt/muomalat/.env.production.example /etc/muomalat/muomalat.env
sudo chmod 600 /etc/muomalat/muomalat.env
```

Generate the secrets straight into the file:

```
F=/etc/muomalat/muomalat.env
for v in POSTGRES_SUPERUSER_PASSWORD OWNER_DB_PASSWORD APP_DB_PASSWORD BACKUP_DB_PASSWORD; do
  sudo sed -i "s|^$v=.*|$v=$(openssl rand -hex 32)|" $F
done
sudo sed -i "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$(openssl rand -base64 64 | tr -d '\n')|" $F
sudo sed -i "s|^INTERNAL_REVALIDATE_SECRET=.*|INTERNAL_REVALIDATE_SECRET=$(openssl rand -base64 32)|" $F
```

Then open it and fill in everything else from steps 3–6 (each line has a
comment saying where the value comes from):

```
sudo nano /etc/muomalat/muomalat.env
sudo grep -n '<' /etc/muomalat/muomalat.env      # must print nothing: no placeholder left
sudo mctl config --quiet && echo "settings OK"    # compose checks every required value
```

Keep a copy of the finished file in the password manager. An encrypted copy
can also go into a private ops repository (`age -r <your age1 key>`), §12.6.

### 7.2 Download the images and start the database

```
sudo mctl pull
sudo mctl up -d postgres
sudo mctl ps                  # postgres: "healthy" after a few seconds
```

On its first start Postgres creates the three roles and the `muomalat`
database (`docker/postgres/init`). Those scripts run only once, when the
data volume is new.

### 7.3 Migrations

```
sudo mctl run --rm migrate
```

It ends with `migrate: database is up to date` and lists every migration as
`applied`.

### 7.4 The first administrator (before anyone can reach the site)

```
sudo mctl run --rm --no-deps worker admin-create --email <you@muomalat.uz> --name "<Ism Familiya>" --role admin
```

It prints a password **once**: put it in the password manager now. The
"create first user" page is closed everywhere; this command is the only way
to make the first account (§12.1). The admin account cannot write content
(separation of duties): make editors and reporters in the CMS afterwards
(Foydalanuvchilar), each with their own address.

### 7.5 Start everything and open the tunnel

1. Add the two tunnel routes of 5.4 in the Cloudflare dashboard.
2. Start the rest:

   ```
   sudo mctl up -d
   sudo mctl ps
   ```

   After a minute every service shows `running (healthy)` (cloudflared shows
   `running`; Zero Trust → Tunnels shows the tunnel as **Healthy**).
3. Check the worker started its jobs:

   ```
   sudo mctl logs --tail 30 worker
   ```

   The first lines name the jobs: `worker: N job(s): audit-alerts, audit-export, publish-outbox, …`.
4. Open https://muomalat.uz (the site; empty until content is published) and
   https://cms.muomalat.uz/admin (Cloudflare asks for your Google login, then
   Payload for the password from 7.4).
5. Take the first backup by hand and check it arrived:

   ```
   sudo mctl exec backup muomalat-backup run
   ```

   It ends with `uploaded to store:…/production/daily/<stamp>` and `audit:
   ops.backup_ok recorded`. In Backblaze → Browse Files you see
   `production/daily/<stamp>/` with `db.dump.age`, `media.tar.age`,
   `manifest.json` and `SHA256SUMS`.

**Content:** production starts empty; stories are written in the CMS. The
importer refuses to load the demo articles in production (§16 M1); only the
vocabulary (rubrics, tags, glossary, institutions) may be imported:
`sudo mctl run --rm --no-deps worker seed --only=rubrics,tags,glossary,institutions`.

## 8. Smoke tests

After **every** deploy (CMS-SPEC §16 group K). From your laptop, in a clone
of the repository:

```
$ docker/smoke.sh https://muomalat.uz https://cms.muomalat.uz
```

Every line must say `PASS`. It checks: the site and its editions answer; the
security headers (K5); the admin, the API, preview and `/internal` are
blocked on the public host; first-user registration and GraphQL are closed on
both hosts (K3); the CMS host sends everyone to Cloudflare Access.

Then by hand:

| Check | How |
|---|---|
| K1 cookies | Log in to the CMS in Chrome → DevTools → Application → Cookies → `muomalat-token`: Secure ✓, HttpOnly ✓, SameSite **Strict** |
| K5 CMS host | DevTools → Network → any `/admin` response has `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` |
| K6 no open ports | `$ nmap -Pn <server-ip>` from outside: only `22/tcp` open (or nothing, if SSH is limited to your office IP) |
| K11 keys only | A staff login that offers only an authenticator-app code is refused (by Cloudflare if Independent MFA is on, otherwise by Google) |
| K15 idle logout | Leave a CMS tab untouched for 30 minutes: it logs you out |
| K16 lock-out drill | Once before launch and then quarterly: remove a test user from the `staff` group and revoke their sessions (RUNBOOKS, "Hijacked staff account"); within about a minute they lose the CMS |
| Health | `sudo mctl ps`: all healthy. `sudo mctl logs --since 15m app worker \| grep -i -E 'error\|fatal'`: nothing new |
| Alerts | Watch the staff alerts group for 15 minutes |

## 9. Updates and the weekly patch routine

### 9.1 Every Monday (30 minutes)

1. **GitHub → Pull requests:** Renovate opens update PRs on Monday morning
   (only versions at least 3 days old; nothing is merged automatically).
   Read each one's release notes. Payload packages come as one PR. Merge the
   ones whose CI is green. For Next.js or Payload, read the release notes for
   breaking changes first.
2. **Security advisories:** glance at
   https://github.com/payloadcms/payload/security/advisories and
   https://github.com/vercel/next.js/security/advisories. Patch deadlines:
   critical within 48 hours, high within 7 days, others in this weekly window.
3. **Deploy** the new images (9.2) if anything was merged.
4. **Server:** `sudo apt update && sudo apt upgrade -y` (this also updates
   Docker, which the automatic updates leave alone), then
   `[ -f /var/run/reboot-required ] && sudo reboot`. Check
   `sudo mctl ps` after the reboot.
5. **Backups:** `sudo mctl exec backup muomalat-backup status` says `ok`
   with last night's date.

The images are also rebuilt by CI on the 1st of each month to pick up Alpine
security fixes; deploy that build like any other.

### 9.2 Releasing a new version

```
sudo mctl exec backup muomalat-backup run           # 1. a fresh backup first
sudo nano /etc/muomalat/muomalat.env                # 2. new MUOMALAT_IMAGE and MUOMALAT_BACKUP_IMAGE from the CI summary
sudo git -C /opt/muomalat fetch && sudo git -C /opt/muomalat checkout <same commit>
sudo mctl pull                                      # 3. download
sudo mctl run --rm migrate                          # 4. migrations (as the owner)
sudo mctl up -d                                     # 5. restart what changed
$ docker/smoke.sh https://muomalat.uz https://cms.muomalat.uz    # 6. smoke tests
```

Then watch the alerts group for 15 minutes. Write the old and new digests in
your ops log: the old ones are your rollback.

**Rollback:** put the previous digests back into the settings file and run
`sudo mctl up -d`. Migrations normally only add things, so the old version
runs on the new schema. If a migration damaged data, restore the backup from
step 1 (RUNBOOKS, "Restoring from backup").

## 10. Backups and the monthly restore drill

### 10.1 What runs by itself

- **01:30 Tashkent:** the `backup` service dumps the database (as a read-only
  role) and archives the uploads, encrypts both with your age public keys,
  uploads them to `production/daily/<stamp>/` (and `weekly/` on Sundays,
  `monthly/` on the 1st), keeps 3 days on the server, and writes
  `ops.backup_ok` to the audit log.
- **02:30:** the worker exports yesterday's audit log to `audit/production/`.
- **06:00:** if no `ops.backup_ok` arrived, the worker raises
  `ops.backup_fail`, which alerts the staff group. A failed run alerts at once.
- The bucket deletes copies past their retention; each file is locked for 30
  days.

Check any time: `sudo mctl exec backup muomalat-backup status`.

### 10.2 The monthly restore drill (first Monday, 30–60 minutes)

A backup you have never restored is not a backup (§12.7, K12). The drill
takes a fresh backup, restores it from the bucket into a scratch database
next to production and proves it matches. Production keeps running. (Pick a
quiet moment: rows the editors write during the drill show up as
differences.)

1. In Backblaze, make a **read-only** application key for the bucket, prefix
   `production/`. Put it into the settings file as `RESTORE_S3_ACCESS_KEY_ID`
   and `RESTORE_S3_SECRET_ACCESS_KEY`.
2. Copy your age private key to the server for the duration of the drill:

   ```
   $ scp muomalat-backup-key-1.txt ops@<server-ip>:/tmp/age-identity
   sudo install -m 0400 -o 1001 -g 1001 /tmp/age-identity /root/age-identity && rm /tmp/age-identity
   ```
3. Take a backup now, make an empty scratch database and restore into it:

   ```
   sudo mctl exec backup muomalat-backup run
   sudo mctl exec postgres /docker-entrypoint-initdb.d/create-database muomalat_restore
   sudo mctl --profile restore run --rm -v /root/age-identity:/run/secrets/age-identity:ro \
     restore run --database muomalat_restore --media-dir /restore/media
   ```

   It downloads the newest backup from the bucket (the one you just made),
   checks its SHA-256 sums, restores the database in one transaction and
   unpacks the uploads, then prints how long it took: that is your **RTO**
   (target: under 4 hours).
4. Prove it matches, table by table and file by file:

   ```
   sudo mctl --profile restore run --rm --entrypoint muomalat-compare restore \
     --except audit_log,publish_events,payload_kv,users_sessions,payload_locked_documents,payload_locked_documents_rels,payload_preferences,payload_preferences_rels \
     muomalat muomalat_restore /data/media /restore/media
   ```

   It must end with `identical` for the database and the media. The tables
   left out are written all the time (the audit log gets its
   `ops.backup_ok` row just after the dump). A difference elsewhere means an
   editor saved something during the drill (run it again) or the backup is
   incomplete (investigate). The **RPO** is the age of the newest nightly
   backup at the moment you would need it: at most 24 hours in Phase 1.
5. Clean up, every time:

   ```
   sudo mctl exec postgres dropdb -U postgres muomalat_restore
   sudo mctl --profile restore run --rm --entrypoint sh restore -c 'rm -rf /restore/media'
   sudo shred -u /root/age-identity
   ```

   Delete the read-only key in Backblaze and empty the two `RESTORE_S3_…`
   lines again.
6. Write in the ops log: date, backup stamp, RTO, RPO, anything odd.

Once a quarter, do the full drill instead: restore onto a **fresh scratch
VPS** (or a laptop with Docker, section 11) from the bucket alone, as if the
server were gone. Once a month, also copy the newest `monthly/` backup to a
second provider or account (Hostinger snapshots are not a backup):
`rclone copy` from your laptop with the read-only key works.

## 11. Rehearse locally

On a developer machine with Docker, the whole production stack runs locally,
with a local S3 server in place of the bucket and the app on
`127.0.0.1:3110` instead of the tunnel (`docker/compose.prodtest.yml`):

```
$ docker build -f docker/Dockerfile -t muomalat:prodtest .
$ docker build -f docker/Dockerfile --target backup -t muomalat-backup:prodtest .
$ # a throwaway settings file: copy .env.production.example to .spike/deploy/.env.prodtest,
$ # set MUOMALAT_IMAGE=muomalat:prodtest, MUOMALAT_BACKUP_IMAGE=muomalat-backup:prodtest,
$ # SITE_ENV=staging, ACCESS_JWT_REQUIRED=false, BACKUP_S3_ENDPOINT=http://s3:9000,
$ # AUDIT_EXPORT_TARGET=s3://muomalat-audit/prodtest with AUDIT_S3_ENDPOINT=http://s3:9000
$ P="docker compose -p muomalat-prodtest --env-file .spike/deploy/.env.prodtest -f docker/compose.prod.yml -f docker/compose.prodtest.yml"
$ $P up -d && $P ps
$ $P run --rm --no-deps worker admin-create --email admin@muomalat.local --name "Admin" --role admin
$ $P run --rm --no-deps worker seed --all         # staging only: the demo content
$ curl -s -H 'Host: muomalat.uz' http://127.0.0.1:3110/ | head
$ docker/smoke.sh http://muomalat.uz http://cms.muomalat.uz --connect 127.0.0.1:3110
$ $P exec backup muomalat-backup run
$ $P down -v                                       # removes everything, data included
```

## 12. Troubleshooting

| Symptom | Look at | Usual cause |
|---|---|---|
| `mctl config` says "required variable … is missing" | the settings file | A line left empty or still `<…>` |
| `app` restarts in a loop | `sudo mctl logs --tail 50 app` | `startup guard:` lines name the unsafe setting (e.g. `ACCESS_JWT_REQUIRED`, a short `PAYLOAD_SECRET`) |
| `migrate` fails, app never starts | `sudo mctl logs migrate` | Wrong `OWNER_DB_PASSWORD`, or a migration error: do not retry blindly; roll back the image |
| Site shows Cloudflare error 1033 | Zero Trust → Tunnels | cloudflared not running: `sudo mctl logs cloudflared` (token wrong?) |
| Site shows 502 | `sudo mctl ps` | app not healthy yet (it takes up to a minute after a start) |
| CMS login loops back to the login page | the browser's cookies | The page was opened over `http://`, or the Access policy does not include the user |
| "Not found" on `/admin` | the URL | The admin is only on `cms.muomalat.uz`, never on `muomalat.uz` |
| Backup `failed at step 'upload'` | `sudo mctl logs backup` | Wrong bucket keys or endpoint; the key must have write access to `production/` |
| A published change is not on the site | `sudo mctl logs --tail 50 worker` | Outbox errors; `CF_API_TOKEN` wrong (purge fails) |
| Disk full | `df -h`, `sudo docker system df` | Old images: `sudo docker image prune -a` (keeps the running ones) |

Where things live on the server:

| What | Where |
|---|---|
| Settings and secrets | `/etc/muomalat/muomalat.env` (root, 0600) |
| Compose file and database start-up scripts | `/opt/muomalat/docker/` |
| Database, uploads, caches, local backups | Docker volumes `muomalat_pgdata`, `muomalat_media`, `muomalat_next-cache`, `muomalat_route-cache`, `muomalat_backups` |
| Logs | `sudo mctl logs <service>` (rotated: 5 × 10 MB per container) |
