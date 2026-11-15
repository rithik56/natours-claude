---
phase: 03-design-system-and-app-shell
plan: 05
subsystem: ui
tags: [native-radio-group, star-rating, file-input, object-url, start-date, css-modules, playwright, server-components]

requires:
  - phase: 03-design-system-and-app-shell
    provides: five-layer CSS, design tokens, the gated /styleguide route and the Playwright app project (plan 03-01)
provides:
  - ui/file-input (Client Component) that previews a chosen photo before upload and revokes its object URL on replacement and unmount
  - ui/start-date-select (Server Component) whose option labels come from formatDate and whose values are IST days
  - ui/star-rating (Server Component) read-only display with an aria-label stating the numeric value
  - ui/star-rating-input (Client Component) W3C APG Rating Radio Group built from five native radios, with no key handling
  - Three styleguide sections wired into /styleguide
affects: [03-10 styleguide assembly, Phase 4 booking panel (start-date-select, price), Phase 5 photo upload (file-input), Phase 6 review form (star-rating-input)]

actuals:
  tokens: 5512
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Native radio group for the keyboard star input: browser arrow keys, Space and Tab, with no hand-rolled key handling"
    - "Object URL lifecycle: revoke the previous URL before creating the next, and revoke the current one on unmount"
    - "Star fill without script: :has() selectors fill the chosen star and every star before it"
    - "Visually hidden text kept in the accessible name, with decorative glyphs aria-hidden"
    - "Date form values are IST calendar days (YYYY-MM-DD), matching the seed convention (B19)"

key-files:
  created:
    - src/components/ui/file-input.tsx
    - src/components/ui/file-input.module.css
    - src/components/ui/start-date-select.tsx
    - src/components/ui/start-date-select.module.css
    - src/components/ui/star-rating.tsx
    - src/components/ui/star-rating.module.css
    - src/components/ui/star-rating-input.tsx
    - src/components/ui/star-rating-input.module.css
    - src/app/styleguide/sections/file-input-section.tsx
    - src/app/styleguide/sections/start-date-select-section.tsx
    - src/app/styleguide/sections/star-rating-section.tsx
    - test/app/file-input.spec.ts
    - test/app/star-rating-input.spec.ts
    - test/app/start-date-select.spec.ts
  modified:
    - src/app/styleguide/page.tsx

key-decisions:
  - "start-date-select uses a native select, not ui/select: ui/select comes from plan 03-04, which runs in the same wave and is not in this branch (see deviations)"
  - "The star input stores no rating state: the visual fill is CSS :has() over the native checked radio"
  - "The file input uses a plain img for the blob preview, under an eslint-disable with its reason, since next/image cannot optimise a local object URL"
  - "start-date-select values are IST calendar days (YYYY-MM-DD), not ISO instants, so the form submits the same day the seed stores"
  - "start-date-select with no dates renders a disabled select with no options, so no copy is invented for the empty state"
  - "StarRating throws a RangeError for a value outside 0 to max, matching the style of formatDate and formatDistance"

requirements-completed: []
requirements-partial: [U4]

coverage:
  - id: D1
    description: "File input shows a placeholder, then a preview of the chosen photo before any upload"
    requirement: "U15"
    verification:
      - kind: e2e
        ref: "test/app/file-input.spec.ts#[U15] choosing a photo shows its preview before any upload"
        status: pass
      - kind: e2e
        ref: "test/app/file-input.spec.ts#[U15] a placeholder shows until a photo is chosen"
        status: pass
    human_judgment: false
  - id: D2
    description: "Choosing a second photo replaces the preview and revokes the first object URL"
    requirement: "U15"
    verification:
      - kind: e2e
        ref: "test/app/file-input.spec.ts#[U15] a second photo replaces the preview and revokes the first object URL"
        status: pass
    human_judgment: false
  - id: D3
    description: "Star input is a radio group: Tab, Arrow keys, Space and the accessible name each star's value"
    requirement: "U14"
    verification:
      - kind: e2e
        ref: "test/app/star-rating-input.spec.ts#[U14] Arrow keys move focus and selection, wrapping at the ends"
        status: pass
      - kind: e2e
        ref: "test/app/star-rating-input.spec.ts#[U14] Tab leaves and re-enters the group on the checked star"
        status: pass
      - kind: e2e
        ref: "test/app/star-rating-input.spec.ts#[U14] Space checks the focused star"
        status: pass
      - kind: e2e
        ref: "test/app/star-rating-input.spec.ts#[U14] the star input is a radio group of five labelled stars"
        status: pass
    human_judgment: true
    rationale: "The filled-star colours in both themes, and the focus ring on a star, are visual judgements for the design gate."
  - id: D4
    description: "Star display is read-only and announces its numeric value with no radio or radiogroup roles"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/star-rating-input.spec.ts#[U4] the display renders a labelled rating with no radio or radiogroup roles"
        status: pass
    human_judgment: false
  - id: D5
    description: "Start date option labels come from formatDate and values are IST days; error and empty states render"
    requirement: "B19"
    verification:
      - kind: e2e
        ref: "test/app/start-date-select.spec.ts#[B19] every option label is a formatted IST date, and the value is the IST day"
        status: pass
      - kind: e2e
        ref: "test/app/start-date-select.spec.ts#[B19] a field error is linked to the select"
        status: pass
      - kind: e2e
        ref: "test/app/start-date-select.spec.ts#[B19] an empty date list renders a disabled select with no options"
        status: pass
    human_judgment: false

