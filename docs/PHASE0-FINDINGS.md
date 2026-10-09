# Phase 0 findings

Muomalat CMS · 9 October 2026 · results of the Phase 0 spike for [CMS-SPEC.md](./CMS-SPEC.md) §18.

Six groups (access, auth, locale, next, lexical, external) tested the §18 items against the installed versions: Payload 3.90.2, Next 16.4.0 and Postgres 17. Each group worked in its own folder under `.spike/` and its own database, and dropped the database at the end. Nothing in `src/`, `scripts/` or the app's databases was changed.

**How to read the evidence.**

- **Exp** means an experiment: a script in `.spike/<group>/` and its output file.
- **Src** means a cited source file. Paths are under `node_modules/` and line numbers refer to the 3.90.2 `dist` files, unless a path under `.spike/auth/extracted/` is given (TypeScript recovered from Payload's source maps).
- **Doc** means a vendor page, saved under `.spike/external/`.
- `.spike/` is git-ignored, so the evidence exists only on this machine. Archive it before cleaning up if the pointers below must keep working.

**Bottom line.** Phase 1 can start. Nothing found blocks the design. But about ten parts of the spec would have shipped bugs as written: publish access, unpublish detection, version restore, copy-to-locale, failed-login detection, media GPS stripping, Option A caching, the embargo tab title, the Access lock-out and CAA binding. Each has a tested or sourced replacement below. Three checks remain that need a live system: Independent MFA on our Cloudflare plan, `chat_member` delivery for channels, and the custom list cell in a running admin.

---

## 1. Summary of decisions

### 1.1 Caching: Option B

Use Option B:

- content functions are wrapped in `unstable_cache(fn, key, { tags, revalidate })` with the §8.3 tags;
- content routes get `export const revalidate`;
- `dynamicParams = false` is removed from the content routes.

In a production build, Option B passed every test the next group ran:

- the admin ran with no errors;
- unknown URLs returned 404 on the first request;
- redirects were a proper 308 with a `Location` header;
- tag invalidation worked with `'max'` and with `{ expire: 0 }`;
- `after()` worked from Payload hooks and custom endpoints;
- `revalidatePath('/[lang]', 'layout')` worked.

Option A as the spec writes it (`cacheComponents` plus `partialPrefetching`) failed in ways the build does not catch:

- an error was logged on every authenticated admin request;
- unknown URLs returned HTTP 200 on the first request, for Googlebot too;
- cached 308 redirects had no `Location` header;
- build-time content was served once after `{ expire: 0 }`;
- HTTP 500 on every dynamic page after a layout or pattern `revalidatePath`, until the process restarted.

Making Option A work needs root params, `<Suspense>` around the Header and around every `params` read, and redirects moved into `proxy.ts`. Revisit it before Next 17, which the Next docs say turns both flags on permanently.

Option B's costs:

- `unstable_cache` is marked as replaced by `'use cache'`, though Next 16 still supports it;
- the uz OG and RSS routes need `revalidatePath` with both the internal and the public path.

### 1.2 Publishing permission: three locks, no Where clause

The `{ _status: { equals: 'draft' } }` pattern in §4.3 does the opposite of what the spec expects. Payload checks such a Where against two different rows: in the admin, against the document's main row; on save, against the latest version. As a result:

- Publish still shows on drafts that were never published, and on the create view;
- a reporter's REST `PATCH {_status: 'published'}` publishes (200);
- reporters cannot save drafts of published stories at all, because the form is read-only.

Replace it with three locks:

1. **Access, for the admin UI.** Articles `update` access returns a boolean. Roles that cannot publish get `false` when `data._status === 'published'`; otherwise their normal role check applies. `create` refuses `_status: 'published'` the same way. This hides Publish and Unpublish from those roles, and Save draft and autosave keep working on live stories.
2. **Operation guard, for the API.** A `beforeOperation` hook throws 403 for those roles on every call that writes the main row:
   - `create` with `_status: 'published'`;
   - `update` without `draft: true`, or with `_status: 'published'`;
   - `restoreVersion` without `draft: true`.

   Access alone leaves four reporter calls open, and each one publishes or unpublishes a story. In the spike the guard closed all four, while draft saves, autosave and create-as-draft kept working. The same hook copies `args.draft` into `req.context`, because `beforeChange` never receives the draft argument.
3. **Two-person hook, for editors.** `hooks/twoPerson.ts` runs when `data._status === 'published'`, except when a version is restored as a draft.

Workflow, ownership and embargo rules are never written as update-access Where clauses on collections with drafts. In the spike, such a clause was checked against a stale main row. It let a reporter save, and the save reverted an editor's draft. These rules run in hooks that load the latest draft.

Two coding rules follow:

- **Code that writes back a document it has read sets `_status` itself.** `payload.update({ draft: true, data })` publishes whenever `data._status` is `'published'`; this is how the built-in Copy to locale publishes.
- **Every transition that does not publish passes `draft: true`.** With `draft: false` and no `_status`, Payload unpublished a live story.

### 1.3 Audit log: one table, timestamps on, insert-only role

Keep the §9.1 design: one `audit_log` table, `timestamps: true`, and the REVOKE of UPDATE, DELETE and TRUNCATE.

The spike ran under a role with only INSERT and SELECT on the table:

- `payload.create` worked, both alone and inside an explicit transaction;
- Payload sent one `INSERT … RETURNING` and one `SELECT`, and never an UPDATE;
- update and delete failed with "permission denied".

Add `lockDocuments: false`, and keep the collection free of array, relationship and hasMany fields, because each one adds a child table that needs its own grants.

### 1.4 Failed logins: `users.hooks.afterError`, no polling job

§9.4 is wrong: a collection-level hook does see failed logins. Both `users.hooks.afterError` and the root `hooks.afterError` received every REST login failure, with the attempted email in `req.data.email` and the request headers. The admin login form posts to `/api/users/login`, so it is covered.

The new design:

- the hook records `auth.login_failed` when the path ends in `/users/login` and the error is `AuthenticationError` or `LockedAuth`;
- it then reads the hidden fields `loginAttempts` and `lockUntil`, and records `auth.locked` when the lock was just set (Payload sets it on the fifth failure);
- the per-minute polling job is dropped;
- the "This user is locked" message is replaced with the generic error, because it reveals that the account exists.

### 1.5 Access JWT: `jose` 5.10.0, checked at login and on every request

Add `jose` 5.10.0 as a direct, exact dependency. Today it resolves only because Payload depends on that version.

Promote `.spike/auth/access-jwt.ts` as `src/payload/access/edge.ts`. The verifier:

- accepts RS256 only, and checks issuer and audience;
- requires the claims `exp`, `iat` and `email`, and requires `type: 'app'`;
- allows 5 s of clock tolerance;
- fetches the remote JWKS with a 5 s timeout and a short cooldown for unknown keys, and fails closed if it cannot be fetched;
- compares emails trimmed and lower-cased.

It passed 15 cases, plus a key rotation and a JWKS outage.

It runs in two places:

- **in `users.hooks.beforeLogin`:** a mismatch returned 403 and left no session and no failed-login count;
- **in the `withEdge` access helper, on every request,** cached in `req.context`.

It cannot be an auth strategy, because Payload catches strategy errors, so a strategy cannot refuse a request.

Separately, the spec's fastest lock-out is wrong (§12.10). Removing someone from the Access group does not end their Access session; their tokens must be revoked as well.

### 1.6 Admin language: Uzbek in Phase 1, cookie prefix stays `muomalat`

Ship the Uzbek admin interface in Phase 1 rather than LATER.

- **It works.** A custom `uz` language runs in 3.90.2 and type-checks with two small casts.
- **It is smaller than estimated:** about 614 strings (587 Payload core keys plus 27 Lexical keys), not about 1,000.
- **How to build it:** Russian plus Uzbek overrides, so untranslated keys stay Russian. Use `fallbackLanguage: 'uz'`, because a browser's Accept-Language header never selects `uz`.
- **Dates:** the admin uses Russian month names, because Payload has no Uzbek date locale wired in.

Keep `cookiePrefix: 'muomalat'`.

- `__Host-muomalat` works for the login cookie, but only with secure cookies and no cookie domain.
- It also stops the admin's language and theme cookies from being saved, so the language choice would not persist.
- The token cookie is already host-only, `Secure`, `HttpOnly` and `SameSite=Strict`.

### 1.7 Lexical editor: same features, rules enforced on the server

Keep the §3.4 feature list. The editors and inline blocks work as specified. The import/serialize round trip was lossless for all 35 mock articles and 28 glossary terms; the only difference was figure width and height, which comes from an import setting.

What changes is where the rules are enforced.

- **Writes through the API.** The admin editor strips disabled formatting only in the browser. REST and Local API writes accept anything: disabled format bits, node types the editor cannot load (quote, upload, horizontal rule), nested lists and `javascript:` links.
- **Pasting.** Even in the admin, pasting lets through checklists, nested lists, alignment and `http:`/`javascript:` links. Pasted h1 and h4–h6 headings become h3.

So:

1. a `body` hook walks the Lexical tree on every save and rejects node types the editor does not register;
2. it reports nested lists, checklists and links that are neither https nor a site path (errors at publish);
3. the link `url` field validates https or a site path;
4. the serializer ignores extra format bits and alignment.

Reads change too:

- `depth: 1` with a narrow `populate`;
- media loaded in a separate query, because public reads leave body media as bare IDs;
- a `resolveDoc` that returns `{ path, slug, published }`.

### 1.8 Other decisions in brief

- **Media metadata (launch MUST).** `formatOptions` strips metadata from the stored original only on a plain upload.
  - The image sizes stay JPEG or PNG.
  - If an editor sets only the focal point in the Edit-image drawer before the first save, Payload stores the raw upload, GPS included.
  - The fix: `formatOptions` on every size, plus a Media `beforeOperation` hook that re-encodes the incoming file. Tested: every stored file came out as WebP with no EXIF, XMP or ICC data.
  - The foundation `src/payload/collections/Media.ts` has this leak today. Do not upload real staff photos until the fix lands.
- **Dates.**
  - The admin's time zone list contains only Asia/Tashkent, and every editor-entered date-time gets `timezone: true`. Without it, the admin shows each staff browser's own zone.
  - Payload returns UTC strings ending in `Z`, so the adapter formats `+05:00` itself.
  - The database session time zone is pinned to UTC.
- **Restore.**
  - Collection version restore must be "as draft" on any story that has been published. The admin's default restore republishes at once.
  - Global version restore runs none of our hooks and publishes at once, so it is guarded in `beforeOperation`.
- **Translations.**
  - The built-in Copy to locale is disabled. It publishes at once when the latest version is published, and it copies the `translation` status.
  - A custom "copy from Uzbek" action replaces it; it always saves a draft.
  - "Publish in <locale>" is blocked.
- **Localization coding rule.** Never call the Local API with `req` and a different `locale`. An open Payload bug (payloadcms#18246) then writes the Russian text into the Uzbek fields. Pass an isolated request instead.
- **Sessions.**
  - The admin renews the token only on activity in its last two minutes, so the idle cut-off falls anywhere between about 2 and 30 minutes.
  - A `refresh` hook adds an absolute 8 h limit (tested).
  - A small admin provider that refreshes on activity gives a real 30-minute idle timeout. It is not yet run in a live admin.
- **Telegram.**
  - The bot can edit its own channel posts at any age.
  - The rights check becomes an allow-list over every `can_*` key.
  - Captions keep the UTF-16 count, now described as a conservative bound.
- **Cloudflare.**
  - CAA account binding is impossible with Universal SSL.
  - Lock-out needs token revocation, not just group removal.
  - Free allows five WAF custom rules and no regex.
  - Purge limits are per account, so staging shares production's budget.
  - Next's `?_rsc=` payloads survive an exact-URL purge, so RSC requests bypass the Cloudflare cache.

---

## 2. All §18 items

Verdicts:

- **confirmed:** the spec's assumption holds.
- **partly:** it holds, with conditions that change the build.
- **differs:** the assumption is wrong.
- **unknown:** it could not be determined.

| # | Question (short) | Verdict | Answer | Evidence |
|---|---|---|---|---|
| 1 | Does `update` access `{ _status: { equals: 'draft' } }` hide Publish/Unpublish without blocking draft saves? How does it interact with the transition endpoint? | differs | The opposite on both counts. Publish still shows on never-published drafts and on create. A reporter's REST publish succeeds. Draft saves of published stories are blocked (the form is read-only). Use data-aware boolean access plus a `beforeOperation` guard. The endpoint runs the caller's access. | Exp: `.spike/access/01-publish-access.ts`, `03-guard.ts`, `08-where-main-vs-latest.ts`, `09-fallback.ts` (`out-01/03/08/09.txt`). Src: `payload/dist/utilities/getEntityPermissions/getEntityPermissions.js:156-192`, `payload/dist/versions/getLatestCollectionVersion.js:33-53`, `@payloadcms/ui/dist/elements/PublishButton/index.js:201-203` |
| 2 | In `beforeChange`, how to tell save-draft from publish from unpublish? | partly | Publish ⇔ `data._status === 'published'`. Draft save and unpublish differ only in the `draft` argument, which `beforeChange` does not receive; `req.query.draft` exists only on built-in REST routes. Copy `args.draft` from `beforeOperation` into `req.context`. `originalDoc` is the latest version, not the main row. | Exp: `.spike/access/02-hook-args.ts` (`out-02.txt`), `03-guard.ts`. Src: `payload/dist/collections/operations/utilities/update.js:40-43, 309-319`; `restoreVersion.js:24, 162`; `@payloadcms/next/dist/views/Version/Restore/index.js:38-53` |
| 3 | Do hook-set values persist on locked fields? Can HTTP set `req.context`? What are the `req.payloadAPI` values? | confirmed | Hook values persist on fields with `update: false`; direct writes are silently dropped. No HTTP route sets `context`. `payloadAPI` is `'REST'` for REST and for Local API calls given an HTTP `req`, and `'local'` for Local API calls without one and for admin server components (which have a user). `context` merges into `req.context` and stays there. | Exp: `.spike/access/02-hook-args.ts` (ITEM 3), `03-guard.ts`. Src: `payload/dist/fields/hooks/beforeValidate/promise.js:218-244`, `payload/dist/utilities/createLocalReq.js:4-20, 86-87`, `createPayloadRequest.js:54-66` |
| 4 | Does admin refresh make `tokenExpiration` an idle timeout? What happens on expiry with sessions? Does `__Host-` work? | partly | Refresh happens only on navigation or form edits in the token's last 2 min, or through the "Stay logged in" dialog at T−60 s, so the idle cut-off is 2–30 min. There is no absolute lifetime; a `refresh` hook can enforce one (tested). `__Host-muomalat` works for the token only with secure cookies and no domain, and it breaks the language and theme cookies. | Exp: `.spike/auth/run-auth.ts`, `run-browser-cookies.ts` (headless Chrome), `run-absolute.ts`. Src: `.spike/auth/extracted/ui-Auth.tsx:146-204`, `payload/dist/auth/cookies.js:65-79`, `payload/dist/auth/operations/refresh.js` |
| 5 | Is `required` on localized fields validated per locale? Do drafts skip validation? | confirmed | Checked only in the locale being written. uz is never enforced from another locale, and `''` counts as missing. `drafts.validate` defaults to false, and drafts skip all field validation. | Exp: `.spike/locale/item5.ts`, `item5h.ts`, `item5j.ts`. Src: `payload/dist/fields/hooks/beforeChange/promise.js:33, 44-130`; `collections/config/sanitize.js:173-198` |
| 6 | Localized fields inside non-localized arrays and localized groups on Postgres with drafts | partly | Works per locale (`articles_locales`, `articles_corrections` plus `_locales`, `_articles_v_*`). Caveats: a row sent without its id replaces the row and wipes the other locales; a save in any locale that drops a row drops it everywhere; open bug #18246 (a nested Local API call with `req` and another locale corrupts the save). | Exp: `.spike/locale/item6.ts`, `item6b.ts`. Src: `payload/dist/utilities/createLocalReq.js:65-77`. Web: github.com/payloadcms/payload/issues/18246 |
| 7 | Does `formatOptions` re-encode the original and strip EXIF/GPS? | partly | Yes for a plain upload. Sizes keep the input format. The crop path stores JPEG bytes named `.webp`. A crop with unchanged dimensions (focal point only) stores the raw upload with GPS: a privacy leak. The fix was tested. | Exp: `.spike/lexical/exif-test.ts` (`exif-result.json`), `media-fixed.ts` (`exif-fixed-result.json`), `focal-test.ts`. Src: `payload/dist/uploads/cropImage.js:18-26`, `generateFileData.js:138-346`, `image-resizing/createImageSizes.js:141-142` |
| 8 | Does the admin work with `cacheComponents` and `partialPrefetching`? | partly | The admin works but logs an error per authenticated request under `partialPrefetching`. The site needs a structural migration and shows runtime failures: soft 404s, 500s after layout revalidation, 308 without `Location`. | Exp: `.spike/next/*.log`, `.spike/next/results/*`. Src: `@payloadcms/next/dist/layouts/Root/index.js:32-37`, `next/dist/server/node-environment-extensions/io-utils.js:70`, `next/dist/server/app-render/app-render.js:3031-3051` |
| 8 (decision) | Option A or B? | decided: B | §1.1. | Exp: `.spike/next/build-legacy.log`, `start-legacy.log`, `results/start-legacy/log.txt`. Doc: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/partialPrefetching.md` |
| 9 | `revalidatePath` with internal `/uz` paths under the rewrite, and OG sub-routes; `after()` from a Payload handler | partly | Pages: the internal path works and the public path does nothing. Route handlers (OG, RSS) regenerated at runtime through the rewrite are tagged with the public path, so pass both forms or use tags. `after()` works from REST hooks and custom endpoints and runs after commit; it throws outside a request. Tag state is held in memory. | Exp: `.spike/next/tools/reval-test.sh`, `.spike/next/app/src/payload/spike/SpikeNotes.ts`. Src: `next/dist/server/route-modules/app-route/module.js:549` vs `app-render/app-render.js:1575`; `next/dist/server/after/after-context.js:127-136`; `lib/incremental-cache/tags-manifest.external.js:27` |
| 10 | Date time zones and admin `timezones` (Asia/Tashkent) | partly | `timezone: true` adds a hidden `<name>_tz` enum column; the date stays `timestamptz`. The API returns UTC `Z` plus `_tz`. The admin shows Tashkent time only on fields with `timezone: true`; others follow the browser. No UTC display. Offset-less strings are read in the Postgres session zone. | Exp: `.spike/locale/item10.ts`, `item10b.ts`, `item10c.ts`, `item10d.ts` (UI logic re-run under three TZs, not a browser). Src: `payload/dist/fields/config/sanitize.js:304-336`, `@payloadcms/ui/dist/fields/DateTime/index.js` |
| 11 | Virtual fields for the embargo title prefix; custom list cells | partly | A virtual field cannot be `useAsTitle` (config error), and `useAsTitle` never sets the browser tab title. A virtual `afterRead` field works as a list column but cannot be sorted or filtered. `admin.components.Cell` exists and type-checks; its rendering in a live admin was not tested. | Exp: `.spike/auth/run-virtual.ts`, `run-importmap.ts`, `EmbargoCell.tsx`. Src: `payload/dist/collections/config/useAsTitle.js:26-27`, `@payloadcms/next/dist/views/Edit/metadata.js`, `@payloadcms/ui/dist/providers/TableColumns/buildColumnState/renderCell.js` |
| 12 | Globals versions key; drafts on globals | differs | The key is `versions.max` (`0` keeps all). Drafts, publish and unpublish behave as in collections. But global restore runs no `beforeChange` hooks or validation and republishes or unpublishes at once, and relationship `filterOptions` validation on globals runs as `req.user`. | Exp: `.spike/locale/item12.ts`, `item12b.ts`, `item12c.ts`, `item12d.ts`. Src: `payload/dist/globals/operations/restoreVersion.js:56-130`, `globals/operations/update.js:205-216`, `utilities/getVersionsConfig.js:28-38` |
| 13 | Join on `articles.mediaRefs`; `filterOptions` with `_status` | partly | A join on the top-level hasMany works (it includes drafts and trashed stories). Bugs: a join into an array of hasMany returns duplicates; a join into blocks crashes every media query. A `_status` filter is validated against the main row at publish, but the admin picker filters on the latest version, so stories being edited vanish from the picker. | Exp: `.spike/locale/item13.ts`, `item13a.ts`, `item13b.ts`, `item13c.ts`, `item13d.ts`. Src: `@payloadcms/drizzle/dist/find/traverseFields.js:235-370`, `@payloadcms/ui/dist/fields/Relationship/Input.js:215-243`, `payload/dist/fields/validations.js:404-470` |
| 14 | Custom endpoint: `context` into `payload.update`, CSRF and cookie auth | confirmed | Same auth and CSRF path as built-in routes. A failed CSRF check leaves `req.user` null instead of rejecting, so the handler checks it. The body is not parsed: call `addDataAndFileToRequest`. Context reaches the hooks. Use `initTransaction` to make the update and the audit insert atomic. | Exp: `.spike/access/02-hook-args.ts` (ITEM 14). Src: `payload/dist/utilities/handleEndpoints.js:97-208`, `wrapInternalEndpoints.js:4-24`, `payload/dist/auth/extractJWT.js:11-38` |
| 15 | Lexical: paste from Docs, glossary links at depth, inline blocks | partly | (a) Disabled marks are stripped only in the admin client; h1 and h4–h6 become h3; checklists, nested lists, alignment and `javascript:` links get through; REST accepts anything. (b) Links resolve at depth ≥ 1; unpublished terms and body media stay bare IDs on public reads. (c) Inline blocks serialize as specified, lossless on the corpus. | Exp: `.spike/lexical/paste-test.ts` (`paste-result.txt`), `depth-test.ts`, `depth-test2.ts`, `depth-test3.ts` (`depth-result.txt`), `roundtrip.ts` (`roundtrip-report.json`). Src: `@payloadcms/richtext-lexical/dist/lexical/plugins/TextPlugin/index.js:16-20`, `features/heading/client/index.js:140-151`, `validate/validateNodes.js:8` |
| 16 | Copy-to-locale in the admin, or a custom action? | partly | The built-in exists and copies blocks and rich text verbatim. But merge mode skips an empty Lexical body; overwrite replaces everything; it copies the `translation` group (including `approved`); and it **publishes at once** when the latest version is published. A custom action is needed; disable the built-in. | Exp: `.spike/auth/run-copy-locale.ts`. Src: `.spike/auth/extracted/ui-copyDataFromLocale.ts:42-328`, `payload/dist/collections/operations/utilities/update.js:40`, `payload/dist/collections/config/types.d.ts:364` |
| 17 | Does root `afterError` see failed logins, or is polling needed? | differs | Both `users.hooks.afterError` (collection level; the spec says none exists) and root `afterError` receive REST login failures, with `req.data.email` and the headers. The lock is applied on the 5th failure. | Exp: `.spike/access/04-failed-login.ts` (`out-04.txt`, `out-04-raw.txt`). Src: `payload/dist/utilities/routeError.js:57-86`, `payload/dist/auth/operations/login.js:21-28, 170-186`, `auth/strategies/local/incrementLoginAttempts.js:4-49` |
| 18 | Does the insert into `audit_log` work with no UPDATE privilege? | confirmed | One `INSERT … RETURNING` and one `SELECT`; timestamps are set in the INSERT; UPDATE and DELETE are denied. Keep `timestamps: true`. | Exp: `.spike/access/05-audit-insert-only.ts` (`out-05-raw.txt`, SQL log). Src: `payload/dist/collections/operations/create.js:291`, `@payloadcms/drizzle/dist/schema/build.js:65-80` |
| 19 | Custom `uz` admin language through `i18n` | confirmed | It works and type-checks with two casts. About 614 strings (587 core plus 27 Lexical). `dateFNSKey: 'ru'`. Accept-Language never selects `uz`, so use `fallbackLanguage: 'uz'`. | Exp: `.spike/auth/uz-language.ts`, `uz-typecheck-negative.ts`, `run-i18n.ts`. Src: `@payloadcms/translations/dist/utilities/init.js`, `utilities/languages.js`, `@payloadcms/richtext-lexical/dist/index.js:52-58` |
| 20a | Cloudflare Independent MFA on our plan | unknown | The docs name no plan (the feature went GA on 15 Apr 2026). A policy can allow only `security_key` and `biometrics`. The first enrolment is trusted without verification. Needs a 2-minute dashboard check. | Doc: `.spike/external/independent-mfa.md`, `imfa.mdx` (no `<Plan>` tag), `changelog-imfa.md`, `blog-mfa.html` |
| 20b | WAF rate-limiting rules: Free and Pro | confirmed | Free: 1 rule, path and Verified Bot only, 10 s. Pro: 2 rules, no method or headers. Cached requests count. A challenge has no duration. Custom rules on Free: 5, with no regex. | Doc: `.spike/external/rl.md`, `rl-params.md:35-39, 187-193`, `custom-rules.md`, `operators.md:52` |
| 20c | Purge by prefix and tag on Free | confirmed | All purge types are on every plan. Free: 5 a minute, bucket of 25, 100 per request. Limits are per account. | Doc: `.spike/external/purge.md`, `purge-prefix.md`, `purge-tags.md:33-48` |
| 20d | Access log retention | confirmed | 24 h on Free; admin logs 18 months; export through the API on any plan. | Doc: `.spike/external/logs_.md`, `dashboard-logs_access-authentication-logs.md:55-76` |
| 20e | Data Privacy Framework entry | confirmed | Cloudflare, Inc., org 5666, EU-US / UK / Swiss: "Active – re-certification under review", checked 9 Oct 2026. Whether it satisfies resolution 415 is for counsel. | Exp: `.spike/external/dpf/search-active.json`, `dpf/participant-5666.json` (official list API) |
| 20f | CAA `accounturi` with Cloudflare-managed certificates | differs | Not enforceable: Universal SSL serves its own CAA set over customer records (CVE-2026-14440). | Doc: `.spike/external/cve-2026-14440.json`, `caa.md`, `cas.md` |
| 21a | Editing bot-sent channel posts older than 48 h | confirmed (docs and source; not live) | No time limit applies to the bot's own posts; `can_post_messages` is enough for them. `deleteMessage` keeps its 48 h limit. | Doc: `.spike/external/tg/api.txt:15151, 15869`. Src: `tg/MessagesManager.cpp:23196-23258` (TDLib master) |
| 21b | `chat_member` delivered for channels? | partly | Expected by the docs and the Bot API server source; not live-tested. The server drops updates older than 24 h; ordinary subscriber joins fire too. | Doc: `.spike/external/tg/api.txt`. Src: `tg/Client.cpp:18702-18720` (telegram-bot-api master) |
| 21c | Current Bot API version | confirmed | 10.3 (24 Aug 2026); it added `can_send_welcome_messages`. | Doc: `.spike/external/tg/changelog.txt:55-90` |
| 22 | Does `update({ data: { _status: 'published' }, draft: false })` publish the latest draft's content? | confirmed | Yes: the main row received the draft's body. Seen by two groups. | Exp: `.spike/access/out-02.txt:47` ("Local publish"); `.spike/locale/item6.ts` step 3 |
| extra | Cloudflare Access JWT check with `jose` | confirmed | The prototype verifier passes 15 cases plus key rotation and JWKS outage. The `beforeLogin` check leaves no session on 403. Strategies cannot veto. | Exp: `.spike/auth/access-jwt.ts`, `run-access-jwt.ts`, `run-access-login.ts`. Src: `node_modules/jose/dist/node/esm/jwks/remote.js:61-87`, `payload/dist/auth/operations/login.js:284-293, 349-357`, `payload/dist/auth/executeAuthStrategies.js` |
| extra | §2.2: route conflict between `[lang]` and the admin? | confirmed (indirect) | No conflict seen: the site, `/admin`, `/api` and `/internal/revalidate` built and served from one app. `/preview` and `/t` were not exercised. | Exp: `.spike/next/build-legacy.log:126-130`, `.spike/next/results/start-legacy/log.txt` |

---

## 3. Changes to CMS-SPEC.md

The quoted text is CMS-SPEC v1.1 as read on 9 October 2026. If the fact-check has since changed a quoted sentence, apply the edit to the sentence that replaced it. "Add" edits give an anchor line; insert the new text after it. Edits are in spec order.

### §1 Decisions at a glance

**S1. Row "Caching".**

Current:
~~~md
Phase 0 chooses Option A (Next Cache Components, `'use cache'` with `cacheTag`) or Option B (`unstable_cache` with ISR).
~~~
Replace with:
~~~md
Option B: content functions wrapped in `unstable_cache` with tags, plus route-level `revalidate` (chosen in Phase 0, see PHASE0-FINDINGS). Option A (Cache Components) is deferred until the Partial Prefetching problems found in Phase 0 are fixed.
~~~

**S2. Row "Admin login".**

Current:
~~~md
Phase 1: Cloudflare Access (security keys or biometrics only) **and** a Payload password;
~~~
Replace with:
~~~md
Phase 1: Cloudflare Access **and** a Payload password. Security keys or biometrics only are enforced at the edge through Independent MFA if our plan has it (§12.3); otherwise the edge relies on the Google Workspace 2-step verification policy, which Access cannot verify;
~~~

### §2 Architecture

**S3. §2.2, "Root layouts" note.**

Current:
~~~md
**VERIFY** that there is no conflict.
~~~
Replace with:
~~~md
No conflict was seen in Phase 0: the site, `/admin`, `/api` and `/internal/revalidate` built and served from one app. `/preview` and `/t` were not exercised.
~~~

**S4. §2.4 Packages.**

Current:
~~~md
"sharp": "<exact>",
"jose": "<exact>",              // Access JWT verification
~~~
Replace with:
~~~md
"@payloadcms/translations": "3.90.2", // uz admin pack (§6.6)
"sharp": "0.35.5",
"jose": "5.10.0",               // Access JWT verification; the version payload@3.90.2 depends on
"bson-objectid": "2.0.4",       // fromMarkup.ts block ids; the version payload uses
~~~

### §3.1 Conventions

**S5. Dates.**

Current:
~~~md
  - The admin shows and enters Asia/Tashkent, with UTC alongside for embargoes.
  - The read layer outputs ISO strings with `+05:00`, the format `scripts/validate-content.ts` already checks.
~~~
Replace with:
~~~md
  - The admin shows and enters Asia/Tashkent: `admin.timezones: { defaultTimezone: 'Asia/Tashkent', supportedTimezones: [{ label: 'Toshkent (UTC+05:00)', value: 'Asia/Tashkent' }] }`, and `timezone: true` on every date-time that an editor enters: `dueAt`, `scheduledAt`, `embargo.until`, `secondRead.dueAt`, `sponsored.campaignStart` / `campaignEnd`, home-page `pinned[].until` and `breaking.until`, ad-slot `startsAt` / `endsAt`, and club-event `startsAt`, `endsAt` and `registrationClosesAt`. A date field without it shows each staff browser's own zone. With one supported zone the zone picker is read-only.
  - `timezone: true` adds a hidden `<field>_tz` Postgres enum column (named oddly: `scheduledAt` → `scheduledat_tz`). Changing the zone list is a migration. A value outside the list fails only at the database, as a raw 500.
  - Payload never shows UTC. The embargo field gets a small `afterInput` or description component that prints the UTC time.
  - System dates (`publishedAt`, `createdAt`, `updatedAt`, the version list) show the browser's zone. Their list cells use a custom Cell that formats in Tashkent.
  - Payload returns dates as UTC strings ending in `Z`. The read layer formats ISO strings with `+05:00` itself, the format `scripts/validate-content.ts` already checks.
  - Hooks, the worker and the import always write ISO strings with `Z` or an explicit offset. The Postgres session time zone is pinned to UTC (§12.2), because offset-less strings are read in the session zone and the dev container runs `TZ=Asia/Tashkent`.
~~~

**S6. System fields.**

Current:
~~~md
- **System fields** are written by hooks only. Each collection `beforeChange` hook first copies these fields from `originalDoc`, which discards anything a client sent, and then sets them itself.
~~~
Replace with:
~~~md
- **System fields** are written by hooks only. Each collection `beforeChange` hook first copies these fields from `originalDoc`, which discards anything a client sent, and then sets them itself. Field-level `access: { create: () => false, update: () => false }` is a second guard: Payload drops client values silently, and values set in a collection hook still persist (confirmed in Phase 0).
~~~

**S7. Drafts.**

Current:
~~~md
- **Drafts.** Every content collection uses `versions.drafts` (drafts are not validated, **VERIFY**). Payload's `_status` means "public or not". Our `workflowStatus` means "where in the newsroom process".
~~~
Replace with:
~~~md
- **Drafts.** Every content collection uses `versions.drafts`. Drafts are not validated (confirmed in Phase 0; `drafts.validate` stays at its default, `false`). Payload's own checks (`required` on non-localized fields such as `slug` and `rubric`, select options, `filterOptions`) therefore run only on publish, and every publish rule in §7 must run in the publish path. Payload's `_status` means "public or not". Our `workflowStatus` means "where in the newsroom process".
~~~

### §3.3 Articles

**S8. Collection options.** Add after this line:
~~~md
- `enableQueryPresets: true`.
~~~
New text:
~~~md
- `admin.disableCopyToLocale: true`: the built-in Copy to locale publishes and copies translation status (see the "Tarjima" tab).
~~~

**S9. Custom list cells.**

Current:
~~~md
- Custom list cells: an embargo badge and a translation-status dots column.
~~~
Replace with:
~~~md
- Custom list cells (`admin.components.Cell`, server components registered in the import map): an embargo badge on the `embargo` group; a Cell on `title` that renders the badge before the title (a custom Cell replaces the default one, so it renders the link to the document itself); and a translation-status dots column.
~~~

**S10. Field `related`.**

Current:
~~~md
`filterOptions`: not self, not sponsored, published
~~~
Replace with:
~~~md
`filterOptions`: not self, `sponsored.enabled` ≠ true, `firstPublishedAt` exists, `withdrawal.at` does not exist. There is no `_status` filter: the admin picker queries the latest version, so a `_status` filter hides stories that have a pending draft. ART-19 checks at publish that each target is currently published (main row, `draft: false`)
~~~

**S11. Corrections `publicText`.**

Current:
~~~md
`publicText` [L] (textarea; uz required; ru/en required when that translation is approved)
~~~
Replace with:
~~~md
`publicText` [L] (textarea; uz required; ru/en required when that translation is approved; enforced in `hooks/corrections.ts`, never with `required: true`, which Payload checks in every saving locale for every row)
~~~

**S12. Tab "Tarjima".**

Current:
~~~md
- A "Copy Uzbek body into this language" action for translators. **VERIFY** Payload's copy-to-locale feature; otherwise use a custom endpoint.
~~~
Replace with:
~~~md
- An "Oʻzbekchadan nusxalash" (copy from Uzbek) action for translators: a custom endpoint and document button. The built-in Copy to locale does not fit (Phase 0): it publishes at once when the latest version is published, copies the `translation` group (including an `approved` status), does not fill a body that holds an empty Lexical state, and its overwrite mode replaces every field. The action:
  - copies only `title`, `kicker`, `lead`, `body` and `imageCaption` (and media alt, if wanted) from uz into the current locale;
  - per field, fills it when empty (an empty Lexical root counts as empty), or overwrites it when the translator chooses;
  - always saves a draft (`draft: true`, `_status: 'draft'`);
  - sets `translation.status` to `in_edit` (`machine_draft` when machine translation was used) and `translatedBy` to the user;
  - never copies `translation.*`, `meta`, `sponsored.*` or `corrections[].publicText`.
~~~

**S13. Field `mediaRefs`.**

Current:
~~~md
| `mediaRefs` | relationship → media, hasMany, hidden, system | — | Every media item used by hero, body or SEO; powers "Used in" |
~~~
Replace with:
~~~md
| `mediaRefs` | relationship → media, hasMany, hidden, system | — | Every media item used by hero, body or SEO; powers "Used in". Must stay a top-level hasMany relationship: in 3.90.2 a join into an array of hasMany relationships returns duplicates, and a join into blocks crashes every media query |
~~~

### §3.4 Article body

**S14. Pasting.**

Current:
~~~md
- Text pasted from Google Docs or Telegram loses unsupported formatting. **VERIFY**
~~~
Replace with:
~~~md
- **Pasting** (Phase 0). From Google Docs or Telegram, the admin editor keeps only bold and italic, because Payload's client `TextPlugin` removes every disabled format. Blockquotes, tables, images and horizontal rules become paragraphs or are dropped; scripts and iframes are removed. Some things get through:
  - Docs headings h1 and h4–h6 become **h3** (Payload maps a disabled heading to the last enabled size). If h1 should become h2, add a small feature with a `HeadingNode` transform (optional);
  - checklists arrive as lists with `listType: 'check'`;
  - nested lists survive;
  - text alignment is stored as the paragraph `format`;
  - links keep `http:`, `javascript:` and `#` anchors;
  - a Telegram line break becomes a `linebreak` node.
~~~

**S15. Server-side enforcement.** Add after the line that starts:
~~~md
- **Not enabled:** underline, strikethrough, sub/superscript, inline code, alignment, indent,
~~~
New text:
~~~md
- **Server-side enforcement (MUST).** The editor's limits exist only in the browser. REST and the Local API accept disabled format bits, node types the editor does not register (quote, upload, horizontal rule), nested lists and `javascript:` links, and drafts skip validation. So:
  - a `body` hook (`beforeValidate`, every save, drafts included) walks the Lexical tree and rejects node types the editor does not register, because the admin editor cannot load them;
  - the same walk reports nested lists, `listType: 'check'` and links that are neither `https:` nor a site path (ART-21, ART-22: errors at publish, findings on drafts);
  - the LinkFeature `fields` override validates the `url` field with `^https://` or `^/(?!/)` (runs at publish);
  - the serializer ignores extra format bits and element `format` (alignment).
~~~

**S16. Block `table`.**

Current:
~~~md
`data` (textarea: paste from Excel or CSV; tab, semicolon or comma separated)
~~~
Replace with:
~~~md
`data` (textarea: paste from Excel or CSV; tab or semicolon separated; comma is not a separator, because it is the Uzbek decimal mark)
~~~

Current:
~~~md
Empty cell → `null`; otherwise string.
~~~
Replace with:
~~~md
Empty cell → `null`; a cell in Uzbek number format → number; otherwise string. A text cell that looks like a number (a year, a code such as "05") becomes a number; none exist in the mock data.
~~~

**S17. Block `chart`.**

Current:
~~~md
Line data: a header row `Davr;Series A;Series B…`, then one row per period.
~~~
Replace with:
~~~md
Line data: a header row `Davr;Series A;Series B…` (its first cell is ignored; the axis label is `xLabel`), then one row per period. Bar labels and series names cannot contain `;`.
~~~

**S18. Serializer contract.**

Current:
~~~md
serializeBody(state: SerializedEditorState, ctx: { resolveDoc(rel): {path} | undefined, mediaById: Map, locale }): ArticleBlock[]
~~~
Replace with:
~~~md
serializeBody(state: SerializedEditorState, ctx: { locale, resolveDoc(rel): { path, slug, published } | undefined, mediaById: Map<id, MediaDoc>, warn(code, message) }): ArticleBlock[]
// resolveDoc returns undefined for a bare id read at depth ≥ 1: the target is not visible (unpublished or deleted)
~~~

**S19. Serializer node table.**

Current:
~~~md
| `paragraph` | `{ type:'p', text: serializeInline(children) }`; empty paragraphs are dropped |
~~~
Replace with:
~~~md
| `paragraph` | `{ type:'p', text: serializeInline(children) }`; empty paragraphs are dropped; element `format` (alignment from a paste) is ignored |
~~~

Current:
~~~md
| `list` (`bullet` / `number`) | `{ type:'list', ordered, items: listitem → serializeInline }`; nested lists give error ART-21 |
~~~
Replace with:
~~~md
| `list` (`bullet` / `number`) | `{ type:'list', ordered, items: listitem → serializeInline }`; nested lists and `listType: 'check'` give error ART-21 |
~~~

Current:
~~~md
| `link` (internal doc) | `[label](/rubric/slug)` or `[label](/lugat/slug)`; an unpublished target gives a warning |
~~~
Replace with:
~~~md
| `link` (internal doc) | `[label](/rubric/slug)` or `[label](/lugat/slug)`; a target that is not visible (`resolveDoc` returns `undefined`) is dropped, the label is kept, and ART-19 warns. Formatting inside a link is dropped |
~~~

### §3.12 Media

**S20. Upload configuration.**

Current:
~~~md
  formatOptions: { format: 'webp', options: { quality: 82 } },   // re-encode strips EXIF/GPS — VERIFY applies to original
  imageSizes: [
    { name: 'thumb', width: 400 }, { name: 'card', width: 800 },
    { name: 'wide', width: 1600 }, { name: 'og', width: 1200, height: 630, position: 'centre' },
  ],
~~~
Replace with:
~~~md
  formatOptions: { format: 'webp', options: { quality: 82 } },   // the stored original, plain uploads only (Phase 0)
  imageSizes: [   // webp = { format: 'webp', options: { quality: 82 } }; the collection formatOptions does not apply to sizes
    { name: 'thumb', width: 400, formatOptions: webp }, { name: 'card', width: 800, formatOptions: webp },
    { name: 'wide', width: 1600, formatOptions: webp }, { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: webp },
  ],
~~~

Add after this line:
~~~md
The file size limit is 15 MB, set in the Payload `upload.limits`.
~~~
New text:
~~~md
**Metadata stripping (MUST, Phase 0).** `formatOptions` re-encodes and strips the original only on a plain upload. With the admin's crop tool, the stored original is a cropped JPEG named `.webp`. When crop data arrives with unchanged dimensions, Payload stores the raw upload with its EXIF, GPS, XMP and ICC data. The Edit-image drawer sends exactly that whenever an editor sets only the focal point before the first save.

A Media `hooks.beforeOperation` (create and update) therefore re-encodes `req.file.data` with `sharp(data).rotate()` (sharp drops all metadata by default) and updates `size` and `mimetype` before Payload processes the file.

- Tested in Phase 0 with a WebP quality-95 intermediate (`.spike/lexical/media-fixed.ts`): every stored file came out as WebP with no EXIF, XMP or ICC.
- A lossless intermediate avoids a second lossy encode, but on the unchanged-crop path Payload keeps the intermediate as the stored original, so it would be large. This is an inference from `cropImage.js`.
- `crop: false` alone does not fix the image sizes.
- Moving the focal point later does not re-encode the stored original.
~~~

**S21. Field `usedIn`.**

Current:
~~~md
| `usedIn` | join → `articles.mediaRefs` | — | — | "Qayerda ishlatilgan" (where used) |
~~~
Replace with:
~~~md
| `usedIn` | join → `articles.mediaRefs` | — | — | "Qayerda ishlatilgan" (where used). Lists drafts as well as published stories, and says so in its label; trashed stories are left out with the join's `where: { deletedAt: { exists: false } }`. Media `delete` checks this count first: deleting a media item cascades through `articles_rels` and silently removes the references |
~~~

### §3.16 Globals

**S22. Versions and restore.**

Current:
~~~md
All globals keep versions (`versions.max: 0`; **VERIFY** the key name for globals) and are audited.
~~~
Replace with:
~~~md
All globals keep versions and are audited: `versions: { drafts: true, max: 0 }` for `home-page`, `ad-slots` and `navigation`, and `versions: { max: 0 }` for the others. Globals use `max`; `maxPerDoc` is missing from the global types (Payload still enforces it) and is not used.

- **Restore bypasses our hooks.** `restoreGlobalVersion` runs no `beforeValidate` or `beforeChange` hooks and no field validation. It writes the main row directly and republishes at once (with `?draft=true` it unpublishes). The admin offers no "restore as draft" for globals. A `beforeOperation` hook on `restoreVersion`:
  - limits restore to the roles that may publish that global;
  - re-runs HOME-1, HOME-2, SP-7 and SET-1 against the version being restored.

  `afterChange` audits the restore.
- **Public reads.** An unpublished global's main row holds the draft content. The read layer treats a global whose `_status` is not `published` as absent and uses the "Empty →" defaults. Public `access.read` returns `{ _status: { equals: 'published' } }`.
- **System writes.** Worker and scheduler calls to `updateGlobal` pass a system `user` that can read articles: relationship `filterOptions` validation on globals runs as `req.user`, and without one it rejects valid articles.
- **Unpublish calls** (the ad-slots veto, custom endpoints) pass `unpublishAllLocales: true`. Without it the whole global is validated and the call can fail.
~~~

**S23. `home-page.lead`.**

Current:
~~~md
| `lead` | rel articles | `filterOptions`: published, not sponsored, not withdrawn. Empty → newest `featured` non-sponsored story (today's `getLeadStory`) |
~~~
Replace with:
~~~md
| `lead` | rel articles | `filterOptions` (the picker): `firstPublishedAt` exists, not sponsored, not withdrawn; no `_status` filter (see `related`, §3.3). HOME-2 checks the current published state. Empty → newest `featured` non-sponsored story (today's `getLeadStory`) |
~~~

### §4.2 Permission matrix

**S24. Restore row.**

Current:
~~~md
| Restore a version (creates a draft) | — | ✓ | ✓ | — | — |
~~~
Replace with:
~~~md
| Restore a version as a draft (on a story that has been published, a restore without `draft: true` is rejected for every role, §5.12) | — | ✓ | ✓ | — | — |
~~~

### §4.3 How access is implemented

**S25. `isTrustedInternal` comment.**

Current:
~~~md
/** Trusted in-process callers (worker, scripts) set this; HTTP requests can never set req.context. VERIFY */
~~~
Replace with:
~~~md
/** Trusted in-process callers (worker, scripts) set this. HTTP requests cannot set req.context (Phase 0).
 *  Set it only on Local API calls made without an HTTP `req`: context merges into req.context and stays there. */
~~~

**S26. The publish lock and related rules.**

Current:
~~~md
- **The publish permission is double-locked:**
  - `update` access returns `{ _status: { equals: 'draft' } }` for reporters and commercial. This is the documented pattern that hides Publish in the UI (**VERIFY** side effects).
  - **And** `hooks/twoPerson.ts` throws on any disallowed publish, whatever the UI did.
~~~
Replace with:
~~~md
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
~~~

### §4.4 Account lifecycle

**S27. Joiner.**

Current:
~~~md
   - The person is added to the Cloudflare Access policy group and enrols two security keys.
~~~
Replace with:
~~~md
   - The person enrols two security keys at `/AddMfaDevice`, in front of an admin, **before** being added to the Cloudflare Access policy group: Access trusts the first enrolment without a second factor. An admin then checks Zero Trust → Users → MFA devices.
~~~

**S28. Leaver.**

Current:
~~~md
   - revoke their Access sessions;
~~~
Replace with:
~~~md
   - revoke their Access sessions (Users → Revoke). Removing them from the group alone leaves their session working until it expires (§12.10);
~~~

### §5 Editorial workflow

**S29. §5.2, the transition endpoint.**

Current:
~~~md
**VERIFY** that a custom endpoint can pass `context` and that HTTP requests cannot.
~~~
Replace with:
~~~md
Confirmed in Phase 0. The endpoint gets the same cookie auth and CSRF check as built-in routes. `context` reaches `beforeOperation`, `beforeChange` and `afterChange`, and HTTP requests cannot set `context`. The endpoint must:

- return 401 when `req.user` is null, and check the role itself. A cookie request from a foreign origin is not rejected: Payload ignores the cookie and the request runs as anonymous, and custom endpoints get no automatic access control;
- parse the body with `await addDataAndFileToRequest(req)`; custom endpoints do not get `req.data`;
- pass `draft` explicitly on every call, with `draft: true` for every transition that does not publish. With `draft: false` and no `_status`, Payload writes the latest draft into the main row as `draft`, which unpublishes a live story;
- wrap the update and its audit insert in `initTransaction(req)`, then `commitTransaction(req)` or `killTransaction(req)`. Otherwise `payload.update` commits on its own;
- not let hooks rely on `req.query`: they see the endpoint's own query string, with `draft` as the string `'true'`.

`payload.update({ req, context })` merges `context` into `req.context`, and the keys stay on `req` for later calls in the same request.
~~~

**S30. §5.3, when the two-person hook runs.**

Current:
~~~md
This runs in `hooks/twoPerson.ts` as an articles `beforeChange` hook for every operation where `data._status === 'published'`.
~~~
Replace with:
~~~md
This runs in `hooks/twoPerson.ts` as an articles `beforeChange` hook on every write that publishes: `data._status === 'published'`, except a version restored as a draft (`context.isRestoringVersion && context.draftArg`). On a restore, Payload sets `data._status` to the restored version's status even when it saves a draft. A call with `?draft=true` and `_status: 'published'` still publishes. `originalDoc` is the latest version, not the live row: the workflow checks below read it, but whether the story is live comes from `firstPublishedAt`.
~~~

**S31. §5.3.1, loading all locales for the hash.**

Current:
~~~md
The hook therefore loads the document with `locale: 'all', draft: true` and merges `data` into it before hashing.
~~~
Replace with:
~~~md
The hook therefore loads the document with `locale: 'all', draft: true`, through an isolated request (`isolateObjectProperty(req, ['locale', 'fallbackLocale'])`, bug payloadcms#18246, §4.3), and merges `data` into it before hashing.
~~~

**S32. §5.8, unpublish detection.**

Current:
~~~md
  - **VERIFY** how to tell "save draft" from "unpublish" in `beforeChange`, using the hook args or `req.query.draft`.
~~~
Replace with:
~~~md
  - **Detection** (Phase 0). `beforeChange` gets no draft argument, and its `originalDoc` is the latest version, not the live row. The articles `beforeOperation` hook stores `Boolean(args.draft)` in `req.context.draftArg` (§4.3).
    - An unpublish is `data._status === 'draft'` with no draft argument, on a story that is live. Read "live" from `firstPublishedAt` or `findByID({ draft: false })._status`, never from `originalDoc._status`.
    - The admin's Unpublish sends `?unpublishAllLocales=true`. Three other calls unpublish the same way and must be caught by the same rule: a plain `PATCH {_status:'draft'}`, `?draft=false`, and a PATCH with neither `draft` nor `_status` on a story whose latest version is a draft.
~~~

**S33. §5.10, admin display.**

Current:
~~~md
  - a red `EmbargoBadge` list cell: "EMBARGO 14:00 (09:00 UTC)";
~~~
Replace with:
~~~md
  - a red `EmbargoBadge` list cell: "EMBARGO 14:00 (09:00 UTC)", as a Cell on the `embargo` group and in front of the title (the Cell on `title`, §3.3);
~~~

Current:
~~~md
  - the browser tab title prefixed with "EMBARGO" through a virtual field used as the title (**VERIFY** virtual fields).
~~~
Replace with:
~~~md
  - the browser tab title prefixed with "EMBARGO · " by the edit-view banner component, which sets `document.title` in an effect while the embargo is active. A virtual field cannot be `useAsTitle`, and `useAsTitle` never sets the tab title (Phase 0).
~~~

**S34. §5.10, handover list.**

Current:
~~~md
- **Handover list.** A saved query preset "Embargolar" (embargoes) lists all active embargoes by release time.
~~~
Replace with:
~~~md
- **Handover list.** A saved query preset "Embargolar" (embargoes) lists embargoes by release time. It filters on stored fields only (`embargo.indefinite = true` or `embargo.until` exists, sorted by `embargo.until`), never on a virtual field. A saved preset probably cannot hold a relative "now" (lead's inference, untested), so the badge shows which embargoes are still active.
~~~

**S35. §5.11, item 22.**

Current:
~~~md
**VERIFY** (§18, item 22) that `payload.update` with `data: { _status: 'published' }` and `draft: false` publishes the latest draft's content, not the last published version.
~~~
Replace with:
~~~md
Confirmed in Phase 0 (§18 item 22): this call publishes the latest draft's content. The worker runs outside a request, so `after()` throws there; its invalidations go through the outbox (§8.4).
~~~

**S36. §5.12, restore.**

Current:
~~~md
Restoring a version creates a draft, and publishing it follows the normal rules.
~~~
Replace with:
~~~md
Restoring a collection version must create a draft. The admin's Restore button sends `?draft=false` by default, which republishes at once; "Restore as draft" is a sub-menu item, offered only for versions that are not drafts. So `beforeOperation` rejects `restoreVersion` without `draft: true` on any story with `firstPublishedAt` set, and its message points to "Restore as draft". Restoring a draft version onto a live story is therefore not possible from the admin; this is accepted. Publishing the restored draft follows the normal rules. Globals behave differently (§3.16).
~~~

### §6 Localization

**S37. §6.1, per-locale publish.** Add after this line:
~~~md
`experimental.localizeStatus` (per-language publish status, Beta) is **not** enabled.
~~~
New text:
~~~md
**"Publish in <locale>" is blocked.** The admin offers it (`publishSpecificLocale`) to anyone who may publish. In Phase 0, on a story that had never been published, it set the main row to published with only that locale's title. The `beforeOperation` hook of `articles`, `glossary-terms` and `club-events` rejects `args.publishSpecificLocale`.
~~~

**S38. §6.2, `required` and arrays.**

Current:
~~~md
Payload `required: true` is **not** set on localized fields. The `uz` requirement is enforced by `hooks/validate.ts`. **VERIFY** whether Payload validates required localized fields per saved locale.
~~~
Replace with:
~~~md
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
~~~

**S39. §6.3, approval and copying.** Add after this line:
~~~md
  - On approval the hook records `reviewedBy`, `approvedAt` and `contentHash`. The hash covers that locale's `title`, `kicker`, `lead`, `body` and `imageCaption`.
~~~
New text:
~~~md
  - The hook rejects any write that brings in `translation.status`, `approvedAt`, `reviewedBy` or `contentHash` values unless the approval rules pass. A copied `approved` status (for example from Payload's Copy to locale, if it is ever enabled) must never pass the read gate.
  - The hash is computed from a read with `locale: 'all'` through an isolated request (§4.3, bug payloadcms#18246).
~~~

**S40. §6.5, depth and media.**

Current:
~~~md
    where: { slug: { equals: slug } }, depth: 2, overrideAccess: false, user: draftUser })   // locale 'all': one query, all languages
~~~
Replace with:
~~~md
    where: { slug: { equals: slug } }, depth: 1, overrideAccess: false, user: draftUser,
    populate: { 'glossary-terms': { slug: true, _status: true }, articles: { slug: true, rubric: true, _status: true } } })   // locale 'all': one query, all languages
~~~

Add after this line:
~~~md
- `toView` computes `readingMinutes` and `url`.
~~~
New text:
~~~md
- **Depth** (Phase 0). `depth: 1` populates link targets, glossary links, term cards and figures in the body. Each relationship inside rich text uses one depth level, so `depth: 2` also populated the glossary links inside every linked term's definition. Article paths come from a rubric-id → slug map.
- **Media** come from a separate `payload.find({ collection: 'media', where: { id: { in: ids } }, locale: 'all', overrideAccess: true })` into `mediaById`, for the IDs that the published document references. On the public read (no user, `overrideAccess: false`), uploads stay bare IDs, because Media read access refuses anonymous metadata reads. Also, with `locale: 'all'`, documents populated inside rich text come back in the default locale only.
- **A bare ID at depth 1 means "not visible"** (unpublished or deleted). `resolveDoc` returns `undefined`: the link is dropped, the label is kept, and ART-19 warns.
~~~

**S41. §6.6, admin language.**

Current:
~~~md
- Payload ships 44 admin languages and no `uz`.
- **Phase 1:** `i18n.supportedLanguages: { ru, en }` with `fallbackLanguage: 'ru'`. All collection and field labels and descriptions are written in Uzbek, so editors see Uzbek wherever it matters.
- **LATER:** add a custom `uz` language pack through `i18n.supportedLanguages` and `translations`, by translating the `ru` pack, about 1,000 strings. **VERIFY** whether custom languages are supported.
~~~
Replace with:
~~~md
- Payload ships 44 admin languages and no `uz`. A custom language works in 3.90.2 (Phase 0).
- **Phase 1:** a `uz` pack in `src/payload/i18n/uz.ts`, built as Russian plus Uzbek overrides so that untranslated keys stay Russian:
  - `const uz: Language = { dateFNSKey: 'ru', translations: deepMergeSimple(ru.translations, uzOverrides) }`, with `uzOverrides` typed `DeepPartial<DefaultTranslationsObject>`, so a misspelt key fails the typecheck;
  - `i18n.supportedLanguages: { ...{ uz }, ru, en }` (a fresh `{ uz, ru, en }` literal is a type error) and `fallbackLanguage: 'uz' as AcceptedLanguages`. A browser's `Accept-Language` never selects `uz`, so the fallback is what makes Uzbek the default;
  - `i18n.translations: { ...{ uz: { lexical: …, muomalat: … } }, ru: { muomalat: … } }`. The uz entry must include the `lexical` namespace (27 strings today, more if features are added), otherwise every Lexical label shows as a raw key. It also carries our own component strings. Another known language key is needed next to `uz`, because an object with only `uz` is a type error;
  - about 614 strings to translate (587 Payload core + 27 Lexical in 3.90.2), not about 1,000;
  - dates in the admin use Russian month names, because Payload has no `uz` date-fns locale wired in.
- All collection and field labels and descriptions are written in Uzbek, as before.
~~~

### §7.2 Rule table

**S42. ART-20.**

Current:
~~~md
| ART-20 | Literal markup characters in text (`**`, `[[`, `](`, `{en:`) | W | | new (serializer) |
~~~
Replace with:
~~~md
| ART-20 | Literal markup characters in text (`*`, `**`, `[[`, `](`, `{en:`): W. Text that breaks the markup and cannot round-trip: E. That means a link label containing `]`, a URL containing `)`, a glossary label containing `\|`, or keepLatin text containing `}`. The serializer finds both by re-tokenising its own output with the `TOKEN` regex | W / E | | new (serializer) |
~~~

**S43. ART-21.**

Current:
~~~md
| ART-21 | Formatting inside a heading; nested list; bold + italic | W / E (nested list) | | new |
~~~
Replace with:
~~~md
| ART-21 | Formatting inside a heading or a link (dropped); bold + italic (becomes bold); a line break (becomes a space): W. Nested list or `listType: 'check'`: E | W / E | | new |
~~~

**S44. ART-22.**

Current:
~~~md
| ART-22 | External link not https; link to a disallowed scheme | E | | new |
~~~
Replace with:
~~~md
| ART-22 | External link not https; link to a disallowed scheme. Enforced on the server, because REST, the Local API and pasting all accept `http:` and `javascript:` links (§3.4) | E | | new |
~~~

### §8 Content adapter, caching and revalidation

**S45. §8.2, the caching model.** Current: the whole of §8.2, from `**Option A (preferred if the Phase 0 spike passes).**` to `Both options use the same tags (§8.3) and the same invalidation code.` Replace with:
~~~md
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
~~~

**S46. §8.4 step 1.4, outside a request.**

Current:
~~~md
   4. In worker context, `after` is unavailable; the worker posts to `/internal/revalidate` once its operation returns.
~~~
Replace with:
~~~md
   4. Outside a request (worker, scheduler, import, break-glass scripts), `after()` throws "called outside a request scope", and a direct `revalidateTag` throws as well.
      - `invalidate.ts` wraps `after()` in try/catch. On failure it leaves the work to the outbox row from step 2, which the worker posts to `/internal/revalidate`.
      - Nothing calls `revalidateTag` or `revalidatePath` directly outside a request.
      - Payload `jobs.autoRun` is never enabled in the app process. Payload starts its cron there (`getPayload({ cron: true })`), and those jobs run outside a request.
~~~

**S47. §8.4 step 2, invalidation.**

Current:
~~~md
   - `revalidateTag('article:<id>', { expire: 0 })` for the changed article: the next request blocks and gets fresh data;
~~~
Replace with:
~~~md
   - `revalidateTag('article:<id>', { expire: 0 })` for the changed article: the next request blocks and gets fresh data (confirmed under Option B);
~~~

Current:
~~~md
   - `revalidatePath()` for the **internal** paths: `/uz/<rubric>/<slug>`, `/kr/…`, `/ru/…`, `/en/…`, plus the `/opengraph-image` sub-route. With a rewrite, the destination path is the one to pass (local Next docs, `revalidatePath`). **VERIFY** that this also holds for `proxy.ts` rewrites and for OG routes.
~~~
Replace with:
~~~md
   - `revalidatePath()` for pages uses the **internal** path: `/uz/<rubric>/<slug>`, `/kr/…`, `/ru/…`, `/en/…`. This was confirmed under the `proxy.ts` rewrite; the public path does nothing.
   - **Route handlers in the uz edition** (`opengraph-image`, `rss.xml`) need **both** forms: `/uz/<r>/<s>/opengraph-image` and `/<r>/<s>/opengraph-image`, and `/uz/rss.xml` and `/rss.xml`. An entry regenerated at runtime through the rewrite is tagged with the public path. `proxy.ts` serves OG images at their `/uz` path, but `/rss.xml` always goes through the rewrite.
   - `revalidatePath` on a page never refreshes its `opengraph-image`. Because OG routes and `lib/rss.ts` read through the tagged content functions, `revalidateTag` covers them either way.
~~~

**S48. §8.4 step 3, re-post after restarts.** Add after this line:
~~~md
3. **Worker outbox loop** (every 5 s) over `publish-events` with `status = pending`:
~~~
New text:
~~~md
   0. **Re-post invalidations.** For each pending event, POST its targets to `/internal/revalidate` before the warm-up. Next keeps tag invalidations in memory, so a restart forgets any it has not yet acted on. The repeat is harmless.
~~~

**S49. §8.4 purge.** Add after this line:
~~~md
      - Use prefix purge (`muomalat.uz/<rubric>/<slug>`, …) only for slug or rubric changes, where unknown sub-URLs may exist.
~~~
New text:
~~~md
      - Purge limits are **per account** and shared by every zone on the same plan, staging included (§15). Batch up to 100 prefixes or tags per request.
      - Next's RSC payloads are requested with a `?_rsc=` query, and an exact-URL purge does not remove those variants. The cache rule below therefore bypasses the cache for RSC requests. Tag purge (`Cache-Tag: p:<path>` set by `proxy.ts`, available on Free) is the alternative if RSC caching is ever wanted.
~~~

**S50. §8.4 cache rules.** Add after this line:
~~~md
   - cache bypassed when the request carries `__prerender_bypass` or a `muomalat-token` cookie, which should not happen on this host. Payload names its cookie `<cookiePrefix>-token`, and §12.2 sets `cookiePrefix: 'muomalat'`, so the cookie is not called `payload-token`;
~~~
New text:
~~~md
   - cache bypassed for RSC requests: `_rsc` in the query or an `RSC` request header. Which RSC responses Next marks cacheable under Option B is still to be checked;
~~~

**S51. §8.7 OG images.**

Current:
~~~md
- **OG images** keep being generated by `next/og` from article data. They are invalidated with the article paths.
~~~
Replace with:
~~~md
- **OG images** keep being generated by `next/og` from article data, read through the tagged content functions. An unknown slug calls `notFound()` instead of returning the generic card. Invalidation is covered in §8.4 step 2: tags, plus both path forms in the uz edition.
~~~

### §9 Audit log

**S52. §9.1, insert-only.**

Current:
~~~md
**VERIFY** that Payload's insert path never needs UPDATE on `audit_log`, for example for `updatedAt`. If it does, set `timestamps: false` on the collection.
~~~
Replace with:
~~~md
Confirmed in Phase 0. Payload's create sends one `INSERT … RETURNING` and one `SELECT`, never an UPDATE, and sets `created_at` and `updated_at` in the INSERT. Under a role with only INSERT and SELECT on the table, `payload.create` worked alone and inside a transaction, and `payload.update` and `payload.delete` failed with "permission denied". `timestamps` stays `true`, and the REVOKE above stays. Also:

- `lockDocuments: false` on `audit-log`, so Payload's document-lock table never references audit rows;
- no array, relationship or hasMany fields (each adds a child table that needs its own INSERT grant);
- the `GRANT … ON ALL SEQUENCES` line covers `audit_log_id_seq`;
- the grants are re-applied after every migration, because the default privileges give UPDATE and DELETE to any table a migration re-creates.
~~~

**S53. §9.2, Auth events.**

Current:
~~~md
`auth.login_failed` (§9.4) |
~~~
Replace with:
~~~md
`auth.login_failed` (§9.4), `auth.edge_login_failed` (optional, from the Access log, §9.4) |
~~~

**S54. §9.4, failed logins.** Current: the whole of §9.4, from `Payload 3 has no failed-login hook.` to `(retained 24 h on the free plan per third-party sources; export them if needed).` Replace with:
~~~md
Phase 0 found a collection-level hook that sees failed logins. `users.hooks.afterError` receives every REST login failure, and so does the root `hooks.afterError`. The admin login form posts to `/api/users/login`, so it is covered.

- **`auditFailedLogin`** (users `afterError`): when `req.pathname` ends with `/users/login` and `error.name` is `AuthenticationError` (wrong password or unknown email) or `LockedAuth` (account locked), it writes `auth.login_failed`. The row holds the attempted email (`req.data.email`) and the IP and country (`cf-connecting-ip`, `cf-ipcountry`).
- **Lock detection.** The same hook reads the user's `loginAttempts` and `lockUntil` with `payload.db.findOne`. They are hidden fields, and Payload has already written the new count outside any transaction. It writes `auth.locked` when `lockUntil` has just been set; Payload sets it on the fifth failure.
- **No account enumeration.** The hook replaces the `LockedAuth` message ("This user is locked…") with the generic login error.
- **Optional:** users `beforeOperation` (operation `login`) runs before the password check on every attempt and can count all attempts.
- A Local API `payload.login` failure does not reach `afterError`. Only scripts use it.
- §9.3's "five or more failed logins in 10 min" is computed from these rows. There is no polling job.
- **Edge.** Cloudflare Access keeps authentication logs for 24 h on Free and 30 days on Standard ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/insights/logs/)); Logpush is Enterprise-only. An optional worker job pulls `GET /accounts/{account_id}/access/logs/access_requests` hourly, with a token that can only read Access audit logs, and writes `auth.edge_login_failed` rows.
~~~

### §10 Telegram

**S55. §10.2 `captionHtml`.**

Current:
~~~md
counted in UTF-16 units (JS `string.length`). Max 1024 with a photo, 4096 for text.
~~~
Replace with:
~~~md
counted in UTF-16 units (JS `string.length`). This is a conservative bound: the Bot API server counts Unicode code points, so the counter never passes a caption Telegram rejects, but it may refuse one with emoji that Telegram would accept. Max 1024 with a photo, 4096 for text.
~~~

**S56. §10.3, steps 4 and 5.**

Current:
~~~md
   - after approval (¬author), call `editMessageCaption`;
~~~
Replace with:
~~~md
   - after approval (¬author), call `editMessageCaption` (a bot can edit its own channel posts at any age);
~~~

Current:
~~~md
   - if the post is less than 48 h old, call `deleteMessage` after editor-in-chief approval;
~~~
Replace with:
~~~md
   - if the post is less than 48 h old **at the moment `deleteMessage` is called**, call it after editor-in-chief approval. The approval itself can push the post past 48 h;
~~~

**S57. §10.5, rights check.**

Current:
~~~md
- **If any other right is present** (for example `can_promote_members`, `can_change_info`, `can_invite_users` or the story rights; `can_manage_chat` excepted), or one is missing: alert and pause posting.
~~~
Replace with:
~~~md
- **The rights check is an allow-list.** Every `can_*` key in the `getChatMember` result must be false except `can_post_messages`, `can_edit_messages`, `can_delete_messages` and `can_manage_chat`. A new right is refused by default; Bot API 10.3 (24 August 2026) added `can_send_welcome_messages`. If any other right is true, or a required one is missing: alert and pause posting.
- **Least privilege (option; confirm in staging with I5 and I6).** `can_post_messages` alone lets the bot post, edit and delete its **own** posts. `can_edit_messages` extends editing to everyone's posts, including old manual staff posts, and `can_delete_messages` extends deletion to everyone's posts within 48 h. Both can be dropped from the allow-list.
~~~

**S58. §10.6, delivery limits.** Add after this line:
~~~md
- **Admin changes.** `chat_member` or `my_chat_member` showing an admin added or removed, or the bot demoted, means **immediate alert** to the editor-in-chief and the founder (possible takeover; playbook §12.10).
~~~
New text:
~~~md
- **Delivery** (Phase 0, from the docs and the Bot API server source; not yet live-tested, test I8 in staging confirms it). `chat_member` is delivered for channels when it is listed in `allowed_updates` and the bot is an admin; `my_chat_member` is delivered by default. Limits:
  - the server drops a `chat_member` update older than 24 h, and keeps updates for at most 24 h, so a worker outage longer than that loses admin-change alerts. An hourly `getChatAdministrators(@channel)`, compared with a stored snapshot, catches those changes;
  - `chat_member` also fires for every ordinary subscriber who joins or leaves. Alert only when the old or new status is `administrator` or `creator`;
  - `allowed_updates` persists between calls, and `getUpdates` does not work while a webhook is set. A `409 Conflict` from `getUpdates` (a webhook, or another poller using our token) is an immediate security alert.
~~~

### §11 Data import

**S59. §11.1, Local API rules.** Add after this line:
~~~md
- **Idempotent:** a re-run upserts by `legacyId`.
~~~
New text:
~~~md
- **Local API rules from Phase 0:**
  - pass `_status: 'published'` explicitly when publishing; a create without it stores a draft, even with `draft: false`;
  - write each locale in its own call: an update with `locale: 'all'` returns OK and writes nothing localized;
  - write uz first, then reuse the returned array row ids (corrections) when writing ru and en; a row sent without its id replaces the row and drops the other locales' text;
  - write dates as ISO strings with `Z` or an explicit offset;
  - the import runs outside a request, so its invalidations go through the outbox (§8.4), not `after()`.
~~~

**S60. §11.2 step 7.**

Current:
~~~md
Pass 3: `related`, `about`.
~~~
Replace with:
~~~md
Pass 3: `related`, `about`, and body links to other articles (they need the target to exist).
~~~

**S61. §11.4, parity test.**

Current:
~~~md
The comparison ignores `id` (compared through `legacyId`), image `src` (compared through the media map) and `views` in production.
~~~
Replace with:
~~~md
The comparison ignores `id` (compared through `legacyId`), image `src` (compared through the media map), image `width` and `height` (compared as the aspect ratio, because §11.2 step 1 rasterises at 1600 px and the mock says, for example, 1200 × 800) and `views` in production.
~~~

### §12 Security

**S62. §12.1, startup guard.** Add after this line:
~~~md
  - `CONTENT_SOURCE=mock`.
~~~
New text:
~~~md
  - `admin.autoRefresh === true` (an idle admin tab would stay logged in for ever, §12.2);
  - `auth.cookies.domain` is set (the token cookie must stay host-only);
  - Payload `jobs.autoRun` is configured (jobs would run in the app process, outside any request, §8.4).
~~~

**S63. §12.2, Payload configuration.**

Current:
~~~md
// auth cookie is then 'muomalat-token'; VERIFY '__Host-' prefix support
~~~
Replace with:
~~~md
// auth cookie 'muomalat-token': host-only, Secure, HttpOnly, SameSite=Strict. '__Host-' is not used: it works
                                              // for the token only with secure cookies and no domain, and it stops the admin's
                                              // language and theme cookies from being saved (Phase 0)
~~~

Current:
~~~md
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL }, push: false, migrationDir: './src/migrations' }),
~~~
Replace with:
~~~md
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL, options: '-c TimeZone=UTC' }, push: false, migrationDir: './src/migrations' }),
  // the session time zone is UTC whatever the server's TZ: offset-less date strings are read in the session zone (§3.1)
