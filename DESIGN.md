# Muomalat — design system and front-end conventions

A serious financial newspaper with a Central Asian character: FT/Bloomberg
discipline on warm paper, typography doing the work, hairlines instead of cards,
and one quiet geometric ornament.

## 1. Concept (five lines)

1. **Paper and ink.** Warm paper `#FAF8F3`, deep green-black ink `#10201D`; the dark theme swaps their roles rather than inventing new colours.
2. **Type carries the design.** Source Serif 4 (optical sizes 8–60) for headlines and long reading; IBM Plex Sans for interface, labels and data, with tabular figures.
3. **Hairlines, not boxes.** 1px `#DAD5C8` rules and 2px ink section rules structure a dense but calm grid. No shadows, no rounded cards, no gradients.
4. **Emerald for meaning, brass for marks.** Emerald `#0F6B5C` = links, kickers, actions; brass `#B0843A` = small highlights (diamond, numerals, rules) only, never body text.
5. **One ornament.** An eight-point girih star-and-cross lattice, used only for section dividers, the club header and the 404 page.

## 2. Tokens

All colours are CSS variables in `src/app/globals.css`, exposed to Tailwind as
`bg-*`, `text-*`, `border-*`. Tailwind's default palette is removed — only these exist.

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#FAF8F3` | `#10201D` | page background |
| `paper-2` | `#F3EFE5` | `#152824` | tinted panels (digest, term of the day, glossary card) |
| `paper-3` | `#ECE6D7` | `#1B302B` | pressed/hover on tinted panels |
| `ink` | `#10201D` | `#ECE8DE` | headlines, body (15.9:1) |
| `ink-2` | `#3E4C48` | `#C2C8C1` | standfirsts, secondary copy (8.5:1) |
| `ink-3` | `#5A6662` | `#9AA59F` | timestamps, captions, input borders (5.6:1) |
| `rule` | `#DAD5C8` | `#2C403B` | hairlines |
| `rule-strong` | `#B9B2A2` | `#4A5E58` | separators, slashes |
| `emerald` | `#0F6B5C` | `#5EBEA8` | links, kickers, primary buttons, focus ring (6.0:1) |
| `emerald-ink` | `#0B5045` | `#86D3C0` | hover, text on `emerald-wash` |
| `emerald-wash` | `#E4EEE9` | `#17332D` | callouts, success |
| `on-emerald` | `#FAF8F3` | `#0B1715` | text on emerald buttons |
| `brass` | `#B0843A` | `#C99A4E` | diamonds, big numerals, rules — **not small text**: as text only at 24px+ on `paper` (3.2:1); on `paper-2`/`brass-wash` (2.9:1) or below 24px use `brass-ink` |
| `brass-ink` | `#80601F` | `#D6AE68` | brass when it must be text (5.5:1) |
| `brass-wash` | `#F5EEDF` | `#231F15` | sponsored content panel |
| `signal` / `signal-wash` | `#9C3B25` / `#F7EBE5` | `#E58A70` / `#2A1A15` | corrections, form errors |
| `ad` / `ad-ink` | `#ECEBE6` / `#55534C` | `#1B2421` / `#A9B0AA` | advert slots (deliberately off-palette) |
| `chart-1..3`, `chart-muted`, `chart-grid` | see CSS | see CSS | charts only (validated for CVD) |

**Type scale** (fluid 360 → 1280px): `text-display` 34→56 · `text-h1` 30→46 ·
`text-h2` 24→32 · `text-h3` 20→24 · `text-h4` 17→19 · `text-standfirst` 19→23 ·
`text-body` 18→20 (lh 1.68) · `text-lead` 17 (serif secondary copy, rail headlines,
term links; sets size only, pair with `leading-*`) · `text-ui` 15 · `text-data` 14 · `text-meta` 13 ·
`text-micro` 12 (uppercase via `label-caps`) · `text-numeral` 40→56.
Headlines: `font-display font-semibold` (serif + optical sizing). Interface: default sans.

**Spacing**: Tailwind 4px scale. Page container: `wrap` (16px gutters on phones,
24px tablet, 32px desktop, max 1280px). Grid: 12 columns from `lg`, `gap-x-8`.
Section rhythm: `mt-12 md:mt-16` between home/listing sections. Article measure:
`max-w-measure` (42rem ≈ 66 characters).

**Utilities** (globals.css): `wrap`, `font-display`, `figures` (tabular lining
numerals), `label-caps`, `headline-link`, `text-link`, `term-link` (dotted brass
— glossary references), `scroll-x`, `rule-t`, `rule-b`, `rule-ink`,
`sr-only-focusable`, `.girih`, `.article-body`, `.breakout`.

**Shape**: radius `2px` on controls only (`rounded-[2px]`), `rounded-full` only
for avatars and dots. No shadows. Controls ≥ 36px tall (44px for primary touch).

## 3. Rules that are easy to break

- **Uzbek orthography**: oʻ / gʻ use U+02BB `ʻ`; tutuq uses U+02BC `ʼ`
  (aʼzo, maʼlumot). Never `'`, `‘`, `’`. Quotes «…». IBM Plex Sans draws these
  two characters badly, so `public/fonts/okina-sans.woff2` patches them via
  `unicode-range` — do not remove it from `--font-sans`.
- **Not a religious publication**: no religious imagery or texts; never state
  that something is halol/harom. Use `EditorialNote` / `t.editorial.*` copy where
  a page touches Sharia compliance.
