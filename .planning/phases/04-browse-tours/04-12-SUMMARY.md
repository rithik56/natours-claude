---
phase: 04-browse-tours
plan: 12
subsystem: api
tags: [route-handlers, zod, strict-schemas, mongoose, cache-invalidation, role-access, tdd, adr-0036, adr-0037]

# Dependency graph
requires:
  - phase: 04-browse-tours (plan 04-11)
    provides: the tours module read side (list, getStats, toursWithin, distancesFrom), the cached catalogue and the standard error envelope
  - phase: 04-browse-tours (plan 04-07)
    provides: the reviews and bookings services that the tour delete reads and clears
provides:
  - PATCH /api/v1/tours/[id]: a strict JSON update of the editable tour fields, load-set-save, slug regenerated on rename (B4, S4, QA-04)
  - POST /api/v1/tours: a strict JSON create of a tour with no cover, hidden from every public read until a cover is added (F6, D-12, D-13)
  - DELETE /api/v1/tours/[id]: 409 with bookings, otherwise the tour, its reviews and its stored photos are removed and 204 is answered (F6, T-04-34)
  - updateTour, createTour, deleteTour, countForTour, deleteForTour, hasCover, tourCreateSchema, tourUpdateSchema, messages.tours
  - ADR 0036 (cover optional, cover-less tours hidden) and ADR 0037 (lead guides and admins manage any tour)

affects: [04-13 (images endpoint adds the cover and its credit), phase 6 (checkout must refuse a tour outside the catalogue; the bookings count and delete race), phase 6 access matrix]

# Actuals (#2632): the estimate was 95000 tokens over 3 tasks.
# Same chars/4 scale as the estimate: 90273 characters of the realized diff (git diff 99e04c4 HEAD).
actuals:
  tokens: 22568
  tasks: 3
  commits: 5
# MEASURED from the ledger, before this SUMMARY's commit (#3968).
plan_head_before: 99e04c4a228ff42116b4bb347ec141f337c1079c
plan_head_after: 408ce9b0d49552438e983d7ca6762e2ffc287e46

tech-stack:
  added: []
  patterns:
    - "Write routes declare access as an exact role match, a strict params schema, a strict empty query and a strict body; the handler is a thin call to one service function"
    - "Update is load, set, save: validators and the slug hook run, and no query-level update is used (QA-04, ADR 0027)"
    - "A cover-less tour is filtered once, in the catalogue loader and the two geo queries, so every public read inherits the rule (D-13)"
    - "Strict-object refusals name every unknown key by its own path; the non-empty check runs only on a body that parsed cleanly"
    - "A write clears exactly its tags, in a finally, after the database work has finished (ARC-02, QA-12)"

key-files:
  created:
    - docs/adr/0036-tour-cover-optional-and-hidden-until-added.md
    - docs/adr/0037-admins-and-lead-guides-manage-any-tour.md
    - test/app/api/tours-write.test.ts
  modified:
    - src/server/modules/tours/schemas.ts
    - src/server/modules/tours/service.ts
    - src/server/modules/tours/model.ts
    - src/server/modules/tours/dto.ts
    - src/server/modules/bookings/service.ts
    - src/server/modules/reviews/service.ts
    - src/server/validation.ts
    - src/lib/messages.ts
    - src/app/api/v1/tours/route.ts
    - src/app/api/v1/tours/[id]/route.ts
    - src/app/page.tsx
    - src/app/tour/[slug]/page.tsx
    - test/helpers/factories.ts
    - test/scripts/seed.test.ts
    - test/server/api/with-api.test.ts
    - test/server/modules/tours/model.test.ts
    - test/server/modules/tours/dto.test.ts
    - test/server/modules/bookings/service.test.ts
    - test/server/modules/reviews/service.test.ts
    - docs/contracts.md
    - docs/openapi/openapi.yaml
    - docs/adr/README.md
    - .planning/phases/04-browse-tours/deferred-items.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Access for POST, PATCH and DELETE is { roles: ['lead-guide', 'admin'] } and no ownership check is made (D-16, ADR 0037). A stricter rule is recorded there as a later choice."
  - "imageCover is optional in the model and string | null in the DTO. A cover-less tour is left out of the catalogue, credits, stats, both geo reads and the tour page; GET by id still returns it with imageCover null (D-13, ADR 0036)."
  - "createTour and updateTour return the saved tour with its guides, the same shape GET by id returns, so a client needs no second read (B13)."
  - "A delete clears its tags in a finally, after the tour and its reviews are gone, so a failure part way still invalidates the cache. Photo removal is best effort, after the tags are cleared, and each failed key is logged."
  - "An unknown key is reported under its own path (issuesToDetails expands the strict-object issue). Before this plan it was reported under the empty root path, which named no field (S4)."
  - "Guide ids must be active users with the role guide or lead-guide. Any other id is a 400 on the guides path."

