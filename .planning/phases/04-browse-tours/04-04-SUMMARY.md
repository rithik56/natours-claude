---
phase: 04-browse-tours
plan: 04
subsystem: api
tags: [tours, catalogue, cache, unstable_cache, filters, sort, paging, zod, openapi, next-16]

# Dependency graph
requires:
  - phase: 04-02
    provides: Tour model, toTourSummary DTO and the storage adapter the list reads
  - phase: 04-03
    provides: the seeded catalogue (13 tours) and the Playwright seed project the browse spec runs against
provides:
  - One cached public catalogue: key ['catalogue'], tag 'tours', revalidate 3600 (ADR 0031)
  - tours service list(query) and monthOptions(), both reading that one cache entry
  - Pure catalogue query: applyCatalogueQuery, nextBookableDate, monthOptionsFrom, projectFields
  - Strict API query for GET /api/v1/tours: allowlisted filters, month, sort, fields, page and limit
  - Lenient page query schema buildPageQuerySchema(monthValues) for the filter form
  - `/` lists the first twelve tours in rating order through list(), not /api
  - TourRow shows "No upcoming dates" when a tour has no bookable departure (C8)
  - ADR 0031, the query and cache contract in docs/contracts.md section 11, and the first OpenAPI fragment
affects:
  - 04-05 (filter form on `/`: it needs a converter from parsed page params to CatalogueQuery, which this plan does not write)
  - later phase 4 plans (tour detail, guides and reviews cache keys, each keyed by an id that exists)

# Actuals (#2632): the estimate was 100000 tokens over 3 tasks.
# Same chars/4 scale as the estimate, measured over the changed files at HEAD.
actuals:
  tokens: 39658
  tasks: 3
  commits: 4
# Measured from the verified base: git rev-list --count plan_head_before..HEAD (#3968).
plan_head_before: f96efc86f2712b4fcb9e6544390f2151803cd94e
plan_head_after: 84d26fe

# Tech tracking
tech-stack:
  added: []
  patterns:
    - One cached read, filtered, sorted and paged in memory; no cache key holds a URL value (QA-12)
    - Strict API query built from two constant allowlists (fields and operators), so the bracketed keys are built, not typed (S7)
    - Lenient page query through parseQuery: a bad value falls back to its default, an unknown key is dropped (plan.md 4.3)
    - Pure query module (no database, no clock) that takes today as an argument, so the filters are deterministic
    - `/` and GET /api/v1/tours call the same list() (B13, R3)

key-files:
  created:
    - src/server/modules/tours/service.ts
    - src/server/modules/tours/catalogue-query.ts
    - src/server/modules/tours/schemas.ts
    - src/app/api/v1/tours/route.ts
    - docs/adr/0031-one-cached-catalogue-queried-in-memory.md
    - docs/openapi/openapi.yaml
    - test/server/modules/tours/service.test.ts
    - test/server/modules/tours/service-db-down.test.ts
    - test/server/modules/tours/catalogue-query.test.ts
    - test/server/modules/tours/schemas.test.ts
    - test/app/api/tours-list.test.ts
    - test/app/browse-list.spec.ts
    - test/components/ui/tour-row.test.ts
  modified:
    - src/app/page.tsx
    - src/components/ui/tour-row.tsx
    - src/server/adapters/cache.ts
    - src/server/adapters/real-cache.ts
    - src/server/api/responses.ts
    - src/server/modules/tours/dto.ts
    - test/server/adapters/cache.test.ts
    - test/server/api/responses.test.ts
    - test/server/modules/tours/dto.test.ts
    - docs/contracts.md
    - docs/adr/README.md
    - docs/adr/0012-tagged-data-cache-and-dynamic-rendering.md

