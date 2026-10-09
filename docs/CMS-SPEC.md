# Muomalat CMS: implementation specification

Payload CMS 3 embedded in this Next.js app at `/admin`, on PostgreSQL.
Version 1.1, 9 October 2026. Why each decision was made is in [CMS-RESEARCH.md](./CMS-RESEARCH.md). This document says what to build. Version 1.1 applies the corrections from an independent verification pass (CMS-RESEARCH, "Verification notes").

**Conventions**

- **MUST** is required for launch. **SHOULD** is expected unless there is a written reason not to. **LATER** is out of scope for Phase 1.
- **VERIFY** marks Payload, Next.js or Cloudflare behaviour we have not confirmed. Each one is listed in §18 and checked in the Phase 0 spike before the code depends on it.
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
| Admin login | Phase 1: Cloudflare Access (security keys or biometrics only) **and** a Payload password; Payload also checks the Access JWT (§12.2). Phase 2: Payload trusts the Access JWT and the password becomes break-glass only |
| Workflow | A custom `workflowStatus` field, a transition table, and hooks that enforce the two-person rule. Payload's `_status` only decides whether a document is public |
| Scheduling | Our own scheduler running in the worker. Payload's `schedulePublish` is **not** enabled |
| Article body | A Lexical rich-text field with typed blocks, serialized at read time into the existing `ArticleBlock[]` and `RichText` markup, so the front-end components do not change |
| Languages | Payload locales `uz` (default), `ru` and `en`, with `fallback: false`. `kr` is transliterated at read time and is never a Payload locale. Russian and English appear only when the translation status is `approved` |
| Caching | Content layer becomes async. Phase 0 chooses Option A (Next Cache Components, `'use cache'` with `cacheTag`) or Option B (`unstable_cache` with ISR). Tag names are the same in both. Cache invalidation runs after commit. A purge of Cloudflare by URL and prefix follows |
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

- **Root layouts:** `src/app/[lang]/layout.tsx` stays the site's root layout, and `(payload)/layout.tsx` is the admin's. Static segments (`admin`, `api`, `preview`, `internal`, `t`) take precedence over the dynamic `[lang]` segment. **VERIFY** that there is no conflict.
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
"sharp": "<exact>",
"jose": "<exact>",              // Access JWT verification
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
  - The admin shows and enters Asia/Tashkent, with UTC alongside for embargoes.
  - The read layer outputs ISO strings with `+05:00`, the format `scripts/validate-content.ts` already checks.
  - Day-only fields (`Source.date`, `Institution.statusDate`) stay `YYYY-MM-DD` strings.
- **Rich text** uses one of two Lexical configurations (§3.4). Both serialize to the existing markup: `**bold**`, `*italic*`, `[label](href)`, `[[slug|label]]`, `{en:…}`.
- **System fields** are written by hooks only. Each collection `beforeChange` hook first copies these fields from `originalDoc`, which discards anything a client sent, and then sets them itself.
- **Drafts.** Every content collection uses `versions.drafts` (drafts are not validated, **VERIFY**). Payload's `_status` means "public or not". Our `workflowStatus` means "where in the newsroom process".
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
- `admin.livePreview` (§5.13).
- `defaultColumns: ['title','workflowStatus','rubric','authors','assignee','dueAt','updatedAt']`.
- Custom list cells: an embargo badge and a translation-status dots column.

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
| `related` | relationship → `articles`, hasMany, max 4 | — | `filterOptions`: not self, not sponsored, published | `related` |
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
| `corrections` | array, append-only (§5.7). Each item has: `kind` (select: `correction`, `clarification`, `editors_note`); `publicText` [L] (textarea; uz required; ru/en required when that translation is approved); `location` (text, e.g. "3-xatboshi", paragraph 3); `internalReason` (textarea); `createdAt`, `createdBy`, `approvedBy`, `versionId` (system); `request` (rel `requests`); `telegramAction` (select: none, caption_edited, reply_posted; system) | Shown on the article (`CorrectionNote`), in JSON-LD `CorrectionComment`, and on the public corrections list | `corrections[]` → `{ date: createdAt, text: publicText, kind }` |

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
- A "Copy Uzbek body into this language" action for translators. **VERIFY** Payload's copy-to-locale feature; otherwise use a custom endpoint.

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
| `mediaRefs` | relationship → media, hasMany, hidden, system | — | Every media item used by hero, body or SEO; powers "Used in" |

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
- Text pasted from Google Docs or Telegram loses unsupported formatting. **VERIFY**

**Inline editor (`inlineEditor`)** is used inside blocks and in the glossary:

