---
phase: 04-browse-tours
plan: 09
subsystem: infra
tags: [lighthouse-ci, bundle-budget, leaflet, lazy-loading, survey-of-india, boundary, adr]

# Dependency graph
requires:
  - phase: 04-08
    provides: "The Leaflet route map loaded on scroll through next/dynamic, and the 2% boundary file kept by the user (keep-2)"
  - phase: 01-13
    provides: "The R9 floor of 138,107 bytes for / and the 40,960-byte delta (ADR 0018)"
provides:
  - "docs/bundle-baseline.json as a routes array: / unchanged, and the tour route with its floor source, delta and a 51,200-byte lazy allowance"
  - "measure-bundle.ts checks every route, names the one over budget, and exports lazyChunkBytes for the Leaflet marker"
  - "lighthouserc.cjs collects and asserts every baseline route"
  - "ADR 0034 records the kept boundary's final sizes and the tour page's budget facts"
affects:
  - "Phase 4 merge: npm run bundle:check currently fails on the tour route, so the phase cannot pass CI until the eager-budget decision below is made"
  - "Phase 7 (U24 Lighthouse runs): the tour route is now a Lighthouse URL"

# Actuals (#2632): estimate was 60000 tokens over 2 tasks.
# Measured as chars/4 over the realized diff 04bda8b..HEAD (33,217 characters, 7 files).
actuals:
  tokens: 8304
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Baseline as a routes array: one entry per route, each with its own floor, delta and optional lazy allowance"
    - "Lazy cost measured from the production build: gzipped .js/.css under .next/static that contain a marker string"

key-files:
  created: []
  modified:
    - scripts/measure-bundle.ts
    - test/scripts/measure-bundle.test.ts
    - lighthouserc.cjs
    - docs/bundle-baseline.json
    - docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md
    - docs/adr/0034-route-map-fallback-and-boundary-file.md
    - README.md

key-decisions:
  - "The tour route's eager floor is the Phase 1 framework floor (138,107), not a fresh measurement, so the 40 KB delta is not silently widened"
  - "The lazy allowance is 51,200 bytes and is checked against the marker leaflet-container in the production build output"
  - "public/data/india-soi.geojson is unchanged (keep-2); ADR 0034 records its final sizes, 84,432 raw and 26,955 gzipped at zlib's default level"

patterns-established:
  - "--record takes --route and rewrites only that route's entry; other entries are kept byte-for-byte in value"

requirements-completed: []  # Left empty on purpose: the tour route's eager budget fails (see Issues Encountered), so R8, U11 and R9 cannot be closed by this plan yet.

coverage:
  - id: D1
    description: "The tour route's lazy map allowance: the marked Leaflet chunks are measured from the build and checked against 51,200 bytes"
    requirement: R8
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#[R8] --check passes the tour route when its marked chunks are within the lazy allowance"
        status: pass
      - kind: other
        ref: "node scripts/measure-bundle.ts --check (16 Nov 2026): bundle: ok, 46567 bytes of lazy script and style for /tour/valley-of-flowers-trek against 51200"
        status: pass
    human_judgment: false
  - id: D2
    description: "The tour route's eager script is within the framework floor plus 40,960 bytes, as measured by Lighthouse CI"
    requirement: R9
    verification:
      - kind: other
        ref: "npm run bundle:check (16 Nov 2026): /tour/valley-of-flowers-trek 197870 bytes against 179067 - over budget"
        status: fail
    human_judgment: true
    rationale: "The Leaflet chunk is part of the Lighthouse run on the mobile preset, so the eager measure includes the map. Whether the map counts toward the eager budget, or the map's load timing changes, is a decision for the user."
  - id: D3
    description: "The / budget is unchanged: same floor, same delta, enforced in CI"
    requirement: R9
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#[R9] --check passes at the limit and fails one byte over"
        status: pass
      - kind: other
        ref: "node scripts/measure-bundle.ts --check (16 Nov 2026): bundle: ok, 151077 bytes of script for / against 179067"
        status: pass
    human_judgment: false
  - id: D4
    description: "The kept boundary file is unchanged and its final sizes are recorded in ADR 0034"
    requirement: R8
    verification:
      - kind: other
        ref: "git diff 259d90c -- public/data/india-soi.geojson is empty; ADR 0034 Provenance records 84,432 raw and 26,955 gzipped"
        status: pass
    human_judgment: false

