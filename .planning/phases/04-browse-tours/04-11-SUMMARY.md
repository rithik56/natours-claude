---
phase: 04-browse-tours
plan: 11
subsystem: api
tags: [route-handlers, mongodb-aggregation, geospatial, geoNear, ist, zod, openapi, tdd]

requires:
  - phase: 04-browse-tours (plan 04-04)
    provides: the cached catalogue read by list(), applyCatalogueQuery, the TourSummary DTO and the startLocation 2dsphere index
provides:
  - GET /api/v1/tours/top-5-cheap, the five cheapest tours through the shared list query (B2)
  - GET /api/v1/tours/stats, one public row per difficulty computed from the cached catalogue (F1)
  - GET /api/v1/tours/monthly-plan/[year], starts grouped by IST month for guides, lead guides and admins (F2)
  - GET /api/v1/tours/within/[distance]/center/[latlng]/unit/[unit], tours whose start lies in a radius, as documents (B3)
  - GET /api/v1/tours/distances/[latlng]/unit/[unit], every tour's distance from a point, nearest first (B3)
  - statsFrom, getStats, getMonthlyPlan, toursWithin and distancesFrom in the tours module, with OpenAPI paths and contracts
affects: [phase 04 read API consumers, phase 06 role-gated staff tooling]

actuals:
  tokens: 17236    # chars/4 over the realized diff (68,946 characters, 04bda8b..HEAD)
  tasks: 3
  commits: 7       # MEASURED: git rev-list --count 04bda8b..HEAD

commits: 7
plan_head_before: 04bda8b666b3a612521b410381bc7e9120e2bc40
plan_head_after: 807157d2566e7b2c9da8b85609d66ab952cfd471

tech-stack:
  added: []
  patterns:
    - "Routes declare access, a strict params schema and a strict empty query; the handler is a thin wrapper over a service call"
    - "Read-only aggregations are uncached when their input comes from the URL; catalogue-derived stats are computed in memory"
    - "Geo params are range-checked in Zod before MongoDB is queried; $geoWithin takes radians, $geoNear takes metres times a unit multiplier"
    - "Half-up rounding through a 12-significant-digit trim, so float averages such as 4.6499999999999995 round as 4.65 does"

key-files:
  created:
    - src/app/api/v1/tours/top-5-cheap/route.ts
    - src/app/api/v1/tours/stats/route.ts
    - src/app/api/v1/tours/monthly-plan/[year]/route.ts
    - src/app/api/v1/tours/within/[distance]/center/[latlng]/unit/[unit]/route.ts
    - src/app/api/v1/tours/distances/[latlng]/unit/[unit]/route.ts
    - test/app/api/tours-top5.test.ts
    - test/app/api/tours-stats.test.ts
    - test/app/api/tours-monthly-plan.test.ts
    - test/app/api/tours-geo.test.ts
  modified:
    - src/server/modules/tours/catalogue-query.ts
    - src/server/modules/tours/schemas.ts
    - src/server/modules/tours/service.ts
    - test/server/modules/tours/catalogue-query.test.ts
    - test/server/modules/tours/service.test.ts
    - docs/openapi/openapi.yaml
    - docs/contracts.md
    - .planning/phases/04-browse-tours/deferred-items.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Stats are computed in memory from the cached catalogue (statsFrom), so they agree with the list and need no ['stats'] cache key; ADR 0031's planned key is not used"
  - "The monthly plan and both geo reads are uncached, because their input comes from the URL (T-04-17)"
  - "Monthly plan months are cut in Asia/Kolkata via $month, so a 1 January 00:00 IST departure is in January (QA-10)"
  - "Geo responses are not paginated; the distance cap is 20000 in either unit, so a nonsense radius is a 400"
  - "Monthly plan access is an exact role match, { roles: ['guide', 'lead-guide', 'admin'] }; an anonymous caller gets 401 and a user 403"

patterns-established:
  - "Each new route owns its own strict query and params schemas; no caller value reaches the sort or limit of top-5-cheap (T-04-31)"
  - "Service functions that catch a database outage map it to SERVICE_UNAVAILABLE with the driver error as cause, and rethrow every other error unchanged"

requirements-completed: [F1, F2, B2, B3, S7]

