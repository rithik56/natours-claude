---
phase: 04-browse-tours
plan: 05
subsystem: ui
tags: [tours, filters, sort, paging, get-form, javascript-off, next-16, preload, metadata, stylelint]

# Dependency graph
requires:
  - phase: 04-04
    provides: list(), monthOptions(), buildPageQuerySchema, applyCatalogueQuery and the one cached catalogue
provides:
  - "One GET filter form on / (difficulty, length, month, max price, sort) with one Show tours button, working with JavaScript off"
  - "listHref and activeFilterCount in src/lib/tour-list-url.ts, for shareable /-links and the active-filter count"
  - "formatMonth (C5), used for the Month select labels"
  - "TourRow preload prop (C2): the first row's photo is the page's one preloaded image"
  - "generateMetadata for / with the approved title and description and a canonical of APP_URL plus /"
affects:
  - "04 tour page plans (TourRow is shared with the list)"
  - "any later list that needs a filter form (listHref and activeFilterCount are generic over PageQuery)"

# Actuals (#2632): chars/4 over the 13 files this plan changed, measured at HEAD (40,081 bytes).
actuals:
  tokens: 10020
  tasks: 3
  commits: 6
# Measured from the ledger base: git rev-list --count plan_head_before..HEAD (#3968).
plan_head_before: d126d0e63950acdc7be24aeae67857211c57b0d8
plan_head_after: af87719

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-rendered GET form inside a native details disclosure; no client JavaScript on / (D-05)"
    - "Lenient page query through parseQuery and buildPageQuerySchema; defaults and empty values are left out of every generated href"
    - "@supports selector(details::details-content) guards the desktop always-visible form and keeps the summary where it is unsupported"
    - "stylelint's @layer components rule covers ui, feature and app CSS Modules (U3)"

key-files:
  created:
    - src/lib/tour-list-url.ts
    - src/components/features/tour-filters.tsx
    - src/components/features/tour-filters.module.css
    - src/app/page.module.css
    - test/lib/tour-list-url.test.ts
  modified:
    - src/app/page.tsx
    - src/components/ui/tour-row.tsx
    - src/lib/format.ts
    - stylelint.config.mjs
    - test/app/browse-list.spec.ts
    - test/components/ui/tour-row.test.ts
    - test/lib/format.test.ts
    - test/styles/stylelint-rules.test.ts

key-decisions:
  - "The disclosure opens for a non-default sort as well as for a filter; the active count counts only the four filters (UI-SPEC Open item 7, adopted)"
  - "From 64em the form is always visible through ::details-content, with an @supports fallback that keeps the summary where the feature is unsupported (UI-SPEC Open item 6, adopted)"
  - "The canonical of the list is always APP_URL plus / (UI-SPEC Open item 13)"
  - "C2 uses next/image preload. The preloaded row also sets loading eager and fetchPriority high, because preload on its own only drops lazy loading"
  - "The page's default sort and page size stay as constants in tour-list-url.ts, and listHref omits them from every href"
  - "Max price and length options are built from the server's PRICE_BANDS and fixed labels; every price label goes through formatPrice and every month label through formatMonth"

patterns-established:
  - "A URL is built only from the validated query (T-04-16): no raw search param reaches an href or a default value"
  - "The JavaScript-off browse spec selects rows by their tour link, so new controls above the list do not break it"

