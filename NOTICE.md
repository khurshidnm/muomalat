# Notice

The source code in this repository is released under the MIT License (see
[LICENSE](LICENSE)). The following are **not** covered by that licence.

## Name and wordmark

“Muomalat”, the Muomalat wordmark and the muomalat.uz domain identify the
publication. The MIT License grants rights in the code, not in the name: a site
built from this code must not use the Muomalat name or wordmark, or present
itself as Muomalat or as affiliated with it, without written permission.

## Editorial content

The stories, glossary entries, institution records, club events and other text
in `src/content/data/` are placeholder material written to exercise the
templates. Institutions and people in them are generic or fictional. They do
not describe real organisations and must not be republished as news. Content
published later on muomalat.uz belongs to its authors and the publisher and is
not part of this repository.

## Fonts

Fonts in this repository are licensed under the SIL Open Font License 1.1, not
the MIT License. The licence text and copyright notices are kept alongside
the files:

| Files | Derived from | Licence |
|---|---|---|
| `public/fonts/okina-sans.woff2` (“Muomalat Okina Sans”) | IBM Plex Sans | [public/fonts/OFL.txt](public/fonts/OFL.txt) |
| `src/assets/fonts/MuomalatCardSans-*.ttf` (“Muomalat Card Sans”) | IBM Plex Sans | [src/assets/fonts/OFL.txt](src/assets/fonts/OFL.txt) |
| `src/assets/fonts/MuomalatCardSerif-SemiBold.ttf` (“Muomalat Card Serif”) | Source Serif 4 | [src/assets/fonts/OFL.txt](src/assets/fonts/OFL.txt) |

They are subsets or modified versions. Under the OFL they carry new names,
because “Plex” and “Source” are Reserved Font Names. The site's main web fonts
(Source Serif 4, IBM Plex Sans) are not stored here; `next/font/google`
downloads them at build time.

## Dependencies

npm packages keep their own licences (Next.js and React: MIT; Tailwind CSS:
MIT; TypeScript: Apache-2.0). See `package-lock.json` and each package's
licence.