coverage:
  - id: D1
    description: "GET /api/v1/tours/top-5-cheap returns the five cheapest tours in ascending price, ties by rating then name, through the same list() as the list endpoint; any parameter is a 400"
    requirement: "B2"
    verification:
      - kind: integration
        ref: "test/app/api/tours-top5.test.ts#[B2] returns the five cheapest seed tours in ascending price order"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-top5.test.ts#[B2] equal prices are ordered by rating descending, then name"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-top5.test.ts#[B2] ?limit=50 is a 400 VALIDATION_ERROR"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/v1/tours/stats is public and returns one row per difficulty, easy, medium, difficult, with counts, rounded averages and price bounds, computed from the cached catalogue"
    requirement: "F1"
    verification:
      - kind: unit
        ref: "test/server/modules/tours/catalogue-query.test.ts#statsFrom: one row per difficulty (F1)"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-stats.test.ts#[F1] is public: an anonymous caller gets one row per difficulty, in order"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-stats.test.ts#[F1] two parallel calls on the same data return identical bodies"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET /api/v1/tours/monthly-plan/[year] is limited to guides, lead guides and admins, groups every start of the year by IST month, and counts a 1 January departure in January"
    requirement: "F2"
    verification:
      - kind: integration
        ref: "test/app/api/tours-monthly-plan.test.ts#[F2] an anonymous caller gets 401 UNAUTHENTICATED"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-monthly-plan.test.ts#[F2] a user gets 403 FORBIDDEN"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-monthly-plan.test.ts#[F2] a tour with a 1 January 2027 departure is listed under month 1 of 2027, and not under December of 2026"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/service.test.ts#[F2] getMonthlyPlan groups the seed 2027 starts by IST month, in month order"
        status: pass
    human_judgment: false
  - id: D4
    description: "GET .../within/[distance]/center/[latlng]/unit/[unit] returns the tours whose start lies inside the radius as documents; coordinates and radius are range-checked and refused before MongoDB is queried"
    requirement: "B3"
    verification:
      - kind: integration
        ref: "test/app/api/tours-geo.test.ts#[B3] returns the seed tours whose start lies within 300 km of Delhi, as summaries"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-geo.test.ts#[B3] latitude 90 and -90 and longitude 180 and -180 are accepted, as are a 20000 km radius"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-geo.test.ts#[B3] 90.0001, 180.0001, 95,77 and 28,200 are each a 400 and MongoDB is not queried"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-geo.test.ts#[B3] a radius that contains no start location answers 200 with tours []"
        status: pass
    human_judgment: false
  - id: D5
    description: "GET .../distances/[latlng]/unit/[unit] lists every tour with its distance from the point, nearest first, rounded to 2 decimals in the requested unit"
    requirement: "B3"
    verification:
      - kind: integration
        ref: "test/app/api/tours-geo.test.ts#[B3] lists all 13 tours with their distance from Delhi, nearest first, Golden Triangle Heritage at about 4.7 km"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-geo.test.ts#[B3] each entry is exactly { id, name, slug, distance }, rounded to 2 decimals"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/service.test.ts#[B3] the startLocation 2dsphere index exists, which $geoNear needs (QA-18)"
        status: pass
    human_judgment: false
  - id: D6
    description: "OpenAPI paths and schemas for the five routes, and the contracts section 11 entries for their service functions and rules"
    requirement: "B2"
    verification: []
    human_judgment: true
    rationale: "No test reads the documentation against the routes. A reader checks the OpenAPI paths and the contracts text against the implementation."
---

# Phase 04 Plan 11: Top-5, stats, IST monthly plan and geo reads Summary

**Top-5 alias, one-row-per-difficulty stats, a staff-only monthly plan grouped by IST month, and range-checked geo reads that return documents, all through the shared tours catalogue and the standard error body**

## Performance

- **Duration:** about 12 min (worktree created 15:23:52Z, SUMMARY written about 15:37Z; approximate)
- **Started:** 2026-11-16T15:23:52Z
- **Completed:** 2026-11-16T15:37Z (approximate)
- **Tasks:** 3 completed (Task 1 tracer, Tasks 2 and 3 TDD)
- **Files modified:** 18 across code, tests, docs and planning (16 in the realized code and test diff, plus deferred-items.md and REQUIREMENTS.md)

## Accomplishments

- `GET /api/v1/tours/top-5-cheap` calls the same `list()` as the list endpoint, with a query the route builds itself. Equal prices fall back to rating then name, and any query parameter is a 400 (B2).
- `GET /api/v1/tours/stats` is public. It returns one row per difficulty in the order easy, medium, difficult, with `numTours`, `numRatings`, `avgRating` (one decimal, half up), `avgPrice` (whole rupees) and the price bounds. It is computed in memory from the cached catalogue, so it agrees with the list (F1).
- `GET /api/v1/tours/monthly-plan/[year]` is limited to guide, lead-guide and admin by an exact role match. It answers 401 to an anonymous caller and 403 to a user. Starts are grouped by month in `Asia/Kolkata`, so a 1 January departure counts in January (F2, QA-10, T-04-30).
- `GET .../within/...` returns `$geoWithin` documents with `$centerSphere`. `GET .../distances/...` returns `$geoNear` documents, nearest first, rounded to 2 decimals. Latitude and longitude ends are accepted, and anything out of range is a 400 before any query (B3, T-04-29).
- Every new route declares its access and a strict params and query schema, and fails in the standard `ErrorEnvelope` (S7, QA-17).