requirements-completed: [U10, B11, R3, R10, U7]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "/ filters by difficulty, length, month and max price through one GET form with one Show tours button; the URL is shareable and it works with JavaScript off (U10, D-05)"
    requirement: "U10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] filters by difficulty through the GET form and a shareable URL"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] Length 7 to 8 days shows the three tours of that length"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] Month Dec 2026 shows the six tours with a December 2026 departure"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] Max price Up to ₹20,000 shows the five tours at or under that price"
        status: pass
    human_judgment: false
  - id: D2
    description: "Five selects in the order Difficulty, Length, Month, Max price, Sort, with the approved labels; price labels through formatPrice and month labels through formatMonth (D-02, D-04, C5)"
    requirement: "U10"
    verification:
      - kind: unit
        ref: "test/lib/format.test.ts#[U10] reads a YYYY-MM string as that IST month (D-04)"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] each sort orders the list as its label says"
        status: pass
    human_judgment: false
  - id: D3
    description: "The disclosure is closed on / at a phone width and opens for a filter or a non-default sort (D-01); from 64em the selects are visible without opening"
    requirement: "U10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] the disclosure is closed on /, and open when a filter or a non-default sort is set (D-01)"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] from 64em the selects are visible without opening anything"
        status: pass
    human_judgment: true
    rationale: "The @supports fallback that keeps the summary visible where ::details-content is unsupported is not exercised by any test, and the visual fit of the disclosure is for a reader to check."
  - id: D4
    description: "The count line reads 13 tours, 1 tour or 0 tours; Clear filters shows when a filter is active or the sort is not the default"
    requirement: "U10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[B11] page 1 holds twelve rows in rating order, and Next goes to page 2 with one tour"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] a combination with no match shows 0 tours, the empty state and Clear filters, with no list or pagination"
        status: pass
    human_judgment: false
  - id: D5
    description: "No match shows the empty state 'No tours match these filters.' with Clear filters, no list and no pagination, and the form keeps the submitted values"
    requirement: "U10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] a combination with no match shows 0 tours, the empty state and Clear filters, with no list or pagination"
        status: pass
    human_judgment: false
  - id: D6
    description: "Text-only pagination above 12 tours (Previous, Page n of m, Next) keeps every other parameter; 13 tours give two pages, 12 then Kedarkantha Winter Trek; a page past the end clamps to the last page (B11)"
    requirement: "B11"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[B11] page 1 holds twelve rows in rating order, and Next goes to page 2 with one tour"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] pagination links keep every other query parameter"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[B11] a page past the end shows the last page"
        status: pass
    human_judgment: false
  - id: D7
    description: "An invalid sort, page, limit or filter value falls back to its default with no message (ROADMAP criterion 2)"
    requirement: "U10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U10] invalid sort, page, limit and filter values fall back to the default list with no message"
        status: pass
    human_judgment: false
  - id: D8
    description: "The first row's photo is the page's only preloaded image, eager at high fetch priority; every other photo stays lazy (C2)"
    requirement: "U7"
    verification:
      - kind: unit
        ref: "test/components/ui/tour-row.test.ts#[U7] loads the photo eagerly with high fetch priority when preload is set (C2)"
        status: pass
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U7] exactly one image on / is preloaded with high fetch priority, and it is the first row photo (C2)"
        status: pass
    human_judgment: false
  - id: D9
    description: "/ has generateMetadata with the approved title and description and a canonical of APP_URL plus / whatever the query (R10)"
    requirement: "R10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[R10] / has the approved title and description, and a canonical of the origin plus / whatever the query"
        status: pass
    human_judgment: false
  - id: D10
    description: "The page does not scroll sideways at 375px, and the pagination nav is a Tour pages landmark"
    requirement: "U10"
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[U23] the page does not scroll sideways at 375px"
        status: pass
    human_judgment: true
    rationale: "Pagination wrap and 44px control sizes are CSS from the Phase 3 component; the visual fit is for a reader to check at 375px."
  - id: D11
    description: "The / script budget holds: 149,981 bytes of script against a limit of 179,067 (floor 138,107 plus 40,960), with no client component on /"
    requirement: "U10"
    verification:
      - kind: other
        ref: "npm run bundle:check (lhci assert and measure-bundle --check): bundle: ok, 149981 bytes of script for / against a limit of 179067"
        status: pass
    human_judgment: false
  - id: D12
    description: "stylelint's @layer components rule covers ui, feature and app CSS Modules (U3)"
    requirement: "U10"
    verification:
      - kind: unit
        ref: "test/styles/stylelint-rules.test.ts#[U3] fails a feature CSS Module rule written outside a layer"
        status: pass
      - kind: other
        ref: "npm run lint:css and npx stylelint \"src/**/*.css\" \"src/**/*.module.css\" (exit 0)"
        status: pass
    human_judgment: false
  - id: D13
    description: "At 375px 'Up to ₹40,000' and the eleven month options read in full in light and dark themes, and '(2 active)' shows in green after two filters"
    requirement: "U10"
    verification: []
    human_judgment: true
    rationale: "Native select popups and visual fit are not reliably checkable in headless Chromium. Left for end-of-phase UAT (workflow.human_verify_mode default end-of-phase); no checkpoint was emitted. Not run in this execution."
---

# Phase 4 Plan 05: Browse tours filter form Summary

**One GET filter form on `/` (difficulty, length, month, max price, sort) with shareable URLs, text-only paging, an empty state and a preloaded first photo, all working with JavaScript off**

## Performance

