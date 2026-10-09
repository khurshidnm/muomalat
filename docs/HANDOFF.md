# Handoff: where the build stands (9 October 2026, 19:00 Tashkent)

For whoever continues on another computer, or a new Claude Code session. Read
this first, then [CMS-SPEC.md](./CMS-SPEC.md) (v1.2) and
[PHASE0-FINDINGS.md](./PHASE0-FINDINGS.md). Where they disagree, PHASE0 wins.

## Status

| Part | State |
|---|---|
| Public site (all pages, four editions) | Done; full QA passed on mock data |
| CMS Phase 0 spike | Done (`PHASE0-FINDINGS.md`) |
| CMS wave 1: content model, globals, Uzbek admin | Done, tested |
| CMS wave 2: workflow, validation, security, audit, forms, publish pipeline | Done; 520/520 tests at commit `b2228a7` |
| CMS wave 3: site reads from the CMS, import, red team | **In progress** (details below) |
| Independent security review | Not started |
| Final local end-to-end test | Not started |
| Deployment (Hostinger VPS, EU region, Cloudflare Free) | Later, after local testing |

`main` includes an untested wave 3 snapshot (pull request #1). The last fully
green state is commit `b2228a7`.

## Wave 3: what is done and what is left

**Done**

- **Importer** `scripts/import-mock.ts` (`npm run seed:dev`): every mock record
  into the CMS, idempotent; 43 images rasterised from the SVGs. Refuses when
  `SITE_ENV=production`.
- **Parity check** `scripts/parity.ts` (`npm run parity`): compares the mock
  and Payload adapters for every content function in uz, kr, ru and en.
- **Red team, pass 2**: tests in `tests/redteam/*2.test.ts`; 171 attacks
  defended, 6 findings (below). Production code not yet changed for them.
- **Content adapter** (about two thirds): `src/content/index.ts` is async with
  `adapters/mock.ts` and `adapters/payload.ts`, picked by `CONTENT_SOURCE`;
  consumers converted; `npx tsc --noEmit` passes except two type errors in
  `tests/redteam/meta2.test.ts`.

**Left**

1. Finish the adapter: caching (Option B: `unstable_cache` with the tags in
   `src/payload/delivery/tags.ts`, route `revalidate`, no `dynamicParams =
   false` on content routes), draft preview on the CMS host (`/preview`,
   `/exit-preview`), RSS, sitemap and OG through the adapter. Mock mode must
   render exactly as before.
2. Integrate: import into the dev DB (`npm run seed:dev`, twice);
   `npm run parity` with zero differences; run the site with
   `CONTENT_SOURCE=payload` and check every route in all four editions; editor
   round trip (edit, approve by a second editor, publish, the page updates
   after the outbox runs).
3. Fix the red-team findings:

| Severity | Finding | Where |
|---|---|---|
| Critical | Restoring an article from the trash with extra fields skips every workflow field rule: commercial can turn a sponsored draft into an editorial one | `src/payload/hooks/workflow/articles.ts` `articleBeforeChange`: `if (s.trashing \|\| s.untrashing) { await trashRules(s); return data }` returns before the other rules. Reject any other changed field on a trash/untrash write, or run the rules first |
| High | Same path: a reporter clears the "needs legal review" requirement | same |
| Medium | Same path: an editor changes an approved story without voiding the approval | same |
| Medium | The approver then publishes text they never approved | same |
| Medium | Any reporter edits alt, credit and rights of images others uploaded | Media has no uploader field: add a system `uploadedBy` and gate reporter/commercial updates to their own items in a hook |
| Low | A transition action named after a prototype key (`constructor`, `__proto__`) returns 500 | `src/payload/hooks/workflow/transitions.ts` `resolveTransition`: use `Object.hasOwn(TRANSITIONS, action)` |

4. Then: the full suite on a fresh DB, `npm run build`, commit and push.

## Setting up on another computer

Needs Node 24 or later, Docker Desktop, Google Chrome (the QA scripts drive
it), Git and Claude Code.

```bash
git clone https://github.com/khurshidnm/muomalat.git && cd muomalat
npm ci
cp .env.example .env
# replace both <generate> values:  openssl rand -base64 64 | tr -d '\n'
npm run db:up            # Postgres 17 + Mailpit (docker/compose.dev.yml)
npm run db:migrate       # schema, as the owner role
npm run admin:create -- --email admin@muomalat.local --name "Administrator" --role admin
npm run admin:create -- --email editor@muomalat.local --name "Muharrir" --role editor --additional
npm run seed:dev         # import all current content
npm run dev              # site http://localhost:3000, admin http://cms.localhost:3000/admin (Chrome)
```

- `admin:create` prints each password once. The admin account cannot write
  content (separation of duties); use the editor account.
- Set `CONTENT_SOURCE=payload` in `.env` to show CMS content on the site, or
  `mock` for the old data files.
- Tests: `URL=$(scripts/test-db.sh mine) && env "$URL" npx vitest run`. They
  refuse to run against the dev database.
- The local database, `.env`, uploads (`.data/`) and the Phase 0 evidence
  (`.spike/`) are not in Git: they stay on the first computer. The steps
  above recreate everything except `.spike/`.

## Decisions to keep

- Cloudflare **Free** plan at launch; paid later. So rate limiting for
  login, forms and search is in the app, cache purge is by exact URL, and
  two-factor login must not depend on a paid Cloudflare feature (whether
  Access "security keys only" is on Free is still unchecked: a two-minute look
  in the Cloudflare dashboard).
- Hosting in the EU (Hostinger Lithuania or Germany); not India, Malaysia,
  Indonesia or the US (Uzbek personal-data rules, see CMS-RESEARCH §4.3).
- Payload stays pinned to 3.90.2; `overrides` in `package.json` pin patched
  undici, dompurify and nodemailer.
- Multi-agent workflows run only when the user says so.