# Measured from the verified base: git rev-list --count plan_head_before..HEAD (#3968).
plan_head_before: 04bda8b666b3a612521b410381bc7e9120e2bc40
plan_head_after: f7374c64ab9fda9538103fd07d8809d57642809e

# Metrics
duration: "not measured (plan start time was not recorded)"
completed: 2026-11-16
status: halted
---

# Phase 4 Plan 09: The tour page's JavaScript budget, eager and lazy, and the kept boundary

**Per-route budgets in one baseline file, with the tour page's lazy Leaflet allowance checked from the build (51,200 bytes, measured 46,567). The tour page's eager budget fails by 18,803 bytes because Lighthouse loaded the map, so the plan halted for a decision.**

## Performance

- **Duration:** not measured (plan start time was not recorded)
- **Tasks:** 1 of 2 complete with its verify passing in part; Task 1's `bundle:check` gate fails on the tour route; Task 2 is a keep-2 provenance update
- **Files modified:** 7

## Accomplishments

- `docs/bundle-baseline.json` is now a `routes` array. The `/` entry is unchanged; the tour entry uses the Phase 1 floor (138,107), a 40,960-byte delta, the lazy allowance (51,200) and the marker `leaflet-container`.
- `scripts/measure-bundle.ts` checks every baseline route, prints a line per route naming it, exits 1 on any over-budget line, and exports `lazyChunkBytes(staticDir, marker)`. `--record --route <path>` rewrites only that route's entry.
- `lighthouserc.cjs` builds its collect URLs and its assertion matrix from the baseline routes.
- ADR 0018 is extended by 0034 and its tour-page bullet now separates the eager budget from the lazy allowance. ADR 0034 has a JavaScript budget paragraph, the tour page's measured figures and the kept boundary's final sizes. The README's bundle lines name both routes.
- Unit tests: 24 pass in `test/scripts/measure-bundle.test.ts`, including the new per-route, `--record --route`, lazy-chunk and lazy-allowance cases.

## Task Commits

1. **Task 1: The tour page's budget, eager and lazy, enforced by `npm run bundle:check`** - `3cb9002` (feat). The gate is not green: `bundle:check` fails on `/tour/valley-of-flowers-trek` (see below).
2. **Task 2: Apply the user's boundary choice and complete ADR 0034's provenance** - `f7374c6` (docs). No geojson change: the user chose keep-2 at plan 04-08, and the file is unchanged.

**Plan metadata:** this summary is committed separately, after the two task commits.

_Note: this plan has no TDD tasks._

## Files Created/Modified

- `scripts/measure-bundle.ts` - per-route record and check, `lazyChunkBytes`, `--route` and `--static-dir` options
- `test/scripts/measure-bundle.test.ts` - 24 tests tagged `[R9]` and `[R8]`
- `lighthouserc.cjs` - collect URLs and assertMatrix built from `docs/bundle-baseline.json`
- `docs/bundle-baseline.json` - `routes` array with `/` and the tour route
- `docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md` - status extended by 0034; tour-page bullet updated
- `docs/adr/0034-route-map-fallback-and-boundary-file.md` - JavaScript budget paragraph; final boundary sizes and IST date
- `README.md` - bundle script rows

## Decisions Made