~~~

**S64. §12.2, users auth.**

Current:
~~~md
// 30 min idle (admin refreshes while active — VERIFY); absolute limit = Access session (8 h)
~~~
Replace with:
~~~md
// see "Session lifetime" below; absolute limit 8 h (refresh hook) and the Access session
~~~

Current:
~~~md
hooks: { beforeLogin: [assertEdgeEmailMatches], afterLogin: [auditLogin, trackCountry], afterLogout: [auditLogout] },
~~~
Replace with:
~~~md
hooks: {
  beforeOperation: [maxSessionAge],      // operation 'refresh': session older than 8 h → 401
  beforeLogin: [assertEdgeEmailMatches], afterLogin: [auditLogin, trackCountry], afterLogout: [auditLogout],
  afterError: [auditFailedLogin],        // §9.4
},
~~~

Add after the users-auth code block (before "**Passwords**"):
~~~md
**Session lifetime** (Phase 0):

- **Renewal.** The admin renews the token only in two cases: the editor navigates or edits a form during the token's last 2 minutes, or clicks "Stay logged in" in the dialog shown 60 s before expiry. Ordinary API calls do not renew it. With `tokenExpiration: 1800`, an idle editor is logged out anywhere between about 2 and 30 minutes after their last action.
- **Idle timeout.** An `admin.components.providers` client provider calls `useAuth().refreshCookie(true)` on key, pointer and scroll events, at most once every 5 minutes. An idle tab is then logged out after 25–30 minutes. This is proposed from the source and not yet run in a live admin.
- `admin.autoRefresh` stays `false`. With `true`, the admin refreshes every token unconditionally, so an idle tab would stay logged in for ever (startup guard, §12.1).
- **Absolute limit.** Payload has none: each refresh extends the session. `maxSessionAge` throws 401 when the current session's `createdAt` is older than 8 h (tested), and the admin treats that as a logout. The Access session (8 h) is the second limit.
- **Expired sessions.** Their rows stay in `users_sessions` until that user's next login or refresh. Anything that lists active sessions filters on `expiresAt > now`.
- **Several tabs.** Each open tab keeps its own timer. A tab that did not refresh still shows the dialog and logs out at its own expiry, losing unsaved form state, even if another tab renewed the cookie. (From the source; not tested.)
~~~