patterns-established:
  - "Pattern: a schema-level check that reads the whole body runs with a `when` guard, so it does not add a root-path issue to a body that already failed on a named field"
  - "Pattern: an outage in a write is mapped to SERVICE_UNAVAILABLE with the driver error as cause, through the same writeFailure helper, and a duplicate key is mapped to the approved 409"

requirements-completed: [F6, S4, B4, R10]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "A lead guide or an admin changes a seed tour's price over PATCH: 200, list() shows the new price, and exactly the tours and tour:<id> tags are cleared"
    requirement: "F6"
    verification:
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a lead guide changes a seed tour price: 200, list() shows the new price, and the tags are cleared"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] the same PATCH sent twice leaves the same document and slug"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH accepts only the editable fields: images, imageCover, photoCredits, slug, ratingsAverage, ratingsQuantity, ImageCover, an empty object and any unknown key are a 400 that names each path; a rename regenerates the slug; names of 9 and 41 characters are refused and of 10 and 40 accepted"
    requirement: "B4"
    verification:
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[B4] PATCH with images is 400 VALIDATION_ERROR naming that path"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[S4] a body with two unknown keys lists the path of both"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[S4] a name of 9 characters is 400 and a name of 10 characters is 200"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[QA-04] renaming a tour regenerates its slug"
        status: pass
    human_judgment: false
  - id: D3
    description: "POST creates a tour with no cover: 201, imageCover null, and only the tours tag cleared; the tour is absent from list, slugs, credits, stats, both geo reads and getBySlug, and present again once a cover is set"
    requirement: "F6"
    verification:
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] an admin creates a tour from JSON with no cover: 201, imageCover null, and only the tours tag is cleared"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] (D-13) a cover-less tour stays out of every public read until a cover is added"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/model.test.ts#[F6] (D-13) a tour saves without an imageCover, so a cover-less tour can be created from JSON"
        status: pass
    human_judgment: false
  - id: D4
    description: "POST with imageCover, images or photoCredits is a 400 naming the path; a duplicate name is the approved 409; anonymous is 401 and a user 403"
    requirement: "B4"
    verification:
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[B4] POST with imageCover is 400 VALIDATION_ERROR naming that path"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a duplicate tour name is 409 with the approved message"
        status: pass
    human_judgment: false
  - id: D5
    description: "DELETE of a booked tour (paid or refunded) is 409 with the approved message and changes nothing; DELETE of an unbooked tour is 204, removes its reviews and stored photos, and clears tours, tour:<id> and reviews:<id>; a storage failure still gives 204 and is logged; a second DELETE is 404"
    requirement: "F6"
    verification:
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a tour with a booking answers 409 with the approved message, and the tour, its reviews and its photos stay"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a tour with no booking answers 204, and its reviews and stored photos go with it"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a storage delete that throws still answers 204, and the failure is logged"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a second DELETE of the same tour is 404"
        status: pass
      - kind: unit
        ref: "test/server/modules/bookings/service.test.ts#[F6] counts every booking of the tour, paid or refunded, and none of another tour"
        status: pass
      - kind: unit
        ref: "test/server/modules/reviews/service.test.ts#[F6] deletes every review of the tour, returns how many, and leaves other tours alone"
        status: pass
    human_judgment: false
  - id: D6
    description: "The access rule for each write: anonymous 401; user and guide 403 on POST, PATCH and DELETE; lead guide and admin succeed; a write from another site's Origin is 403"
    requirement: "F6"
    verification:
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[D-16] an anonymous caller gets 401 on POST, PATCH and DELETE"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[D-16] a user gets 403 on POST, PATCH and DELETE"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[D-16] a lead-guide creates, changes and deletes tours: 201, 200 and 204"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#[F6] a write from another site's Origin is 403, even for a lead guide (S9)"
        status: pass
    human_judgment: false
  - id: D7
    description: "A tour with no cover is not published: /tour/<slug> answers 404 through the page's guard, and the public reads leave it out; the browser check of the 404 was not run in this plan"
    requirement: "R10"
    verification:
      - kind: unit
        ref: "test/app/api/tours-write.test.ts#[F6] (D-13) a cover-less tour stays out of every public read until a cover is added"
        status: pass
    human_judgment: true
    rationale: "The page-level 404 for /tour/<slug> is written as a guard in src/app/tour/[slug]/page.tsx but no Playwright run was made in this plan, so a person or the Playwright tour-page spec must confirm the 404 in a browser."
  - id: D8
    description: "ADR 0036 (cover optional, cover-less tour hidden), ADR 0037 (lead guides and admins manage any tour), the tour-write contract in docs/contracts.md and the three operations in docs/openapi/openapi.yaml"
    requirement: "F6"
    verification:
      - kind: other
        ref: "npx prettier --check . passes; docs/openapi/openapi.yaml parses with a YAML parser and lists POST /tours, PATCH /tours/{id} and DELETE /tours/{id}"
        status: pass
    human_judgment: true
    rationale: "The wording of the two ADRs and the contract is for a reader to check; no test reads the documentation against the code."