key-decisions:
  - "One cache entry for the whole catalogue, key ['catalogue'], tag 'tours', revalidate 3600: 13 summaries are far below the cache size limit, and one entry keeps every URL combination out of the cache keys (ADR 0031)"
  - "The month filter means a bookable departure after today's IST day in that IST month, on both / and the API (D-04)"
  - "The list response nests items under data[key], as plan.md 4.1 shows, so no deviation ADR is needed"
  - "/ sorts by -ratingsAverage with name then id as ties (D-03); the API's absent-sort default is -createdAt (B1)"
  - "The API fields projection happens in the route through projectFields, not as a CatalogueQuery field, so the query stays about what the list contains"
  - "applyCatalogueQuery takes today as an argument, so bookability never depends on the clock inside the pure module"

patterns-established:
  - "Cache keys come only from ids that exist; a slug is looked up in the catalogue first"
  - "Every query value is validated before it reaches the in-memory query; no request value reaches MongoDB (S7)"
  - "A RED commit for the new behaviour, then a GREEN commit (TDD for the Task 2 filters)"

requirements-completed: [B1, B11, B12, S7, R3, U10]

# Metrics
duration: 16min
started: 2026-11-16T12:15:00Z
completed: 2026-11-16
status: complete

coverage:
  - id: D1
    description: "`/` lists the seeded tours in rating order, with their photos, through list() (no /api call)"
    requirement: R3
    verification:
      - kind: e2e
        ref: "test/app/browse-list.spec.ts#[B1] / shows the heading, twelve tour rows, and a first photo that loads through /_next/image"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/service.test.ts#[B11] page 1 holds the twelve tours in rating then name order (D-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/v1/tours answers { status, data: { tours }, meta: { page, limit, total } } with the same items as list()"
    requirement: B1
    verification:
      - kind: integration
        ref: "test/app/api/tours-list.test.ts#[B13] the route returns the same items as list() for the same query"
        status: pass
    human_judgment: false
  - id: D3
    description: "API filters (price, duration, ratingsAverage, maxGroupSize with equality and [gte] [gt] [lte] [lt]) and difficulty are allowlisted; operator keys, unknown keys, __proto__ and bad values are 400 VALIDATION_ERROR"
    requirement: S7
    verification:
      - kind: integration
        ref: "test/app/api/tours-list.test.ts#[S7] operator keys, unknown keys, a bad difficulty and __proto__ are each a 400 VALIDATION_ERROR"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/schemas.test.ts#[S7] operator injection, unknown keys and a non-enum difficulty are refused"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every allowed sort pages to the 13 tours exactly once, with equal values ordered by name then id; the default sort falls back safely"
    requirement: B1
    verification:
      - kind: unit
        ref: "test/server/modules/tours/catalogue-query.test.ts#[B1] sort price: pages 1 and 2 at 12 hold each of the 13 tours exactly once"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-list.test.ts#[B1] an empty sort, a sort with the wrong case, a repeated field and six tokens are each a 400"
        status: pass
    human_judgment: false
  - id: D5
    description: "Paging: limit 1 to 100 is accepted, bad page and limit values are refused on the API and fall back on /, a page past the end clamps on / and is empty with the real total on the API"
    requirement: B11
    verification:
      - kind: unit
        ref: "test/server/modules/tours/schemas.test.ts#[B11] page 0, limit 0, limit 101, and page values that are not base-10 digits are refused"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-list.test.ts#[B11] a page past the end answers an empty tours array with the real total"
        status: pass
    human_judgment: false
  - id: D6
    description: "Length bands 3-4, 5-6, 7-8 and price bands 20000, 30000, 40000 are inclusive; a 1 January departure filters under January; month options are the bookable months from today"
    requirement: U10
    verification:
      - kind: unit
        ref: "test/server/modules/tours/catalogue-query.test.ts#[U10] month 2027-01 includes a 1 January departure, and month 2026-12 does not"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-list.test.ts#[U10] month=2027-01 includes a tour with a 1 January departure, and month=2026-12 does not"
        status: pass
    human_judgment: false
  - id: D7
    description: "The whole catalogue is one cache entry: key ['catalogue'], tag 'tours', revalidate 3600, with no URL value in any key"
    requirement: R3
    verification: []
    human_judgment: true
    rationale: "The real cache wrapper (real-cache.ts) is excluded from coverage and only runs in a Next request. The key, tag and revalidate are checked by reading src/server/modules/tours/service.ts and ADR 0031, not by a test."
  - id: D8
    description: "A tour with no upcoming departure shows 'No upcoming dates' in its date cell and keeps its price and link (C8)"
    requirement: U10
    verification:
      - kind: unit
        ref: "test/components/ui/tour-row.test.ts#[U10] shows \"No upcoming dates\" in the date cell when there is no start date (C8)"
        status: pass
    human_judgment: false
  - id: D9
    description: "ADR 0031, the query and cache contract in docs/contracts.md section 11, and the OpenAPI fragment record the cache design, the write-to-tag table and the query shape"
    requirement: B12
    verification:
      - kind: other
        ref: "npm run format:check (Prettier over the docs), and js-yaml parses docs/openapi/openapi.yaml as openapi 3.1.0 with the /tours path"
        status: pass
    human_judgment: true
    rationale: "The wording of an ADR and the contract is for a reader to check, and no test reads it."