- **Sponsored vs advert vs editorial**: `SponsoredLabel` (brass frame, "Hamkorlik
  materiali") for partner content, `AdLabel` + `AdSlot` (grey, hatched,
  "Reklama") for ads. Editorial kickers are emerald text with no background —
  never style editorial items like the commercial ones.
- **Placeholders**: anything that must be replaced before launch renders through
  `<Placeholder>` (dotted brass frame, `data-placeholder`).
- **Locales**: every page lives under `src/app/[lang]/…`. Build links with
  `href(locale, paths.x())` from `@/lib/routes` — never hard-code `/ru/...`.
  Interface strings come from `src/i18n/messages/<area>.ts` via
  `pick(messages, locale)`: write `uz`, `ru`, `en`; `kr` is transliterated
  automatically (add `kr` overrides only if transliteration is wrong).
  Pages that show Uzbek content in ru/en set `lang="uz"` on the content
  (`contentLang` on every localized object).
- **Dates**: `formatDate(iso, locale, style)` / `<Timestamp>` — always Tashkent
  time. Numbers: `formatNumber`. "Today" is `CONTENT_NOW` for mock data.
- **Accessibility**: one `<h1>` per page; sections use `aria-labelledby`;
  visible focus (global emerald outline); form fields use `Field`/`TextInput`
  etc. from `components/forms/Field.tsx` (labels, `aria-invalid`,
  `aria-describedby`); colour is never the only signal (labels + icons).
- **Performance**: server components by default; client components only for
  interaction (`'use client'`, small, no libraries). Images through `Figure` /
  `Thumb` (next/image, reserved aspect ratio).

## 4. Components

| Area | Component | Notes |
|---|---|---|
| layout | `Header`, `Footer`, `Wordmark`, `LanguageSwitcher`, `ThemeToggle`, `MobileMenu`, `NavLink`, `HomeOnly`, `SearchForm` | header is sticky; Telegram button always visible |
| ui | `Icon` (inline SVG set), `Girih`, `GirihDivider`, `Kicker`, `SectionHeader`, `Timestamp`, `SponsoredLabel`, `AdLabel`, `Placeholder`, `Button`, `ButtonLink`, `buttonClass`, `TelegramButton`, `Avatar`, `Figure`, `Thumb`, `InlineText` (+`plainText`), `Breadcrumbs` | |
| story | `StoryItem` (variants `standard`, `compact`, `media-top`, `media-side`, `headline`), `StoryLead`, `StoryMeta`, `StoryKicker`, `LatestFeed`, `MostRead` | lists draw the hairlines, items don't |
| article | `ArticleBlocks` (all body blocks), `PullQuote`, `DataTable`, `BarChart`, `LineChart`, `Byline`, `ShareBar`, `CorrectionNote`, `SponsorDisclosure`, `SourceList`, `TagList`, `EditorialNote` | |
| blocks | `DigestSignup`/`DigestForm`, `MarketSnapshot`, `TermOfDay`, `ClubTeaser`, `AdSlot`, `SponsoredTeaser`, `InterviewFeature` | |
| forms | `Field`, `TextInput`, `TextArea`, `Select`, `Checkbox`, `FormStatus` | actions return error codes (`lib/forms.ts`) |

Content API: `src/content/index.ts` (`getArticles`, `getArticlesByRubric`,
`getArticlesByTag`, `getArticlesByAuthor`, `getArticlesByTerm`, `getRelated`,
`getMostRead`, `getGlossary`, `getTerm`, `getInstitutions`, `getMilestones`,
`getClubEvents`, `getNextClubEvent`, `getPastClubEvents`, `getClubEvent`,
`search`, …). Types: `src/content/types.ts`. SEO: `pageMetadata()`,
`languageAlternates()`, `jsonLd()`, `publisherLd` in `src/lib/seo.ts`.

## 5. Routes

| Path (uz; `/kr`, `/ru`, `/en` prefix the same) | File |
|---|---|
| `/` | `app/[lang]/page.tsx` |
| `/{rubric}` (yangiliklar, tahlil, intervyu, izoh, dunyo) | `app/[lang]/[rubric]/page.tsx` |
| `/{rubric}/sahifa/{n}` | `app/[lang]/[rubric]/sahifa/[page]/page.tsx` |
| `/{rubric}/{slug}` | `app/[lang]/[rubric]/[slug]/page.tsx` (+ `opengraph-image.tsx`) |
| `/mavzu/{tag}` · `/muallif/{slug}` | listing template |
| `/lugat` · `/lugat/{term}` | glossary |
| `/xarita` | market map |
| `/klub` · `/klub/{event}` | club |
| `/dayjest` · `/biz-haqimizda` · `/reklama` · `/aloqa` | static pages |
| `/qidiruv?q=` | search (dynamic) |
| `/rss.xml` | RSS per locale |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` |

`src/proxy.ts` rewrites unprefixed paths to the internal `uz` segment and
redirects `/uz/...` to the root.

## 6. Tooling

- `npm run dev` · `npm run build` · `npm run typecheck`
- `npm run validate` — content checks (orthography, banned terms, real names, references, dates)
- `node scripts/gen-images.mjs` — regenerates the SVG illustration set
- `scripts/fonts/fix-okina.py` — rebuilds the ʻ/ʼ patch font
