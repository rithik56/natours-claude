---
phase: 04-browse-tours
plan: 10
subsystem: ui
tags: [nextjs, credits, sitemap, robots, metadata, next-image, playwright, vitest]

requires:
  - phase: 04-browse-tours
    provides: "04-05 tour list (`/`, TourRow preload), 04-06 tour page metadata and cover, 04-07 tour page sections (ADR 0039), the cached catalogue (ADR 0031)"
provides:
  - "`/credits`: all 52 photo credits grouped by tour, no client JavaScript, works with JavaScript off"
  - "`listCredits()` cached under ['credits'] with tag tours; `listSlugs()` from the cached catalogue"
  - "`CreditsGroup` Server Component"
  - "`/sitemap.xml` and `/robots.txt`, both force-dynamic, every URL from APP_URL"
  - "Tests: per-photo credit coverage (seed and database), sitemap, robots, page metadata, one preloaded image per page"
  - "ADR 0040: no loading.tsx on /credits"
affects: [04-11, 04-12, 04-13, phase-7-seo]

actuals:
  tokens: 9600
  tasks: 2
  commits: 5
plan_head_before: 6cd148d8a1951fb9ba7843c43d724b06aa381ec1
plan_head_after: 6a74cdb3842aea73f65876997a3193a6b832828a

tech-stack:
  added: []
  patterns:
    - "Metadata routes (sitemap, robots) are force-dynamic and read getConfig() inside the function"
    - "A page that must work with JavaScript off has no loading.tsx and no Suspense around its data (ADRs 0039, 0040)"
    - "The one preloaded image per page carries both `preload` and `fetchPriority=\"high\"`"

key-files:
  created:
    - src/app/credits/page.tsx
    - src/app/credits/page.module.css
    - src/components/features/credits-group.tsx
    - src/components/features/credits-group.module.css
    - src/app/sitemap.ts
    - src/app/robots.ts
    - test/server/modules/tours/credits.test.ts
    - test/app/credits.spec.ts
    - test/app/metadata.test.ts
    - docs/adr/0040-credits-page-has-no-loading-file.md
  modified:
    - src/server/modules/tours/dto.ts
    - src/server/modules/tours/service.ts
    - src/app/tour/[slug]/page.tsx
    - scripts/smoke.ts
    - docs/contracts.md
    - docs/adr/0032-no-loading-file-on-the-tour-page.md
    - docs/adr/README.md

key-decisions:
  - "No loading.tsx on /credits (ADR 0040): with it, JavaScript off showed the heading and 0 of 52 credit rows. Same trade-off and same choice as ADR 0039 for the tour page. Flagged for the user to confirm."
  - "listCredits() runs its own projected query (name, slug, photos, credits), sorted createdAt then _id, because the cached catalogue holds TourSummary without credits"
  - "The tour cover gets fetchPriority=\"high\" next to `preload`, matching TourRow's C2 convention, so each page has exactly one high-priority image"
  - "No lastModified in the sitemap; robots has one `*` rule with no explicit Allow"

patterns-established:
  - "Credit coverage is tested twice: over seed/data/tours.json and over the stored documents"

requirements-completed: [U27, R10, U7, R4]

