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
  - "measure-bundle.ts checks every route, names the one over budget, takes each marked map chunk Lighthouse loaded out of the tour route's eager bytes, and exports lazyChunkBytes and eagerScriptBytes"
  - "lighthouserc.cjs collects every baseline route; the tour route's raw eager assertion is off, because measure-bundle --check asserts it"
  - "ADR 0034 records the map chunk's single budget (option a), the measured slot position and the final boundary sizes; ADR 0018 says the same"
affects:
  - "Phase 7 (U24 Lighthouse runs): the tour route is a Lighthouse URL, and its eager figure excludes the marked map chunk"
  - "A later decision on re-recording the / floor (138,107 is stale; see Open items)"

# Actuals (#2632): estimate was 60000 tokens over 2 tasks.
# Measured as chars/4 over the realized diff 04bda8b..HEAD (59,401 characters, the full diff, no paths excluded).
actuals:
  tokens: 14850
  tasks: 2
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Baseline as a routes array: one entry per route, each with its own floor, delta and optional lazy allowance"
    - "Lazy cost measured from the production build: gzipped .js/.css under .next/static that contain a marker string"
    - "A marked chunk counts once: taken out of the eager bytes by its Lighthouse transfer size, and counted at its gzipped size under the lazy allowance"

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
  - "User decision at the checkpoint, verbatim: \"a\". The map chunk identified by the lazy marker is excluded from the tour route's eager-script measure and budgeted only by the lazy allowance (51,200), so every byte is under exactly one limit"
  - "The tour route's eager floor is the Phase 1 framework floor (138,107), not a fresh measurement, so the 40 KB delta is not silently widened"
  - "The lazy allowance is 51,200 bytes and is checked against the marker leaflet-container in the production build output"
  - "public/data/india-soi.geojson is unchanged (keep-2); ADR 0034 records its final sizes, 84,432 raw and 26,955 gzipped at zlib's default level"
  - "The tour route's raw eager assertion in lighthouserc.cjs is off; measure-bundle --check asserts the eager limit after the marked chunks are taken out"
  - "--record applies the same eager measure to a lazy route, so a re-recorded floor matches what --check measures"

patterns-established:
  - "--record takes --route and rewrites only that route's entry; other entries are kept byte-for-byte in value"
  - "Eager bytes for a lazy route = resource-summary script total minus the transfer size of Script requests whose /_next/static file contains the lazy marker"

requirements-completed: [R8, R9]  # U11 is not claimed: its route-map spec verify was not run (see Issues Encountered 3), so it stays open for the orchestrator.

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "The tour route's map is budgeted once: a marked chunk Lighthouse loaded is taken out of the eager bytes and counted under the 51,200-byte lazy allowance"
    requirement: R8
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#[R8] --check counts a lazy chunk that Lighthouse loaded once, under the lazy allowance"
        status: pass
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#[R8] --check fails naming the lazy allowance when the loaded lazy chunk is over it"
        status: pass
      - kind: other
        ref: "npm run bundle:check (16 Nov 2026): bundle: ok, 46567 bytes of lazy script and style marked leaflet-container for /tour/valley-of-flowers-trek against an allowance of 51200"
        status: pass
    human_judgment: false
  - id: D2
    description: "The tour route's eager script, less the marked map chunk, is within the framework floor plus 40,960 bytes"
    requirement: R9
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#[R8] takes the lazy chunk out of the eager bytes when Lighthouse loaded it eagerly"
        status: pass
      - kind: other
        ref: "npm run bundle:check (16 Nov 2026): bundle: ok, 153301 bytes of script for /tour/valley-of-flowers-trek, with the lazy chunk bytes taken out against a limit of 179067 (raw 197870 less the 44569-byte chunk)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The / budget is unchanged: same floor, same delta, enforced in CI"
    requirement: R9
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#[R9] --check leaves a route without a lazy marker unchanged when it loads a marked chunk"
        status: pass
      - kind: other
        ref: "npm run bundle:check (16 Nov 2026): bundle: ok, 151077 bytes of script for / against a limit of 179067"
        status: pass
    human_judgment: false
  - id: D4
    description: "The kept boundary file is unchanged and its final sizes are recorded in ADR 0034"
    requirement: U11
    verification: []
    human_judgment: true
    rationale: "The route-map Playwright spec was not run in this continuation: its app project depends on the seed project, which resets the shared MongoDB, and its web server is pinned to port 3000. The boundary file is byte-identical to the one 04-08 verified (12 passing tests). The orchestrator or user decides whether that is enough."