## Task Commits

Each task was committed atomically. Task 2 and Task 3 follow the TDD cycle, with a failing-test commit before each implementation commit.

1. **Task 1: top-5-cheap alias** - `99a553b` (feat, tracer)
2. **Task 2 RED: stats and monthly plan tests** - `213f616` (test)
3. **Task 2 GREEN: stats and the IST monthly plan** - `e9c94d6` (feat)
4. **Task 3 RED: geo endpoint tests** - `2720d99` (test)
5. **Task 3 coverage: outage and pass-through paths** - `397c254` (test)
6. **Task 3 GREEN: within and distances** - `6966355` (feat)
7. **Task 3 docs: OpenAPI and contracts** - `807157d` (docs)

**Plan metadata:** committed in this worktree as the final `docs(04-11)` commit, together with this SUMMARY, REQUIREMENTS.md and deferred-items.md. STATE.md and ROADMAP.md are not touched; the orchestrator owns them.

## Files Created/Modified

- `src/app/api/v1/tours/top-5-cheap/route.ts` - the alias over `list()` with a fixed query and an empty strict input
- `src/app/api/v1/tours/stats/route.ts` - public stats route
- `src/app/api/v1/tours/monthly-plan/[year]/route.ts` - staff-only monthly plan route
- `src/app/api/v1/tours/within/[distance]/center/[latlng]/unit/[unit]/route.ts` - tours inside a radius
- `src/app/api/v1/tours/distances/[latlng]/unit/[unit]/route.ts` - distances from a point
- `src/server/modules/tours/catalogue-query.ts` - pure `statsFrom` with half-up rounding
- `src/server/modules/tours/schemas.ts` - `monthlyPlanParamsSchema`, `withinParamsSchema`, `distancesParamsSchema`, plus the latlng and distance rules
- `src/server/modules/tours/service.ts` - `getStats`, `getMonthlyPlan`, `toursWithin`, `distancesFrom`
- `test/app/api/tours-top5.test.ts`, `tours-stats.test.ts`, `tours-monthly-plan.test.ts`, `tours-geo.test.ts` - route behaviour tests
- `test/server/modules/tours/catalogue-query.test.ts`, `service.test.ts` - pure and service behaviour tests
- `docs/openapi/openapi.yaml` - five new paths and their schemas
- `docs/contracts.md` - section 11 subsection for the new functions, role gate, IST grouping and coordinate rules
- `.planning/phases/04-browse-tours/deferred-items.md` - the pre-existing `CreditPhoto` knip finding, logged as open
- `.planning/REQUIREMENTS.md` - F1, F2, B2, B3 and S7 marked complete (all five were ready; none blocked)

## Decisions Made

- **Half-up rounding through a 12-significant-digit trim.** The seed's averages land on exact `.65` values (for example easy 4.65). A plain `Math.round(x * 10) / 10` can read a float such as 4.6499999999999995 as 4.6. The helper scales, trims to 12 significant digits, then rounds, so easy and difficult both give 4.7.
- **Monthly plan names are distinct and sorted (`$addToSet`).** The plan's wording says "pushed names". A tour with two starts in one month would otherwise appear twice. `numTourStarts` still counts every start, so the two figures measure different things.
- **`toursWithin` sorts by name then id.** The plan does not specify an order for within. A stable order keeps the parallel-call identity check meaningful.
- **Distance and coordinate syntax.** A coordinate is a whole number or a decimal with an optional minus sign, with no exponent or spaces. A distance is a whole number or decimal (no sign) above 0 and at most 20000. These mirror the rules `filterNumber` already uses on the list query.
- **No ADR.** None of these choices changes `plan.md`. Each is recorded here and in contracts section 11.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-hooks lint error in the new geo test file**
- **Found during:** Task 3 (ESLint, `--max-warnings=0`)
- **Issue:** `useTestDatabase()` was called at module top level in `test/app/api/tours-geo.test.ts`, which the React-hooks rule rejects. Calling it in two `describe` blocks would also break the once-per-file rule in `test/helpers/db.ts`.
- **Fix:** One outer `describe('the geo read API (B3)')` owns the single `useTestDatabase()` call and the restore hook; both route suites sit inside it.
- **Files modified:** test/app/api/tours-geo.test.ts
- **Verification:** ESLint exits 0; the geo suite passes.
- **Committed in:** `397c254`