---

# Phase 4 Plan 12: Admin tour writes over JSON Summary

**Lead guides and admins create, change and delete tours over strict JSON: a cover-less tour stays hidden from the public catalogue, and a booked tour cannot be deleted (409).**

## Performance

- **Duration:** about 25 min (approximate; the first read was about 15:45Z and the final feature commit was at 16:06Z)
- **Started:** 2026-11-16, about 15:45Z (approximate)
- **Completed:** 2026-11-16, about 16:10Z (approximate, this SUMMARY's commit follows)
- **Tasks:** 3 of 3 complete (Task 1 tracer, Tasks 2 and 3 TDD)
- **Files modified:** 26 across code, tests, docs and planning (`git diff --stat 99e04c4 HEAD`)

## Accomplishments

- `PATCH /api/v1/tours/[id]` changes the editable fields only. `images`, `imageCover`, `photoCredits`, `slug`, `ratingsAverage`, `ratingsQuantity`, any unknown key and an empty body are each a 400 that names its path. The update is load, set and save, so the validators and the slug hook run, and a rename regenerates the slug (B4, S4, QA-04).
- `POST /api/v1/tours` creates a tour from strict JSON with no cover. The tour answers 201 with `imageCover: null` and stays out of `/`, the top-5 and list APIs, the stats, the sitemap, `/credits` and both geo reads until a cover is added (F6, D-12, D-13, ADR 0036).
- `DELETE /api/v1/tours/[id]` answers 409 with the approved message while the tour has any booking, paid or refunded, and then changes nothing. Otherwise it deletes the tour, then its reviews, then its stored photos best effort, and answers 204 (F6, T-04-34).
- All three writes are for lead guides and admins by an exact role match. Anonymous callers get 401, users and guides 403, and a write from another site's Origin 403 (D-16, S9, ADR 0037).
- A duplicate tour name answers 409 with "A tour with that name already exists." (copy.md). A guide id must name an active guide or lead guide.

## Task Commits

Each task was committed atomically. Tasks 2 and 3 follow the TDD cycle, with a failing-test commit before each implementation commit.

1. **Task 1 (tracer): PATCH changes a tour's editable fields over JSON** - `5d6dd2b` (feat)
2. **Task 2 RED: failing tests for a cover-less tour created over JSON** - `00c069a` (test)
3. **Task 2 GREEN: POST creates a cover-less tour that stays out of the public catalogue** - `ab77a30` (feat)
4. **Task 3 RED: failing tests for deleting a tour and the write access table** - `3f1255e` (test)
5. **Task 3 GREEN: DELETE refuses a tour with a booking, and clears its reviews and photos** - `408ce9b` (feat)

**Plan metadata:** this SUMMARY and `.planning/REQUIREMENTS.md`, committed after the task commits. STATE.md and ROADMAP.md are left to the orchestrator.

## TDD Record

- **Task 2 RED (`00c069a`):** run before any implementation. Nine cases failed: seven because the route module had no POST handler (`The route module has no POST handler`), one because `hasCover is not a function`, and one because the model still required a cover (`ValidationError: imageCover: Fill in this field.`). The PATCH cases still passed. Each failure is a behaviour assertion on the missing code, not a module-load error.
- **Task 2 GREEN (`ab77a30`):** all 228 tests in the tours, API and service suites passed after the change.
- **Task 3 RED (`3f1255e`):** 13 cases failed: the DELETE handler was missing (`The route module has no DELETE handler`), `countForTour` and `deleteForTour` were undefined. The PATCH and POST cases still passed.
- **Task 3 GREEN (`408ce9b`):** 222 tests passed across the tours, bookings and reviews suites; the coverage run later added the outage cases below.
- `workflow.tdd_mode` is `false` in `.planning/config.json`, so `gsd_run check tdd-red-evidence` was not run. The RED outcomes were read from the test output.

## Files Created/Modified

- `src/server/modules/tours/schemas.ts` - the shared editable-field rules, `tourUpdateSchema` (strict, non-empty), `tourCreateSchema` (strict, with the required fields)
- `src/server/modules/tours/service.ts` - `createTour`, `updateTour`, `deleteTour`, the guide check, the write-failure mapping, the photo removal; the catalogue, credits and geo reads filter on a cover
- `src/server/modules/tours/model.ts` - `imageCover` optional (D-13)
- `src/server/modules/tours/dto.ts` - `imageCover: string | null`; `hasCover` guard; the credit mapper skips a missing cover
- `src/server/modules/bookings/service.ts` - `countForTour`
- `src/server/modules/reviews/service.ts` - `deleteForTour`
- `src/server/validation.ts` - `issuesToDetails` names each unknown key by its own path (S4)
- `src/lib/messages.ts` - `messages.tours.duplicateName` and `messages.tours.hasBookings`
- `src/app/api/v1/tours/route.ts` - `POST`
- `src/app/api/v1/tours/[id]/route.ts` - `PATCH` and `DELETE`
- `src/app/page.tsx` - the photo list narrows with `hasCover`
- `src/app/tour/[slug]/page.tsx` - `notFound()` for a tour with no cover, in both the metadata and the page
- `test/app/api/tours-write.test.ts` - route tests for the three writes, the access table, the strict schemas and the D-13 reads
- `test/server/modules/tours/model.test.ts`, `dto.test.ts` - the model saves without a cover; `hasCover`
- `test/server/modules/bookings/service.test.ts`, `test/server/modules/reviews/service.test.ts` - `countForTour` and `deleteForTour`, including the outage branches
- `test/helpers/factories.ts` - `withoutCover` option for `createTour`
- `test/scripts/seed.test.ts`, `test/server/api/with-api.test.ts` - updated for the optional cover and the named unknown-key path
- `docs/adr/0036-tour-cover-optional-and-hidden-until-added.md`, `docs/adr/0037-admins-and-lead-guides-manage-any-tour.md`, `docs/adr/README.md` - the two ADRs and their index rows
- `docs/contracts.md` - the tour-write contract, with the Phase 4 write-to-tag rows marked as tested
- `docs/openapi/openapi.yaml` - `POST /tours`, `PATCH /tours/{id}`, `DELETE /tours/{id}` with the strict request schemas
- `.planning/phases/04-browse-tours/deferred-items.md` - the users-service coverage gap (open, pre-existing)
- `.planning/REQUIREMENTS.md` - S4 and R10 marked complete (see the shared-ID note below)

## Decisions Made

- **Access is an exact role match with no ownership check (D-16, ADR 0037).** A lead guide can change or delete any tour. The stricter alternatives are recorded in ADR 0037 for a later choice.
- **A cover-less tour is hidden by one filter, not per page (D-13, ADR 0036).** The catalogue loader and the two geo queries drop it, so every public read that is built on them inherits the rule. `GET /api/v1/tours/[id]` still returns it.
- **Writes return the tour with its guides.** This matches GET by id, so a client does not need a second read. The plan said "returns the detail"; the guides are the one addition.
- **Tags are cleared in a `finally`.** A delete that fails after the tour is removed still clears `tours`, `tour:<id>` and `reviews:<id>`, so the cache never serves a removed tour. Photo removal runs after that and is best effort.
- **Unknown keys are named by path.** A strict object reports all its unknown keys at once; each is now its own detail. The root-path rule for the non-empty check is guarded so it runs only on a body that parsed cleanly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] An unknown key was reported under the empty root path**
- **Found during:** Task 1 (the strict-key tests)
- **Issue:** `issuesToDetails` reported a strict object's unknown keys at path `""`, so `{ images: [...] }` was refused without naming `images`. S4 requires each refused field to be named.
- **Fix:** `issuesToDetails` expands an `unrecognized_keys` issue into one detail per key, with the key as its path. The existing `test/server/api/with-api.test.ts` expectation for an unknown `extra` key moved from `''` to `'extra'`, because that expectation encoded the bug.
- **Files modified:** `src/server/validation.ts`, `test/server/api/with-api.test.ts`
- **Verification:** the Task 1 strict-key tests pass; `test/server/api/with-api.test.ts` and `test/server/validation.test.ts` pass (72 tests).
- **Committed in:** `5d6dd2b` (validation) and `408ce9b` (the with-api expectation)

