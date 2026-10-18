# WildSoul

An editorial atlas of **48 endangered species** (8 in each of six animal groups) with a species atlas, profiles, a wildlife network, a conservation page and an optional 30-question challenge. Next.js 14 (App Router), React 18, Tailwind 3, GSAP and Leaflet. No database. All content is static and generated at build time.

> **Read this first.** The structure, quiz logic and UI are tested. The *scientific content is not verified against live sources*: IUCN categories, source links and images could not be checked from the build environment (network blocked). See [Known limitations](#known-limitations).

## Install, run, test

```bash
npm ci                # install from the lockfile
npm run dev           # http://localhost:3000
npm run build && npm start
npm run lint
npm run check:data    # dataset + quiz validation (structure and internal consistency only)
npm test              # unit tests (Node's built-in runner, no extra dependencies)
npm run images:fetch  # needs internet, see "Images"
```

Browser smoke suite (optional, needs Python + Playwright and a running production server):

```bash
npm run build && npx next start -p 3200 &
python3 tests/e2e/browser-smoke.py       # WILDSOUL_URL overrides the address
```

Environment variable: `NEXT_PUBLIC_WIKI_RUNTIME_IMAGES=false` stops the browser from requesting Wikipedia lead images at runtime (labelled placeholders are shown instead). Default is enabled.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing: hero, 8 curated featured species, curated 16-species network, group tiles, expedition preview |
| `/species` | Atlas: search, status/group/habitat filters, sort, reset. State is kept in the URL |
| `/species/[slug]` | 48 static profiles. Unknown slug gives the not-found page |
| `/groups` | Network (taxonomy / habitat / threats, with text alternative) and the six group sections |
| `/conservation` | Threat chapters, reported responses, recommendations |
| `/explore` | Expedition trail and the Challenge (`?view=challenge`). `?stop=<slug>` deep-links a stop |
| `/about` | Mission, methodology, limits |
| `/levels` | HTTP redirect to `/explore` |

## The 48-species catalogue

The original dataset had 15 species: Mammals 10, Birds 3, Reptiles 1, Amphibians 1, Fish 0, Invertebrates 0. Eight per group needs 48, so Mammals had **two too many** and the other four groups were short. Resolution, nothing deleted silently:

- **Bengal Tiger** and **Sumatran Orangutan** are *archived*: kept in `data/species-dataset.json` and listed with reasons in `data/catalogue.json` (`archived`), but not shown in the catalogue. A test asserts this.
- 35 species were added in `data/species-additions.json` to fill the other groups.

| Group | Count | | Status | Count |
| --- | --- | --- | --- | --- |
| Mammals | 8 | | Critically Endangered | 25 |
| Birds | 8 | | Endangered | 15 |
| Reptiles | 8 | | Vulnerable | 8 |
| Amphibians | 8 | | | |
| Fish | 8 | | | |
| Invertebrates | 8 | | **Total** | **48** |

## Data layers

`lib/species.js` is the single source used by every page. It calls `buildCatalogue` in `lib/catalogue.mjs` (pure ESM, unit-tested) over:

1. `data/species-dataset.json`: original project dataset, **unmodified**.
2. `data/species-enrichment.json`: taxonomy, groups, tags, geo precision for the original species.
3. `data/species-additions.json`: the 35 added species.
4. `data/species-images.json`: image records written by `images:fetch` (empty manifest until run).
5. `data/catalogue.json`: targets, group order, archived species, featured list, network list.

### Species schema (built record)

`slug, name, scientificName, group, taxonomy{class,order,family,genus}, status{code,label,rank}, statusVerified (false), habitat, habitatTags, region, geo{lat,lng,zoom,country,locName}, geoPrecision, tagline, summary, ecologicalRole, threats, threatTags, conservation{actions,reported}, related[] (derived), sources[{label,url,kind,checked}], image{…}, population{estimate:null, series:[], available:false, verified:false, reason, legacyFigures}, audio{description,hint,params}`.

`related` is derived deterministically (shared genus 100, family 60, order 30, plus shared habitat/threat tags and group) with a minimum score, so the same data always gives the same links.

### Add or edit a species

1. Add an object to `data/species-additions.json` (copy an existing entry; every field above is required, `taxonomy.class/order/family/genus`, `iucn.code` one of `CR|EN|VU`, `geoPrecision` one of the allowed values).
2. To keep the 8-per-group rule, archive another species in `data/catalogue.json` or change `target` deliberately.
3. `npm run check:data` and `npm test` must pass. Do not enter a population number without a source, date, unit and method.

### Add or edit a quiz question

Edit `lib/quiz/bank.mjs`. Each question has `id` (`L<level>Q<n>`), `prompt`, four `options` (`{label, slug?|tag?}`), `answer` (0–3), `subject` (species slug), `explanation`, and a `check` descriptor (e.g. `{type:'group'}`, `{type:'status'}`, `{type:'scientificName'}`). `lib/quiz/validate.mjs` verifies each answer against the dataset; a question that cannot be machine-verified must be marked `curated` and is listed as a warning for human review. Keep 6 levels × 5 questions, no population-number questions.

## Quiz (Challenge) structure

6 levels × 5 questions = 30, four options each, one correct answer, distractors drawn from the dataset.

| Level | Name |
| --- | --- |
| 1 | Wildlife Rookie |
| 2 | Habitat Explorer |
| 3 | Nature Detective |
| 4 | Threat Tracker |
| 5 | Species Specialist |
| 6 | Conservation Champion |

Level 1 is open; each later level unlocks when the previous one is completed. Feedback after each answer, one scored answer per question, per-level score out of 5, final score out of 30, 30-question review with source links, replay and restart. A replayed level keeps its previous result until the replay is finished.

**Storage.** Key `wildsoul_progress_v2` holds `{version:2, visited, answers, completed, draft}`. Data is sanitised on load (invalid parts dropped, completion chain enforced). The older `wildsoul_v4_progress` key is migrated (visited stops only) and left untouched. Unreadable data is copied to `wildsoul_progress_corrupt`, a notice is shown, and the challenge starts fresh. To reset manually, use "Restart challenge" or clear these keys.

## Honest-data rules

- **Statuses** (CR/EN/VU) come from the project's own data and are flagged "not re-checked against the live IUCN Red List" in the UI and in `check:data`.
- **Population**: no profile shows a population number or trend chart. Legacy figures had no source, date or unit; they sit in a collapsed "do not cite" table. A chart is drawn only for a series that has unit, source and method.
- **Sources** are IUCN Red List *search* links and Wikipedia article links, marked `checked:false`. They were not opened.
- **Summaries** for the 35 added species were written for this atlas from general knowledge and are labelled as such. They need expert review before being treated as factual references.
- **Maps** mark a representative site, never a range. Leaflet is kept; if tiles fail a visible fallback message is shown and the profile stays readable.
- **Audio** is a synthesized demonstration generated in the browser, not a recording.

## Images

Profiles show a Wikipedia lead image at runtime where available, else a labelled placeholder ("Photograph unavailable"). `npm run images:fetch` queries Wikimedia Commons / Wikipedia APIs, accepts only CC0, CC BY, CC BY-SA and public domain (rejects NC/ND and unclear licences), allows only `upload.wikimedia.org` image hosts, **merges** into `data/species-images.json` and marks each record `reviewed:false`.

**Live verification is pending.** The script and parsers are covered by unit tests with *mocked* responses only; it was not run against the live APIs. To verify: run it with internet, open each result, confirm the licence and attribution, set `reviewed:true`, commit the file.

## Verify maps, population, sources

- Maps: open a profile, confirm tiles load, the pin sits at the named site and the precision note is present.
- Population: only add a series to `population` after checking an IUCN assessment or other published source; record unit, date, method and URL.
- Sources: open every link in `sources` and set `checked:true` only after reading it.

## Accessibility and security notes

Implemented: text alternative for the network, alt text/labels, modal dialog with Escape-to-close and focus return, scroll lock and restore, mobile menu with focus management, reduced-motion handling, URL validation for external links and image URLs (`lib/safeUrl.mjs`), DOM-node (not HTML string) map tooltips. **No WCAG conformance is claimed**: colour contrast and a screen-reader pass were not audited.

## Tests actually run (final build)

**Passed**
- `npm run lint`: no warnings or errors.
- `npm run build`: 57 static pages (fresh unzip + `npm ci` re-verified).
- `npm run check:data`: passed (4 warnings, see above).
- `npm test`: 62 / 62 (group counts, uniqueness, relationships, 30-question bank and answers, progression/locking/scoring/replay/restart, storage and malformed data, URL safety, image parsing with mocked responses).
- `tests/e2e/browser-smoke.py` (headless Chromium): 95 / 95 on the production server. Covers all routes, 48 profiles, link crawl, 404 for bad slugs, `/levels` redirect, atlas search/filter/sort/reset/empty state/URL restore, network modes and text alternative, profile map/audio/references, full 6-level quiz flow with locking, persistence, resume, final 28/30 review, replay, restart, corrupt and v4 storage, stop dialog Escape/focus/scroll, keyboard-only quiz, mobile menu, overflow at 390px on 8 routes, reduced motion, no unexpected console errors.

**Failed**: none in the final run. (Earlier runs failed on four test-script assertions, fixed in the script; no application defect.)

**Not run**
- Live `images:fetch`, live IUCN/Wikipedia link checks.
- Colour-contrast audit, screen-reader testing, Safari/Firefox, real mobile devices.

**Blocked by environment**
- Map tiles, Google Fonts and Wikipedia images could not load in the sandbox. The tile-failure fallback and image placeholder were exercised instead of the happy path.

## Known limitations

1. All 48 IUCN statuses are unverified against the live Red List.
2. No verified photographs; images are pending a live run of `images:fetch`.
3. No population data is shown.
4. Two quiz facts (L4Q3, L4Q5) are curated general knowledge needing human review. The machine checks prove consistency with this project's dataset, not real-world truth.
5. Added-species text was authored for the atlas and has not been expert reviewed.
6. Progress is stored per browser only.

## Structure

```
app/          routes, layout, not-found
components/   ui layout motion home species science expedition
lib/          catalogue, validators, safeUrl, imageMeta, quiz/ (bank, validate, progress), hooks
data/         dataset layers (see above)
scripts/      check-data.mjs, fetch-images.mjs
tests/        *.test.mjs unit tests, e2e/browser-smoke.py
```

## Attribution

Map tiles: CARTO / OpenStreetMap contributors, Esri, OpenTopoMap (shown on the map). Fonts: Fraunces and Inter via Google Fonts.
