# Muomalat — muomalat.uz

Front end for Muomalat, the first news outlet in Uzbekistan dedicated to Islamic
finance. It is a financial and business publication: it reports the market
(regulation, licences, products, deals, people) and never issues religious
rulings. The site is also home to the Muomalat business club.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4. No client
libraries beyond React; content comes from typed local mock data that a CMS can
replace.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (static pages + OG images)
npm start            # serve the production build
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate` | Content checks: Uzbek orthography (ʻ U+02BB, ʼ U+02BC, «»), date spelling, banned religious material, real institution names, references between files, dates |
| `npm run validate -- --source=payload` | The same checks on the published CMS content (the database in `.env`), with the rules the CMS applies at publication |
| `node scripts/gen-images.mjs` | Regenerates the SVG illustration set in `public/images` |
| `python scripts/fonts/fix-okina.py …` | Rebuilds the ʻ/ʼ patch font (see “Fonts”) |

Environment (optional):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://muomalat.uz` | Canonical origin for metadata, sitemap, RSS, OG images |
| `NEXT_PUBLIC_DEMO_NOTICE` | on | Set to `off` to hide the “Sinov versiyasi” strip once real content is live |

## Editions and routes

| Edition | Prefix | `<html lang>` | Content |
|---|---|---|---|
| Oʻzbekcha (Latin) — default | `/` | `uz` | source language |
| Ўзбекча (Cyrillic) | `/kr` | `uz-Cyrl` | transliterated automatically from Latin (`src/i18n/translit.ts`) |
| Русский | `/ru` | `ru` | interface translated; stories use `translations.ru` when present, otherwise the Uzbek original with `lang="uz"` and canonical → Uzbek |
| English | `/en` | `en` | as Russian |

All pages live under `src/app/[lang]/`. `src/proxy.ts` rewrites unprefixed
paths to the internal `uz` segment and redirects `/uz/…` to the root, so every
page has one public URL. Main routes: `/`, `/{yangiliklar|tahlil|intervyu|izoh|dunyo}`,
`/{rubric}/{slug}`, `/{rubric}/sahifa/{n}`, `/mavzu/{tag}`, `/muallif/{slug}`,
`/lugat`, `/lugat/{term}`, `/xarita`, `/klub`, `/klub/{event}`, `/dayjest`,
`/biz-haqimizda`, `/reklama`, `/aloqa`, `/qidiruv?q=`, `/rss.xml`, `/sitemap.xml`,
`/robots.txt`, `/manifest.webmanifest`.

## Project structure

```
src/
  app/[lang]/…            pages, OG images, RSS route
  app/sitemap.ts, robots.ts, manifest.ts, icon.svg, apple-icon.tsx
  components/             ui · layout · story · article · blocks · forms · <page areas>
  content/
    types.ts              Article, Rubric, Author, GlossaryTerm, Institution, ClubEvent, …
    index.ts              query API used by every page (the CMS seam)
    data/                 mock data: articles/*, glossary, institutions, milestones, club, tags, authors, images, site
  i18n/                   locales, transliteration, message sets per area (uz / ru / en; kr derived)
  lib/                    routes, SEO + JSON-LD, date/number formatting, forms, server actions, RSS
  assets/fonts/           TTF subsets for OG image rendering (renamed, SIL OFL)
public/images/            generated editorial illustrations (SVG)
public/fonts/             ʻ/ʼ patch font
DESIGN.md                 design system: tokens, type scale, rules, component inventory
```

## Replacing the mock data with a CMS

Pages never import data files directly; they call `src/content/index.ts`
(`getArticles`, `getArticle`, `getArticlesByRubric`, `getGlossary`,
`getInstitutions`, `getClubEvents`, `search`, …). To move to a CMS:

1. Keep `src/content/types.ts` as the contract (or generate it from the CMS schema).
2. Re-implement the functions in `index.ts` against the CMS API; keep the
   localisation step (`localizeArticle`) so the Cyrillic edition keeps working.
3. Add `export const revalidate = 300` (or on-demand revalidation) to pages,
   the RSS route and the sitemap, since today everything is generated at build time.
4. Replace `CONTENT_NOW` (the mock "today") with the request time.
5. Wire the server actions in `src/app/actions.ts` and `src/lib/actions/*` to the
   e-mail provider / CRM — they currently validate and acknowledge only.

## Fonts

Source Serif 4 (headlines, body) and IBM Plex Sans (interface, data) via
`next/font/google`: self-hosted, Latin subset preloaded, Cyrillic loaded on
demand through `unicode-range`, metric-matched system fallbacks while loading.
Both families cover Uzbek Latin, Uzbek Cyrillic (ў қ ғ ҳ) and Russian.

IBM Plex Sans draws ʻ (U+02BB) and ʼ (U+02BC) as 600-unit spacing modifiers,
which splits Uzbek words (“O ʻ zbekiston”). `public/fonts/okina-sans.woff2`
(1.3 KB, derived from Plex under the OFL and renamed) supplies just those two
code points with word-internal spacing and sits first in the sans stack.

The OG-card subsets in `src/assets/fonts/` are renamed for the same reason
(“Muomalat Card Sans/Serif”): “Plex” and “Source” are Reserved Font Names, and
a subset is a Modified Version under the OFL.

## Accessibility and quality bar

WCAG AA colour tokens (see `DESIGN.md`), visible focus states, skip link, one
`h1` per page, labelled landmarks, keyboard-operable menu (`<dialog>`), forms
with inline errors and live status, charts with a table alternative, light and
dark themes from the same tokens, layouts verified from 360 px up.

## Licence

Code: [MIT](LICENSE) © 2026 Khurshid Normurodov.

Not covered by the MIT License (details in [NOTICE.md](NOTICE.md)):

- the Muomalat name and wordmark;
- the placeholder editorial content in `src/content/data/`;
- the fonts, which stay under the SIL Open Font License 1.1 (`OFL.txt` next to each font folder).