- `ParagraphFeature`, `BoldFeature`, `ItalicFeature`, `LinkFeature`
- `BlocksFeature({ inlineBlocks: [glossaryLink, keepLatin] })`

**Blocks**

| Block (`blockType`) | Fields | Req | Rules | Output `ArticleBlock` |
|---|---|---|---|---|
| `figure` | `image` (upload → media, req), `caption` (text) | image | The media item must pass rights and alt checks (ART-13/14/15) | `{ type:'figure', image: ImageRef }` (alt and credit from the media item in the body's locale; caption from the block, else the media caption) |
| `table` | `caption` (text, req), `columns` (array: `label` req, `align` left/right, `unit`), `data` (textarea: paste from Excel or CSV; tab, semicolon or comma separated), `rows` (json, hidden, parsed by hook), `note`, `source` (text, req at publish) | caption, columns, data, source | Hook parses `data` into `rows`. Uzbek number format: space as thousands separator, comma as decimal ("4,5" → 4.5). Empty cell → `null`; otherwise string. Each row must have as many cells as there are columns (ART-8) | `{ type:'table', caption, columns, rows, note, source }` |
| `chart` | `kind` (bar/line), `title` (req), `subtitle`, `unit` (req), `categoryLabel` (bar), `xLabel` (line), `data` (textarea), `parsed` (json, hidden), `source` (req at publish), `note` | kind, title, unit, data, source | Bar data: one line per bar, `label;value` plus an optional `;*` that highlights the bar. Line data: a header row `Davr;Series A;Series B…`, then one row per period. Hook parses the data and checks series lengths (ART-8, ART-10). A live preview uses the existing `BarChart` / `LineChart` | `{ type:'chart', chart: ChartSpec }` |
| `quote` | `text` (textarea, plain, req), `cite`, `role` | text | No links or formatting (Oak-style mark limits) | `{ type:'quote', text, cite, role }` |
| `qa` | `question` (textarea, req), `answer` (richText, inline editor, req) | both | Rubric `intervyu` requires at least one (ART-6) | `{ type:'qa', question, answer: RichText[] }` (one string per paragraph) |
| `factbox` | `title` (default "Raqamlarda", "In figures"), `items` (array 2–8: `label`, `value`), `note` | items | | `{ type:'factbox', … }` |
| `callout` | `title` (default "Maʼlumot uchun", "For reference"), `text` (richText, inline editor) | text | | `{ type:'callout', title, text: RichText }` (paragraphs joined with a space; more than one paragraph gives a warning) |
| `term` | `term` (relationship → glossary-terms, req) | term | Term must be published | `{ type:'term', slug }` |
| inline `glossaryLink` | `term` (rel, req), `label` (text, req) | both | | `[[slug\|label]]` |
| inline `keepLatin` | `text` (req) | text | "Lotin harflarida qoldirish" (keep in Latin script; protects the text from transliteration) | `{en:text}` |

**Serializer contract (`src/payload/lexical/serialize.ts`).** A pure function with no I/O:

```ts
serializeBody(state: SerializedEditorState, ctx: { resolveDoc(rel): {path} | undefined, mediaById: Map, locale }): ArticleBlock[]
serializeInline(nodes, ctx): RichText            // one paragraph
serializeParagraphs(state, ctx): RichText[]      // qa.answer, glossary definition…
```

| Lexical node | Output |
|---|---|
| `paragraph` | `{ type:'p', text: serializeInline(children) }`; empty paragraphs are dropped |
| `heading` (`h2` / `h3`) | `{ type:'h2' \| 'h3', text: plainText(children) }`; formatting is dropped with warning ART-21 |
| `list` (`bullet` / `number`) | `{ type:'list', ordered, items: listitem → serializeInline }`; nested lists give error ART-21 |
| `block` | Mapped by `fields.blockType` (table above) |
| `text` | Format bit 1 → `**…**`, bit 2 → `*…*`; bold + italic → bold with a warning; other bits are ignored |
| `linebreak` | A single space |
| `link` (custom URL) | `[label](url)`; `https:` or a site path only (ART-22) |
| `link` (internal doc) | `[label](/rubric/slug)` or `[label](/lugat/slug)`; an unpublished target gives a warning |
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
  formatOptions: { format: 'webp', options: { quality: 82 } },   // re-encode strips EXIF/GPS — VERIFY applies to original
  imageSizes: [
    { name: 'thumb', width: 400 }, { name: 'card', width: 800 },
    { name: 'wide', width: 1600 }, { name: 'og', width: 1200, height: 630, position: 'centre' },
  ],
  adminThumbnail: 'thumb',
}
```

The file size limit is 15 MB, set in the Payload `upload.limits`.

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
| `usedIn` | join → `articles.mediaRefs` | — | — | "Qayerda ishlatilgan" (where used) |

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

All globals keep versions (`versions.max: 0`; **VERIFY** the key name for globals) and are audited.

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
| `lead` | rel articles | `filterOptions`: published, not sponsored, not withdrawn. Empty → newest `featured` non-sponsored story (today's `getLeadStory`) |
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
| Restore a version (creates a draft) | — | ✓ | ✓ | — | — |
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

/** Trusted in-process callers (worker, scripts) set this; HTTP requests can never set req.context. VERIFY */
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
- **The publish permission is double-locked:**
  - `update` access returns `{ _status: { equals: 'draft' } }` for reporters and commercial. This is the documented pattern that hides Publish in the UI (**VERIFY** side effects).
  - **And** `hooks/twoPerson.ts` throws on any disallowed publish, whatever the UI did.
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
   - The person is added to the Cloudflare Access policy group and enrols two security keys.
   - They get Telegram admin rights only if needed (§10.5, §12.9).
   - Audit event and alert.
2. **Role change.** Admin only. It is alerted to the editor-in-chief and the founder.
3. **Leaver checklist** (a SiteSettings checklist page, LATER; a runbook in Phase 1):
   - set `active = false` and `offboardedAt`;
   - remove them from the Access group;
   - revoke their Access sessions;
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

The endpoint loads the document and checks the table below. It then calls `payload.update({ collection:'articles', id, data, req, overrideAccess: false, context: { transition } })`. Hooks run as usual. A direct PATCH that changes `workflowStatus` without `context.transition` is rejected. **VERIFY** that a custom endpoint can pass `context` and that HTTP requests cannot.

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

This runs in `hooks/twoPerson.ts` as an articles `beforeChange` hook for every operation where `data._status === 'published'`.

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

During a save in another locale, `data` holds only that locale's values. The hook therefore loads the document with `locale: 'all', draft: true` and merges `data` into it before hashing. Translations have their own hash (§6.3).

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
  - **VERIFY** how to tell "save draft" from "unpublish" in `beforeChange`, using the hook args or `req.query.draft`.
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
  - a red `EmbargoBadge` list cell: "EMBARGO 14:00 (09:00 UTC)";
  - a banner at the top of the edit view;
  - the browser tab title prefixed with "EMBARGO" through a virtual field used as the title (**VERIFY** virtual fields).
- **Handover list.** A saved query preset "Embargolar" (embargoes) lists all active embargoes by release time.
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

**VERIFY** (§18, item 22) that `payload.update` with `data: { _status: 'published' }` and `draft: false` publishes the latest draft's content, not the last published version.

### 5.12 Drafts, autosave, versions, locking

| Collection | `drafts` | `autosave` | `maxPerDoc` | `lockDocuments` |
|---|---|---|---|---|
| `articles` | ✓ | interval 2000 ms (set explicitly: the docs say the default is 800 ms, the 3.90.2 source uses 2000 ms) | 0 | 600 s (default 300 s) |
| `glossary-terms`, `institutions` | ✓ | ✓ | 0 | default |
| `authors`, `tags`, `milestones`, `club-events`, `rubrics` | ✓ | ✓ | 100 | default |
| `media` | — | — | 50 | default |
| globals | ✓ (`home-page`, `ad-slots`, `navigation`) | — | 0 (`max`) | — |

`readVersions` mirrors the "Read versions" row in §4.2. Restoring a version creates a draft, and publishing it follows the normal rules. Version records do not store the user in 3.x, so `lastEditedBy` is written on every change and therefore copied into each version.

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

Payload `required: true` is **not** set on localized fields. The `uz` requirement is enforced by `hooks/validate.ts`. **VERIFY** whether Payload validates required localized fields per saved locale.

### 6.3 Translation status and gating

- **Status values:** `missing` → `machine_draft` → `in_edit` → `approved` → `outdated`.
- **Approval:**
  - Only an editor or the editor-in-chief can set `approved`.
  - The approver must be someone other than `translatedBy`.
  - On approval the hook records `reviewedBy`, `approvedAt` and `contentHash`. The hash covers that locale's `title`, `kicker`, `lead`, `body` and `imageCaption`.
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
    where: { slug: { equals: slug } }, depth: 2, overrideAccess: false, user: draftUser })   // locale 'all': one query, all languages
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

### 6.6 Admin interface language

- Payload ships 44 admin languages and no `uz`.
- **Phase 1:** `i18n.supportedLanguages: { ru, en }` with `fallbackLanguage: 'ru'`. All collection and field labels and descriptions are written in Uzbek, so editors see Uzbek wherever it matters.
- **LATER:** add a custom `uz` language pack through `i18n.supportedLanguages` and `translations`, by translating the `ru` pack, about 1,000 strings. **VERIFY** whether custom languages are supported.

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
| ART-20 | Literal markup characters in text (`**`, `[[`, `](`, `{en:`) | W | | new (serializer) |
| ART-21 | Formatting inside a heading; nested list; bold + italic | W / E (nested list) | | new |
| ART-22 | External link not https; link to a disallowed scheme | E | | new |
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

**Option A (preferred if the Phase 0 spike passes).** Next Cache Components: `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts` (local Next docs).

- Each content function starts with `'use cache'`, `cacheLife('days')` and `cacheTag(...)`.
- `dynamicParams` exports are deleted, because they are incompatible with Cache Components.
- Pages call `notFound()` for unknown params.
- `generateStaticParams` returns at least one param: the latest 50 articles, all terms, and so on.
- Draft mode reads bypass the cached functions: `draftMode()` is read outside the cache scope and an uncached path is called.
- Risk: we have not confirmed that the Payload admin works with `cacheComponents` (§18).
- Risk: two Next.js advisories of 30 September 2026 describe failures of exactly this design:
  - GHSA-3w37-wq28-93x7: a pending `use cache` fill shared with a draft-mode request leaks unpublished content into regular responses and prerendered pages;
  - GHSA-h694-7cp9-m8p3: a nested `use cache` call is keyed without a root param, and `[lang]` is our root param.

  Both affect 16.3.x. We infer that 16.4.0 (6 October) includes the fixes ([advisories](https://github.com/vercel/next.js/security/advisories)). Keep `next` at 16.4.0 or later, keep draft reads outside every cached function (above), and run test H10.

**Option B (fallback).** The previous model:

- content functions are wrapped in `unstable_cache(fn, key, { tags, revalidate })`, which is deprecated in favour of `'use cache'` but supported in 16;
- content routes get `export const revalidate`: home 300, rubric 600, others 3600;
- `dynamicParams = false` is removed from content routes (article, term, tag, author, club event, rubric pages) and kept on `[lang]`;
- `generateStaticParams` returns recent items.

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
   4. In worker context, `after` is unavailable; the worker posts to `/internal/revalidate` once its operation returns.
2. **`invalidate(targets)`:**
   - `revalidateTag('article:<id>', { expire: 0 })` for the changed article: the next request blocks and gets fresh data;
   - `revalidateTag('articles' | 'rubric:*' | 'home' | …, 'max')` for lists;
   - `revalidatePath()` for the **internal** paths: `/uz/<rubric>/<slug>`, `/kr/…`, `/ru/…`, `/en/…`, plus the `/opengraph-image` sub-route. With a rewrite, the destination path is the one to pass (local Next docs, `revalidatePath`). **VERIFY** that this also holds for `proxy.ts` rewrites and for OG routes.
   - `/internal/revalidate` (route handler) does the same for callers outside a request. It accepts `POST {targets, ts}` with header `X-Signature: HMAC-SHA256(body, INTERNAL_REVALIDATE_SECRET)`. It rejects requests with a timestamp older than 60 s and any request carrying `cf-connecting-ip`, which means it arrived through the tunnel.
3. **Worker outbox loop** (every 5 s) over `publish-events` with `status = pending`:
   1. **Warm-up.** `GET ${INTERNAL_APP_URL}<public path>` with `Host: muomalat.uz` for each edition URL, twice, 2 s apart.
   2. **Cloudflare purge.** `POST /zones/{zone}/purge_cache`.
      - Purge by exact URL by default: the article in each edition, each one's `/opengraph-image` URL, `/`, `/kr`, `/ru`, `/en`, the rubric fronts, `/rss.xml` for each edition, and `/sitemap.xml`.
      - On the Free plan, single-URL purge allows 800 URLs a second with at most 100 per request. Prefix, tag and hostname purges are limited to 5 requests a minute, with a bucket of 25 ([Cloudflare purge](https://developers.cloudflare.com/cache/how-to/purge-cache)).
      - Use prefix purge (`muomalat.uz/<rubric>/<slug>`, …) only for slug or rubric changes, where unknown sub-URLs may exist.
      - The worker batches and paces its requests.
   3. **Telegram.** Create the draft post on first publication; queue edit or reply posts for corrections (§10).
   4. Mark the event done, or failed with `attempts` and `lastError`. Retry with backoff up to 10 times, then alert.
4. **Cloudflare cache rules for `muomalat.uz` HTML:**
   - eligible for cache, respecting origin `Cache-Control`;
   - edge TTL capped at 120 s for `/`, `/kr`, `/ru`, `/en` and the rubric fronts, and at 1 h elsewhere;
   - cache bypassed when the request carries `__prerender_bypass` or a `muomalat-token` cookie, which should not happen on this host. Payload names its cookie `<cookiePrefix>-token`, and §12.2 sets `cookiePrefix: 'muomalat'`, so the cookie is not called `payload-token`;
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
- **Forms** (`src/app/actions.ts`, `src/lib/actions/*`) write through `createSubmission()` (§3.14). They keep the current error codes and the honeypot. Optional LATER: Cloudflare Turnstile, which needs a CSP update.

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
- **OG images** keep being generated by `next/og` from article data. They are invalidated with the article paths.
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

**VERIFY** that Payload's insert path never needs UPDATE on `audit_log`, for example for `updatedAt`. If it does, set `timestamps: false` on the collection.

### 9.2 Events

| Area | Actions |
|---|---|
| Auth | `auth.login`, `auth.logout`, `auth.locked`, `auth.unlock`, `auth.password_reset_requested`, `auth.password_changed`, `auth.edge_mismatch` (Access email ≠ Payload user), `auth.login_failed` (§9.4) |
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

Payload 3 has no failed-login hook. The collection hook list in the 3.90.2 source has `beforeLogin` and `afterLogin` but nothing for failures. The root config does have `hooks.afterError` ([config types, v3.90.2](https://github.com/payloadcms/payload/blob/v3.90.2/packages/payload/src/config/types.ts)). **VERIFY** whether it receives the login `AuthenticationError` with the attempted email; if it does, record `auth.login_failed` there instead. Until then:

- a worker job runs every minute and records an `auth.login_failed` row for each user whose `loginAttempts` rose or whose `lockUntil` was set;
- Cloudflare Access logs show attempts at the edge (retained 24 h on the free plan per third-party sources; export them if needed).

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
| `captionHtml` | textarea | Live counter of the caption **after entity parsing**: HTML tags removed and `&lt;`, `&gt;`, `&amp;` decoded, counted in UTF-16 units (JS `string.length`). Max 1024 with a photo, 4096 for text. Telegram's limit is "0-1024 characters after entities parsing" ([Bot API](https://core.telegram.org/bots/api#sendphoto)) |
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
   - after approval (¬author), call `editMessageCaption`;
   - for kind `correction`, also send a `correction_reply` with `reply_parameters: { message_id }` and text "TUZATISH: {publicText}\n{shortUrl}", because edits do not notify subscribers.
5. **On withdrawal:**
   - if the post is less than 48 h old, call `deleteMessage` after editor-in-chief approval;
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
- **If any other right is present** (for example `can_promote_members`, `can_change_info`, `can_invite_users` or the story rights; `can_manage_chat` excepted), or one is missing: alert and pause posting.

### 10.6 Listening for channel changes

- **Polling.** One worker process long-polls `getUpdates` with `allowed_updates: ["channel_post","edited_channel_post","chat_member","my_chat_member"]`. There is no webhook, so there is nothing public behind Cloudflare.
- **Manual posts and edits** (`channel_post`, `edited_channel_post`) are recorded and matched to articles by the `muomalat.uz` URL in the caption.
- **Admin changes.** `chat_member` or `my_chat_member` showing an admin added or removed, or the bot demoted, means **immediate alert** to the editor-in-chief and the founder (possible takeover; playbook §12.10).

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
| 7 | `data/articles/*.ts` | `articles` | Pass 1: uz fields as drafts. Pass 2: `translations.ru/en` → locales, with `translation.status = approved` and `translatedBy` / `reviewedBy` = importer. Pass 3: `related`, `about`. Pass 4: publish with `firstPublishedAt = publishedAt` (mock), `significantUpdateAt = updatedAt`, corrections → `{ kind: 'correction', publicText: text, createdAt: date }`, `views` copied (staging only). `legacyId` = mock ID; `shortCode` generated |
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

The comparison ignores `id` (compared through `legacyId`), image `src` (compared through the media map) and `views` in production. Any difference fails the job.

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
  cookiePrefix: 'muomalat',                   // auth cookie is then 'muomalat-token'; VERIFY '__Host-' prefix support
  // no `jobs` key: we do not use Payload Jobs (§5.11). If Jobs are ever enabled, set jobs.access.queue/run/cancel
  // explicitly: in 3.90.2 they default to "any logged-in user" (packages/payload/src/config/defaults.ts)
  admin: { user: 'users', meta: { robots: 'noindex, nofollow' } },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL }, push: false, migrationDir: './src/migrations' }),
  // no prodMigrations: migrations run as the owner role before deploy (§15)
})
```

Users auth:

```ts
auth: {
  tokenExpiration: 1800,          // 30 min idle (admin refreshes while active — VERIFY); absolute limit = Access session (8 h)
  useSessions: true,              // revocable sessions; password change ends other sessions (≥ 3.90)
  maxLoginAttempts: 5,
  lockTime: 15 * 60 * 1000,
  cookies: { secure: true, sameSite: 'Strict' },
  forgotPassword: { expiration: 30 * 60 * 1000 },
  useAPIKey: false,               // no API keys; worker uses the Local API in-process
},
access: { unlock: isAdmin, admin: canUseAdmin, create: isAdmin, update: selfOrAdmin, delete: () => false, read: usersRead },
hooks: { beforeLogin: [assertEdgeEmailMatches], afterLogin: [auditLogin, trackCountry], afterLogout: [auditLogout] },
```

**Passwords** (users `beforeValidate`):

- at least 15 characters, with no composition rules (NIST SP 800-63B-4);
- rejected if found in the breached-password list through the k-anonymity range API, sending only a 5-character SHA-1 prefix;
- if the API is unreachable, the password is accepted and the event is logged.

**Edge identity** (`access/edge.ts`):

- verify `Cf-Access-Jwt-Assertion` with `jose.jwtVerify` against the JWKS at `https://${CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, with `issuer: https://${CF_ACCESS_TEAM_DOMAIN}` and `audience: CF_ACCESS_AUD` ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/));
- the lower-cased `email` claim must equal `req.user.email`;
- cache the result in `req.context`;
- on failure: 403, and audit `auth.edge_mismatch`.

**Uploads.** As in §3.12: no SVG, no XML, `pasteURL: false`, no `clientUploads`, no `allowRestrictedFileTypes`.

**Phase 2: Access SSO.** A custom `auth.strategies` entry maps the verified Access JWT to the active Payload user with the same email. The local strategy stays enabled only for the break-glass admin. **VERIFY** whether `disableLocalStrategy` can apply per user, or whether a strategy-level check on role is needed.

### 12.3 Cloudflare (MUST unless marked)

- [ ] **DNS:**
  - only tunnel CNAMEs for `muomalat.uz` and `cms.muomalat.uz`, with no A records pointing to the VPS;
  - DNSSEC enabled, with SUVAN NET submitting the DS record;
  - CAA records for Cloudflare's CAs plus `iodef`, bound to our CA account (`accounturi`) where the CA supports it, as Google advised after the October 2026 ccTLD hijacks ([Google](https://blog.google/security/chromes-response-to-recent-cctld-registry-hijacks/)). **VERIFY** that this works with Cloudflare-managed edge certificates;
  - CT monitoring on.
- [ ] **Access application on `cms.muomalat.uz`:**
  - the policy allows only the `staff` email group;
  - identity provider: Google Workspace with 2-step verification enforced as "security key only"; Cloudflare's email one-time PIN login is disabled;
  - Independent MFA set to `security_key` and `biometrics` if available on our plan (**VERIFY**);
  - session duration 8 h;
  - `/admin`, `/api`, `/preview` and site routes all covered.
- [ ] **WAF custom rules on `muomalat.uz`:**
  - block `/admin*`;
  - block `/api/*` except `GET /api/media/file/*`;
  - block `/preview*`, `/exit-preview*`, `/internal/*`.
- [ ] **Both hosts:** block `/internal/*`, `/api/users/first-register` and `/admin/create-first-user`.
- [ ] **Rate limiting.**
  - Plan limits, checked 9 October ([Cloudflare](https://developers.cloudflare.com/waf/rate-limiting-rules/)):
    - the Free plan has **one** rule, counting by IP over a fixed 10-second window with a 10-second block;
    - a Free rule can match only on the path (and Verified Bot), not on method, host or headers;
    - Pro has two rules, with windows of up to 1 minute.
  - **Free plan (Phase 1):** one rule on the paths of the four form pages (contact, advertising, club application, digest sign-up) in every edition.
    - It counts GET requests too, so set the limit above normal browsing, for example 10 per 10 s per IP. Tune it from Security Events.
    - The login endpoints get no edge rule, because `cms.muomalat.uz` is reachable only after Cloudflare Access.
  - **Pro plan or Galileo (if available; VERIFY which expression fields each plan allows):**
    - server actions: 10 per minute per IP, then a managed challenge;
    - `POST /api/users/login` and `/api/users/forgot-password` on `cms.muomalat.uz`: 5 per minute per IP.
  - Payload has no IP rate limiting of its own. It has per-account lockout (`maxLoginAttempts`) and, since 3.90.0, a per-account forgot-password interval (`forgotPassword.minRequestInterval`, default 15 s).
- [ ] **Cache rules:** §8.4. `cms.muomalat.uz` bypass.
- [ ] **TLS:** Always Use HTTPS; minimum TLS 1.2; HSTS (1 year, `includeSubDomains`; preload LATER).
- [ ] **Bot handling:** Bot Fight Mode off, or confirmed not to block the `TelegramBot` preview crawler (check Security Events).
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
- **Fastest lock-out:** remove everyone from the Access policy group in Cloudflare. This takes effect at once for all admin and API access.
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
  - capturing evidence (export the audit log; **screenshot Telegram's "Recent actions" at once**, since it is kept only about 48 h, *unverified*);
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
  - a second, smaller VPS or a second compose project with its own database, Access app (`cms.staging.muomalat.uz`), Telegram test bot and test channel;
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

- **B1 (I)** A reporter cannot publish through REST (`_status: 'published'`), the Payload Publish action or the transition endpoint. Each attempt is rejected with an error.
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

### F. Localization

- **F1 (I)** Local API reads use `fallbackLocale: false`: an empty ru title stays empty in the raw document.
- **F2 (I)** `/ru/<rubric>/<slug>` with a ru translation whose status is `in_edit` serves the Uzbek text with `lang="uz"` and a canonical pointing to Uzbek. The sitemap omits the ru URL.
- **F3 (I)** Approving a translation by its own translator fails.
- **F4 (I)** Editing an approved ru translation sets it to `in_edit`, unless the reviewer makes the edit.
- **F5 (I)** `/kr` output equals `deepCyrillic` of the uz view, with any `kr.*` overrides applied. A `kr.title` containing Latin words fails (ART-26).
- **F6 (I)** Media alt in a ru story comes from the ru alt; in an untranslated story shown on `/ru`, it stays uz (today's rule).
- **F7 (I)** `machine_draft → approved` without passing through `in_edit` fails.
- **F8 (M)** All field labels and help texts are in Uzbek with the correct ʻ and ʼ characters.

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
- **J6 (I)** Failed logins are recorded within 2 minutes (§9.4).

### K. Security and operations (smoke tests after every deploy)

- **K1 (E)** Cookies on the cms host are `Secure`, `HttpOnly` and `SameSite=Strict`.
- **K2 (E)** A cross-origin `POST` to `/api/articles` with a valid cookie but `Origin: https://evil.example` is rejected (CSRF allow-list).
- **K3 (E)** `/api/graphql` → 404 or disabled. `/api/users/first-register` and `/admin/create-first-user` → 404.
- **K4 (I)** Uploading an SVG, an XML file, or a JPEG renamed `.svg` → rejected. A JPEG with GPS EXIF → the stored original has no GPS data.
- **K5 (E)** Public-host responses carry HSTS, the site CSP, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. The cms host carries `X-Robots-Tag: noindex`.
- **K6 (M)** No VPS port is open from the internet (external `nmap` of the VPS address shows nothing, or only SSH restricted to known addresses).
- **K7 (I)** The startup guard exits in production on each unsafe setting in §12.1.
- **K8 (I)** Read-only mode (`CMS_READ_ONLY=1`) rejects every write, pauses the scheduler and Telegram, and the public site still serves pages.
- **K9 (I)** After `maxLoginAttempts` (5) wrong passwords the account is locked for 15 minutes, and a further attempt with the right password is refused. Only an admin can unlock it: a reporter or editor calling unlock gets 403 (the 3.90 default would allow any staff user).
- **K10 (I)** A 14-character password and a known-breached password are both rejected.
- **K11 (M)** Cloudflare Access refuses a login that offers only an authenticator-app code where security keys are required (if Independent MFA is available on our plan).
- **K12 (M)** A restore drill from last night's backup to a scratch VM succeeds, with RTO and RPO recorded.
- **K13 (I)** A slug like `../x` or `x' OR 1=1` in the article route → `notFound()` without any database query (spy on the adapter).
- **K14 (CI)** `npm audit --omit=dev` reports no high or critical issues. The `payload` and `@payloadcms/*` versions are identical and ≥ 3.90.2.

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
| **0. Spike** | Payload in this app at `/admin` on the cms host; resolve every §18 VERIFY item; choose caching Option A or B; Lexical serializer prototype on 3 mock articles; check the Access JWT; draft the startup guard | 1 week |
| **1. Core** | All collections and globals (§3); roles and access (§4); workflow, two-person rule, corrections, sponsored guard, embargo, scheduler (§5); localization gating (§6); `rules.ts` and the hooks (§7); async adapter, caching, revalidation, Cloudflare purge, redirects, short links (§8); audit log with alerts (§9); import and parity (§11); security P0 (§12); personal data and forms (§13); deployment and backups (§14–15); acceptance groups A–H and J–M | 6–8 weeks |
| **2. Distribution and polish** | Telegram (§10, group I); Access SSO strategy (§12.2); requests-register dashboard; analytics feed for `views`; transliteration dictionary in `editorial-rules`; news sitemap; Uzbek admin pack; WAL archiving | 3–4 weeks |
| **3. Later** | Planning calendar and daily budget digest; live-updates block (`LiveBlogPosting`); Postgres full-text search; conflict-of-interest dashboard; Turnstile; SRI-based CSP; Payload 4 migration once 4.0 is stable | — |

**Go-live gate.** All acceptance tests in groups A–H and J–M pass. The legal questions in CMS-RESEARCH §4.5 are answered by counsel. The registration certificate is issued, and the legal placeholders are replaced (SET-1).

---

## 18. Items to verify in Phase 0

1. The `update` access that returns `{ _status: { equals: 'draft' } }`: does it hide Publish and Unpublish without blocking draft saves of published documents? How does it interact with our transition endpoint?
2. In `beforeChange`, how to tell a "save draft" on a published document from "unpublish" (hook args or `req.query.draft`)?
3. Values set in a collection `beforeChange` hook persist. `req.context` cannot be set from an HTTP request. `req.payloadAPI` values in the admin's server components, in REST, and in our Local API calls.
4. Does the admin refresh the token on activity, so that `tokenExpiration` acts as an idle timeout? Do `cookiePrefix` values with `__Host-` work?
5. Payload `required` on localized fields: is it validated per saved locale? Do drafts skip validation by default (`versions.drafts.validate`)?
6. Localized fields inside non-localized arrays (`corrections[].publicText`) and localized groups (`translation`) on Postgres with drafts.
7. `formatOptions` re-encodes the original upload and strips EXIF and GPS.
8. Does the Payload admin work with `cacheComponents: true` and `partialPrefetching: true`? If not, use Option B.
9. `revalidatePath` with internal `/uz/...` paths under the `proxy.ts` rewrite, and for `opengraph-image` sub-routes. Do `revalidateTag` and `revalidatePath` work inside `after()` from a Payload REST handler?
10. Date-field timezone support and the admin `timezones` configuration (Asia/Tashkent).
11. Virtual fields (for the embargo title prefix) and custom list cells.
12. The globals versions key (`versions.max`) and drafts on globals.
13. The join field on `articles.mediaRefs`; `filterOptions` on relationships with `_status`.
14. A custom endpoint passes `context` to `payload.update` and inherits CSRF and cookie auth.
15. Lexical: pasting from Google Docs drops disabled formats; internal links to `glossary-terms` resolve at the depth used; inline blocks serialize as specified.
16. Copy-to-locale in the admin, or whether a custom action is needed. A `CopyLocaleData` admin element exists in the 3.90.2 source (`packages/ui/src/elements/CopyLocaleData`). Check that it copies blocks and rich text the way translators need.
17. Whether root `hooks.afterError` sees failed logins (§9.4), or the polling job is needed. There is no collection-level failed-login hook in 3.90.2.
18. Payload's insert into `audit_log` works with no UPDATE privilege (otherwise set `timestamps: false`).
19. Custom admin languages (`uz`) through `i18n`.
20. Cloudflare:
    - Independent MFA on our plan (launched 15 April 2026; the docs name no plan);
    - Access log retention;
    - the Data Privacy Framework entry on the official list (Cloudflare says it is certified);
    - CAA `accounturi` with Cloudflare-managed certificates.

    Resolved during verification: Free has one rate-limiting rule (path-only, 10 s window), and prefix purge is available on Free at 5 requests a minute (§12.3, §8.4).
21. Telegram: editing bot-sent channel posts older than 48 h. For `chat_member` updates, `allowed_updates` must list `chat_member` explicitly, because it is excluded by default ([getUpdates](https://core.telegram.org/bots/api#getupdates)). Check that it is delivered for channels.
22. `payload.update({ data: { _status: 'published' }, draft: false })` on a document with a newer draft publishes the draft's content, not the last published version (§5.11 scheduler; also the transition endpoint).