duration: not recorded (npm ci and the test runs are included)
completed: 2026-11-15
status: complete
commits: 3
plan_head_before: 3e8f9fff96f00ff1d62e68d9f7da9abf2e2b1a79
plan_head_after: 5d763ba64dbf6247c2e4393df63458e6f27f361b
---

# Phase 3 Plan 05: Specialised input components Summary

**Photo file input with a revocable preview, formatDate-labelled start-date select, and a keyboard-operable star rating built from native radios, all wired into /styleguide.**

## Performance

- **Duration:** not recorded (the plan start time was not captured; `npm ci` and the test runs are included)
- **Started:** not recorded
- **Completed:** 2026-11-15
- **Tasks:** 3
- **Files modified:** 15 (14 created, 1 modified)

## Accomplishments

- `ui/file-input` (Client) shows a fixed-size placeholder, then a preview of the chosen photo before any upload. Choosing another file revokes the previous object URL before creating the next, and the unmount cleanup revokes the current one.
- `ui/start-date-select` (Server) labels every option through `formatDate` and uses the IST calendar day as the value. A field error links through `aria-invalid` and `aria-describedby`. An empty list renders a disabled select.
- `ui/star-rating` (Server) is a non-interactive `role="img"` display with `aria-label="Rated {value} out of {max}"`, a visible numeric value marked `aria-hidden`, and no radio or radiogroup roles.
- `ui/star-rating-input` (Client) is a `fieldset` containing a `radiogroup` of five native radios, one per star, each labelled "{n} star" or "{n} stars". It contains no `onKeyDown` and no key listener. Tab, Arrow keys (with wrap) and Space all come from the browser.
- Three styleguide sections (File input, Start date select, Star rating) render on `/styleguide`. Their content is real seed data: Valley of Flowers Trek start dates, and seed photos for the file-input test.

## Task Commits

1. **Task 1: file input with preview** - `fbc50de` (feat, `[U4, U15]`)
2. **Task 2: start-date select with formatDate labels** - `d09ab1b` (feat, `[U4, B19]`)
3. **Task 3: star rating display and keyboard star input** - `5d763ba` (feat, `[U4, U14]`)

**Plan metadata:** recorded in the docs commit that adds this file (not counted in `commits:`).

_Note: each task's commit includes its own styleguide wiring in `page.tsx`, so every commit leaves the page rendering the sections it contains._

## Files Created/Modified

- `src/components/ui/file-input.tsx` and `.module.css` - client file input with preview, placeholder and object URL revocation
- `src/components/ui/start-date-select.tsx` and `.module.css` - server start-date select with `formatDate` labels and error wiring
- `src/components/ui/star-rating.tsx` and `.module.css` - read-only star display with peak fill states (full, half, empty)
- `src/components/ui/star-rating-input.tsx` and `.module.css` - APG Rating Radio Group, visually hidden native radios, `:has()` star fill
- `src/app/styleguide/sections/file-input-section.tsx`, `start-date-select-section.tsx`, `star-rating-section.tsx` - the three sections
- `src/app/styleguide/page.tsx` - imports and renders the three sections (see deviations)
- `test/app/file-input.spec.ts`, `test/app/star-rating-input.spec.ts`, `test/app/start-date-select.spec.ts` - Playwright specs at 375 and 1280px

## Decisions Made

- **Native select, not `ui/select`.** `start-date-select` was specified to wrap `ui/select.tsx`. That file comes from plan 03-04, which runs in the same wave and is not in this branch. Importing it would break `tsc` and the build in this worktree, so the component uses a native `<select>` styled in its own CSS module. Once 03-04 merges, the orchestrator or the 03-10 executor can switch to `ui/select` if shared styling is wanted. This does not change the formatDate or value contract.
- **No rating state in the star input.** The radios hold the value. The visual fill (the chosen star and the stars before it) is CSS `:has()` over the native checked radio, so the component stores no React state.
- **Plain `img` for the blob preview.** An eslint-disable comment states the reason: `next/image` cannot optimise a local object URL, and the preview is not a served photo.
- **IST day values.** A `Date` option is converted with `toIstDay`, and a `YYYY-MM-DD` string is passed through. The plan said "an ISO string"; the IST day is an ISO 8601 date that matches the seed convention (B19).
- **No invented copy in the empty state.** An empty date list renders a disabled select with no options, rather than a sentence that is not in `docs/design/copy.md`.
- **Range check on the display.** `StarRating` throws `RangeError` for a value outside 0 to `max`, in the same style as `formatDate` and `formatDistance`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `start-date-select` does not wrap `ui/select.tsx`**
- **Found during:** Task 2
- **Issue:** `ui/select.tsx` is created by plan 03-04, which runs in the same wave. Plan 03-05 declares `depends_on: ["03-01"]` only, so the file is absent from this worktree. Importing it would fail `tsc` and the Playwright build.
- **Fix:** a native `<select>` with its own `start-date-select.module.css` in `@layer components`. The label, value and error wiring are the same as the plan describes.
- **Files modified:** `src/components/ui/start-date-select.tsx`, `src/components/ui/start-date-select.module.css`
- **Verification:** `tsc --noEmit`, `eslint`, `stylelint` and the start-date Playwright spec pass.
- **Committed in:** `d09ab1b`