coverage:
  - id: D1
    description: "/credits lists 52 photos in 13 tour groups, seed order, cover first, each with title linked to its source, author as text and licence linked; works with JavaScript off and at 375px"
    requirement: U27
    verification:
      - kind: integration
        ref: "test/server/modules/tours/credits.test.ts"
        status: pass
      - kind: e2e
        ref: "test/app/credits.spec.ts#[U27] /credits with JavaScript off"
        status: pass
      - kind: e2e
        ref: "test/app/credits.spec.ts#[U27] the page does not scroll sideways, so long titles and authors wrap"
        status: pass
    human_judgment: false
  - id: D2
    description: "A test fails if any catalogue photo has other than exactly one credit, in the seed files and in the database"
    requirement: U27
    verification:
      - kind: unit
        ref: "test/server/modules/tours/credits.test.ts#[U27] every catalogue photo has exactly one credit in the seed files, and no credit names another photo"
        status: pass
      - kind: integration
        ref: "test/server/modules/tours/credits.test.ts#[U27] every catalogue photo has exactly one stored credit, and the page lists each one"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sitemap (/, /credits, 13 tours in name order; two entries when empty) and robots (disallow /me, /my-tours, /styleguide; names the sitemap), both force-dynamic, on APP_URL"
    requirement: R10
    verification:
      - kind: unit
        ref: "test/app/metadata.test.ts"
        status: pass
      - kind: other
        ref: "npm run build (sitemap and robots shown as ƒ) && npm run smoke"
        status: pass
    human_judgment: false
  - id: D4
    description: "Titles, descriptions and canonical URLs for /, tour pages and /credits"
    requirement: R10
    verification:
      - kind: unit
        ref: "test/app/metadata.test.ts#[R10] / has its title, description and the origin as its canonical URL"
        status: pass
      - kind: unit
        ref: "test/app/metadata.test.ts#[R10] /credits has its title, description and canonical URL"
        status: pass
      - kind: integration
        ref: "test/app/tour-page-metadata.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Exactly one fetchpriority=high image on / and on a tour page, none on /credits"
    requirement: U7
    verification:
      - kind: e2e
        ref: "test/app/credits.spec.ts#[U7] preloaded images"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual look of /credits (thumbnail grid, hairlines, wrapping of the 118-character author sentences) against the approved direction"
    verification: []
    human_judgment: true
    rationale: "No test judges the visual design; the specs only prove structure, wrapping and no sideways scroll"

duration: 13min
completed: 2026-11-16
status: complete
---

# Phase 4 Plan 10: Credits, sitemap and robots Summary

**`/credits` lists all 52 photo credits in 13 tour groups as plain server HTML (no loading.tsx, ADR 0040), backed by a cached `listCredits()`. Force-dynamic `sitemap.ts` and `robots.ts` build every URL from APP_URL, and tests prove every photo has exactly one credit and every page has exactly one high-priority image.**

## Performance

- **Duration:** about 13 min for this executor, from the RED commit at 13:57Z to 14:10Z. The earlier executor's time before its RED commit was not recorded.
- **Started:** 2026-11-16T13:57:38Z (RED commit 54645ae, previous executor)
- **Completed:** 2026-11-16T14:10:05Z
- **Tasks:** 2 of 2
- **Files modified:** 17

## Accomplishments

- `/credits` shows 13 groups, each with an h2 linked to its tour, and 52 rows. Each row has a lazy 4rem thumbnail, the title linked to Wikimedia Commons and "Photo by {author}, {licence}" with the licence linked. All of it shows with JavaScript off, and nothing scrolls sideways at 375px.
- `listCredits()` is cached under `['credits']` with tag `tours`. Groups come in createdAt then id order with the cover first, and a tour with no credits has no group.
- Coverage tests fail if any photo lacks exactly one credit, in the seed files or in the database.
- `/sitemap.xml` lists `/`, `/credits` and the 13 tours in name order. `/robots.txt` disallows `/me`, `/my-tours` and `/styleguide` and names the sitemap. Both are force-dynamic, so `next build` needs no database (the build shows them as ƒ). The smoke check covers both.
- Metadata tests cover `/` and `/credits`, alongside the tour page's existing tests. Each page has exactly one `fetchpriority="high"` image.

## Task Commits

1. **Task 1: `/credits` lists every photo's credit, grouped by tour** (tracer)
   - `54645ae` test: failing tests for the credits list and coverage (RED, previous executor)
   - `7803324` feat: listCredits, CreditsGroup and the /credits page (GREEN)
   - `44751fb` docs: ADR 0040, amending ADR 0032 decision 3, and the contracts deviation row
2. **Task 2: Sitemap, robots and metadata on every page** (TDD)
   - `ad509d9` test: failing tests for the sitemap, robots, metadata and preload counts (RED)
   - `6a74cdb` feat: listSlugs, sitemap, robots, smoke checks, the cover's fetchPriority and contracts (GREEN)

No REFACTOR commits were needed.

## TDD

- **Task 1 RED (54645ae, previous executor):** ten `[U27]` tests failed because `listCredits` did not exist. GREEN made nine of them pass. The tenth, the stored-credit coverage test, still failed because of a fault in the test itself (deviation 1).
- **Task 2 RED (ad509d9):** `sitemap.ts` and `robots.ts` were committed as empty skeletons, so the tests load and then fail on their assertions instead of failing to import. Four tests failed: the target (sitemap order) plus the empty-sitemap, robots and force-dynamic checks. The `/` and `/credits` metadata tests and the no-lastModified test passed, because that behaviour already existed.
  - Classifier: `gsd-tools check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`) on Vitest's JUnit report. Vitest's TAP and tap-flat reporters were refused as `invalid_record` ("Malformed TAP"), because the multi-line `toEqual` diff breaks the YAML block. So the JUnit report was used.
  - Semantic assessment: the target test ran and failed on its `toEqual` over the sitemap URLs (expected 15, got `[]`). There was no load, syntax or fixture fault.
