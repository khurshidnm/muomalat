# Muomalat CMS: implementation specification

Payload CMS 3 embedded in this Next.js app at `/admin`, on PostgreSQL.
Version 1.2, 9 October 2026. Why each decision was made is in [CMS-RESEARCH.md](./CMS-RESEARCH.md). This document says what to build.

**Changes in 1.2**

- Applies the Phase 0 results: the edits S1–S78 in [PHASE0-FINDINGS.md](./PHASE0-FINDINGS.md) §3. Where Phase 0 differs from 1.1, the tested design replaces the old text. The largest changes are caching Option B (§8.2), the three publish locks with no update-access Where clauses (§4.3), failed logins through `users.hooks.afterError` (§9.4), media metadata stripping (§3.12), the copy-from-Uzbek action (§3.3), server-side checks on the article body (§3.4) and session limits (§12.2).
- Records the Cloudflare Free plan at launch, with a paid plan after launch (§1). Rate limiting moves into the app (§12.3), purges go by exact URL (§8.4), and a fallback is set in case Independent MFA is not on Free (§12.3).
- Moves the Uzbek admin pack into Phase 1 (§6.6, §17).
- §18 now shows what Phase 0 resolved and what is still open.

Version 1.1 applied the corrections from an independent verification pass (CMS-RESEARCH, "Verification notes").

**Conventions**

- **MUST** is required for launch. **SHOULD** is expected unless there is a written reason not to. **LATER** is out of scope for Phase 1.
- **VERIFY** marks Payload, Next.js or Cloudflare behaviour we have not confirmed. The Phase 0 spike checked every item listed in §18. Its results are in [PHASE0-FINDINGS.md](./PHASE0-FINDINGS.md), and §18 lists the checks that are still open.
- **Names:**
  - Code names (fields, collections, roles, states) are English, so the code stays readable.
  - Admin labels and help text are Uzbek Latin, written with ʻ (U+02BB) and ʼ (U+02BC).
  - Collection slugs are kebab-case.
- **Field markers:**
  - **[L]** marks a field that is localized in Payload: one value each for `uz`, `ru` and `en`.
  - "Req" in field tables means **required at publish**. Drafts may be incomplete.
  - For localized fields, "Req" means "the `uz` value is required". Our hook enforces this, not Payload's `required` flag (§7.3).
- **Code samples are sketches.** They show intent and API shape, not final code.

---

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Platform | `payload` and every `@payloadcms/*` package pinned to the same **exact** version, ≥ 3.90.2 and < 4. Plugins allowed: `@payloadcms/plugin-redirects`, `@payloadcms/plugin-seo` (optional), `@payloadcms/email-nodemailer`. Not installed: form-builder, import-export, MCP, multi-tenant, search, any storage adapter |
| Runtime | Node 24 LTS (Payload 4 will need ≥ 24.15). Next 16.4.x, React 19.3.x. PostgreSQL 17 through `@payloadcms/db-postgres` |
| Hosting | One Hostinger VPS in the **Lithuania** region (Germany if unavailable), at least 2 vCPU, 8 GB RAM and 100 GB NVMe. Docker Compose. Cloudflare in front. Cloudflare Tunnel is the only way in; no public ports |
| Hostnames | `muomalat.uz` is the public site, cached at Cloudflare. `cms.muomalat.uz` is the same app behind Cloudflare Access; it serves `/admin`, `/api` and preview |
| Cloudflare plan | **Free at launch; a paid plan after launch.** Phase 1 uses no paid feature: rate limiting is done in the app (login per IP and per account, the four public forms, search), and the single Free rate-limiting rule covers the form and search paths (§12.3); the cache is purged by exact URL (§8.4); five WAF custom rules without regex; Universal SSL, which covers only first-level subdomains (§15). Whether Independent MFA is on Free is not yet verified (§12.3) |
| Admin login | Phase 1: Cloudflare Access **and** a Payload password. The requirement stands: staff reach the admin only with a security key (or biometrics). It is enforced at the edge through Independent MFA if our plan has it (§12.3). Otherwise staff sign in to Access through an identity provider that enforces security keys: Google Workspace with 2-step verification set to "security key only" (§12.9), a policy Access cannot verify; the Payload password stays, and WebAuthn inside Payload is LATER. Payload also checks the Access JWT (§12.2). Phase 2: Payload trusts the Access JWT and the password becomes break-glass only |
| Workflow | A custom `workflowStatus` field, a transition table, and hooks that enforce the two-person rule. Payload's `_status` only decides whether a document is public |
| Scheduling | Our own scheduler running in the worker. Payload's `schedulePublish` is **not** enabled |
| Article body | A Lexical rich-text field with typed blocks, serialized at read time into the existing `ArticleBlock[]` and `RichText` markup, so the front-end components do not change |
| Languages | Payload locales `uz` (default), `ru` and `en`, with `fallback: false`. `kr` is transliterated at read time and is never a Payload locale. Russian and English appear only when the translation status is `approved`. The admin interface is in Uzbek from Phase 1, through a custom `uz` language pack (§6.6) |
| Caching | Content layer becomes async. Option B: content functions wrapped in `unstable_cache` with tags, plus route-level `revalidate` (chosen in Phase 0, see PHASE0-FINDINGS). Option A (Cache Components) is deferred until the Partial Prefetching problems found in Phase 0 are fixed. Tag names are the same in both. Cache invalidation runs after commit. A Cloudflare purge by exact URL follows; prefix purge is used only when a slug or rubric changes (§8.4) |
| Background work | A `worker` container that runs the same image: scheduler, outbox (purge, warm-up, Telegram), retention, alerts |
| Audit | An append-only `audit-log` collection with a hash chain. The database role has no UPDATE or DELETE on it. Critical events are forwarded at once to a private Telegram alerts group; a nightly export goes to immutable storage |
| Telegram | Phase 2. Every post is approved by a non-author editor and leaves through a cancellable 3-minute delay. Bot rights are post, edit and delete only, plus `can_manage_chat`, which Telegram implies for every admin |
| Personal data | Four collections with consent records, retention jobs, role-limited reads and a deletion route. They are isolated behind one interface so they can be moved to an Uzbek host if needed |

---

## 2. Architecture

### 2.1 Runtime topology

```
Readers (Telegram in-app browser, mobile)        Staff (security key)
          │ https://muomalat.uz                         │ https://cms.muomalat.uz
          ▼                                             ▼
   ┌──────────────────────── Cloudflare ─────────────────────────┐
   │ cache (HTML + assets) · WAF rules · rate limits ·           │
   │ Access app on cms.muomalat.uz (deny by default)             │
   └──────────────────────┬──────────────────────────────────────┘
                          │ Cloudflare Tunnel (outbound from VPS)
   ┌──────────────── Hostinger VPS (EU) · Docker network ─────────┐
   │  cloudflared ──► app :3000  (next start: site + Payload)     │
   │                    │   ▲                                     │
   │                    │   └── POST /internal/revalidate (HMAC)  │
   │                    ▼   │                                     │
   │                postgres :5432  ◄── worker (scheduler,        │
   │                    ▲               outbox, Telegram, jobs)   │
   │                    └── backup (nightly pg_dump + media) ─────┼──► EU object storage
   │  volumes: pgdata · media · next-cache                        │    (object lock)
   └──────────────────────────────────────────────────────────────┘
                                   worker ──► api.telegram.org · Cloudflare API · SMTP
```

No container publishes a port to the host. SSH is reached through Cloudflare Tunnel, or restricted to known addresses.

### 2.2 Repository layout (additions)

```
src/
  app/
    [lang]/…                       existing site (unchanged location)
    (payload)/                     Payload admin + REST (own root layout)
      admin/[[...segments]]/page.tsx · not-found.tsx · layout.tsx · importMap.js · custom.scss
      api/[...slug]/route.ts
    preview/route.ts               enables draftMode on cms host only
    exit-preview/route.ts
    internal/revalidate/route.ts   HMAC-protected; Docker network only
    t/[code]/route.ts              short links → 301
    sitemap.ts · sitemap-news.xml/route.ts (LATER) · robots.ts …
  payload.config.ts
  payload/
    collections/  Articles.ts Authors.ts Rubrics.ts Tags.ts GlossaryTerms.ts Institutions.ts
                  Milestones.ts ClubEvents.ts Media.ts Users.ts ClubApplications.ts
                  DigestSubscribers.ts ContactMessages.ts AdvertisingRequests.ts Requests.ts
                  AuditLog.ts PublishEvents.ts TelegramPosts.ts
    globals/      SiteSettings.ts Navigation.ts AdSlots.ts HomePage.ts EditorialRules.ts
    blocks/       figure.ts table.ts chart.ts quote.ts qa.ts factbox.ts callout.ts term.ts
                  inline/glossaryLink.ts inline/keepLatin.ts
    fields/       consent.ts rights.ts seo.ts system.ts
    access/       roles.ts edge.ts articles.ts personalData.ts …
    hooks/        workflow.ts twoPerson.ts changeKind.ts corrections.ts sponsored.ts
                  embargo.ts translation.ts validate.ts audit.ts invalidate.ts slug.ts
    lexical/      editors.ts serialize.ts fromMarkup.ts
    endpoints/    transition.ts check.ts
    admin/        WorkflowActions.tsx ChecksPanel.tsx EmbargoBadge.tsx CharCounter.tsx
                  KrPreview.tsx TranslationStatus.tsx
  content/
    index.ts      public API (same function names, now async)
    adapters/payload.ts · adapters/mock.ts (today's implementation, kept for tests/dev)
    rules.ts      validation rules shared by scripts and hooks
    types.ts      contract (extended, §3.17)
  worker/index.ts
scripts/
  create-first-admin.ts · import-mock.ts · parity.ts · break-glass.ts · validate-content.ts
docker/
  Dockerfile · compose.dev.yml · compose.prod.yml · postgres/init/*.sql · backup/
```

Notes on routing:

- **Root layouts:** `src/app/[lang]/layout.tsx` stays the site's root layout, and `(payload)/layout.tsx` is the admin's. Static segments (`admin`, `api`, `preview`, `internal`, `t`) take precedence over the dynamic `[lang]` segment. No conflict was seen in Phase 0: the site, `/admin`, `/api` and `/internal/revalidate` built and served from one app. `/preview` and `/t` were not exercised.
- **`src/proxy.ts` changes:**
  - The matcher must exclude `admin`, `api`, `preview`, `exit-preview`, `internal` and `t/`.
  - Host-based blocking is added (§2.3).

### 2.3 Request routing by host

| Path | `muomalat.uz` | `cms.muomalat.uz` |
|---|---|---|
| Site routes (`/`, `/kr/…`, `/ru/…`, `/en/…`) | Served; Cloudflare caches HTML | Served behind Access, never cached, header `X-Robots-Tag: noindex, nofollow`; used for preview and checking |
| `/admin*` | **404** (Cloudflare WAF rule + `proxy.ts`) | Payload admin |
| `GET /api/media/file/*` | Allowed, cached 30 days | Allowed |
| `/api/*` (everything else) | **404** at edge + proxy | Payload REST (behind Access) |
| `/api/graphql*` | Disabled in config | Disabled |
| `/api/users/first-register`, `/admin/create-first-user` | 404 | **404 permanently** (edge rule): the first admin is created by script (§12.1) |
| `/preview`, `/exit-preview` | 404 | Preview routes |
| `/internal/*` | 404 at edge | 404 at edge; reachable only inside the Docker network; HMAC required |
| `/t/<code>` | 301 to the article | 301 |
| `/robots.txt` | Normal | `Disallow: /` |