**S65. §12.2, edge identity.**

Current:
~~~md
- verify `Cf-Access-Jwt-Assertion` with `jose.jwtVerify` against the JWKS at `https://${CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, with `issuer: https://${CF_ACCESS_TEAM_DOMAIN}` and `audience: CF_ACCESS_AUD` ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/));
- the lower-cased `email` claim must equal `req.user.email`;
- cache the result in `req.context`;
- on failure: 403, and audit `auth.edge_mismatch`.
~~~
Replace with:
~~~md
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
~~~

**S66. §12.2, Phase 2 SSO.** Add at the end of the paragraph that starts `**Phase 2: Access SSO.**`:
~~~md
A strategy cannot refuse a request, because Payload catches and logs strategy errors (`payload/dist/auth/executeAuthStrategies.js`). The per-request JWT check therefore stays in `withEdge` in Phase 2 too.
~~~

**S67. §12.3, DNS.**

Current:
~~~md
  - CAA records for Cloudflare's CAs plus `iodef`, bound to our CA account (`accounturi`) where the CA supports it, as Google advised after the October 2026 ccTLD hijacks ([Google](https://blog.google/security/chromes-response-to-recent-cctld-registry-hijacks/)). **VERIFY** that this works with Cloudflare-managed edge certificates;
  - CT monitoring on.