**2. [Rule 1 - Bug] The non-empty PATCH check added a second, root-path error**
- **Found during:** Task 1 (the strict-key tests)
- **Issue:** `.refine` on the update object ran even when a strict key had already failed, so a body with an unknown key also got an `""` detail reading "This value isn't allowed."
- **Fix:** the refinement takes a `when` guard that runs it only when the body has no issues.
- **Files modified:** `src/server/modules/tours/schemas.ts`
- **Verification:** the two-unknown-keys test lists exactly the two keys.
- **Committed in:** `5d6dd2b`

**3. [Rule 2 - Missing Critical] Outage branches of the new helpers had no test**
- **Found during:** Task 3 (the coverage gate)
- **Issue:** `countForTour` and `deleteForTour` had uncovered `SERVICE_UNAVAILABLE` catch blocks, which took the reviews service to 84.84% and the bookings service to 80.95%, below the 85% gate.
- **Fix:** one outage test each (the driver error is kept as `cause`), plus a malformed-id case for `deleteForTour`.
- **Files modified:** `test/server/modules/bookings/service.test.ts`, `test/server/modules/reviews/service.test.ts`
- **Verification:** bookings `service.ts` is at 100% lines and reviews `service.ts` at 96.96%.
- **Committed in:** `408ce9b`