`proxy.ts` repeats every host rule. It is never the only check: Next.js published five Middleware/Proxy-bypass advisories in 2026 (CVE-2026-44573, -44574, -44575, -45109 and -64642; [advisories](https://github.com/vercel/next.js/security/advisories)).

### 2.4 Packages

```jsonc
// package.json (additions; exact pins)
"payload": "3.90.2",
"@payloadcms/next": "3.90.2",
"@payloadcms/ui": "3.90.2",
"@payloadcms/db-postgres": "3.90.2",
"@payloadcms/richtext-lexical": "3.90.2",
"@payloadcms/plugin-redirects": "3.90.2",
"@payloadcms/email-nodemailer": "3.90.2",
"@payloadcms/live-preview-react": "3.90.2",
"@payloadcms/translations": "3.90.2", // uz admin pack (§6.6)
"sharp": "0.35.5",
"jose": "5.10.0",               // Access JWT verification; the version payload@3.90.2 depends on
"bson-objectid": "2.0.4",       // fromMarkup.ts block ids; the version payload uses
"graphql": "<as required by payload peer deps>"
// dev: "vitest", "@playwright/test"
```

`next.config.ts` changes:

- wrap the config with `withPayload()`;
- `output: 'standalone'`;
- `images.localPatterns` for `/api/media/file/**`;
- security headers (§12.4).

Also add `"@payload-config": ["./src/payload.config.ts"]` to `tsconfig.json` paths.

### 2.5 Environment variables

| Variable | Example | Used by | Notes |
|---|---|---|---|
| `SITE_ENV` | `production` / `staging` / `development` | all | Startup refuses unsafe settings in production (§12.2) |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | `https://muomalat.uz` | app | Canonical origin (existing) |
| `CMS_URL` | `https://cms.muomalat.uz` | app | Payload `serverURL`, CSRF and CORS |
| `SITE_HOST`, `CMS_HOST` | `muomalat.uz`, `cms.muomalat.uz` | proxy, access | `localhost:3000`, `cms.localhost:3000` in dev |
| `DATABASE_URL` | `postgres://muomalat_app:…@postgres:5432/muomalat` | app, worker | Runtime role, DML only |
| `DATABASE_URL_MIGRATE` | `postgres://muomalat_owner:…` | migrate job | Owner role, DDL; never given to app or worker |
| `PAYLOAD_SECRET` | 64+ random bytes (base64) | app, worker | Rotating it logs everyone out |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | `muomalat.cloudflareaccess.com`, `<aud tag>` | app | Access JWT check |
| `ACCESS_JWT_REQUIRED` | `true` | app | Must be `true` in production |
| `INTERNAL_APP_URL` | `http://app:3000` | worker | |
| `INTERNAL_REVALIDATE_SECRET` | 32+ random bytes | app, worker | HMAC key |
| `CF_API_TOKEN`, `CF_ZONE_ID` | token scoped to **Zone → Cache Purge** only | worker | |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL` | `@muomalatuz` (prod) / private test channel | worker | Separate bot in staging (§10.8) |
| `ALERTS_BOT_TOKEN`, `ALERTS_CHAT_ID` | private staff alerts group | worker, app | A different bot from the publishing bot |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | | app, worker | EU-region provider (open question) |
| `MEDIA_DIR` | `/data/media` | app, worker | Docker volume |
| `CMS_READ_ONLY` | `0` / `1` | app | Emergency kill switch, independent of the database (§12.10) |
| `CONTENT_SOURCE` | `payload` / `mock` | app, tests | `mock` serves today's data files |
| `NEXT_PUBLIC_DEMO_NOTICE` | unset / `off` | app | Kept as a hard override; the normal control is SiteSettings |

---

## 3. Content model

### 3.1 Conventions

- **IDs.** Payload's default serial integer IDs. The read layer exposes `id` as a string. Mock IDs (`th-05`) are kept in `legacyId` for import and redirects.
- **Slugs.** `^[a-z0-9]+(-[a-z0-9]+)*$`, unique **across all articles**.
  - Generated from the Uzbek title: lower-case it, strip ʻ and ʼ, turn other characters into hyphens.
  - Frozen at first publication. A later change is allowed only to editors and the editor-in-chief; it records the old path in `slugHistory` and creates a 301 redirect.
- **Dates.**
  - Stored as `timestamptz` (UTC).
  - The admin shows and enters Asia/Tashkent: `admin.timezones: { defaultTimezone: 'Asia/Tashkent', supportedTimezones: [{ label: 'Toshkent (UTC+05:00)', value: 'Asia/Tashkent' }] }`, and `timezone: true` on every date-time that an editor enters: `dueAt`, `scheduledAt`, `embargo.until`, `secondRead.dueAt`, `sponsored.campaignStart` / `campaignEnd`, home-page `pinned[].until` and `breaking.until`, ad-slot `startsAt` / `endsAt`, and club-event `startsAt`, `endsAt` and `registrationClosesAt`. A date field without it shows each staff browser's own zone. With one supported zone the zone picker is read-only.
  - `timezone: true` adds a hidden `<field>_tz` Postgres enum column (named oddly: `scheduledAt` → `scheduledat_tz`). Changing the zone list is a migration. A value outside the list fails only at the database, as a raw 500.
  - Payload never shows UTC. The embargo field gets a small `afterInput` or description component that prints the UTC time.
  - System dates (`publishedAt`, `createdAt`, `updatedAt`, the version list) show the browser's zone. Their list cells use a custom Cell that formats in Tashkent.
  - Payload returns dates as UTC strings ending in `Z`. The read layer formats ISO strings with `+05:00` itself, the format `scripts/validate-content.ts` already checks.
  - Hooks, the worker and the import always write ISO strings with `Z` or an explicit offset. The Postgres session time zone is pinned to UTC (§12.2), because offset-less strings are read in the session zone and the dev container runs `TZ=Asia/Tashkent`.
  - Day-only fields (`Source.date`, `Institution.statusDate`) stay `YYYY-MM-DD` strings.
- **Rich text** uses one of two Lexical configurations (§3.4). Both serialize to the existing markup: `**bold**`, `*italic*`, `[label](href)`, `[[slug|label]]`, `{en:…}`.
- **System fields** are written by hooks only. Each collection `beforeChange` hook first copies these fields from `originalDoc`, which discards anything a client sent, and then sets them itself. Field-level `access: { create: () => false, update: () => false }` is a second guard: Payload drops client values silently, and values set in a collection hook still persist (confirmed in Phase 0).
- **Drafts.** Every content collection uses `versions.drafts`. Drafts are not validated (confirmed in Phase 0; `drafts.validate` stays at its default, `false`). Payload's own checks (`required` on non-localized fields such as `slug` and `rubric`, select options, `filterOptions`) therefore run only on publish, and every publish rule in §7 must run in the publish path. Payload's `_status` means "public or not". Our `workflowStatus` means "where in the newsroom process".
- **Admin language.** Collection and field labels are Uzbek strings; descriptions say what to do in one sentence.

### 3.2 Shared field groups

| Group | Fields | Used in |
|---|---|---|
| `system` | `lastEditedBy` (rel users, set from `req.user` on every change), `legacyId` (text, hidden) | All content collections |
| `consent` | `given` (checkbox, must be true), `textVersion` (text, e.g. `club-2026-10-v1`), `locale` (uz/kr/ru/en), `at` (date) | Personal-data collections |
| `rights` | See Media (§3.12) | Media |
| `seo` [L] | `title` (text, warning above 70), `description` (textarea, warning above 160), `image` (upload) | Articles, GlossaryTerms, ClubEvents |
| `translation` [L] (localized group) | `status` (select: `missing` default, `machine_draft`, `in_edit`, `approved`, `outdated`), `assignee` (rel users; the translator who owns the work, set by an editor), `translatedBy` (rel users), `reviewedBy` (rel users), `approvedAt` (date), `contentHash` (text, hidden), `machine` (group: `used` checkbox, `engine` text) | Articles, GlossaryTerms, ClubEvents, Institutions (note), Milestones |

### 3.3 Articles (`articles`)

Admin group "Tahririyat", labels "Maqola" / "Maqolalar".

**Collection options:**

- `versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 0 }`. Keep every version: disputes and Art. 15 need the history. Autosave keeps one rolling autosave version per document.
- `lockDocuments: { duration: 600 }`.
- `trash: true`.
- `enableQueryPresets: true`.
- `admin.disableCopyToLocale: true`: the built-in Copy to locale publishes and copies translation status (see the "Tarjima" tab).
- `admin.livePreview` (§5.13).
- `defaultColumns: ['title','workflowStatus','rubric','authors','assignee','dueAt','updatedAt']`.
- Custom list cells (`admin.components.Cell`, server components registered in the import map): an embargo badge on the `embargo` group; a Cell on `title` that renders the badge before the title (a custom Cell replaces the default one, so it renders the link to the document itself); and a translation-status dots column.

**Tab "Matn" (Content)**

| Field | Type | L | Req | Validation / behaviour | Maps to `types.ts` |
|---|---|---|---|---|---|
| `title` | text | L | yes | Live counter; warning above `EditorialRules.titleWarn` (80), error above `titleMax` (140); plain text only | `title`, `translations.*.title` |
| `kicker` | text | L | — | ≤ 40 characters; shown instead of the rubric name | `kicker` |
| `lead` | textarea | L | yes | Warning above 300 characters, error above 500 | `lead` |
| `body` | richText (article editor, §3.4) | L | yes | Serialized to `ArticleBlock[]`; block rules in §7 | `body` |
| `image` | upload → `media` | — | — (warning) | Hero image; rights checks (§7) | `image` |
| `imageCaption` | text | L | — | Overrides the media caption for this story | `image.caption`, `translations.*.imageCaption` |

**Sidebar**

| Field | Type | Req | Behaviour | Maps to |
|---|---|---|---|---|
| `rubric` | relationship → `rubrics` | yes | | `rubric` (slug) |
| `slug` | text, unique, indexed | yes | Auto from title; see §3.1 | `slug` |
| `authors` | relationship → `authors`, hasMany, min 1 | yes | Sponsored ⇒ commercial authors only; editorial ⇒ no commercial author | `authors` (slugs) |
| `workflowStatus` | select (§5.1) | system | Changed only through transitions (§5.2) | — |
| `WorkflowActions` | ui (custom component) | — | Buttons for the transitions allowed to this user | — |
| `assignee` | relationship → `users` | for `idea` | The writer who owns the story in `idea` and `draft` | — |
| `deskEditor` | relationship → `users` | — | System. Set by the "Tahrirga olish" (take for editing) transition (§5.2): the editor who owns the story in `in_edit`. Cleared on `in_edit → draft`. Named `deskEditor` so it is not confused with the rich-text `editor` option | — |
| `dueAt` | date (day and time) | — | | — |
| `priority` | select: `normal`, `high`, `breaking` | — | | — |
| `urgent` | checkbox "Shoshilinch" | — | Fast path (§5.4) | — |

**Tab "Bogʻlanishlar" (Links)**

| Field | Type | Req | Behaviour | Maps to |
|---|---|---|---|---|
| `tags` | relationship → `tags`, hasMany | — (warning if none) | | `tags` |
| `terms` | relationship → `glossary-terms`, hasMany | — | On save, the hook merges in every term referenced in the body (inline links and term cards) | `terms` |
| `about` | relationship → `institutions` | — | Primary entity | new: `about` |
| `mentions` | relationship → `institutions`, hasMany | — | | new: `mentions` |
| `related` | relationship → `articles`, hasMany, max 4 | — | `filterOptions`: not self, `sponsored.enabled` ≠ true, `firstPublishedAt` exists, `withdrawal.at` does not exist. There is no `_status` filter: the admin picker queries the latest version, so a `_status` filter hides stories that have a pending draft. ART-19 checks at publish that each target is currently published (main row, `draft: false`) | `related` |
| `interviewee` | group: `name`, `role`, `organisation` (text), `portrait` (upload) | yes for rubric `intervyu` | | `interviewee` |
| `sources` | array: `title` (text, req), `publisher` (text, req), `url` (text, https only), `date` (YYYY-MM-DD), `type` (select: document, report, interview, press, data) | at least 1 | | `sources` |
| `featured` | checkbox "Bosh sahifa yetakchisiga nomzod" (lead candidate) | — | Ignored when sponsored; used only when HomePage has no lead | `featured` |

**Tab "Nashr" (Publishing)**

| Field | Type | Behaviour | Maps to |
|---|---|---|---|
| `publishedAt` | date | System: set at first publication; only the editor-in-chief may edit it (for imports and record fixes) | `publishedAt` |
| `firstPublishedAt` | date | System; never changes; used as JSON-LD `datePublished` | — |
| `significantUpdateAt` | date | System; set when a change of kind `update`, `correction`, `clarification` or `editors_note` is published | `updatedAt` |
| `scheduledAt` | date | Editor sets; see §5.11 | — |
| `embargo` | group: `until` (date), `indefinite` (checkbox), `source` (text), `note` (textarea) | §5.10 | — |
| `submittedBy`, `submittedAt` | system | Set by the transition `draft → in_edit` | — |
| `approvedBy`, `approvedAt`, `approvedContentHash` | system | §5.3 | — |
| `publishedBy`, `scheduledBy` | system | | — |
| `secondRead` | group: `required`, `dueAt`, `doneBy`, `doneAt`, `outcome` (select: ok, minor_fix, correction) | §5.4 | — |
| `changeNote` | group: `kind` (select §5.6), `reason` (textarea), `numbersOverride` (checkbox, editor-in-chief only) | Filled when publishing changes to a published story; cleared by the hook after publish; stored in the version and the audit log | — |
| `workflowHistory` | array: `from`, `to`, `by` (user id), `at`, `comment` | Read-only, append-only | — |
| `withdrawal` | group: `at`, `by`, `publicNotice` [L], `internalReason`, `hideTitle` (checkbox), `request` (rel `requests`) | §5.8 | new: `withdrawn` |

**Tab "Tuzatishlar" (Corrections)**

| Field | Type | Behaviour | Maps to |
|---|---|---|---|
| `corrections` | array, append-only (§5.7). Each item has: `kind` (select: `correction`, `clarification`, `editors_note`); `publicText` [L] (textarea; uz required; ru/en required when that translation is approved; enforced in `hooks/corrections.ts`, never with `required: true`, which Payload checks in every saving locale for every row); `location` (text, e.g. "3-xatboshi", paragraph 3); `internalReason` (textarea); `createdAt`, `createdBy`, `approvedBy`, `versionId` (system); `request` (rel `requests`); `telegramAction` (select: none, caption_edited, reply_posted; system) | Shown on the article (`CorrectionNote`), in JSON-LD `CorrectionComment`, and on the public corrections list | `corrections[]` → `{ date: createdAt, text: publicText, kind }` |

**Tab "Tijorat" (Sponsored)**

Read: editor, editor-in-chief, commercial. Write: commercial and editor-in-chief.

| Field | Type | Behaviour | Maps to |
|---|---|---|---|
| `sponsored.enabled` | checkbox | Forced to `true` when commercial creates; only the editor-in-chief can clear it, and only on a never-published item | presence of `sponsored` |
| `sponsored.partner` | text | Public partner name | `sponsored.partner` |
| `sponsored.advertiserLegalName` | text | Internal | — |
| `sponsored.category` | select: `general`, `financial_service`, `bank_deposit`, `investment_securities`, `insurance_takaful` | Drives the Art. 42–43 checks | new |
| `sponsored.licenceNumber`, `sponsored.licenceIssuer` | text | Required for every category except `general` (Art. 13, 42) | new (rendered) |
| `sponsored.riskWarning` [L] | textarea | Required for `investment_securities`, `insurance_takaful` and `financial_service` (Art. 42); rendered in the disclosure | new (rendered) |
| `sponsored.keyTerms` [L] | textarea | Required for financial categories (Art. 43); rendered | new (rendered) |
| `sponsored.disclosure` [L] | textarea | uz required | `sponsored.disclosure` |
| `sponsored.contractRef` | text | Internal; required | — |
| `sponsored.campaignStart`, `sponsored.campaignEnd` | date | | — |
| `sponsored.approvedBy`, `sponsored.approvedAt` | system | Editor-in-chief at publication | — |
| `sponsored.retainUntil` | date, system | Last publication + 3 years (Art. 15); blocks deletion | — |

**Tab "Tarjima" (Translation)**

- The `translation` [L] group (§3.2), with a custom status component showing uz / ru / en side by side.
- An "Oʻzbekchadan nusxalash" (copy from Uzbek) action for translators: a custom endpoint and document button. The built-in Copy to locale does not fit (Phase 0): it publishes at once when the latest version is published, copies the `translation` group (including an `approved` status), does not fill a body that holds an empty Lexical state, and its overwrite mode replaces every field. The action:
  - copies only `title`, `kicker`, `lead`, `body` and `imageCaption` (and media alt, if wanted) from uz into the current locale;
  - per field, fills it when empty (an empty Lexical root counts as empty), or overwrites it when the translator chooses;
  - always saves a draft (`draft: true`, `_status: 'draft'`);
  - sets `translation.status` to `in_edit` (`machine_draft` when machine translation was used) and `translatedBy` to the user;
  - never copies `translation.*`, `meta`, `sponsored.*` or `corrections[].publicText`.

**Tab "Kirill" (Cyrillic)**

| Field | Type | Behaviour |
|---|---|---|
| `kr.title`, `kr.lead`, `kr.kicker` | text / textarea (not localized) | Optional overrides for the `/kr` edition; they must be Cyrillic (ART-26) |
| `kr.checked`, `kr.checkedBy`, `kr.checkedAt` | checkbox + system | "Kirill varianti tekshirildi" ("Cyrillic version checked") |
| `KrPreview` | ui | Opens the `/kr` preview of this draft |

**Tab "SEO va ulashish" (SEO and sharing)**

| Field | Type | Behaviour |
|---|---|---|
| `meta` | `seo` group [L] | Fallbacks: title, then lead, then hero image |
| `noindex` | checkbox | Editor or editor-in-chief |
| `shortCode` | text, unique, system | 6 characters from base32 without ambiguous letters; used by `/t/<code>` |
| `slugHistory` | array: `slug`, `rubric`, `changedAt` (system) | Feeds redirects |
| `telegram` | group: `autopost` (default true), `captionOverride` (textarea), `silent` (checkbox) | §10 |
| `telegramPosts` | join → `telegram-posts.article` | Read-only list |

**Tab "Ichki" (Internal; never rendered on the site)**

| Field | Type | Read access | Behaviour |
|---|---|---|---|
| `editorNotes` | textarea | editorial roles | Notes and questions; never published |
| `sourceNotes` | textarea | authors of this story and the editor-in-chief | Help text: «Maxfiy manbalarning ismini yozmang — faqat shartli nom.» ("Do not write the names of confidential sources — only a code name.") (Art. 33) |
| `needsLegal` | select: `na`, `required`, `complete` | editorial | Anyone may set `required`; only the editor-in-chief sets `complete` |
| `legalSignOff` | group: `by`, `at`, `note` (system) | editorial | Written by the editor-in-chief's transition |
| `legallySensitive` | checkbox | editorial | Hides the draft from reporters not on the story |
| `singleAnonymousSource` | checkbox + `supervisor` (rel users) | editorial | Requires the editor-in-chief at publication (§5.5) |
| `inappropriateForSponsorship` | checkbox | editorial | The site never shows a sponsored teaser or ad slot next to this story |
| `ageMark` | select: `inherit`, `0+`, `7+`, `12+`, `16+`, `18+` | editorial | `inherit` means the SiteSettings mark |
| `legalHold` | checkbox | editorial | Editor-in-chief only; §5.8 |
| `validationWarnings` | json, system | editorial | Shown by `ChecksPanel` |
| `views` | number, read-only | editorial | Filled by the analytics job (LATER); 0 until then; maps to `views` |
| `_authorUsers` | relationship → users, hasMany, hidden, system | — | User accounts linked to `authors`; used in access checks |
| `mediaRefs` | relationship → media, hasMany, hidden, system | — | Every media item used by hero, body or SEO; powers "Used in". Must stay a top-level hasMany relationship: in 3.90.2 a join into an array of hasMany relationships returns duplicates, and a join into blocks crashes every media query |

### 3.4 Article body: Lexical configuration, blocks and serializer

**Article editor (`articleEditor`).**

- Enabled features:
  - `ParagraphFeature`
  - `HeadingFeature({ enabledHeadingSizes: ['h2','h3'] })`
  - `UnorderedListFeature`, `OrderedListFeature`
  - `BoldFeature`, `ItalicFeature`
  - `LinkFeature({ enabledCollections: ['articles','glossary-terms'] })` (external URLs must be https)
  - `FixedToolbarFeature`, `InlineToolbarFeature`
  - `BlocksFeature({ blocks: [figure, table, chart, quote, qa, factbox, callout, term], inlineBlocks: [glossaryLink, keepLatin] })`
- **Not enabled:** underline, strikethrough, sub/superscript, inline code, alignment, indent, `UploadFeature` (images go through the `figure` block so alt and credit are enforced), `RelationshipFeature`, `BlockquoteFeature` (use the `quote` block), horizontal rule, checklist, the experimental table feature, raw HTML or embed of any kind.
- **Server-side enforcement (MUST).** The editor's limits exist only in the browser. REST and the Local API accept disabled format bits, node types the editor does not register (quote, upload, horizontal rule), nested lists and `javascript:` links, and drafts skip validation. So:
  - a `body` hook (`beforeValidate`, every save, drafts included) walks the Lexical tree and rejects node types the editor does not register, because the admin editor cannot load them;
  - the same walk reports nested lists, `listType: 'check'` and links that are neither `https:` nor a site path (ART-21, ART-22: errors at publish, findings on drafts);
  - the LinkFeature `fields` override validates the `url` field with `^https://` or `^/(?!/)` (runs at publish);
  - the serializer ignores extra format bits and element `format` (alignment).
- **Pasting** (Phase 0). From Google Docs or Telegram, the admin editor keeps only bold and italic, because Payload's client `TextPlugin` removes every disabled format. Blockquotes, tables, images and horizontal rules become paragraphs or are dropped; scripts and iframes are removed. Some things get through:
  - Docs headings h1 and h4–h6 become **h3** (Payload maps a disabled heading to the last enabled size). If h1 should become h2, add a small feature with a `HeadingNode` transform (optional);
  - checklists arrive as lists with `listType: 'check'`;
  - nested lists survive;
  - text alignment is stored as the paragraph `format`;
  - links keep `http:`, `javascript:` and `#` anchors;
  - a Telegram line break becomes a `linebreak` node.

**Inline editor (`inlineEditor`)** is used inside blocks and in the glossary:

- `ParagraphFeature`, `BoldFeature`, `ItalicFeature`, `LinkFeature`
- `BlocksFeature({ inlineBlocks: [glossaryLink, keepLatin] })`

**Blocks**

| Block (`blockType`) | Fields | Req | Rules | Output `ArticleBlock` |
|---|---|---|---|---|
| `figure` | `image` (upload → media, req), `caption` (text) | image | The media item must pass rights and alt checks (ART-13/14/15) | `{ type:'figure', image: ImageRef }` (alt and credit from the media item in the body's locale; caption from the block, else the media caption) |
| `table` | `caption` (text, req), `columns` (array: `label` req, `align` left/right, `unit`), `data` (textarea: paste from Excel or CSV; tab or semicolon separated; comma is not a separator, because it is the Uzbek decimal mark), `rows` (json, hidden, parsed by hook), `note`, `source` (text, req at publish) | caption, columns, data, source | Hook parses `data` into `rows`. Uzbek number format: space as thousands separator, comma as decimal ("4,5" → 4.5). Empty cell → `null`; a cell in Uzbek number format → number; otherwise string. A text cell that looks like a number (a year, a code such as "05") becomes a number; none exist in the mock data. Each row must have as many cells as there are columns (ART-8) | `{ type:'table', caption, columns, rows, note, source }` |
| `chart` | `kind` (bar/line), `title` (req), `subtitle`, `unit` (req), `categoryLabel` (bar), `xLabel` (line), `data` (textarea), `parsed` (json, hidden), `source` (req at publish), `note` | kind, title, unit, data, source | Bar data: one line per bar, `label;value` plus an optional `;*` that highlights the bar. Line data: a header row `Davr;Series A;Series B…` (its first cell is ignored; the axis label is `xLabel`), then one row per period. Bar labels and series names cannot contain `;`. Hook parses the data and checks series lengths (ART-8, ART-10). A live preview uses the existing `BarChart` / `LineChart` | `{ type:'chart', chart: ChartSpec }` |
| `quote` | `text` (textarea, plain, req), `cite`, `role` | text | No links or formatting (Oak-style mark limits) | `{ type:'quote', text, cite, role }` |
| `qa` | `question` (textarea, req), `answer` (richText, inline editor, req) | both | Rubric `intervyu` requires at least one (ART-6) | `{ type:'qa', question, answer: RichText[] }` (one string per paragraph) |
| `factbox` | `title` (default "Raqamlarda", "In figures"), `items` (array 2–8: `label`, `value`), `note` | items | | `{ type:'factbox', … }` |
| `callout` | `title` (default "Maʼlumot uchun", "For reference"), `text` (richText, inline editor) | text | | `{ type:'callout', title, text: RichText }` (paragraphs joined with a space; more than one paragraph gives a warning) |
| `term` | `term` (relationship → glossary-terms, req) | term | Term must be published | `{ type:'term', slug }` |
| inline `glossaryLink` | `term` (rel, req), `label` (text, req) | both | | `[[slug\|label]]` |
| inline `keepLatin` | `text` (req) | text | "Lotin harflarida qoldirish" (keep in Latin script; protects the text from transliteration) | `{en:text}` |

**Serializer contract (`src/payload/lexical/serialize.ts`).** A pure function with no I/O:

```ts
serializeBody(state: SerializedEditorState, ctx: { locale, resolveDoc(rel): { path, slug, published } | undefined, mediaById: Map<id, MediaDoc>, warn(code, message) }): ArticleBlock[]
// resolveDoc returns undefined for a bare id read at depth ≥ 1: the target is not visible (unpublished or deleted)
serializeInline(nodes, ctx): RichText            // one paragraph
serializeParagraphs(state, ctx): RichText[]      // qa.answer, glossary definition…
```

| Lexical node | Output |
|---|---|
| `paragraph` | `{ type:'p', text: serializeInline(children) }`; empty paragraphs are dropped; element `format` (alignment from a paste) is ignored |
| `heading` (`h2` / `h3`) | `{ type:'h2' \| 'h3', text: plainText(children) }`; formatting is dropped with warning ART-21 |
| `list` (`bullet` / `number`) | `{ type:'list', ordered, items: listitem → serializeInline }`; nested lists and `listType: 'check'` give error ART-21 |
| `block` | Mapped by `fields.blockType` (table above) |
| `text` | Format bit 1 → `**…**`, bit 2 → `*…*`; bold + italic → bold with a warning; other bits are ignored |
| `linebreak` | A single space |
| `link` (custom URL) | `[label](url)`; `https:` or a site path only (ART-22) |
| `link` (internal doc) | `[label](/rubric/slug)` or `[label](/lugat/slug)`; a target that is not visible (`resolveDoc` returns `undefined`) is dropped, the label is kept, and ART-19 warns. Formatting inside a link is dropped |
| `inlineBlock` `glossaryLink` / `keepLatin` | `[[slug\|label]]` / `{en:text}` |

The reverse, `fromMarkup.ts` (markup string → Lexical), is used only by the importer (§11.3). Unit tests round-trip every mock article: `serialize(fromMarkup(x)) === x`.

### 3.5 Authors (`authors`)

Options: drafts on, `maxPerDoc: 100`.

| Field | Type | L | Req | Notes | Maps to |
|---|---|---|---|---|---|
| `slug` | text, unique | — | yes | Slug regex | `slug` |
| `name` | text | L | yes | ru/en only for team bylines (help text); personal names stay as written | `name`, `translations.*.name` |
| `role` | text | L | yes | | `role`, `translations.*.role` |
| `bio` | textarea | L | yes | | `bio`, `translations.*.bio` |
| `commercial` | checkbox | — | — | Commercial byline: styled as partner, never as editorial | `commercial` |
| `isTeam` | checkbox | — | — | JSON-LD `Organization` instead of `Person`; replaces the hard-coded `tahririyat` / `hamkorlik` slug checks | new |
| `email` | email | — | — | | `email` |
| `telegram` | text | — | — | `^@[A-Za-z0-9_]{5,32}$` | `telegram` |
| `portrait` | upload → media | — | — | | `portrait` |
| `user` | relationship → users, unique | — | — | Links the byline to a staff account for the two-person check; set by admin | — |
| `active` | checkbox (default true) | — | — | Inactive authors are hidden from pickers; their pages stay | — |

`isCommercialAuthor()` in `src/content/index.ts` keeps its fallback on the `hamkorlik` slug only for mock data.

### 3.6 Rubrics (`rubrics`)

| Field | Type | L | Notes |
|---|---|---|---|
| `slug` | select: `yangiliklar`, `tahlil`, `intervyu`, `izoh`, `dunyo`; unique; read-only after create | — | The `RubricSlug` union and the routes depend on it |
| `order` | number | — | Navigation and listing order |
| `name` | text | L | |
| `description` | textarea | L | One sentence |

- **Create and delete:** admin only, together with a code change (messages, routes).
- **Update:** editor-in-chief.

### 3.7 Tags (`tags`)

| Field | Type | L | Notes |
|---|---|---|---|
| `slug` | text, unique | — | Slug regex |
| `label` | text | L | ru/en optional; kr is transliterated from uz |

- **Create and publish:** editor and editor-in-chief. Reporters cannot create tags; this keeps the vocabulary controlled.
- **Delete:** editor-in-chief, only when no article references the tag (`beforeDelete` check).

### 3.8 Glossary terms (`glossary-terms`)

Options: drafts, `maxPerDoc: 0`.

| Field | Type | L | Req | Maps to |
|---|---|---|---|---|
| `slug` | text, unique | — | yes | `slug` |
| `term` | text | — | yes | `term` |
| `aliases` | group: `ru`, `en`, `ar` (Latin transliteration only), `other` (array of text) | — | — | `aliases` |
| `category` | select: shartnoma, tamoyil, institut, bozor, standart | — | yes | `category` |
| `short` | textarea | L | yes | `short` |
| `definition` | richText (inline editor, several paragraphs) | L | yes | `definition: RichText[]` |
| `origin` | richText (inline editor) | L | yes | `origin` |
| `practice` | richText (inline editor) | L | yes | `practice: RichText[]` |
| `steps` | array of text | L | — | `steps` |
| `example` | group: `title`, `text` (inline editor) | L | — | `example` |
| `related` | relationship → glossary-terms, hasMany, not self | — | — | `related` |
| `translation` | group [L] | | | gating |
| `seo` | group [L] | | | |
| `needsReview` | checkbox | — | — | Set by the importer; publication blocked until cleared by an editor |

### 3.9 Institutions (`institutions`)

Options: drafts, `maxPerDoc: 0`.

| Field | Type | L | Req | Notes | Maps to |
|---|---|---|---|---|---|
| `name` | text | — | yes | Real names allowed here (TXT-5 does not apply to this field) | `name` |
| `type` | select: bank, window, microfinance, leasing, takaful | — | yes | | `type` |
| `parent` | text | — | for `window` | | `parent` |
| `city` | text | — | yes | | `city` |
| `status` | select: granted, review, applied, announced | — | yes | | `status` |
| `statusDate` | text `YYYY-MM-DD` | — | yes | Not in the future | `statusDate` |
| `statusSource` | text (URL) | — | warning if empty when `granted` | | new |
| `licenceNumber` | text | — | — | | new |
| `statusHistory` | array: `status`, `date`, `source`, `note` (system) | — | — | When status or date changes, the hook appends the previous values | new |
| `products` | array of text | — | — | | `products` |
| `note` | textarea | L | — | | `note` |
| `article` | relationship → articles | — | — | | `articleId` |

### 3.10 Milestones (`milestones`)

| Field | Type | L | Req | Maps to |
|---|---|---|---|---|
| `date` | text, `^\d{4}-\d{2}(-\d{2})?$` | — | yes | `date` |
| `title` | text | L | yes | `title` |
| `text` | textarea | L | yes | `text` |
| `status` | select: done, upcoming | — | yes | `status` (warning if `done` is dated in the future) |
| `article` | relationship → articles | — | — | `articleId` |

### 3.11 Club events (`club-events`)

| Field | Type | L | Req | Notes | Maps to |
|---|---|---|---|---|---|
| `slug` | text, unique | — | yes | | `slug` |
| `number` | number, unique | — | yes | | `number` |
| `title`, `theme` | text | L | yes | | |
| `startsAt`, `endsAt` | date | — | yes | `endsAt` > `startsAt` | |
| `venue` | group: `name`, `address`, `city` | — | yes | | |
| `summary` | textarea | L | yes | | |
| `agenda` | array: `time` (`HH:MM`), `title` [L], `speaker` | — | — | | |
| `speakers` | array: `name`, `role`, `portrait` | — | — | | |
| `capacity` | number | — | — | | |
| `registrationOpen`, `registrationClosesAt` | checkbox, date | — | — | | new |
| `report` | richText (inline editor, several paragraphs) | L | — | For past meetings | `report` |
| `takeaways` | array of text | L | — | | |
| `image` | upload | — | — | | |
| `translation`, `seo` | groups | | | | |

`status` is no longer stored. The read layer computes it from `startsAt` against the request time, which replaces today's validator check. `CONTENT_NOW` is used only by the mock adapter.

### 3.12 Media (`media`)

Upload configuration:

```ts
upload: {
  staticDir: process.env.MEDIA_DIR,                 // /data/media volume
  mimeTypes: ['image/jpeg','image/png','image/webp','image/avif'],   // no SVG, no XML, no PDF
  pasteURL: false,                                   // closes the SSRF class (GHSA-6r7f-…, GHSA-hhfx-…)
  focalPoint: true, crop: true,
  resizeOptions: { width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'webp', options: { quality: 82 } },   // the stored original, plain uploads only (Phase 0)
  imageSizes: [   // webp = { format: 'webp', options: { quality: 82 } }; the collection formatOptions does not apply to sizes
    { name: 'thumb', width: 400, formatOptions: webp }, { name: 'card', width: 800, formatOptions: webp },
    { name: 'wide', width: 1600, formatOptions: webp }, { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: webp },
  ],
  adminThumbnail: 'thumb',
}
```

The file size limit is 15 MB, set in the Payload `upload.limits`.

**Metadata stripping (MUST, Phase 0).** `formatOptions` re-encodes and strips the original only on a plain upload. With the admin's crop tool, the stored original is a cropped JPEG named `.webp`. When crop data arrives with unchanged dimensions, Payload stores the raw upload with its EXIF, GPS, XMP and ICC data. The Edit-image drawer sends exactly that whenever an editor sets only the focal point before the first save.

A Media `hooks.beforeOperation` (create and update) therefore re-encodes `req.file.data` with `sharp(data).rotate()` (sharp drops all metadata by default) and updates `size` and `mimetype` before Payload processes the file.

- Tested in Phase 0 with a WebP quality-95 intermediate (`.spike/lexical/media-fixed.ts`): every stored file came out as WebP with no EXIF, XMP or ICC.
- A lossless intermediate avoids a second lossy encode, but on the unchanged-crop path Payload keeps the intermediate as the stored original, so it would be large. This is an inference from `cropImage.js`.
- `crop: false` alone does not fix the image sizes.
- Moving the focal point later does not re-encode the stored original.

| Field | Type | L | Req | Notes |
|---|---|---|---|---|
| `alt` | text | L | uz, unless `decorative` | Describe what matters in the image; for charts the data is in the table |
| `decorative` | checkbox | — | — | Renders `alt=""` |
| `caption` | text | L | — | Default caption |
| `credit` | text | L | uz | e.g. "Foto: Muomalat" (Photo: Muomalat), "Illyustratsiya: Muomalat" (Illustration: Muomalat) |
| `creator` | text | — | — | |
| `rightsCategory` | select: `staff`, `commissioned`, `agency`, `official_handout`, `partner_supplied`, `creative_commons`, `public_domain`, `screengrab`, `social_media`, `unknown` (default) | — | not `unknown` at publish | Grid-style categories |
| `licenceUrl` | text | — | for `creative_commons` | |
| `copyrightNotice` | text | — | — | JSON-LD `copyrightNotice` |
| `usableUntil` | date | — | — | After this date the image fails ART-14 |
| `restrictions` | textarea | — | — | |
| `evidence` | text | — | — | Link or reference to the licence or permission |
| `sponsoredOnly` | checkbox | — | — | Forced `true` for uploads by commercial; such images cannot appear in editorial stories (ART-15) |
| `usedIn` | join → `articles.mediaRefs` | — | — | "Qayerda ishlatilgan" (where used). Lists drafts as well as published stories, and says so in its label; trashed stories are left out with the join's `where: { deletedAt: { exists: false } }`. Media `delete` checks this count first: deleting a media item cascades through `articles_rels` and silently removes the references |

Files are served at `GET /api/media/file/<filename>`, which is allowed on the public host (§2.3), and optimized through `next/image` (`images.localPatterns`). Media read access is public for files, because the URLs are unguessable and published images are public anyway. Metadata reads over REST are possible only on the CMS host.

### 3.13 Users (`users`, auth collection)

| Field | Type | Notes |
|---|---|---|
| `email` | (auth) | Must match the Cloudflare Access identity |
| `name` | text, req | |
| `role` | select, req: `reporter`, `editor`, `eic`, `commercial`, `admin` | Only an admin can change it; every change is audited and alerted |
| `active` | checkbox (default true) | Disabled users cannot log in or pass any access check. **Users are never deleted**, so bylines and audit history survive |
| `author` | join → `authors.user` | |
| `preferredContentLocale` | select: uz, ru, en | |
| `declaredInterests` | array: `institution` (rel), `nature` (select: shares, employment, family, other), `since` (date), `note` | Read by the user and the editor-in-chief. Warning ART-31 fires when an author covers an institution they declared |
| `telegramUserId` | text | Optional, for direct alerts |
| `lastLoginAt`, `lastLoginCountry`, `knownCountries` (json) | system | From `cf-ipcountry`; a new country triggers an alert |
| `offboardedAt` | date | Set by the offboarding checklist |

Auth settings are in §12.2. `admin.user = 'users'`.

### 3.14 Personal-data collections

All four follow the same pattern:

- **No public create access.** Server actions validate the form, check the honeypot and call `createSubmission()` in `src/content/personal-data.ts`. That function writes with the Local API (`overrideAccess: true`, the only place it is used for writes) and returns no stored data to the client.
- **No relationship from editorial collections points into them,** so they can be moved (§13.7).
- **Common fields:**
  - `consent` group;
  - `status`;
  - `assignedTo` (rel users);
  - `internalNotes`;
  - `source` (page path and locale);
  - `retainUntil` (date, system).
- **No IP addresses are stored.**

| Collection | Fields (from today's server actions) | Status values | Read / update |
|---|---|---|---|
| `club-applications` | `name`, `company`, `sector` (CLUB_SECTORS), `size` (CLUB_SIZES), `phone`, `email`, `interests` (hasMany select, CLUB_INTERESTS), `message`, `attend` (checkbox), `event` (rel club-events) | new, contacted, accepted, declined, attended | commercial (read/update), editor-in-chief (read), admin (read/update) |
| `digest-subscribers` | `email` (unique, lower-cased), `locale`, `status` (pending, confirmed, unsubscribed), `confirmTokenHash`, `confirmedAt`, `unsubscribedAt`, `placement` | — | admin only (read/update/delete); editor-in-chief and commercial see counts through a dashboard component |
| `contact-messages` | `topic` (CONTACT_TOPICS), `name`, `email`, `url`, `message`, `article` (rel, resolved from `url` if it is a muomalat.uz link) | new, in_progress, closed | by topic: `tahririyat` and `tuzatish` → editor, editor-in-chief; `reklama` and `klub` → commercial; admin all |
| `advertising-requests` | `name`, `company`, `email`, `phone`, `format` (AD_FORMATS), `budget` (AD_BUDGETS), `message`, `contract` (checkbox: converted) | new, in_progress, won, lost | commercial, editor-in-chief (read), admin |

A contact message with topic `tuzatish` (correction) automatically creates a `requests` item of kind `error_report` (§3.15).

### 3.15 System collections

**`requests` ("Murojaatlar")**: one register for error reports, refutation, reply and removal (Media Law Art. 34; CMS-RESEARCH §2.4).

| Field | Type | Notes |
|---|---|---|
| `kind` | select: `error_report`, `refutation`, `reply`, `removal`, `other` | |
| `article` | rel articles | |
| `requesterName`, `requesterContact` | text | Personal data; deleted when `retainUntil` passes |
| `assignedTo` | rel users | Owner of the next step. Defaults to the editor-in-chief for `refutation`, `reply` and `removal`, and is empty (edit queue) for `error_report` until an editor takes it |
| `receivedAt` | date, req | |
| `channel` | select: site_form, email, phone, post, telegram, staff | |
| `summary` | textarea, req | |
| `documents` | text (references) | |
| `dueAt` | date, system | Refutation and reply: receivedAt + 1 month. Error report: + 3 days. Removal: + 14 days |
| `status` | select: new, triage, in_progress, decided, closed | |
| `decision` | select: no_change, correction, refutation_published, reply_published, anonymised, noindex, withdrawn, declined | |
| `decidedBy`, `decidedAt` | system | The editor-in-chief is required for refutation, reply and removal |
| `response` | textarea | What was sent to the requester |
| `retainUntil` | date | Decided + 3 years (proposal; ask counsel) |

Overdue items alert the editor-in-chief daily. Reporters may create `error_report` items for their own or colleagues' stories; this is how a reporter proposes a correction.

**`audit-log`**: see §9. **`publish-events`**: see §8.4. **`telegram-posts`**: see §10.2.

**`redirects`** (`@payloadcms/plugin-redirects`):

- Fields: `from` (path), `to` (document reference or path), `type` 301.
- Created automatically from `slugHistory` and by import.
- Editors can add them by hand.
- They are applied on a 404 (§8.8).

### 3.16 Globals

All globals keep versions and are audited: `versions: { drafts: true, max: 0 }` for `home-page`, `ad-slots` and `navigation`, and `versions: { max: 0 }` for the others. Globals use `max`; `maxPerDoc` is missing from the global types (Payload still enforces it) and is not used.

- **Restore bypasses our hooks.** `restoreGlobalVersion` runs no `beforeValidate` or `beforeChange` hooks and no field validation. It writes the main row directly and republishes at once (with `?draft=true` it unpublishes). The admin offers no "restore as draft" for globals. A `beforeOperation` hook on `restoreVersion`:
  - limits restore to the roles that may publish that global;
  - re-runs HOME-1, HOME-2, SP-7 and SET-1 against the version being restored.

  `afterChange` audits the restore.
- **Public reads.** An unpublished global's main row holds the draft content. The read layer treats a global whose `_status` is not `published` as absent and uses the "Empty →" defaults. Public `access.read` returns `{ _status: { equals: 'published' } }`.
- **System writes.** Worker and scheduler calls to `updateGlobal` pass a system `user` that can read articles: relationship `filterOptions` validation on globals runs as `req.user`, and without one it rejects valid articles.
- **Unpublish calls** (the ad-slots veto, custom endpoints) pass `unpublishAllLocales: true`. Without it the whole global is validated and the call can fail.

**`site-settings` ("Sayt sozlamalari", site settings)**

| Group | Fields | Write access |
|---|---|---|
| Identity | `name`, `domain`, `email`, `foundedYear` | admin |
| `legal` (Media Law Art. 27¹) | `registrationNumber`, `registrationDate`, `registrar` (issuing body), `founder`, `editorInChief` (full name with patronymic), `address`, `postalIndex` ("index" in Art. 27¹; whether it means the postal code or a subscription index is for counsel, CMS-RESEARCH §4.1), `email`, `phone` (optional), `ageMark` (select). Each is `{ value, placeholder: boolean }`, rendered through `<Placeholder>` while `placeholder` is true | editor-in-chief |
| `legal.meta` | `lastChangedAt` | System only. After any change to `legal`, alert: "Report the change to the registering body within one month (Art. 20)" |
| `demo` | `noticeEnabled` (checkbox), `noticeText` [L] | admin, editor-in-chief |
| `labels` | `sponsored` [L] (default "Reklama · Hamkorlik materiali" / "Реклама · Партнёрский материал" / "Advertisement · Partner content"), `advert` [L] (default "Reklama" / "Реклама" / "Advertisement") | editor-in-chief. Validation SP-7: uz must contain "Reklama", ru "Реклама", en "Advertisement" |
| `telegram` | `channelHandle`, `channelUrl`, `channelChatId` (system, from the bot check), `feedbackBot`, `inviteLinks` (array: `placement` select sticky / article_footer / club / digest / in_app, `url`), `postingEnabled` (kill switch), `delayMinutes` (default 3, range 2–30) | admin; `postingEnabled` also editor-in-chief |
| `policies` | `correctionsPolicyUrl`, `privacyPolicyUrl`, `personalDataOfficer` (`name`, `email`; Art. 31), `securityContact` (for `/.well-known/security.txt`) | editor-in-chief (policies), admin (security) |
| `emergency` | `enabled`, `text` [L], `link`, `level` (info / warning) | editor, editor-in-chief, admin |
| `operations` | `readOnly` (checkbox; §12.10), `officeHours` (`start`, `end`, used by alerts), `alertRecipients` | admin, editor-in-chief |

**Launch gate (SET-1).** When `demo.noticeEnabled` is switched off, every `legal.*.placeholder` must already be false. Otherwise the save is rejected. This means the site cannot leave demo mode with placeholder legal details.

`demo.noticeEnabled` replaces the `NEXT_PUBLIC_DEMO_NOTICE` check in `Header.tsx`, but the environment variable still forces the notice off when set to `off`.

**`navigation`**

| Field | Type | Notes |
|---|---|---|
| `header` | array: `kind` (rubric / page / custom), `rubric` (rel), `page` (select: lugat, xarita, klub, dayjest, about, advertise, contact), `label` [L] (optional override; default from `src/i18n/messages`), `path` (custom; must match a known route pattern), `visible` | Order = array order |
| `footer` | array of columns: `title` [L], `items` (same item shape) | |

Write: editor-in-chief, admin. Item paths are built with `href(locale, paths.x())`, never hard-coded.

**`ad-slots`**: drafts on. Commercial publishes. The editor-in-chief can unpublish a slot (veto).

| Field | Type | Notes |
|---|---|---|
| `slots` | array: `slotId` (select from `AD_SLOT_IDS` in code: `home-mid`, `home-mid-mobile`, `article-rail`, and the listing ids `<prefix>-rail`), `enabled`, `format` (leaderboard / mpu / inline; must match the slot), `creative` (upload; `sponsoredOnly`), `creativeUz` (upload; required when the creative's text is not Uzbek, Art. 6), `creativeAlt` [L], `linkUrl` (https), `advertiserName`, `category` (as for sponsored), `licenceNumber`, `riskWarning` [L] (Art. 42; rendered under the creative), `startsAt`, `endsAt`, `contractRef`, `ageMark` | The label is always "Reklama" and is not configurable per slot. Links are rendered with `rel="sponsored noopener"`. **Images only: no HTML, no scripts, no third-party tags** |

**`home-page` ("Bosh sahifa", homepage)**: drafts on. An editor or the editor-in-chief "launches" it by publishing.

| Field | Type | Notes |
|---|---|---|
| `lead` | rel articles | `filterOptions` (the picker): `firstPublishedAt` exists, not sponsored, not withdrawn; no `_status` filter (see `related`, §3.3). HOME-2 checks the current published state. Empty → newest `featured` non-sponsored story (today's `getLeadStory`) |
| `secondary` | rel articles, hasMany, max 3 | Empty → today's slot picker |
| `pinned` | array (max 3): `article`, `until` (date) | "Muhim" (important) |
| `breaking` | group: `enabled`, `text` [L], `article`, `until` | |
| `interviewFeature` | rel articles (rubric `intervyu`) | |
| `sponsoredTeaser` | rel articles (sponsored only) | Set by the editor-in-chief |
| `mostReadOverride` | rel articles, hasMany, max 5 | Until analytics exists; empty → latest non-sponsored |
| `launchedBy`, `launchedAt` | system | |

Validation HOME-1: no sponsored or withdrawn article in `lead`, `secondary`, `pinned`, `breaking` or `interviewFeature`. HOME-2: every referenced article is published. A sponsored teaser never renders next to an article flagged `inappropriateForSponsorship`.

**`editorial-rules` ("Tahririyat qoidalari", editorial rules)**: write: editor-in-chief. These lists **extend** the rules in code (`src/content/rules.ts`). They can never remove a code-level rule.

| Field | Default (seeded from `scripts/validate-content.ts`) |
|---|---|
| `bannedTerms` (array: `pattern`, `note`) | Additions only; the code list `BANNED` always applies |
| `reviewTerms` | Additions to `REVIEW` |
| `realOrgNames` | `REAL_ORGS` |
| `houseSpellings` (array: `wrong`, `right`, `note`) | e.g. `som` → `soʻm` |
| `expectedReturnPhrases` (uz/ru/en patterns) | `kafolatlangan daromad` ("guaranteed income"), `foyda kafolati` ("profit guarantee"), `yillik \d+\s?% daromad` ("N% annual income"), `гарантированн\w+ доход`, `доходность до`, `guaranteed return` |
| `officialSourceDomains` | Fast-path allow-list (§5.4), maintained by the editor-in-chief |
| `translitExceptions` (array: `latin`, `cyrillic`, `softEnd`), `translitKeep` | LATER: seeded from `STEMS`, `SOFT_END` and `KEEP` in `src/i18n/translit.ts` |
| `limits` | `titleWarn` 80, `titleMax` 140, `leadWarn` 300, `leadMax` 500, `telegramCaption` 1024 |

### 3.17 Changes to the `types.ts` contract

Every addition is optional, so the mock data and the components keep compiling.

```ts
export interface Correction {
  date: string
  text: string
  kind?: 'correction' | 'clarification' | 'editors_note'  // NEW
  id?: string                                            // NEW
}
export interface Sponsorship {
  partner: string
  disclosure: string
  category?: 'general' | 'financial_service' | 'bank_deposit' | 'investment_securities' | 'insurance_takaful' // NEW
  licenceNumber?: string; riskWarning?: string; keyTerms?: string                                           // NEW (rendered by SponsorDisclosure)
}
export interface Article {
  // …existing fields…
  firstPublishedAt?: string                       // NEW: JSON-LD datePublished
  withdrawn?: { at: string; notice: string; hideTitle?: boolean }  // NEW
  noindex?: boolean                               // NEW
  ageMark?: '0+' | '7+' | '12+' | '16+' | '18+'   // NEW
  about?: string; mentions?: string[]             // NEW: institution ids
  inappropriateForSponsorship?: boolean           // NEW
  shortCode?: string                              // NEW
}
export interface Author { /* … */ isTeam?: boolean }   // NEW
export interface Institution { /* … */ statusSource?: string; licenceNumber?: string; statusHistory?: { status: LicenceStatus; date: string; source?: string }[] } // NEW
export interface ImageRef {
  // …existing fields…
  creator?: string; copyrightNotice?: string; licenseUrl?: string   // NEW: JSON-LD image licence fields (§8.7), from Media
  decorative?: boolean                                               // NEW: renders alt="" (§3.12)
}
export interface ClubEvent { /* … */ registrationOpen?: boolean; registrationClosesAt?: string } // NEW (§3.11)
```

Added during verification: without the `ImageRef` and `ClubEvent` fields, §3.11, §3.12 and §8.7 have nowhere to put their data in the view.

`ClubEvent.status` stays in the type but is computed. `Article.views` stays and becomes read-only in the CMS.

---

## 4. Roles and permissions

### 4.1 Roles

| Code | Uzbek label | Purpose |
|---|---|---|
| `reporter` | Muxbir | Writes; never publishes |
| `editor` | Muharrir | Edits and publishes other people's work |
| `eic` | Bosh muharrir | Editor-in-chief: final responsibility, legal sign-off, sponsored approval, withdrawals |
| `commercial` | Tijorat boʻlimi | Sponsored items, ad slots, enquiries, club applications; never publishes editorial content |
| `admin` | Administrator | Users and technical settings; **no editorial writing or publishing** (separation of duties) |

Each person has exactly one account and one role. If the founder is also the editor-in-chief, they get two accounts: `eic` for daily work and `admin` for user management, the admin one used rarely. There are no shared accounts, and test accounts have no publishing roles in production.

### 4.2 Permission matrix

Legend:

- ✓ allowed;
- **own** = the user is an author (through `_authorUsers`) or the assignee;
- **¬author** = only if the user is not an author and not the submitter;
- R = read published only;
- — = denied.

**Articles**

| Action | Reporter | Editor | Editor-in-chief | Commercial | Admin |
|---|---|---|---|---|---|
| Create | ✓ editorial | ✓ | ✓ | ✓ sponsored only (forced) | — |
| Read published | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read drafts | own; others unless embargoed or `legallySensitive` | all | all | own sponsored | — |
| Update draft (`idea`, `draft`) | own | ✓ editorial | ✓ | own sponsored | — |
| Update in `in_edit` / `ready` | — (read-only) | ✓ editorial | ✓ | sponsored in `in_edit` | — |
| Update a sponsored article (any state) | — | — (read only; SP-11) | ✓ | before approval only | — |
| Edit the ru/en fields of a story (translator) | if `translation.<locale>.assignee` is self; that locale's fields only | ✓ | ✓ | sponsored only | — |
| Transition `draft → in_edit` (submit) | own | ✓ | ✓ | sponsored → editor-in-chief queue | — |
| Approve (`in_edit → ready`) | — | ¬author | ¬author | — | — |
| First publish | — | ¬author, approved, not in an editor-in-chief tier (§5.5) | ¬author, approved; required for §5.5 tiers and all sponsored | — | — |
| Urgent fast path (§5.4) | — | ✓ (may be author) | ✓ | — | — |
| Schedule / unschedule | — | ✓ | ✓ | — | — |
| Publish change: `minor` | — | ✓ (may be author; not sponsored) | ✓ | sponsored: draft only | — |
| Publish change: `update` | — | ¬author, or author with second read | ✓ | — | — |
| Publish change: `correction` | propose (`requests`) | ¬author | ✓ | — | — |
| Publish change: `clarification`, `editors_note` | — | — | ✓ | — | — |
| Withdraw / restore | — | — | ✓ | — | — |
| Unpublish (accidental, ≤ 15 min after first publish) | — | — | ✓ | — | — |
| Legal sign-off, `needsLegal = complete`, legal hold | — | — | ✓ | — | — |
| Sponsored fields: write | — | — (read) | ✓ | ✓ | — |
| `sourceNotes`: read | if author | if author | ✓ | — | — |
| Read versions | own | ✓ | ✓ | own sponsored | — |
| Restore a version as a draft (on a story that has been published, a restore without `draft: true` is rejected for every role, §5.12) | — | ✓ | ✓ | — | — |
| Move to trash (never-published only) | own `idea` / `draft` | ✓ | ✓ | own sponsored draft | — |
| Delete permanently from trash | — | — | never-published, not retained, not on legal hold | — | — |

Corrected during verification: an earlier draft gave permanent deletion to admin, but admin cannot read drafts (A6), so it could not see the Trash view. Deleting editorial content is an editorial decision, so it goes to the editor-in-chief.

Implementation notes:

- Trash and permanent deletion share `access.delete`. A trash call passes `data.deletedAt`; a permanent delete passes no `data` ([Payload trash](https://payloadcms.com/docs/trash/overview)).
- The translator row is enforced in `hooks/translation.ts`. The hook rejects any change to `uz` values or non-localized fields from a reporter saving in `ru` or `en`.

**Other collections**

| Collection | Reporter | Editor | Editor-in-chief | Commercial | Admin |
|---|---|---|---|---|---|
| `authors` | R; update own profile (draft) | create, update, publish | + delete unused | update commercial byline (draft) | set `user` link |
| `rubrics` | R | R | update | R | create/delete (with code change) |
| `tags` | R | create, update, publish | + delete unused | R | R |
| `glossary-terms` | create, update drafts | + publish | + publish, delete | R | R |
| `institutions`, `milestones` | drafts | publish | publish | R | R |
| `club-events` | R | create, update, publish | same | create, update drafts | R |
| `media` | upload; edit metadata of own uploads | edit any | edit any; delete unused | upload (`sponsoredOnly`) | R |
| `users` | read self | read self; names and roles of others | read all, including declared interests (for conflict checks) | read self | create, update, change role, disable (never delete) |
| `club-applications` | — | — | read | read, update | read, update |
| `digest-subscribers` | — | — | counts | counts | read, update, delete |
| `contact-messages` | — | topics `tahririyat`, `tuzatish` | all | topics `reklama`, `klub` | all |
| `advertising-requests` | — | — | read | read, update | read |
| `requests` | create `error_report` | read, update; decide `error_report` | all; decides refutation, reply, removal | — | read |
| `audit-log` | — | — | read | — | read |
| `publish-events` | — | read | read | — | read |
| `telegram-posts` | R | create, approve (¬author), cancel | + retract | R sponsored; propose | R |
| `redirects` | — | create, update | same | — | R |
| `payload-query-presets` | own | own + share | own + share | own | own |

**Globals**

| Global | Reporter | Editor | Editor-in-chief | Commercial | Admin |
|---|---|---|---|---|---|
| `site-settings` | R (public fields) | `emergency` | `legal`, `labels`, `policies`, `demo`, `emergency`, `operations`, `telegram.postingEnabled` | R | identity, `telegram`, `operations`, `policies.securityContact`, `demo`, `emergency` (as §3.16) |
| `navigation` | R | R | update | R | update |
| `ad-slots` | — | R | R; unpublish (veto) | update, publish | R |
| `home-page` | R | update, publish | update, publish | R | R |
| `editorial-rules` | R | R | update | R | R |

### 4.3 How access is implemented

Every access function goes through one helper module, `src/payload/access/roles.ts`:

```ts
export const userRole = (req: PayloadRequest) => (req.user?.active ? req.user.role : undefined)

/** Trusted in-process callers (worker, scripts) set this. HTTP requests cannot set req.context (Phase 0).
 *  Set it only on Local API calls made without an HTTP `req`: context merges into req.context and stays there. */
const isTrustedInternal = (req) => req.context?.trustedInternal === true

/** Wraps every access fn: logged-in requests must carry a valid Cloudflare Access JWT for the same email. */
export const withEdge = (fn: Access): Access => async (args) => {
  const { req } = args
  if (req.user && !isTrustedInternal(req)) await assertEdgeIdentity(req) // throws Forbidden (§12.2)
  if (readOnlyMode(req) && isWriteOperation(args)) return false            // §12.10
  return fn(args)
}

export const articlesRead: Access = withEdge(({ req }) => {
  if (!req.user) return req.payloadAPI === 'local' ? { _status: { equals: 'published' } } : false
  const now = new Date().toISOString()
  const notEmbargoed = { or: [{ 'embargo.until': { exists: false } }, { 'embargo.until': { less_than: now } }] }
  switch (userRole(req)) {
    case 'editor': case 'eic': return true
    case 'reporter': return { or: [
      { _status: { equals: 'published' } },
      { _authorUsers: { contains: req.user.id } },
      { assignee: { equals: req.user.id } },
      { and: [notEmbargoed, { 'embargo.indefinite': { not_equals: true } }, { legallySensitive: { not_equals: true } }] },
    ] }
    case 'commercial': return { or: [{ _status: { equals: 'published' } }, { 'sponsored.enabled': { equals: true } }] }
    case 'admin': return { _status: { equals: 'published' } }
    default: return false
  }
})
```

Rules:

- **Anonymous REST and GraphQL reads are denied on every collection except `media`.** Media `read` is public so that `GET /api/media/file/*` works (§3.12). Its metadata routes are blocked at the edge on the public host (§2.3). The public site reads only through the server-side Local API, with **`overrideAccess: false` passed explicitly** and no user. It therefore gets published documents only. Internal fields carry a field-level `read` that requires `req.user`.
- **Every Local API call passes `overrideAccess` explicitly**, which prepares for the Payload 4 default flip. A lint rule (a custom ESLint `no-restricted-syntax` rule, or a grep in CI) fails the build when a `payload.find`, `create`, `update` or `delete` call has no `overrideAccess` key.
- **The publish permission has three locks** (Phase 0). The `{ _status: { equals: 'draft' } }` pattern is not used. Payload checks such a Where against the main row in the admin and against the latest version on save. In the spike it showed Publish on new drafts, let a reporter publish over REST, and made published stories read-only for reporters.
  1. **Access.** Articles `update` access returns a boolean. For roles that cannot publish (reporter, commercial) it is `false` when `data?._status === 'published'`; otherwise their normal role check applies. `create` access does the same. This hides Publish, Unpublish and "Publish in <locale>" from those roles, and Save draft and autosave keep working on published stories.
  2. **Operation guard.** An articles `beforeOperation` hook (`hooks/workflow.ts`) throws `APIError(403)` for those roles on every call that writes the main row:
     - `create` with `data._status === 'published'`;
     - `update` without `draft: true`, or with `data._status === 'published'`;
     - `restoreVersion` without `draft: true`.

     Access alone leaves four reporter calls open, and each one publishes or unpublishes:
     - the admin's Unpublish (`PATCH ?unpublishAllLocales=true {_status:'draft'}`);
     - a plain `PATCH {_status:'draft'}`;
     - a PATCH with neither `draft` nor `_status` (Payload copies the latest draft into the main row as `draft`);
     - a `POST` with `_status: 'published'`.

     The same hook stores `req.context.draftArg = Boolean(args.draft)` for `update` and `restoreVersion`, because `beforeChange` does not receive the draft argument, and `req.query.draft` exists only on built-in REST routes.
  3. **Two-person rule.** `hooks/twoPerson.ts` throws on any disallowed publish by an editor or the editor-in-chief (§5.3), whatever the UI did.
- **No workflow, ownership or embargo rules as update-access Where clauses** on collections with drafts (`workflowStatus`, `assignee`, `_authorUsers`, `embargo`). They are checked against the main row in the admin, and against the latest version on save, falling back to the main row. In Phase 0 a stale main row let a reporter save and reverted an editor's draft. These rules run in `beforeChange`, against `payload.findByID({ draft: true })`. An async access function that loads the draft and returns a boolean would also make the admin show the form read-only (not tested).
- **Read access has the same split.** A Where in `articlesRead` is checked against the main row by the admin's permission check, and against versions in `draft: true` queries. Test the embargo, `legallySensitive` and `_authorUsers` rules with `draft: true` reads (test A4).
- **Writes built from a document read back** (transition endpoint, scheduler, import, copy actions) set `_status` explicitly. `payload.update({ draft: true, data })` publishes whenever `data._status === 'published'`.
- **Nested Local API calls never pass `req` together with a different `locale`.** Open bug payloadcms#18246: the nested call overwrites `req.locale`, and the outer save writes ru text into uz (with `locale: 'all'` it loses the text). Pass `isolateObjectProperty(req, ['locale', 'fallbackLocale'])` (exported by `payload`), or read from `originalDoc` or `docWithLocales`. A CI grep flags `locale:` next to `req` in Local API calls inside hooks, validators and `filterOptions`.
- **`req.payloadAPI` is not a trust signal.** Admin server components and server functions run as `'local'` with the logged-in user, and Local API calls made inside an endpoint with its `req` run as `'REST'`. `articlesRead` may use it only in the anonymous branch, where it grants published documents and nothing more.
- **Field-level access returns booleans only, and a denied write is silently dropped** ([Payload docs](https://payloadcms.com/docs/access-control/fields)). Rules that must fail loudly (workflow, sponsored, corrections) therefore live in hooks that throw `APIError` or `ValidationError`.
- **Users collection:**
  - `access.unlock = isAdmin`, which overrides the unsafe default (CVE-2026-11779);
  - `access.admin` = active and in a staff role and edge OK;
  - `create` = admin;
  - `update` = self (`name`, `password`, `preferredContentLocale`, `declaredInterests`) or admin;
  - `delete` = `() => false`.
  - The `role` and `active` fields have field-level update rules limited to admin, plus a hook that throws, so the rule fails loudly.

### 4.4 Account lifecycle

1. **Joiner.**
   - An admin creates the Payload user with a role.
   - The person enrols two security keys, in front of an admin, **before** being added to the Cloudflare Access policy group:
     - on their Google Workspace account, which enforces "security key only" (§12.9);
     - and, if Independent MFA is on (§12.3), at `/AddMfaDevice`. Access trusts the first enrolment without a second factor, which is why an admin watches it. An admin then checks Zero Trust → Users → MFA devices.
   - They get Telegram admin rights only if needed (§10.5, §12.9).
   - Audit event and alert.
2. **Role change.** Admin only. It is alerted to the editor-in-chief and the founder.
3. **Leaver checklist** (a SiteSettings checklist page, LATER; a runbook in Phase 1):
   - set `active = false` and `offboardedAt`;
   - remove them from the Access group;
   - revoke their Access sessions (Users → Revoke). Removing them from the group alone leaves their session working until it expires (§12.10);
   - remove their Telegram channel admin rights;
   - rotate any shared secret they could have seen;
   - remove their SSH key;
   - reassign their drafts.

   Accounts are never deleted.

---

## 5. Editorial workflow

### 5.1 States (`workflowStatus`)

| State | Label | Payload `_status` | Who can edit content | Owner: who must act next |
|---|---|---|---|---|
| `idea` | Gʻoya | draft | Authors, assignee, editors | `assignee` (by `dueAt`) |
| `draft` | Qoralama | draft | Authors, assignee, editors | `assignee`, else the authors |
| `in_edit` | Tahrirda | draft | Editors, editor-in-chief | `deskEditor` once an editor takes it; until then the edit queue ("Tahrir navbati"), which the duty editor watches |
| `ready` | Tayyor | draft | Editors, editor-in-chief (an edit by anyone other than the approver voids the approval) | `approvedBy`, who publishes or schedules; any ¬author editor may also publish |
| `scheduled` | Rejalashtirilgan | draft | As `ready` | `scheduledBy` (the worker publishes as them; a failure alerts editors and the editor-in-chief, §5.11) |
| `published` | Chop etilgan | published | Editors and editor-in-chief (changes are drafts until published, §5.6) | Second read: any ¬author editor (§5.4). Translations: `translation.<locale>.assignee` |
| `hold` | Toʻxtatilgan | draft | Editors | The editor who set it, as recorded in `workflowHistory` |
| `withdrawn` | Olib tashlangan | published (the URL renders a notice) | Editor-in-chief only | Editor-in-chief |

For sponsored articles, "editors" in this table means the editor-in-chief only. Commercial edits sponsored items in `idea`, `draft` and `in_edit` (§4.2, SP-11).

A published story cannot be put on hold. Use withdrawal (§5.8) or legal hold instead. (An earlier draft allowed `hold` after publication, but no transition led to it.)

### 5.2 Transitions

Transitions are performed through the custom endpoint `POST /api/articles/:id/transition` with body `{ to, comment?, scheduledAt? }`. The `WorkflowActions` component calls it.

The endpoint loads the document and checks the table below. It then calls `payload.update({ collection:'articles', id, data, req, overrideAccess: false, context: { transition } })`. Hooks run as usual. A direct PATCH that changes `workflowStatus` without `context.transition` is rejected.

Confirmed in Phase 0. The endpoint gets the same cookie auth and CSRF check as built-in routes. `context` reaches `beforeOperation`, `beforeChange` and `afterChange`, and HTTP requests cannot set `context`. The endpoint must:

- return 401 when `req.user` is null, and check the role itself. A cookie request from a foreign origin is not rejected: Payload ignores the cookie and the request runs as anonymous, and custom endpoints get no automatic access control;
- parse the body with `await addDataAndFileToRequest(req)`; custom endpoints do not get `req.data`;
- pass `draft` explicitly on every call, with `draft: true` for every transition that does not publish. With `draft: false` and no `_status`, Payload writes the latest draft into the main row as `draft`, which unpublishes a live story;
- wrap the update and its audit insert in `initTransaction(req)`, then `commitTransaction(req)` or `killTransaction(req)`. Otherwise `payload.update` commits on its own;
- not let hooks rely on `req.query`: they see the endpoint's own query string, with `draft` as the string `'true'`.

`payload.update({ req, context })` merges `context` into `req.context`, and the keys stay on `req` for later calls in the same request.

| From → to | Who | Guards | Side effects |
|---|---|---|---|
| (new) → `idea` | Reporter, editor, editor-in-chief | Title | — |
| `idea` → `draft` | Assignee, author, editor | Assignee set | — |
| `draft` → `in_edit` ("Tahrirga yuborish", submit for edit) | Author, assignee, editor; commercial for sponsored | Title, lead, rubric, at least 1 author and at least 1 source present (validation run in "submit" mode, so errors are listed) | `submittedBy`, `submittedAt`; notification to the editors (§10.9 alerts group); the author leaves the document |
| `in_edit` → `in_edit` ("Tahrirga olish", take for editing) | Editor or editor-in-chief who is ¬author | `deskEditor` empty, or the caller is the editor-in-chief | `deskEditor = actor`; shown in the edit queue |
| `in_edit` → `draft` ("Qayta ishlashga", back for rework) | Editor, editor-in-chief | **Comment required** | Notification to the author; `deskEditor` cleared |
| `in_edit` → `ready` ("Tasdiqlash", approve) | Editor or editor-in-chief who is ¬author | Publish-mode validation has **no errors**; `needsLegal ≠ required`; the §5.5 tier needs the editor-in-chief | `approvedBy`, `approvedAt`, `approvedContentHash` |
| `ready` → `scheduled` | Editor, editor-in-chief | `scheduledAt` ≥ now + 1 min, and ≥ `embargo.until` | `scheduledBy` |
| `scheduled` → `ready` (unschedule) | Editor, editor-in-chief | — | — |
| `ready` → `published` ("Chop etish", publish; or the Payload Publish button) | §5.3 | §5.3 | §5.3 |
| `scheduled` → `published` | Worker, acting as `scheduledBy` | §5.3, re-checked | §5.3 |
| `draft` → `published` (urgent) | Editor, editor-in-chief | §5.4 | `secondRead.required` |
| any pre-publication state → `hold` | Editor, editor-in-chief | Comment | — |
| `hold` → `draft` | Editor, editor-in-chief | — | — |
| `published` → `withdrawn` | Editor-in-chief | `withdrawal.publicNotice` (uz; ru/en if those translations are approved) and `internalReason` | §5.8 |
| `withdrawn` → `published` (restore) | Editor-in-chief | Comment | Correction or editor's note recommended |
| `published` → `draft` (accidental unpublish) | Editor-in-chief | ≤ 15 min since `firstPublishedAt`; reason | Telegram retraction if a post was sent; alert |

**Automatic transitions (hooks):**

- When content changes in `ready` or `scheduled`, `approvedContentHash` no longer matches. The story goes back to `in_edit`, the approval is cleared, and the approver is notified: "Tasdiq bekor qilindi: tasdiqdan keyin oʻzgartirildi" ("Approval cancelled: changed after approval").
  - Exception: if the person editing **is** the approver, the hash is refreshed instead.
- When Payload's own Publish button succeeds (§5.3 passes), `workflowStatus` becomes `published`.
- Every transition appends to `workflowHistory` and writes an audit event.

### 5.3 The two-person rule

This runs in `hooks/twoPerson.ts` as an articles `beforeChange` hook on every write that publishes: `data._status === 'published'`, except a version restored as a draft (`context.isRestoringVersion && context.draftArg`). On a restore, Payload sets `data._status` to the restored version's status even when it saves a draft. A call with `?draft=true` and `_status: 'published'` still publishes. `originalDoc` is the latest version, not the live row: the workflow checks below read it, but whether the story is live comes from `firstPublishedAt`.

```ts
const actor = req.user                                     // the scheduler passes the scheduling user
const role = userRole(req)
if (!['editor','eic'].includes(role)) throw forbidden('Faqat muharrir chop eta oladi')   // "only an editor can publish"
const authors = await authorUserIds(data.authors)          // via authors.user
const first = !originalDoc?.firstPublishedAt

if (first) {
  if (context.urgent) return checkUrgent(...)              // §5.4
  if (!['ready','scheduled'].includes(originalDoc.workflowStatus)) throw error('Avval tasdiqlang')  // "approve first"
  const hash = await editorialHash(id, data, req)          // §5.3.1
  const approver = originalDoc.approvedBy
  if (!approver) throw error('Tasdiq yoʻq')                // "no approval"
  if (authors.includes(approver) || approver === originalDoc.submittedBy) throw error('Tasdiqlovchi muallif boʻlmasligi kerak')  // "the approver must not be an author"
  if (authors.includes(actor.id) || actor.id === originalDoc.submittedBy) throw error('Oʻz maqolangizni chop eta olmaysiz')     // "you cannot publish your own story"
  if (hash !== originalDoc.approvedContentHash) throw error('Tasdiqdan keyin oʻzgartirilgan')    // "changed after approval"
  if (requiresEic(data) && role !== 'eic') throw error('Bosh muharrir tasdigʻi kerak')             // "the editor-in-chief must approve" (§5.5)
  if (embargoActive(data)) throw error('Embargo amalda')    // "embargo in force" (§5.10)
  await runPublishValidation(data, req)                     // §7, errors only
  set(data, { firstPublishedAt: now, publishedAt: now, publishedBy: actor.id, workflowStatus: 'published' })
} else {
  await applyChangeKind(...)                                // §5.6
}
```

**5.3.1 Editorial hash.** SHA-256 of canonical JSON (keys sorted) of:

- the **uz** values of `title`, `kicker`, `lead`, `imageCaption`, and `body` serialized to `ArticleBlock[]`;
- the non-localized `rubric`, `authors`, `image`, `sources`, `interviewee`, `about`, `mentions` and `sponsored.*`.

During a save in another locale, `data` holds only that locale's values. The hook therefore loads the document with `locale: 'all', draft: true`, through an isolated request (`isolateObjectProperty(req, ['locale', 'fallbackLocale'])`, bug payloadcms#18246, §4.3), and merges `data` into it before hashing. Translations have their own hash (§6.3).

### 5.4 Urgent fast path ("Shoshilinch")

Allowed only if **all** of these hold:

- `urgent = true`;
- rubric `yangiliklar`;
- the actor is an editor or the editor-in-chief (an author is allowed);
- not sponsored;
- `needsLegal = na`;
- not `singleAnonymousSource`;
- no embargo;
- body ≤ 400 words;
- at least one source with type `press`, `document` or `data` and a URL whose host is in `EditorialRules.officialSourceDomains`.

Effects:

- Publication proceeds, with `approvedBy` = actor and `context.urgent` recorded.
- `secondRead = { required: true, dueAt: now + 30 min }`.
- An alert goes to the editors' group: "Ikkinchi oʻqish kerak" ("second read needed").
- At 30 minutes the alert escalates to the editor-in-chief. Overdue second reads show on a dashboard widget (`beforeDashboard` component).
- The second reader must be ¬author. They mark `doneBy`, `doneAt` and `outcome`; any fix goes through §5.6.

### 5.5 Stories that need the editor-in-chief

`requiresEic(data)` is true when any of these hold:

- `needsLegal ≠ na` (it must also be `complete`, signed off by the editor-in-chief);
- `singleAnonymousSource`, with the supervisor recorded;
- `sponsored.enabled`;
- `legallySensitive`;
- `about` or `mentions` includes an institution in a declared interest of an author (ART-31 escalates).

For these stories, publication is done by the editor-in-chief (¬author). If the editor-in-chief is the author, another editor publishes it, and the editor-in-chief's own sign-off is recorded as `legalSignOff`.

### 5.6 Changes after publication (`changeNote.kind`)

Saving a draft of a published story is free. **Publishing** that draft requires `changeNote.kind`:

| Kind | Who publishes | Required | Effects |
|---|---|---|---|
| `minor` | Editor, editor-in-chief (an author is allowed; for sponsored items, the editor-in-chief only) | `reason` | No public trace; recorded in the version and audit; translations unchanged |
| `update` | ¬author editor, editor-in-chief, or an author-editor (who triggers a second read as in §5.4) | `reason` | `significantUpdateAt = now`; ru and en translations → `outdated` (still shown, with "Asl matn yangilangan…", "the original was updated…", §6.3) |
| `correction` | ¬author editor, editor-in-chief | A new `corrections[]` item of kind `correction` added in this save | `significantUpdateAt = now`; translations → `outdated` and **hidden** until fixed; Telegram correction (§10.4) |
| `clarification` | Editor-in-chief | New item of kind `clarification` | as `correction` |
| `editors_note` | Editor-in-chief | New item of kind `editors_note` | as `correction` |

Automatic checks:

- **N-1 (numbers).** Extract the digit sequences (`\d+([.,]\d+)?`) from the uz title, lead and body of the previous **published** version and of the new one, and compare them as multisets. If they differ and `kind = minor`, the save is rejected with "Raqam oʻzgardi — bu tuzatish" ("A number changed — this is a correction"). The editor-in-chief may set `numbersOverride` with a reason, for example when only a typo inside a URL changed. This is Reuters' rule that "errors involving numbers almost always merit corrections".
- **N-2 (headline).** If the uz title changed more than 2 hours after first publication, `kind` cannot be `minor` and the actor must be ¬author.
- **N-3 (entities).** If `about` or `mentions` changed, `kind` cannot be `minor`: a wrong entity tag is a correction.

After a successful publish, the hook copies `changeNote` into the audit event and clears it.

### 5.7 Corrections log

The corrections log lives in `hooks/corrections.ts`.

- **Append-only.**
  - Every `id` present in `originalDoc.corrections` must still be present.
  - The `kind`, `location` and uz `publicText` of an existing item are immutable, except to the editor-in-chief within 30 minutes of its creation (a typo in the note itself). That edit is audited with before and after values.
  - Order is preserved.
  - New items get `createdAt = now`, `createdBy = actor`, and `approvedBy = actor`, who must be ¬author.
  - `versionId` is filled in `afterChange`.
- **Public text style** (help text):
  - say exactly what was wrong and what is right, Reuters' "trashline", e.g. «Tuzatildi: 3-xatboshida 4,5 mlrd emas, 5,4 mlrd soʻm» ("Corrected: paragraph 3 now reads 5.4 bn soʻm, not 4.5 bn");
  - do not repeat a defamatory error verbatim.
- **Rendering.**
  - `CorrectionNote` at the end of the article (the existing component).
  - `editors_note` and any correction of a serious error are also shown at the top (`kind` decides the placement).
  - JSON-LD `correction: CorrectionComment[]` (the existing code).
  - `dateModified` = the latest of `significantUpdateAt` and the newest correction (existing logic, now through `updatedAt` mapping).
- **Public list.** The corrections page `/biz-haqimizda#tuzatishlar` lists the latest 50 corrections across the site. It is cached with the tag `corrections`.
- **Linked requests.** A correction created from a `requests` item links back to it and sets the request's `decision = correction`.

### 5.8 Withdrawal, unpublishing, legal hold, trash

- **Withdraw** (editor-in-chief):
  - `_status` stays `published`; `workflowStatus = withdrawn`; `noindex = true`.
  - The article page renders the title (unless `hideTitle`), the date and `withdrawal.publicNotice`. There is no body, image or Telegram button.
  - It is removed from every list, the search, RSS, the sitemaps and related links.
  - The HTTP status is 200 with `robots: noindex` (App Router pages cannot return 410; **VERIFY** whether a 410 through `proxy.ts` is worth it).
  - The Telegram retraction flow runs (§10.4).
- **Unpublish:**
  - The Payload Unpublish action is rejected by the hook unless it is the accidental-unpublish transition (§5.2).
  - Error text: «Chop etilgan maqola oʻchirilmaydi — "Olib tashlash"dan foydalaning» ("A published story is not deleted — use Withdraw").
  - **Detection** (Phase 0). `beforeChange` gets no draft argument, and its `originalDoc` is the latest version, not the live row. The articles `beforeOperation` hook stores `Boolean(args.draft)` in `req.context.draftArg` (§4.3).
    - An unpublish is `data._status === 'draft'` with no draft argument, on a story that is live. Read "live" from `firstPublishedAt` or `findByID({ draft: false })._status`, never from `originalDoc._status`.
    - The admin's Unpublish sends `?unpublishAllLocales=true`. Three other calls unpublish the same way and must be caught by the same rule: a plain `PATCH {_status:'draft'}`, `?draft=false`, and a PATCH with neither `draft` nor `_status` on a story whose latest version is a draft.
- **Legal hold** (editor-in-chief): while it is set, the article is protected from:
  - trash and delete;
  - edits by anyone else;
  - version pruning (not applicable with `maxPerDoc: 0`, but guards a future change);
  - `withdrawal.hideTitle`.

  Withdrawal itself is still possible.
- **Trash:** only for never-published documents (`firstPublishedAt` empty). Permanent deletion from trash is for the editor-in-chief only, because admin cannot read drafts (§4.2). It is refused when `sponsored.retainUntil` is in the future or `legalHold` is set (`beforeDelete`).

### 5.9 Sponsored-content guard

The guard lives in `hooks/sponsored.ts` and runs for `create` and `update`.

| ID | Rule | Level |
|---|---|---|
| SP-1 | Commercial creates ⇒ `sponsored.enabled = true` and `authors = [commercial byline]` (forced) | system |
| SP-2 | `sponsored.enabled` ⇒ every author has `commercial = true`; editorial ⇒ no author has `commercial = true` | error |
| SP-3 | `sponsored.enabled` ⇒ `partner`, uz `disclosure` and `contractRef` are present; ru/en `disclosure` is present for each approved translation | error at publish |
| SP-4 | Financial category ⇒ `licenceNumber`, uz `riskWarning` (except `bank_deposit`) and uz `keyTerms` are present | error at publish |
| SP-5 | No `expectedReturnPhrases` match in the title, lead, body or Telegram caption (all locales) | error at publish (editor-in-chief override with reason) |
| SP-6 | Only the editor-in-chief publishes (§5.5); `sponsored.approvedBy` and `approvedAt` are set | error |
| SP-7 | `site-settings.labels.sponsored` contains "Reklama" / "Реклама" / "Advertisement" | error on settings save |
| SP-8 | Sponsored articles are never: the HomePage lead, secondary or pinned items, breaking item or interview feature (HOME-1); `featured` is ignored; excluded from `getMostRead`, `getRelated`, the news sitemap and the "latest" wire on the homepage (today's `slotPicker` already excludes them) | system |
| SP-9 | `sponsored.enabled` cannot be cleared after first publication; the hard delete is blocked until `retainUntil` | error |
| SP-10 | A sponsored body cannot contain a `glossaryLink` whose label includes a review term (TXT-4) | warning |
| SP-11 | A user with role `editor` cannot update a sponsored article. Only commercial (in `idea`, `draft` and `in_edit`) and the editor-in-chief can. This follows the separation rule in CMS-RESEARCH §2.6 ("Only the commercial role creates or edits partner items") and Bloomberg's rule that journalists do not edit sponsored work | error |

Rendering changes:

- The `SponsoredLabel` text comes from `site-settings.labels.sponsored`.
- `SponsorDisclosure` also renders `riskWarning`, `keyTerms` and the licence number.
- RSS items are prefixed with the same label.
- Telegram posts use the sponsored template (§10.4).

### 5.10 Embargo

The embargo lives in `hooks/embargo.ts`.

- **Field rules:**
  - `until` and `indefinite` are mutually exclusive;
  - `until` must be in the future when set;
  - an embargo cannot be set on a published article;
  - `source` is required when an embargo is set;
  - a time of exactly 00:00 Tashkent gives the warning "Use 00:01 — 'midnight' is ambiguous" (Reuters).
- **While active** (`indefinite`, or `until > now`):
  - publication is refused;
  - Telegram posts and newsletter inclusion are refused;
  - `scheduledAt < until` is refused;
  - the read rules in §4.3 apply;
  - preview pages send `noindex`.
- **Admin display, in three places:**
  - a red `EmbargoBadge` list cell: "EMBARGO 14:00 (09:00 UTC)", as a Cell on the `embargo` group and in front of the title (the Cell on `title`, §3.3);
  - a banner at the top of the edit view;
  - the browser tab title prefixed with "EMBARGO · " by the edit-view banner component, which sets `document.title` in an effect while the embargo is active. A virtual field cannot be `useAsTitle`, and `useAsTitle` never sets the tab title (Phase 0).
- **Handover list.** A saved query preset "Embargolar" (embargoes) lists embargoes by release time. It filters on stored fields only (`embargo.indefinite = true` or `embargo.until` exists, sorted by `embargo.until`), never on a virtual field. A saved preset probably cannot hold a relative "now" (lead's inference, untested), so the badge shows which embargoes are still active.
- **Early release.** If an embargoed story is released early by mistake, it is not deleted. The playbook (§12.10) applies: publish an advisory note, tell the source, and assess whether the regulator should be told.

### 5.11 Scheduled publishing

Payload's `schedulePublish` is not enabled. The worker runs `publishDue()` every 30 seconds.

```ts
const due = await payload.find({ collection: 'articles', draft: true, overrideAccess: true, context: { trustedInternal: true },
  where: { and: [{ workflowStatus: { equals: 'scheduled' } }, { scheduledAt: { less_than_equal: now } }] } })
for (const doc of due.docs) {
  const user = await payload.findByID({ collection: 'users', id: doc.scheduledBy, overrideAccess: true })
  try {
    await payload.update({ collection: 'articles', id: doc.id, data: { _status: 'published' }, draft: false,
      user, overrideAccess: false, context: { trustedInternal: true, scheduledRun: true } })  // all §5.3 checks run
  } catch (e) {
    await markScheduleFailed(doc, e)   // → workflowStatus 'ready', scheduleError, alert to editors + EIC
  }
}
```

If the scheduling user has been disabled since, the publish fails closed. This is our own design choice. Payload 3.90.0 changed its built-in scheduled jobs only to keep the scheduling user's auth collection ([release notes](https://github.com/payloadcms/payload/releases/tag/v3.90.0)); it does not say they fail closed for a disabled user.

Confirmed in Phase 0 (§18 item 22): this call publishes the latest draft's content. The worker runs outside a request, so `after()` throws there; its invalidations go through the outbox (§8.4).

### 5.12 Drafts, autosave, versions, locking

| Collection | `drafts` | `autosave` | `maxPerDoc` | `lockDocuments` |
|---|---|---|---|---|
| `articles` | ✓ | interval 2000 ms (set explicitly: the docs say the default is 800 ms, the 3.90.2 source uses 2000 ms) | 0 | 600 s (default 300 s) |
| `glossary-terms`, `institutions` | ✓ | ✓ | 0 | default |
| `authors`, `tags`, `milestones`, `club-events`, `rubrics` | ✓ | ✓ | 100 | default |
| `media` | — | — | 50 | default |
| globals | ✓ (`home-page`, `ad-slots`, `navigation`) | — | 0 (`max`) | — |

`readVersions` mirrors the "Read versions" row in §4.2. Restoring a collection version must create a draft. The admin's Restore button sends `?draft=false` by default, which republishes at once; "Restore as draft" is a sub-menu item, offered only for versions that are not drafts. So `beforeOperation` rejects `restoreVersion` without `draft: true` on any story with `firstPublishedAt` set, and its message points to "Restore as draft". Restoring a draft version onto a live story is therefore not possible from the admin; this is accepted. Publishing the restored draft follows the normal rules. Globals behave differently (§3.16). Version records do not store the user in 3.x, so `lastEditedBy` is written on every change and therefore copied into each version.

### 5.13 Live preview and draft preview

- `admin.livePreview`:

  ```ts
  {
    url: ({ data, locale }) => `${CMS_URL}/preview?c=articles&id=${data.id}&l=${locale.code}`,
    collections: ['articles','glossary-terms','club-events'],
    breakpoints: [{ name:'phone', width:360, height:780 }, { name:'tablet', width:768, height:1024 }, { name:'desktop', width:1280, height:800 }],
  }
  ```

- **`/preview` route** (cms host only):
  - authenticates the user with `payload.auth({ headers })`;
  - checks read access to the document;
  - calls `(await draftMode()).enable()`;
  - redirects to the internal path for that locale.
  - There is no URL secret: the route sits behind Access and requires a Payload session. The live preview iframe is same-origin.
- **Cyrillic preview.** `KrPreview` opens `/preview?…&l=kr`, which renders `/kr/…`.
- **Pages in draft mode:**
  - the content layer reads with `draft: true`, the authenticated user and `overrideAccess: false`;
  - no cache is used;
  - `<RefreshRouteOnSave serverURL={CMS_URL} />` from `@payloadcms/live-preview-react` is rendered;
  - a fixed "KOʻRIB CHIQISH — chop etilmagan" banner ("PREVIEW — not published") is shown;
  - `robots: noindex`.
- **No preview on the public host.** No shareable external preview links (Arc's leaked-preview lesson). To show a draft to someone outside, export a PDF.

### 5.14 Admin list views

These query presets (`enableQueryPresets`) are seeded for everyone:

- "Mening ishlarim" (my work): assignee or author = me, not published;
- "Tahrir navbati" (edit queue): `in_edit`, oldest first;
- "Tayyor" (ready);
- "Rejalashtirilgan" (scheduled), by `scheduledAt`;
- "Embargolar" (embargoes);
- "Ikkinchi oʻqish" (second read): `secondRead.required` and not done;
- "Tarjima kutilmoqda" (translations pending): published and `translation.status` in (`machine_draft`, `in_edit`, `outdated`);
- "Yuridik koʻrik" (legal review): `needsLegal = required`;
- "Homiylik" (sponsored).

LATER: a calendar view and a daily budget digest posted by the bot.

---

## 6. Localization

### 6.1 Payload configuration

```ts
localization: {
  locales: [
    { code: 'uz', label: 'Oʻzbekcha (lotin)' },
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
  ],
  defaultLocale: 'uz',
  fallback: false,        // a missing translation must stay empty; the content layer decides fallback
},
```

`experimental.localizeStatus` (per-language publish status, Beta) is **not** enabled.

**"Publish in <locale>" is blocked.** The admin offers it (`publishSpecificLocale`) to anyone who may publish. In Phase 0, on a story that had never been published, it set the main row to published with only that locale's title. The `beforeOperation` hook of `articles`, `glossary-terms` and `club-events` rejects `args.publishSpecificLocale`.

### 6.2 What is localized

| Collection | Localized fields | Not localized |
|---|---|---|
| `articles` | `title`, `kicker`, `lead`, `body`, `imageCaption`, `meta`, `corrections[].publicText`, `withdrawal.publicNotice`, `sponsored.disclosure`, `sponsored.riskWarning`, `sponsored.keyTerms`, `translation` | Everything else, including `sources`, `interviewee`, `slug` and `kr.*` |
| `authors` | `name`, `role`, `bio` | |
| `rubrics` | `name`, `description` | |
| `tags` | `label` | |
| `glossary-terms` | `short`, `definition`, `origin`, `practice`, `steps`, `example`, `seo`, `translation` | `term`, `aliases` |
| `institutions` | `note` | |
| `milestones` | `title`, `text` | |
| `club-events` | `title`, `theme`, `summary`, `agenda[].title`, `report`, `takeaways`, `seo`, `translation` | |
| `media` | `alt`, `caption`, `credit`, `creativeAlt` (in ad slots) | |
| globals | labels, notices, texts | |

Payload `required: true` is **not** set on localized fields. Phase 0 confirmed why:
- Payload checks `required` only in the locale being saved;
- it never enforces `uz` from another locale;
- it would block ru and en saves and publishes from other tabs.

The `uz` requirement is enforced by `hooks/validate.ts`, which reads the uz values from `docWithLocales` whatever `req.locale` is. Localized children of non-localized arrays (`corrections[].publicText`) follow the same rule.

**Arrays across locales.** Array rows are shared by all locales and matched by `id`.
- A save that sends a row without its `id` replaces the row, and the other locales' text is lost.
- A save in any locale that drops a row drops it for every locale.
- A save that leaves the array out keeps it.

So the corrections hook compares row ids with `originalDoc` in every locale (§5.7), and the importer reuses row ids (§11.1). An update with `locale: 'all'` returns OK but writes nothing localized: write each locale in its own call.

### 6.3 Translation status and gating

- **Status values:** `missing` → `machine_draft` → `in_edit` → `approved` → `outdated`.
- **Approval:**
  - Only an editor or the editor-in-chief can set `approved`.
  - The approver must be someone other than `translatedBy`.
  - On approval the hook records `reviewedBy`, `approvedAt` and `contentHash`. The hash covers that locale's `title`, `kicker`, `lead`, `body` and `imageCaption`.
  - The hook rejects any write that brings in `translation.status`, `approvedAt`, `reviewedBy` or `contentHash` values unless the approval rules pass. A copied `approved` status (for example from Payload's Copy to locale, if it is ever enabled) must never pass the read gate.
  - The hash is computed from a read with `locale: 'all'` through an isolated request (§4.3, bug payloadcms#18246).
- **Automatic changes:**
  - If those fields change in a locale whose status is `approved`, the status becomes `in_edit`. If the approver makes the change, the hash is refreshed instead.
  - Corrections and updates to the uz source set ru/en to `outdated` (§5.6).
  - `machine.used = true` blocks moving straight from `machine_draft` to `approved`: the story must pass through `in_edit`.
- **Read-time gating.** The `ru` or `en` text is used **only** when `translation.status === 'approved'`, or when it is `outdated` after an `update` (never after a correction), **and** the stored `contentHash` matches. Otherwise the reader sees the Uzbek original with `contentLang: 'uz'`, exactly as today.
- **Outdated after an update:** the page shows "Oʻzbekcha asl matn {date} yangilangan; tarjima hali yangilanmagan" ("The Uzbek original was updated on {date}; the translation has not been updated yet"), with the equivalent in the page language.
- **Publishing.** A translator's edits reach the database only when an editor publishes the document. Because of the gate, publishing a document whose ru translation is in progress is harmless. The editor sees a warning: "ru tarjima chop etilmaydi (holati: in_edit)" ("the ru translation will not be published; status: in_edit").

### 6.4 Cyrillic (`/kr`)

- **Read-time transliteration.** `localizeValue(…, 'kr')` keeps calling `deepCyrillic` from `src/i18n/translit.ts` on the uz data.
- **Overrides.** `kr.title`, `kr.lead` and `kr.kicker` replace the transliterated values when set.
- **Checks.** On every uz save, the hook transliterates title, lead, kicker and body and runs the existing `krChecks` logic (moved into `rules.ts`). Findings appear as warnings KR-1 to KR-3. `kr.checked` is optional; a story is never blocked on it.
- **LATER:** `editorial-rules.translitExceptions` and `translitKeep` are merged into `STEMS`, `SOFT_END` and `KEEP` at runtime. The cache tag is `rules`. A change re-renders `/kr` pages.
- **Unsupported page types.** Hide the script switch on any page type that cannot be transliterated (none today; this matters if live pages are added).

### 6.5 Read-time resolution in the content adapter

```ts
async function loadArticle(slug, locale: Locale): Promise<ArticleView | undefined> {
  const source = locale === 'kr' ? 'uz' : locale
  const doc = await payload.find({ collection: 'articles', locale: 'all', fallbackLocale: false, draft: isDraft,
    where: { slug: { equals: slug } }, depth: 1, overrideAccess: false, user: draftUser,
    populate: { 'glossary-terms': { slug: true, _status: true }, articles: { slug: true, rubric: true, _status: true } } })   // locale 'all': one query, all languages
  const uz = pickLocale(doc, 'uz')
  if (locale === 'ru' || locale === 'en') {
    const tr = doc.translation?.[locale]
    if (isUsable(tr, doc, locale)) return toView(pickLocale(doc, locale), { contentLang: locale })
    return toView(uz, { contentLang: 'uz' })                      // today's fallback
  }
  if (locale === 'kr') return toView(applyKrOverrides(deepCyrillic(uz), doc.kr), { contentLang: 'uz-Cyrl' })
  return toView(uz, { contentLang: 'uz' })
}
```

- `toView` serializes Lexical fields with §3.4.
- `toView` resolves media alt and credit in the view's locale, falling back to uz alt when the text around the image is uz. This is today's `translateImage` rule.
- `toView` computes `readingMinutes` and `url`.
- **Depth** (Phase 0). `depth: 1` populates link targets, glossary links, term cards and figures in the body. Each relationship inside rich text uses one depth level, so `depth: 2` also populated the glossary links inside every linked term's definition. Article paths come from a rubric-id → slug map.
- **Media** come from a separate `payload.find({ collection: 'media', where: { id: { in: ids } }, locale: 'all', overrideAccess: true })` into `mediaById`, for the IDs that the published document references. On the public read (no user, `overrideAccess: false`), uploads stay bare IDs, because Media read access refuses anonymous metadata reads. Also, with `locale: 'all'`, documents populated inside rich text come back in the default locale only.
- **A bare ID at depth 1 means "not visible"** (unpublished or deleted). `resolveDoc` returns `undefined`: the link is dropped, the label is kept, and ART-19 warns.

### 6.6 Admin interface language

- Payload ships 44 admin languages and no `uz`. A custom language works in 3.90.2 (Phase 0).
- **Phase 1:** a `uz` pack in `src/payload/i18n/uz.ts`, built as Russian plus Uzbek overrides so that untranslated keys stay Russian:
  - `const uz: Language = { dateFNSKey: 'ru', translations: deepMergeSimple(ru.translations, uzOverrides) }`, with `uzOverrides` typed `DeepPartial<DefaultTranslationsObject>`, so a misspelt key fails the typecheck;
  - `i18n.supportedLanguages: { ...{ uz }, ru, en }` (a fresh `{ uz, ru, en }` literal is a type error) and `fallbackLanguage: 'uz' as AcceptedLanguages`. A browser's `Accept-Language` never selects `uz`, so the fallback is what makes Uzbek the default;
  - `i18n.translations: { ...{ uz: { lexical: …, muomalat: … } }, ru: { muomalat: … } }`. The uz entry must include the `lexical` namespace (27 strings today, more if features are added), otherwise every Lexical label shows as a raw key. It also carries our own component strings. Another known language key is needed next to `uz`, because an object with only `uz` is a type error;
  - about 614 strings to translate (587 Payload core + 27 Lexical in 3.90.2), not about 1,000;
  - dates in the admin use Russian month names, because Payload has no `uz` date-fns locale wired in.
- All collection and field labels and descriptions are written in Uzbek, as before.

---

## 7. Validation

### 7.1 One rule module shared by the script and the CMS

- **New shared module, `src/content/rules.ts`.** Move the following out of `scripts/validate-content.ts` without changing their behaviour:
  - the regexes and lists: `BAD_OKINA`, `BAD_TUTUQ`, `BANNED`, `REVIEW`, `DISCLAIMER`, `ORG_FALSE_FRIENDS`, `REAL_ORGS`, the month, year and date rules, `isoTz`, the slug regex;
  - the Cyrillic checks: `KR_SKIP`, `KR_LATIN_OK`, `KR_LATIN_INTENDED`, `DOMAIN`, `KR_BANNED`.
- **Exports:**

  ```ts
  type Finding = { rule: string; level: 'error' | 'warning'; path: string; message: string; excerpt?: string }
  export function checkText(s: string, path: string, opts: { demoMode: boolean; extra?: EditorialRules }): Finding[]
  export function checkKr(s: string, path: string): Finding[]
  export function checkArticle(view: ArticleView-like, ctx): Finding[]      // structural rules ART-*
  ```

- **`scripts/validate-content.ts`** imports the module. Its output is unchanged for the mock data, and a regression test compares it with today's output.
- **New mode `npm run validate -- --source=payload`** reads published content through the adapter. The worker runs it nightly and posts a summary to the editor-in-chief.

### 7.2 Rule table

Levels:

- **E** = error: blocks publish, approve and the `ready` transition; reported but non-blocking on draft saves.
- **W** = warning: stored and shown in `ChecksPanel`; publishing is allowed and the warnings are kept in the version.
- **S** = system: enforced automatically.

| ID | Check | Level | Applies to | Origin |
|---|---|---|---|---|
| TXT-1 | oʻ/gʻ written with the wrong mark (`BAD_OKINA`); a one-click fix offers U+02BB | E | All text fields, all collections | validate-content |
| TXT-2 | Apostrophe between letters should be ʼ U+02BC (`BAD_TUTUQ`) | W (one-click fix) | same | validate-content |
| TXT-3 | Banned religious terms (`BANNED` and `editorial-rules.bannedTerms`) | E | same | validate-content |
| TXT-4 | Review terms halol, harom, fatvo, joiz, unless in the disclaimer form | W | same | validate-content |
| TXT-5 | Real organisation name. **Demo mode** (`site-settings.demo.noticeEnabled`): W, as the script does today. **Production:** W "tag it in *About/Mentions*?" when the institution is not tagged | W | Article text, glossary, club | validate-content (adapted) |
| TXT-6 | Double space; space before punctuation | W | | validate-content |
| TXT-7 | Straight double quote: use «…» (one-click fix) | W | | validate-content |
| TXT-8 | Month spelling (sentabr, oktabr…) | E | | validate-content |
| TXT-9 | Year without hyphen ("2026 yil"), day without hyphen ("8 oktabr") | W | | validate-content |
| TXT-10 | House spellings from `editorial-rules.houseSpellings` | W | | new |
| TXT-11 | Arabic script | E in glossary, W elsewhere | | validate-content |
| ART-1 | Slug regex; unique; frozen after publish (a change creates a redirect) | E / S | articles | validate-content |
| ART-2 | uz title present; length warn/max (`limits`) | E / W | | new |
| ART-3 | uz lead present; length warn/max | E / W | | new |
| ART-4 | At least 1 author; author records published and active | E | | validate-content |
| ART-5 | At least 1 source | E | | validate-content |
| ART-6 | Rubric `intervyu` ⇒ `interviewee` and at least 1 `qa` block | E | | validate-content |
| ART-7 | Rubric `tahlil` without a table or chart | W | | validate-content |
| ART-8 | Table row lengths equal column count; line series length equals x labels | E | | validate-content |
| ART-9 | Chart and table `source` present | E | | new (Reuters/FT) |
| ART-10 | Chart data parses; at least 2 data points | E | | new |
| ART-13 | Every image (hero, figure, SEO) has uz alt, unless decorative | E | | new |
| ART-14 | Every image has a credit; `rightsCategory ≠ unknown`; `usableUntil` not passed | E | | new (Grid) |
| ART-15 | `sponsoredOnly` media in an editorial story | E | | new |
| ART-16 | No hero image; hero under 50,000 px² or ratio not 16:9, 4:3 or 1:1 | W | | new (Google) |
| ART-17 | No tags | W | | new |
| ART-18 | SEO title or description missing, or over length | W | | new |
| ART-19 | A referenced term, article or institution is unpublished or trashed | E (term card) / W (link) | | validate-content (references) |
| ART-20 | Literal markup characters in text (`*`, `**`, `[[`, `](`, `{en:`): W. Text that breaks the markup and cannot round-trip: E. That means a link label containing `]`, a URL containing `)`, a glossary label containing `\|`, or keepLatin text containing `}`. The serializer finds both by re-tokenising its own output with the `TOKEN` regex | W / E | | new (serializer) |
| ART-21 | Formatting inside a heading or a link (dropped); bold + italic (becomes bold); a line break (becomes a space): W. Nested list or `listType: 'check'`: E | W / E | | new |
| ART-22 | External link not https; link to a disallowed scheme. Enforced on the server, because REST, the Local API and pasting all accept `http:` and `javascript:` links (§3.4) | E | | new |
| ART-23 | Active embargo at publish | E | | §5.10 |
| ART-24 | `needsLegal = required` | E | | §5.5 |
| ART-25 | Approved translation with an empty title, lead or body in that locale | E | | §6.3 |
| ART-26 | `kr.*` override contains Latin words (`checkKr`) | E | | new |
| ART-27 | Numbers changed with kind `minor` (N-1); headline (N-2); entities (N-3) | E | | §5.6 |
| ART-28 | `publishedAt`, `firstPublishedAt`, `significantUpdateAt` in order and not in the future | S | | validate-content |
| ART-29 | Telegram caption over 1024 UTF-16 units after entity parsing (tags removed) | E (for the post) | telegram-posts | new |
| ART-30 | Body over 400 words when `urgent` | E | | §5.4 |
| ART-31 | An author declared an interest in an institution in `about` or `mentions` | W, escalates to the editor-in-chief (§5.5) | | new (FT/Reuters) |
| SP-1…SP-10 | Sponsored guard | see §5.9 | | new |
| KR-1 | ʻ/ʼ left in the Cyrillic output | W | uz text | validate-content (E in the script) |
| KR-2 | Latin word in the Cyrillic output (not an acronym, brand or `{en:}`) | W | | validate-content |
| KR-3 | Loanword spelling (`KR_BANNED`) | W | | validate-content |
| GL-1 | Related term exists and is not self; inline link targets exist | E | glossary-terms | validate-content |
| INST-1 | `statusDate` is YYYY-MM-DD and not in the future; `window` needs a parent; linked article exists | E | institutions | validate-content |
| MS-1 | Date format; linked article exists | E | milestones | validate-content |
| CLUB-1 | `startsAt` / `endsAt` order; `number` unique | E | club-events | validate-content (adapted) |
| HOME-1, HOME-2 | §3.16 | E | home-page | new |
| SET-1 | Launch gate | E | site-settings | new |

### 7.3 How findings reach the editor

- **Before the save.** Collection `beforeValidate` runs the field-level rules. `beforeChange` runs the rules that need the merged document, such as ART-14, ART-25 and N-1.
- **Errors at publish, approve or `ready`:** throw `new ValidationError({ errors: findings.map(f => ({ path: f.path, message: f.message })) })`. Payload shows the errors next to the fields.
- **Errors and warnings on a draft save:** stored in `validationWarnings` and shown in `ChecksPanel`, a sidebar `ui` field, with links that jump to each field.
- **On demand.** `POST /api/articles/:id/check` runs the checks without saving.
- **One-click fixes** (TXT-1, TXT-2, TXT-7) are offered in `ChecksPanel`. They apply the change to the draft and record it.
- **Wording.** Messages are Uzbek and say how to fix the problem: «3-xatboshi: "o'z" — oʻ uchun ʻ (U+02BB) belgisidan foydalaning» ("Paragraph 3: "o'z" — use ʻ (U+02BB) for oʻ").

---

## 8. Content adapter, caching and revalidation

### 8.1 The content layer becomes async

- **Same names, async signatures.** Every function in `src/content/index.ts` keeps its name and arguments and returns a `Promise`, for example `getArticles(locale): Promise<ArticleView[]>`.
- **Callers to update:**
  - all pages under `src/app/[lang]`;
  - `sitemap.ts`;
  - `lib/rss.ts`;
  - the OG image routes;
  - `components/pages/digest/issue.ts`;
  - `search`;
  - `scripts/validate-content.ts`.
- **Adapter switch.** `CONTENT_SOURCE=mock` keeps today's implementation (`adapters/mock.ts`, wrapped in `Promise.resolve`) for tests and offline development.
- **Summaries and full articles.** `getArticles()` loads summary fields: everything except `body`, using `select`. `getArticle()` loads the full document. Search keeps today's in-memory index over cached bodies until there are more than about 2,000 articles; after that it moves to Postgres full-text search (LATER).
- **Dates.** `CONTENT_NOW` becomes the request time (`new Date()`) in the Payload adapter. The mock adapter keeps the constant.
- **Untrusted input.** Route params and search queries never reach a Payload `where` unvalidated:
  - slugs must match the slug regex before any query, otherwise `notFound()`;
  - the search query is used only in memory.

  This closes the class of SQL-injection flaws that came through dynamic filters, such as CVE-2026-105845.

### 8.2 Caching model

**Chosen: Option B** (Phase 0, PHASE0-FINDINGS §1.1). This is the previous Next caching model:

- content functions in `src/content/adapters/payload.ts` are wrapped in `unstable_cache(fn, key, { tags, revalidate })` with the §8.3 tags. `unstable_cache` is marked as replaced by `'use cache'` in Next 16 but is supported, and its entries persist in `.next/cache` (the `next-cache` volume, §2.1);
- OG routes and `lib/rss.ts` read through the same tagged functions;
- content routes get `export const revalidate`: home 300, rubric 600, others 3600;
- `export const dynamicParams = false` is removed from the content routes: `[rubric]/page.tsx`, `[rubric]/[slug]/page.tsx`, `[rubric]/sahifa/[page]/page.tsx`, `lugat/[term]/page.tsx`, `mavzu/[tag]/page.tsx`, `muallif/[slug]/page.tsx`, `klub/[slug]/page.tsx`, and the `opengraph-image.tsx` files under `[rubric]/[slug]`, `lugat/[term]` and `klub/[slug]`. It stays on the `[lang]`-only pages, on `[lang]/opengraph-image.tsx` and on `rss.xml`;
- `generateStaticParams` returns recent items;
- every page calls `notFound()` for unknown or invalid params after the slug check (§8.1). OG routes do the same instead of returning the generic card;
- draft-mode reads bypass the cached functions (§5.13).

Phase 0 result: in a production build every test passed:
- the admin end-to-end run had no errors;
- unknown URLs returned 404 on the first request;
- redirects were 308 with `Location`;
- tag invalidation worked with `'max'` and with `{ expire: 0 }`;
- `after()` worked from Payload hooks;
- layout and pattern `revalidatePath` worked.

Responses carried `s-maxage=3600, stale-while-revalidate=31532400`; the Cloudflare TTL caps in §8.4 still apply. Unknown slugs also create cached 404 entries on disk, so the slug check runs before any rendering, and Cloudflare rate limits apply.

**Deferred: Option A** (Next Cache Components: `cacheComponents: true`, `partialPrefetching: true`). Revisit it before Next 17, which the Next docs say turns both on permanently. With the spec's settings, Phase 0 found:

- the Payload admin works, because Payload wraps its root layout in `<Suspense>`. But every authenticated admin request logs "Next.js encountered the unstable value `new Date()`" from Payload's JWT check;
- the unmodified site does not build. There are 21 errors from `dynamicParams` and `dynamic` exports; then an empty `generateStaticParams`; then `searchParams` read outside Suspense in `qidiruv`;
- after those fixes, four runtime failures remain:
  - unknown URLs return 200 on the first request (Googlebot included) and 404 only afterwards;
  - a page prerendered at build time returns its build-time content once after `revalidateTag(…, { expire: 0 })` or `revalidatePath`;
  - `revalidatePath('/[lang]', 'layout')` or a pattern path makes every page under a dynamic segment return 500 until restart. This stops only if the root layout reads `lang` through `next/root-params`, the Header sits inside `<Suspense>`, and every page awaits `params` inside `<Suspense>`;
  - `permanentRedirect` inside Suspense gives a cached 308 with no `Location`, so redirects would have to move to `proxy.ts`;
- with `partialPrefetching: false` these problems did not appear, but the docs reserve that setting for migration and remove it in the next major release;
- the default `'use cache'` store is in memory, so the data cache would be empty after every restart.

If Option A is adopted later, it needs:
- the site changes above;
- redirects moved to `proxy.ts`;
- `cacheTag`-based invalidation instead of layout or pattern `revalidatePath`;
- a log filter for the Payload line;
- test H10;
- a pinned Next version in which these problems are fixed.

The advisories GHSA-3w37-wq28-93x7 and GHSA-h694-7cp9-m8p3 apply only to Option A.

Both options use the same tags (§8.3) and the same invalidation code.

### 8.3 Cache tags

| Tag | Covers |
|---|---|
| `articles` | All article lists and summaries (home, rubrics, tags, authors, RSS, sitemap, search index) |
| `article:<id>` | One article's full data |
| `rubric:<slug>`, `tag:<slug>`, `author:<slug>` | Listing data |
| `glossary`, `term:<slug>` | Glossary index, term pages, term cards in articles |
| `institutions`, `milestones` | Market map, snapshot |
| `club`, `club:<slug>` | Club pages |
| `home` | HomePage global |
| `settings`, `navigation`, `ads`, `rules` | Globals |
| `corrections` | Public corrections list |
| `redirects`, `shortlinks` | Lookups |

### 8.4 Publish pipeline ("Monolog-lite")

1. **`afterChange` (and `afterDelete`) hook, inside the request.**
   1. Compute the targets: tags and internal paths (§8.5).
   2. Insert a `publish-events` row in the same transaction (pass `req`).
   3. Schedule `after(() => invalidate(targets))` with `after` from `next/server`. It runs after the response, so after the transaction has committed, which avoids the stale-regeneration race.
   4. Outside a request (worker, scheduler, import, break-glass scripts), `after()` throws "called outside a request scope", and a direct `revalidateTag` throws as well.
      - `invalidate.ts` wraps `after()` in try/catch. On failure it leaves the work to the outbox row from step 2, which the worker posts to `/internal/revalidate`.
      - Nothing calls `revalidateTag` or `revalidatePath` directly outside a request.
      - Payload `jobs.autoRun` is never enabled in the app process. Payload starts its cron there (`getPayload({ cron: true })`), and those jobs run outside a request.
2. **`invalidate(targets)`:**
   - `revalidateTag('article:<id>', { expire: 0 })` for the changed article: the next request blocks and gets fresh data (confirmed under Option B);
   - `revalidateTag('articles' | 'rubric:*' | 'home' | …, 'max')` for lists;
   - `revalidatePath()` for pages uses the **internal** path: `/uz/<rubric>/<slug>`, `/kr/…`, `/ru/…`, `/en/…`. This was confirmed under the `proxy.ts` rewrite; the public path does nothing.
   - **Route handlers in the uz edition** (`opengraph-image`, `rss.xml`) need **both** forms: `/uz/<r>/<s>/opengraph-image` and `/<r>/<s>/opengraph-image`, and `/uz/rss.xml` and `/rss.xml`. An entry regenerated at runtime through the rewrite is tagged with the public path. `proxy.ts` serves OG images at their `/uz` path, but `/rss.xml` always goes through the rewrite.
   - `revalidatePath` on a page never refreshes its `opengraph-image`. Because OG routes and `lib/rss.ts` read through the tagged content functions, `revalidateTag` covers them either way.
   - `/internal/revalidate` (route handler) does the same for callers outside a request. It accepts `POST {targets, ts}` with header `X-Signature: HMAC-SHA256(body, INTERNAL_REVALIDATE_SECRET)`. It rejects requests with a timestamp older than 60 s and any request carrying `cf-connecting-ip`, which means it arrived through the tunnel.
3. **Worker outbox loop** (every 5 s) over `publish-events` with `status = pending`:
   0. **Re-post invalidations.** For each pending event, POST its targets to `/internal/revalidate` before the warm-up. Next keeps tag invalidations in memory, so a restart forgets any it has not yet acted on. The repeat is harmless.
   1. **Warm-up.** `GET ${INTERNAL_APP_URL}<public path>` with `Host: muomalat.uz` for each edition URL, twice, 2 s apart.
   2. **Cloudflare purge.** `POST /zones/{zone}/purge_cache`.
      - Purge by exact URL by default: the article in each edition, each one's `/opengraph-image` URL, `/`, `/kr`, `/ru`, `/en`, the rubric fronts, `/rss.xml` for each edition, and `/sitemap.xml`.
      - On the Free plan, single-URL purge allows 800 URLs a second with at most 100 per request. Prefix, tag and hostname purges are limited to 5 requests a minute, with a bucket of 25 ([Cloudflare purge](https://developers.cloudflare.com/cache/how-to/purge-cache)).
      - Use prefix purge (`muomalat.uz/<rubric>/<slug>`, …) only for slug or rubric changes, where unknown sub-URLs may exist.
      - Purge limits are **per account** and shared by every zone on the same plan, staging included (§15). Batch up to 100 prefixes or tags per request.
      - Next's RSC payloads are requested with a `?_rsc=` query, and an exact-URL purge does not remove those variants. The cache rule below therefore bypasses the cache for RSC requests. Tag purge (`Cache-Tag: p:<path>` set by `proxy.ts`, available on Free) is the alternative if RSC caching is ever wanted.
      - The worker batches and paces its requests.
   3. **Telegram.** Create the draft post on first publication; queue edit or reply posts for corrections (§10).
   4. Mark the event done, or failed with `attempts` and `lastError`. Retry with backoff up to 10 times, then alert.
4. **Cloudflare cache rules for `muomalat.uz` HTML:**
   - eligible for cache, respecting origin `Cache-Control`;
   - edge TTL from the origin. On Free, a cache rule cannot set an Edge TTL below 2 hours (Pro: 1 hour; [Cloudflare](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/)), so the planned caps (120 s for `/`, `/kr`, `/ru`, `/en` and the rubric fronts, 1 h elsewhere) cannot be set as overrides. The rule respects the origin's `s-maxage` instead, which Option B sets from the route `revalidate`: home 300 s, rubric 600 s, others 3600 s (§8.2). The exact-URL purge after each publish keeps pages fresh, and the TTL is only the backstop. Check on staging (`cf-cache-status`, `age`) that Free honours an origin `s-maxage` shorter than its minimum;
   - cache bypassed when the request carries `__prerender_bypass` or a `muomalat-token` cookie, which should not happen on this host. Payload names its cookie `<cookiePrefix>-token`, and §12.2 sets `cookiePrefix: 'muomalat'`, so the cookie is not called `payload-token`;
   - cache bypassed for RSC requests: `_rsc` in the query or an `RSC` request header. Which RSC responses Next marks cacheable under Option B is still to be checked;
   - `cms.muomalat.uz` bypasses the cache entirely.

**`publish-events` fields:**

- `at`, `collection`, `docId`;
- `kind` (`publish_first`, `publish_change`, `unpublish`, `withdraw`, `restore`, `delete`, `global_change`, `schedule_run`);
- `changeKind`, `actorId`;
- `targets` (json);
- `status`, `attempts`, `lastError`, `processedAt`.

Access: `create`, `update` and `delete` are false for every API user (hooks write with `overrideAccess: true`). Read is limited to editors, the editor-in-chief and admin.

### 8.5 What each change invalidates

| Change | Tags | Paths and purges |
|---|---|---|
| Article first publication, change, withdrawal | `article:<id>`, `articles`, `rubric:<r>` (old and new), `tag:*` (old ∪ new), `author:*` (old ∪ new), `term:*` in the body, `home`, `institutions` if `about`/`mentions` changed, `corrections` if a correction was added | 4 edition URLs and OG images; old URLs if the slug or rubric changed; home ×4; rubric ×4; RSS ×4; sitemap |
| Author | `author:<slug>`, `articles` | Author page ×4 |
| Tag | `tag:<slug>`, `articles` | Tag page ×4 |
| Glossary term | `term:<slug>`, `glossary`, `articles` | Term page ×4, `/lugat` ×4 |
| Media metadata (alt, credit, caption) | `articles`, plus `article:<id>` for each article in `usedIn` | Those articles' URLs |
| Institution or milestone | `institutions` / `milestones` | `/xarita` ×4, home ×4 |
| Club event | `club`, `club:<slug>` | Club pages ×4, home ×4 |
| `home-page` | `home` | home ×4 |
| `site-settings`, `navigation` | `settings` / `navigation` | `revalidatePath('/[lang]', 'layout')`; purge everything in Cloudflare (rare) |
| `ad-slots` | `ads` | Pages carrying the changed slot |
| `editorial-rules` | `rules` | `/kr` layout if transliteration exceptions changed (LATER) |

### 8.6 Route changes

- **`[lang]/[rubric]/[slug]/page.tsx`:**
  - read the article through the adapter;
  - if it is missing, call `resolveMissing(path)` (§8.8) and then `notFound()`;
  - if it is withdrawn, render the notice view;
  - JSON-LD `datePublished = firstPublishedAt`;
  - `@type` stays `AdvertiserContentArticle` for sponsored items.
- **`[lang]/[...rest]/page.tsx`** (404 handler) calls `resolveMissing(path)` first.
- **`[lang]/klub/*`** computes the meeting status from request time.
- **`Header.tsx`** reads the demo notice and the emergency banner from settings (tag `settings`).
- **Forms** (`src/app/actions.ts`, `src/lib/actions/*`) write through `createSubmission()` (§3.14). They keep the current error codes and the honeypot, and they check the app-level rate limit before writing (§12.3), which adds one form-level error code, `rate_limited`. Optional LATER: Cloudflare Turnstile, which needs a CSP update.
- **Search** (`qidiruv`) checks the same rate limit before it runs a query (§12.3).

### 8.7 RSS, sitemaps, OG, JSON-LD

- **RSS** (`lib/rss.ts`):
  - async and cached with `articles` and `settings`;
  - excludes withdrawn and `noindex` items;
  - the sponsored prefix is `labels.sponsored`;
  - `guid` is `muomalat:article:<id>` (`isPermaLink="false"`) so it survives slug changes.
- **`sitemap.ts`:**
  - async;
  - excludes withdrawn and `noindex` items;
  - `lastModified` from `articleModified()`, unchanged;
  - `ownEditions()` rule unchanged: ru/en are listed only when the translation passes the gate in §6.3.
- **LATER:** a Google News sitemap at `/sitemap-news.xml` with stories from the last 48 h, not sponsored, own editions only. Add it to `robots.ts`.
- **OG images** keep being generated by `next/og` from article data, read through the tagged content functions. An unknown slug calls `notFound()` instead of returning the generic card. Invalidation is covered in §8.4 step 2: tags, plus both path forms in the uz edition.
- **JSON-LD:**
  - `NewsArticle` gets `datePublished = firstPublishedAt` and `dateModified` from the existing logic;
  - images carry `creditText`, `creator`, `copyrightNotice` and `license` from Media;
  - `publisherLd` gets `correctionsPolicy` from `site-settings.policies`.

### 8.8 Redirects and short links

- **`resolveMissing(path)`:**
  - checks the `redirects` collection, cached with tag `redirects`;
  - also checks `slugHistory` matches;
  - then calls `permanentRedirect(target)` (308 in Next; acceptable) or returns `undefined`.
- **`src/app/t/[code]/route.ts`:**
  - `GET` looks up `shortCode` (tag `shortlinks`);
  - responds with **301** to `https://muomalat.uz<edition path>?utm_source=telegram&utm_medium=channel&utm_campaign=muomalatuz&utm_content=<postId>`; an optional `?l=kr` selects the edition;
  - unknown codes get 404;
  - Cloudflare caches the response for 1 day;
  - requests whose user agent contains `TelegramBot` are not counted.

---

## 9. Audit log

### 9.1 Collection `audit-log` (one table; no relationship or array fields)

| Field | Type | Notes |
|---|---|---|
| `at` | date | |
| `actorId`, `actorEmail`, `actorRole` | number, text, text | Snapshot (`system:worker`, `system:import` for internal callers) |
| `action` | text (enumerated in code, §9.2) | |
| `collection`, `docId`, `docTitle`, `locale`, `versionId` | text | `docTitle` snapshot; empty for personal-data documents |
| `summary` | text | e.g. "in_edit → ready", "correction added" |
| `changedPaths` | json | Field paths only. For personal-data collections and auth fields, paths without values |
| `before`, `after` | json | Only for settings, roles, labels, corrections and workflow fields |
| `ip`, `country`, `userAgent` | text | From `cf-connecting-ip` and `cf-ipcountry`; IP truncated to /24 after 90 days by the retention job |
| `requestId` | text | |
| `prevHash`, `hash` | text | `hash = sha256(prevHash + canonicalJSON(row without hash))`; chain verified nightly |

Access: `create`, `update` and `delete` are false for everyone (hooks insert with `overrideAccess: true`). `read` is the editor-in-chief and admin.

**Database enforcement** (`docker/postgres/init/20-grants.sql`, re-applied after migrations):

```sql
CREATE ROLE muomalat_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO muomalat_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO muomalat_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO muomalat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE muomalat_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO muomalat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE muomalat_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO muomalat_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM muomalat_app;
-- publish_events keeps UPDATE (status), but not DELETE:
REVOKE DELETE, TRUNCATE ON publish_events FROM muomalat_app;
```

Confirmed in Phase 0. Payload's create sends one `INSERT … RETURNING` and one `SELECT`, never an UPDATE, and sets `created_at` and `updated_at` in the INSERT. Under a role with only INSERT and SELECT on the table, `payload.create` worked alone and inside a transaction, and `payload.update` and `payload.delete` failed with "permission denied". `timestamps` stays `true`, and the REVOKE above stays. Also:

- `lockDocuments: false` on `audit-log`, so Payload's document-lock table never references audit rows;
- no array, relationship or hasMany fields (each adds a child table that needs its own INSERT grant);
- the `GRANT … ON ALL SEQUENCES` line covers `audit_log_id_seq`;
- the grants are re-applied after every migration, because the default privileges give UPDATE and DELETE to any table a migration re-creates.

### 9.2 Events

| Area | Actions |
|---|---|
| Auth | `auth.login`, `auth.logout`, `auth.locked`, `auth.unlock`, `auth.password_reset_requested`, `auth.password_changed`, `auth.edge_mismatch` (Access email ≠ Payload user), `auth.login_failed` (§9.4), `auth.edge_login_failed` (optional, from the Access log, §9.4) |
| Users | `user.create`, `user.update`, `user.role_change`, `user.disable`, `user.enable` |
| Content (all collections) | `doc.create`, `doc.update` (draft), `doc.publish_first`, `doc.publish_change` (+kind), `doc.unpublish`, `doc.trash`, `doc.restore_from_trash`, `doc.delete`, `doc.version_restore` |
| Workflow | `workflow.transition` (from, to, comment), `workflow.approval_voided`, `article.withdraw`, `article.restore`, `correction.add`, `correction.amend`, `legal.signoff`, `legal.hold_set`, `legal.hold_cleared` |
| Scheduling | `schedule.set`, `schedule.cancel`, `schedule.run`, `schedule.fail` |
| Globals | `global.update` / `global.publish` (one per global) |
| Telegram | `telegram.approve`, `telegram.cancel`, `telegram.send`, `telegram.edit`, `telegram.delete`, `telegram.channel_admin_change` |
| Personal data | `pd.read` (single-document reads, `afterRead` with `findByID`), `pd.export`, `pd.delete`, `pd.retention_purge` |
| Operations | `ops.read_only_on` / `ops.read_only_off`, `ops.backup_ok` / `ops.backup_fail`, `ops.chain_break` |

### 9.3 Off-server copies and alerts

- **Immediately:** these events go to the private alerts Telegram group through a separate `ALERTS_BOT_TOKEN`, and by email to the founder and the editor-in-chief:
  - user create, role change or enable;
  - `auth.edge_mismatch`, `auth.locked`, five or more failed logins in 10 min;
  - login from a country not in `knownCountries`;
  - first publication outside `officeHours`;
  - urgent fast path used;
  - withdraw or unpublish;
  - `site-settings` legal, labels or telegram changed;
  - `ad-slots` link changed;
  - one user changing more than 10 documents in 5 minutes;
  - Telegram channel admin change;
  - backup failure;
  - chain break.
- **Nightly:** the worker exports the day's rows as JSONL to the backup bucket (object lock). A root-level attacker can then delete local rows, but cannot hide that they did.

### 9.4 Failed logins

Phase 0 found a collection-level hook that sees failed logins. `users.hooks.afterError` receives every REST login failure, and so does the root `hooks.afterError`. The admin login form posts to `/api/users/login`, so it is covered.

- **`auditFailedLogin`** (users `afterError`): when `req.pathname` ends with `/users/login` and `error.name` is `AuthenticationError` (wrong password or unknown email) or `LockedAuth` (account locked), it writes `auth.login_failed`. The row holds the attempted email (`req.data.email`) and the IP and country (`cf-connecting-ip`, `cf-ipcountry`).
- **Lock detection.** The same hook reads the user's `loginAttempts` and `lockUntil` with `payload.db.findOne`. They are hidden fields, and Payload has already written the new count outside any transaction. It writes `auth.locked` when `lockUntil` has just been set; Payload sets it on the fifth failure.
- **No account enumeration.** The hook replaces the `LockedAuth` message ("This user is locked…") with the generic login error.
- **Every attempt.** Users `beforeOperation` (operation `login`) runs before the password check on every attempt, so the per-IP login limit (`loginRateLimit`, §12.3) runs there.
- A Local API `payload.login` failure does not reach `afterError`. Only scripts use it.
- §9.3's "five or more failed logins in 10 min" is computed from these rows. There is no polling job.
- **Edge.** Cloudflare Access keeps authentication logs for 24 h on Free and 30 days on Standard ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/insights/logs/)); Logpush is Enterprise-only. An optional worker job pulls `GET /accounts/{account_id}/access/logs/access_requests` hourly, with a token that can only read Access audit logs, and writes `auth.edge_login_failed` rows.

### 9.5 Retention

The audit log is kept for 5 years (a proposal; ask counsel). IP addresses are truncated after 90 days.

---

## 10. Telegram integration

### 10.1 Scope

Phase 2 and optional. Until it ships, posting is manual, and the §12.9 account controls still apply on day one.

### 10.2 Collection `telegram-posts`

| Field | Type | Notes |
|---|---|---|
| `article` | rel articles | |
| `kind` | select: `article`, `correction_reply`, `retraction` | |
| `status` | select: `draft`, `approved`, `queued`, `sent`, `edit_pending`, `edited`, `cancelled`, `retracted`, `failed` | |
| `captionHtml` | textarea | Live counter of the caption **after entity parsing**: HTML tags removed and `&lt;`, `&gt;`, `&amp;` decoded, counted in UTF-16 units (JS `string.length`). This is a conservative bound: the Bot API server counts Unicode code points, so the counter never passes a caption Telegram rejects, but it may refuse one with emoji that Telegram would accept. Max 1024 with a photo, 4096 for text. Telegram's limit is "0-1024 characters after entities parsing" ([Bot API](https://core.telegram.org/bots/api#sendphoto)) |
| `photo` | upload (defaults to the hero image's `og` size) | |
| `imageFileId` | text | Telegram `file_id`, reused afterwards |
| `silent` | checkbox | `disable_notification` |
| `sponsored` | checkbox (snapshot) | Forces the template |
| `requestedBy`, `approvedBy` | system | `approvedBy` is ¬author and ≠ `requestedBy` |
| `sendAt` | date | `max(approval + delayMinutes, chosen time)` |
| `chatId`, `messageId`, `sentAt` | system | |
| `replyTo` | text | `message_id` that a correction replies to |
| `history` | array: `at`, `action`, `captionHtml` | Every caption ever sent or edited (Art. 15: 3 years for ads) |
| `lastError` | text | |

### 10.3 Flow

1. **On first publication** of an article with `telegram.autopost` (worker outbox): create a `draft` post from the template. Sponsored articles get the sponsored template; their caption cannot be edited except for the partner line.
2. **An editor (¬author) approves** it. Status `queued`, `sendAt = now + delayMinutes` (default 3). The admin shows a countdown and a **Cancel** button; the editor-in-chief can cancel too.
3. **At `sendAt`** the worker re-checks:
   - the article is published, not withdrawn and has no active embargo;
   - the post is still `queued`;
   - `site-settings.telegram.postingEnabled` is on;
   - the bot rights check passes (§10.5).

   If all pass, it calls `sendPhoto` (multipart upload the first time, `file_id` afterwards), stores `message_id` and the largest `photo[].file_id`, and sets `sent`.
4. **On a published `correction`, `clarification` or `editors_note`:**
   - create `edit_pending` with the original caption plus "\n\nTuzatish (dd.mm): {publicText}";
   - after approval (¬author), call `editMessageCaption` (a bot can edit its own channel posts at any age);
   - for kind `correction`, also send a `correction_reply` with `reply_parameters: { message_id }` and text "TUZATISH: {publicText}\n{shortUrl}", because edits do not notify subscribers.
5. **On withdrawal:**
   - if the post is less than 48 h old **at the moment `deleteMessage` is called**, call it after editor-in-chief approval. The approval itself can push the post past 48 h;
   - otherwise edit the caption to the retraction notice and create a task for the channel owner to delete the post by hand ([deleteMessage](https://core.telegram.org/bots/api#deletemessage)).
6. **Failures:** status `failed`, `lastError` and an alert. There is no automatic resend after a partial failure; an editor re-queues it.

### 10.4 Message templates

HTML `parse_mode`. Escape only `<`, `>` and `&`. MarkdownV2 is never used.

```
<b>{title}</b>

{lead}

{shortUrl}

#{rubricHashtag}
```

Sponsored (fixed first line, Art. 6/18):

```
<b>Reklama</b> · {partner}

<b>{title}</b>

{lead}

{shortUrl}

#reklama
```

- `{shortUrl}` = `https://muomalat.uz/t/<code>`.
- No inline buttons, no signature, no `protect_content`.
- Club meetings may use `<tg-time unix="…" format="wDT">` for the time ([Bot API](https://core.telegram.org/bots/api#date-time-entity-formatting)).

### 10.5 Bot setup and rights check

- **Setup:**
  - one production bot, a channel admin with `can_post_messages`, `can_edit_messages` and `can_delete_messages` and no other right. `can_manage_chat` is the exception: Telegram reports it as true for every admin ("Implied by any other administrator privilege", [ChatAdministratorRights](https://core.telegram.org/bots/api#chatadministratorrights)), so the check below must allow it;
  - `TELEGRAM_BOT_TOKEN` comes only from the environment;
  - no bot-token field exists in the database.
- **At worker start and every hour:**
  - `getMe`;
  - `getChat(@channel)`, storing the numeric `-100…` ID in `site-settings.telegram.channelChatId`;
  - `getChatMember(chat, botId)`.
- **The rights check is an allow-list.** Every `can_*` key in the `getChatMember` result must be false except `can_post_messages`, `can_edit_messages`, `can_delete_messages` and `can_manage_chat`. A new right is refused by default; Bot API 10.3 (24 August 2026) added `can_send_welcome_messages`. If any other right is true, or a required one is missing: alert and pause posting.
- **Least privilege (option; confirm in staging with I5 and I6).** `can_post_messages` alone lets the bot post, edit and delete its **own** posts. `can_edit_messages` extends editing to everyone's posts, including old manual staff posts, and `can_delete_messages` extends deletion to everyone's posts within 48 h. Both can be dropped from the allow-list.

### 10.6 Listening for channel changes

- **Polling.** One worker process long-polls `getUpdates` with `allowed_updates: ["channel_post","edited_channel_post","chat_member","my_chat_member"]`. There is no webhook, so there is nothing public behind Cloudflare.
- **Manual posts and edits** (`channel_post`, `edited_channel_post`) are recorded and matched to articles by the `muomalat.uz` URL in the caption.
- **Admin changes.** `chat_member` or `my_chat_member` showing an admin added or removed, or the bot demoted, means **immediate alert** to the editor-in-chief and the founder (possible takeover; playbook §12.10).
- **Delivery** (Phase 0, from the docs and the Bot API server source; not yet live-tested, test I8 in staging confirms it). `chat_member` is delivered for channels when it is listed in `allowed_updates` and the bot is an admin; `my_chat_member` is delivered by default. Limits:
  - the server drops a `chat_member` update older than 24 h, and keeps updates for at most 24 h, so a worker outage longer than that loses admin-change alerts. An hourly `getChatAdministrators(@channel)`, compared with a stored snapshot, catches those changes;
  - `chat_member` also fires for every ordinary subscriber who joins or leaves. Alert only when the old or new status is `administrator` or `creator`;
  - `allowed_updates` persists between calls, and `getUpdates` does not work while a webhook is set. A `409 Conflict` from `getUpdates` (a webhook, or another poller using our token) is an immediate security alert.

### 10.7 Short links and invite links

- **Short links:** §8.8.
- **Invite links:**
  - the channel owner creates named invite links in the Telegram app for `sayt-sticky`, `sayt-maqola`, `klub`, `dayjest` and `in-app`, and an admin pastes them into site settings. The bot never gets `can_invite_users`: the rights check in §10.5 would pause posting. (An earlier draft had the bot call `createChatInviteLink`, which contradicted §10.5.);
  - they are stored in `site-settings.telegram.inviteLinks`;
  - `TelegramButton` uses the link for its placement, and when `window.TelegramWebviewProxy` exists, the `in-app` link.

### 10.8 Staging

- **Separate test bot and test channel.** Staging and development use a different bot token and a private test channel.
- **Production startup check.** In production, startup refuses to run if `TELEGRAM_CHANNEL` is not `@muomalatuz`.
- **Other environments.** Outside production, startup refuses a token whose bot ID matches the production bot ID; that ID is stored as a constant, and the token never is.

### 10.9 Staff notifications

Workflow notifications go to the private staff group through the alerts bot:

- submitted for edit;
- sent back;
- approved;
- second read due or overdue;
- schedule failed;
- request overdue.

They are not audit alerts. An email fallback covers the case where Telegram is down.

---

## 11. Data import from the mock files

### 11.1 Principles

- **Never test in production** (the Dow Jones lesson):
  - `scripts/import-mock.ts` refuses to import articles, authors or club events when `SITE_ENV=production`;
  - **Production receives only the vocabulary:** rubrics and tags, plus glossary terms and institutions imported with `needsReview = true`, so an editor reviews each one before publication. Mock institutions use fictional names and must be replaced or reviewed.
- **Preflight:** the import runs only after `npm run validate` passes on the mock data.
- **Idempotent:** a re-run upserts by `legacyId`.
- **Local API rules from Phase 0:**
  - pass `_status: 'published'` explicitly when publishing; a create without it stores a draft, even with `draft: false`;
  - write each locale in its own call: an update with `locale: 'all'` returns OK and writes nothing localized;
  - write uz first, then reuse the returned array row ids (corrections) when writing ru and en; a row sent without its id replaces the row and drops the other locales' text;
  - write dates as ISO strings with `Z` or an explicit offset;
  - the import runs outside a request, so its invalidations go through the outbox (§8.4), not `after()`.
- **Runs as the system user `importer`** (`overrideAccess: true`, `context: { trustedInternal: true, import: true }`). Hooks then skip the two-person rule but still write audit rows (`system:import`).
  - The translation hook (§6.3) also skips its "approver ≠ translator" check for imports, because step 7 sets both `translatedBy` and `reviewedBy` to the importer.
  - In production this applies only to glossary terms and institutions, which stay blocked by `needsReview` until an editor clears it. Their imported translations should go in as `in_edit`, not `approved`, so that a person approves them *(added during verification)*.

### 11.2 Order and mapping

| Step | Source | Target | Notes |
|---|---|---|---|
| 1 | `data/images.ts` (`images` registry) | `media` | Rasterize each trusted local SVG with `sharp(svg, { density: 144 }).webp({ quality: 85 })` at 1600 px wide, preserving the ratio (SVG uploads are not allowed). uz alt → `alt` (uz); `translations.ru/en.alt` → `alt` (ru/en); credit per locale; `rightsCategory: 'staff'`, `creator: 'Muomalat'`. Keep a map from `src` to media ID |
| 2 | `data/rubrics.ts` | `rubrics` | ru/en from `translations` |
| 3 | `data/tags.ts` | `tags` | `labels.ru/en` → `label` (ru/en) |
| 4 | `data/authors.ts` | `authors` | `translations` → locales; `isTeam` for `tahririyat` and `hamkorlik`; `commercial` |
| 5 | `data/glossary.ts` | `glossary-terms` | Pass 1 creates; pass 2 sets `related`. RichText converted with `fromMarkup` |
| 6 | `data/institutions.ts`, `data/milestones.ts` | `institutions`, `milestones` | `articleId` resolved in step 8 |
| 7 | `data/articles/*.ts` | `articles` | Pass 1: uz fields as drafts. Pass 2: `translations.ru/en` → locales, with `translation.status = approved` and `translatedBy` / `reviewedBy` = importer. Pass 3: `related`, `about`, and body links to other articles (they need the target to exist). Pass 4: publish with `firstPublishedAt = publishedAt` (mock), `significantUpdateAt = updatedAt`, corrections → `{ kind: 'correction', publicText: text, createdAt: date }`, `views` copied (staging only). `legacyId` = mock ID; `shortCode` generated |
| 8 | — | `institutions.article`, `milestones.article` | Resolve `articleId` through the `legacyId` map |
| 9 | `data/club.ts` | `club-events` | |
| 10 | `data/site.ts` | `site-settings` | Legal values with their `placeholder` flags preserved; telegram handle and URL; `demo.noticeEnabled = true` |
| 11 | code defaults | `navigation`, `ad-slots` (all slots disabled), `home-page` (empty, so the fallback algorithm runs), `editorial-rules` (from `rules.ts`) | |
| 12 | `digestConfig.numberArticleId` | stays in code (LATER: a `digest` field on `home-page`) | Resolve through `legacyId` |

### 11.3 Markup to Lexical (`fromMarkup.ts`)

- **Tokenizer.** Reuse the `TOKEN` regex from `components/ui/InlineText.tsx`:
  - `**x**` → bold text;
  - `*x*` → italic text;
  - `[l](h)` → a link: internal if `h` starts with `/` and resolves to an imported document, custom otherwise;
  - `[[slug|label]]` → inline `glossaryLink`;
  - `{en:x}` → inline `keepLatin`.
- **Body blocks:**
  - `p`, `h2`, `h3` and `list` → native nodes;
  - all other `ArticleBlock` types → block nodes;
  - figure `image.src` → media ID;
  - table `rows` → `data` (tab-separated, numbers in Uzbek format) and `rows`;
  - chart → `data` text in the §3.4 format and `parsed`.

### 11.4 Parity test (`scripts/parity.ts`, also run in CI on staging)

For each locale (`uz`, `kr`, `ru`, `en`), build every view with the mock adapter and with the Payload adapter, then deep-compare them:

- `getArticles` and `getArticle` (sorted by `publishedAt`);
- `getGlossary`, `getInstitutions`, `getMilestones`, `getClubEvents`, `getAuthors`, `getTags`, `getRubrics`;
- `search` for 20 fixed queries.

The comparison ignores `id` (compared through `legacyId`), image `src` (compared through the media map), image `width` and `height` (compared as the aspect ratio, because §11.2 step 1 rasterises at 1600 px and the mock says, for example, 1200 × 800) and `views` in production. Any difference fails the job.

---

## 12. Security hardening checklist (Payload on a VPS)

### 12.1 Before first boot (MUST)

- [ ] `payload` and every `@payloadcms/*` package pinned to the same exact version, ≥ 3.90.2; `npm ci` from the committed lockfile.
- [ ] `scripts/create-first-admin.ts` creates the first admin through the Local API **before** the app is reachable by anyone. The edge rule blocks `/api/users/first-register` and `/admin/create-first-user` permanently (first-register RCE, GHSA-97rh-rhh2-7vjv).
- [ ] Cloudflare Tunnel and the Access application exist before DNS points at the tunnel.
- [ ] Startup guard (`src/payload/startupGuard.ts`): in `SITE_ENV=production` the process exits if any of these holds:
  - `PAYLOAD_SECRET` is shorter than 64 bytes;
  - `ACCESS_JWT_REQUIRED ≠ true`;
  - `cookies.secure ≠ true`;
  - the GraphQL playground is enabled;
  - `DATABASE_URL` uses the owner role;
  - the Telegram channel is wrong (§10.8);
  - `CONTENT_SOURCE=mock`.
  - `admin.autoRefresh === true` (an idle admin tab would stay logged in for ever, §12.2);
  - `auth.cookies.domain` is set (the token cookie must stay host-only);
  - Payload `jobs.autoRun` is configured (jobs would run in the app process, outside any request, §8.4).

### 12.2 Payload configuration (MUST)

```ts
buildConfig({
  serverURL: process.env.CMS_URL,
  secret: process.env.PAYLOAD_SECRET,
  csrf: [process.env.CMS_URL!],               // allow-list; serverURL is added automatically
  cors: [process.env.CMS_URL!],               // never '*'
  graphQL: { disable: true },
  maxDepth: 4,
  defaultDepth: 1,
  telemetry: false,
  upload: { limits: { fileSize: 15_000_000 } },
  cookiePrefix: 'muomalat',                   // auth cookie 'muomalat-token': host-only, Secure, HttpOnly, SameSite=Strict. '__Host-' is not used: it works
                                              // for the token only with secure cookies and no domain, and it stops the admin's
                                              // language and theme cookies from being saved (Phase 0)
  // no `jobs` key: we do not use Payload Jobs (§5.11). If Jobs are ever enabled, set jobs.access.queue/run/cancel
  // explicitly: in 3.90.2 they default to "any logged-in user" (packages/payload/src/config/defaults.ts)
  admin: { user: 'users', meta: { robots: 'noindex, nofollow' } },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL, options: '-c TimeZone=UTC' }, push: false, migrationDir: './src/migrations' }),
  // the session time zone is UTC whatever the server's TZ: offset-less date strings are read in the session zone (§3.1)
  // no prodMigrations: migrations run as the owner role before deploy (§15)
})
```

Users auth:

```ts
auth: {
  tokenExpiration: 1800,          // see "Session lifetime" below; absolute limit 8 h (refresh hook) and the Access session
  useSessions: true,              // revocable sessions; password change ends other sessions (≥ 3.90)
  maxLoginAttempts: 5,
  lockTime: 15 * 60 * 1000,
  cookies: { secure: true, sameSite: 'Strict' },
  forgotPassword: { expiration: 30 * 60 * 1000 },
  useAPIKey: false,               // no API keys; worker uses the Local API in-process
},
access: { unlock: isAdmin, admin: canUseAdmin, create: isAdmin, update: selfOrAdmin, delete: () => false, read: usersRead },
hooks: {
  beforeOperation: [maxSessionAge,       // operation 'refresh': session older than 8 h → 401
                    loginRateLimit],     // operations 'login', 'forgotPassword': per-IP limit → 429 (§12.3)
  beforeLogin: [assertEdgeEmailMatches], afterLogin: [auditLogin, trackCountry], afterLogout: [auditLogout],
  afterError: [auditFailedLogin],        // §9.4
},
```

**Session lifetime** (Phase 0):

- **Renewal.** The admin renews the token only in two cases: the editor navigates or edits a form during the token's last 2 minutes, or clicks "Stay logged in" in the dialog shown 60 s before expiry. Ordinary API calls do not renew it. With `tokenExpiration: 1800`, an idle editor is logged out anywhere between about 2 and 30 minutes after their last action.
- **Idle timeout.** An `admin.components.providers` client provider calls `useAuth().refreshCookie(true)` on key, pointer and scroll events, at most once every 5 minutes. An idle tab is then logged out after 25–30 minutes. This is proposed from the source and not yet run in a live admin.
- `admin.autoRefresh` stays `false`. With `true`, the admin refreshes every token unconditionally, so an idle tab would stay logged in for ever (startup guard, §12.1).
- **Absolute limit.** Payload has none: each refresh extends the session. `maxSessionAge` throws 401 when the current session's `createdAt` is older than 8 h (tested), and the admin treats that as a logout. The Access session (8 h) is the second limit.
- **Expired sessions.** Their rows stay in `users_sessions` until that user's next login or refresh. Anything that lists active sessions filters on `expiresAt > now`.
- **Several tabs.** Each open tab keeps its own timer. A tab that did not refresh still shows the dialog and logs out at its own expiry, losing unsaved form state, even if another tab renewed the cookie. (From the source; not tested.)

**Passwords** (users `beforeValidate`):

- at least 15 characters, with no composition rules (NIST SP 800-63B-4);
- rejected if found in the breached-password list through the k-anonymity range API, sending only a 5-character SHA-1 prefix;
- if the API is unreachable, the password is accepted and the event is logged.

**Edge identity** (`access/edge.ts`):

- verify `Cf-Access-Jwt-Assertion` with `jose` 5.10.0 `jwtVerify` against `createRemoteJWKSet(https://${CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs, { timeoutDuration: 5000, cooldownDuration: 5000–10000 })` ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)), with:
  - `issuer: https://${CF_ACCESS_TEAM_DOMAIN}`;
  - `audience: CF_ACCESS_AUD` (Cloudflare sends `aud` as an array, which jose accepts);
  - `algorithms: ['RS256']`;
  - `requiredClaims: ['exp', 'iat', 'email']`;
  - `clockTolerance: 5`;
- require `type === 'app'`. Access service tokens carry no `email` and are rejected by design;
- a token signed with a new key is refused for at most the cooldown after the last JWKS fetch; then one refetch accepts it. If the JWKS cannot be fetched, the check fails closed and logins stop;
- the `email` claim must equal `req.user.email`, both trimmed and lower-cased;
- check it in `users.hooks.beforeLogin` (a 403 there leaves no session and no failed-login count) and on every request in `withEdge`, with the result cached in `req.context`;
- it cannot be an `auth.strategies` entry: Payload catches strategy errors, so a strategy cannot refuse a request;
- on failure: 403, and audit `auth.edge_mismatch`.
- Prototype and tests: `.spike/auth/access-jwt.ts`, `run-access-jwt.ts` (15 cases, key rotation, JWKS outage).

**Uploads.** As in §3.12: no SVG, no XML, `pasteURL: false`, no `clientUploads`, no `allowRestrictedFileTypes`.

**Phase 2: Access SSO.** A custom `auth.strategies` entry maps the verified Access JWT to the active Payload user with the same email. The local strategy stays enabled only for the break-glass admin. **VERIFY** whether `disableLocalStrategy` can apply per user, or whether a strategy-level check on role is needed. A strategy cannot refuse a request, because Payload catches and logs strategy errors (`payload/dist/auth/executeAuthStrategies.js`). The per-request JWT check therefore stays in `withEdge` in Phase 2 too.

### 12.3 Cloudflare (MUST unless marked)

**Plan: Free at launch, a paid plan after launch** (§1). Every item below works on Free, except those marked as needing a paid plan.

- [ ] **DNS:**
  - only tunnel CNAMEs for `muomalat.uz` and `cms.muomalat.uz`, with no A records pointing to the VPS;
  - DNSSEC enabled, with SUVAN NET submitting the DS record;
  - CAA records for Cloudflare's CAs plus `iodef`. Binding them to a CA account (`accounturi`), as Google advised after the October 2026 ccTLD hijacks ([Google](https://blog.google/security/chromes-response-to-recent-cctld-registry-hijacks/)), is not possible with Universal SSL: Cloudflare serves its own CAA set in place of customer records (CVE-2026-14440), and it issues from its own ACME accounts. Strict binding would need Universal SSL turned off and certificates we control (Advanced Certificate Manager or custom certificates). That is a paid change, not Phase 1;
  - CT monitoring on: Cloudflare CT Monitoring with email alerts switched on (they are off by default), plus an external CT monitor.
- [ ] **Access application on `cms.muomalat.uz`:**
  - the policy allows only the `staff` email group;
  - identity provider: Google Workspace with 2-step verification enforced as "security key only"; Cloudflare's email one-time PIN login is disabled. Access cannot verify Google's "security key only" setting, because its IdP MFA check covers only Okta, Entra ID and generic OIDC or SAML. So "Use identity provider MFA" stays off;
  - Independent MFA: the Cloudflare docs name no plan. Check the dashboard on our Free organisation: Zero Trust → Access controls → Access settings → "Allow multi-factor authentication (MFA)".
    - If the setting is there: enable it; set the cms application to Custom MFA settings with `allowed_authenticators: ["security_key", "biometrics"]` (no `totp`) and an authentication duration of 8 h or less; optionally add an AAGUID allow-list.
    - If it is missing on Free, the requirement stays and the identity provider carries it. Staff sign in to Access only through Google Workspace, whose 2-step verification is enforced as "security key only" (§12.9). Access cannot check that policy, so it is a Workspace admin-console control: only super-admins can change it, and it is checked monthly. The Payload password stays as the second login. WebAuthn inside Payload (a security key on the Payload account itself) is LATER. Check the dashboard again when the paid plan starts.
    - Either way, enrolment follows §4.4: the first authenticator is enrolled without a second factor, in front of an admin;
  - session duration 8 h;
  - `/admin`, `/api`, `/preview` and site routes all covered.
- [ ] **WAF custom rules on `muomalat.uz`:**
  - block `/admin*`;
  - block `/api/*` except `GET /api/media/file/*`;
  - block `/preview*`, `/exit-preview*`, `/internal/*`.
- [ ] **Both hosts:** block `/internal/*`, `/api/users/first-register` and `/admin/create-first-user`.
- [ ] **Rule budget:** the Free plan allows 5 WAF custom rules and no regex (the `matches` operator needs Business). Combine the blocks above with `or` into at most five rules, using `starts_with()` or `wildcard`.
- [ ] **Rate limiting.** On the Free plan the limits that matter are enforced in the app. The single Free rule adds an edge layer where it helps most.
  - Plan limits, checked 9 October ([Cloudflare](https://developers.cloudflare.com/waf/rate-limiting-rules/)):
    - the Free plan has **one** rule, counting by IP over a fixed 10-second window with a 10-second block;
    - a Free rule can match only on the path (and Verified Bot), not on method, host or headers;
    - Pro has two rules, with windows of up to 1 minute and blocks of up to 1 h. Pro matches host, URI, path, full URI, query and Verified Bot, but not method or headers: method needs Business, headers need Enterprise;
    - on Free and Pro, requests served from cache count toward the limit, and a challenge action throttles without a block duration.
  - **In the app (MUST, Phase 1).** `src/lib/rateLimit.ts` keeps fixed-window counters in the memory of the app process; there is one app container (§15).
    - Keys: the client IP from `cf-connecting-ip`, which Cloudflare sets because the Tunnel is the only way in; the digest sign-up also counts per email address. The per-account login limit is Payload's own lockout (below).
    - Counters are never written to the database, so no IP address is stored (§3.14). A restart resets them, which is acceptable.
    - Proposed limits, tuned later from the audit log and Security Events:
      - **Login** (`loginRateLimit` in users `beforeOperation` for `login` and `forgotPassword`, §12.2): 10 attempts per 15 min per IP, then 429 with the generic login error. Per account, Payload's lockout applies: 5 failures lock the account for 15 min (`maxLoginAttempts`, `lockTime`), and `forgotPassword.minRequestInterval` spaces reset emails;
      - **The four public forms** (contact, advertising, club application, digest sign-up; their server actions, §8.6): 5 submissions per 10 min per IP for each form. The digest sign-up also allows at most 3 confirmation emails per address in 24 h, so the form cannot flood someone's inbox. Over a limit, the action returns `rate_limited` and writes nothing;
      - **Search** (`qidiruv`, §8.6): 30 queries per minute per IP. Over the limit, the page shows the empty state with a "try again in a minute" note and runs no query.
    - Many mobile readers in Uzbekistan share an IP address behind carrier NAT. The per-IP limits therefore stay generous, and the strict limits are the ones that protect one person: login attempts per account and emails per address.
  - **Free rule (launch).** The one rule covers the public paths whose requests reach the origin: the four form pages, whose server actions post to the page path, and the search page, in every edition.
    - It counts GET requests and cached responses too, so set the limit above normal browsing, for example 10 per 10 s per IP. Tune it from Security Events.
    - The login endpoints get no edge rule, because `cms.muomalat.uz` is reachable only after Cloudflare Access.
  - **After launch (paid plan: Pro, or Galileo if accepted):**
    - server actions: 10 per minute per IP, then a managed challenge. Pro cannot match `POST` or the `Next-Action` header, so this rule is path-based, as on Free;
    - `POST /api/users/login` and `/api/users/forgot-password` on `cms.muomalat.uz`: 5 per minute per IP.
    - The app-level limits stay. The edge rules only stop excess requests before they reach the VPS.
  - Payload has no IP rate limiting of its own. It has per-account lockout (`maxLoginAttempts`) and, since 3.90.0, a per-account forgot-password interval (`forgotPassword.minRequestInterval`, default 15 s).
- [ ] **Cache rules:** §8.4. `cms.muomalat.uz` bypass.
- [ ] **TLS:** Always Use HTTPS; minimum TLS 1.2; HSTS (1 year, `includeSubDomains`; preload LATER).
- [ ] **Bot handling:** Bot Fight Mode off, or confirmed not to block the `TelegramBot` preview crawler (check Security Events). WAF custom rules and Page Rules cannot bypass Bot Fight Mode, so if it blocks the crawler, the only fix is to turn it off. Its JavaScript Detections script is served from the same origin (`/cdn-cgi/challenge-platform/`) and fits `script-src 'self'`.
- [ ] **Accounts:** at most two Cloudflare super-admins, each with security keys.
- [ ] **API tokens:** `CF_API_TOKEN` scoped to Zone → Cache Purge on this zone only. The tunnel token is stored only in the `cloudflared` environment file.
- [ ] P1: apply to Project Galileo, through a partner organisation or Cloudflare's form. The form asks for nonprofit status, so a commercial outlet's eligibility is unverified (CMS-RESEARCH §3.2, "Free DDoS programmes"). Google Project Shield is a fallback, not an addition: it would replace Cloudflare in front of the site.

### 12.4 Next.js headers (MUST)

The CSP is static, with no nonces, so pages stay cacheable (local Next CSP guide). The inline theme script and Next's inline scripts need `'unsafe-inline'` for scripts. The protection comes from blocking framing, objects, `base-uri` hijacks and every third-party origin.

```ts
// next.config.ts headers(), host-matched
const sitePolicy = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self'", "connect-src 'self'", "object-src 'none'",
  "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "upgrade-insecure-requests",
].join('; ')
// Site host: CSP above + HSTS + X-Content-Type-Options: nosniff + Referrer-Policy: strict-origin-when-cross-origin
//            + Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
// CMS host:  separate CSP tested against the admin UI (allows 'unsafe-inline' scripts/styles, blob:, frame-src 'self'
//            for live preview, frame-ancestors 'self'), + X-Robots-Tag: noindex, nofollow, + Cache-Control: no-store on /admin
```

- [ ] LATER: evaluate `experimental.sri` and hashing the theme script, to drop `'unsafe-inline'` for scripts.
- [ ] `/.well-known/security.txt` with `site-settings.policies.securityContact`.

### 12.5 Server and Docker (MUST)

- [ ] **Operating system:** Ubuntu LTS with `unattended-upgrades` (security updates only) and automatic reboots in a window.
- [ ] **SSH:**
  - keys only (preferably `sk-ssh-ed25519` on a FIDO key), one key per person, no root login, no passwords;
  - reachable through the Cloudflare Tunnel SSH app, or restricted to known addresses;
  - fail2ban only if SSH stays public.
- [ ] **No ports:** no container publishes ports to the host; the host firewall default-denies inbound. Docker ports would bypass UFW ([Docker docs](https://docs.docker.com/engine/network/packet-filtering-firewalls/)).
- [ ] **Containers:**
  - run as non-root (`user: "1001:1001"`);
  - `read_only: true` with `tmpfs: /tmp`;
  - `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`;
  - memory limits;
  - no `docker.sock` mount;
  - writable volumes only for `media`, `next-cache` and `pgdata`.
- [ ] **Postgres:** not published; app and worker use `muomalat_app` (DML only); migrations use `muomalat_owner`; `pg_hba` allows only the Docker network; `scram-sha-256`.
- [ ] **Images:**
  - built in CI (GitHub Actions), never on the VPS;
  - deployed by digest;
  - the base image pinned by digest, with a monthly rebuild.

### 12.6 Secrets (MUST)

- [ ] **Storage:** root-owned `0600` environment files per service (`/etc/muomalat/*.env`), or Docker secrets; never in git. An encrypted copy (sops or age) is kept in the private ops repository for recovery.
- [ ] **Separation:** separate secrets for staging and production.
- [ ] **Rotation:**
  - `PAYLOAD_SECRET` when someone with server access leaves (this logs everyone out);
  - the bot token through BotFather `/revoke` after any suspected exposure;
  - the Cloudflare token yearly.

### 12.7 Backups and restore (MUST)

- [ ] **Database:** nightly `pg_dump -Fc`, encrypted with `age` (public key on the server, private key offline), uploaded to EU object storage with **object lock** (30 days) using credentials that can only write.
- [ ] **Media:** daily `restic` backup to the same storage.
- [ ] **Retention:** 30 daily, 12 weekly, 12 monthly.
- [ ] **Second copy:** a monthly copy at a second provider or account. Hostinger snapshots are not a backup.
- [ ] **Restore drill:** monthly, to a scratch VM (`scripts/restore-drill.md`), recording the time taken (RTO, target 4 h) and the data lost (RPO, 24 h in Phase 1; 15 min in Phase 2 with WAL archiving through `wal-g`).
- [ ] **Monitoring:** the backup container writes `ops.backup_ok` or `ops.backup_fail` to the audit log; a missing success by 06:00 raises an alert.

### 12.8 Dependencies and patching (MUST)

- [ ] `.npmrc`: `min-release-age=3`. Override with `--min-release-age=0` only for a reviewed security release.
- [ ] Renovate with `minimumReleaseAge: "3 days"`, grouping all `@payloadcms/*` packages with `payload`.
- [ ] Watch the GitHub releases and security advisories of `payloadcms/payload` and `vercel/next.js`.
- [ ] Patch policy:
  - critical: within 48 h;
  - high: within 7 days;
  - others: the weekly window.

  Every upgrade: back up → `payload migrate` (owner role) → deploy → run the smoke tests (§16, group K).
- [ ] CI runs `npm audit --omit=dev`, the typecheck, `npm run validate`, the unit and integration tests, and the `overrideAccess` lint.

### 12.9 Accounts outside the CMS (MUST)

- [ ] **Security keys:** two FIDO2 keys per person.
- [ ] **Google Workspace:** 2-step verification set to "security key only" for all staff.
- [ ] **Hardware-key MFA** on Cloudflare, the Hostinger panel, the registrar (SUVAN NET), GitHub and the bank.
- [ ] **Domain:** renew muomalat.uz for several years, with auto-renew. Ask SUVAN NET about transfer and update locks.
- [ ] **Email authentication:** SPF `-all`, DKIM, and DMARC moving from `p=none` to `p=reject` with `rua` reports.
- [ ] **Telegram channel:**
  - the owner is a dedicated account on a company-held SIM in a dedicated phone used for nothing else;
  - it has a 2-step verification password, a recovery email on the hardened Workspace, and a passkey;
  - at most one break-glass admin holds `can_promote_members`;
  - staff admins can only post and edit (no `add_admins`, no `change_info`);
  - active sessions are reviewed monthly;
  - no files or APKs are opened on admin phones;
  - a backup channel name is reserved.

### 12.10 Read-only mode and incident playbooks

- **Read-only mode.** Either `CMS_READ_ONLY=1` (environment, survives a compromised database) or `site-settings.operations.readOnly`.
  - Effects: `withEdge` denies every create, update and delete, except an admin changing `site-settings.operations`. The worker pauses Telegram posting and the scheduler. The admin shows a red banner. The public site keeps serving from cache.
- **Fastest lock-out:** remove everyone from the Access policy group **and** revoke existing tokens (Access → Applications → cms → "Revoke existing tokens", or per user).
  - Removing users from the group is not enough on its own. Access re-checks policies only when the application token expires, which can be up to the 8 h session.
  - Revoked tokens stop working in about 20–30 s, and users cannot log in again for up to a minute ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)).
  - Payload's own Access-JWT check does not notice a group removal either. For a single person, also set `active = false` in Payload.
- **Playbooks** (`docs/runbooks/`, LATER as files; Phase 1 as one page each, in Uzbek and Russian):
  - CMS account hijacked;
  - fake story published;
  - homepage defaced;
  - Telegram channel hijacked;
  - DDoS;
  - VPS compromise or ransomware;
  - domain hijack;
  - embargo broken early;
  - personal-data breach.

  Each one covers:
  - who decides;
  - read-only mode;
  - revoking credentials (Access sessions, Payload sessions through `useSessions`, bot token `/revoke`, Cloudflare tokens);
  - rolling back through versions;
  - capturing evidence (export the audit log; **screenshot Telegram's "Recent actions" at once**, since it is kept only about 48 h (Telegram's own announcement says 48 h; it was written for groups);
  - public notices in four languages (`site-settings.emergency`);
  - a correction-note template;
  - contacts: Cloudflare, Telegram support, UZCERT, a digital-security helpline, counsel.

---

## 13. Personal-data handling

These rules follow CMS-RESEARCH §4.3: the 2026 law allows EU storage, and the general duties still apply.

### 13.1 Inventory

| Collection | Data | Purpose | Basis | Retention (proposal; ask counsel) | Who can read |
|---|---|---|---|---|---|
| `users` | Name, email, role, login country, declared interests | Staff accounts, security, conflicts | Employment, consent | Active + 1 year after offboarding; the account is then anonymised except the name (audit snapshots keep the name) | Admin; self; the editor-in-chief (names, roles, interests) |
| `digest-subscribers` | Email, locale | Weekly digest | Consent (double opt-in) | Pending: deleted after 7 days. Unsubscribed: deleted after 30 days (a SHA-256 of the email is kept on a suppression list) | Admin |
| `club-applications` | Name, company, sector, size, phone, email, interests, message | Club membership, events | Consent | 24 months after the last activity; declined applications after 6 months | Commercial, editor-in-chief, admin |
| `contact-messages` | Name, email, URL, message | Answer the sender; route tips and corrections | Consent | 24 months; correction-related messages are kept with their `requests` item | By topic (§3.14) |
| `advertising-requests` | Name, company, email, phone, message | Sales | Consent | 12 months; 3 years if converted (Art. 15 covers contracts) | Commercial, editor-in-chief, admin |
| `requests` | Requester's name and contact | Art. 34 duties | Legal obligation | 3 years after the decision | Editors, editor-in-chief |
| `audit-log` | Staff IP addresses, country | Security | Legitimate interest | 5 years; IP truncated after 90 days | Editor-in-chief, admin |

The `retainUntil` fields are set by hooks. The worker's nightly `retention` job deletes or anonymises expired records and writes `pd.retention_purge`.

### 13.2 Consent and notice

- **Versioned texts.** Every form shows a notice and a consent text from `src/i18n/messages/privacy.ts`, versioned with a constant (e.g. `CLUB_CONSENT = 'club-2026-10-v1'`) and written in uz, ru and en, with kr generated by transliteration. The notice states:
  - the controller (the founder's company);
  - the purpose;
  - the retention period;
  - storage in the EU (Lithuania);
  - the processors (hosting, email provider, Cloudflare);
  - the rights to withdraw consent and ask for deletion;
  - the responsible person (`site-settings.policies.personalDataOfficer`).
- **What is stored.** The server action stores `consent.textVersion`, `locale` and `at`. A text change gets a new version, and old records keep theirs.
- **Privacy policy.** It lives at `/maxfiylik` (a new standing page), generated from the same texts.

### 13.3 Rights requests

- **Request route.** `/maxfiylik#sorov` (form) or email to the responsible person. Form requests are verified by an emailed link.
- **Handling.** The admin handles the request in the CMS: find the person by email across the four collections, export or delete, and log `pd.export` or `pd.delete`.
- **Internal target:** within 10 working days *(proposal)*.
- **Unsubscribe** is one click from every digest email, through a tokenised link.

### 13.4 Passing data to third parties

- **Default: none.** Club lists are never shared with sponsors without separate written consent.
- **Export action.** Any export of personal data goes through an admin-only action. It requires a legal basis and a recipient, and it creates a task to notify the people concerned **within 3 days** (Art. 23), with an email template.
- **Processors.** Email provider and hosting are processors named in the notice. Whether Art. 23 notice applies to processors is an open question for counsel.

### 13.5 Access and exposure

- **Not in shared lists.** Personal-data collections are hidden from the admin navigation of roles that cannot read them (`admin.hidden` by role).
- **Logged reads.** `pd.read` is logged for single-document reads.
- **Not on public pages.** No personal data appears on public pages, and none goes into the public site's cache. Form responses never echo stored data.
- **Not to the newsroom** (the Bloomberg terminal lesson). Reporters and editors cannot read subscriber or club data.
- **No location data in images.** Staff phone photos can carry GPS coordinates, which are personal data. Every upload is re-encoded without metadata, including through the admin's crop and focal-point editor (§3.12; test K4).

### 13.6 Breach procedure

1. Contain the breach (§12.10), capture evidence, and assess what data was exposed.
2. For any leak of data stored abroad, which means all of ours: a preliminary report to the authorised body **within 24 hours** and a detailed report **within 72 hours** (resolution 415, para 4).
   - Resolution 415 (para 3) names the Ministry of Internal Affairs' Migration and Personalisation Department as that body.
   - Art. 8 of the Personal Data Law still names the State Personalization Centre.
   - Counsel confirms the recipient before launch. Until then, the runbook sends to the Department named in resolution 415.
3. Notify the affected people where there is risk to them, using an email template in four languages.
4. Assess whether ZRU-764 reporting to the State Security Service also applies.

### 13.7 Keeping the data movable

The personal-data collections can be moved to an Uzbek host without touching the newsroom side, because:

- server actions call only `createSubmission(kind, data)` and `findPersonalData(email)` in `src/content/personal-data.ts`;
- no editorial collection has a relationship to a personal-data collection (`requests` stores requester details itself);
- the consent and retention logic lives in that module.

If counsel or the law requires local storage, an alternative implementation writes to a small Postgres or HTTP service on an Uzbek host (Ahost, UZINFOCOM).

Gap noted during verification: `requests` also holds personal data (`requesterName`, `requesterContact`) and is not in the movable set. If local storage becomes mandatory, move those two fields into a fifth movable collection. `requests` then keeps only an opaque reference as a text field, not a Payload relationship, so the rule above still holds.

---

## 14. Local development

### 14.1 `docker/compose.dev.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine            # pin by digest in the file
    environment:
      POSTGRES_DB: muomalat
      POSTGRES_USER: muomalat_owner
      POSTGRES_PASSWORD: dev-owner-password
    ports: ["127.0.0.1:5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro   # creates muomalat_app + grants, muomalat_test DB
  mailpit:
    image: axllent/mailpit:<pinned>
    ports: ["127.0.0.1:8025:8025", "127.0.0.1:1025:1025"]
volumes: { pgdata: {} }
```

The dev container sets `TZ: Asia/Tashkent`, so its Postgres session time zone is Tashkent by default. The Payload pool pins `TimeZone=UTC` (§12.2), so offset-less date strings are never read as Tashkent time.

### 14.2 `.env.example` (development values)

```
SITE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
CMS_URL=http://cms.localhost:3000
SITE_HOST=localhost:3000
CMS_HOST=cms.localhost:3000
DATABASE_URL=postgres://muomalat_app:dev-app-password@127.0.0.1:5432/muomalat
DATABASE_URL_MIGRATE=postgres://muomalat_owner:dev-owner-password@127.0.0.1:5432/muomalat
PAYLOAD_SECRET=<openssl rand -base64 64>
ACCESS_JWT_REQUIRED=false          # dev only; startup guard refuses this in production
INTERNAL_APP_URL=http://localhost:3000
INTERNAL_REVALIDATE_SECRET=<openssl rand -base64 32>
MEDIA_DIR=./.data/media
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
MAIL_FROM=dev@muomalat.local
CONTENT_SOURCE=payload
# TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL: staging test bot and private channel only
```

Browsers resolve `*.localhost` to loopback, so `cms.localhost:3000` (admin) and `localhost:3000` (site) exercise the host rules locally.

### 14.3 Commands (new `package.json` scripts)

| Command | Does |
|---|---|
| `docker compose -f docker/compose.dev.yml up -d` | Postgres and Mailpit |
| `npm run payload -- migrate` | Apply migrations (uses `DATABASE_URL_MIGRATE`). In development, Payload's `push` may be used instead; commit migrations with `npm run payload -- migrate:create <name>` |
| `npm run admin:create` | `tsx scripts/create-first-admin.ts --email … --role admin` |
| `npm run seed:dev` | `tsx scripts/import-mock.ts --all` (refuses in production) |
| `npm run dev` | Site at `http://localhost:3000`, admin at `http://cms.localhost:3000/admin` |
| `npm run worker` | `tsx src/worker/index.ts` (scheduler, outbox; Telegram only if the test token is set) |
| `npm run generate:types` | `payload generate:types` → `src/payload-types.ts` |
| `npm run test` | Vitest unit and integration (against the `muomalat_test` database) |
| `npm run test:e2e` | Playwright against `npm run build && npm start` with a seeded database |
| `npm run parity` | §11.4 |
| `npm run validate` | Existing script (mock), or `-- --source=payload` |
| `CONTENT_SOURCE=mock npm run dev` | Front-end work without a database |

### 14.4 Test users (development and staging only)

The seed creates one user per role:

- `reporter@muomalat.local`
- `editor@…` and `editor2@…`
- `eic@…`
- `commercial@…`
- `admin@…`

All have long random passwords printed once. Each reporter is linked to a mock author.

---

## 15. Deployment (production)

- **Services in `docker/compose.prod.yml`:**
  - `cloudflared` (tunnel token);
  - `app` (`node server.js` from the standalone output, on port 3000, internal only);
  - `worker` (same image, `node dist/worker.js`);
  - `postgres:17`;
  - `backup` (cron: `pg_dump`, `age`, `restic` or `rclone`);
  - `migrate` (a one-off with `DATABASE_URL_MIGRATE`, which runs `payload migrate` and re-applies the grants).
- **Volumes:** `pgdata`, `media`, `next-cache` (the Next ISR cache survives restarts; losing it is harmless).
- **Release steps:**
  1. CI builds and pushes the image to GHCR and records its digest.
  2. On the VPS:
     1. `backup run-now`
     2. `docker compose pull`
     3. `docker compose run --rm migrate`
     4. `docker compose up -d app worker`
     5. run the smoke tests (§16 group K)
     6. watch the alerts for 15 minutes
- **Rollback:**
  - redeploy the previous digest;
  - prefer forward-fix migrations;
  - restore from the pre-release dump only if a migration damaged data.
- **Staging:**
  - a second, smaller VPS or a second compose project with its own database, Access app, Telegram test bot and test channel;
  - staging hostnames are first-level subdomains, for example `staging.muomalat.uz` and `cms-staging.muomalat.uz`. On the Free plan Universal SSL covers only the apex and first-level subdomains, so `cms.staging.muomalat.uz` would get no edge certificate without Advanced Certificate Manager (paid);
  - staging in the same Cloudflare account shares production's purge budget (§8.4). A separate account for staging avoids that;
  - staging holds the imported mock articles;
  - production never does.

---

## 16. Acceptance tests

Automate everything marked (I) as a Vitest integration test, which runs the Local API against a real Postgres with each role's user. Tests marked (E) are Playwright end-to-end tests. Tests marked (M) are a manual checklist run before go-live. **Every test must pass before launch.**

### A. Access and roles

- **A1 (I)** An anonymous REST `GET /api/articles` (cms host) → 403 or an empty result; it never returns drafts.
- **A2 (E)** On the public host, `GET /admin` and `GET /api/articles` → 404; `GET /api/media/file/<published image>` → 200.
- **A3 (I)** The public Local API read (no user, `overrideAccess: false`) returns only published articles and never the fields `editorNotes`, `sourceNotes`, `changeNote`, `approvedBy`, `sponsored.contractRef` or `validationWarnings`.
- **A4 (I)** A reporter cannot read an embargoed or `legallySensitive` draft that is not theirs. They can read a colleague's ordinary draft but cannot update it.
- **A5 (I)** Commercial cannot read any editorial draft. Commercial can create an article, and it is saved with `sponsored.enabled = true` and the commercial byline, whatever was sent.
- **A6 (I)** Admin cannot update or publish any article, and cannot read drafts.
- **A7 (I)** A disabled user (`active = false`) with a valid session gets 403 on every request.
- **A8 (I)** Only an admin can change `role` or `active`. A user updating their own `role` gets an error, not a silent no-op.
- **A9 (I)** `POST /api/users/unlock` by a non-admin → 403 (CVE-2026-11779 override).
- **A10 (I)** A REST request with a valid Payload cookie but no `Cf-Access-Jwt-Assertion`, or with a JWT for a different email, → 403 and an `auth.edge_mismatch` audit row (with `ACCESS_JWT_REQUIRED=true`).
- **A11 (I)** Personal-data collections: reporters and editors cannot read `digest-subscribers` or `club-applications`. Commercial cannot read `contact-messages` with topic `tuzatish`.
- **A12 (CI)** The lint finds no Local API call without an explicit `overrideAccess`.

### B. Workflow and the two-person rule

- **B1 (I)** A reporter cannot publish or unpublish. These attempts are each rejected with an error:
  - through REST (`PATCH {_status:'published'}`, a `POST` with `_status: 'published'`, `?publishSpecificLocale=ru`);
  - through the Payload Publish and Unpublish calls;
  - through a plain `PATCH {_status:'draft'}`, `?draft=false`, or a PATCH with neither `draft` nor `_status` on a live story;
  - through `restoreVersion` without `draft: true`;
  - through the transition endpoint.

  The reporter's draft saves and autosave on a published story still succeed.
- **B2 (I)** An editor who is an author of the story cannot approve it or first-publish it.
- **B3 (I)** An editor who submitted the story (`submittedBy`) cannot approve it, even when not listed as an author.
- **B4 (I)** Approve by editor A, then an edit by reporter R → status returns to `in_edit` and the approval is cleared. Publishing then fails.
- **B5 (I)** Approve by editor A, then an edit by A → the approval stands with a refreshed hash, and A can publish.
- **B6 (I)** A story with `needsLegal = required` cannot be approved. With `complete` set by the editor-in-chief, it can be published only by the editor-in-chief (¬author).
- **B7 (I)** A sponsored story can be published only by the editor-in-chief; an editor attempt fails.
- **B8 (I)** Urgent path: an editor-author publishes a short `yangiliklar` item with an official-domain source → it succeeds, `secondRead.required` is true and an alert is sent. The same attempt without an official source, or by a reporter, fails.
- **B9 (I)** An overdue second read (time mocked to +31 min) escalates to the editor-in-chief.
- **B10 (I)** `in_edit → draft` without a comment fails; with one, it notifies the author.
- **B11 (I)** A PATCH that changes `workflowStatus` directly, without the transition endpoint, is rejected.
- **B12 (I)** Every transition appends to `workflowHistory` and writes `workflow.transition` to the audit log.
- **B13 (I)** A transition that does not publish (for example "Tahrirga olish") on a published story with a pending draft leaves the story published with its live content.
- **B14 (I)** On a published story, restoring a published version without "as draft" is rejected; "Restore as draft" creates a draft and leaves the live content unchanged.
- **B15 (I)** "Publish in <locale>" (`publishSpecificLocale`) is rejected for every role.
- **B16 (I)** Restoring a `home-page` version that references a sponsored or unpublished article fails (HOME-1, HOME-2), and so does a global restore by a role that may not publish that global. A permitted restore writes an audit row.

### C. Changes after publication and corrections

- **C1 (I)** Publishing a change to a published story without `changeNote.kind` fails.
- **C2 (I)** Changing "4,5 mlrd" to "5,4 mlrd" in the body with kind `minor` fails (N-1). With kind `correction` and a new correction item, it succeeds.
- **C3 (I)** A correction by an author-editor fails; by another editor, it succeeds.
- **C4 (I)** Removing or reordering an existing correction item fails for every role. Changing its text fails for an editor, succeeds for the editor-in-chief within 30 minutes (audited with before and after), and fails after 30 minutes.
- **C5 (I)** After a correction, the article view shows it (`corrections[]` with date and text), JSON-LD has a `CorrectionComment`, `dateModified` equals the correction time, and the public corrections list includes it.
- **C6 (I)** After a correction, an approved ru translation becomes `outdated`, and `/ru/...` serves the Uzbek original with `contentLang: 'uz'` until the translation is re-approved.
- **C7 (I)** Kind `update` sets `significantUpdateAt`; kind `minor` does not.
- **C8 (I)** Withdrawal by an editor fails; by the editor-in-chief without a public notice it fails; with a notice it succeeds. The page then renders only the notice and is gone from lists, RSS, sitemap and search.
- **C9 (I)** A Payload Unpublish on an article published more than 15 minutes ago fails for every role. Within 15 minutes, it succeeds for the editor-in-chief with a reason.
- **C10 (I)** Moving a published article to trash, or deleting it, fails for every role, including admin.
- **C11 (I)** On a story published more than 15 minutes ago, a plain `PATCH {_status:'draft'}`, `?draft=false`, and a PATCH with neither `draft` nor `_status` (with a newer draft) are each rejected as unpublish attempts for every role.

### D. Sponsored content

- **D1 (I)** An editorial story with a commercial author fails, and so does a sponsored story with an editorial author.
- **D2 (I)** A sponsored `investment_securities` story without a licence number, a risk warning or key terms cannot be published.
- **D3 (I)** A sponsored body containing "yillik 24% daromad" ("24% annual income") cannot be published (SP-5).
- **D4 (I)** `home-page.lead` set to a sponsored article fails validation (HOME-1).
- **D5 (I)** Sponsored articles never appear in `getMostRead`, `getRelated` or the homepage lead and secondary slots, whatever `featured` says.
- **D6 (E)** A published sponsored page shows the label from settings, which contains "Reklama", plus the risk warning. RSS prefixes the title with the same label. JSON-LD `@type` is `AdvertiserContentArticle`.
- **D7 (I)** A published sponsored article cannot be deleted before `retainUntil`, and `sponsored.enabled` cannot be cleared.
- **D8 (I)** Saving settings with a sponsored label missing "Reklama" fails (SP-7).

### E. Embargo and scheduling

- **E1 (I)** Publishing while `embargo.until` is in the future fails. Scheduling for before `until` fails. Scheduling at or after `until` succeeds.
- **E2 (I)** An embargo with a past date, or on a published article, fails.
- **E3 (I)** The scheduler publishes a `scheduled` story at `scheduledAt` (clock mocked) as `scheduledBy`, and runs every §5.3 check.
- **E4 (I)** A story edited after scheduling by someone other than the approver drops back to `in_edit`. If the edit came through a path that skipped that hook, the scheduler run fails on the hash and alerts.
- **E5 (I)** The scheduler fails closed if `scheduledBy` has been disabled.
- **E6 (I)** No Telegram post or newsletter inclusion for an embargoed story.
- **E7 (E)** The list view shows the embargo badge with Tashkent and UTC times.
- **E8 (E)** While an embargo is active, the edit view's browser tab title starts with "EMBARGO · ", and the list shows the badge in front of the title.

### F. Localization

- **F1 (I)** Local API reads use `fallbackLocale: false`: an empty ru title stays empty in the raw document.
- **F2 (I)** `/ru/<rubric>/<slug>` with a ru translation whose status is `in_edit` serves the Uzbek text with `lang="uz"` and a canonical pointing to Uzbek. The sitemap omits the ru URL.
- **F3 (I)** Approving a translation by its own translator fails.
- **F4 (I)** Editing an approved ru translation sets it to `in_edit`, unless the reviewer makes the edit.
- **F5 (I)** `/kr` output equals `deepCyrillic` of the uz view, with any `kr.*` overrides applied. A `kr.title` containing Latin words fails (ART-26).
- **F6 (I)** Media alt in a ru story comes from the ru alt; in an untranslated story shown on `/ru`, it stays uz (today's rule).
- **F7 (I)** `machine_draft → approved` without passing through `in_edit` fails.
- **F8 (M)** All field labels and help texts are in Uzbek with the correct ʻ and ʼ characters.
- **F9 (I)** Editing the ru tab, including through a hook that makes a nested Local API call, leaves every uz value unchanged (regression test for payloadcms#18246).
- **F10 (I)** A ru save that drops a correction row, or sends one without its id, is rejected, and the uz `publicText` is unchanged.
- **F11 (I)** The built-in Copy to locale is not offered. The custom copy action fills only empty fields (an empty Lexical body counts as empty), saves a draft, sets `translation.status` to `in_edit`, and never copies `translation.*`.
- **F12 (E)** With the browser in Europe/Berlin, the embargo picker shows and saves Tashkent time (09:00 Tashkent is stored as 04:00Z).

### G. Validation

- **G1 (I)** Every rule in §7.2 has a unit test with one passing and one failing example.
- **G2 (I)** `scripts/validate-content.ts` output on the mock data is byte-identical before and after the move to `rules.ts`.
- **G3 (I)** A body with "o'z" (wrong apostrophe) blocks publishing with an error at the right field path. The one-click fix replaces it with "oʻz".
- **G4 (I)** A banned religious term blocks publishing in any collection.
- **G5 (I)** A figure whose media has no uz alt, a `rightsCategory` of `unknown`, or an expired `usableUntil` blocks publishing.
- **G6 (I)** A chart or table without a source blocks publishing. Table rows with the wrong length block publishing.
- **G7 (I)** In demo mode, a real organisation name gives a warning. With demo mode off and the institution untagged, it gives the "tag it?" warning.
- **G8 (I)** Warnings never block publishing and are stored with the version.
- **G9 (I)** The SET-1 launch gate: turning off the demo notice while a legal field is still a placeholder fails.
- **G10 (I)** A slug change after publication creates a redirect, and the old URL answers with a permanent redirect to the new one.
- **G11 (I)** A REST write of a body that contains a Lexical `quote`, `upload` or `horizontalrule` node is rejected on every save. A body with a `javascript:` or `http:` link, a nested list or `listType: 'check'` saves as a draft with findings, and cannot be published.

### H. Delivery, revalidation, RSS, sitemap

- **H1 (I)** Every mock article survives the round trip `serialize(fromMarkup(markup)) === markup` for every RichText field.
- **H2 (E)** After a first publication, the new article is reachable at its URL in all four editions within 30 s, without a rebuild, and appears on the home page, its rubric page, RSS and the sitemap.
- **H3 (E)** After a correction, the public URL (through Cloudflare, on staging) shows the correction within 60 s. The outbox event is `done`, and the Cloudflare purge call was made for that article's prefixes.
- **H4 (I)** Changing an author's bio invalidates `author:<slug>` and `articles`, and the article pages show the new byline data.
- **H5 (I)** A scheduled publication run by the worker invalidates the caches through `/internal/revalidate`. A request without a valid HMAC, with an old timestamp, or carrying `cf-connecting-ip` gets 403.
- **H6 (E)** Draft preview works on the cms host in all four editions, including `/kr`, with the "KOʻRIB CHIQISH" banner and `noindex`. `/preview` on the public host returns 404.
- **H7 (I)** RSS excludes withdrawn and `noindex` items and keeps a stable `guid` across slug changes.
- **H8 (E)** `/t/<code>` answers 301 to the canonical URL with the UTM parameters. An unknown code returns 404.
- **H9 (I)** The parity test (§11.4) passes on staging.
- **H10 (E, Option A only)** While an editor repeatedly loads a draft preview, concurrent anonymous requests for the same article and for an un-prerendered article never receive draft content. `/uz/…` and `/ru/…` responses for the same cached list function differ (Next advisories GHSA-3w37-wq28-93x7 and GHSA-h694-7cp9-m8p3).
- **H11 (E)** After a change to an article, its uz OG image is fresh both at `/uz/<r>/<s>/opengraph-image` and at the public path, even after either form was regenerated at runtime. `/rss.xml` is fresh as well.
- **H12 (E)** An unknown slug returns 404 on the first request, with a browser user agent and with Googlebot's. Its `opengraph-image` returns 404 too.
- **H13 (I)** A change made from a script or the worker (no request scope) is invalidated through the outbox and `/internal/revalidate`. A restart of the app between the change and its processing still leaves the page fresh.

### I. Telegram (Phase 2)

- **I1 (I)** A post cannot be approved by the article's author or by the person who requested it.
- **I2 (I)** An approved post is sent after `delayMinutes`. Cancelling inside the window prevents sending.
- **I3 (I)** The caption counter counts UTF-16 units after removing HTML tags and decoding entities. A caption of 1,025 such units is rejected; a caption of 1,024 visible units plus `<b>` tags is accepted.
- **I4 (I)** The sponsored template's first line is "Reklama", and it cannot be removed.
- **I5 (I)** A correction produces an `edit_pending` caption edit and, for kind `correction`, a reply post that references the original `message_id`.
- **I6 (I)** Withdrawal of a post older than 48 h edits the caption to a retraction and creates a manual-deletion task; it does not call `deleteMessage`.
- **I7 (I)** If the bot's rights include anything beyond post, edit and delete, posting is paused and an alert is sent.
- **I8 (I)** A `chat_member` update showing a new channel admin triggers an immediate alert.
- **I9 (I)** In staging, the production channel is refused at startup.

### J. Audit

- **J1 (I)** Every action in §9.2 writes exactly one audit row with actor, role, action and document.
- **J2 (I)** As `muomalat_app`, `UPDATE audit_log` and `DELETE FROM audit_log` fail with a permission error.
- **J3 (I)** The hash chain verifies. Altering one row in the database as the owner role makes the nightly check report `ops.chain_break` and alert.
- **J4 (I)** A role change, a new user, a login from a new country and a withdrawal each send an alert to the alerts group (mocked transport).
- **J5 (I)** Personal-data audit rows contain field paths but no values.
- **J6 (I)** A failed REST login writes `auth.login_failed` at once, with the attempted email and IP. The fifth failure also writes `auth.locked`, and the locked response uses the generic message (§9.4).

### K. Security and operations (smoke tests after every deploy)

- **K1 (E)** Cookies on the cms host are `Secure`, `HttpOnly` and `SameSite=Strict`.
- **K2 (E)** A cross-origin `POST` to `/api/articles` with a valid cookie but `Origin: https://evil.example` is rejected (CSRF allow-list).
- **K3 (E)** `/api/graphql` → 404 or disabled. `/api/users/first-register` and `/admin/create-first-user` → 404.
- **K4 (I)** Uploading an SVG, an XML file, or a JPEG renamed `.svg` → rejected. A JPEG with GPS EXIF, XMP and an ICC profile → no stored file (original or any size) has EXIF, XMP or ICC data, and every stored file is `image/webp`. The same holds when the editor sets only the focal point in the Edit-image drawer before the first save, and when they crop.
- **K5 (E)** Public-host responses carry HSTS, the site CSP, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. The cms host carries `X-Robots-Tag: noindex`.
- **K6 (M)** No VPS port is open from the internet (external `nmap` of the VPS address shows nothing, or only SSH restricted to known addresses).
- **K7 (I)** The startup guard exits in production on each unsafe setting in §12.1.
- **K8 (I)** Read-only mode (`CMS_READ_ONLY=1`) rejects every write, pauses the scheduler and Telegram, and the public site still serves pages.
- **K9 (I)** After `maxLoginAttempts` (5) wrong passwords the account is locked for 15 minutes, and a further attempt with the right password is refused. Only an admin can unlock it: a reporter or editor calling unlock gets 403 (the 3.90 default would allow any staff user).
- **K10 (I)** A 14-character password and a known-breached password are both rejected.
- **K11 (M)** A staff login that offers only an authenticator-app code is refused. With Independent MFA on our plan, Access refuses it. Without it, Google's "security key only" enforcement refuses it at the identity provider (§12.3).
- **K12 (M)** A restore drill from last night's backup to a scratch VM succeeds, with RTO and RPO recorded.
- **K13 (I)** A slug like `../x` or `x' OR 1=1` in the article route → `notFound()` without any database query (spy on the adapter).
- **K14 (CI)** `npm audit --omit=dev` reports no high or critical issues. The `payload` and `@payloadcms/*` versions are identical and ≥ 3.90.2.
- **K15 (I)** A token refresh for a session older than 8 h returns 401. (E) An admin tab left idle for 30 minutes is logged out.
- **K16 (M)** Lock-out drill: after a user is removed from the Access group and their tokens are revoked, they lose admin and API access within about a minute.
- **K17 (I)** The transition endpoint called with a valid cookie but `Origin: https://evil.example` returns 401, and nothing changes.
- **K18 (I)** App-level rate limits (§12.3): the eleventh login attempt from one IP within 15 minutes gets 429 before the password is checked; the sixth submission of one form from one IP within 10 minutes returns `rate_limited` and stores nothing; a fourth digest confirmation email to one address within 24 h is not sent.

### L. Personal data

- **L1 (E)** Each of the four forms stores a record with `consent.textVersion`, `locale` and `at`. The response never echoes stored data.
- **L2 (I)** A form submission without consent is rejected (existing error codes).
- **L3 (E)** Digest double opt-in: the record is `pending` until the emailed link is used. The unsubscribe link sets it to `unsubscribed`.
- **L4 (I)** The retention job deletes pending subscribers after 7 days and unsubscribed subscribers after 30 days, keeping the suppression hash, and writes `pd.retention_purge`.
- **L5 (I)** Admin export and deletion by email cover all four collections and are audited.
- **L6 (I)** A contact message with topic `tuzatish` creates a `requests` item with `dueAt = receivedAt + 3 days`. A refutation request gets + 1 month.
- **L7 (M)** The privacy notice in four languages names the EU storage location, the processors, the retention periods and the responsible person.

### M. Import

- **M1 (I)** `import-mock.ts` with `SITE_ENV=production` refuses to import articles, authors and club events.
- **M2 (I)** A re-run of the import is idempotent: no duplicates, upsert by `legacyId`.
- **M3 (I)** Imported media are WebP, with uz, ru and en alt and credit.
- **M4 (I)** `npm run validate -- --source=payload` on staging after import reports the same findings as on the mock data.

---

## 17. Phases and order of work

The estimates are our own inference, for one experienced developer.

| Phase | Scope | Rough size |
|---|---|---|
| **0. Spike** (done 9 October 2026; results in [PHASE0-FINDINGS.md](./PHASE0-FINDINGS.md)) | Payload in this app at `/admin` on the cms host; resolve every §18 VERIFY item (three checks remain open, §18); choose caching Option A or B (Option B chosen, §8.2); Lexical serializer prototype on 3 mock articles (it ran on all 35); check the Access JWT; draft the startup guard | 1 week |
| **1. Core** | All collections and globals (§3); roles and access (§4); workflow, two-person rule, corrections, sponsored guard, embargo, scheduler (§5); localization gating (§6); `rules.ts` and the hooks (§7); async adapter, caching, revalidation, Cloudflare purge, redirects, short links (§8); audit log with alerts (§9); import and parity (§11); security P0 (§12); Uzbek admin pack (§6.6); personal data and forms (§13); deployment and backups (§14–15); acceptance groups A–H and J–M | 6–8 weeks |
| **2. Distribution and polish** | Telegram (§10, group I); Access SSO strategy (§12.2); requests-register dashboard; analytics feed for `views`; transliteration dictionary in `editorial-rules`; news sitemap; WAL archiving | 3–4 weeks |
| **3. Later** | Planning calendar and daily budget digest; live-updates block (`LiveBlogPosting`); Postgres full-text search; conflict-of-interest dashboard; Turnstile; SRI-based CSP; Payload 4 migration once 4.0 is stable | — |

**Go-live gate.** All acceptance tests in groups A–H and J–M pass. The legal questions in CMS-RESEARCH §4.5 are answered by counsel. The registration certificate is issued, and the legal placeholders are replaced (SET-1).

---

## 18. Items to verify in Phase 0

Phase 0 results are in [PHASE0-FINDINGS.md](./PHASE0-FINDINGS.md). Below, "findings item N" is a row of its §2 table and "findings §1.x" one of its decisions; other § numbers are sections of this document. Items 1–19 and 22 are resolved, as are the item 20 entries on rate limits, purge, log retention, the DPF list and CAA. Still open:
- item 20, Independent MFA on our plan (a dashboard check, §12.3);
- item 21, `chat_member` delivery for channels (staging test I8), plus a live edit of an old bot post (I5);
- item 11, the custom list cell rendered in a live admin.

Also open, though not §18 items: whether Cloudflare Free honours an origin `s-maxage` shorter than its 2-hour Edge TTL minimum, and which RSC responses Next marks cacheable under Option B (both §8.4). Phase 0 also confirmed two checks outside this list: there is no route conflict between `[lang]` and the admin (§2.2), and the Access JWT check with `jose` works (§12.2).

1. The `update` access that returns `{ _status: { equals: 'draft' } }`: does it hide Publish and Unpublish without blocking draft saves of published documents? How does it interact with our transition endpoint?
   Result: **differs** (findings §1.2 and item 1). It does the opposite on both counts. Replaced by the three publish locks (§4.3).
2. In `beforeChange`, how to tell a "save draft" on a published document from "unpublish" (hook args or `req.query.draft`)?
   Result: **resolved** (findings item 2). Publish is `data._status === 'published'`. Save draft and unpublish differ only in the draft argument, which the articles `beforeOperation` hook copies into `req.context.draftArg` (§4.3, §5.8).
3. Values set in a collection `beforeChange` hook persist. `req.context` cannot be set from an HTTP request. `req.payloadAPI` values in the admin's server components, in REST, and in our Local API calls.
   Result: **confirmed** (findings item 3). One rule follows: `req.payloadAPI` is not a trust signal (§3.1, §4.3).
4. Does the admin refresh the token on activity, so that `tokenExpiration` acts as an idle timeout? Do `cookiePrefix` values with `__Host-` work?
   Result: **partly** (findings item 4 and §1.6). The idle cut-off falls anywhere between about 2 and 30 minutes; an activity provider and an 8 h refresh hook fix that. `__Host-` breaks the admin's language and theme cookies, so `cookiePrefix` stays `muomalat` (§12.2).
5. Payload `required` on localized fields: is it validated per saved locale? Do drafts skip validation by default (`versions.drafts.validate`)?
   Result: **confirmed** (findings item 5). `required` is checked only in the locale being saved, and drafts skip all field validation (§3.1, §6.2).
6. Localized fields inside non-localized arrays (`corrections[].publicText`) and localized groups (`translation`) on Postgres with drafts.
   Result: **partly** (findings item 6). It works per locale, with rules for array row ids and a workaround for bug payloadcms#18246 (§4.3, §6.2).
7. `formatOptions` re-encodes the original upload and strips EXIF and GPS.
   Result: **partly** (findings item 7 and §1.8). Only on a plain upload. The crop and focal-point paths need the Media `beforeOperation` re-encode (§3.12).
8. Does the Payload admin work with `cacheComponents: true` and `partialPrefetching: true`? If not, use Option B.
   Result: **Option B chosen** (findings §1.1 and item 8). Option A failed at runtime in ways the build does not catch (§8.2).
9. `revalidatePath` with internal `/uz/...` paths under the `proxy.ts` rewrite, and for `opengraph-image` sub-routes. Do `revalidateTag` and `revalidatePath` work inside `after()` from a Payload REST handler?
   Result: **partly** (findings item 9). Pages take the internal path; uz route handlers need both forms. `after()` works from Payload hooks and custom endpoints (§8.4).
10. Date-field timezone support and the admin `timezones` configuration (Asia/Tashkent).
    Result: **partly** (findings item 10 and §1.8). `timezone: true` goes on every date-time an editor enters, and the database session is pinned to UTC (§3.1, §12.2).
11. Virtual fields (for the embargo title prefix) and custom list cells.
    Result: **partly; one check open** (findings item 11). A virtual field cannot be the title, so the edit-view banner sets the tab title (§5.10). The custom Cell type-checks but has not been rendered in a live admin.
12. The globals versions key (`versions.max`) and drafts on globals.
    Result: **differs** (findings item 12). The key is `versions.max`, and global version restore bypasses our hooks (§3.16).
13. The join field on `articles.mediaRefs`; `filterOptions` on relationships with `_status`.
    Result: **partly** (findings item 13). The join works on the top-level field only. `filterOptions` must not filter on `_status` (§3.3, §3.12, §3.16).
14. A custom endpoint passes `context` to `payload.update` and inherits CSRF and cookie auth.
    Result: **confirmed** (findings item 14), with rules for `req.user`, body parsing and transactions in the endpoint (§5.2).
15. Lexical: pasting from Google Docs drops disabled formats; internal links to `glossary-terms` resolve at the depth used; inline blocks serialize as specified.
    Result: **partly** (findings item 15 and §1.7). The editor's limits hold only in the admin client, so the server enforces them. Links resolve at depth 1, and inline blocks round-trip without loss (§3.4, §6.5).
16. Copy-to-locale in the admin, or whether a custom action is needed. A `CopyLocaleData` admin element exists in the 3.90.2 source (`packages/ui/src/elements/CopyLocaleData`). Check that it copies blocks and rich text the way translators need.
    Result: **resolved** (findings item 16). The built-in publishes at once and copies the translation status, so it is disabled and a custom action replaces it (§3.3).
17. Whether root `hooks.afterError` sees failed logins (§9.4), or the polling job is needed. There is no collection-level failed-login hook in 3.90.2.
    Result: **differs** (findings item 17 and §1.4). `users.hooks.afterError` sees failed logins, so there is no polling job (§9.4).
18. Payload's insert into `audit_log` works with no UPDATE privilege (otherwise set `timestamps: false`).
    Result: **confirmed** (findings item 18 and §1.3). `timestamps` stays `true` (§9.1).
19. Custom admin languages (`uz`) through `i18n`.
    Result: **confirmed** (findings item 19 and §1.6). The `uz` pack ships in Phase 1 (§6.6).
20. Cloudflare:
    - Independent MFA on our plan (launched 15 April 2026; the docs name no plan). Result: **open** (findings item 20a). It needs a dashboard check; the fallback if Free lacks it is in §12.3;
    - Access log retention. Result: **confirmed** (findings item 20d): 24 h on Free (§9.4);
    - the Data Privacy Framework entry on the official list (Cloudflare says it is certified). Result: **confirmed** (findings item 20e): "Active – re-certification under review" on 9 October 2026. Whether it satisfies resolution 415 is for counsel;
    - CAA `accounturi` with Cloudflare-managed certificates. Result: **differs** (findings item 20f): not enforceable under Universal SSL (§12.3).

    Resolved during verification: Free has one rate-limiting rule (path-only, 10 s window), and prefix purge is available on Free at 5 requests a minute (§12.3, §8.4). Phase 0 confirmed both (findings items 20b and 20c) and found two more Free limits: five WAF custom rules with no regex, and purge budgets shared across the account (§8.4, §12.3).
21. Telegram: editing bot-sent channel posts older than 48 h. For `chat_member` updates, `allowed_updates` must list `chat_member` explicitly, because it is excluded by default ([getUpdates](https://core.telegram.org/bots/api#getupdates)). Check that it is delivered for channels.
    Result: **partly; checks open** (findings items 21a–21c). A bot can edit its own channel posts at any age (from the docs and source; test I5). `chat_member` delivery for channels is expected but not live-tested (test I8). Bot API 10.3 added `can_send_welcome_messages` (§10.5, §10.6).
22. `payload.update({ data: { _status: 'published' }, draft: false })` on a document with a newer draft publishes the draft's content, not the last published version (§5.11 scheduler; also the transition endpoint).
    Result: **confirmed** (findings item 22), by two groups (§5.11).