~~~
Replace with:
~~~md
  - CAA records for Cloudflare's CAs plus `iodef`. Binding them to a CA account (`accounturi`), as Google advised after the October 2026 ccTLD hijacks ([Google](https://blog.google/security/chromes-response-to-recent-cctld-registry-hijacks/)), is not possible with Universal SSL: Cloudflare serves its own CAA set in place of customer records (CVE-2026-14440), and it issues from its own ACME accounts. Strict binding would need Universal SSL turned off and certificates we control (Advanced Certificate Manager or custom certificates). That is a paid change, not Phase 1;
  - CT monitoring on: Cloudflare CT Monitoring with email alerts switched on (they are off by default), plus an external CT monitor.
~~~

**S68. §12.3, Access application.**

Current:
~~~md
  - identity provider: Google Workspace with 2-step verification enforced as "security key only"; Cloudflare's email one-time PIN login is disabled;
  - Independent MFA set to `security_key` and `biometrics` if available on our plan (**VERIFY**);
~~~
Replace with:
~~~md
  - identity provider: Google Workspace with 2-step verification enforced as "security key only"; Cloudflare's email one-time PIN login is disabled. Access cannot verify Google's "security key only" setting, because its IdP MFA check covers only Okta, Entra ID and generic OIDC or SAML. So "Use identity provider MFA" stays off;
  - Independent MFA: the Cloudflare docs name no plan. Check the dashboard on our Free organisation: Zero Trust → Access controls → Access settings → "Allow multi-factor authentication (MFA)".
    - If the setting is there: enable it; set the cms application to Custom MFA settings with `allowed_authenticators: ["security_key", "biometrics"]` (no `totp`) and an authentication duration of 8 h or less; optionally add an AAGUID allow-list.
    - If it is missing on Free: the edge relies on Google 2-step verification alone (§1).
    - Either way, enrolment follows §4.4: the first authenticator is enrolled without a second factor, in front of an admin;