---

# Phase 4 Plan 04: Browse tours catalogue Summary

**One cached catalogue, filtered, sorted and paged in memory, feeds `/` and GET /api/v1/tours with allowlisted filters, month, sort, fields and paging**

## Performance

- **Duration:** about 16 min (approximate: from the worktree's creation at about 12:15 UTC to the last check at 12:31 UTC)
- **Started:** 2026-11-16T12:15:00Z (approximate)
- **Completed:** 2026-11-16
- **Tasks:** 3 (Task 2 used a RED then a GREEN commit, so 4 commits in total)
- **Files modified:** 25

## Accomplishments

- `/` now lists the first twelve seeded tours in rating order, with their photos through `next/image`, and reads them through `list()` rather than through `/api` (R3).
- GET /api/v1/tours answers the same `list()` in the plan.md 4.1 shape, `data: { tours }` with `meta: { page, limit, total }` (B13).
- The API query is strict and allowlisted: operator keys, unknown keys, `__proto__`, bad sort tokens, repeated sort fields, six sort tokens and non-digit page or limit values are all 400 VALIDATION_ERROR. Filters, sort, fields and paging run in memory, so no request value reaches MongoDB (S7, B11).
- Every allowed sort pages to the 13 tours exactly once, with equal values ordered by name then id. The page's default is -ratingsAverage (D-03), and the API's absent-sort default is -createdAt (B1).
- Length and price bands are inclusive. A departure on 1 January filters under January, and a departure today is not a bookable month option (D-02, D-04, U10).
- One cache entry holds the whole catalogue: key `['catalogue']`, tag `tours`, `revalidate: 3600`. The cache adapter takes the revalidate as an optional fourth argument (ADR 0031).
- A tour with no upcoming departure shows "No upcoming dates" in its date cell and keeps its price and link (C8).
- ADR 0031, the query and cache contract in docs/contracts.md section 11, and the first OpenAPI fragment (`docs/openapi/openapi.yaml`) record the design, the write-to-tag table and the query shape.

## Task Commits

Each task was committed atomically:

1. **Task 1: One cached catalogue feeds `/` and GET /api/v1/tours** - `731163d` (feat)
2. **Task 2 (RED): Failing tests for filters, bands, month, sort and paging** - `372b223` (test)
3. **Task 2 (GREEN): Allowlisted filters, month, sort, fields and paging** - `258fa23` (feat)
4. **Task 3: ADR 0031, the write-to-tag table, the query contract and the first OpenAPI fragment** - `84d26fe` (docs)

**Plan metadata:** recorded by the commit that adds this SUMMARY (docs, `04-04`). STATE.md and ROADMAP.md are left to the orchestrator.

## Files Created/Modified

- `src/server/modules/tours/service.ts` - `list(query)` and `monthOptions()`; the one cached catalogue read, with the DB-down mapping to SERVICE_UNAVAILABLE (B10)
- `src/server/modules/tours/catalogue-query.ts` - pure: `applyCatalogueQuery`, `nextBookableDate`, `monthOptionsFrom`, `projectFields`
- `src/server/modules/tours/schemas.ts` - the allowlists, `buildPageQuerySchema`, the strict `apiListQuerySchema` and `toApiCatalogueQuery`
- `src/app/api/v1/tours/route.ts` - GET /api/v1/tours: strict query, then `list()`, then the optional `fields` projection
- `src/app/page.tsx` - `/` is an async Server Component that calls `list()` and renders `TourRow`s under the heading "Find your next trip"
- `src/components/ui/tour-row.tsx` - `startDate` is optional; without it the date cell shows "No upcoming dates" (C8)
- `src/server/adapters/cache.ts`, `real-cache.ts` - `cached` takes an optional `{ revalidate }` and passes it to `unstable_cache`
- `src/server/api/responses.ts` - `list(key, items, meta)` nests the items under `data[key]`
- `src/server/modules/tours/dto.ts` - `TourSummary` gains `createdAt`, an ISO instant
- `docs/adr/0031-one-cached-catalogue-queried-in-memory.md` - the cache design, the write-to-tag table and the list shape
- `docs/adr/0012-tagged-data-cache-and-dynamic-rendering.md` - status now records the amendment by 0031
- `docs/adr/README.md` - the 0031 row
- `docs/contracts.md` - section 2.1 (list shape), section 5 (`Cache.cached`), section 10 (rows this plan completes), section 11 (the catalogue contract)
- `docs/openapi/openapi.yaml` - OpenAPI 3.1.0 fragment for GET /tours
- Tests: `test/server/modules/tours/service.test.ts`, `service-db-down.test.ts`, `catalogue-query.test.ts`, `schemas.test.ts`, `dto.test.ts`; `test/app/api/tours-list.test.ts`; `test/app/browse-list.spec.ts`; `test/components/ui/tour-row.test.ts`; `test/server/adapters/cache.test.ts`; `test/server/api/responses.test.ts`

## Decisions Made

- One cache entry for the whole public catalogue: key `['catalogue']`, tag `tours`, `revalidate: 3600`. Thirteen summaries are far below the cache size limit, and one entry keeps every URL combination out of the cache keys (ADR 0031).
- The month filter means a bookable departure after today's IST day, in that IST month, on both `/` and the API (D-04).
- The list response nests items under `data[key]`, as plan.md 4.1 shows. That is the spec's shape, so it needs no deviation ADR.
- `/` sorts by `-ratingsAverage` with name then id as the ties (D-03). The API's absent-sort default is `-createdAt` (B1).
- The `fields` projection is applied in the route, through `projectFields`, and is not a `CatalogueQuery` field. The query stays about what the list contains.
- `applyCatalogueQuery` takes `today` as an argument, so the pure module never reads the clock.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated `next-env.d.ts` was missing from the fresh worktree**
- **Found during:** Task 1 (typecheck)
- **Issue:** `src/app/styleguide/sections/tour-row-section.tsx` imports seed `.jpg` files, and TypeScript could not resolve the image module declarations (TS2307). The file is generated and gitignored, and this worktree did not have it.
- **Fix:** Ran `next typegen` in the worktree. Nothing was committed, because the file is gitignored.
- **Files modified:** none committed (`next-env.d.ts`, gitignored)
- **Verification:** `npm run typecheck` passed with no errors.
- **Committed in:** not committed (environment only)

**2. [Rule 3 - Blocking] knip reported four exported types nothing imports**
- **Found during:** Task 2 (`npm run knip`, part of the CI checks job)
- **Issue:** `CacheOptions`, `Difficulty`, `NumericField` and `NumericOp` were exported but used only inside their own modules.
- **Fix:** Made them module-local.
- **Files modified:** `src/server/adapters/cache.ts`, `src/server/modules/tours/catalogue-query.ts`
- **Verification:** `npm run knip` clean; the Task 2 suites still pass.
- **Committed in:** `258fa23`

**3. [Rule 3 - Blocking] ESLint `detect-unsafe-regex` on the decimal filter pattern**
- **Found during:** Task 2 (ESLint with `--max-warnings=0`)
- **Issue:** The nested optional group in `^\d+(\.\d+)?$` has a star height above one, which the rule flags.
- **Fix:** Split it into two flat patterns, a whole number and a fraction, and accept either.
- **Files modified:** `src/server/modules/tours/schemas.ts`
- **Verification:** ESLint clean on the tours modules; the filter values tests still pass.
- **Committed in:** `258fa23`

**4. [Rule 3 - Blocking] Coverage gate on `service.ts` (85% lines) was not met by the DB-down test alone**
- **Found during:** Task 2 (`npm run test:coverage`)
- **Issue:** The existing DB-down test fails at connect, so the query-failure branch that maps a network error to SERVICE_UNAVAILABLE was not covered (66.7% lines).
- **Fix:** Added a test that makes `Tour.find` throw a network-class error and asserts SERVICE_UNAVAILABLE with the driver error as the cause (93.3% lines).
- **Files modified:** `test/server/modules/tours/service.test.ts`
- **Verification:** `service.ts` at 93.3% lines in the tours and API run.
- **Committed in:** `258fa23`

**Total deviations:** 4 auto-fixed (4 blocking, all Rule 3). **Impact:** None on the design. These were environment or CI-gate fixes, and no scope was added.

### Departures from the plan text (not auto-fixes)

- **Task 1 signature:** Task 1 first wrote `applyCatalogueQuery(entries, query)` without `today`. Task 2 added the argument when the month filter needed it. The end state matches the plan's signature.
- **`fields` in the route:** the plan listed `fields` as a `CatalogueQuery` field. It is applied in the route through `projectFields`, so the query type stays about the list. The projected output is the same.
- **Extra test files:** `schemas.test.ts` and `service-db-down.test.ts` were added beside the planned files, so the schema and DB-down behaviour each have a file of their own, following the existing `with-api-db-down` pattern.
- **RED for a new module:** `schemas.test.ts` failed in the RED commit with a missing module, a collection failure, rather than an assertion. The other RED tests failed on assertions (`400` for `200`, a missing `tours` key, a missing `monthOptionsFrom`).
- **The `/` page reads no query parameters yet.** Filter parameters on `/` are wired by plan 04-05. This plan adds `buildPageQuerySchema` for it, but not the converter from parsed page params to `CatalogueQuery`.
- **`REQUIREMENTS.md` was not changed.** The requirement IDs in this plan's frontmatter are for the orchestrator to mark after the wave, through the shared-ID gate.

## Issues Encountered

- A fresh worktree had no `node_modules` or `next-env.d.ts`. Dependencies were installed with `npm ci`, and the typegen file was generated (deviation 1).
- The worktree's Bash guard refused a few compound git commands, so the commands were split into plain ones. No git operation touched a path outside the worktree.
- The plan-commit ledger (protocol 0c) could not be written to the worktree's git directory under the isolation rule. The commit count was measured directly with `git rev-list --count f96efc8..HEAD`, from the verified base SHA. The result is the same measurement.
- The browser logs Next's hint that the first `/` photo is the LCP image and should use `loading="eager"`. This is logged in `deferred-items.md` as an open item, because the fix belongs to the shared `TourRow` prop contract.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. The page's filter parameters are not read yet, and that is planned for 04-05; it is recorded above, not stubbed.

## Threat Flags

None. The new surface is the planned GET /api/v1/tours route, covered by the T-04-11 to T-04-14 register entries.

## Self-Check: PASSED

Checked after writing: all 14 created files exist on disk; the four task commits (`731163d`, `372b223`, `258fa23`, `84d26fe`) are ancestors of HEAD. Before the SUMMARY, the full Vitest suite passed (71 files, 906 tests), the Playwright app project passed (136 tests), `npm run typecheck`, `npm run knip` and `npm run format:check` were clean, and ESLint with `--max-warnings=0` was clean on the tours modules, the API route, the page and the tests.

## Next Phase Readiness

- Plan 04-05 can add the filter form on `/`: `buildPageQuerySchema` and `applyCatalogueQuery` are ready, and `/` needs a converter from parsed page params to `CatalogueQuery`.
- `monthOptions()` is ready for the month select once `/` reads its filters.
- Later plans add the per-tour cache keys (ADR 0031) and the `getBySlug` and `getById` services.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