- The tour route's eager floor is the Phase 1 framework floor, not a fresh measurement, as the plan says. A fresh figure would hide the growth the delta allows.
- The lazy allowance is checked from the production build, so the map's cost does not depend on Lighthouse seeing it.
- Boundary: keep-2. `public/data/india-soi.geojson` is unchanged. Final sizes are 84,432 raw and 26,955 gzipped (Node's `zlib.gzipSync`, default level). The earlier gzipped figures (27,022 and 27,017/26,973) came from other gzip implementations.

## Deviations from Plan

None applied. The plan's premise that the map "loads only on scroll, so Lighthouse never sees it" did not hold, and the fix would change the map's load behaviour or the budget's meaning, so it is a decision for the user (see Issues Encountered).

## Issues Encountered

**1. The tour route's eager budget fails (decision needed).**
`npm run bundle:check` ran `lhci collect`, then `lhci assert`, and failed:

```
resource-summary.script.size failure for maxNumericValue
expected: <=179067
   found: 197870
```

- The Lighthouse report for the tour page lists the Leaflet chunk `1rf5ujud_0tgv.js` (44,569 bytes transferred) among its ten eager scripts. That chunk is the only one containing the marker `leaflet-container`. The `/` page has no such chunk.
- The chunk's request starts about 465 ms into the load, before the page's 3.6 s interactive time and before the last other request finished. Lighthouse does not scroll, so the map's IntersectionObserver fired at load. On the mobile preset (412 x 823), the map slot appears to sit within the 192 px margin of the first screen. I did not measure the slot's pixel position, so this is an inference from the request timing.
- Without the Leaflet chunk, the tour page's eager script would be about 153,301 bytes, under the limit. Its map cost is therefore the only reason it fails.
- Options for the user: (a) exclude the marked map chunk from the eager measure, since it is checked by the lazy allowance, and record that method change in ADR 0034; (b) move the map's observer so it does not fire on a first-screen mobile slot (a change to the loading contract in ADR 0034); (c) raise the tour route's eager allowance (against the plan's intent, not recommended). I have not chosen one.

**2. The `/` floor is stale.** `/` measured 151,077 bytes in this run against the recorded floor of 138,107 (Phase 1). It still passes its limit of 179,067, but the floor no longer describes the page. Re-recording it would move every page's budget, so ADR 0018 needs a dated note if that happens. Not changed here.

**3. Task 2's Playwright verify was not run.** `npx playwright test --project=app test/app/route-map.spec.ts` depends on the `seed` project, which resets the shared MongoDB at 127.0.0.1:27017. The main checkout uses that database. The boundary file is byte-identical to the one 04-08 verified (12 passing tests), so I did not re-run it. This is an unrun verify, recorded as such.

**4. The route-map spec and the Lighthouse config** both target port 3000 by default. I used the build on port 3300 that `lighthouserc.cjs` already sets, and did not touch any server on 3000.

## Verification Results

- `npx vitest run test/scripts/measure-bundle.test.ts`: 24 passed.
- `npx tsc --noEmit`: clean (after `npx next typegen`).
- `npx eslint` on the three changed JS/CJS files with `--max-warnings=0`: clean. `npx prettier --check` on every changed file: clean.
- `npm run build`: exit 0.
- `APP_ENV=ci ... npm run bundle:check`: **failed** on the tour route (197,870 against 179,067). `/` passed.
- `node scripts/measure-bundle.ts --check` against the same reports: `/` ok at 151,077; tour eager over budget; tour lazy ok at 46,567 against 51,200.
- Precondition for Task 1 (read-only): MongoDB on 127.0.0.1:27017 holds the seeded tour `valley-of-flowers-trek` (count 1).
- Lighthouse ran in Google Chrome (`/Applications/Google Chrome.app`), three runs per URL. Numbers come from that measurement, not an estimate.

## Boundary simplification

**Chosen: keep-2.** The user's reply at plan 04-08: `keep-2`. `public/data/india-soi.geojson` has not changed since `259d90c`. ADR 0034 records the sizes (84,432 raw, 26,955 gzipped) and the date (16 Nov 2026 IST).

## User Setup Required

None.

## Next Phase Readiness

- **Blocked:** the orchestrator needs the user's decision on the tour route's eager budget (options above) before the phase's `bundle:check` gate can pass. Until then, the Phase 4 CI bundle step would fail on this branch.
- R8, U11 and R9 stay open. `requirements-completed` is empty for this reason.
- The Task 2 Playwright verify should be run once the decision is made, against a server on a free port.

## Self-Check: PASSED

- Files named in this summary exist on disk (checked with `[ -f ]`): `scripts/measure-bundle.ts`, `test/scripts/measure-bundle.test.ts`, `lighthouserc.cjs`, `docs/bundle-baseline.json`, `docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md`, `docs/adr/0034-route-map-fallback-and-boundary-file.md`, `README.md`.
- Commits `3cb9002` (Task 1) and `f7374c6` (Task 2) are ancestors of HEAD.
- The self-check confirms the commits and files exist. It does not mean the gates pass: `bundle:check` fails, as stated above.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16 (halted at the tour-route budget decision)*