~~~

**S69. §12.3, WAF custom rules.** Add after this line:
~~~md
- [ ] **Both hosts:** block `/internal/*`, `/api/users/first-register` and `/admin/create-first-user`.
~~~
New text:
~~~md
- [ ] **Rule budget:** the Free plan allows 5 WAF custom rules and no regex (the `matches` operator needs Business). Combine the blocks above with `or` into at most five rules, using `starts_with()` or `wildcard`.
~~~

**S70. §12.3, rate limiting.**

Current:
~~~md
    - Pro has two rules, with windows of up to 1 minute.
~~~
Replace with:
~~~md
    - Pro has two rules, with windows of up to 1 minute and blocks of up to 1 h. Pro matches host, URI, path, full URI, query and Verified Bot, but not method or headers: method needs Business, headers need Enterprise;
    - on Free and Pro, requests served from cache count toward the limit, and a challenge action throttles without a block duration.
~~~

Current:
~~~md
  - **Pro plan or Galileo (if available; VERIFY which expression fields each plan allows):**
    - server actions: 10 per minute per IP, then a managed challenge;
~~~
Replace with:
~~~md
  - **Pro plan or Galileo (if available):**
    - server actions: 10 per minute per IP, then a managed challenge. Pro cannot match `POST` or the `Next-Action` header, so this rule is path-based, as on Free;
