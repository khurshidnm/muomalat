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
| CMS wave 3: site reads from the CMS, import, red team | Done (see below) |
| Independent security review | Not started |
| Final local end-to-end test | Not started |
| Deployment (Hostinger VPS, EU region, Cloudflare Free) | Later, after local testing |

`main` includes an untested wave 3 snapshot (pull request #1). The last fully
green state is commit `b2228a7`.

## Wave 3: done

- Importer (`npm run seed:dev`), idempotent: the second run creates nothing.
- `npm run parity`: no differences in uz, kr, ru, en. By design the script
  ignores the mock-only `translations` field and body/sources on list views
  (the CMS lists are summaries, §8.1). Article lists tie-break on id.
- Content adapter finished: caching with tags, draft preview, RSS, sitemap
  and OG. `npm run build` passes with `CONTENT_SOURCE=mock` and `payload`;
  every sitemap URL returns 200 with `CONTENT_SOURCE=payload`.
- Editor round trip checked live: an edit in the CMS showed on the public
  page within 10 s of the worker's outbox running (glossary term).
  Article edit, second-editor approval and publish are covered by the tests.
- Red-team pass 2: all six findings fixed (trash/restore rejects other
  changed fields; `media.uploadedBy` and migration `20261009_150000_wave3`;
  `Object.hasOwn` in `resolveTransition`).
- Full suite on a fresh DB: 694/694 in the first run. The earlier
  intermittent failures (`write2`, `pipeline`) had two parts. Test files share
  the one home-page document and some park an invalid draft in it, so
  `vitest.config.ts` runs the nine files that write it one after another
  (project `home-page`). That alone was not enough: `home2.test.ts` also left
  a refused sponsored lead in the draft for later files to trip over, so it
  now resets the draft, and `pipeline` and `write2` start from an empty one.
  After this, the `home-page` project passed 4 of 4 finished runs.

Next: the independent security review, then the final local end-to-end test.

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