- **GREEN:** 12 of 12 in `metadata.test.ts` and `tour-page-metadata.test.ts`. The browser spec passes 8 of 8 after the cover fix.

## Files Created/Modified

- `src/server/modules/tours/dto.ts`: `CreditPhoto`, `CreditGroup` and `toCreditGroup`. These are the previous executor's uncommitted additions, reviewed and ported as written.
- `src/server/modules/tours/service.ts`: `loadCredits`, `listCredits` (cached) and `listSlugs`.
- `src/components/features/credits-group.tsx` and `.module.css`: one tour's credit block, a 4rem grid with hairline rows and `overflow-wrap: anywhere`.
- `src/app/credits/page.tsx` and `page.module.css`: the h1, the 65ch intro line, the groups and `generateMetadata`.
- `src/app/sitemap.ts`, `src/app/robots.ts`: force-dynamic metadata routes.
- `src/app/tour/[slug]/page.tsx`: `fetchPriority="high"` on the cover.
- `scripts/smoke.ts`: checks that `/sitemap.xml` and `/robots.txt` answer 200 with the expected text.
- `test/server/modules/tours/credits.test.ts`, `test/app/credits.spec.ts`, `test/app/metadata.test.ts`: the tests.
- `docs/adr/0040-…`, `docs/adr/0032-…` (status line), `docs/adr/README.md`, `docs/contracts.md`.

## Decisions Made

- **ADR 0040: no `loading.tsx` on `/credits`.** See deviation 2. **The user should confirm this.**
- `listCredits()` runs its own projected query rather than reading the cached catalogue, because `TourSummary` has no credits and widening the catalogue entry for one page would make every list read heavier.
- The credits cache entry has no `revalidate`, which matches the plan's call signature and the test. It is cleared through the `tours` tag on any tour write. The contracts say to restart after `npm run seed`, as for the catalogue.
- **DES-06, question for the user:** each credit shows author, licence (linked) and source (title linked), and the intro line states the only change made to the photos ("resized and saved as JPEG"). The seed records no copyright notice separate from the author, so nothing more is shown. Do the photos' licences need any further notice, for example a "©" line or the licence's full name? If so, the seed needs that data first.
- DES-22 (m), a default Open Graph image for non-tour pages, is deferred to Phase 7, as the plan decided.

## Deviations from Plan

**Execution was split across two executors.** The first executor, in worktree `agent-a34314491a0bb3ecb`, committed task 1's RED step (`54645ae`) and was then cut off by a provider rate limit while partway through GREEN. Its uncommitted `dto.ts` additions were read-only reviewed and ported unchanged. This executor fast-forwarded to `54645ae` and did everything from task 1's GREEN step onwards.

### Auto-fixed Issues

**1. [Rule 1 - Bug] The stored-credit coverage test prefixed keys that were already prefixed**
- **Found during:** Task 1 GREEN
- **Issue:** The test built `tours/${file}` from documents whose `imageCover`, `images` and `photoCredits[].file` already hold `tours/…` (the factory stores full keys, QA-03). It therefore looked for `tours/tours/…` and could never pass.
- **Fix:** The test compares the stored keys as they are. It also now asserts that no stored credit names a photo outside the tour, that each group lists its photos in cover-then-gallery order, and that there is one group per stored tour.
- **Files modified:** test/server/modules/tours/credits.test.ts
- **Verification:** 10 of 10 credit tests pass.
- **Committed in:** 7803324