~~~

**S71. §12.3, bot handling.**

Current:
~~~md
- [ ] **Bot handling:** Bot Fight Mode off, or confirmed not to block the `TelegramBot` preview crawler (check Security Events).
~~~
Replace with:
~~~md
- [ ] **Bot handling:** Bot Fight Mode off, or confirmed not to block the `TelegramBot` preview crawler (check Security Events). WAF custom rules and Page Rules cannot bypass Bot Fight Mode, so if it blocks the crawler, the only fix is to turn it off. Its JavaScript Detections script is served from the same origin (`/cdn-cgi/challenge-platform/`) and fits `script-src 'self'`.
~~~

**S72. §12.10, lock-out and evidence.**

Current:
~~~md
- **Fastest lock-out:** remove everyone from the Access policy group in Cloudflare. This takes effect at once for all admin and API access.
~~~
Replace with:
~~~md
- **Fastest lock-out:** remove everyone from the Access policy group **and** revoke existing tokens (Access → Applications → cms → "Revoke existing tokens", or per user).
  - Removing users from the group is not enough on its own. Access re-checks policies only when the application token expires, which can be up to the 8 h session.
  - Revoked tokens stop working in about 20–30 s, and users cannot log in again for up to a minute ([Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)).
  - Payload's own Access-JWT check does not notice a group removal either. For a single person, also set `active = false` in Payload.