**4. [Rule 2 - Missing Critical] Write routes refuse unknown query keys**
- **Found during:** Task 2 (route design)
- **Issue:** the plan did not declare a query schema for the write routes. S7 requires strict input, and the monthly-plan route already declares `z.strictObject({})`.
- **Fix:** `query: z.strictObject({})` on POST, PATCH and DELETE, so an extra query key is a 400 before the body is read.
- **Files modified:** `src/app/api/v1/tours/route.ts`, `src/app/api/v1/tours/[id]/route.ts`
- **Verification:** covered by the access and strict-input tests in `test/app/api/tours-write.test.ts`.
- **Committed in:** `5d6dd2b` (PATCH), `ab77a30` (POST), `408ce9b` (DELETE)

**5. [Rule 3 - Blocking] The worktree had no installed dependencies**
- **Found during:** Task 1 (the first test run failed with `Cannot find package 'server-only'`)
- **Issue:** the worktree had no working `node_modules`.
- **Fix:** `npm ci` from the committed lockfile. No package was added, removed or changed.
- **Verification:** the same test files then ran.
- **Committed in:** not committed (environment only)

**6. [Rule 3 - Blocking] Generated Next types were missing, so `tsc` reported `PageProps`**
- **Found during:** Task 1 (`npx tsc --noEmit`)
- **Fix:** `npx next typegen`. The output is gitignored.
- **Committed in:** not committed (environment only)

### Plan wording that conflicts with a contract