**2. [Rule 3 - Blocking] `styleguide/page.tsx` wiring**
- **Found during:** Task 1
- **Issue:** the plan's `files_modified` does not list `page.tsx`, but the Playwright specs and `knip` both need the sections rendered. An unimported section file fails `npm run knip`, the same issue plan 03-02 hit.
- **Fix:** each task commit imports and renders its own section. Plan 03-10 owns the final page, so expect a textual merge conflict in `page.tsx` against other wave-2 plans. Keep all imports when resolving it.
- **Files modified:** `src/app/styleguide/page.tsx`
- **Verification:** the full app suite (39 specs) and `npm run knip` pass.
- **Committed in:** `fbc50de`, `d09ab1b`, `5d763ba`

**3. [Rule 2 - Missing] Start-date spec**
- **Found during:** Task 2
- **Issue:** the plan names no test for `start-date-select`, yet the B19 formatDate requirement and the error and empty states need one.
- **Fix:** `test/app/start-date-select.spec.ts`, three cases at 375 and 1280px. It is not in `files_modified`.
- **Committed in:** `d09ab1b`

**Total deviations:** 3 auto-fixed (2 Rule 3 blocking, 1 Rule 2 missing).
**Impact on plan:** all three are needed for the code to build and be tested in this branch. No scope creep. The native select is a real divergence from the plan's wording, and the orchestrator should know about it.

## Issues Encountered

- **Shared port 3000.** `playwright.config.ts` uses `reuseExistingServer: true` on port 3000, and several parallel worktrees run `next dev` there at once. Runs failed with `ERR_CONNECTION_REFUSED` when another agent's server stopped, and with "Tour photo" not found when another worktree's server answered. Verification used a temporary, untracked `playwright.port-3101.config.ts` with its own dev server on port 3101. That file was deleted before the summary commit and is not in any commit.
- **`npm ci` in the worktree.** `node_modules` was absent, so `npm ci` ran from the lockfile. No package was added or changed.
- **Estimate versus actual.** The plan's `estimate.tokens` was 65,000. The measured `actuals.tokens` is 5,512 (chars/4 over the 22,047 bytes of the 15 changed files). The estimate was about twelve times the measured diff. The orchestrator may want this in the calibration data.
- **Red run not captured.** The three specs were written before the components, but no separate failing run was recorded before implementation. The first runs after the components existed failed on the port collision above. A real spec error then showed up: `toHaveValues` applies only to multi-selects, so it was replaced with an `evaluateAll` read of the option values. The `toHaveRole` assertion was replaced before any run. After the private port was in use, all 22 specs for this plan passed.

## Notes for later plans

- Copy: the file input's placeholder text "No photo chosen" is not in `docs/design/copy.md`. It should be added to the wording table, or replaced by copy the design owner approves.
- Plan 03-10 imports these three sections into `page.tsx` alongside every other section. The sections are server files, so they must not pass function props to `StarRatingInput`. The section renders no `onChange`, for that reason.
- Phase 6's review form will need `onChange` on `StarRatingInput`. It must be wrapped in a Client Component, because functions cannot cross from a Server Component.
- The file input's unmount revocation is implemented, but no spec covers it. Replacement is covered.

## Known Stubs

None.

## Threat Flags

None. The file input never uploads, and its blob URLs exist only in the browser. The revocation of object URLs (T-03-08) is covered by the replacement spec and by the unmount cleanup, as the plan's threat model requires.

## Requirements

`requirements-completed` is empty and `requirements-partial` lists U4. This plan adds four of the roughly 27 `ui/` components (file input, start-date select, star rating, star input) in a finished state. The full set and its styleguide coverage belong to plan 03-10, so U4 is not ticked off here, following the precedent of plan 03-02.

## Self-Check: PASSED

- [x] Created files exist (see Files Created/Modified; all 14 checked)
- [x] Commits `fbc50de`, `d09ab1b` and `5d763ba` are ancestors of HEAD
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run lint:css`, `npm run check:client`, `npm run check:conventions`, `npm run knip` and `npm run format:check` pass
- [x] `npx playwright test --project=app` on a private port: 39 of 39 pass, including the three new specs (22 specs for this plan)
- [x] No edits to `.planning/STATE.md` or `.planning/ROADMAP.md`
- [x] `grep` for `onKeyDown` and key listeners in `star-rating-input.tsx` returns no match