~~~

Current:
~~~md
since it is kept only about 48 h, *unverified*);
~~~
Replace with:
~~~md
since it is kept only about 48 h (Telegram's own announcement says 48 h; it was written for groups);
~~~

### §13 Personal data

**S73. §13.5.** Add after this line:
~~~md
- **Not to the newsroom** (the Bloomberg terminal lesson). Reporters and editors cannot read subscriber or club data.
~~~
New text:
~~~md
- **No location data in images.** Staff phone photos can carry GPS coordinates, which are personal data. Every upload is re-encoded without metadata, including through the admin's crop and focal-point editor (§3.12; test K4).
~~~

### §14 Local development

**S74. §14.1.** Add after the YAML block:
~~~md
The dev container sets `TZ: Asia/Tashkent`, so its Postgres session time zone is Tashkent by default. The Payload pool pins `TimeZone=UTC` (§12.2), so offset-less date strings are never read as Tashkent time.
~~~

### §16 Acceptance tests

**S75. Changed tests.**

Current:
~~~md
- **B1 (I)** A reporter cannot publish through REST (`_status: 'published'`), the Payload Publish action or the transition endpoint. Each attempt is rejected with an error.
~~~
Replace with:
~~~md
- **B1 (I)** A reporter cannot publish or unpublish. These attempts are each rejected with an error:
  - through REST (`PATCH {_status:'published'}`, a `POST` with `_status: 'published'`, `?publishSpecificLocale=ru`);
  - through the Payload Publish and Unpublish calls;
  - through a plain `PATCH {_status:'draft'}`, `?draft=false`, or a PATCH with neither `draft` nor `_status` on a live story;
  - through `restoreVersion` without `draft: true`;
  - through the transition endpoint.

  The reporter's draft saves and autosave on a published story still succeed.
~~~

Current:
~~~md
- **J6 (I)** Failed logins are recorded within 2 minutes (§9.4).
~~~
Replace with:
~~~md
- **J6 (I)** A failed REST login writes `auth.login_failed` at once, with the attempted email and IP. The fifth failure also writes `auth.locked`, and the locked response uses the generic message (§9.4).
~~~

Current:
~~~md
- **K4 (I)** Uploading an SVG, an XML file, or a JPEG renamed `.svg` → rejected. A JPEG with GPS EXIF → the stored original has no GPS data.
~~~
Replace with:
~~~md
- **K4 (I)** Uploading an SVG, an XML file, or a JPEG renamed `.svg` → rejected. A JPEG with GPS EXIF, XMP and an ICC profile → no stored file (original or any size) has EXIF, XMP or ICC data, and every stored file is `image/webp`. The same holds when the editor sets only the focal point in the Edit-image drawer before the first save, and when they crop.
~~~

**S76. New tests.** Insert each after the anchor named.

After B12:
~~~md
- **B13 (I)** A transition that does not publish (for example "Tahrirga olish") on a published story with a pending draft leaves the story published with its live content.
- **B14 (I)** On a published story, restoring a published version without "as draft" is rejected; "Restore as draft" creates a draft and leaves the live content unchanged.
- **B15 (I)** "Publish in <locale>" (`publishSpecificLocale`) is rejected for every role.
- **B16 (I)** Restoring a `home-page` version that references a sponsored or unpublished article fails (HOME-1, HOME-2), and so does a global restore by a role that may not publish that global. A permitted restore writes an audit row.
~~~
After C10:
~~~md
- **C11 (I)** On a story published more than 15 minutes ago, a plain `PATCH {_status:'draft'}`, `?draft=false`, and a PATCH with neither `draft` nor `_status` (with a newer draft) are each rejected as unpublish attempts for every role.
~~~
After E7:
~~~md
- **E8 (E)** While an embargo is active, the edit view's browser tab title starts with "EMBARGO · ", and the list shows the badge in front of the title.
~~~
After F8:
~~~md
- **F9 (I)** Editing the ru tab, including through a hook that makes a nested Local API call, leaves every uz value unchanged (regression test for payloadcms#18246).
- **F10 (I)** A ru save that drops a correction row, or sends one without its id, is rejected, and the uz `publicText` is unchanged.
- **F11 (I)** The built-in Copy to locale is not offered. The custom copy action fills only empty fields (an empty Lexical body counts as empty), saves a draft, sets `translation.status` to `in_edit`, and never copies `translation.*`.
- **F12 (E)** With the browser in Europe/Berlin, the embargo picker shows and saves Tashkent time (09:00 Tashkent is stored as 04:00Z).
~~~
After G10:
~~~md
- **G11 (I)** A REST write of a body that contains a Lexical `quote`, `upload` or `horizontalrule` node is rejected on every save. A body with a `javascript:` or `http:` link, a nested list or `listType: 'check'` saves as a draft with findings, and cannot be published.
~~~
After H10:
~~~md
- **H11 (E)** After a change to an article, its uz OG image is fresh both at `/uz/<r>/<s>/opengraph-image` and at the public path, even after either form was regenerated at runtime. `/rss.xml` is fresh as well.
- **H12 (E)** An unknown slug returns 404 on the first request, with a browser user agent and with Googlebot's. Its `opengraph-image` returns 404 too.
- **H13 (I)** A change made from a script or the worker (no request scope) is invalidated through the outbox and `/internal/revalidate`. A restart of the app between the change and its processing still leaves the page fresh.
~~~
After K14:
~~~md
- **K15 (I)** A token refresh for a session older than 8 h returns 401. (E) An admin tab left idle for 30 minutes is logged out.
- **K16 (M)** Lock-out drill: after a user is removed from the Access group and their tokens are revoked, they lose admin and API access within about a minute.
- **K17 (I)** The transition endpoint called with a valid cookie but `Origin: https://evil.example` returns 401, and nothing changes.
~~~

### §17 Phases

**S77. The Uzbek admin pack moves to Phase 1.**

Current (Phase 2 row):
~~~md
news sitemap; Uzbek admin pack; WAL archiving
~~~
Replace with:
~~~md
news sitemap; WAL archiving
~~~
In the Phase 1 row, after `security P0 (§12);`, add `Uzbek admin pack (§6.6);`.

### §18 Items to verify in Phase 0

**S78. Status line.** Add after the heading `## 18. Items to verify in Phase 0`:
~~~md
Phase 0 results are in [PHASE0-FINDINGS.md](./PHASE0-FINDINGS.md). Items 1–19 and 22 are resolved, as are the item 20 entries on rate limits, purge, log retention, the DPF list and CAA. Still open:
- item 20, Independent MFA on our plan (a dashboard check, §12.3);
- item 21, `chat_member` delivery for channels (staging test I8), plus a live edit of an old bot post (I5);
- item 11, the custom list cell rendered in a live admin.
~~~

---

## 4. Prototype files to promote

### 4.1 From `.spike/` into `src/`

Test file locations are suggestions; the spec does not fix a test folder yet.

| Spike file | Target | Before promoting |
|---|---|---|
| `.spike/lexical/serialize.ts` | `src/payload/lexical/serialize.ts` | Pure function, passes `tsc --noEmit`, lossless on 35 articles and 28 terms. Its `SerializeCtx` already has the new `resolveDoc` contract and `warn`. Change the `../../src/content/types` import to the app path, and import `TOKEN` from the shared module (next row). |
| `.spike/lexical/fromMarkup.ts` | `src/payload/lexical/fromMarkup.ts` | Builds nodes through a headless editor made from the sanitized field's node list, so its JSON is exactly what the admin produces and re-exports. Needs `bson-objectid` (add `2.0.4`, the version Payload uses). Move `TOKEN` into one shared module (for example `src/content/markup.ts`) that `InlineText.tsx`, `fromMarkup.ts` and `serialize.ts` all import, instead of keeping a copy. |
| `.spike/lexical/tabular.ts` | `src/content/tabular.ts` | Uzbek number parsing and formatting, TSV and chart text formats; used by the block hooks, `fromMarkup` and `rules.ts`. Drop comma as a separator (S16). |
| `.spike/lexical/editors.ts` | `src/payload/lexical/editors.ts`, `src/payload/blocks/*.ts`, `src/payload/blocks/inline/*.ts` | The §3.4 editors, 8 blocks and 2 inline blocks, with the table `rows` and chart `parsed` hooks (verified to run inside Lexical blocks). Split per the §2.2 layout. Add the `body` check hook and the LinkFeature `url` validation (S15). |
| `.spike/lexical/roundtrip.ts` | integration test H1 (for example `tests/integration/lexical-roundtrip.test.ts`) | Turn the script into a Vitest test against `muomalat_test`. Compare figure size as an aspect ratio (S61). |
| `.spike/lexical/media-fixed.ts` | merge into `src/payload/collections/Media.ts` | The `beforeOperation` re-encode and the per-size `formatOptions`. Promote first: the foundation Media collection leaks GPS today. |
| `.spike/lexical/exif-test.ts` | integration test K4 | Five inputs, including the unchanged-crop case and an Orientation=6 photo. |
| `.spike/auth/access-jwt.ts` | `src/payload/access/edge.ts` | Set `cooldownDuration` to 5–10 s (the prototype defaults to 30 s). Wire it into `users.hooks.beforeLogin` and `withEdge`. Add `"jose": "5.10.0"` to `package.json`. |
| `.spike/auth/run-access-jwt.ts` | unit/integration test for `edge.ts` (A10) | Local RS256 key pair and a fake JWKS server on a free port: 15 cases, key rotation and outage. |
| `.spike/auth/run-access-login.ts` | integration test A10 | Real REST login handler with the verifier in `beforeLogin`: 403 leaves no session and no failed-login count. |
| `.spike/auth/uz-language.ts` | `src/payload/i18n/uz.ts` | Shape and typing are final. Fill in the rest of the 587 core strings and the 27 `lexical` strings. |
| `.spike/auth/EmbargoCell.tsx` | `src/payload/admin/EmbargoBadge.tsx` | Server Cell; regenerate the import map. Check it renders in a live admin. Add the companion Cell on `title`, which renders the badge plus the document link. |
| `.spike/auth/run-absolute.ts` (its `beforeOperation` hook) | `maxSessionAge` in `src/payload/collections/Users.ts` | Use 8 h instead of the test's 5 s. |
| `.spike/access/payload.config.ts`: `updateDataAware` and the `art-guard` `beforeOperation` hook | `src/payload/access/articles.ts`, `src/payload/hooks/workflow.ts` | The guard rules and the `draftArg` stash are final. Use `userRole()` from `roles.ts`, rename `__draftArg` to `draftArg`, add the `publishSpecificLocale` rejection (S37) and the restore rule for live stories (S36). |
| `.spike/access/payload.config.ts`: `transitionEndpoint` | `src/payload/endpoints/transition.ts` (skeleton only) | Add the role check, the transition table, explicit `draft`, and `initTransaction` / `commitTransaction` / `killTransaction`. |
| `.spike/access/payload.config.ts`: users `afterError` | `auditFailedLogin` in `src/payload/hooks/audit.ts` | Add the path and error-name filter, the `payload.db.findOne` lock read, and the message rewrite. |
| `.spike/access/lib.ts` | test helper | A REST harness that calls `handleEndpoints` directly, the same code the Next route runs. Use it for REST integration tests without a server. |
| `.spike/access/02-hook-args.ts`, `03-guard.ts`, `08-where-main-vs-latest.ts` | integration tests B1, B13–B15, C9, C11 | They already cover the REST matrix (publish, unpublish, draft, restore) per role. |
| `.spike/access/05-audit-insert-only.ts` | integration test J2 | Creates an insert-only role; run it against the real grants script. |
| `.spike/locale/item6b.ts` | integration test F9 | Regression test for payloadcms#18246. Its unisolated case should start passing once the bug is fixed. |
| `.spike/next/variants/legacy/stamp/stamp.ts` | pattern for `src/content/adapters/payload.ts` | `unstable_cache(fn, key, { tags, revalidate })`. |
| `.spike/next/app/src/payload/spike/SpikeNotes.ts` (`afterChange` with `after()`) | pattern for `src/payload/hooks/invalidate.ts` | Add the try/catch fallback to the outbox (S46). |
| `.spike/next/variants/common/internal-route.ts` | `src/app/internal/revalidate/route.ts` (skeleton only) | It has no HMAC. Add the signature, timestamp and `cf-connecting-ip` checks (§8.4). |
| `.spike/next/tools/reval-test.sh`, `.spike/next/tools/admin-e2e.mjs` | end-to-end tests H2, H11–H13, and an admin smoke test | Port to `@playwright/test`. `playwright-core` was installed only in a scratch folder, not in the repo. |

### 4.2 Foundation files that change

| File | Change |
|---|---|
| `src/payload/collections/Media.ts` | Per-size `formatOptions` and the `beforeOperation` re-encode (S20). This is a privacy fix, so do it first. |
| `src/payload/collections/Users.ts` | `hooks.afterError: [auditFailedLogin]`, `hooks.beforeOperation: [maxSessionAge]`, and the edge check in `beforeLogin` (S64, S65, S54). |
| `src/payload.config.ts` | Replace `i18n: { supportedLanguages: { ru, en }, fallbackLanguage: 'ru' }` with the uz pack (S41). Add `admin.timezones` (S5) and the pool option `options: '-c TimeZone=UTC'` (S63). Keep `cookiePrefix: 'muomalat'`. |
| `src/proxy.ts` | Exclude `internal/` from the matcher when `/internal/revalidate` is added. Without it, the request is rewritten to `/uz/internal/…`; the spike copy needed this. Do the same for `preview/`, `exit-preview/` and `t/` (§2.2). |
| `package.json` | Add `"jose": "5.10.0"` and `"bson-objectid": "2.0.4"`, both exact. |

### 4.3 Keep as reference, do not promote

- `.spike/next/variants/cc-snapshot/`, `cc-site-changes.diff`: the Option A site tree and diff, kept for when Option A is reconsidered.
- `.spike/auth/extracted/`, `extract-src.mjs`: Payload TypeScript recovered from its source maps; useful for reading admin behaviour.
- `.spike/auth/uz-typecheck-negative.ts`: documents the five type limits of a custom language.
- `.spike/external/`: saved Cloudflare and Telegram pages, the CVE record and the DPF list entries. These are the evidence for item 20 and item 21.

---

## 5. Open risks

**Not verified by experiment**

1. **Independent MFA on Cloudflare Free** is unknown. If it is missing, the edge cannot prove a security key, and the login relies on Google 2-step verification plus the Payload password. Check the dashboard before Phase 1 ends.
2. **`chat_member` delivery in channels** and the age-free editing of bot posts rest on the docs and TDLib source (current master, which may differ from what api.telegram.org runs). Tests I5, I6 and I8 in staging confirm them.
3. **The custom list Cell** type-checks and appears in the import map, but was not rendered in a live admin.
4. **The idle-refresh provider** was not run in a live admin.
5. **Data-aware access in the admin.** The data-aware publish access was checked through the same permission function the admin uses, not by clicking through the admin in a browser.
6. **Admin date display** under different zones was simulated with Payload's own UI functions, not in a browser.
7. **The `SameSite=Strict` cookie after the Access redirect** may not be sent on the first navigation back from the identity provider, so that page may render logged out until the client calls `/me`.
8. **Browser coverage.** Firefox and Safari behaviour on `cms.localhost` was not tested.
9. **Read access with drafts.** Read-access Where clauses meet the same main-row/version split as update access. `articlesRead` (embargo, `legallySensitive`, `_authorUsers`) must be tested with `draft: true` reads before launch (A4).
10. **RSC caching.** Which RSC responses Next marks cacheable under Option B, and so whether the `_rsc` cache bypass is needed, is not yet confirmed.

**Upstream bugs and deprecations**

11. **payloadcms#18246** (open, reproduced on 3.90.2): a nested Local API call with `req` and another locale corrupts or drops the outer save's localized data. Mitigated by the coding rule and a CI grep; track the fix and remove the workaround after upgrading.
12. **Two join bugs**, found only by experiment and apparently unreported upstream: a join into an array of hasMany returns duplicates, and a join into blocks crashes every media query and upload. Consider reporting both. `mediaRefs` must stay top-level.
13. **`unstable_cache`** is marked as replaced by `'use cache'`, and Next 17 is expected to force Cache Components on. Plan the Option A migration before that upgrade.
14. **Global version restore** bypasses all our hooks. The `beforeOperation` guard is the only control; test B16 covers it.

**Design and data risks**

15. **The foundation Media collection leaks GPS today** on the unchanged-crop path. Until S20 lands, upload only test images.
16. **Writes built from read-back documents** publish whenever they carry `_status: 'published'`. The coding rule must hold in every new endpoint, job and script; review for it in code review.
17. **Markup has no escape character.** Literal `*`, `[x](y)` or `{en:` typed by an editor become markup on the site. ART-20 warns, but editors can still publish literal asterisks.
18. **Table cells that look like numbers** (a year, "05") become numbers. There are none in the mock data, but real tables may have them.
19. **Restoring a draft version onto a live story** is impossible from the admin under the restore rule (S36). This is accepted; revisit if editors need it.
20. **Unknown-slug probes** write cached 404 entries to disk under Option B. Slug validation before rendering and Cloudflare rate limits are the controls.
21. **Next keeps tag invalidations in memory.** A restart forgets pending ones; the outbox re-post (S48) covers this, but only for events in `publish-events`.
22. **Admin dates** use Russian month names under the Uzbek interface.
23. **Logout returns 400.** `POST /api/users/logout` returned 400 "No User" in the admin end-to-end runs, both with and without Cache Components. This is a foundation issue, not a Phase 0 item; look at it when wiring `afterLogout`.

**Operational and legal**

24. **Cloudflare purge limits** are per account. Staging in the same account uses production's five-a-minute budget. Consider a separate account for staging.
25. **The DPF entry** is "Active – re-certification under review". Re-check before launch and yearly. Whether our contracting entity is Cloudflare, Inc., and whether a DPF listing satisfies resolution 415, are questions for counsel.
26. **CAA records** cannot bind to an account under Universal SSL. CT monitoring is the control.
27. **The evidence is local.** `.spike/` is git-ignored, so the evidence behind this document exists only on this machine. Archive it if it must be kept.
28. **The research documents may still change.** The fact-check may still be revising CMS-SPEC.md and CMS-RESEARCH.md. Re-check the §3 quotes against the final text before applying them.