# Measured from the verified base: git rev-list --count plan_head_before..HEAD (#3968).
plan_head_before: 04bda8b666b3a612521b410381bc7e9120e2bc40
plan_head_after: 92b790ed4fc01fbe4ea361e89717a1cc9d4468f6

# Metrics
duration: "not measured (plan start time was not recorded)"
completed: 2026-11-16
status: complete
---

# Phase 4 Plan 09: The tour page's JavaScript budget, eager and lazy, and the kept boundary

**The tour map's chunk is now budgeted once, under its 51,200-byte lazy allowance, which puts the tour route's eager script at 153,301 bytes against 179,067; `npm run bundle:check` passes on both routes.**

## Performance

- **Duration:** not measured (plan start time was not recorded)
- **Tasks:** 2 of 2 complete (Task 1 finished in this continuation after the user's decision; Task 2 is the keep-2 provenance, done earlier)
- **Files modified:** 7

## Accomplishments

- The user's decision, option (a), is recorded verbatim in the key decisions. The marked map chunk is taken out of the tour route's eager bytes and budgeted only under the 51,200-byte lazy allowance.
- `scripts/measure-bundle.ts` exports `eagerScriptBytes`. For a route with a lazy marker, it subtracts the transfer size of each Script request whose `/_next/static` file contains the marker. A route without a marker is measured exactly as before.
- `lighthouserc.cjs` turns the raw eager assertion off for routes with a lazy allowance, so the map is not counted in both places. `measure-bundle.ts --check` asserts the eager limit, and `bundle:check` runs it after `lhci assert`.
- `--record` applies the same eager measure to a lazy route, so a re-recorded floor matches what `--check` measures. The tour floor was not re-recorded.
- Unit and CLI tests: 33 pass in `test/scripts/measure-bundle.test.ts`. The new cases cover (i) a lazy chunk among the eager requests, counted once; (ii) a lazy chunk over its allowance still failing; (iii) a route without a marker unchanged; plus the record path and the fail-closed cases.
- ADR 0034 has a dated note (16 Nov 2026, IST) with the method, the measured numbers and the slot position. ADR 0018's bullet on the map is corrected to match.

## Task Commits

1. **Task 1 (the tour page's budget): RED tests** - `b1f3379` (test). These cases were run against HEAD and failed as expected: 8 of 33, all in the new behaviour.
2. **Task 1: GREEN fix** - `b3e2d4a` (fix). The eager subtraction, `eagerScriptBytes`, the record change and the LHCI assertion change. The `/` case still passes unchanged.
3. **Task 2 (boundary provenance, carried from the halted run)** - `f7374c6` (docs), with the earlier halted-summary commit `55c7267` (docs).
4. **ADR 0034 and ADR 0018 note** - `92b790e` (docs).

**Plan metadata:** this summary is committed separately, after the task commits.

_Note: this plan has no TDD tasks. The RED and GREEN commits above follow the test-first sequence the checkpoint resume asked for._

## Files Created/Modified

- `scripts/measure-bundle.ts` - `eagerScriptBytes` (eager bytes for a lazy route), the Script-request reader, the record and check changes
- `test/scripts/measure-bundle.test.ts` - 33 tests tagged `[R8]`, `[R9]`
- `lighthouserc.cjs` - the tour route's raw eager assertion is off; the `/` assertion is unchanged
- `docs/bundle-baseline.json` - unchanged in this continuation (the `routes` array from `3cb9002`)
- `docs/adr/0034-route-map-fallback-and-boundary-file.md` - the option (a) note, the measured numbers and the slot position
- `docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md` - the map bullet now says the map is budgeted once
- `README.md` - unchanged in this continuation (the bundle rows from `3cb9002`)

## Decisions Made

- **Option (a), user decision, verbatim: "a".** The map chunk is excluded from the tour route's eager measure and budgeted only by the lazy allowance. Every byte is under exactly one limit.
- **Method:** the subtracted bytes are the Lighthouse transfer size of each marked Script request, taken from the report's `network-requests` audit. For the tour route that is 44,569 bytes. The raw total was 197,870, so the eager figure is 153,301. The chunk is then counted at its gzipped size (46,567 across the marked JS and CSS) under the lazy allowance.
- **Floor and delta unchanged.** The tour route keeps the Phase 1 floor (138,107) and the 40,960-byte delta.
- **Map slot position, measured.** Playwright with the installed Google Chrome, against this build's `next start`, at 412 x 823 CSS px, device pixel ratio 1.75, with no scroll and a five-second settle: the slot's top is 881 px from the top of the document, 58 px below the first screen. The observer fires once the slot's top is above 823 + 192 = 1,015 px, so the slot is 134 px inside the margin. The Leaflet chunk was requested about 100 ms after navigation and the map was mounted with `scrollY` at 0. This was a local browser measurement, not a Lighthouse run. The measuring script was kept in the session scratchpad and was not committed.
- **Why loading at once is correct:** the 192 px `rootMargin` exists so the map loads just before its slot scrolls into view. A slot 58 px under the fold is about to be seen, so loading it now is the designed behaviour. The map's bytes are budgeted under the lazy allowance whenever it loads, so the budget does not depend on the load timing.

## Gates

| Gate | Result |
| --- | --- |
| `npx vitest run test/scripts/measure-bundle.test.ts` | 33 passed |
| `npx tsc --noEmit` (after `npx next typegen`) | clean |
| `npx eslint --max-warnings=0` on the three changed JS/CJS files | clean |
| `npx prettier --check` on the changed files and the two ADRs | clean |
| `npm run build` | exit 0 |
| `npm run bundle:check` (real Lighthouse, `lhci collect` on port 3300, three runs per URL, median) | exit 0: `/` 151,077 of 179,067 (ok); tour eager 153,301 of 179,067 (ok); tour lazy 46,567 of 51,200 (ok) |

## Issues Encountered

**1. The tour route's eager budget (resolved by option a).** The raw eager total of 197,870 bytes included the 44,569-byte Leaflet chunk that Lighthouse loaded at about 465 ms, with no scroll. Option (a) takes the chunk out, as recorded above. The map slot's position is measured, so this is no longer an inference.

**2. The `/` floor is stale (open item, not changed here).** `/` measures 151,077 bytes in this run against the recorded floor of 138,107. It still passes its limit of 179,067. Re-recording the floor moves every page's budget, so it needs a dated note in ADR 0018 and a decision from the user. It was not re-recorded.

**3. The route-map Playwright spec was not run.** `npx playwright test --project=app test/app/route-map.spec.ts` is the Task 2 verify. Its `app` project depends on the `seed` project, which runs `seed --reset` against the shared `MONGODB_URI` (127.0.0.1:27017/natours). Its web server is also pinned to port 3000, which I must not use. Both rule it out, so I did not run it. The boundary file is byte-identical to the one 04-08 verified (12 passing tests). This is an unrun verify, and it is why U11 is not in `requirements-completed`.

**4. The `bundle:check` run used port 3300.** `lighthouserc.cjs` hard-codes it for `lhci collect`. Nothing else was on 3300 during the run. My own measurement server ran on 3121 and I stopped it afterwards. Port 3000 was not touched and the shared MongoDB was not seeded or reset (the tour page only reads from it).

## Deviations from Plan

**1. [Rule 2 - Missing consistency] `--record` applies the eager measure to a lazy route.** The plan does not mention `--record` for lazy routes. Without this change, a re-recorded tour floor would include the chunk and disagree with `--check`. A test covers it.

Otherwise, the plan executed as the resume instructed, and the lighthouserc change is the one the resume allowed: the raw eager assertion would double-count the chunk.

**Total deviations:** 1 auto-fixed (consistency). **Impact:** none on the gates. The tour floor was not re-recorded.

## Next Phase Readiness

- Phase 4's `bundle:check` gate passes on both routes. The tour route's eager and lazy budgets are enforced.
- **Open for the orchestrator:** the route-map spec verify (Issues Encountered 3); U11 stays open until it runs against a server on a free port with a seed that does not touch the shared database.
- **Open for the user:** the `/` floor re-record (Issues Encountered 2).

## Self-Check

- Files named in this summary exist on disk: `scripts/measure-bundle.ts`, `test/scripts/measure-bundle.test.ts`, `lighthouserc.cjs`, `docs/bundle-baseline.json`, `docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md`, `docs/adr/0034-route-map-fallback-and-boundary-file.md`, `README.md`.
- Commits `3cb9002`, `f7374c6`, `55c7267`, `b1f3379`, `b3e2d4a` and `92b790e` are ancestors of HEAD.
- The self-check confirms the files and commits. It does not mean every gate passes: the route-map spec is unrun, as stated above.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