**7. [Plan wording - SEC-26] "A write without a same-origin Origin header is 403"**
- **Found during:** Task 1 (the first run of the origin test)
- **Issue:** the plan's test description asks for 403 on a write with no Origin header. `docs/contracts.md` (S9, SEC-26) accepts a write with no Origin header, because scripts and curl do not send one, and refuses an Origin that is not the app's or one in `CORS_ORIGINS`.
- **Resolution:** the contract was kept, since the project documents it and the rule protects against cross-site writes. The test checks the protected case: a write from `https://other-site.example` is 403. The plan text was not edited.
- **Committed in:** `5d6dd2b`

**Total deviations:** 7 (4 auto-fixed bugs or gaps under Rules 1 and 2, 2 environment fixes under Rule 3, 1 plan-wording conflict resolved in favour of the contract). **Impact:** no change to the requirements; the fixes are needed for S4, S7 and the coverage gate, and the origin test checks the rule the contract states.

## Issues Encountered

- **The sandbox refused compound git commands** that nested `git` in a shell substitution, such as writing the commit ledger with `$(git rev-parse --git-dir)`. Each git call was split into a plain command, and the ledger was written to the resolved path.
- **`timeout` is not installed on macOS**, so the first coverage run exited 127 without running. It was rerun without `timeout`.
- **Coverage gate, pre-existing failure, not fixed:** `npm run test:coverage` still fails on `src/server/modules/users/service.ts` at 77.77% lines. The uncovered lines are the `SERVICE_UNAVAILABLE` catch in `findActivePublicByIds`, which this plan does not touch. It is logged as open in `.planning/phases/04-browse-tours/deferred-items.md`. The tours service is at 88.48% lines, bookings at 100%, reviews at 96.96%. All 1141 tests pass.
- **Shared requirement IDs:** `F6` and `B4` are declared by a sibling plan that has no SUMMARY yet, so the readiness gate reports them blocked. They stay open in `REQUIREMENTS.md` until that plan finishes. `S4` and `R10` were ready and are marked complete.
- **Not run in this plan:** the Playwright specs. The page-level `/tour/<slug>` 404 for a cover-less tour, and the home page's photo list, are covered by unit and route tests and by reading the code, but a browser run was not made. This is the reason D7 is a human check.

## Verification

- `npx vitest run test/app/api/tours-write.test.ts test/server/modules/tours`: passes (161 at the end of Task 1).
- `npx vitest run test/server/modules/tours test/app/api`: 228 tests pass after Task 2.
- `npm run test:coverage`: 92 files, 1141 tests pass. The gate fails only on the pre-existing `users/service.ts` line above.
- `npx tsc --noEmit`: exit 0.
- `npm run lint` (`eslint . --max-warnings=0`): exit 0.
- `npx prettier --check .`: all files pass.
- `npm run check:conventions` and `npm run check:client`: pass.
- `npx knip --no-progress`: clean.
- `docs/openapi/openapi.yaml`: parses with a YAML parser, with no duplicate keys; the tour paths are `/tours` (get, post), `/tours/{id}` (get, patch, delete).

## Known Stubs

None. The write paths store and return real data. No placeholder image is shown: a cover-less tour is excluded from every public read rather than given a stand-in.

## Threat Flags

None beyond the plan's register. The three write routes are the register's T-04-32 (strict bodies, refused fields named), T-04-33 (exact role match, Origin check, the access table tested for every role) and T-04-34 (409 with bookings, reviews removed after the tour, the F6 race recorded in ADR 0036). T-04-35 holds because updates load, set and save, and no query-level update is used.

## Next Phase Readiness

- Plan 04-13 adds the cover through the images endpoint with its credit. Until it lands, a POST-created tour stays hidden (D-13).
- Open for the orchestrator: `F6` and `B4` stay pending until the sibling plan that also declares them writes its SUMMARY. `R10` needs a browser check of `/tour/<slug>` returning 404 for a cover-less tour, which was not run here.
- Phase 6: checkout must refuse a tour that is not in the catalogue. The bookings count and the delete can race in principle; the race is accepted for Phase 4 and recorded in ADR 0036.
- The users-service coverage gap in `deferred-items.md` needs a test in a plan that owns the users module, or the coverage gate will keep failing.

## Self-Check: PASSED

Checked after the final gates and before this SUMMARY was committed: every file this plan created exists on disk (the two ADRs, the write test file), and the five task commits are ancestors of HEAD.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