**2. [Rule 3 - Blocking] Security lint warnings on the geo regexes**
- **Found during:** Task 3 (ESLint, `security/detect-unsafe-regex`)
- **Issue:** `LATLNG_PAIR` and `DISTANCE_DIGITS` used a quantifier nested inside a quantified group. The repo's lint gate is `--max-warnings=0`.
- **Fix:** Replaced them with single-level patterns: a signed whole number or signed decimal for each coordinate, and the file's existing `WHOLE_NUMBER` and `FRACTION` for the distance. The set of accepted inputs is unchanged.
- **Files modified:** src/server/modules/tours/schemas.ts
- **Verification:** ESLint exits 0; the geo route tests still pass with the same boundary and invalid cases.
- **Committed in:** `6966355`

**3. [Rule 3 - Blocking] knip unused exports from this plan**
- **Found during:** Task 3 (`npx knip --no-progress`)
- **Issue:** `latlngSchema` and `unitSchema` were exported but used only inside `schemas.ts`, so knip flagged them and the CI checks job would fail.
- **Fix:** Made both module-private.
- **Files modified:** src/server/modules/tours/schemas.ts
- **Verification:** knip now reports only the pre-existing `CreditPhoto` finding.
- **Committed in:** `6966355`

**4. [Rule 2 - Missing Critical] Tests for the new error branches, to meet the coverage gate**
- **Found during:** Task 3 (the plan's acceptance criterion: `service.ts` at or above 85% lines)
- **Issue:** Coverage for `service.ts` was 81.57% lines. The gaps in new code were the `distancesFrom` outage branch and the pass-through of non-outage errors in `toursWithin` and `getMonthlyPlan`.
- **Fix:** Added a `distancesFrom` `SERVICE_UNAVAILABLE` test and a test that a non-outage error from either read reaches the caller unchanged, so a bug is not hidden as 503.
- **Files modified:** test/server/modules/tours/service.test.ts, test/app/api/tours-geo.test.ts
- **Verification:** `service.ts` is at 86.84% lines. The remaining uncovered lines (`listSlugs`, and the catch blocks in `loadCredits` and `loadDetail`) predate this plan.
- **Committed in:** `397c254`

**Total deviations:** 4 auto-fixed (3 Rule 3 blocking the lint and CI gates, 1 Rule 2 missing tests). **Impact:** No change to behaviour or scope. The four fixes were needed for the lint, knip and coverage gates the plan requires.

## Issues Encountered

- **The sandbox refused compound git commands** that contained `$(...)` or `&&` chains, so the worktree HEAD assertion, the ledger reads and the stats were run as separate plain commands. The assertions are the same.
- **Bracketed route paths need a literal pathspec.** `git add` treats `[year]`, `[latlng]` and `[unit]` as glob characters. Those paths were staged with `:(literal)`.
- **RED evidence is a load failure for the route tests.** The two new route tests failed at module resolution (the route file did not exist yet). The service and pure tests failed on the missing behaviour (`... is not a function`). `workflow.tdd_mode` is `false` in `.planning/config.json`, so the `check tdd-red-evidence` classifier was not run. The RED outcomes were checked by reading the output.
- **Pre-existing knip failure.** `CreditPhoto` (`src/server/modules/tours/dto.ts`, line 84) is exported and unused. It was on the base commit and outside this plan, so it is logged in `deferred-items.md` as open.
- **Commit format.** The commits follow the project `CLAUDE.md` form, `type(scope): ... [IDs] (04-11)`, not the executor's default `type(04-11):` form.

## User Setup Required

None - no external service configuration required. The routes read MongoDB only, and the tests use the in-memory server.

## Verification

- `npx vitest run test/app/api test/server/modules/tours`: 13 files, 192 tests pass (after the coverage tests).
- `npx vitest run` (full suite): 91 files, 1073 tests pass.
- `npx tsc --noEmit`: exit 0.
- `npm run lint` (`eslint . --max-warnings=0`): exit 0.
- `npm run format:check`: exit 0.
- `npx knip --no-progress`: only the pre-existing `CreditPhoto` finding.
- Coverage for `src/server/modules/tours/service.ts`: 86.84% lines, above the 85% the plan requires.

## Next Phase Readiness

- The five routes are in place and documented. Phase 04 criterion 5 (read half) is covered by tests.
- Open item: the pre-existing `CreditPhoto` knip export, logged in `deferred-items.md`. It is outside this plan's files.

## Self-Check: PASSED

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