- **Duration:** about 20 min (approximate: from the first HEAD check at about 12:36 UTC to the last commit at about 12:52 UTC)
- **Started:** 2026-11-16T12:36:00Z (approximate)
- **Completed:** 2026-11-16
- **Tasks:** 3 of 3 (Task 2 used a RED then a GREEN commit, and Task 3 added two follow-up commits)
- **Files changed:** 13 (the plan's `files_modified` list, exactly)

## Accomplishments

- `/` filters on the five approved controls through one `method="get"` form with one "Show tours" button. The result URL is shareable and works with JavaScript off (U10, D-05).
- The filter disclosure is closed on a phone by default, and it opens when a filter is active or the sort is not the default. From 64em the form is always visible, with an `@supports` fallback (D-01).
- The count line reads "13 tours", "1 tour" or "0 tours". "Clear filters" links to `/` when a filter is active or the sort is not the default.
- A combination with no match shows the empty state "No tours match these filters." with "Clear filters", and no list or pagination. The form keeps the submitted values.
- Text-only pagination appears above 12 tours. Previous and Next keep every other query parameter, and the nav is the "Tour pages" landmark (B11, DES-15).
- Invalid `sort`, `page`, `limit` and filter values fall back to their defaults with no message (ROADMAP criterion 2).
- The first row's photo is the page's only preloaded image, eager at high fetch priority (C2).
- `formatMonth` (C5) labels the Month options in IST, such as "Nov 2026" (D-04).
- `generateMetadata` on `/` sets the approved title and description and a canonical of `APP_URL` plus `/`, whatever the query (R10).
- The stylelint layer rule (U3) now covers feature and app CSS Modules, after checking that every existing file there complies.
- The `/` script budget holds: 149,981 bytes against a limit of 179,067.

## Task Commits

Each task was committed atomically. The commit messages follow the project convention (Conventional Commits with IDs in square brackets and the plan number in brackets).

1. **Task 1: Filter by difficulty through a GET form, with JavaScript off** - `74bb8d5` (feat)
2. **Task 2 (RED): Failing tests for formatMonth, the eager first photo and the feature CSS layer rule** - `c65f1a8` (test)
3. **Task 2 (GREEN): The full filter form, count, empty state, pagination, preload and metadata** - `f0a5aed` (feat)
4. **Task 3: The JavaScript-off list matrix at 375px and 1280px** - `3974a6c` (test)
5. **Follow-up: keep the default page size module-local so knip passes** - `1c35631` (refactor)
6. **Follow-up: `/` has the approved title, description and canonical** - `af87719` (test)

**Plan metadata:** recorded by the commit that adds this SUMMARY (docs, `04-05`). STATE.md and ROADMAP.md are left to the orchestrator.

## Files Created/Modified

- `src/lib/tour-list-url.ts` - `listHref(query, patch)` builds a `/` href and omits defaults and empty values. `activeFilterCount(query)` counts the four filters. `PageQuery`, `DEFAULT_SORT` are exported.
- `src/components/features/tour-filters.tsx` - Server Component (no client directive): the `details` disclosure, the `method="get"` form with five selects, "Show tours", and "Clear filters".
- `src/components/features/tour-filters.module.css` - the disclosure, the intrinsic select grid, the desktop layout behind `@supports selector(details::details-content)`.
- `src/app/page.tsx` - parses the query with `parseQuery(buildPageQuerySchema(months))`, calls `list()` with `clampPage: true`, renders the form, count, list or empty state, and pagination. Exports `generateMetadata`.
- `src/app/page.module.css` - the section gap, the count line, the list reset.
- `src/components/ui/tour-row.tsx` - optional `preload` prop (C2): `loading="eager"` and `fetchPriority="high"` on the photo, and Next's preload link.
- `src/lib/format.ts` - `formatMonth(value)` (C5): a YYYY-MM string is that IST month; an instant is read in IST; September is "Sep".
- `stylelint.config.mjs` - the `@layer components` override now covers `src/components/features/**` and `src/app/**` CSS Modules.
- `test/lib/tour-list-url.test.ts` - listHref and activeFilterCount, with the default sort and page 1 omitted.
- `test/lib/format.test.ts` - formatMonth cases.
- `test/components/ui/tour-row.test.ts` - preload cases (eager, high priority, preload link) and the lazy default.
- `test/styles/stylelint-rules.test.ts` - feature and app CSS Module layer cases.
- `test/app/browse-list.spec.ts` - the JavaScript-off matrix at 375px and 1280px, and the `/` metadata test.

## Decisions Made

- A non-default sort opens the disclosure too. The active count counts only the four filters (UI-SPEC Open item 7, adopted).
- From 64em the form is always visible through `::details-content`, with an `@supports` fallback that keeps the summary where the feature is unsupported (UI-SPEC Open item 6, adopted).
- The list's canonical is always `APP_URL` plus `/` (UI-SPEC Open item 13).
- C2 uses next/image `preload`. Next 16's preload on its own only drops lazy loading, so the preloaded row also sets `loading="eager"` and `fetchPriority="high"` explicitly.
- Price and month options are built from the server's `PRICE_BANDS` and `formatPrice`, and from the derived month list and `formatMonth`. No price or month is written by hand.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dependencies were missing in the fresh worktree**
- **Found during:** Task 1 (first typecheck)
- **Issue:** `node_modules` was absent in the new worktree.
- **Fix:** `npm ci` from the existing lockfile. No package was added.
- **Files modified:** none committed (environment only)
- **Verification:** `npx vitest run` and `npx tsc --noEmit` ran.
- **Committed in:** not committed (environment only)

**2. [Rule 3 - Blocking] Next's generated types were missing**
- **Found during:** Task 1 (typecheck)
- **Issue:** `PageProps` was not found, and two seed `.jpg` modules did not resolve (the same as 04-04's deviation 1).
- **Fix:** `npx next typegen`. The output is gitignored.
- **Files modified:** none committed (gitignored)
- **Verification:** `npx tsc --noEmit` exits 0.
- **Committed in:** not committed (gitignored)

**3. [Rule 1 - Bug] The existing browse spec's row selector broke**
- **Found during:** Task 1 (Playwright)
- **Issue:** `h1 + ul > li` assumed the list directly follows the heading. The filter form now sits between them.
- **Fix:** Rows are selected by the tour link they contain: `li:has(> a[href^="/tour/"])`.
- **Files modified:** `test/app/browse-list.spec.ts`
- **Verification:** the `[B1]` test passes.
- **Committed in:** `74bb8d5`

**4. [Rule 2 - Missing Critical] The preloaded photo lacked eager loading and high priority**
- **Found during:** Task 2 (RED tests were written, then the GREEN tests failed)
- **Issue:** With only `preload`, Next 16 removes lazy loading and emits a `<link rel="preload">`, but the `img` has no `fetchpriority`. C2 requires high fetch priority on the first photo.
- **Fix:** `TourRow` sets `loading={preload ? 'eager' : 'lazy'}` and `fetchPriority={preload ? 'high' : undefined}`. The unit test is case-insensitive about the attribute because React's static markup writes `fetchPriority` in camelCase.
- **Files modified:** `src/components/ui/tour-row.tsx`, `test/components/ui/tour-row.test.ts`
- **Verification:** the TourRow unit tests and the `[U7]` Playwright test pass.
- **Committed in:** `f0a5aed`

**5. [Rule 1 - Bug] The JavaScript-off filter test ran at a width where the summary is hidden**
- **Found during:** Task 2 (Playwright)
- **Issue:** The first JavaScript-off test ran at the 1280px desktop viewport. From 64em the summary is hidden by design, so clicking it timed out.
- **Fix:** The JavaScript-off phone block runs at 375px, where the disclosure is the control (D-01). A separate desktop block asserts that the selects are visible without opening anything.
- **Files modified:** `test/app/browse-list.spec.ts`
- **Verification:** all 16 browse tests passed; the metadata test was added later and passes.
- **Committed in:** `f0a5aed` and `3974a6c`

**6. [Rule 3 - Blocking] knip reported an unused export**
- **Found during:** the repository CI checks (`npm run knip`)
- **Issue:** `DEFAULT_LIMIT` was exported but used only inside its module.
- **Fix:** Made it module-local, the same treatment 04-04 gave its own unused exports.
- **Files modified:** `src/lib/tour-list-url.ts`
- **Verification:** `npm run knip` exits 0.
- **Committed in:** `1c35631`

**Total deviations:** 6 (3 Rule 3, 2 Rule 1, 1 Rule 2). Items 1 and 2 are environment only and are not committed. **Impact:** none on the design or scope. No requirement was added or dropped.

### Plan items not implemented as written

- **Page title template.** The plan asks for the title "Small-group tours across India", and that is what `generateMetadata` sets. `docs/design/copy.md` says titles use the root template `%s | Natours`, but the root layout has no template and `src/app/layout.tsx` is not in this plan's files. The list title therefore has no "| Natours" suffix. This is logged under Deferred Issues rather than changed here.
- **Task 2 RED evidence record.** Not produced as a classifier record. See TDD Gate Compliance.

## TDD Gate Compliance

Task 2 is `tdd="true"`. The RED commit `c65f1a8` comes before the GREEN commit `f0a5aed`, and the GREEN commit's message follows it in history.

- **RED:** seven new tests were added (four `formatMonth` cases, one eager-photo case, two stylelint layer cases). Each of the seven failed when run, for the planned reasons: `formatMonth is not a function`, `AssertionError` on the eager-loading assertion, and stylelint returning `[]` where the layer rule should be reported. The lazy-default TourRow case already passed and is a regression guard, not RED.
- **GREEN:** `formatMonth`, the `preload` prop, and the stylelint override were implemented. All 42 targeted tests then passed, and the full Vitest suite later passed (72 files, 921 tests).
- **Gap:** the RED evidence was not captured as the persisted record that `gsd_run check tdd-red-evidence` classifies, so no `RED_EVIDENCE_OK` verdict exists. RED was verified by reading the Vitest output above, not by the classifier.
- **Commit scope:** the commits use the project convention `test(tours): ... (04-05)`, not the `test(04-05):` form in `tdd.md`. The executor's regex gate for the RED and GREEN commits therefore will not match these commits by pattern. This SUMMARY records them explicitly.

## Issues Encountered

- The sandbox refused several compound shell commands run from inside the worktree, so they were split into plain commands. That is the same as 04-04.
- The first draft of the sort test read the rows before the form navigation had finished, so it saw an empty list. It now waits for the URL to change and for a row to appear.
- The empty state and the form each show a "Clear filters" link when a filter is active, so the test asserts both. Both point to `/`.
- The Next.js log line that asked for `loading="eager"` on the first photo (listed as a deferred item in 04-04) no longer appears in the later Playwright runs, now that the first photo is preloaded.
- Not covered end to end: a list of exactly 12 matching tours with no pagination. The seed has no filter that yields exactly 12. The condition `totalPages > 1` covers it in code, and the 04-04 unit tests cover the paging arithmetic.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. Every control, label and message is wired to real data or copy.

## Threat Flags

None. The GET form's values pass `parseQuery` with the allowlisted `buildPageQuerySchema` (T-04-15), and every href and default value is built from the validated query (T-04-16). No new network endpoint, auth path or schema surface was added.

## Deferred Issues

- **Root title template.** `docs/design/copy.md` specifies `%s | Natours` for every page title. The root layout (`src/app/layout.tsx`) sets `title: 'Natours'` with no template, so `/` shows "Small-group tours across India" without the suffix. Fix in a plan that owns the root layout.
- **Visual check of the disclosure's fallback.** The `@supports` path that keeps the summary visible where `::details-content` is unsupported is not exercised by any test.
- **Shared ledgers not written.** `.planning/WINDOWS.md` and `deferred-items.md` are cross-plan files. Writing them from a parallel worktree would leave uncommitted changes that disappear when the worktree is removed. The orchestrator should record these:
  - `unrun-verify`, `src/components/features/tour-filters.tsx`: the 375px visual check (Max price "Up to ₹40,000", the eleven month options, "(2 active)" in green, light and dark) has not been run.
  - `unrun-verify`, `src/components/features/tour-filters.module.css`: the `@supports` fallback path has not been checked in a browser without `::details-content`.
  - `deviation`, `src/app/page.tsx`: the title has no `%s | Natours` template (see above).

## Human verification (end-of-phase UAT)

Plan Task 3 carries a human check, which this execution did not run. It is listed for end-of-phase UAT and no checkpoint was emitted, because `workflow.human_verify_mode` defaults to `end-of-phase`.

- Open `/` at 375px in light and dark themes, open "Filters", and open the Max price and Month selects. "Up to ₹40,000" and all eleven month options read in full with no clipping. After applying two filters, "(2 active)" shows in green. The page matches the approved Milestone direction.

## Next Phase Readiness

- The filter form, `listHref` and `activeFilterCount` are generic over `PageQuery`, so later lists can reuse them.
- `TourRow` now has `preload`, so the tour page's cover and any other first-visible image can use the same contract.
- The title template gap is noted above for the owner of the root layout.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*

## Self-Check: PASSED

- Created files exist on disk: `src/lib/tour-list-url.ts`, `src/components/features/tour-filters.tsx`, `src/components/features/tour-filters.module.css`, `src/app/page.module.css`, `test/lib/tour-list-url.test.ts`.
- Task commits are ancestors of HEAD: `74bb8d5`, `c65f1a8`, `f0a5aed`, `3974a6c`, `1c35631`, `af87719`.
- Verification run before this SUMMARY: `npx vitest run` (72 files, 921 tests passed); `npx tsc --noEmit` exit 0; `npm run lint` exit 0 (`--max-warnings=0`); `npm run lint:css` exit 0; `npm run knip` exit 0; `npm run format:check` exit 0; `npm run check:conventions` and `npm run check:client` passed; `npm run build` succeeded; `npm run bundle:check` printed `bundle: ok, 149981 bytes of script for / against a limit of 179067`; `npx playwright test --project=app test/app/browse-list.spec.ts` passed 17 of 17.