**2. [Rule 1 - Bug, conflicting must-haves] No `loading.tsx` on `/credits` (ADR 0040)**
- **Found during:** Task 1, Playwright run
- **Issue:** The plan's must-haves asked for both "`/credits` has a loading.tsx" and "it works with JavaScript off". With the `loading.tsx` in place, the page streamed behind Suspense. With JavaScript off it showed the h1 and intro line, 0 of 13 group links and 0 of 52 rows. This is the conflict ADR 0039 recorded for the tour page, where the user chose to await rather than stream.
- **Fix:** The `loading.tsx` was removed and the page awaits `listCredits()`. ADR 0040 records this, ADR 0032's status line notes that decision 3 is amended, and the contracts deviation table gains a row.
- **Plan truth not met as written:** "`/credits` has a loading.tsx …". Restoring it is a 10-line file, but it would break the JavaScript-off checks. **The user should confirm ADR 0040.**
- **Files modified:** src/app/credits/page.tsx; docs/adr/0040-…, 0032-…, README.md; docs/contracts.md
- **Verification:** test/app/credits.spec.ts passes with JavaScript disabled.
- **Committed in:** 7803324, 44751fb

**3. [Rule 1 - Bug] The tour cover was preloaded but not high priority**
- **Found during:** Task 2, the `[U7]` preload spec
- **Issue:** The cover used `preload` without `fetchPriority="high"`, so the tour page had 0 high-priority images. `/` has 1, because TourRow sets both (C2).
- **Fix:** Added `fetchPriority="high"` to the cover's `Image`.
- **Files modified:** src/app/tour/[slug]/page.tsx (not in the plan's file list)
- **Verification:** The `[U7]` spec passes, and `test/app/tour-page.spec.ts` still passes.
- **Committed in:** 6a74cdb

**4. [Rule 3 - Blocking] Worktree setup for verification**
- The worktree had no `node_modules`, so `npm ci` was run from the existing lockfile; no new package was installed. Route types were generated with `npx next typegen` so `tsc` could resolve `PageProps`.
- A `next dev` server from the main checkout was already on port 3000, and `playwright.config.ts` reuses an existing server, so Playwright would have tested the main checkout. The specs were run through a temporary, uncommitted config on port 3117 with `reuseExistingServer: false`, then the config was deleted. The main checkout's server was left running and untouched.

---

**Total deviations:** 4 (3 Rule 1, 1 Rule 3), plus the split execution.
**Impact on plan:** Deviation 2 leaves one stated plan truth unmet in favour of a conflicting one, and needs the user's confirmation. The others are small and needed for correctness. There was no scope creep.

## Issues Encountered

- Vitest's TAP output is malformed for multi-line diffs, so the RED classifier needed the JUnit reporter instead.
- ADR numbering: 0034 to 0038 are reserved for plans 04-08 and 04-12, so this plan took 0040. If another plan in the same wave also took 0040, the orchestrator will need to renumber at merge.

## Known Stubs

None. Task 2's RED skeletons were replaced in its GREEN commit.

## Threat Flags

None. The new surface (sitemap, robots, credit links) is covered by T-04-27 (origin from APP_URL only, tested) and T-04-28 (external links go through `Link`, which sets `rel="noopener noreferrer"`).

## User Setup Required

None. No external service configuration is required.

## Verification run

- `npx vitest run test/server/modules/tours test/app/metadata.test.ts test/scripts/seed-data.test.ts test/app/tour-page-metadata.test.ts`: 10 files, 130 tests passed.
- `npx tsc --noEmit`: exit 0. `npm run lint`: clean apart from the temporary Playwright config, which was then deleted. `npm run lint:css`: clean. `check:conventions` and `check:client`: clean.
- `npm run build`: succeeded, with `/credits`, `/robots.txt` and `/sitemap.xml` shown as ƒ and no prerender error.
- `npm run smoke` (APP_ENV=ci, APP_URL=http://localhost:3210): ok, including the sitemap and robots checks.
- `npx playwright test --project=app test/app/credits.spec.ts test/app/tour-page.spec.ts`, against this worktree's server: 20 passed, 1 skipped (the existing 375px layout-shift hold).

## Next Phase Readiness

- ROADMAP Phase 4 criterion 4 holds: every photo is credited on its tour page and on `/credits` (52), a missing credit fails a test, every page has metadata, the cover is the tour page's social preview, and the sitemap and robots are in place.
- Open for the user: confirm ADR 0040, and answer the DES-06 copyright-notice question.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*

## Self-Check: PASSED

- All 7 key created files are on disk.
- All 5 plan commits (54645ae, 7803324, 44751fb, ad509d9, 6a74cdb) are on the branch, and the working tree was clean before this SUMMARY commit.
